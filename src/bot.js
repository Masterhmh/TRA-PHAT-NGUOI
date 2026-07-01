// src/bot.js
// Toan bo logic bot: luu tru KV, goi API phat nguoi, xu ly lenh, va gui bao cao tu dong.

import { Bot, InputFile } from "grammy";

const API_URL = "https://api.checkphatnguoi.vn/phatnguoi"; // Nguon chinh (JSON)
const API_URL_FALLBACK = "https://api.phatnguoi.vn/web/tra-cuu"; // Nguon du phong (HTML)
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

// =============================================================
// GOI API PHAT NGUOI (co nguon du phong)
// =============================================================
// Nguon chinh: api.checkphatnguoi.vn (tra ve JSON chuan)
async function fetchFromCheckPhatNguoi(bienSo) {
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
			lastErr = new Error(`checkphatnguoi.vn HTTP ${res.status}`);
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
	console.error("[CHECKPHATNGUOI_ERROR]", lastErr);
	throw lastErr || new Error("checkphatnguoi.vn khong phan hoi");
}

// Chuyen 1 o (td) HTML thanh text sach (giu xuong dong cho cac muc nhieu dong)
function htmlCellToText(html) {
	return String(html)
		.replace(/<\s*br\s*\/?\s*>/gi, "\n")
		.replace(/<\/(p|div|tr|li|h[1-6])>/gi, "\n")
		.replace(/<[^>]+>/g, "")
		.replace(/&nbsp;/gi, " ")
		.replace(/&amp;/gi, "&")
		.replace(/&lt;/gi, "<")
		.replace(/&gt;/gi, ">")
		.replace(/&quot;/gi, '"')
		.replace(/&#0?39;|&apos;/gi, "'")
		.split("\n")
		.map((s) => s.replace(/[ \t]+/g, " ").trim())
		.filter((s) => s.length > 0)
		.join("\n")
		.trim();
}

// Parse HTML tu phatnguoi.vn -> cung dinh dang voi checkphatnguoi.vn
function parsePhatNguoiVnHtml(html) {
	const empty = {
		status: 1,
		data: [],
		data_info: { total: 0, chuaxuphat: 0, daxuphat: 0, latest: null },
	};
	if (!html || /kh\u00f4ng c\u00f3 l\u1 ... redacted