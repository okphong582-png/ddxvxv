function normalizeOutcome(value) {
  const s = String(value ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/gi, "d")
    .trim()
    .toUpperCase();
  return (
    {
      TAI: "TÀI",
      T: "TÀI",
      XIU: "XỈU",
      X: "XỈU",
      CHAN: "CHẴN",
      C: "CHẴN",
      EVEN: "CHẴN",
      LE: "LẺ",
      L: "LẺ",
      ODD: "LẺ",
      BAO: "BÃO",
      TRIPLE: "BÃO",
    }[s] || null
  );
}
function roundId(value) {
  if (value == null) return null;
  const s = String(value).replace(/^#/, "").trim();
  return /^[0-9]{1,30}$/.test(s) ? BigInt(s).toString() : null;
}
function nextRound(value) {
  const id = roundId(value);
  return id === null ? null : (BigInt(id) + 1n).toString();
}
function consecutive(a, b) {
  return !!a && !!b && nextRound(a.phien) === roundId(b.phien);
}
function timestamp(value) {
  if (typeof value === "number") return value < 1e12 ? value * 1000 : value;
  if (!value || !String(value).trim()) return null;
  let s = String(value).trim().replace(" UTC+7", "+07:00");
  if (/^\d{2}-\d{2}-\d{4} /.test(s))
    s = s.replace(/^(\d{2})-(\d{2})-(\d{4}) /, "$3-$2-$1T");
  s = s.replace(/^(\d{4}-\d{2}-\d{2}) /, "$1T");
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?$/.test(s)) s += "+07:00";
  const ms = Date.parse(s);
  return Number.isFinite(ms) ? ms : null;
}
function normalizeResponse(data, channel, now = Date.now()) {
  if (
    !data ||
    typeof data !== "object" ||
    Array.isArray(data) ||
    data.success === false ||
    data.ok === false
  )
    return null;
  const envelope =
    data.data && typeof data.data === "object" ? data.data : data;
  const s = envelope.current || envelope;
  const phien = roundId(s.phien ?? s.session_id ?? s.round_id);
  if (phien === null || s.ended === false) return null;
  const isXocdia = channel.gameType === "xocdia";
  let outcome = normalizeOutcome(
    s.ket_qua_truyen_thong ??
      s.ket_qua ??
      s.even_odd ??
      s.result_text ??
      s.outcome,
  );
  let total = null,
    dices = [],
    warnings = [];
  const arr = s.xuc_xac ?? s.dices;
  if (isXocdia) {
    if (Array.isArray(arr) && arr.length === 4) {
      const colors = arr.map((v) =>
        String(v)
          .normalize("NFD")
          .replace(/[̀-ͯ]/g, "")
          .replace(/đ/gi, "d")
          .toLowerCase(),
      );
      if (!colors.every((v) => v === "do" || v === "trang")) return null;
      total = colors.filter((v) => v === "do").length;
    } else if (typeof s.color === "string") {
      const m = s.color.toUpperCase().match(/([0-4])\s*(?:ĐỎ|DO)/);
      if (m) total = Number(m[1]);
    }
    if (total !== null) {
      const derived = total % 2 === 0 ? "CHẴN" : "LẺ";
      if (outcome && outcome !== derived) {
        warnings.push("Kết quả và màu không khớp; không dùng thống kê vị.");
        total = null;
      } else outcome = outcome || derived;
    }
    if (!["CHẴN", "LẺ"].includes(outcome)) return null;
  } else {
    const rawDice = Array.isArray(arr)
      ? arr
      : [s.xuc_xac_1, s.xuc_xac_2, s.xuc_xac_3];
    if (rawDice.some((v) => v !== undefined && v !== null)) {
      if (rawDice.length !== 3 || rawDice.some((v) => v === "" || v == null))
        return null;
      dices = rawDice.map(Number);
      if (!dices.every((v) => Number.isInteger(v) && v >= 1 && v <= 6))
        return null;
      total = dices.reduce((a, b) => a + b, 0);
    }
    const rawTotal = s.tong ?? s.total;
    if (rawTotal !== undefined && rawTotal !== null) {
      const n = Number(rawTotal);
      if (
        rawTotal === "" ||
        !Number.isInteger(n) ||
        n < 3 ||
        n > 18 ||
        (total !== null && n !== total)
      )
        return null;
      total = n;
    }
    if (total !== null) {
      const derived = total >= 11 ? "TÀI" : "XỈU";
      if (
        outcome &&
        outcome !== derived &&
        !(
          outcome === "BÃO" &&
          ((dices.length === 3 && dices.every((v) => v === dices[0])) ||
            total === 3 ||
            total === 18)
        )
      )
        return null;
      outcome = outcome || derived;
    }
    // Sicbo bộ ba là kết quả riêng, không ghi là một lần thắng Tài/Xỉu.
    if (
      channel.gameType === "sicbo" &&
      dices.length === 3 &&
      dices.every((v) => v === dices[0])
    )
      outcome = "BÃO";
    if (!["TÀI", "XỈU", "BÃO"].includes(outcome)) return null;
  }
  const sourceAt = timestamp(
    s.end_timestamp ??
      s.timestamp ??
      s.update_at ??
      s.thoi_gian ??
      envelope.last_update,
  );
  return {
    phien,
    outcome,
    total,
    dices,
    time: sourceAt ? new Date(sourceAt).toISOString() : "",
    sourceAt,
    observedAt: now,
    md5: s.md5_encrypt || s.md5_enc || s.md5 || null,
    warnings,
    provenance: "api-v2",
  };
}
module.exports = {
  normalizeOutcome,
  roundId,
  nextRound,
  consecutive,
  timestamp,
  normalizeResponse,
};
