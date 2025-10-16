//src
let name = 'opfruit'
let { get } = require('axios')
class opfruit {
    constructor(a) {
        this.config = a
    }
    async onStart({ message: { reply }, args, api: { quất: { dịch } } }) {
        try {
            let query = (args || []).join(' ').trim()
            let { data } = await get('https://api.api-onepiece.com/v2/fruits/en')
            let q = query.toLowerCase()

            // Nếu đúng tên trái (khớp chính xác name hoặc roman_name) -> trả thông tin tối giản + ảnh
            let fruit = data.find(a => (a.name || '').toLowerCase() === q || (a.roman_name || '').toLowerCase() === q)
            if (fruit) {
                let body = [
                    `Tên trái ác quỷ: ${fruit.roman_name} (${await dịch(fruit.name)})`,
                    `Hệ: ${fruit.type} (${await dịch(fruit.type)})`,
                    `Mô tả: ${await dịch(String(fruit.description).replace(/\s+/g, ' ').trim())}`
                ].join('\n')
                try {
                    let img = await get(fruit.filename, { responseType: 'stream' })
                    return reply({ body, attachment: img.data })
                } catch (_) {
                    return reply(body)
                }
            }

            // Không đúng trái (hoặc nhập hệ) -> liệt kê tất cả hệ và trái trong từng hệ
            let groups = {}
            for (let item of data) {
                let t = (item.type || 'Unknown').toLowerCase()
                if (!groups[t]) groups[t] = []
                groups[t].push(item)
            }
            let order = ['paramecia', 'logia', 'zoan mythique', 'zoan', 'smile', 'unknown']
            let parts = []
            for (let key of order) {
                if (groups[key]?.length) {
                    parts.push('hệ ' + key)
                    parts.push(...groups[key].sort((a, b) => a.id - b.id).map((a, i) => `${i + 1} ${(a.roman_name || a.name)} (${a.name || a.roman_name})`))
                    parts.push('')
                }
            }
            for (let key of Object.keys(groups)) {
                if (!order.includes(key)) {
                    parts.push('--- Hệ ' + key + ' ---')
                    parts.push(...groups[key].sort((a, b) => a.id - b.id).map((a, i) => `${i + 1} ${(a.roman_name || a.name)} (${a.name || a.roman_name})`))
                    parts.push('')
                }
            }
            return reply(parts.join('\n').trim())
        } catch (e) {
            reply('Lỗi: ' + (e.response?.status || e.message))
        }
    }
}
module.exports = new opfruit({
    name,
    version: '1.0.0',
    author: 'Quất',
    role: 0,
    prefix: false,
    guide: {},
    countDown: 0,
    category: 'anime',
    longDescription: {},
})