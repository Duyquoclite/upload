let name = 'weather'
const { spawn } = require('child_process')

class weatherCmd {
    constructor(a) { this.config = a }
    async onStart({ message: { reply }, args, api: { quất: { func, reads, stream, par, json } } }) {
        let location = args.join(' ').trim()
        if (!location) return reply('Vui lòng nhập địa điểm. VD: weather thái bình')

        const scriptPath = func('weather.js') // scripts/cmds/data/func/weather.js

        // Chạy test2.js với query truyền vào qua env WEATHER_QUERY
        const child = spawn(process.execPath, [scriptPath], {
            env: { ...process.env, WEATHER_QUERY: location },
            cwd: process.cwd(),
            stdio: 'inherit'
        })
        let tỉnh = par(json('tỉnh3.json'))
        for (const a of Object.keys(tỉnh)) {
            const found = tỉnh[a].find(b => b.toLowerCase().includes(location.toLowerCase()))
            if (found) {
              location = `${found} - ${a}`;
              break;
            }
          }          
        child.on('exit', async (code) => {
            try {
                if (code !== 0) return reply('Không thể tạo ảnh thời tiết.')
                const fileStream = await reads(stream('weather.png'))
                reply({ body: `Thời tiết: ${location}`, attachment: fileStream })
            } catch {
                reply('Đã chạy xong nhưng không thể gửi ảnh.')
            }
        })
    }
}

module.exports = new weatherCmd({
    name,
    version: '1.0.0',
    author: 'Quất',
    role: 0,
    prefix: false,
    guide: { vi: { usage: 'weather <địa điểm>' } },
    countDown: 0,
    category: 'tools',
    longDescription: {}
})


