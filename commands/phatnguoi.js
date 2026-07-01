const axios = require('axios');
const schedule = require('node-schedule');
const fs = require('fs');
const path = require('path');

// =============================================================
// 💾 DATABASE VỚI LƯU TRỮ JSON
// =============================================================
const DB_FILE = path.join(__dirname, 'phatnguoi_data.json');

// Khởi tạo database
const userDatabase = {
    users: new Map(),
    savedPlates: new Map(),
    searchHistory: new Map()
};

// Load dữ liệu từ file JSON
function loadDatabase() {
    try {
        if (fs.existsSync(DB_FILE)) {
            const data = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
            if (data.users) userDatabase.users = new Map(Object.entries(data.users));
            if (data.savedPlates) userDatabase.savedPlates = new Map(Object.entries(data.savedPlates));
            if (data.searchHistory) userDatabase.searchHistory = new Map(Object.entries(data.searchHistory));
            console.log('✅ Đã load database từ file JSON');
            console.log(`📊 Số user: ${userDatabase.users.size}`);
            console.log(`🚗 Tổng biển số: ${userDatabase.savedPlates.size}`);
        } else {
            console.log('ℹ️ Chưa có file database, tạo mới');
            saveDatabase();
        }
    } catch (error) {
        console.error('❌ Lỗi load database:', error.message);
    }
}

// Lưu dữ liệu vào file JSON
function saveDatabase() {
    try {
        const data = {
            users: Object.fromEntries(userDatabase.users),
            savedPlates: Object.fromEntries(userDatabase.savedPlates),
            searchHistory: Object.fromEntries(userDatabase.searchHistory),
            lastSaved: new Date().toISOString()
        };
        fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf8');
        // console.log('💾 Đã lưu database vào file JSON'); // Bỏ log này để đỡ spam console
    } catch (error) {
        console.error('❌ Lỗi save database:', error.message);
    }
}

// Auto-save mỗi 5 phút
setInterval(saveDatabase, 5 * 60 * 1000);

// Load database khi khởi động
loadDatabase();

// =============================================================
// 📝 NỘI DUNG TIN NHẮN TĨNH
// =============================================================
const TERMS_OF_SERVICE = `
📜 ĐIỀU KHOẢN SỬ DỤNG DỊCH VỤ TRA CỨU PHẠT NGUỘI

Bằng việc sử dụng dịch vụ này, bạn đồng ý:

1️⃣ QUYỀN VÀ TRÁCH NHIỆM:
    • Chỉ tra cứu thông tin phạt nguội của phương tiện thuộc quyền sở hữu/quản lý hợp pháp của bạn
    • Không sử dụng dịch vụ cho mục đích trái pháp luật
    • Chịu trách nhiệm về tính chính xác của thông tin cung cấp

2️⃣ BẢO MẬT THÔNG TIN:
    • Thông tin biển số được mã hóa và bảo mật
    • Không chia sẻ dữ liệu với bên thứ ba
    • Bạn có quyền yêu cầu xóa dữ liệu bất kỳ lúc nào

3️⃣ TÍNH PHÁP LÝ:
    • Dữ liệu chỉ mang tính chất tham khảo
    • Nguồn dữ liệu từ API công khai: api.checkphatnguoi.vn
    • Vui lòng xác minh chính thức tại cơ quan CSGT

4️⃣ GIỚI HẠN TRÁCH NHIỆM:
    • Bot không chịu trách nhiệm về sai sót dữ liệu từ nguồn
    • Không chịu trách nhiệm về hậu quả từ việc sử dụng thông tin

Gửi "ĐỒNG Ý" để chấp nhận điều khoản.
`;

const SUPPORT_MESSAGE = `
💝 ỦNG HỘ PHÁT TRIỂN

Nếu thấy bot hữu ích và muốn hỗ trợ duy trì, bạn có thể ủng hộ tác giả qua:

🏦 MBBank: 08043662312904
👤 NGUYEN TRUONG THIEN PHAT
💬 Nội dung: Ung ho bot phat nguoi

Xin chân thành cảm ơn!
`;

