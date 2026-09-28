const path = require("node:path");
const predictor = require("./predictor");
const { nextRound, roundId } = require("./sessions");
const { DATA_DIR, readJson, writeJson } = require("./storage");
class AiEngine {
  constructor(file = path.join(DATA_DIR, "ai.json")) {
    this.file = file;
    this.models = readJson(file, {});
  }
  saveStore() {
    writeJson(this.file, this.models);
  }
  getOrCreateModel(id, info = {}) {
    let m = this.models[id];
    // Version 1 contained clamped rates and retrospective "live" wins. Never import them.
    if (!m || m.version !== 2)
      m = this.models[id] = {
        version: 2,
        channel_id: id,
        platform: info.platform || id,
        game_name: info.gameName || "",
        game_type: info.gameType || "taixiu",
        epochs: 0,
        total_bets: 0,
        total_wins: 0,
        total_losses: 0,
        win_rate: null,
        current_streak: 0,
        max_streak: 0,
        recent_matches: [],
        last_prediction: null,
        last_session: null,
        missed_rounds: 0,
      };
    if (info.platform) m.platform = info.platform;
    if (info.gameName) m.game_name = info.gameName;
    if (info.gameType) m.game_type = info.gameType;
    return m;
  }
  predictNextSession(id, history, gameType = "taixiu") {
    const m = this.getOrCreateModel(id, { gameType }),
      latest = history.at(-1);
    if (!latest) return null;
    const p = predictor.predict(history, gameType);
    m.last_prediction = {
      phien_target: nextRound(latest.phien),
      source_phien: latest.phien,
      prediction: p.prediction,
      confidence: p.confidence,
      eligible: true,
      abstain: p.abstain,
      game_type: gameType,
      created_at: new Date().toISOString(),
      probability: p.tai_pct / 100,
    };
    this.saveStore();
    return m.last_prediction;
  }
  onNewSession(id, session, gameType = "taixiu", history = []) {
    const m = this.getOrCreateModel(id, { gameType }),
      current = roundId(session.phien);
    if (m.last_session && BigInt(current) <= BigInt(m.last_session)) return;
    const p = m.last_prediction;
    if (p && current === p.phien_target && p.eligible) {
      const win = session.outcome === p.prediction;
      m.total_bets++;
      if (win) m.total_wins++;
      else m.total_losses++;
      m.current_streak = win ? m.current_streak + 1 : 0;
      m.max_streak = Math.max(m.max_streak, m.current_streak);
      m.win_rate = Math.round((1000 * m.total_wins) / m.total_bets) / 10;
      m.recent_matches.unshift({
        phien: current,
        predicted: p.prediction,
        actual: session.outcome,
        is_win: win,
        abstained: p.abstain,
        created_at: p.created_at,
        settled_at: new Date().toISOString(),
        comprehension:
          "Dự báo " +
          p.prediction +
          " · Kết quả " +
          session.outcome +
          " · " +
          (win ? "Đúng" : "Sai"),
      });
      m.recent_matches = m.recent_matches.slice(0, 100);
    } else if (p && BigInt(current) > BigInt(p.phien_target)) m.missed_rounds++;
    m.last_session = current;
    m.epochs++;
    m.updated_at = new Date().toISOString();
    this.predictNextSession(id, history.length ? history : [session], gameType);
  }
  bootstrapTrain(id, history, gameType) {
    // Historical validation stays in predictor.backtest, never added to live counters.
    this.getOrCreateModel(id, { gameType });
  }
  analyzeDicePositions(history, gameType = "taixiu") {
    const sample = history.slice(-100);
    if (gameType === "xocdia") {
      const names = [
          "4 Trắng",
          "3 Trắng · 1 Đỏ",
          "2 Trắng · 2 Đỏ",
          "1 Trắng · 3 Đỏ",
          "4 Đỏ",
        ],
        counts = [0, 0, 0, 0, 0];
      sample
        .filter(
          (h) => Number.isInteger(h.total) && h.total >= 0 && h.total <= 4,
        )
        .forEach((h) => counts[h.total]++);
      const n = counts.reduce((a, b) => a + b, 0),
        top = counts.indexOf(Math.max(...counts));
      return {
        gameType,
        sampleSize: n,
        topVi: n ? names[top] : "Chưa có dữ liệu vị",
        topProb: n ? Math.round((1000 * counts[top]) / n) / 10 : null,
      };
    }
    const valid = sample.filter(
      (h) =>
        Array.isArray(h.dices) &&
        h.dices.length === 3 &&
        h.dices.every((d) => Number.isInteger(d) && d >= 1 && d <= 6),
    );
    const counts = [0, 0, 0, 0, 0, 0],
      pairs = {};
    let triples = 0;
    for (const h of valid) {
      h.dices.forEach((d) => counts[d - 1]++);
      if (h.dices.every((d) => d === h.dices[0])) triples++;
      const sorted = [...h.dices].sort();
      const unique = new Set([
        sorted[0] + "-" + sorted[1],
        sorted[0] + "-" + sorted[2],
        sorted[1] + "-" + sorted[2],
      ]);
      unique.forEach((p) => (pairs[p] = (pairs[p] || 0) + 1));
    }
    const n = valid.length,
      hot = counts.indexOf(Math.max(...counts)) + 1,
      cold = counts.indexOf(Math.min(...counts)) + 1;
    const top = Object.entries(pairs).sort((a, b) => b[1] - a[1])[0];
    return {
      gameType,
      sampleSize: n,
      dicePercentages: Object.fromEntries(
        counts.map((v, i) => [
          i + 1,
          n ? Math.round((1000 * v) / (3 * n)) / 10 : null,
        ]),
      ),
      hotFace: n ? hot : null,
      hotFaceRate: n
        ? Math.round((1000 * counts[hot - 1]) / (3 * n)) / 10
        : null,
      coldFace: n ? cold : null,
      topPair: top?.[0] || "—",
      topPairRate: n ? Math.round((1000 * (top?.[1] || 0)) / n) / 10 : null,
      tripleRate: n ? Math.round((1000 * triples) / n) / 10 : null,
    };
  }
  getChannelAiDetail(id, history = []) {
    const m = this.getOrCreateModel(id);
    return {
      ...m,
      interval95: predictor.wilson(m.total_wins, m.total_bets),
      dice_analysis: this.analyzeDicePositions(history, m.game_type),
    };
  }
  getAllAiOverview() {
    return Object.values(this.models)
      .map((m) => ({ ...m, recent_matches: m.recent_matches.slice(0, 5) }))
      .sort((a, b) => b.total_bets - a.total_bets);
  }
}
module.exports = new AiEngine();
module.exports.AiEngine = AiEngine;
