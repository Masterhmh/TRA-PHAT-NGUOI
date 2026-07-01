# 🚦 Bot Tra Cứu Phạt Nguội (Telegram + Cloudflare Workers)

Bot Telegram tra cứu phạt nguội, chạy **100% miễn phí** trên [Cloudflare Workers](https://workers.cloudflare.com/):

- ✅ Luôn online (không ngủ), nhận lệnh qua **webhook**.
- ✅ Lưu dữ liệu người dùng bằng **Cloudflare KV** (thay cho file JSON).
- ✅ **Tự động báo cáo hàng ngày** đúng giờ (mặc định **09:00 giờ VN**) bằng **Cron Trigger**.

> Nguồn dữ liệu: API công khai `api.checkphatnguoi.vn`. Thông tin chỉ mang tính tham khảo.

---

## 🧱 Cấu trúc

```
src/index.js   # Entry Worker: fetch() = webhook, scheduled() = cron
src/bot.js     # Toàn bộ logic bot (grammY + KV + báo cáo tự động)
wrangler.toml  # Cấu hình Worker, KV, Cron Trigger
```

> Các file cũ ở thư mục gốc (`main.js`, `console.js`, `commands/`) là **phiên bản polling cũ**, không còn dùng khi chạy trên Workers.

---

## 🚀 Hướng dẫn deploy (miễn phí, không cần thẻ)

### 1. Cài đặt
```bash
npm install
npx wrangler login
```

### 2. Tạo KV namespace
```bash
npx wrangler kv namespace create DB
```
Lệnh này in ra một `id`. Mở `wrangler.toml` và dán vào chỗ `THAY_BANG_KV_NAMESPACE_ID`.

### 3. Đặt secret (token bot + secret webhook)
```bash
npx wrangler secret put BOT_TOKEN        # dán token từ @BotFather
npx wrangler secret put WEBHOOK_SECRET   # tự đặt 1 chuỗi ngẫu nhiên bất kỳ
```
> ⚠️ **Không** ghi token vào code hay commit lên GitHub. Nếu token đã lộ, hãy `/revoke` trong @BotFather để lấy token mới.

### 4. Deploy
```bash
npx wrangler deploy
```
Sau khi deploy, bạn nhận được URL dạng:
```
https://tra-phat-nguoi-bot.<tên-tài-khoản>.workers.dev
```

### 5. Đăng ký webhook với Telegram
Thay `<TOKEN>`, `<WORKER_URL>`, `<WEBHOOK_SECRET>` rồi chạy:
```bash
curl "https://api.telegram.org/bot<TOKEN>/setWebhook?url=<WORKER_URL>&secret_token=<WEBHOOK_SECRET>"
```
Kiểm tra: mở `<WORKER_URL>` trên trình duyệt sẽ thấy dòng “Bot đang chạy”.

---

## ⏰ Thông báo tự động 9h sáng

- Cron trong `wrangler.toml` chạy **mỗi phút** (`* * * * *`), và code so sánh với **giờ Việt Nam**.
- Mỗi người dùng bật `/phatnguoi tudong on` sẽ nhận báo cáo vào `notifyTime` của họ (mặc định `09:00`).
- Đổi giờ: `/phatnguoi thoigian 09:00`.

> Cron Trigger của Cloudflare chạy theo giờ UTC, nhưng bot tự quy đổi sang giờ VN nên bạn cứ đặt giờ VN như bình thường.

---

## 💬 Các lệnh

| Lệnh | Chức năng |
|------|-----------|
| `/phatnguoi 72A12345` | Tra cứu 1 biển số |
| `/phatnguoi bs1 bs2 ...` | Tra cứu nhiều biển số |
| `/phatnguoi luu [biển số] [tên]` | Lưu biển số theo dõi |
| `/phatnguoi danhsach` | Danh sách biển số đã lưu |
| `/phatnguoi xoa [biển số]` | Xóa biển số đã lưu |
| `/phatnguoi tudong on/off` | Bật/tắt báo cáo hàng ngày |
| `/phatnguoi thoigian HH:MM` | Đặt giờ nhận báo cáo |
| `/phatnguoi thongke` | Thống kê vi phạm |
| `/phatnguoi xuatexcel` | Xuất file CSV |
| `/phatnguoi lichsu` | 10 lần tra cứu gần nhất |
| `/phatnguoi testnow` | Gửi thử báo cáo ngay |
| `/phatnguoi help` | Xem hướng dẫn |

---

## 🧪 Chạy thử local
```bash
npx wrangler dev
```
