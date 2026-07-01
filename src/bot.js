// src/bot.js
// Toan bo logic bot: luu tru KV, goi API phat nguoi, xu ly lenh, va gui bao cao tu dong.

import { Bot, InputFile } from "grammy";

const API_URL = "https://api.checkphatnguoi.vn/phatnguoi";
const DEFAULT_NOTIFY_TIME = "09:00"; // Gio Viet Nam

// =============================================================
// KV STORE (thay cho file phatnguoi_data.json)
// =============================================================
async function getUser(env, userId) {
	const raw = await env.DB.get(`user:${userId}`);
	return raw ? JSON.parse(raw) : null;
}

async function putUser(env, userId, data) {
	await env.DB.put(`user:${userId}`, JSON.stringify(data), {
		metadata: {
			autoNotify: !!data.autoNotify,
			notifyTime: data.notifyTime || DEFAULT_NOTIFY_TIME,
		},
	});
}

async function deleteUserData(env, userId) {
	await env.DB.delete(`user:${userId}`);
	await env.DB.delete(`plates:${userId}`);
	await env.DB.delete(`history:${userId}`);
}

async function getPlates(env, userId) {
	const raw = await env.DB.get(`plates:${userId}`);
	return raw ? JSON.parse(raw) : [];
}

async function putPlates(env, userId, plates) {
	await env.DB.put(`plates:${userId}`, JSON.stringify(plates));
}

async function getHistory(env, userId) {
	const raw = await env.DB.get(`history:${userId}`);
	return raw ? JSON.parse(raw) : [];
}

async function logSearch(env, userId, bienSo) {
	const history = await getHistory(env, userId);
	history.push({ bienso: bienSo, timestamp: new Date().toISOString() });
	while (history.length > 50) history.shift();
	await env.DB.put(`history:${userId}`, JSON.stringify(history));
}

// =============================================================
// TIEN ICH
// =============================================================
function vnNow() {
	return new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Ho_Chi_Minh" }));
}

function vnHHMM() {
	const d = vnNow();
	return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function sleep(ms) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

function isValidPlate(plate) {
	const clean = plate.replace(/[-.\s]/g, "").toUpperCase();
	return /^\d{2}[A-Z]{1,2}\d{4,6}$/.test(clean);
}

async function fetchPhatNguoi(bienSo) {
	const MAX_TRY = 2;
	let lastErr;
	for (let attempt = 1; attempt <= MAX_TRY; attempt++) {
		const controller = new AbortController();
		const timer = setTimeout(() => controller.abort(), 10000);
		try {
			const res = await fetch(API_URL, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"Accept": "application/json, text/plain, */*",
					"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
					"Origin": "https://checkphatnguoi.vn",
					"Referer": "https://checkphatnguoi.vn/",
				},
				body: JSON.stringify({ bienso: bienSo }),
				signal: controller.signal,
			});
			if (res.ok) {
				return await res.json();
			}
			lastErr = new Error(`API tra ve HTTP ${res.status}`);
			if (res.status < 500 && res.status !== 429) break;
		} catch (e) {
			lastErr = e;
		} finally {
			clearTimeout(timer);
		}
		if (attempt < MAX_TRY) {
			await sleep(1200);
		}
	}
	console.error("[API_ERROR]", lastErr);
	throw new Error("Hệ thống tra cứu đang bận, vui lòng thử lại sau ít phút nhé!");
}

// Gui tin nhan, tu dong cat neu qua 4096 ky tu
async function reply(ctx, text) {
	const limit = 4000;
	if (text.length <= limit) {
		await ctx.reply(text);
		return;
	}
	const chunks = text.match(new RegExp(`[\\s\\S]{1,${limit}}`, "g")) || [text];
	for (const chunk of chunks) {
		await ctx.reply(chunk);
		await sleep(200);
	}
}