const HELP_MESSAGE = `
📚 HƯỚNG DẪN SỬ DỤNG BOT TRA CỨU PHẠT NGUỘI
Thông Tin Liên Hệ:
facebook.com/pcoder090
zalo.me/0786888655

📌 LỆNH CƠ BẢN:
/phatnguoi [biển số]
    » Tra cứu nhanh một biển số.
    » VD: /phatnguoi 72A12345

/phatnguoi [bs1] [bs2] ...
    » Tra cứu nhanh nhiều biển số cùng lúc.
    » VD: /phatnguoi 72A12345 51H98765

💾 QUẢN LÝ BIỂN SỐ:
/phatnguoi luu [biển số] [tên gọi]
    » Lưu biển số để theo dõi.
    » VD: /phatnguoi luu 72C11122 Xe công ty

/phatnguoi danhsach
    » Xem các biển số đã lưu.

/phatnguoi xoa [biển số]
    » Xóa một biển số đã lưu.

🔔 THÔNG BÁO TỰ ĐỘNG:
/phatnguoi tudong [on/off]
    » Bật hoặc tắt nhận báo cáo hàng ngày.

/phatnguoi thoigian [HH:MM]
    » Đặt giờ nhận báo cáo.
    » VD: /phatnguoi thoigian 07:00

📊 TIỆN ÍCH KHÁC:
/phatnguoi thongke
    » Xem thống kê vi phạm của các xe đã lưu.

/phatnguoi xuatexcel
    » Xuất chi tiết vi phạm ra file CSV (Excel).

/phatnguoi lichsu
    » Xem 10 lần tra cứu gần nhất.

/phatnguoi ungho
    » Thông tin ủng hộ tác giả.

/phatnguoi xoadulieu
    » Xóa toàn bộ dữ liệu của bạn khỏi bot.

/phatnguoi help
    » Xem lại hướng dẫn này.
`;


// =============================================================
// 🎯 MODULE CHÍNH
// =============================================================
module.exports = {
    name: "phatnguoi",
    description: "Hệ thống tra cứu phạt nguội thông minh",
    usage: "/phatnguoi [biển số] hoặc /phatnguoi help để xem hướng dẫn",

    async execute(bot, msg, args) {
        const chatId = msg.chat.id;
        const userId = msg.from.id;

        // Kiểm tra chấp nhận điều khoản
        if (!hasAcceptedTerms(userId)) {
            return promptTermsOfService(bot, chatId, userId);
        }

        const command = args[0] ?.toLowerCase();

        // Xử lý các lệnh chức năng
        switch (command) {
            case 'help':
                return await showHelp(bot, chatId);
            case 'ungho':
                return await showSupportInfo(bot, chatId);
            case 'xoadulieu':
                return await handleDeleteDataRequest(bot, msg);
            case 'luu':
                return await savePlate(bot, msg, args.slice(1));
            case 'danhsach':
                return await listSavedPlates(bot, chatId, userId);
            case 'xoa':
                return await deletePlate(bot, msg, args.slice(1));
            case 'tudong':
                return await toggleAutoNotify(bot, chatId, userId, args.slice(1));
            case 'thoigian':
                return await setNotifyTime(bot, chatId, userId, args.slice(1));
            case 'thongke':
                return await showStatistics(bot, msg);
            case 'xuatexcel':
                return await exportToExcel(bot, msg);
            case 'lichsu':
                return await showHistory(bot, chatId, userId);
            case 'debug':
                return module.exports.debugStatus(bot, msg);
            case 'testnow':
                return await sendDailyReport(bot, userId);
            default:
                // Nếu không có args, hiển thị hướng dẫn
                if (args.length === 0) {
                    return bot.sendMessage(chatId,
                        "⚠️ Vui lòng nhập biển số cần kiểm tra.\n" +
                        "📝 VD: /phatnguoi 72A12345\n\n" +
                        "💡 Gõ /phatnguoi help để xem tất cả lệnh!"
                    );
                }
                // Nếu có nhiều args, xử lý tra cứu nhiều biển
                if (args.length > 1) {
                    return await checkMultipleViolations(bot, msg, args);
                }
                // Nếu chỉ có 1 arg, xử lý tra cứu 1 biển
                return await checkSingleViolation(bot, msg, args);
        }
    },

    // Khởi động job tự động
    initAutoNotify(bot) {
        console.log('🚀 Đã khởi động hệ thống thông báo tự động (Giờ VN: UTC+7)');
        schedule.scheduleJob('* * * * *', async () => {
            const vietnamTime = new Date(new Date().toLocaleString("en-US", {
                timeZone: "Asia/Ho_Chi_Minh"
            }));
            const currentTime = `${String(vietnamTime.getHours()).padStart(2, '0')}:${String(vietnamTime.getMinutes()).padStart(2, '0')}`;

            for (const [userId, userData] of userDatabase.users.entries()) {
                if (userData.autoNotify && userData.notifyTime === currentTime) {
                    console.log(`🎯 Gửi báo cáo cho user ${userId} lúc ${currentTime}`);
                    try {
                        await sendDailyReport(bot, userId);
                    } catch (error) {
                        console.error(`❌ Lỗi khi gửi báo cáo cho user ${userId}:`, error);
                    }
                }
            }
        });
    },

    // Hàm debug để check trạng thái
    debugStatus(bot, msg) {
        const chatId = msg.chat.id;
        const userId = msg.from.id;

        const vietnamTime = new Date(new Date().toLocaleString("en-US", {
            timeZone: "Asia/Ho_Chi_Minh"
        }));
        const currentTime = `${String(vietnamTime.getHours()).padStart(2, '0')}:${String(vietnamTime.getMinutes()).padStart(2, '0')}`;

        const userData = userDatabase.users.get(userId);
        const plates = userDatabase.savedPlates.get(userId) || [];

        let debugInfo = `🔧 THÔNG TIN DEBUG\n━━━━━━━━━━━━━━━━━━━━\n\n`;
        debugInfo += `👤 User ID: ${userId}\n`;
        debugInfo += `🕐 Giờ VN hiện tại: ${currentTime}\n`;
        debugInfo += `📅 Full datetime: ${vietnamTime.toLocaleString('vi-VN')}\n\n`;

        if (userData) {
            debugInfo += `⚙️ CÀI ĐẶT:\n`;
            debugInfo += `   • Đã chấp nhận điều khoản: ${userData.accepted ? '✅' : '❌'}\n`;
            debugInfo += `   • Auto notify: ${userData.autoNotify ? '✅ BẬT' : '❌ TẮT'}\n`;
            debugInfo += `   • Giờ đặt: ${userData.notifyTime}\n`;
            debugInfo += `   • Số biển số đã lưu: ${plates.length}\n\n`;

            debugInfo += `🔍 ĐIỀU KIỆN THÔNG BÁO:\n`;
            debugInfo += `   • userData.autoNotify = ${userData.autoNotify}\n`;
            debugInfo += `   • userData.notifyTime = "${userData.notifyTime}"\n`;
            debugInfo += `   • currentTime = "${currentTime}"\n`;
            debugInfo += `   • Match: ${userData.autoNotify && userData.notifyTime === currentTime ? '✅' : '❌'}\n`;
        } else {
            debugInfo += `❌ Không tìm thấy dữ liệu user!\n`;
        }

        bot.sendMessage(chatId, debugInfo);
    }
};

