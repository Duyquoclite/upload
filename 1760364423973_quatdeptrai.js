let name = 'qrweb'
const https = require('https')
const { PassThrough } = require('stream')

class qrweb {
    constructor(a) {
        this.config = a
    }

    async onStart({ message: { reply }, args, event }) {
        try {
            // Parse args (short): text | dotStyle | cornerStyle | color1 | color2 | angle(1-100) | [logoSize(1-100) optional]
            // Allow quoted text for content
            let joined = args.join(' ').trim()
            if (!joined) return reply(`Dùng: qrweb "văn bản trong nháy kép"
kiểu chấm: 1 (chấm) | 2 (bo tròn) | 3 (thanh lịch) | 4 (thanh lịch bo tròn) | 5 (vuông) | 6 (bo tròn thêm)
kiểu góc: 1 (tròn thêm) | 2 (chấm) | 3 (vuông)
nền: 1 (trắng) | 2 (đen) | 3 (trong suốt) | tùy chỉnh (mã màu | tên màu | rgb)
màu 1, màu 2: mã màu | tên màu | rgb, cách chọn màu: https://ingiacong.co/bang-code-mau/
góc chuyển sắc: 1-100
kích cỡ logo (nếu có): 1-100
Ví dụ: qrweb "Hello" 1 1 1 red green 45 28`)

            // Simple tokenizer that respects quotes
            const tokens = []
            let buf = ''
            let inQuote = false
            for (let i = 0; i < joined.length; i++) {
                const ch = joined[i]
                if (ch === '"') { inQuote = !inQuote; continue }
                if (!inQuote && /\s/.test(ch)) {
                    if (buf) { tokens.push(buf); buf = '' }
                } else {
                    buf += ch
                }
            }
            if (buf) tokens.push(buf)

            const text = tokens[0] || ''
            // Map numeric styles → library keywords
            const dotMap = {
                '1': 'dots',
                '2': 'rounded',
                '3': 'classy',
                '4': 'classy-rounded',
                '5': 'square',
                '6': 'extra-rounded'
            }
            const cornerMap = {
                '1': 'extra-rounded',
                '2': 'dot',
                '3': 'square'
            }
            const rawDot = tokens[1] || 'classy-rounded'
            const rawCorner = tokens[2] || 'extra-rounded'
            const dotStyle = dotMap[rawDot] || rawDot
            const cornerStyle = cornerMap[rawCorner] || rawCorner

            // Background: 1 white, 2 black, 3 transparent, or custom color name/hex/rgb()
            const bgToken = tokens[3]
            const bgColor = bgToken === '1' ? '#ffffff' : bgToken === '2' ? '#000000' : bgToken === '3' ? 'transparent' : (bgToken || '#ffffff')

            // Accept hex (#RRGGBB) or any CSS color name
            const color1 = tokens[4] && tokens[4].length ? tokens[4] : '#8a5cff'
            const color2 = tokens[5] && tokens[5].length ? tokens[5] : '#3dd5f3'
            const angle100 = Math.max(1, Math.min(100, parseInt(tokens[6] || '45', 10) || 45))
            const logoSizeToken = tokens[7]
            let imageSize = undefined
            if (logoSizeToken != null) {
                const logoSizePercent = Math.max(1, Math.min(100, parseInt(logoSizeToken, 10) || 28))
                // Map percent to library expected (0.12-0.4 roughly). Use linear mapping 1->0.12, 100->0.4
                imageSize = +(0.12 + (0.4 - 0.12) * ((logoSizePercent - 1) / 99)).toFixed(4)
            }
            const rotation = Math.round(angle100 / 100 * 360)

            // If user replied with an image, fetch it and make data URL
            let replyImageDataUrl = null
            const att = (event.attachments || []).filter(a => a.type === 'photo')
            if (att.length > 0) {
                const url = att[0].url
                replyImageDataUrl = await downloadToDataUrl(url)
            } else if (event.messageReply && event.messageReply.attachments && event.messageReply.attachments[0] && event.messageReply.attachments[0].type === 'photo') {
                const url = event.messageReply.attachments[0].url
                replyImageDataUrl = await downloadToDataUrl(url)
            }

            const html = buildHtml({
                data: text,
                dotStyle,
                cornerStyle,
                logo: false, // will be set true below if reply image exists
                imageSize,
                color1,
                color2,
                rotation,
                bgColor,
                replyImageDataUrl
            })
            // Render in headless browser and send PNG directly
            const puppeteer = require('puppeteer')
            const browser = await puppeteer.launch({ headless: true })
            const page = await browser.newPage()
            try {
                await page.setViewport({ width: 1024, height: 1024, deviceScaleFactor: 1 })
                await page.setContent(html, { waitUntil: 'load' })
                await page.waitForSelector('#qrContainer canvas', { timeout: 15000 })
                const result = await page.evaluate(async () => {
                    const styledCanvas = document.querySelector('#qrContainer canvas')
                    if (!styledCanvas) return null
                    function drawRounded(ctx,x,y,w,h,r){
                        const rr = Math.max(0, r||0);
                        ctx.beginPath();
                        ctx.moveTo(x+rr,y);
                        ctx.arcTo(x+w,y,x+w,y+h,rr);
                        ctx.arcTo(x+w,y+h,x,y+h,rr);
                        ctx.arcTo(x,y+h,x,y,rr);
                        ctx.arcTo(x,y,x+w,y,rr);
                        ctx.closePath();
                    }
                    function addPaddingAndRound(inputCanvas, bgColor){
                        const pad = 32; // spacing around QR
                        const radius = 24; // outer rounding
                        const out = document.createElement('canvas');
                        out.width = inputCanvas.width + pad*2;
                        out.height = inputCanvas.height + pad*2;
                        const ctx = out.getContext('2d');
                        if (bgColor && bgColor !== 'transparent'){
                            drawRounded(ctx,0,0,out.width,out.height,radius);
                            ctx.fillStyle = bgColor;
                            ctx.fill();
                        }
                        ctx.drawImage(inputCanvas, pad, pad);
                        return out.toDataURL('image/png');
                    }
                    const styled = addPaddingAndRound(styledCanvas, (window.QR_CONFIG && window.QR_CONFIG.bgColor) || '#ffffff')

                    // Build regular QR (square modules, square corners, black on bgColor)
                    const container = document.createElement('div')
                    container.style.position = 'fixed';
                    container.style.left = '-99999px';
                    document.body.appendChild(container)
                    const size = styledCanvas.width
                    const bg = (window.QR_CONFIG && window.QR_CONFIG.bgColor) || '#ffffff'
                    const plain = new QRCodeStyling({
                        width: size,
                        height: size,
                        type: 'canvas',
                        data: (window.QR_CONFIG && window.QR_CONFIG.data) || 'Hello QR',
                        qrOptions: { errorCorrectionLevel: 'Q', margin: 16, typeNumber: 0 },
                        imageOptions: { hideBackgroundDots: false, imageSize: (window.QR_CONFIG && window.QR_CONFIG.imageSize != null) ? window.QR_CONFIG.imageSize : 0.28, margin: 2, crossOrigin: 'anonymous' },
                        image: (window.QR_CONFIG && window.QR_CONFIG.logo && window.QR_CONFIG.replyImageDataUrl) ? window.QR_CONFIG.replyImageDataUrl : undefined,
                        // Regular QR is fixed: black modules on white background, unaffected by other styles
                        backgroundOptions: { color: '#ffffff' },
                        dotsOptions: { type: 'square', color: '#000000' },
                        cornersSquareOptions: { type: 'square', color: '#000000' },
                        cornersDotOptions: { type: 'square', color: '#000000' }
                    })
                    plain.append(container)
                    await new Promise(r => setTimeout(r, 50))
                    const plainCanvas = container.querySelector('canvas')
                    // Do NOT add extra padding/rounding; only logo and logo size may affect the regular image
                    const regular = plainCanvas ? plainCanvas.toDataURL('image/png') : null
                    container.remove()
                    return { styled, regular }
                })
                if (!result || !result.styled) throw new Error('Không tìm thấy canvas QR')

                // Styled output
                const styledBase64 = result.styled.split(',')[1]
                const styledBuffer = Buffer.from(styledBase64, 'base64')
                const styledStream = new PassThrough(); styledStream.end(styledBuffer)
                styledStream.path = 'qr_output.png'; styledStream.filename = 'qr_output.png'; styledStream.mime = 'image/png'

                // Regular output
                let regularStream = null
                if (result.regular) {
                    const regBase64 = result.regular.split(',')[1]
                    const regBuffer = Buffer.from(regBase64, 'base64')
                    regularStream = new PassThrough(); regularStream.end(regBuffer)
                    regularStream.path = 'qr_regular.png'; regularStream.filename = 'qr_regular.png'; regularStream.mime = 'image/png'
                }

                const attachments = regularStream ? [regularStream, styledStream] : [styledStream]
                await reply({ body: 'QR đã tạo xong: 1 bản thường + 1 bản tùy chỉnh.', attachment: attachments })
            } finally {
                await browser.close()
            }
        } catch (e) {
            reply('Lỗi tạo trang QR: ' + e.message)
        }
    }
}