// =============================================================
// NOI DUNG TIN NHAN TINH
// =============================================================
const TERMS_OF_SERVICE = `
📜 ĐIỀU KHOẢN SỬ DỤNG DỊCH VỤ TRA CỨU PHẠT NGUỘI

Bằng việc sử dụng dịch vụ này, bạn đồng ý:

1️⃣ QUYỀN VÀ TRÁCH NHIỆM:
    • Chỉ tra cứu thông tin phạt nguội của phương tiện thuộc quyền sở hữu/quản lý hợp pháp của bạn
    • Không sử dụng dịch vụ cho mục đích trái pháp luật
    • Chịu trách nhiệm về tính chính xác của thông tin cung cấp

2️⃣ BẢO MẬT THÔNG TIN:
    • Thông tin biển số được bảo mật
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

📌 LỆNH CƠ BẢN:
/phatnguoi [biển số]
    » Tra cứu nhanh một biển số. VD: /phatnguoi 72A12345
/phatnguoi [bs1] [bs2] ...
    » Tra cứu nhiều biển số cùng lúc.

💾 QUẢN LÝ BIỂN SỐ:
/phatnguoi luu [biển số] [tên gọi]  » Lưu biển số để theo dõi.
/phatnguoi danhsach                » Xem các biển số đã lưu.
/phatnguoi xoa [biển số]           » Xóa một biển số đã lưu.

🔔 THÔNG BÁO TỰ ĐỘNG:
/phatnguoi tudong [on/off]  » Bật/tắt báo cáo hàng ngày.
/phatnguoi thoigian [HH:MM] » Đặt giờ nhận báo cáo (mặc định 09:00).

📊 TIỆN ÍCH KHÁC:
/phatnguoi thongke    » Thống kê vi phạm các xe đã lưu.
/phatnguoi xuatexcel  » Xuất chi tiết ra file CSV.
/phatnguoi lichsu     » Xem 10 lần tra cứu gần nhất.
/phatnguoi ungho      » Thông tin ủng hộ tác giả.
/phatnguoi xoadulieu  » Xóa toàn bộ dữ liệu của bạn.
/phatnguoi help       » Xem lại hướng dẫn này.
`;

// =============================================================
// FORMAT KET QUA
// =============================================================
function formatViolationDetail(v, index, total) {
	const line = "━".repeat(20);
	let msg = `${line}\n🚔 VI PHẠM ${index}/${total}\n${line}\n\n`;
	msg += `📅 Thời gian: ${v["Thời gian vi phạm"] || "Không rõ"}\n`;
	msg += `📍 Địa điểm: ${v["Địa điểm vi phạm"] || "Không rõ"}\n`;
	msg += `⚠️ Hành vi: ${v["Hành vi vi phạm"] || "Không rõ"}\n`;
	msg += `📌 Trạng thái: ${v["Trạng thái"] || "Không rõ"}\n`;
	msg += `🚓 Đơn vị phát hiện: ${v["Đơn vị phát hiện vi phạm"] || "Không rõ"}\n\n`;
	msg += `🏢 Nơi giải quyết:\n`;
	const places = v["Nơi giải quyết vụ việc"];
	if (Array.isArray(places) && places.length > 0) {
		for (const place of places) msg += `   • ${place}\n`;
	} else {
		msg += `   • Không có thông tin\n`;
	}
	return msg;
}

