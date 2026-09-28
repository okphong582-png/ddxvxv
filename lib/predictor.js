const { normalizeOutcome, consecutive } = require("./sessions");
const MIN_HISTORY = 20;
const NAMES = [
  "Mốc 50/50",
  "Tần suất Bayesian",
  "Chuyển tiếp 1 phiên",
  "Chuyển tiếp 2 phiên",
];
const pct = (n) => Math.round(n * 1000) / 10;
function wilson(wins, n) {
  if (!n) return null;
  const z = 1.96,
    p = wins / n,
    d = 1 + (z * z) / n;
  const center = (p + (z * z) / (2 * n)) / d;
  const margin = (z * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n))) / d;
  return [pct(center - margin), pct(center + margin)];
}
function options(gameType) {
  return gameType === "xocdia" ? ["CHẴN", "LẺ"] : ["TÀI", "XỈU"];
}
function clean(history, gameType) {
  const allowed = [
    ...options(gameType),
    ...(gameType !== "xocdia" ? ["BÃO"] : []),
  ];
  const seen = new Set();
  return (history || [])
    .filter(
      (h) =>
        h &&
        /^\d+$/.test(String(h.phien)) &&
        allowed.includes(normalizeOutcome(h.outcome)),
    )
    .map((h) => ({
      ...h,
      phien: BigInt(h.phien).toString(),
      outcome: normalizeOutcome(h.outcome),
    }))
    .filter((h) => {
      if (seen.has(h.phien)) return false;
      seen.add(h.phien);
      return true;
    })
    .sort((a, b) => (BigInt(a.phien) < BigInt(b.phien) ? -1 : 1))
    .slice(-500);
}
function suffix(history, target) {
  const result = [];
  for (let i = history.length - 1; i >= 0; i--) {
    if (!target.includes(history[i].outcome)) break;
    if (i < history.length - 1 && !consecutive(history[i], history[i + 1]))
      break;
    result.unshift(history[i]);
  }
  return result;
}
function components(history, target) {
  const a = target[0],
    binary = history.filter((h) => target.includes(h.outcome));
  const recent = binary.slice(-100),
    tail = suffix(history, target);
  const probs = [
    0.5,
    (recent.filter((h) => h.outcome === a).length + 10) / (recent.length + 20),
  ];
  for (const order of [1, 2]) {
    let wins = 0,
      n = 0;
    const context = tail
      .slice(-order)
      .map((h) => h.outcome)
      .join("|");
    if (tail.length >= order)
      for (let i = order; i < history.length; i++) {
        const block = history.slice(i - order, i + 1);
        if (
          !block.every((h) => target.includes(h.outcome)) ||
          !block.slice(1).every((h, j) => consecutive(block[j], h))
        )
          continue;
        if (
          block
            .slice(0, -1)
            .map((h) => h.outcome)
            .join("|") === context
        ) {
          n++;
          if (history[i].outcome === a) wins++;
        }
      }
    probs.push((wins + 4) / (n + 8));
  }
  return probs;
}
function combine(probs, losses) {
  const raw = losses.map((l) => Math.exp(-8 * l));
  const sum = raw.reduce((a, b) => a + b, 0),
    weights = raw.map((v) => v / sum);
  // Baseline keeps part of the vote; sparse conditional patterns do not dominate.
  const p =
    0.25 * 0.5 + 0.75 * probs.reduce((s, v, i) => s + v * weights[i], 0);
  return { p, weights };
}
function replay(history, target) {
  let losses = NAMES.map(() => 0.25),
    won = 0,
    lost = 0,
    brier = 0,
    baselineWon = 0,
    streak = 0,
    maxStreak = 0;
  let signalWon = 0,
    signalTested = 0;
  const rows = [];
  for (let i = MIN_HISTORY; i < history.length; i++) {
    const prefix = history.slice(0, i),
      tail = suffix(prefix, target);
    if (tail.length < 5 || !consecutive(history[i - 1], history[i])) continue;
    const probs = components(prefix, target),
      { p } = combine(probs, losses);
    const pick = p >= 0.5 ? target[0] : target[1],
      actual = history[i].outcome;
    const win = pick === actual;
    const interval = wilson(won, won + lost);
    const signal =
      won + lost >= 30 && interval?.[0] > 50 && Math.abs(p - 0.5) >= 0.03;
    if (signal) {
      signalTested++;
      if (win) signalWon++;
    }
    if (win) {
      won++;
      streak++;
      maxStreak = Math.max(maxStreak, streak);
    } else {
      lost++;
      streak = 0;
    }
    const majority =
      prefix.filter((h) => h.outcome === target[0]).length >=
      prefix.filter((h) => h.outcome === target[1]).length
        ? target[0]
        : target[1];
    if (actual === majority) baselineWon++;
    // Triple outcomes are counted as misses; binary probability calibration excludes them.
    if (target.includes(actual)) {
      const y = actual === target[0] ? 1 : 0;
      brier += (p - y) ** 2;
      losses = losses.map((l, j) => 0.97 * l + 0.03 * (probs[j] - y) ** 2);
    }
    rows.push({
      phien: history[i].phien,
      predicted: pick,
      actual,
      probability: p,
      is_win: win,
    });
  }
  const totalTested = won + lost,
    binaryRows = rows.filter((r) => target.includes(r.actual)).length;
  return {
    losses,
    rows,
    stats: {
      won,
      lost,
      totalTested,
      winRate: totalTested ? pct(won / totalTested) : null,
      currentStreak: streak,
      maxStreak,
      interval95: wilson(won, totalTested),
      brier: binaryRows ? Number((brier / binaryRows).toFixed(4)) : null,
      baselineWinRate: totalTested ? pct(baselineWon / totalTested) : null,
      signalTested,
      signalWinRate: signalTested ? pct(signalWon / signalTested) : null,
      method: "walk-forward-v2",
      note: "Dự báo từng phiên chỉ dùng dữ liệu trước phiên đó; bỏ qua khoảng mất phiên.",
    },
  };
}
function pattern(history, target) {
  const tail = suffix(history, target),
    last = tail.at(-1)?.outcome;
  let run = 0;
  for (let i = tail.length - 1; i >= 0 && tail[i].outcome === last; i--) run++;
  let alternate = tail.length ? 1 : 0;
  for (
    let i = tail.length - 1;
    i > 0 && tail[i].outcome !== tail[i - 1].outcome;
    i--
  )
    alternate++;
  let matched = 0,
    broken = 0;
  for (let i = 0; i < history.length - 1; i++) {
    if (
      !target.includes(history[i].outcome) ||
      !target.includes(history[i + 1].outcome) ||
      !consecutive(history[i], history[i + 1])
    )
      continue;
    let r = 1;
    for (
      let j = i;
      j > 0 &&
      consecutive(history[j - 1], history[j]) &&
      history[j - 1].outcome === history[i].outcome;
      j--
    )
      r++;
    if (Math.min(r, 5) === Math.min(run, 5)) {
      matched++;
      if (history[i + 1].outcome !== history[i].outcome) broken++;
    }
  }
  return {
    name:
      run >= 3
        ? "Chuỗi " + last + " · " + run + " phiên"
        : alternate >= 3
          ? "Xen kẽ · " + alternate + " phiên"
          : "Chưa có mẫu rõ",
    desc: "Mẫu mô tả dữ liệu đã xảy ra. Chuỗi dài không buộc phiên sau phải đảo.",
    streakLen: run,
    breakSamples: matched,
    breakRate: matched ? pct(broken / matched) : null,
    breakInterval95: wilson(broken, matched),
  };
}
function predict(history, gameType = "taixiu") {
  const h = clean(history, gameType),
    target = options(gameType),
    evaluation = replay(h, target);
  const probs = components(h, target),
    combined = combine(probs, evaluation.losses);
  const ready = h.length >= MIN_HISTORY && suffix(h, target).length >= 5;
  const p = ready ? combined.p : 0.5,
    pick = p >= 0.5 ? target[0] : target[1];
  const evidence =
    evaluation.stats.totalTested >= 30 && evaluation.stats.interval95?.[0] > 50;
  const abstain = !ready || !evidence || Math.abs(p - 0.5) < 0.03;
  const reason = !ready
    ? "Cần ít nhất 20 phiên thật và 5 phiên cuối liên tiếp."
    : !evidence
      ? "Kiểm thử chưa chứng minh lợi thế đáng tin cậy so với 50/50."
      : Math.abs(p - 0.5) < 0.03
        ? "Hai cửa gần cân bằng."
        : "Có tín hiệu thống kê; vẫn có thể sai.";
  return {
    prediction: pick,
    recommendation: abstain ? null : pick,
    abstain,
    ready,
    sampleSize: h.length,
    confidence: pct(Math.max(p, 1 - p)),
    tai_pct: pct(p),
    xiu_pct: pct(1 - p),
    chan_pct: pct(p),
    le_pct: pct(1 - p),
    targetOptions: target,
    progressBar: "",
    riskLevel: abstain ? "CHƯA ĐỦ CƠ SỞ" : "CAO",
    tactic: abstain ? "CHỜ THÊM DỮ LIỆU" : "THAM KHẢO THỐNG KÊ",
    advice: reason,
    patternInfo: pattern(h, target),
    expectedSumRange: "Không dự báo",
    predictedDices: [],
    models: probs.map((v, i) => ({
      name: NAMES[i],
      pick: v >= 0.5 ? target[0] : target[1],
      confidence: pct(Math.max(v, 1 - v)),
      weight: pct(combined.weights[i]) + "%",
    })),
    backtest: evaluation.stats,
    probabilityNote:
      gameType === "sicbo" || h.some((x) => x.outcome === "BÃO")
        ? "Tỷ lệ Tài/Xỉu có điều kiện không có bộ ba; bộ ba được tính là sai khi đối chiếu."
        : "Ước lượng mô hình, không phải tỷ lệ thắng bảo đảm.",
    timestamp: new Date().toISOString(),
  };
}
module.exports = {
  predict,
  normalizeOutcome,
  clean,
  replay,
  components,
  wilson,
  MIN_HISTORY,
};
