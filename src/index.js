// src/index.js
// Entry point cho Cloudflare Worker.
// - fetch():   nhan webhook tu Telegram va xu ly cac lenh.
// - scheduled(): chay theo Cron Trigger, gui bao cao tu dong dung gio (VN).

import { webhookCallback } from "grammy";
import { createBot, runDailyNotifications } from "./bot.js";

export default {
	async fetch(request, env, ctx) {
		// Cho phep mo bang trinh duyet de kiem tra bot con song khong
		if (request.method === "GET") {
			return new Response("\u2705 Bot tra cuu phat nguoi dang chay tren Cloudflare Workers!", {
				headers: { "content-type": "text/plain; charset=utf-8" },
			});
		}

		if (!env.BOT_TOKEN) {
			return new Response("Thieu BOT_TOKEN (dat bang: npx wrangler secret put BOT_TOKEN)", {
				status: 500,
			});
		}

		const bot = createBot(env);
		await bot.init();

		const handle = webhookCallback(bot, "cloudflare-mod", {
			secretToken: env.WEBHOOK_SECRET,
		});

		try {
			return await handle(request);
		} catch (err) {
			console.error("[WEBHOOK_ERROR]", err);
			return new Response("error", { status: 500 });
		}
	},

	async scheduled(event, env, ctx) {
		ctx.waitUntil(runDailyNotifications(env));
	},
};