// =============================================================
// 🔐 XÁC THỰC & CÁC LỆNH MỚI
// =============================================================
function hasAcceptedTerms(userId) {
    return userDatabase.users.has(userId) && userDatabase.users.get(userId).accepted;
}

async function promptTermsOfService(bot, chatId, userId) {
    await bot.sendMessage(chatId, TERMS_OF_SERVICE);

    const listener = async (response) => {
        if (response.chat.id === chatId && response.from.id === userId) {
            const text = response.text ?.toUpperCase().trim();
            if (text === 'ĐỒNG Ý' || text === 'DONG Y') {
                userDatabase.users.set(userId, {
                    accepted: true,
                    acceptedDate: new Date().toISOString(),
                    autoNotify: false,
                    notifyTime: '06:00'
                });
                saveDatabase();
                await bot.sendMessage(chatId, '✅ Cảm ơn bạn đã chấp nhận điều khoản!');
                await showHelp(bot, chatId);
                bot.removeListener('message', listener);
            }
        }
    };
    bot.on('message', listener);
    setTimeout(() => bot.removeListener('message', listener), 300000); // Hủy sau 5 phút
}

async function showHelp(bot, chatId) {
    await bot.sendMessage(chatId, HELP_MESSAGE);
}

async function showSupportInfo(bot, chatId) {
    await bot.sendMessage(chatId, SUPPORT_MESSAGE);
}

async function handleDeleteDataRequest(bot, msg) {
    const chatId = msg.chat.id;
    const userId = msg.from.id;

    await bot.sendMessage(chatId,
        "⚠️ XÁC NHẬN XÓA DỮ LIỆU\n\n" +
        "Bạn có chắc muốn xóa TẤT CẢ dữ liệu cá nhân?\n" +
        "• Điều khoản đã chấp nhận\n" +
        "• Tất cả biển số đã lưu\n" +
        "• Cài đặt thông báo\n" +
        "• Lịch sử tra cứu\n\n" +
        "Hành động này KHÔNG THỂ hoàn tác.\n" +
        "Gửi 'XÁC NHẬN XÓA' để tiếp tục."
    );

    const listener = async (response) => {
        if (response.chat.id === chatId && response.from.id === userId) {
            if (response.text ?.toUpperCase() === 'XÁC NHẬN XÓA') {
                userDatabase.users.delete(userId);
                userDatabase.savedPlates.delete(userId);
                userDatabase.searchHistory.delete(userId);
                saveDatabase(); // Lưu thay đổi
                await bot.sendMessage(chatId, '✅ Đã xóa toàn bộ dữ liệu của bạn thành công.');
                bot.removeListener('message', listener);
            }
        }
    };
    bot.on('message', listener);
    setTimeout(() => bot.removeListener('message', listener), 60000); // Hủy sau 1 phút
}

