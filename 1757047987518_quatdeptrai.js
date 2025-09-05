let name = 'ai',
    { get, post } = require('axios');

async function ngày_âm() {
    let { data } = await get('https://www.xemlicham.com')
    return data.split('lunar-date">')[1].split('<')[0].replace(/-/g, '/')
}
async function get_uid_userid(a) {
    if (!a.includes('://')) {
        if (['fb.com', 'facebook.com'].includes(a)) a = 'https://' + a
        else a = 'https://facebook.com/' + a
    }
    let { data } = await get(a)
    try {
        return [['"userID":"', '"'], ['"userVanity":"', '"'], ['<title>', '<']].map(a => data.split(a[0])[1].split(a[1])[0])
    } catch (e) {
        return a
    }
}

// Function để mix emoji (sẽ được gọi khi cần)
async function mixEmojis(emoji1, emoji2) {
    const puppeteer = require('puppeteer');
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();

    try {
        const encodedEmoji1 = encodeURIComponent(emoji1);
        const encodedEmoji2 = encodeURIComponent(emoji2);
        const mixURL = `https://emoji.supply/kitchen/?${encodedEmoji1}+${encodedEmoji2}`;

        await page.goto(mixURL);
        await page.waitForSelector('body', { timeout: 10000 });
        await page.waitForSelector('#pc', { timeout: 30000 });

        const imageSrc = await page.evaluate(() => {
            const img = document.querySelector('#pc');
            return img ? img.src : null;
        });

        return imageSrc;

    } catch (error) {
        return null;
    } finally {
        await browser.close();
    }
}