// =============================================================
// CAC LENH
// =============================================================
async function checkSingle(ctx, env, userId, bienSoRaw) {
	const bienSo = (bienSoRaw || "").toUpperCase();
	if (!isValidPlate(bienSo)) {
		return reply(ctx, "❌ Biển số không hợp lệ!\n📋 Định dạng đúng: 72A12345, 51H-12345, 29X1-12345");
	}

	await ctx.replyWithChatAction("typing").catch(() => {});

	try {
		const { status, data, data_info } = await fetchPhatNguoi(bienSo);
		await logSearch(env, userId, bienSo);

		if (status !== 1 || !Array.isArray(data) || data.length === 0) {
			return reply(
				ctx,
				`✅ Biển số ${bienSo} không có phạt nguội.\n\n` +
					`💡 Muốn nhận thông báo mỗi ngày? Dùng:\n` +
					`/phatnguoi luu ${bienSo} [tên xe]\n/phatnguoi tudong on`
			);
		}

		const line = "━".repeat(20);
		const header = [
			`🚗 KẾT QUẢ TRA CỨU: ${bienSo}`,
			line,
			`📊 Tổng vi phạm: ${data_info.total}`,
			`❌ Chưa xử phạt: ${data_info.chuaxuphat}`,
			`✅ Đã xử phạt: ${data_info.daxuphat}`,
			`⏰ Vi phạm gần nhất: ${data_info.latest || "Không có"}`,
			line,
			`📝 Chi tiết từng vi phạm:`,
		].join("\n");

		await reply(ctx, header);
		for (let i = 0; i < data.length; i++) {
			await reply(ctx, formatViolationDetail(data[i], i + 1, data.length));
			await sleep(300);
		}

		const plates = await getPlates(env, userId);
		if (!plates.some((p) => p.bienso === bienSo)) {
			await reply(ctx, `💾 Lưu biển số này để theo dõi?\nGửi: /phatnguoi luu ${bienSo} [tên xe]`);
		}
	} catch (error) {
		console.error("[API_ERROR]", error);
		await reply(ctx, `⚠️ Đã xảy ra lỗi khi tra cứu:\n• ${error.message}\n\n🔄 Vui lòng thử lại sau.`);
	}
}

async function checkMultiple(ctx, env, userId, plates) {
	await reply(ctx, `🔍 Bắt đầu tra cứu ${plates.length} biển số...`);
	await ctx.replyWithChatAction("typing").catch(() => {});

	const line = "━".repeat(20);
	let results = `📊 KẾT QUẢ TRA CỨU NHIỀU BIỂN SỐ\n${line}\n\n`;

	for (const raw of plates) {
		const bienSo = raw.toUpperCase();
		await logSearch(env, userId, bienSo);
		if (!isValidPlate(bienSo)) {
			results += `❌ ${bienSo}: Biển số không hợp lệ.\n\n`;
			continue;
		}
		try {
			const { status, data_info } = await fetchPhatNguoi(bienSo);
			if (status === 1 && data_info && data_info.total > 0) {
				results += `🚗 ${bienSo}: ⚠️ CÓ ${data_info.total} VI PHẠM (Chưa xử: ${data_info.chuaxuphat})\n\n`;
			} else {
				results += `✅ ${bienSo}: Không có vi phạm.\n\n`;
			}
		} catch (error) {
			results += `⚠️ ${bienSo}: Lỗi tra cứu.\n\n`;
		}
		await sleep(400);
	}

	results += `${line}\n💡 Dùng /phatnguoi [biển số] để xem chi tiết.`;
	await reply(ctx, results);
}

async function savePlate(ctx, env, userId, args) {
	const bienSo = (args[0] || "").toUpperCase();
	const nickname = args.slice(1).join(" ") || "Xe của tôi";
	if (!bienSo) return reply(ctx, "⚠️ Vui lòng nhập biển số cần lưu.\n📝 VD: /phatnguoi luu 72A12345 Xe SH");
	if (!isValidPlate(bienSo)) return reply(ctx, "❌ Biển số không hợp lệ!");

	const plates = await getPlates(env, userId);
	if (plates.some((p) => p.bienso === bienSo)) {
		return reply(ctx, `⚠️ Biển số ${bienSo} đã được lưu trước đó!`);
	}
	if (plates.length >= 10) {
		return reply(ctx, "⚠️ Bạn đã lưu tối đa 10 biển số! Xóa bớt bằng: /phatnguoi xoa [biển số]");
	}
	plates.push({ bienso: bienSo, nickname, addedDate: new Date().toISOString() });
	await putPlates(env, userId, plates);
	await reply(
		ctx,
		`✅ Đã lưu thành công!\n\n🚗 Biển số: ${bienSo}\n📝 Tên gọi: ${nickname}\n\n` +
			`🔔 Bật thông báo tự động: /phatnguoi tudong on`
	);
}