// =============================================================
// 🔍 TRA CỨU PHẠT NGUỘI (ĐƠN & ĐA BIỂN SỐ)
// =============================================================
async function checkSingleViolation(bot, msg, args) {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const bienSo = (args[0] || "").toUpperCase();

    if (!isValidPlate(bienSo)) {
        return bot.sendMessage(chatId,
            "❌ Biển số không hợp lệ!\n" +
            "📋 Định dạng đúng: 72A12345, 51H-12345, 29X1-12345"
        );
    }

    await bot.sendChatAction(chatId, 'typing');

    try {
        const res = await axios.post("https://api.checkphatnguoi.vn/phatnguoi", {
            bienso: bienSo
        }, {
            headers: {
                "Content-Type": "application/json"
            },
            timeout: 15000
        });

        const {
            status,
            data,
            data_info
        } = res.data;
        logSearch(userId, bienSo);

        if (status !== 1 || !Array.isArray(data) || data.length === 0) {
            return bot.sendMessage(chatId,
                `✅ Biển số ${bienSo} không có phạt nguội.\n\n` +
                `💡 Muốn nhận thông báo tự động mỗi ngày? Dùng:\n` +
                `/phatnguoi luu ${bienSo} [tên xe]\n` +
                `/phatnguoi tudong on`
            );
        }

        const header = [
            `🚗 KẾT QUẢ TRA CỨU: ${bienSo}`,
            `━━━━━━━━━━━━━━━━━━━━`,
            `📊 Tổng vi phạm: ${data_info.total}`,
            `❌ Chưa xử phạt: ${data_info.chuaxuphat}`,
            `✅ Đã xử phạt: ${data_info.daxuphat}`,
            `⏰ Vi phạm gần nhất: ${data_info.latest || "Không có"}`,
            `━━━━━━━━━━━━━━━━━━━━`,
            `📝 Chi tiết từng vi phạm:`
        ].join("\n");

        await bot.sendMessage(chatId, header);
        await sleep(500);

        for (let i = 0; i < data.length; i++) {
            const message = formatViolationDetail(data[i], i + 1, data.length);
            await sendLongMessage(bot, chatId, message);
            await sleep(300);
        }

        if (!isPlateAlreadySaved(userId, bienSo)) {
            await bot.sendMessage(chatId,
                `💾 Lưu biển số này để theo dõi tự động?\n` +
                `Gửi: /phatnguoi luu ${bienSo} [tên xe]`
            );
        }

    } catch (error) {
        console.error("❌ Lỗi API:", error.message);
        await bot.sendMessage(chatId,
            "⚠️ Đã xảy ra lỗi khi tra cứu:\n" +
            `• ${error.message}\n\n` +
            "🔄 Vui lòng thử lại sau hoặc liên hệ hỗ trợ."
        );
    }
}

async function checkMultipleViolations(bot, msg, plates) {
    const chatId = msg.chat.id;
    const userId = msg.from.id;

    await bot.sendMessage(chatId, `🔍 Bắt đầu tra cứu ${plates.length} biển số...`);
    await bot.sendChatAction(chatId, 'typing');

    let results = `📊 KẾT QUẢ TRA CỨU NHIỀU BIỂN SỐ\n━━━━━━━━━━━━━━━━━━━━\n\n`;
    let hasError = false;

    for (const bienSo of plates) {
        const upperBienSo = bienSo.toUpperCase();
        logSearch(userId, upperBienSo); // Log mỗi lần tra

        if (!isValidPlate(upperBienSo)) {
            results += `❌ ${upperBienSo}: Biển số không hợp lệ.\n\n`;
            continue;
        }

        try {
            const res = await axios.post("https://api.checkphatnguoi.vn/phatnguoi", {
                bienso: upperBienSo
            }, {
                timeout: 10000
            });
            const {
                status,
                data_info
            } = res.data;

            if (status === 1 && data_info && data_info.total > 0) {
                results += `🚗 ${upperBienSo}: ⚠️ CÓ ${data_info.total} VI PHẠM (Chưa xử phạt: ${data_info.chuaxuphat})\n\n`;
            } else {
                results += `✅ ${upperBienSo}: Không có vi phạm.\n\n`;
            }
        } catch (error) {
            results += `⚠️ ${upperBienSo}: Lỗi tra cứu.\n\n`;
            hasError = true;
            console.error(`Lỗi tra cứu ${upperBienSo}:`, error.message);
        }
        await sleep(500); // Tạm dừng giữa các lần gọi API
    }

    results += `━━━━━━━━━━━━━━━━━━━━\n💡 Dùng /phatnguoi [biển số] để xem chi tiết từng vi phạm.`;
    if (hasError) {
        results += `\n(Một vài tra cứu đã bị lỗi, vui lòng thử lại sau)`;
    }

    await bot.sendMessage(chatId, results);
}

