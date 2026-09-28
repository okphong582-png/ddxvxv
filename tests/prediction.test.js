const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const root = path.join(__dirname, "..");
fs.mkdirSync(path.join(root, ".local"), { recursive: true });
process.env.DATA_DIR = fs.mkdtempSync(path.join(root, ".local/test-predict-"));
process.env.BOT_AUTOSTART = "false";
const sessions = require("../lib/sessions"),
  predictor = require("../lib/predictor");
const { AiEngine } = require("../lib/ai_engine");
const { DataCollector } = require("../lib/collector");
const tx = { id: "sunwin_tx", platform: "Sunwin", gameType: "taixiu" },
  xd = { gameType: "xocdia" };
const series = (n, fn = (i) => (i % 2 ? "TÀI" : "XỈU")) =>
  Array.from({ length: n }, (_, i) => ({
    phien: String(i + 1),
    outcome: fn(i),
    total: fn(i) === "TÀI" ? 12 : 8,
    dices: [],
    provenance: "api-v2",
  }));
test("reject missing round or actual result; never substitute betting round", () => {
  assert.equal(sessions.normalizeResponse({}, tx), null);
  assert.equal(
    sessions.normalizeResponse({ phien_cuoc: 5, du_doan: "Tài" }, tx),
    null,
  );
  assert.equal(
    sessions.normalizeResponse({ phien: 5, ket_qua: "unknown" }, tx),
    null,
  );
});
test("numeric strings in dice are dice, not disc colors", () => {
  const h = sessions.normalizeResponse(
    { phien: 1, xuc_xac: ["1", "3", "6"] },
    tx,
  );
  assert.equal(h.outcome, "XỈU");
  assert.deepEqual(h.dices, [1, 3, 6]);
});
test("reject malformed, contradictory or out-of-range dice", () => {
  for (const data of [
    { phien: 1, xuc_xac: [0, 3, 6] },
    { phien: 1, xuc_xac: [2, 3, 6], tong: 9 },
    { phien: 1, tong: 15, ket_qua: "Xỉu" },
  ])
    assert.equal(sessions.normalizeResponse(data, tx), null);
});
test("preserve zero red discs; missing dice remain missing", () => {
  const h = sessions.normalizeResponse(
    { phien: 1, xuc_xac: ["Trắng", "Trắng", "Trắng", "Trắng"] },
    xd,
  );
  assert.equal(h.total, 0);
  assert.equal(h.outcome, "CHẴN");
  assert.deepEqual(h.dices, []);
  assert.deepEqual(
    sessions.normalizeResponse({ phien: 2, ket_qua: "Tài" }, tx).dices,
    [],
  );
});
test("ambiguous disc colors do not override explicit parity or invent positions", () => {
  const h = sessions.normalizeResponse(
    { session_id: 1, even_odd: "CHẴN", color: "3 ĐỎ - 1 TRẮNG" },
    xd,
  );
  assert.equal(h.outcome, "CHẴN");
  assert.equal(h.total, null);
  assert.equal(h.warnings.length, 1);
});
test("Sicbo triple is separate and never a binary win", () =>
  assert.equal(
    sessions.normalizeResponse(
      { phien: 1, xuc_xac: [5, 5, 5], ket_qua: "Tài" },
      { gameType: "sicbo" },
    ).outcome,
    "BÃO",
  ));
