// src/index.js
// Nhan webhook tu Telegram: tra 200 ngay, xu ly o che do nen (bo gioi han 10s cua grammY).
// scheduled(): chay theo Cron Trigger, gui bao cao tu dong dung gio (VN).

import { createBot, runDailyNotifications } from "./bot.js";

export default {
	async fetch(request, env, ctx) {
		// Cho phep mo bang trinh duyet de kiem tra bot con song khong
		if (request.method === "GET") {
			return new Response("✅ Bot tra cuu phat nguoi dang chay tren Cloudflare Workers!", {
				headers: { "content-type": "text/plain; charset=utf-8" },
			});
		}
		if (request.method !== "POST") {
			return new Response("Method not allowed", { status: 405 });
		}
		if (!env.BOT_TOKEN) {
			return new Response("Thieu BOT_TOKEN", { status: 500 });
		}
		// Xac thuc secret token tu Telegram
		if (env.WEBHOOK_SECRET) {
			const token = request.headers.get("X-Telegram-Bot-Api-Secret-Token");
			if (token !== env.WEBHOOK_SECRET) {
				return new Response("Unauthorized", { status: 401 });
			}
		}
		let update;
		try {
			update = await request.json();
		} catch (e) {
			return new Response("Bad Request", { status: 400 });
		}
		const bot = createBot(env);
		await bot.init();
		// Tra 200 ngay cho Telegram, xu ly (goi API cham) o che do nen
		ctx.waitUntil(bot.handleUpdate(update).catch((e) => console.error("[HANDLE_ERROR]", e)));
		return new Response("OK");
	},

	async scheduled(event, env, ctx) {
		ctx.waitUntil(runDailyNotifications(env));
	},
};