// =============================================================
// 💾 QUẢN LÝ BIỂN SỐ ĐÃ LƯU
// =============================================================
async function savePlate(bot, msg, args) {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const bienSo = args[0] ?.toUpperCase();
    const nickname = args.slice(1).join(" ") || "Xe của tôi";

    if (!bienSo) {
        return bot.sendMessage(chatId,
            "⚠️ Vui lòng nhập biển số cần lưu.\n" +
            "📝 VD: /phatnguoi luu 72A12345 Xe SH của vợ"
        );
    }

    if (!isValidPlate(bienSo)) {
        return bot.sendMessage(chatId, "❌ Biển số không hợp lệ!");
    }

    if (!userDatabase.savedPlates.has(userId)) {
        userDatabase.savedPlates.set(userId, []);
    }

    const plates = userDatabase.savedPlates.get(userId);

    if (plates.some(p => p.bienso === bienSo)) {
        return bot.sendMessage(chatId, `⚠️ Biển số ${bienSo} đã được lưu trước đó!`);
    }

    if (plates.length >= 10) {
        return bot.sendMessage(chatId,
            "⚠️ Bạn đã lưu tối đa 10 biển số!\n" +
            "Vui lòng xóa bớt trước khi thêm mới: /phatnguoi xoa [biển số]"
        );
    }

    plates.push({
        bienso: bienSo,
        nickname: nickname,
        addedDate: new Date().toISOString()
    });

    saveDatabase();

    await bot.sendMessage(chatId,
        `✅ Đã lưu biển số thành công!\n\n` +
        `🚗 Biển số: ${bienSo}\n` +
        `📝 Tên gọi: ${nickname}\n\n` +
        `💡 Dùng /phatnguoi danhsach để xem tất cả biển số đã lưu\n` +
        `🔔 Dùng /phatnguoi tudong on để nhận thông báo tự động mỗi ngày`
    );
}

async function listSavedPlates(bot, chatId, userId) {
    const plates = userDatabase.savedPlates.get(userId) || [];

    if (plates.length === 0) {
        return bot.sendMessage(chatId,
            "📋 Bạn chưa lưu biển số nào.\n\n" +
            "💡 Dùng: /phatnguoi luu [biển số] [tên] để lưu"
        );
    }

    const userData = userDatabase.users.get(userId);
    let message = `📋 DANH SÁCH BIỂN SỐ ĐÃ LƯU\n━━━━━━━━━━━━━━━━━━━━\n\n`;

    plates.forEach((plate, index) => {
        message += `${index + 1}. 🚗 ${plate.bienso}\n`;
        message += `   📝 ${plate.nickname}\n`;
        message += `   📅 Lưu: ${new Date(plate.addedDate).toLocaleDateString('vi-VN')}\n\n`;
    });

    message += `━━━━━━━━━━━━━━━━━━━━\n`;
    message += `🔔 Thông báo tự động: ${userData?.autoNotify ? '✅ BẬT' : '❌ TẮT'}\n`;
    if (userData ?.autoNotify) {
        message += `⏰ Giờ gửi: ${userData.notifyTime}\n`;
    }
    message += `\n💡 Dùng /phatnguoi [biển số] để tra cứu`;

    await bot.sendMessage(chatId, message);
}

async function deletePlate(bot, msg, args) {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const bienSo = args[0] ?.toUpperCase();

    if (!bienSo) {
        return bot.sendMessage(chatId,
            "⚠️ Vui lòng nhập biển số cần xóa.\n" +
            "📝 VD: /phatnguoi xoa 72A12345"
        );
    }

    const plates = userDatabase.savedPlates.get(userId) || [];
    const index = plates.findIndex(p => p.bienso === bienSo);

    if (index === -1) {
        return bot.sendMessage(chatId, `❌ Không tìm thấy biển số ${bienSo} trong danh sách đã lưu.`);
    }

    const deleted = plates.splice(index, 1)[0];
    saveDatabase();

    await bot.sendMessage(chatId,
        `✅ Đã xóa biển số thành công!\n\n` +
        `🚗 Biển số: ${deleted.bienso}\n` +
        `📝 Tên gọi: ${deleted.nickname}`
    );
}

// =============================================================
// 🔔 THÔNG BÁO TỰ ĐỘNG
// =============================================================
async function toggleAutoNotify(bot, chatId, userId, args) {
    const action = args[0] ?.toLowerCase();

    if (!['on', 'off'].includes(action)) {
        return bot.sendMessage(chatId,
            "⚠️ Vui lòng chọn on hoặc off\n" +
            "📝 VD: /phatnguoi tudong on"
        );
    }

    const userData = userDatabase.users.get(userId);
    userData.autoNotify = (action === 'on');
    saveDatabase();

    const vietnamTime = new Date(new Date().toLocaleString("en-US", {
        timeZone: "Asia/Ho_Chi_Minh"
    }));
    const currentVNTime = `${String(vietnamTime.getHours()).padStart(2, '0')}:${String(vietnamTime.getMinutes()).padStart(2, '0')}`;

    await bot.sendMessage(chatId,
        userData.autoNotify ?
        `✅ Đã BẬT thông báo tự động!\n\n` +
        `⏰ Giờ gửi: ${userData.notifyTime} (Giờ Việt Nam)\n` +
        `📋 Sẽ kiểm tra ${userDatabase.savedPlates.get(userId)?.length || 0} biển số\n` +
        `🕐 Giờ VN hiện tại: ${currentVNTime}\n\n` +
        `💡 Đổi giờ: /phatnguoi thoigian [HH:MM]` :
        `❌ Đã TẮT thông báo tự động`
    );
}

