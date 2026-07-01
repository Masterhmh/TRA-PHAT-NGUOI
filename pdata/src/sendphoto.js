// pdata/src/sendphoto.js
const axios = require('axios');
const chalk = require('chalk'); 

async function sendPhoto(bot, chatId, photoUrl, caption = '') {
  try {
    const botToken = bot.token;
    if (!botToken) {
        throw new Error("Bot token không tồn tại.");
    }
    const entrypoint = `https://bot-api.zapps.me/bot${botToken}/sendPhoto`;
    console.log(chalk.blue(`[SEND_PHOTO] Chuẩn bị gửi ảnh tới Zalo với URL: ${photoUrl}`));

    const response = await axios.post(entrypoint, {
      chat_id: chatId,
      photo: photoUrl,
      caption: caption,
    });

    if (response.data && response.data.ok) {
      console.log(chalk.green(`✅ Đã gửi yêu cầu ảnh thành công tới chat ID: ${chatId}`));
      return response.data.result;
    } else {
      console.error('API Zalo trả về lỗi khi gửi ảnh:', response.data);
      return null;
    }
  } catch (error) {
    console.error('Lỗi nghiêm trọng khi gọi API sendPhoto:', error.response?.data || error.message);
    return null;
  }
}

module.exports = sendPhoto;