test("parse known API timestamps and use exact, large round IDs", () => {
  const expected = Date.parse("2026-09-28T13:14:01+07:00");
  assert.equal(sessions.timestamp("28-09-2026 13:14:01 UTC+7"), expected);
  assert.equal(sessions.timestamp("2026-09-28 13:14:01"), expected);
  assert.equal(
    sessions.nextRound("90071992547409939999"),
    "90071992547409940000",
  );
  assert.equal(sessions.roundId("#0701234"), "701234");
});
test("API fixtures normalize without fabricated rounds; bad or unavailable payloads stay rejected", () => {
  const samples = require("../api_samples.json"),
    channels = require("../lib/config").loadEndpoints();
  let accepted = 0;
  for (const [id, sample] of Object.entries(samples)) {
    const c = channels.find((c) => c.id === id);
    if (!c || !sample.ok) continue;
    const n = sessions.normalizeResponse(sample.data, c);
    assert.ok(n, id);
    assert.ok(n.phien);
    accepted++;
  }
  assert.ok(accepted >= 20);
});
test("empty and short histories show no fabricated wins, streaks or confidence", () => {
  const p = predictor.predict(series(4));
  assert.equal(p.confidence, 50);
  assert.equal(p.abstain, true);
  assert.equal(p.backtest.winRate, null);
  assert.equal(p.backtest.totalTested, 0);
  assert.equal(p.backtest.currentStreak, 0);
});
test("all rates equal actual counts and chronological predictions match replay", () => {
  let seed = 123;
  const h = series(95, () => {
    seed = (1664525 * seed + 1013904223) >>> 0;
    return seed % 7 < 3 ? "TÀI" : "XỈU";
  });
  const p = predictor.predict(h);
  const replay = predictor.replay(h, ["TÀI", "XỈU"]);
  assert.equal(
    p.backtest.winRate,
    Math.round((1000 * p.backtest.won) / p.backtest.totalTested) / 10,
  );
  assert.equal(p.backtest.won + p.backtest.lost, p.backtest.totalTested);
  for (const i of [20, 40, 70]) {
    const row = replay.rows.find((r) => r.phien === h[i].phien);
    const prefix = predictor.predict(h.slice(0, i));
    assert.equal(row.predicted, prefix.prediction);
    assert.ok(Math.abs(row.probability - prefix.tai_pct / 100) < 0.001);
  }
  assert.ok(p.backtest.brier >= 0 && p.backtest.brier <= 1);
  assert.ok(p.backtest.interval95[0] <= p.backtest.winRate);
  assert.ok(p.backtest.interval95[1] >= p.backtest.winRate);
});
test("gaps and nonnumeric/duplicate IDs cannot count as consecutive rounds", () => {
  const h = series(40).map((h, i) => ({ ...h, phien: String(i * 3 + 1) }));
  assert.equal(predictor.predict(h).backtest.totalTested, 0);
  assert.equal(predictor.predict(h).ready, false);
  assert.equal(
    predictor.clean(
      [
        ...series(5),
        { phien: "1", outcome: "TÀI" },
        { phien: "oops", outcome: "TÀI" },
      ],
      "taixiu",
    ).length,
    5,
  );
});
test("patterns report measured breaks; no forced reversal for a long streak", () => {
  const p = predictor.predict(series(80, () => "TÀI"));
  assert.equal(p.prediction, "TÀI");
  assert.equal(p.patternInfo.breakRate, 0);
  assert.ok(p.patternInfo.breakSamples > 0);
});
test("live accounting matches only exact target, once; counters isolated by portal", () => {
  const engine = new AiEngine(path.join(process.env.DATA_DIR, "exact.json"));
  const h = series(30);
  const m = engine.getOrCreateModel("a", tx);
  m.last_prediction = {
    phien_target: "31",
    prediction: "TÀI",
    eligible: true,
    abstain: false,
  };
  engine.onNewSession("a", { phien: "32", outcome: "TÀI" }, "taixiu", [
    ...h,
    { phien: "32", outcome: "TÀI" },
  ]);
  assert.equal(m.total_bets, 0);
  assert.equal(m.missed_rounds, 1);
  m.last_prediction = {
    phien_target: "33",
    prediction: "XỈU",
    eligible: true,
    abstain: false,
  };
  const actual = { phien: "33", outcome: "TÀI" };
  engine.onNewSession("a", actual, "taixiu", [...h, actual]);
  engine.onNewSession("a", actual, "taixiu", [...h, actual]);
  assert.equal(m.total_bets, 1);
  assert.equal(m.win_rate, 0);
  assert.equal(m.current_streak, 0);
  assert.equal(engine.getOrCreateModel("b").total_bets, 0);
  const restored = new AiEngine(engine.file);
  assert.equal(restored.models.a.total_losses, 1);
});
test("bootstrap never promotes retrospective tests into live wins", () => {
  const engine = new AiEngine(
    path.join(process.env.DATA_DIR, "bootstrap.json"),
  );
  engine.bootstrapTrain("a", series(60), "taixiu");
  assert.equal(engine.models.a.total_bets, 0);
});
test("collector ignores duplicates, rollback, failed API and stale sources", async () => {
  const engine = new AiEngine(
    path.join(process.env.DATA_DIR, "collector-ai.json"),
  );
  const c = new DataCollector({
    file: path.join(process.env.DATA_DIR, "collector.json"),
    engine,
    load: false,
  });
  const old = global.fetch;
  let payload = {
    phien: 100,
    ket_qua: "Tài",
    tong: 12,
    update_at: new Date().toISOString(),
  };
  global.fetch = async () => ({ ok: true, json: async () => payload });
  try {
    await c.fetchChannel(tx);
    await c.fetchChannel(tx);
    assert.equal(c.historyStore[tx.id].length, 1);
    payload = { ...payload, phien: 99 };
    assert.equal((await c.fetchChannel(tx)).ok, false);
    assert.equal(c.historyStore[tx.id].length, 1);
    payload = { ...payload, phien: 101, update_at: "2020-01-01 00:00:00" };
    await c.fetchChannel(tx);
    const d = c.getChannelData(tx.id);
    assert.equal(d.status.stale, true);
    assert.equal(d.prediction.abstain, true);
    global.fetch = async () => {
      throw Error("offline");
    };
    await c.fetchChannel({ ...tx, id: "hitclub_tx" });
    assert.equal(c.historyStore.hitclub_tx, undefined);
  } finally {
    global.fetch = old;
  }
});
test("parallel refresh of one channel uses only one request", async () => {
  const c = new DataCollector({
    file: path.join(process.env.DATA_DIR, "dedup.json"),
    engine: new AiEngine(path.join(process.env.DATA_DIR, "dedup-ai.json")),
    load: false,
  });
  const old = global.fetch;
  let count = 0;
  global.fetch = async () => {
    count++;
    await new Promise((r) => setTimeout(r, 5));
    return { ok: true, json: async () => ({ phien: 2, tong: 12 }) };
  };
  try {
    await Promise.all([c.fetchChannel(tx), c.fetchChannel(tx)]);
    assert.equal(count, 1);
  } finally {
    global.fetch = old;
  }
});