module.exports = new qrweb({
    name,
    version: '1.0.0',
    author: 'Quất',
    role: 0,
    prefix: false,
    guide: {},
    countDown: 0,
    category: 'fun',
    longDescription: {}
})

function buildHtml(opts) {
    const cfg = {
        data: opts.data,
        dots: opts.dotStyle,
        corners: opts.cornerStyle,
        logo: !!opts.replyImageDataUrl,
        imageSize: opts.imageSize,
        color1: opts.color1,
        color2: opts.color2,
        rotation: opts.rotation,
        bgColor: opts.bgColor || '#ffffff',
        replyImageDataUrl: opts.replyImageDataUrl || null
    }
    const cfgJson = JSON.stringify(cfg).replace(/</g, '\\u003c')
    return `<!doctype html>
<html lang="vi">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>QR Trang Trí Cực Đẹp</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700&display=swap" rel="stylesheet" />
  <style>
    :root { --bg1:#0f1226; --bg2:#1b1f3b; --primary:#8a5cff; --secondary:#3dd5f3; --accent:#ff6ec7; --card:#151833cc; --text:#e8eaf6; --muted:#b6b8d6; }
    *{box-sizing:border-box} html,body{height:100%} body{margin:0;font-family:Poppins,system-ui,-apple-system,Segoe UI,Roboto,Ubuntu,Cantarell,Noto Sans,Arial,"Apple Color Emoji","Segoe UI Emoji";color:var(--text);background:radial-gradient(1200px 600px at 10% 10%, #232a60 0%, rgba(0,0,0,0) 60%),radial-gradient(1000px 500px at 100% 0%, #24122e 0%, rgba(0,0,0,0) 50%),linear-gradient(180deg, var(--bg1), var(--bg2));display:grid;place-items:center;padding:32px}
    .wrap{width:min(1100px,100%);display:grid;grid-template-columns:1fr 420px;gap:28px}
    @media(max-width:980px){.wrap{grid-template-columns:1fr}}
    .card{position:relative;border-radius:24px;background:linear-gradient(180deg,#151833cc,#0f1226cc);backdrop-filter:blur(8px);border:1px solid #ffffff1a;box-shadow:0 30px 80px #00000066,inset 0 0 0 1px #ffffff0a;overflow:hidden}
    .card::before{content:"";position:absolute;inset:-2px;background:conic-gradient(from 200deg, var(--primary), var(--secondary), var(--accent), var(--primary));filter:blur(20px);opacity:.2;z-index:0}
    .card-inner{position:relative;z-index:1;padding:22px}
    .title{display:flex;align-items:center;justify-content:space-between;gap:16px;margin-bottom:12px}
    .title h1{margin:0;font-size:22px;font-weight:700;letter-spacing:.3px}
    .muted{color:var(--muted);font-size:13px}
    .qr-stage{display:grid;place-items:center;padding:12px}
    .qr-canvas{width:100%;max-width:720px;aspect-ratio:1/1;display:grid;place-items:center;margin:0 auto;border-radius:20px;background:radial-gradient(120% 120% at 30% 20%, #1b173f, #0f1226);border:1px solid #ffffff12;box-shadow:inset 0 0 50px #00000055}
    .qr-canvas>canvas,.qr-canvas>svg{width:100%!important;height:auto!important;display:block}
    .controls{display:grid;gap:12px}
    .btns{display:flex;gap:10px;flex-wrap:wrap}
    button{appearance:none;border:none;cursor:pointer;padding:10px 14px;border-radius:12px;color:white;font-weight:600;letter-spacing:.2px;background:linear-gradient(135deg, var(--primary), var(--secondary));box-shadow:0 10px 30px #00000055}
    button.secondary{background:#22264f;color:var(--text);border:1px solid #ffffff20}
  </style>
  <script>window.QR_CONFIG=${cfgJson}</script>
  <script src="https://unpkg.com/qr-code-styling@1.6.0/lib/qr-code-styling.js"></script>
  <script>
    const cfg = window.QR_CONFIG || {}
    const DEFAULT_DATA = cfg.data || 'Hello QR'
    const containerId = 'qrContainer'
    function makeGradient(){return{type:'linear',rotation:cfg.rotation||45,colorStops:[{offset:0,color:cfg.color1||'#8a5cff'},{offset:1,color:cfg.color2||'#3dd5f3'}]}}
    function makeCornerGradient(){return{type:'linear',rotation:cfg.rotation||90,colorStops:[{offset:0,color:cfg.color1||'#8a5cff'},{offset:1,color:cfg.color2||'#3dd5f3'}]}}
    function getTargetSize(){const container=document.getElementById(containerId);const rect=container.getBoundingClientRect();const size=Math.floor(Math.min(rect.width,1024));return Math.max(240,size)}
    // Only use logo if provided via reply
    let currentLogoDataUrl = cfg.replyImageDataUrl || null
    // Make circular logo
    function createCircularImageDataUrl(src, outputSize=512){
      return new Promise((resolve,reject)=>{
        const img=new Image();
        img.crossOrigin='anonymous';
        img.onload=()=>{
          const side=outputSize;
          const c=document.createElement('canvas'); c.width=side; c.height=side;
          const ctx=c.getContext('2d'); if(!ctx){reject(new Error('no-ctx'));return}
          ctx.clearRect(0,0,side,side);
          ctx.save(); ctx.beginPath(); ctx.arc(side/2,side/2,side/2,0,Math.PI*2); ctx.closePath(); ctx.clip();
          const iw=img.width, ih=img.height; const scale=Math.max(side/iw, side/ih);
          const dw=iw*scale, dh=ih*scale; const dx=(side-dw)/2, dy=(side-dh)/2;
          ctx.drawImage(img,dx,dy,dw,dh); ctx.restore();
          try{ resolve(c.toDataURL('image/png')) }catch(e){ reject(e) }
        };
        img.onerror=reject; img.src=src;
      })
    }
    async function instantiate(){
      const container=document.getElementById(containerId); container.innerHTML=''
      const size=getTargetSize()
      let logoUrl = null
      if (cfg.logo && currentLogoDataUrl) {
        try { logoUrl = await createCircularImageDataUrl(currentLogoDataUrl, 512) } catch(_) { logoUrl = currentLogoDataUrl }
      }
      const qr=new QRCodeStyling({
        width:size,height:size,type:'canvas',data:DEFAULT_DATA,
        qrOptions:{ errorCorrectionLevel:'Q', margin:16, typeNumber:0 },
        imageOptions:{ hideBackgroundDots:false, imageSize: (cfg.logo && cfg.imageSize != null) ? cfg.imageSize : 0.28, margin:2, crossOrigin:'anonymous' },
        image: (cfg.logo && logoUrl) ? logoUrl : undefined,
        backgroundOptions:{ color: cfg.bgColor || 'transparent' },
        dotsOptions:{ type: cfg.dots || 'classy-rounded', gradient: makeGradient() },
        cornersSquareOptions:{ type: cfg.corners || 'extra-rounded', gradient: makeCornerGradient() },
        // Make corner dots follow configured color (not white)
        cornersDotOptions:{ type: (cfg.corners==='square'?'square':'dot'), color: cfg.color1 || '#8a5cff' }
      })
      qr.append(container)
      window.__qr = qr
    }
    function download(ext){ const fileName = 'qr-trang-tri.'+ext; window.__qr && window.__qr.download({ name:fileName, extension:ext }) }
    window.addEventListener('DOMContentLoaded',()=>{instantiate(); const container=document.getElementById(containerId); const ro=new ResizeObserver(()=>{ if(!window.__qr)return; const size=getTargetSize(); window.__qr.update({width:size,height:size}) }); ro.observe(container) })
  </script>
  </head>
<body>
  <div class="wrap">
    <section class="card" style="grid-column:1 / -1">
      <div class="card-inner"><div class="title"><h1>QR Trang Trí Cực Đẹp</h1><span class="muted">Tạo • Tùy chỉnh • Tải về</span></div></div>
    </section>
    <section class="card">
      <div class="card-inner">
        <div class="qr-stage"><div class="qr-canvas" id="qrContainer"></div></div>
        <div class="btns" style="justify-content:center;padding:8px 12px 4px;">
          <button onclick="location.reload()" class="secondary">Làm mới</button>
          <button onclick="download('png')">Tải PNG</button>
          <button onclick="download('svg')">Tải SVG</button>
        </div>
        <div class="muted" style="text-align:center;margin:10px 0 6px">Gợi ý: đặt logo ở giữa, chấm bo tròn, gradient ấn tượng.</div>
      </div>
    </section>
  </div>
</body>
</html>`
}

function downloadToDataUrl(url) {
    return new Promise((resolve, reject) => {
        https.get(url, res => {
            const chunks = []
            res.on('data', d => chunks.push(d))
            res.on('end', () => {
                const buf = Buffer.concat(chunks)
                const mime = res.headers['content-type'] || 'image/png'
                const b64 = buf.toString('base64')
                resolve(`data:${mime};base64,${b64}`)
            })
        }).on('error', reject)
    })
}