async function setNotifyTime(bot, chatId, userId, args) {
    const time = args[0];

    if (!time || !/^\d{2}:\d{2}$/.test(time)) {
        return bot.sendMessage(chatId,
            "⚠️ Định dạng giờ không đúng!\n" +
            "📝 VD: /phatnguoi thoigian 06:30"
        );
    }

    const [hour, minute] = time.split(':').map(Number);
    if (hour < 0 || hour > 23 || minute < 0 || minute > 59) {
        return bot.sendMessage(chatId, "❌ Giờ không hợp lệ (00:00 - 23:59)");
    }

    const userData = userDatabase.users.get(userId);
    userData.notifyTime = time;
    saveDatabase();

    const vietnamTime = new Date(new Date().toLocaleString("en-US", {
        timeZone: "Asia/Ho_Chi_Minh"
    }));
    const currentVNTime = `${String(vietnamTime.getHours()).padStart(2, '0')}:${String(vietnamTime.getMinutes()).padStart(2, '0')}`;

    await bot.sendMessage(chatId,
        `✅ Đã đặt giờ thông báo: ${time} (Giờ Việt Nam)\n` +
        `🕐 Giờ VN hiện tại: ${currentVNTime}\n\n` +
        `${!userData.autoNotify ? '⚠️ Nhớ bật thông báo tự động: /phatnguoi tudong on' : '✅ Sẽ gửi báo cáo vào lúc ' + time + ' mỗi ngày'}`
    );
}

async function sendDailyReport(bot, userId) {
    const plates = userDatabase.savedPlates.get(userId) || [];
    if (plates.length === 0) return;

    const vietnamTime = new Date(new Date().toLocaleString("en-US", {
        timeZone: "Asia/Ho_Chi_Minh"
    }));
    const timeString = vietnamTime.toLocaleString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });

    let report = `🌅 BÁO CÁO PHẠT NGUỘI HÀNG NGÀY\n`;
    report += `📅 ${timeString} (Giờ VN)\n`;
    report += `━━━━━━━━━━━━━━━━━━━━\n\n`;

    for (const plate of plates) {
        try {
            const res = await axios.post("https://api.checkphatnguoi.vn/phatnguoi", {
                bienso: plate.bienso
            }, {
                headers: {
                    "Content-Type": "application/json"
                },
                timeout: 10000
            });
            const {
                status,
                data_info
            } = res.data;
            if (status === 1 && data_info && data_info.chuaxuphat > 0) {
                report += `🚗 ${plate.nickname} (${plate.bienso})\n`;
                report += `   ❌ Chưa xử phạt: ${data_info.chuaxuphat}\n\n`;
            } else {
                report += `🚗 ${plate.nickname} (${plate.bienso})\n`;
                report += `   ✅ Không có vi phạm chưa xử phạt\n\n`;
            }
            await sleep(500);
        } catch (error) {
            report += `⚠️ ${plate.nickname} (${plate.bienso}): Lỗi tra cứu\n\n`;
            console.error(`❌ Lỗi tra cứu ${plate.bienso}:`, error.message);
        }
    }

    report += `━━━━━━━━━━━━━━━━━━━━\n`;
    report += `💡 Tra cứu chi tiết: /phatnguoi [biển số]\n`;
    report += `💝 Ủng hộ: /phatnguoi ungho`;

    try {
        await bot.sendMessage(userId, report);
    } catch (error) {
        console.error(`❌ KHÔNG THỂ GỬI báo cáo cho user ${userId}:`, error.message);
    }
}