async function listSavedPlates(ctx, env, userId) {
	const plates = await getPlates(env, userId);
	if (plates.length === 0) {
		return reply(ctx, "📋 Bạn chưa lưu biển số nào.\n💡 Dùng: /phatnguoi luu [biển số] [tên]");
	}
	const user = await getUser(env, userId);
	const line = "━".repeat(20);
	let msg = `📋 DANH SÁCH BIỂN SỐ ĐÃ LƯU\n${line}\n\n`;
	plates.forEach((p, i) => {
		msg += `${i + 1}. 🚗 ${p.bienso}\n   📝 ${p.nickname}\n   📅 Lưu: ${new Date(p.addedDate).toLocaleDateString("vi-VN")}\n\n`;
	});
	msg += `${line}\n🔔 Thông báo tự động: ${user?.autoNotify ? "✅ BẬT" : "❌ TẮT"}\n`;
	if (user?.autoNotify) msg += `⏰ Giờ gửi: ${user.notifyTime}\n`;
	await reply(ctx, msg);
}

async function deletePlate(ctx, env, userId, args) {
	const bienSo = (args[0] || "").toUpperCase();
	if (!bienSo) return reply(ctx, "⚠️ Vui lòng nhập biển số cần xóa.\n📝 VD: /phatnguoi xoa 72A12345");
	const plates = await getPlates(env, userId);
	const idx = plates.findIndex((p) => p.bienso === bienSo);
	if (idx === -1) return reply(ctx, `❌ Không tìm thấy biển số ${bienSo} trong danh sách.`);
	const [deleted] = plates.splice(idx, 1);
	await putPlates(env, userId, plates);
	await reply(ctx, `✅ Đã xóa!\n🚗 ${deleted.bienso}\n📝 ${deleted.nickname}`);
}

async function toggleAutoNotify(ctx, env, userId, args) {
	const action = (args[0] || "").toLowerCase();
	if (!["on", "off"].includes(action)) {
		return reply(ctx, "⚠️ Vui lòng chọn on hoặc off.\n📝 VD: /phatnguoi tudong on");
	}
	const user = await getUser(env, userId);
	user.autoNotify = action === "on";
	await putUser(env, userId, user);
	if (user.autoNotify) {
		const plates = await getPlates(env, userId);
		await reply(
			ctx,
			`✅ Đã BẬT thông báo tự động!\n⏰ Giờ gửi: ${user.notifyTime} (giờ VN)\n` +
				`📋 Theo dõi ${plates.length} biển số\n🕐 Giờ VN hiện tại: ${vnHHMM()}`
		);
	} else {
		await reply(ctx, "❌ Đã TẮT thông báo tự động.");
	}
}

async function setNotifyTime(ctx, env, userId, args) {
	const time = args[0];
	if (!time || !/^\d{2}:\d{2}$/.test(time)) {
		return reply(ctx, "⚠️ Định dạng giờ không đúng!\n📝 VD: /phatnguoi thoigian 09:00");
	}
	const [h, m] = time.split(":").map(Number);
	if (h < 0 || h > 23 || m < 0 || m > 59) return reply(ctx, "❌ Giờ không hợp lệ (00:00 - 23:59)");
	const user = await getUser(env, userId);
	user.notifyTime = time;
	await putUser(env, userId, user);
	await reply(
		ctx,
		`✅ Đã đặt giờ thông báo: ${time} (giờ VN)\n🕐 Giờ VN hiện tại: ${vnHHMM()}\n` +
			`${user.autoNotify ? "✅ Sẽ gửi báo cáo mỗi ngày vào " + time : "⚠️ Nhớ bật: /phatnguoi tudong on"}`
	);
}