test("explicit 68GB triple result remains separate from Tai/Xiu", () => {
  const h = sessions.normalizeResponse(
    {
      phien: 281387,
      xuc_xac_1: 6,
      xuc_xac_2: 6,
      xuc_xac_3: 6,
      tong: 18,
      ket_qua: "BÃO",
      timestamp: 1790576890751,
    },
    tx,
  );
  assert.equal(h.outcome, "BÃO");
  assert.equal(predictor.clean([h], "taixiu").length, 1);
});
test("timestamp-free feed must advance; fresh timestamps cannot hide a frozen round", async () => {
  const c = new DataCollector({
    file: path.join(process.env.DATA_DIR, "fresh.json"),
    engine: new AiEngine(path.join(process.env.DATA_DIR, "fresh-ai.json")),
    load: false,
  });
  let payload = { phien: 1, tong: 12 };
  const old = global.fetch;
  global.fetch = async () => ({ ok: true, json: async () => payload });
  try {
    await c.fetchChannel(tx);
    assert.equal(c.statusMap[tx.id].stale, true);
    payload = { phien: 2, tong: 12 };
    await c.fetchChannel(tx);
    assert.equal(c.statusMap[tx.id].stale, false);
    c.statusMap[tx.id].changedAt = Date.now() - 190000;
    payload = { ...payload, update_at: new Date().toISOString() };
    await c.fetchChannel(tx);
    assert.equal(c.statusMap[tx.id].stale, true);
  } finally {
    global.fetch = old;
  }
});