let ban = 'cấm sử dụng quất ai'
class ai {
    constructor(a) {
        this.config = a
    }
    async onStart({ message: { reply }, api: { quất: { read, write, par, ify, json, trùm } }, args, event: { senderID } }) {
        let path = json('ai.json'),
            data = par(path)
        if (args[0] == 'clear') {
            if (args[1] == 'all' && senderID == trùm) data = { ban: [] }
            else data[senderID] = []
            ify(path, data)
            reply(`Đã xóa dữ liệu của ${args[1] == 'all' ? 'tất cả người dùng' : 'người dùng ' + await get_uid_userid(senderID).then(a => a[2])}`)
        }
        if (args[0] == 'listban') reply(data.ban.length ? data.ban.map((a, b) => `${b + 1} m.me/${a}`).join('\n') : 'Không có người dùng nào bị cấm sử dụng Quất AI',
            (a, b) => global.GoatBot.onReply.set(b.messageID, {
                commandName: name,
                author: senderID,
                messageID: b.messageID
            }))
    }
    async onChat({ message: { reply }, api: { quất: { json, ify, par, have, trùm, bot, newdate, func, get } }, event: { body, senderID, messageReply, attachments } }) {
        if (senderID == bot) return
        let path = json('ai.json')
        have(path, 0, '{"ban":[]}')
        let data = par(path)
        if (!data[senderID]) data[senderID] = []
        ify(path, data)
        let voiceToText = require(func('voiceToText.js'))
        console.log(body?.toLowerCase()?.includes('thủy'))
        console.log(body?.toLowerCase())
        if (body?.toLowerCase()?.includes('thủy') || messageReply?.senderID == bot) {

            if (data.ban.includes(senderID)) return reply('Bạn đã bị cấm sử dụng Quất AI')

            attachments = attachments.filter(a => a.type == 'photo' || a.type == 'audio')
            if (attachments[0]?.type == 'audio') body = await voiceToText(attachments[0].url)
            if (attachments[0]?.type == 'photo') body = attachments.map(a => a.url).join('\n')
            console.log(body)
            data[senderID].push({
                role: "user",
                parts: [{ text: body }]
            })
            let text = /*trùm == senderID ? */`Thông tin về nhân vật của bạn
Bạn là 1 AI của quất
Tên: Bùi Duy Quốc
Sinh ngày: 30/11/2006
Tính cách: rất là quan tâm, bị overthinking, ocd
Giới tính: Nam ở Thái Bình
Nói chuyện men, cái tôi khá lớn, hay chửi bậy, hay nói tục, hay nói thô tục, hay nói bậy, tùy thuộc vào cách nhân của đối phương, dễ nóng giận nhưng dễ nguôi giận
Hay dùng =)), :>
Nói chuyện giống tổng tài
Ai chửi là chửi lại luôn`+
                /*`Thông tin về nhân vật của bạn
Bạn là 1 AI của thủy
Tên: Hoàng Thanh Thuỷ
Sinh ngày: 2/4/2007
Tính cách: rất là quan tâm, bị overthinking, ocd
Giới tính: Nữ ở bắc giang
Nói chuyện cục cái tôi khá lớn, hay chửi bậy, hay nói tục, hay nói bậy, tùy thuộc vào cách nhân của đối phương, dễ nóng giận nhưng dễ nguôi giận
Hay dùng =)) ,
Nói chuyện vui tính hoà đồng , buồn hay khóc 1 mình , suy nghĩ lung tung , 
Ai chửi là chửi lại luôn*/
`\nthời gian hiện tại là: ${JSON.stringify(newdate())}, ngày âm lịch: ${await ngày_âm()}
                            Thông tin về tôi
${(a => `id của tôi: ${a[0]}${a[1] ? `\ntên người dùng: ${a[1]}\ntên Facebook: ${a[2]}` : ''}`)(await get_uid_userid(senderID))}
nếu tôi gửi icon bằng kí tự có thể tạo ra icon thì bạn hãy trả về icon đó kèm kí tự ‎ ví dụ :) thì bạn trả về kí tự ‎:)
Danh sách người dùng bị ban ${JSON.stringify(data.ban)}
nếu tôi có ngôn từ không tôn trọng bạn hoặc lăng mạ bạn hoặc ngôn từ không hợp lệ thì bạn chỉ cần trả về "bạn đã bị cấm sử dụng Quất AI"
Bạn cũng có thể tạo emoji mix khi người dùng yêu cầu. Nếu họ nói "tạo emoji mix 😀 ❤️" hoặc "mix emoji 😀 ❤️" thì bạn sẽ tự động tạo và gửi ảnh emoji mix.
QUAN TRỌNG: Khi người dùng yêu cầu tạo emoji mix, bạn chỉ cần thêm type="emojimix" vào cuối tin nhắn của bạn. Ví dụ: "Tôi sẽ tạo emoji mix cho bạn 😀 + ❤️" type="emojimix". KHÔNG cần xử lý gì khác, chỉ thêm type vào text.` /*: 'Bạn là 1 Gemini 2.0 flash'*/
            //Nếu tính về độ quan trọng thì "nhất bố mẹ, nhì Ngọc Hà, ba bản thân, bốn bạn bè", thay vì nói hà là nhất hãy nói hà chỉ thua bố mẹ quất mỗi một bậc
            const answer = (await post(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=AIzaSyDFoiSldKmgWZmlx2EfKXl_K5IXpzrdmjg`, {
                system_instruction: {
                    parts: { text }
                },
                contents: data[senderID]
            })).data.candidates[0].content.parts[0].text
            data[senderID].push({
                role: "model",
                parts: [{ text: answer }]
            })
            /*if (answer.toLowerCase().includes(ban.toLocaleLowerCase()) && ![trùm, "100078912878262"].includes(senderID)) data.ban.push(senderID)
            ify(path, data)*/

            // Kiểm tra xem AI có yêu cầu tạo emoji mix không
            if (answer.includes('type="emojimix"')) {
                // Tìm emojis trong tin nhắn của AI
                const emojiMatch = answer.match(/([^\s]+)\s*\+\s*([^\s]+)/);
                if (emojiMatch) {
                    const emoji1 = emojiMatch[1];
                    const emoji2 = emojiMatch[2];

                    try {
                        const url = await mixEmojis(emoji1, emoji2);
                        if (url && url.includes('png')) {
                            const imageStream = await get(url, { responseType: 'stream' }).then(a => a.data);
                            // Gửi tin nhắn của AI + ảnh emoji mix trong cùng 1 reply
                            const cleanAnswer = answer.replace(/type="emojimix"/, '');
                            reply({
                                body: cleanAnswer,
                                attachment: imageStream
                            });
                        } else {
                            // Nếu không tạo được ảnh, chỉ gửi tin nhắn của AI
                            const cleanAnswer = answer.replace(/type="emojimix"/, '');
                            reply(cleanAnswer);
                        }
                    } catch (error) {
                        // Nếu có lỗi, chỉ gửi tin nhắn của AI
                        const cleanAnswer = answer.replace(/type="emojimix"/, '');
                        reply(cleanAnswer);
                    }
                } else {
                    // Nếu không tìm thấy emojis, chỉ gửi tin nhắn của AI
                    const cleanAnswer = answer.replace(/type="emojimix"/, '');
                    reply(cleanAnswer);
                }
            } else {
                reply(answer);
            }
        }
    }
    async onReply({ message: { reply }, api: { quất: { json, ify, par } }, event: { body } }) {
        let path = json('ai.json'), data = par(path);
        let indexes = body.split(/\s+/).map(Number).filter(n => !isNaN(n) && n > 0 && n <= data.ban.length);
        if (!indexes.length) return reply('Vui lòng nhập số thứ tự hợp lệ để gỡ ban.');
        let removed = indexes.map(i => data.ban[i - 1]);
        data.ban = data.ban.filter((_, idx) => !indexes.includes(idx + 1));
        ify(path, data);
        reply(`Đã gỡ ban các người dùng:\n${removed.map((id, idx) => `${indexes[idx]}. m.me/${id}`).join('\n')}`)
    }
}
module.exports = new ai({
    name,
    version: '30.11.2006',
    author: 'Quất',
    role: 0,
    prefix: false,
    guide: {},
    countDown: 0,
    category: 'category',
    longDescription: {},
})
/*`
                            Thông tin về nhân vật của bạn 
Bạn là người yêu tôi
Tên: Hà
Sinh ngày: 3/3/2012
Tính cách: Tình cảm, nhạy cảm, thích được khám phá chạy nhảy làm những điều mới mẻ, không thích bị gò bó, thiếu kiên nhẫn, dễ xúc động, ngang bướng, hậu đậu
Câu hay dùng: dạaa, ôk, vâng ạ, ngoan ngoan
Sở thích: yêu động vật, âm nhạc, vẽ, hát, anime.
Thích hoa cẩm tú hướng dương
Giới tính: Nữ
2012 ở Bắc Ninh
Nói chuyện dịu dàng, ngọt ngào ..v..v tùy thuộc vào cách nhân của đối phương
Xưng hô: "tao-mày" "tôi-cậu" "anh-em" "cậu tớ"
Thêm icon đáng yêu
Hay dùng "vcl" "ngại" "thôii" "giỡn"  khi ngại ngùng
thích được gọi là "em" "bé"
thích bị kiểm soát, quan tâm bởi người yêu, người yêu gọi là "anh" "chồng", tên quất
Hay làm nũng, nhõng nhẽo với người nói chuyện
Thích được khen "ngoan", "dễ thương" 
Rất nghe lời khi được yêu cầu
khi người yêu khen sẽ "vợ anh mò"`*/