async function showStatistics(ctx, env, userId, firstName) {
	const plates = await getPlates(env, userId);
	if (plates.length === 0) return reply(ctx, "📊 Chưa có dữ liệu. Hãy lưu biển số trước!");
	await ctx.replyWithChatAction("typing").catch(() => {});

	let totalV = 0, totalUnpaid = 0, totalPaid = 0;
	const stats = [];
	for (const plate of plates) {
		try {
			const { status, data_info } = await fetchPhatNguoi(plate.bienso);
			if (status === 1 && data_info) {
				const v = data_info.total || 0, u = data_info.chuaxuphat || 0, p = data_info.daxuphat || 0;
				totalV += v; totalUnpaid += u; totalPaid += p;
				stats.push({ plate: plate.bienso, nickname: plate.nickname, v, u, latest: data_info.latest });
			}
		} catch (e) {
			console.error("[STAT_ERROR]", plate.bienso, e.message);
		}
		await sleep(400);
	}
	stats.sort((a, b) => b.v - a.v);

	const line = "━".repeat(20);
	let report = `📊 THỐNG KÊ PHẠT NGUỘI CÁ NHÂN\n${line}\n\n`;
	report += `👤 Người dùng: ${firstName || "Bạn"}\n\n`;
	report += `📈 TỔNG QUAN:\n   🚗 Số xe: ${plates.length}\n   ⚠️ Tổng vi phạm: ${totalV}\n   ❌ Chưa xử: ${totalUnpaid}\n   ✅ Đã xử: ${totalPaid}\n\n`;
	report += `🏆 TOP VI PHẠM:\n`;
	const medals = ["🥇", "🥈", "🥉", "4️⃣", "5️⃣"];
	stats.slice(0, 5).forEach((s, i) => {
		report += `${medals[i]} ${s.nickname} (${s.plate})\n   Vi phạm: ${s.v} | Chưa xử: ${s.u}\n`;
		if (s.latest) report += `   Gần nhất: ${s.latest}\n`;
		report += `\n`;
	});
	report += `${line}\n💡 Xuất CSV: /phatnguoi xuatexcel`;
	await reply(ctx, report);
}

async function exportToCsv(ctx, env, userId) {
	const plates = await getPlates(env, userId);
	if (plates.length === 0) return reply(ctx, "📊 Chưa có dữ liệu để xuất. Hãy lưu biển số trước!");
	await reply(ctx, "⏳ Đang tạo báo cáo CSV, vui lòng chờ...");

	const rows = [];
	for (const plate of plates) {
		try {
			const { status, data } = await fetchPhatNguoi(plate.bienso);
			if (status === 1 && Array.isArray(data)) {
				for (const v of data) {
					rows.push({
						"Bien so": plate.bienso,
						"Ten goi": plate.nickname,
						"Thoi gian vi pham": v["Thời gian vi phạm"] || "",
						"Dia diem": v["Địa điểm vi phạm"] || "",
						"Hanh vi": v["Hành vi vi phạm"] || "",
						"Trang thai": v["Trạng thái"] || "",
						"Don vi phat hien": v["Đơn vị phát hiện vi phạm"] || "",
						"Noi giai quyet": Array.isArray(v["Nơi giải quyết vụ việc"])
							? v["Nơi giải quyết vụ việc"].join("; ")
							: "",
					});
				}
			}
		} catch (e) {
			console.error("[CSV_ERROR]", plate.bienso, e.message);
		}
		await sleep(400);
	}

	if (rows.length === 0) return reply(ctx, "📊 Không có vi phạm nào để xuất!");

	const headers = Object.keys(rows[0]);
	let csv = "\uFEFF" + headers.join(",") + "\n";
	for (const row of rows) {
		csv += headers.map((h) => `"${String(row[h] || "").replace(/"/g, '""')}"`).join(",") + "\n";
	}

	const bytes = new TextEncoder().encode(csv);
	const fileName = `phat_nguoi_${userId}_${Date.now()}.csv`;
	await ctx.replyWithDocument(new InputFile(bytes, fileName), {
		caption:
			`📊 Báo cáo phạt nguội đã sẵn sàng!\n` +
			`📅 ${new Date().toLocaleString("vi-VN")}\n📝 Tổng ${rows.length} vi phạm`,
	});
}

