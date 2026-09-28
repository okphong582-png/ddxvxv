const path = require("node:path");
const config = require("./config");
const predictor = require("./predictor");
const aiEngine = require("./ai_engine");
const { normalizeResponse, consecutive } = require("./sessions");
const { DATA_DIR, readJson, writeJson } = require("./storage");
const STALE_MS = 180000;
class DataCollector {
  constructor({
    file = path.join(DATA_DIR, "history.json"),
    engine = aiEngine,
    load = true,
  } = {}) {
    this.file = file;
    this.engine = engine;
    this.historyStore = {};
    this.statusMap = {};
    this.inflight = new Map();
    this.predictionCache = new Map();
    this.pollInterval = null;
    this.stopped = true;
    if (load) this.loadHistory();
  }
  normalizeResponse(data, channel) {
    return normalizeResponse(data, channel);
  }
  loadHistory() {
    const stored = readJson(this.file, null),
      legacy =
        stored ||
        readJson(path.join(__dirname, "..", "data", "history_store.json"), {});
    for (const c of config.loadEndpoints()) {
      const rows = (legacy[c.id] || [])
        .map((h) =>
          h.provenance === "api-v2"
            ? h
            : h.raw
              ? normalizeResponse(h.raw, c, 0)
              : null,
        )
        .filter(Boolean);
      this.historyStore[c.id] = predictor.clean(rows, c.gameType);
      this.engine.getOrCreateModel(c.id, c);
    }
  }
  saveHistory() {
    writeJson(this.file, this.historyStore);
  }
  async fetchChannel(channel) {
    if (this.inflight.has(channel.id)) return this.inflight.get(channel.id);
    const promise = this.fetchOne(channel).finally(() =>
      this.inflight.delete(channel.id),
    );
    this.inflight.set(channel.id, promise);
    return promise;
  }
  async fetchOne(channel) {
    const start = Date.now(),
      previous = this.statusMap[channel.id] || {};
    try {
      const r = await fetch(channel.url, {
        signal: AbortSignal.timeout(7000),
        headers: { "User-Agent": "TX-Monitor/2.0" },
      });
      if (!r.ok) throw Error("HTTP " + r.status);
      const norm = normalizeResponse(await r.json(), channel);
      if (!norm) throw Error("Thiếu kết quả thật hoặc dữ liệu không hợp lệ");
      const history =
          this.historyStore[channel.id] || (this.historyStore[channel.id] = []),
        last = history.at(-1);
      if (last && BigInt(norm.phien) < BigInt(last.phien))
        throw Error("API trả phiên cũ hơn phiên đã lưu");
      if (
        last &&
        norm.phien === last.phien &&
        (norm.outcome !== last.outcome || norm.total !== last.total)
      )
        throw Error("API thay đổi kết quả của cùng một phiên");
      const isNew = !last || norm.phien !== last.phien;
      const changedAt = isNew
        ? Date.now()
        : previous.changedAt || last?.observedAt || Date.now();
      const sourceAge =
        norm.sourceAt === null ? null : Date.now() - norm.sourceAt;
      const progressVerified =
        !!previous.progressVerified || (!!previous.latestSession && isNew);
      const stale =
        Date.now() - changedAt > STALE_MS ||
        (sourceAge !== null
          ? sourceAge > STALE_MS || sourceAge < -60000
          : !progressVerified);
      if (isNew) {
        history.push(norm);
        if (history.length > 500) history.splice(0, history.length - 500);
        this.predictionCache.delete(channel.id);
        this.saveHistory();
      }
      this.statusMap[channel.id] = {
        online: true,
        stale,
        ping: Date.now() - start,
        lastCheck: new Date().toISOString(),
        checkedAt: Date.now(),
        changedAt,
        progressVerified,
        latestSession: norm.phien,
        sourceAgeMs: sourceAge,
        error: stale
          ? sourceAge === null && !progressVerified
            ? "Cần quan sát phiên mới để xác minh nguồn không có thời gian"
            : "Kết quả đã cũ, không đổi phiên hoặc thời gian nguồn không hợp lệ"
          : null,
      };
      this.engine.getOrCreateModel(channel.id, channel);
      if (isNew && !stale)
        this.engine.onNewSession(channel.id, norm, channel.gameType, history);
      else if (
        !stale &&
        !this.engine.getOrCreateModel(channel.id).last_prediction
      )
        this.engine.predictNextSession(channel.id, history, channel.gameType);
      return { ok: true, stale, session: norm };
    } catch (error) {
      this.statusMap[channel.id] = {
        ...previous,
        online: false,
        stale: true,
        ping: Date.now() - start,
        lastCheck: new Date().toISOString(),
        checkedAt: Date.now(),
        error: error.message,
      };
      return { ok: false, error: error.message };
    }
  }
  async fetchAllChannels() {
    await Promise.allSettled(
      config
        .loadEndpoints()
        .filter((c) => c.active !== false)
        .map((c) => this.fetchChannel(c)),
    );
  }
  startPolling(intervalMs = 5000) {
    this.stopPolling();
    this.stopped = false;
    const tick = async () => {
      await this.fetchAllChannels();
      if (!this.stopped) this.pollInterval = setTimeout(tick, intervalMs);
    };
    tick();
  }
  stopPolling() {
    this.stopped = true;
    clearTimeout(this.pollInterval);
  }
  getChannelData(id) {
    const channel = config.loadEndpoints().find((c) => c.id === id);
    if (!channel) throw Error("Không tìm thấy cổng: " + id);
    const history = this.historyStore[id] || [],
      latest = history.at(-1) || null;
    const status = {
      ...(this.statusMap[id] || {
        online: false,
        stale: true,
        ping: 0,
        lastCheck: "—",
        error: "Chưa kiểm tra kết nối",
      }),
    };
    if (Date.now() - (status.checkedAt || 0) > 30000) status.stale = true;
    if (latest?.sourceAt && Date.now() - latest.sourceAt > STALE_MS)
      status.stale = true;
    let p = this.predictionCache.get(id);
    if (!p) {
      p = predictor.predict(history, channel.gameType);
      this.predictionCache.set(id, p);
    }
    const prediction = { ...p };
    if (!status.online || status.stale) {
      prediction.abstain = true;
      prediction.recommendation = null;
      prediction.advice =
        status.error || "Dữ liệu chưa được cập nhật; tạm dừng dự đoán.";
    }
    return {
      channel,
      status,
      latest,
      history: history.slice(-50),
      prediction,
      ai: this.engine.getChannelAiDetail(id, history),
      dataQuality: {
        validSessions: history.length,
        gaps: history.slice(1).filter((h, i) => !consecutive(history[i], h))
          .length,
      },
    };
  }
  getAiOverview() {
    return this.engine.getAllAiOverview();
  }
  getAllChannelsOverview() {
    return config.loadEndpoints().map((c) => {
      const h = this.historyStore[c.id] || [],
        s = this.statusMap[c.id] || {};
      return {
        ...c,
        online: !!s.online,
        stale: !s.checkedAt || Date.now() - s.checkedAt > 30000 || !!s.stale,
        ping: s.ping || 0,
        latestSession: h.at(-1)?.phien || "—",
        latestOutcome: h.at(-1)?.outcome || "—",
      };
    });
  }
}
module.exports = new DataCollector();
module.exports.DataCollector = DataCollector;
