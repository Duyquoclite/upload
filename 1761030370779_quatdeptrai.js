const { getStreamFromURL, uploadImgbb } = global.utils;
const fs = require('fs');
const path = require('path');

// Đường dẫn file JSON để lưu dữ liệu anti
const antiDataPath = path.join(__dirname, 'data', 'json', 'antiData.json');

// Hàm đọc dữ liệu anti từ JSON
function readAntiData() {
    try {
        if (fs.existsSync(antiDataPath)) {
            const data = fs.readFileSync(antiDataPath, 'utf8');
            return JSON.parse(data);
        }
        return {};
    } catch (error) {
        console.log('Lỗi khi đọc file anti data:', error);
        return {};
    }
}

// Hàm ghi dữ liệu anti vào JSON
function writeAntiData(data) {
    try {
        // Tạo thư mục nếu chưa tồn tại
        const dir = path.dirname(antiDataPath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(antiDataPath, JSON.stringify(data, null, 2), 'utf8');
    } catch (error) {
        console.log('Lỗi khi ghi file anti data:', error);
    }
}

module.exports = {
    config: {
        name: "anti",
        version: "1.0.0",
        author: "Quất",
        countDown: 5,
        role: 1,
        description: {
            vi: "Bật tắt chức năng chống thành viên thay đổi thông tin nhóm",
            en: "Turn on/off anti change group settings"
        },
        prefix: false,
        category: "moderation",
        guide: {
            vi: "   {pn} name: bật/tắt chống đổi tên nhóm"
                + "\n   {pn} image: bật/tắt chống đổi ảnh nhóm"
                + "\n   {pn} nickname: bật/tắt chống đổi biệt danh"
                + "\n   {pn} leave: bật/tắt chống rời nhóm"
                + "\n   {pn} theme: bật/tắt chống đổi chủ đề"
                + "\n   {pn} icon: bật/tắt chống đổi icon"
                + "\n   {pn} tagall: bật/tắt chống tag tất cả"
                + "\n   {pn} all: bật/tắt tất cả chức năng anti",
            en: "   {pn} name: toggle anti change group name"
                + "\n   {pn} image: toggle anti change group image"
                + "\n   {pn} nickname: toggle anti change nickname"
                + "\n   {pn} leave: toggle anti leave group"
                + "\n   {pn} theme: toggle anti change theme"
                + "\n   {pn} icon: toggle anti change icon"
                + "\n   {pn} tagall: toggle anti tag all"
                + "\n   {pn} all: toggle all anti functions"
        }
    },


    onStart: async function ({ message, event, args, threadsData, api }) {
        // Nếu không có arguments, hiển thị các chức năng anti có sẵn
        if (!args.length) {
            return message.reply("🔧 Các chức năng anti có sẵn:\n"
                + "• name: Bật/tắt chống đổi tên nhóm\n"
                + "• image: Bật/tắt chống đổi ảnh nhóm\n"
                + "• nickname: Bật/tắt chống đổi biệt danh\n"
                + "• leave: Bật/tắt chống rời nhóm\n"
                + "• theme: Bật/tắt chống đổi chủ đề\n"
                + "• icon: Bật/tắt chống đổi icon\n"
                + "• tagall: Bật/tắt chống tag tất cả\n"
                + "• all: Bật/tắt tất cả chức năng anti");
        }

        const { threadID } = event;
        const allAntiData = readAntiData();
        const dataAnti = allAntiData[threadID] || {};

        async function checkAndSaveData(key, data) {
            const isCurrentlyOn = dataAnti[key] !== undefined;
            
            if (isCurrentlyOn) {
                delete dataAnti[key];
            } else {
                dataAnti[key] = data;
            }
            
            // Kiểm tra xem có dữ liệu thực sự không (loại bỏ object rỗng)
            const hasValidData = Object.keys(dataAnti).some(key => {
                if (key === 'nickname') {
                    return Object.keys(dataAnti[key]).length > 0;
                }
                return dataAnti[key] !== undefined && dataAnti[key] !== null && dataAnti[key] !== '';
            });
            
            if (hasValidData) {
                allAntiData[threadID] = dataAnti;
            } else {
                delete allAntiData[threadID];
            }
            
            writeAntiData(allAntiData);
            
            const messages = {
                "name": isCurrentlyOn ? "❌ Đã tắt chức năng chống đổi tên nhóm" : "✅ Đã bật chức năng chống đổi tên nhóm",
                "image": isCurrentlyOn ? "❌ Đã tắt chức năng chống đổi ảnh nhóm" : "✅ Đã bật chức năng chống đổi ảnh nhóm",
                "nickname": isCurrentlyOn ? "❌ Đã tắt chức năng chống đổi biệt danh" : "✅ Đã bật chức năng chống đổi biệt danh",
                "leave": isCurrentlyOn ? "❌ Đã tắt chức năng chống rời nhóm" : "✅ Đã bật chức năng chống rời nhóm",
                "theme": isCurrentlyOn ? "❌ Đã tắt chức năng chống đổi chủ đề" : "✅ Đã bật chức năng chống đổi chủ đề",
                "icon": isCurrentlyOn ? "❌ Đã tắt chức năng chống đổi icon" : "✅ Đã bật chức năng chống đổi icon",
                "tagall": isCurrentlyOn ? "❌ Đã tắt chức năng chống tag tất cả" : "✅ Đã bật chức năng chống tag tất cả"
            };
            message.reply(messages[key]);
        }

        switch (args[0]) {
            case "name": {
                const threadInfo = await api.getThreadInfo(threadID);
                await checkAndSaveData("name", threadInfo.threadName);
                break;
            }
            case "image":
            case "avt":
            case "avatar": {
                const threadInfo = await api.getThreadInfo(threadID);
                if (!threadInfo.imageSrc)
                    return message.reply("❌ Nhóm chưa có ảnh đại diện");
                const newImageSrc = await uploadImgbb(threadInfo.imageSrc);
                await checkAndSaveData("image", newImageSrc.image.url);
                break;
            }
            case "nickname": {
                const threadInfo = await api.getThreadInfo(threadID);
                // Lọc nickname từ nicknames object, loại bỏ null/empty
                const nicknameData = {};
                for (const [userID, nickname] of Object.entries(threadInfo.nicknames || {})) {
                    if (nickname && nickname.trim() !== '') {
                        nicknameData[userID] = nickname;
                    }
                }
                await checkAndSaveData("nickname", nicknameData);
                break;
            }
            case "leave": {
                await checkAndSaveData("leave", true);
                break;
            }
            case "theme": {
                const threadInfo = await api.getThreadInfo(threadID);
                await checkAndSaveData("theme", threadInfo.threadThemeID);
                break;
            }
            case "icon":
            case "emoji": {
                const threadInfo = await api.getThreadInfo(threadID);
                await checkAndSaveData("icon", threadInfo.emoji);
                break;
            }
            case "tagall": {
                await checkAndSaveData("tagall", true);
                break;
            }
            case "all": {
                const hasAnyAnti = Object.keys(dataAnti).length > 0;
                
                if (hasAnyAnti) {
                    // Tắt tất cả - xóa hoàn toàn threadID
                    delete allAntiData[threadID];
                    writeAntiData(allAntiData);
                    message.reply("❌ Đã tắt tất cả chức năng anti");
                } else {
                    // Bật tất cả
                    const threadInfo = await api.getThreadInfo(threadID);
                    // Lọc nickname từ nicknames object, loại bỏ null/empty
                    const nicknameData = {};
                    for (const [userID, nickname] of Object.entries(threadInfo.nicknames || {})) {
                        if (nickname && nickname.trim() !== '') {
                            nicknameData[userID] = nickname;
                        }
                    }

                    dataAnti.name = threadInfo.threadName;
                    dataAnti.leave = true;
                    dataAnti.tagall = true;
                    dataAnti.theme = threadInfo.threadThemeID;
                    dataAnti.icon = threadInfo.emoji;

                    if (threadInfo.imageSrc) {
                        const newImageSrc = await uploadImgbb(threadInfo.imageSrc);
                        dataAnti.image = newImageSrc.image.url;
                    }

                    dataAnti.nickname = nicknameData;

                    allAntiData[threadID] = dataAnti;
                    writeAntiData(allAntiData);
                    message.reply("✅ Đã bật tất cả chức năng anti");
                }
                break;
            }
            default: {
                return message.SyntaxError();
            }
        }
    },

    onEvent: async function ({ message, event, threadsData, role, api }) {
        const { threadID, logMessageType, logMessageData, author } = event;
        const allAntiData = readAntiData();
        const dataAnti = allAntiData[threadID] || {};

        // Chống đổi tên nhóm
        if (logMessageType === "log:thread-name" && dataAnti.name) {
            if (role < 1 && api.getCurrentUserID() !== author) {
                message.reply("⚠️ Không được phép đổi tên nhóm!");
                api.setTitle(dataAnti.name, threadID);
            } else {
                const threadName = logMessageData.name;
                dataAnti.name = threadName;
                const hasValidData = Object.keys(dataAnti).some(key => {
                    if (key === 'nickname') {
                        return Object.keys(dataAnti[key]).length > 0;
                    }
                    return dataAnti[key] !== undefined && dataAnti[key] !== null && dataAnti[key] !== '';
                });
                
                if (hasValidData) {
                    allAntiData[threadID] = dataAnti;
                } else {
                    delete allAntiData[threadID];
                }
                writeAntiData(allAntiData);
            }
        }

        // Chống đổi ảnh nhóm
        if (logMessageType === "log:thread-image" && dataAnti.image) {
            if (role < 1 && api.getCurrentUserID() !== author) {
                message.reply("⚠️ Không được phép đổi ảnh nhóm!");
                if (dataAnti.image !== "REMOVE") {
                    api.changeGroupImage(await getStreamFromURL(dataAnti.image), threadID);
                }
            } else {
                const imageSrc = logMessageData.url;
                if (!imageSrc) {
                    dataAnti.image = "REMOVE";
                } else {
                    const newImageSrc = await uploadImgbb(imageSrc);
                    dataAnti.image = newImageSrc.image.url;
                }
                const hasValidData = Object.keys(dataAnti).some(key => {
                    if (key === 'nickname') {
                        return Object.keys(dataAnti[key]).length > 0;
                    }
                    return dataAnti[key] !== undefined && dataAnti[key] !== null && dataAnti[key] !== '';
                });
                
                if (hasValidData) {
                    allAntiData[threadID] = dataAnti;
                } else {
                    delete allAntiData[threadID];
                }
                writeAntiData(allAntiData);
            }
        }

        // Chống đổi biệt danh
        if (logMessageType === "log:user-nickname" && dataAnti.nickname) {
            if (role < 1 && api.getCurrentUserID() !== author) {
                message.reply("⚠️ Không được phép đổi biệt danh!");
                const { participant_id } = logMessageData;
                if (dataAnti.nickname[participant_id]) {
                    api.changeNickname(dataAnti.nickname[participant_id], threadID, participant_id);
                }
            } else {
                const { nickname, participant_id } = logMessageData;
                if (!dataAnti.nickname) dataAnti.nickname = {};
                
                // Nếu nickname là null hoặc rỗng thì xóa key đó
                if (nickname && nickname.trim() !== '') {
                    dataAnti.nickname[participant_id] = nickname;
                } else {
                    delete dataAnti.nickname[participant_id];
                }
                
                // Nếu nickname object rỗng thì xóa luôn
                if (Object.keys(dataAnti.nickname).length === 0) {
                    delete dataAnti.nickname;
                }
                
                const hasValidData = Object.keys(dataAnti).some(key => {
                    if (key === 'nickname') {
                        return Object.keys(dataAnti[key]).length > 0;
                    }
                    return dataAnti[key] !== undefined && dataAnti[key] !== null && dataAnti[key] !== '';
                });
                
                if (hasValidData) {
                    allAntiData[threadID] = dataAnti;
                } else {
                    delete allAntiData[threadID];
                }
                writeAntiData(allAntiData);
            }
        }

        // Chống rời nhóm
        if (logMessageType === "log:unsubscribe" && dataAnti.leave) {
            const { leftParticipantFbId } = logMessageData;
            if (role < 1 && api.getCurrentUserID() !== leftParticipantFbId) {
                message.reply("⚠️ Không được phép rời nhóm!");
                // Thêm lại người dùng vào nhóm (nếu có quyền)
                try {
                    await api.addUserToGroup(leftParticipantFbId, threadID);
                } catch (err) {
                    console.log("Không thể thêm lại người dùng:", err);
                }
            }
        }

        // Chống đổi chủ đề
        if (logMessageType === "log:thread-color" && dataAnti.theme) {
            if (role < 1 && api.getCurrentUserID() !== author) {
                message.reply("⚠️ Không được phép đổi chủ đề!");
                api.changeThreadColor(dataAnti.theme || "196241301102133", threadID);
            } else {
                const threadThemeID = logMessageData.theme_id;
                dataAnti.theme = threadThemeID;
                const hasValidData = Object.keys(dataAnti).some(key => {
                    if (key === 'nickname') {
                        return Object.keys(dataAnti[key]).length > 0;
                    }
                    return dataAnti[key] !== undefined && dataAnti[key] !== null && dataAnti[key] !== '';
                });
                
                if (hasValidData) {
                    allAntiData[threadID] = dataAnti;
                } else {
                    delete allAntiData[threadID];
                }
                writeAntiData(allAntiData);
            }
        }

        // Chống đổi icon
        if (logMessageType === "log:thread-icon" && dataAnti.icon) {
            if (role < 1 && api.getCurrentUserID() !== author) {
                message.reply("⚠️ Không được phép đổi icon!");
                api.changeThreadEmoji(dataAnti.icon, threadID);
            } else {
                const threadEmoji = logMessageData.thread_icon;
                dataAnti.icon = threadEmoji;
                const hasValidData = Object.keys(dataAnti).some(key => {
                    if (key === 'nickname') {
                        return Object.keys(dataAnti[key]).length > 0;
                    }
                    return dataAnti[key] !== undefined && dataAnti[key] !== null && dataAnti[key] !== '';
                });
                
                if (hasValidData) {
                    allAntiData[threadID] = dataAnti;
                } else {
                    delete allAntiData[threadID];
                }
                writeAntiData(allAntiData);
            }
        }
    },

    onChat: async function ({ message, event, threadsData, role, api }) {
        const { threadID, senderID, mentions, type } = event;
        const allAntiData = readAntiData();
        const dataAnti = allAntiData[threadID] || {};

        // Chống tag tất cả
        if (dataAnti.tagall && mentions && Object.keys(mentions).length > 0) {
            try {
                const threadInfo = await api.getThreadInfo(threadID);
                const adminIDs = threadInfo.adminIDs || [];
                const isAdmin = adminIDs.includes(senderID);

                // Kiểm tra nếu tag tất cả thành viên
                const mentionedIDs = Object.keys(mentions);
                const isTaggingEveryone = mentionedIDs.length === threadInfo.participantIDs.length;

                if (isTaggingEveryone && !isAdmin) {
                    // Kick người tag tất cả
                    await api.removeUserFromGroup(senderID, threadID);
                    const userName = mentions[senderID] || 'người dùng';
                    message.reply(`⚠️ Đã kick ${userName} vì tag tất cả thành viên!`);
                }
            } catch (err) {
                console.log('Lỗi khi xử lý anti tagall:', err);
            }
        }
    }
};
