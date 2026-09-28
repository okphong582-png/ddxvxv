const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const root = path.join(__dirname, "..");
fs.mkdirSync(path.join(root, ".local"), { recursive: true });
process.env.DATA_DIR = fs.mkdtempSync(
  path.join(root, ".local/test-broadcast-"),
);
process.env.BOT_AUTOSTART = "false";
const { BroadcastService } = require("../lib/broadcast"),
  menu = require("../lib/menu");
let serial = 0;
const service = (api = async () => ({ ok: true }), wait = async () => {}) =>
  new BroadcastService({
    file: path.join(process.env.DATA_DIR, "job-" + serial++ + ".json"),
    api,
    wait,
  });
function user(b, id) {
  b.register({ id, type: "private" }, { id, is_bot: false });
}
test("registry accepts private users only, deduplicates and persists opt-out", () => {
  const b = service();
  user(b, 1);
  user(b, 1);
  b.register({ id: -10, type: "group" }, { id: 2 });
  b.optOut(1);
  user(b, 1);
  assert.deepEqual(b.recipients(), []);
  const restored = new BroadcastService({ file: b.file });
  assert.equal(restored.state.users[1].optOut, true);
});
test("draft requires owner, chat, unexpired nonce and one confirmation only", () => {
  const b = service();
  user(b, 1);
  const d = b.draft(99, 99, "hello");
  assert.throws(() => b.confirm(98, 99, d.nonce));
  assert.throws(() => b.confirm(99, 98, d.nonce));
  b.confirm(99, 99, d.nonce);
  assert.throws(() => b.confirm(99, 99, d.nonce));
});
test("reject empty, oversized or expired drafts", () => {
  const b = service();
  assert.throws(() => b.draft(1, 1, ""));
  assert.throws(() => b.draft(1, 1, "a".repeat(3501)));
  const d = b.draft(1, 1, "hello");
  d.expires = 0;
  assert.throws(() => b.confirm(1, 1, d.nonce));
});
test("broadcast retries 429, skips opt-out, marks blocked users, escapes no text into HTML", async () => {
  const sent = [],
    waits = [];
  let tries = 0;
  const b = service(
    async (method, p) => {
      sent.push(p);
      if (p.chat_id === "1" && tries++ === 0)
        return { ok: false, error_code: 429, parameters: { retry_after: 3 } };
      if (p.chat_id === "2") return { ok: false, error_code: 403 };
      return { ok: true };
    },
    async (ms) => waits.push(ms),
  );
  [1, 2, 3].forEach((id) => user(b, id));
  b.optOut(3);
  const d = b.draft(99, 99, "<b>literal & text</b>");
  b.confirm(99, 99, d.nonce);
  await b.run();
  assert.equal(b.state.job.sent, 1);
  assert.equal(b.state.job.blocked, 1);
  assert.equal(b.state.users[2].blocked, true);
  assert.ok(waits.includes(4000));
  assert.equal(
    sent.some((p) => p.chat_id === "3"),
    false,
  );
  assert.equal(sent[0].parse_mode, undefined);
});
test("ambiguous network responses are not blindly retried", async () => {
  let calls = 0;
  const b = service(async (m, p) => {
    if (p.chat_id === "1") {
      calls++;
      return null;
    }
    return { ok: true };
  });
  user(b, 1);
  const d = b.draft(99, 99, "message");
  b.confirm(99, 99, d.nonce);
  await b.run();
  assert.equal(calls, 1);
  assert.equal(b.state.job.unknown, 1);
});
test("resume after restart avoids duplicate send for an inflight recipient", async () => {
  const b = service();
  [1, 2].forEach((id) => user(b, id));
  const d = b.draft(99, 99, "message");
  b.confirm(99, 99, d.nonce);
  b.state.job.cursor = 1;
  b.state.job.inflight = "1";
  b.save();
  const sent = [];
  const restarted = new BroadcastService({
    file: b.file,
    api: async (m, p) => {
      sent.push(p.chat_id);
      return { ok: true };
    },
    wait: async () => {},
  });
  await restarted.run();
  assert.equal(sent.includes("1"), false);
  assert.equal(sent.includes("2"), true);
  assert.equal(restarted.state.job.unknown, 1);
});
test("cancelled broadcast does not start sending", async () => {
  const b = service(async () => {
    throw Error("must not send");
  });
  user(b, 1);
  const d = b.draft(99, 99, "message");
  b.confirm(99, 99, d.nonce);
  assert.equal(b.cancelJob(1), false);
  assert.equal(b.cancelJob(99), true);
  await b.run();
  assert.equal(b.state.job.sent, 0);
});
test("menus escape names, paginate and do not invent success rates", () => {
  const text = menu.home({ user: { first_name: "<b>&" }, isAdmin: true }, []);
  assert.ok(text.includes("&lt;b&gt;&amp;"));
  assert.ok(!text.includes("94.8"));
  const channels = Array.from({ length: 20 }, (_, i) => ({
    id: "id" + i,
    gameType: "taixiu",
    platform: "P",
    gameName: "TX",
  }));
  const p = menu.portals(channels, "all", 1);
  assert.equal(
    p.reply_markup.inline_keyboard.filter((r) =>
      r[0].callback_data.startsWith("pred_"),
    ).length,
    8,
  );
  assert.ok(p.text.includes("2/3"));
});
test("bot message and callback handlers deny broadcast access to ordinary users", async () => {
  const firebase = require("../lib/firebase");
  firebase.isAdmin = (id) => id === 99;
  firebase.checkUserAuthorized = async () => ({ authorized: true });
  firebase.getMaintenance = async () => ({ active: false });
  firebase.getBroadcastUsers = async () => ({});
  const old = global.fetch;
  const calls = [];
  global.fetch = async (url, opts) => {
    calls.push({ url, body: JSON.parse(opts.body) });
    return { json: async () => ({ ok: true, result: { message_id: 1 } }) };
  };
  const bot = require("../bot");
  try {
    await bot.handleMessage({
      message_id: 1,
      chat: { id: 1, type: "private" },
      from: { id: 1 },
      text: "/broadcast hello",
    });
    assert.equal(bot.broadcaster.state.job, null);
    await bot.handleCallbackQuery({
      id: "cb",
      data: "admin_broadcast",
      from: { id: 1 },
      message: { message_id: 1, chat: { id: 1, type: "private" } },
    });
    assert.ok(calls.some((c) => c.body.text?.includes("Chỉ admin")));
    assert.equal(bot.broadcaster.state.job, null);
    await bot.handleMessage({
      message_id: 2,
      chat: { id: 99, type: "private" },
      from: { id: 99 },
      text: "/broadcast Test notification",
    });
    assert.equal(bot.broadcaster.state.job, null);
    assert.equal(bot.broadcaster.state.drafts["99"].text, "Test notification");
  } finally {
    bot.stop();
    global.fetch = old;
  }
});
