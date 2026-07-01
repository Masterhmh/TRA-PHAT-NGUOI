// main.js

const ZaloBot = require("node-zalo-bot");
const fs = require('fs');
const path = require('path');
const logger = require('./console.js');
const chalk = require('chalk');

// --- CẤU HÌNH BOT ---
const token = "thay token vao day";
const bot = new ZaloBot(token, {
  polling: true
});
const prefix = "/";

// --- BỘ XỬ LÝ LỆNH (COMMAND HANDLER) ---

bot.commands = new Map();
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
  const filePath = path.join(commandsPath, file);
  const command = require(filePath);

  if ('name' in command && 'execute' in command) {
    bot.commands.set(command.name, command);
    console.log(chalk.greenBright(`[OK] Đã nạp lệnh: ${command.name}`));
  } else {
    console.log(chalk.yellow(`[CẢNH BÁO] File lệnh ${filePath} thiếu 'name' hoặc 'execute'.`));
  }
}

// --- KHỞI ĐỘNG CÁC MODULE ĐẶC BIỆT (CÓ TỰ ĐỘNG CHẠY) ---
for (const command of bot.commands.values()) {
  if (typeof command.initAutoNotify === 'function') {
    command.initAutoNotify(bot);
    console.log(chalk.cyanBright(`[AUTO] Đã khởi động job tự động cho lệnh: ${command.name}`));
  }
}

// --- LẮNG NGHE TIN NHẮN ---

bot.on("message", (msg) => {
  // Bỏ qua các tin nhắn không có nội dung text
  if (!msg.text) return;
  
  logger.logMessage(msg);

  if (!msg.text.startsWith(prefix) || msg.from.is_bot) return;

  const args = msg.text.slice(prefix.length).trim().split(/ +/);
  const commandName = args.shift().toLowerCase();
  const command = bot.commands.get(commandName);

  if (!command) return;

  try {
    command.execute(bot, msg, args);
  } catch (error) {
    console.error(chalk.red(`Lỗi khi thực thi lệnh ${commandName}:`), error);
    bot.sendMessage(msg.chat.id, 'Đã có lỗi xảy ra khi thực thi lệnh này!');
  }
});

// --- XỬ LÝ LỖI POLLING ĐỂ LÀM SẠCH CONSOLE ---
bot.on('polling_error', (error) => {
    // Chỉ ẩn đi lỗi timeout 408, đây là lỗi bình thường của long-polling
    if (error.message && error.message.includes("408 Request timeout")) {
        // Không làm gì cả, bot sẽ tự động kết nối lại
        return;
    }
    // Với các lỗi polling nghiêm trọng khác, vẫn hiển thị ra để debug
    console.error(chalk.red('[POLLING_ERROR]'), error);
});

console.log(chalk.bold.magenta("\nZaloBot đã sẵn sàng và đang chạy..."));
// --- BẮT LỖI TOÀN CỤC ĐỂ KHÔNG DỪNG BOT ---

process.on('uncaughtException', (err) => {
  console.error(chalk.red('[UNCAUGHT EXCEPTION]'), err);
  console.log(chalk.yellow('⚠️ Bot gặp lỗi không mong muốn nhưng sẽ tiếp tục chạy.'));
});

process.on('unhandledRejection', (reason, promise) => {
  console.error(chalk.red('[UNHANDLED REJECTION]'), reason);
  console.log(chalk.yellow('⚠️ Bỏ qua promise bị lỗi, bot vẫn tiếp tục hoạt động.'));
});