// =============================================================
// 📊 THỐNG KÊ & XUẤT FILE
// =============================================================
async function showStatistics(bot, msg) {
    const chatId = msg.chat.id;
    const userId = msg.from.id;

    const plates = userDatabase.savedPlates.get(userId) || [];
    const userData = userDatabase.users.get(userId);

    if (plates.length === 0) {
        return bot.sendMessage(chatId, "📊 Chưa có dữ liệu để thống kê. Hãy lưu biển số trước!");
    }

    await bot.sendChatAction(chatId, 'typing');

    let totalViolations = 0;
    let totalUnpaid = 0;
    let totalPaid = 0;
    let plateStats = [];

    for (const plate of plates) {
        try {
            const res = await axios.post("https://api.checkphatnguoi.vn/phatnguoi", {
                bienso: plate.bienso
            }, {
                headers: {
                    "Content-Type": "application/json"
                },
                timeout: 10000
            });
            const {
                status,
                data_info
            } = res.data;
            if (status === 1 && data_info) {
                const violations = data_info.total || 0;
                const unpaid = data_info.chuaxuphat || 0;
                const paid = data_info.daxuphat || 0;

                totalViolations += violations;
                totalUnpaid += unpaid;
                totalPaid += paid;

                plateStats.push({
                    plate: plate.bienso,
                    nickname: plate.nickname,
                    violations,
                    unpaid,
                    paid,
                    latest: data_info.latest
                });
            }
            await sleep(500);
        } catch (error) {
            console.error(`Lỗi thống kê ${plate.bienso}:`, error.message);
        }
    }

    plateStats.sort((a, b) => b.violations - a.violations);

    let report = `📊 THỐNG KÊ PHẠT NGUỘI CÁ NHÂN\n`;
    report += `━━━━━━━━━━━━━━━━━━━━\n\n`;
    report += `👤 Người dùng: ${msg.from.first_name}\n`;
    report += `📅 Thành viên từ: ${new Date(userData.acceptedDate).toLocaleDateString('vi-VN')}\n\n`;

    report += `📈 TỔNG QUAN:\n`;
    report += `   🚗 Số xe theo dõi: ${plates.length}\n`;
    report += `   ⚠️ Tổng vi phạm: ${totalViolations}\n`;
    report += `   ❌ Chưa xử phạt: ${totalUnpaid}\n`;
    report += `   ✅ Đã xử phạt: ${totalPaid}\n\n`;

    report += `🏆 TOP VI PHẠM:\n`;
    plateStats.slice(0, 5).forEach((stat, index) => {
        const medal = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣'][index];
        report += `${medal} ${stat.nickname} (${stat.plate})\n`;
        report += `   Vi phạm: ${stat.violations} | Chưa xử: ${stat.unpaid}\n`;
        if (stat.latest) {
            report += `   Gần nhất: ${stat.latest}\n`;
        }
        report += `\n`;
    });

    report += `━━━━━━━━━━━━━━━━━━━━\n`;
    report += `💡 Xuất báo cáo CSV: /phatnguoi xuatexcel`;

    await bot.sendMessage(chatId, report);
}

async function exportToExcel(bot, msg) {
    const chatId = msg.chat.id;
    const userId = msg.from.id;

    const plates = userDatabase.savedPlates.get(userId) || [];

    if (plates.length === 0) {
        return bot.sendMessage(chatId, "📊 Chưa có dữ liệu để xuất. Hãy lưu biển số trước!");
    }

    // Gửi tin nhắn thông báo trong lúc xử lý
    await bot.sendMessage(chatId, "⏳ Đang tạo báo cáo CSV, vui lòng chờ trong giây lát...");

    try {
        let excelData = [];
        for (const plate of plates) {
            try {
                const res = await axios.post("https://api.checkphatnguoi.vn/phatnguoi", {
                    bienso: plate.bienso
                }, {
                    headers: { "Content-Type": "application/json" },
                    timeout: 10000
                });

                const { status, data } = res.data;
                if (status === 1 && Array.isArray(data)) {
                    data.forEach(v => {
                        excelData.push({
                            'Biển số': plate.bienso,
                            'Tên gọi': plate.nickname,
                            'Thời gian vi phạm': v["Thời gian vi phạm"] || "",
                            'Địa điểm': v["Địa điểm vi phạm"] || "",
                            'Hành vi': v["Hành vi vi phạm"] || "",
                            'Trạng thái': v["Trạng thái"] || "",
                            'Đơn vị phát hiện': v["Đơn vị phát hiện vi phạm"] || "",
                            'Nơi giải quyết': Array.isArray(v["Nơi giải quyết vụ việc"]) ?
                                v["Nơi giải quyết vụ việc"].join("; ") : ""
                        });
                    });
                }
                await sleep(500);
            } catch (error) {
                console.error(`Lỗi xuất CSV cho biển số ${plate.bienso}:`, error.message);
            }
        }

        if (excelData.length === 0) {
            return bot.sendMessage(chatId, "📊 Không có vi phạm nào để xuất!");
        }

        // Tạo nội dung file CSV
        let csv = '\uFEFF'; // BOM for UTF-8 Excel compatibility
        const headers = Object.keys(excelData[0]);
        csv += headers.join(',') + '\n';
        excelData.forEach(row => {
            const values = headers.map(header => {
                const value = row[header] || '';
                return `"${String(value).replace(/"/g, '""')}"`;
            });
            csv += values.join(',') + '\n';
        });

        // Tạo file tạm
        const fileName = `phat_nguoi_${userId}_${Date.now()}.csv`;
        const tempDir = path.join(__dirname, 'temp');
        if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);
        const filePath = path.join(tempDir, fileName);
        fs.writeFileSync(filePath, csv, 'utf8');

        // *** GỬI FILE TRỰC TIẾP QUA TELEGRAM ***
        await bot.sendDocument(chatId, filePath, {
            caption:
                `📊 Báo cáo phạt nguội của bạn đã sẵn sàng!\n` +
                `📅 Ngày xuất: ${new Date().toLocaleString('vi-VN')}\n` +
                `📝 Tổng ${excelData.length} vi phạm`
        }, {
            filename: fileName,
            contentType: 'text/csv'
        });

        // Xóa file tạm sau khi đã gửi
        fs.unlinkSync(filePath);

    } catch (error) {
        console.error("❌ Lỗi nghiêm trọng khi xuất CSV:", error);
        await bot.sendMessage(chatId, "⚠️ Đã xảy ra lỗi nghiêm trọng khi xuất báo cáo. Vui lòng thử lại sau.");
    }
}