async function showHistory(ctx, env, userId) {
	const history = await getHistory(env, userId);
	if (history.length === 0) return reply(ctx, "📜 Chưa có lịch sử tra cứu.");
	const line = "━".repeat(20);
	let msg = `📜 LỊCH SỬ 10 LẦN TRA CỨU GẦN NHẤT\n${line}\n\n`;
	history.slice(-10).reverse().forEach((item, i) => {
		msg += `${i + 1}. 🚗 ${item.bienso}\n   📅 ${new Date(item.timestamp).toLocaleString("vi-VN")}\n\n`;
	});
	msg += `${line}\n📊 Tổng: ${history.length} lần tra cứu`;
	await reply(ctx, msg);
}

async function debugStatus(ctx, env, userId) {
	const user = await getUser(env, userId);
	const plates = await getPlates(env, userId);
	const current = vnHHMM();
	const line = "━".repeat(20);
	let msg = `🔧 THÔNG TIN DEBUG\n${line}\n\n`;
	msg += `👤 User ID: ${userId}\n🕐 Giờ VN: ${current}\n\n`;
	if (user) {
		msg += `⚙️ Cài đặt:\n   • Đã chấp nhận điều khoản: ${user.accepted ? "✅" : "❌"}\n`;
		msg += `   • Auto notify: ${user.autoNotify ? "✅ BẬT" : "❌ TẮT"}\n   • Giờ đặt: ${user.notifyTime}\n`;
		msg += `   • Số biển đã lưu: ${plates.length}\n   • Khớp giờ gửi: ${user.autoNotify && user.notifyTime === current ? "✅" : "❌"}\n`;
	} else {
		msg += `❌ Không tìm thấy dữ liệu user!`;
	}
	await reply(ctx, msg);
}

// =============================================================
// BAO CAO TU DONG (dung cho Cron Trigger va lenh testnow)
// =============================================================
async function buildDailyReport(env, userId) {
	const plates = await getPlates(env, userId);
	if (plates.length === 0) return null;
	const line = "━".repeat(20);
	const timeString = vnNow().toLocaleString("vi-VN");
	let report = `🌅 BÁO CÁO PHẠT NGUỘI HÀNG NGÀY\n📅 ${timeString} (giờ VN)\n${line}\n\n`;
	for (const plate of plates) {
		try {
			const { status, data_info } = await fetchPhatNguoi(plate.bienso);
			if (status === 1 && data_info && data_info.chuaxuphat > 0) {
				report += `🚗 ${plate.nickname} (${plate.bienso})\n   ❌ Chưa xử phạt: ${data_info.chuaxuphat}\n\n`;
			} else {
				report += `🚗 ${plate.nickname} (${plate.bienso})\n   ✅ Không có vi phạm chưa xử\n\n`;
			}
		} catch (e) {
			report += `⚠️ ${plate.nickname} (${plate.bienso}): Lỗi tra cứu\n\n`;
		}
		await sleep(300);
	}
	report += `${line}\n💡 Tra cứu chi tiết: /phatnguoi [biển số]`;
	return report;
}

// Chay boi Cron Trigger moi phut: gui cho user co notifyTime trung gio VN hien tai
export async function runDailyNotifications(env) {
	if (!env.BOT_TOKEN) {
		console.error("[CRON] Thieu BOT_TOKEN");
		return;
	}
	const current = vnHHMM();
	const bot = new Bot(env.BOT_TOKEN);
	let cursor;
	do {
		const list = await env.DB.list({ prefix: "user:", cursor });
		for (const key of list.keys) {
			const meta = key.metadata || {};
			if (meta.autoNotify && meta.notifyTime === current) {
				const userId = key.name.slice("user:".length);
				try {
					const report = await buildDailyReport(env, userId);
					if (report) await bot.api.sendMessage(userId, report);
				} catch (e) {
					console.error(`[CRON] Loi gui cho ${userId}:`, e.message);
				}
			}
		}
		cursor = list.list_complete ? undefined : list.cursor;
	} while (cursor);
}

