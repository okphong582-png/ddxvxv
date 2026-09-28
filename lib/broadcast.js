const crypto = require("node:crypto");
const path = require("node:path");
const { DATA_DIR, readJson, writeJson } = require("./storage");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
class BroadcastService {
  constructor({
    file = path.join(DATA_DIR, "telegram.json"),
    api,
    wait = sleep,
  } = {}) {
    this.file = file;
    this.api = api;
    this.wait = wait;
    this.state = readJson(file, {
      users: {},
      drafts: {},
      job: null,
      offset: 0,
    });
    this.running = false;
    this.state.users ||= {};
    this.state.drafts ||= {};
  }
  save() {
    writeJson(this.file, this.state);
  }
  register(chat, user) {
    if (
      chat?.type !== "private" ||
      user?.is_bot ||
      String(chat.id) !== String(user.id)
    )
      return;
    const id = String(chat.id),
      old = this.state.users[id];
    this.state.users[id] = {
      ...old,
      id,
      lastSeen: Date.now(),
      blocked: false,
      optOut: old?.optOut || false,
    };
    this.save();
  }
  importUsers(users) {
    for (const id of Object.keys(users || {}))
      if (/^\d+$/.test(id) && !this.state.users[id])
        this.state.users[id] = { id, optOut: false, blocked: false };
    this.save();
  }
  optOut(id, value = true) {
    if (this.state.users[id]) {
      this.state.users[id].optOut = value;
      this.save();
    }
  }
  recipients() {
    return Object.values(this.state.users)
      .filter((u) => !u.blocked && !u.optOut)
      .map((u) => u.id);
  }
  draft(owner, chat, text) {
    text = String(text || "").trim();
    if (!text || text.length > 3500)
      throw Error("Nội dung cần có từ 1 đến 3.500 ký tự.");
    const nonce = crypto.randomBytes(8).toString("hex");
    this.state.drafts[String(owner)] = {
      owner: String(owner),
      chat: String(chat),
      text,
      nonce,
      expires: Date.now() + 600000,
    };
    this.save();
    return this.state.drafts[String(owner)];
  }
  confirm(owner, chat, nonce) {
    const d = this.state.drafts[String(owner)];
    if (
      !d ||
      d.owner !== String(owner) ||
      d.chat !== String(chat) ||
      d.nonce !== nonce ||
      d.expires < Date.now()
    )
      throw Error("Bản nháp đã hết hạn hoặc không thuộc tài khoản này.");
    if (this.state.job?.status === "running")
      throw Error("Đang có thông báo được gửi. Hãy chờ hoàn tất.");
    const ids = this.recipients();
    this.state.job = {
      id: nonce,
      owner: String(owner),
      chat: String(chat),
      text: d.text,
      ids,
      cursor: 0,
      sent: 0,
      failed: 0,
      blocked: 0,
      skipped: 0,
      unknown: 0,
      status: "running",
      createdAt: Date.now(),
    };
    delete this.state.drafts[String(owner)];
    this.save();
    return this.state.job;
  }
  cancelDraft(owner) {
    delete this.state.drafts[String(owner)];
    this.save();
  }
  cancelJob(owner) {
    const j = this.state.job;
    if (j?.owner === String(owner) && j.status === "running") {
      j.status = "cancelled";
      this.save();
      return true;
    }
    return false;
  }
  async deliver(id, text) {
    for (let attempt = 0; attempt < 4; attempt++) {
      const r = await this.api("sendMessage", {
        chat_id: id,
        text: "📣 THÔNG BÁO TỪ ADMIN\n\n" + text,
      });
      if (r?.ok) return "sent";
      if (r?.error_code === 403) {
        if (this.state.users[id]) this.state.users[id].blocked = true;
        return "blocked";
      }
      if (r?.error_code === 429) {
        const secs = Number(r.parameters?.retry_after) || 1;
        await this.wait((secs + 1) * 1000);
        continue;
      }
      // An ambiguous network response can mean delivered: avoid automatically duplicating it.
      return r ? "failed" : "unknown";
    }
    return "failed";
  }
  async run() {
    if (this.running || this.state.job?.status !== "running") return;
    this.running = true;
    const j = this.state.job;
    try {
      if (j.inflight) {
        j.unknown++;
        delete j.inflight;
        this.save();
      }
      while (j.cursor < j.ids.length && j.status === "running") {
        const id = j.ids[j.cursor++],
          u = this.state.users[id];
        if (!u || u.optOut || u.blocked) {
          j.skipped++;
          this.save();
          continue;
        }
        j.inflight = id;
        this.save();
        const result = await this.deliver(id, j.text);
        j[result]++;
        delete j.inflight;
        this.save();
        await this.wait(100);
      }
      if (j.status === "running") j.status = "done";
      j.finishedAt = Date.now();
      this.save();
      await this.api("sendMessage", {
        chat_id: j.chat,
        text:
          "📣 Kết quả thông báo\nĐã gửi: " +
          j.sent +
          "\nLỗi: " +
          j.failed +
          "\nĐã chặn bot: " +
          j.blocked +
          "\nBỏ qua: " +
          j.skipped +
          "\nChưa rõ trạng thái: " +
          j.unknown +
          "\nTrạng thái: " +
          j.status,
      });
    } finally {
      this.running = false;
    }
  }
}
module.exports = { BroadcastService };
