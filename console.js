// console.js
const chalk = require('chalk');

/**
 * Ghi log một tin nhắn đến một cách gọn gàng và đẹp mắt.
 * @param {object} msg - Đối tượng tin nhắn từ Telegram.
 */
function logMessage(msg) {
  // Lấy thời gian hiện tại
  const timestamp = new Date().toLocaleTimeString('vi-VN');

  // Lấy thông tin người gửi và cuộc trò chuyện
  // Telegram không có display_name -> ghép first_name + last_name (hoặc username)
  const senderName = [msg.from.first_name, msg.from.last_name]
    .filter(Boolean)
    .join(' ') || msg.from.username || 'Người dùng';
  const senderId = msg.from.id;
  const chatType = msg.chat.type;
  const messageText = msg.text;

  // Định dạng thông tin chat type với màu sắc và icon
  const chatInfo = chatType === 'private'
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