// =============================================================
// KHOI TAO BOT (webhook)
// =============================================================
export function createBot(env) {
	const bot = new Bot(env.BOT_TOKEN);

	bot.on("message:text", async (ctx) => {
		const userId = ctx.from.id;
		const text = ctx.message.text.trim();
		const up = text.toUpperCase();
		let user = await getUser(env, userId);

		// 1) Xac nhan xoa du lieu
		if (user && user.pending === "delete") {
			if (up === "XÁC NHẬN XÓA") {
				await deleteUserData(env, userId);
				return reply(ctx, "✅ Đã xóa toàn bộ dữ liệu của bạn thành công.");
			}
			user.pending = null;
			await putUser(env, userId, user);
		}

		// 2) Chap nhan dieu khoan
		if (!user || !user.accepted) {
			if (up === "ĐỒNG Ý" || up === "DONG Y") {
				user = {
					accepted: true,
					acceptedDate: new Date().toISOString(),
					autoNotify: false,
					notifyTime: DEFAULT_NOTIFY_TIME,
					pending: null,
				};
				await putUser(env, userId, user);
				await reply(ctx, "✅ Cảm ơn bạn đã chấp nhận điều khoản!");
				return reply(ctx, HELP_MESSAGE);
			}
			if (text.startsWith("/")) {
				await putUser(env, userId, {
					accepted: false,
					autoNotify: false,
					notifyTime: DEFAULT_NOTIFY_TIME,
					pending: "terms",
				});
				return reply(ctx, TERMS_OF_SERVICE);
			}
			return; // bo qua text la khi chua chap nhan
		}

		// 3) User da chap nhan -> chi xu ly lenh bat dau bang "/"
		if (!text.startsWith("/")) return;
		const parts = text.slice(1).trim().split(/\s+/);
		const commandName = (parts.shift() || "").toLowerCase();
		if (commandName !== "phatnguoi") return;

		const sub = (parts[0] || "").toLowerCase();
		switch (sub) {
			case "help":
				return reply(ctx, HELP_MESSAGE);
			case "ungho":
				return reply(ctx, SUPPORT_MESSAGE);
			case "xoadulieu":
				user.pending = "delete";
				await putUser(env, userId, user);
				return reply(
					ctx,
					"⚠️ XÁC NHẬN XÓA DỮ LIỆU\n\nBạn có chắc muốn xóa TẤT CẢ dữ liệu cá nhân?\n" +
						"Hành động này KHÔNG THỂ hoàn tác.\n\nGửi 'XÁC NHẬN XÓA' để tiếp tục."
				);
			case "luu":
				return savePlate(ctx, env, userId, parts.slice(1));
			case "danhsach":
				return listSavedPlates(ctx, env, userId);
			case "xoa":
				return deletePlate(ctx, env, userId, parts.slice(1));
			case "tudong":
				return toggleAutoNotify(ctx, env, userId, parts.slice(1));
			case "thoigian":
				return setNotifyTime(ctx, env, userId, parts.slice(1));
			case "thongke":
				return showStatistics(ctx, env, userId, ctx.from.first_name);
			case "xuatexcel":
				return exportToCsv(ctx, env, userId);
			case "lichsu":
				return showHistory(ctx, env, userId);
			case "debug":
				return debugStatus(ctx, env, userId);
			case "testnow": {
				const report = await buildDailyReport(env, userId);
				return reply(ctx, report || "📊 Chưa có biển số nào để báo cáo.");
			}
			default: {
				if (parts.length === 0) {
					return reply(
						ctx,
						"⚠️ Vui lòng nhập biển số cần kiểm tra.\n📝 VD: /phatnguoi 72A12345\n\n💡 Gõ /phatnguoi help để xem tất cả lệnh!"
					);
				}
				if (parts.length > 1) return checkMultiple(ctx, env, userId, parts);
				return checkSingle(ctx, env, userId, parts[0]);
			}
		}
	});

	bot.catch((err) => {
		console.error("[BOT_ERROR]", err);
	});

	return bot;
}
