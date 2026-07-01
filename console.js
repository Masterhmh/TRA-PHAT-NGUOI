// console.js
const chalk = require('chalk');

/**
 * Ghi log một tin nhắn đến một cách gọn gàng và đẹp mắt.
 * @param {object} msg - Đối tượng tin nhắn từ ZaloBot.
 */
function logMessage(msg) {
  // Lấy thời gian hiện tại
  const timestamp = new Date().toLocaleTimeString('vi-VN');

  // Lấy thông tin người gửi và cuộc trò chuyện
  const senderName = msg.from.display_name;
  const senderId = msg.from.id;
  const chatType = msg.chat.chat_type;
  const messageText = msg.text;

  // Định dạng thông tin chat type với màu sắc và icon
  const chatInfo = chatType === 'PRIVATE' 
    ? chalk.blue('👤 Riêng tư') 
    : chalk.green('👥 Nhóm');

  // Xây dựng chuỗi log hoàn chỉnh với màu sắc
  const logString = [
    chalk.dim(`[${timestamp}]`),         // Thời gian màu xám mờ
    chatInfo,                           // Loại chat có màu
    chalk.cyan(senderName),             // Tên người gửi màu xanh cyan
    chalk.dim(`(${senderId})`),         // ID người gửi màu xám mờ
    chalk.whiteBright(`» "${messageText}"`) // Nội dung tin nhắn màu trắng sáng
  ].join(' ');

  // In ra console
  console.log(logString);
}

// Export hàm để các file khác có thể sử dụng
module.exports = { logMessage };