// =============================================================
// 📜 LỊCH SỬ TRA CỨU
// =============================================================
async function showHistory(bot, chatId, userId) {
    const history = userDatabase.searchHistory.get(userId) || [];

    if (history.length === 0) {
        return bot.sendMessage(chatId,
            "📜 Chưa có lịch sử tra cứu.\n\n" +
            "💡 Lịch sử sẽ được lưu khi bạn tra cứu biển số"
        );
    }

    let message = `📜 LỊCH SỬ 10 LẦN TRA CỨU GẦN NHẤT\n━━━━━━━━━━━━━━━━━━━━\n\n`;
    const recent = history.slice(-10).reverse();

    recent.forEach((item, index) => {
        const time = new Date(item.timestamp).toLocaleString('vi-VN');
        message += `${index + 1}. 🚗 ${item.bienso}\n`;
        message += `   📅 ${time}\n\n`;
    });

    message += `━━━━━━━━━━━━━━━━━━━━\n`;
    message += `📊 Tổng: ${history.length} lần tra cứu`;

    await bot.sendMessage(chatId, message);
}


// =============================================================
// 🛠️ HÀM HỖ TRỢ
// =============================================================
function formatViolationDetail(v, index, total) {
    let msg = `━━━━━━━━━━━━━━━━━━━━\n`;
    msg += `🚔 VI PHẠM ${index}/${total}\n`;
    msg += `━━━━━━━━━━━━━━━━━━━━\n\n`;
    msg += `📅 Thời gian: ${v["Thời gian vi phạm"] || "Không rõ"}\n`;
    msg += `📍 Địa điểm: ${v["Địa điểm vi phạm"] || "Không rõ"}\n`;
    msg += `⚠️ Hành vi: ${v["Hành vi vi phạm"] || "Không rõ"}\n`;
    msg += `📌 Trạng thái: ${v["Trạng thái"] || "Không rõ"}\n`;
    msg += `🚓 Đơn vị phát hiện: ${v["Đơn vị phát hiện vi phạm"] || "Không rõ"}\n\n`;
    msg += `🏢 Nơi giải quyết:\n`;

    if (Array.isArray(v["Nơi giải quyết vụ việc"]) && v["Nơi giải quyết vụ việc"].length > 0) {
        v["Nơi giải quyết vụ việc"].forEach((place) => {
            msg += `   • ${place}\n`;
        });
    } else {
        msg += `   • Không có thông tin\n`;
    }

    return msg;
}

function isValidPlate(plate) {
    const cleanPlate = plate.replace(/-/g, "").replace(/\./g, "");
    const patterns = [
        /^\d{2}[A-Z]\d{4,5}$/, // 72A12345
        /^\d{2}[A-Z]{2}\d{4,5}$/, // 72AA12345
        /^\d{2}LD\d{4,5}$/, // Xe liên doanh
        /^\d{2}KT\d{4,5}$/, // Xe quân đội
    ];
    return patterns.some(pattern => pattern.test(cleanPlate));
}

function isPlateAlreadySaved(userId, bienSo) {
    const plates = userDatabase.savedPlates.get(userId) || [];
    return plates.some(p => p.bienso === bienSo);
}

function logSearch(userId, bienSo) {
    if (!userDatabase.searchHistory.has(userId)) {
        userDatabase.searchHistory.set(userId, []);
    }
    const history = userDatabase.searchHistory.get(userId);
    history.push({
        bienso: bienSo,
        timestamp: new Date().toISOString()
    });
    if (history.length > 50) history.shift();
}

async function sendLongMessage(bot, chatId, text) {
    const limit = 4000;
    if (text.length <= limit) {
        await bot.sendMessage(chatId, text);
    } else {
        const chunks = text.match(new RegExp(`.{1,${limit}}`, 'g'));
        for (const chunk of chunks) {
            await bot.sendMessage(chatId, chunk);
            await sleep(200);
        }
    }
}

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}