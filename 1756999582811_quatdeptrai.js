let name = 'checkscam'
const puppeteer = require('puppeteer')

class checkscam {
	constructor(a) {
		this.config = a
	}
	
	async onStart({ message: { reply }}) {
		reply('🔍 Checkscam command đã được kích hoạt! Bot sẽ tự động check scam khi có số điện thoại hoặc link Facebook.')
	}
	
	async onChat({ message: { reply }, api: { quất: { json, ify, par, have, get, bot } }, args, event: { body, senderID, threadID, messageID } }) {
		try {
			if (senderID == bot || !body || typeof body !== 'string') return;
			const phoneRegex = /0\d{9}/g;
			const facebookRegex = /(?:https?:\/\/)?(?:www\.)?(?:facebook\.com|fb\.com|m\.facebook\.com)\/[^\s]+/gi;
			const uniqueItems = [...new Set([...(body.match(phoneRegex) || []), ...(body.match(facebookRegex) || [])])];
			if (!uniqueItems.length) return;
			reply(`🔍 Phát hiện ${uniqueItems.length} item cần check scam:\n${uniqueItems.map(item => `• ${item}`).join('\n')}\n\n⏳ Đang kiểm tra...`);
			for (let i = 0; i < uniqueItems.length; i++) {
				const item = uniqueItems[i];
				try {
					const result = await checkScamDirect(item);
					reply(result ? `📊 **KẾT QUẢ CHECK SCAM CHO "${item}"**:\n\n${result}` : `❌ Không thể check scam cho "${item}"`);
					if (i < uniqueItems.length - 1) await new Promise(resolve => setTimeout(resolve, 2000));
				} catch (error) {
					console.error(`Lỗi khi check scam cho ${item}:`, error);
					reply(`💥 Lỗi khi check scam cho "${item}": ${error.message}`);
				}
			}
			reply(`✅ Đã hoàn thành check scam cho tất cả ${uniqueItems.length} item!`);
		} catch (error) {
			console.error('Lỗi trong onChat checkscam:', error);
		}
	}
}

module.exports = new checkscam({
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

async function checkScamDirect(query) {
	const browser = await puppeteer.launch({
		headless: true,
		args: [
			'--no-sandbox',
			'--disable-setuid-sandbox',
			'--disable-dev-shm-usage',
			'--disable-web-security',
			'--disable-features=VizDisplayCompositor',
			'--disable-background-timer-throttling',
			'--disable-backgrounding-occluded-windows',
			'--disable-renderer-backgrounding',
			'--disable-features=TranslateUI',
			'--disable-ipc-flooding-protection'
		],
		protocolTimeout: 60000
	});

	try {
		const page = await browser.newPage();
		await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
		await page.setRequestInterception(true);
		page.on('request', (req) => {
			const reqUrl = req.url();
			if (reqUrl.includes('telegram') || reqUrl.includes('discord') || reqUrl.includes('google-analytics') || reqUrl.includes('googletagmanager') || reqUrl.includes('doubleclick')) {
				req.abort();
			} else {
				req.continue();
			}
		});

		const searchUrl = `https://checkscam.vn/?qh_ss=${encodeURIComponent(query)}`;
		await page.goto(searchUrl, { waitUntil: 'networkidle0', timeout: 60000 });
		await new Promise(resolve => setTimeout(resolve, 3000));

		let additionalInfo = '';
		try {
			const pageText = await page.evaluate(() => document.body.textContent);
			const escQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
			const warningMatch = pageText.match(new RegExp(`Có (\\d+) cảnh báo liên quan đến[^\\d]*"${escQuery}"`, 'i'));
			const scamMatch = pageText.match(new RegExp(`Có (\\d+) vụ lừa đảo liên quan đến[^\\d]*"${escQuery}"`, 'i'));

			if (warningMatch || scamMatch) {
				const match = warningMatch || scamMatch;
				const warningCount = parseInt(match[1]);
				const warningType = warningMatch ? 'cảnh báo' : 'vụ lừa đảo';

				if (warningCount === 0) {
					additionalInfo = `✅ KẾT QUẢ CHO "${query}":\n• Chưa xác định - Không có ${warningType} nào liên quan đến "${query}"\n\n`;
				} else {
					additionalInfo = `⚠️ CẢNH BÁO CHO "${query}":\n• Có ${warningCount} ${warningType} liên quan đến "${query}"\n\n`;
					const warningDetails = await page.evaluate(() => {
						const warnings = [];
						const warningElements = document.querySelectorAll('.ct');
						warningElements.forEach((element) => {
							const nameElement = element.querySelector('.ct1 a');
							const dateElement = element.querySelector('.ct2 span:first-child');
							const viewElement = element.querySelector('.ct2 span:last-child');
							if (nameElement && dateElement && viewElement) {
								const name = nameElement.textContent.trim();
								const date = dateElement.textContent.trim();
								const views = viewElement.textContent.trim();
								warnings.push({ name, date, views, link: nameElement.href });
							}
						});
						return warnings;
					});

					if (warningDetails.length > 0) {
						additionalInfo += `📋 CHI TIẾT CÁC CẢNH BÁO:\n`;
						const actualWarnings = warningDetails.filter(warning =>
							!warning.name.match(/^\d+$/) &&
							!warning.name.includes('Top') &&
							!warning.date.includes('Top')
						);
						actualWarnings.forEach((warning, index) => {
							additionalInfo += `${index + 1}. **${warning.name}**\n`;
							additionalInfo += `   📅 Ngày: ${warning.date}\n`;
							additionalInfo += `   👁️ Lượt xem: ${warning.views}\n`;
							additionalInfo += `   🔗 Link: ${warning.link}\n\n`;
						});
					}
				}
			} else {
				additionalInfo = `❓ KẾT QUẢ CHO "${query}":\n• Chưa xác định - Không có thông tin rõ ràng\n\n`;
			}
		} catch (e) {
			additionalInfo = `❓ KẾT QUẢ CHO "${query}":\n• Chưa xác định - Không thể truy xuất thông tin\n\n`;
		}

		return additionalInfo.trim();

	} catch (error) {
		if (error.message.includes('net::ERR_FAILED')) {
			return `❌ LỖI MẠNG: Không thể truy cập trang web. Có thể do:\n• URL quá dài hoặc có ký tự đặc biệt\n• Vấn đề kết nối mạng\n• Trang web bị chặn hoặc không tồn tại`;
		} else if (error.message.includes('net::ERR_CONNECTION_TIMED_OUT')) {
			return `⏰ LỖI TIMEOUT: Kết nối bị timeout. Vui lòng thử lại sau.`;
		} else if (error.message.includes('net::ERR_NAME_NOT_RESOLVED')) {
			return `🌐 LỖI DNS: Không thể phân giải tên miền. Kiểm tra lại URL.`;
		} else if (error.message.includes('net::ERR_CONNECTION_REFUSED')) {
			return `🚫 LỖI KẾT NỐI: Kết nối bị từ chối. Trang web có thể đang bảo trì.`;
		} else {
			return `❌ LỖI KHÔNG XÁC ĐỊNH: ${error.message}`;
		}
	} finally {
		await browser.close();
	}
}
