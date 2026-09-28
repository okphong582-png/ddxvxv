const esc = (v) =>
  String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
const rate = (v) => (v == null ? "Chưa có mẫu" : v + "%");
function home({ user, isAdmin, authCheck }, channels) {
  channels = channels.filter((c) => c.active !== false);
  const fresh = channels.filter((c) => c.online && !c.stale).length;
  return [
    "☁️ <b>HOANGHA SKY</b>",
    isAdmin
      ? "Bảng điều khiển quản trị"
      : "Theo dõi kết quả · Phân tích từng cổng",
    "",
    "Xin chào <b>" + esc(user?.first_name || "bạn") + "</b> 👋",
    "📡 Dữ liệu mới: <b>" + fresh + "/" + channels.length + " cổng</b>",
    isAdmin
      ? "👑 Quyền quản trị đã được xác nhận."
      : "🔑 Gói: " + esc(authCheck?.tokenData?.duration || "Đã kích hoạt"),
    "",
    "Chọn trò chơi, xem lịch sử hoặc kiểm tra tỷ lệ bên dưới.",
    "<i>Dự đoán là ước lượng thống kê; không bảo đảm kết quả.</i>",
  ].join("\n");
}
function userKeyboard() {
  return {
    inline_keyboard: [
      [
        { text: "🎲 Tài Xỉu thường", callback_data: "portals_tx_0" },
        { text: "🔐 Tài Xỉu MD5", callback_data: "portals_md5_0" },
      ],
      [
        { text: "🎯 Sicbo", callback_data: "portals_sicbo_0" },
        { text: "⚪ Xóc Đĩa", callback_data: "portals_xocdia_0" },
      ],
      [
        { text: "📊 Tỷ lệ từng cổng", callback_data: "rates_0" },
        { text: "📡 Tất cả cổng", callback_data: "portals_all_0" },
      ],
      [
        { text: "🔔 Báo phiên Sunwin", callback_data: "toggle_notify" },
        { text: "👤 Tài khoản", callback_data: "user_info" },
      ],
      [
        { text: "🃏 Sexy Baccarat", callback_data: "external_sexy2_0" },
        { text: "⚽ Volta", callback_data: "external_volta" },
      ],
      [
        { text: "💳 Gia hạn", callback_data: "napthe_menu" },
        { text: "❔ Hướng dẫn", callback_data: "help_menu" },
      ],
    ],
  };
}
function adminKeyboard() {
  return {
    inline_keyboard: [
      [
        { text: "📣 Gửi thông báo", callback_data: "admin_broadcast" },
        { text: "📬 Tiến độ gửi", callback_data: "admin_broadcast_status" },
      ],
      [
        { text: "🌐 Cập nhật API", callback_data: "admin_update_cong" },
        { text: "📊 Tỷ lệ từng cổng", callback_data: "rates_0" },
      ],
      [
        { text: "🔑 Tạo token", callback_data: "admin_create_token_prompt" },
        { text: "📋 Danh sách token", callback_data: "admin_view_tokens" },
      ],
      [
        { text: "👑 Quản lý admin", callback_data: "admin_manage_admins" },
        { text: "✅ Tắt bảo trì", callback_data: "admin_off_baotri" },
      ],
      [
        { text: "🎲 Chọn cổng", callback_data: "portals_all_0" },
        { text: "❔ Hướng dẫn", callback_data: "help_menu" },
      ],
      [
        { text: "🃏 Sexy Baccarat", callback_data: "external_sexy2_0" },
        { text: "⚽ Volta", callback_data: "external_volta" },
      ],
    ],
  };
}
function portals(channels, type = "all", page = 0) {
  const list = channels.filter(
    (c) =>
      c.gameType !== "external" &&
      (type === "all" ||
        (type === "md5" && c.id.includes("md5")) ||
        (type === "tx" && c.gameType === "taixiu" && !c.id.includes("md5")) ||
        c.gameType === type),
  );
  const pages = Math.max(1, Math.ceil(list.length / 8));
  page = Math.max(0, Math.min(page, pages - 1));
  const rows = [];
  for (const c of list.slice(page * 8, page * 8 + 8))
    rows.push([
      {
        text:
          (c.online && !c.stale ? "🟢 " : "⚪ ") +
          c.platform +
          " · " +
          c.gameName,
        callback_data: "pred_" + c.id,
      },
    ]);
  const nav = [];
  if (page > 0)
    nav.push({
      text: "‹ Trước",
      callback_data: "portals_" + type + "_" + (page - 1),
    });
  if (page + 1 < pages)
    nav.push({
      text: "Sau ›",
      callback_data: "portals_" + type + "_" + (page + 1),
    });
  if (nav.length) rows.push(nav);
  rows.push([{ text: "⌂ Trang chủ", callback_data: "back_main" }]);
  return {
    text:
      "🎮 <b>CHỌN CỔNG</b> · " +
      (page + 1) +
      "/" +
      pages +
      "\n🟢 Dữ liệu mới · ⚪ Chưa sẵn sàng",
    reply_markup: { inline_keyboard: rows },
  };
}
function prediction(d) {
  const { channel: c, status: s, latest: l, prediction: p, ai } = d,
    b = p.backtest;
  const valid = s.online && !s.stale;
  const ci = b.interval95 ? b.interval95.join("–") + "%" : "Chưa đủ mẫu";
  const lines = [
    (c.icon || "🎲") +
      " <b>" +
      esc(c.platform) +
      " · " +
      esc(c.gameName) +
      "</b>",
    valid ? "🟢 Dữ liệu mới" : "⚠️ " + esc(s.error || "Chưa có dữ liệu mới"),
    "",
    p.abstain
      ? "⏸ <b>CHỜ THÊM DỮ LIỆU</b>"
      : "🔎 <b>Tham khảo: " + esc(p.recommendation) + "</b>",
    esc(p.advice),
  ];
  if (valid && p.ready)
    lines.push(
      "",
      "Ước lượng: <b>" +
        p.targetOptions[0] +
        " " +
        p.tai_pct +
        "%</b> · <b>" +
        p.targetOptions[1] +
        " " +
        p.xiu_pct +
        "%</b>",
    );
  lines.push(
    "",
    "📊 <b>Kiểm thử quá khứ</b>",
    "Đúng " + b.won + "/" + b.totalTested + " · " + rate(b.winRate),
    "Khoảng tin cậy 95%: " + ci,
    "Mốc dự báo theo đa số: " + rate(b.baselineWinRate),
    "",
    "📍 <b>Đối chiếu trực tiếp</b>",
    "Đúng " +
      (ai?.total_wins ?? 0) +
      "/" +
      (ai?.total_bets ?? 0) +
      " · " +
      rate(ai?.win_rate),
    "Dữ liệu hợp lệ: " +
      p.sampleSize +
      " phiên · Mất nhịp: " +
      (d.dataQuality?.gaps ?? 0),
    "",
    "〰️ " + esc(p.patternInfo.name),
  );
  if (p.patternInfo.breakSamples)
    lines.push(
      "Đảo sau chuỗi cùng độ dài: " +
        rate(p.patternInfo.breakRate) +
        " / " +
        p.patternInfo.breakSamples +
        " mẫu quá khứ",
    );
  if (l)
    lines.push(
      "Kết quả gần nhất #" +
        esc(l.phien) +
        ": <b>" +
        esc(l.outcome) +
        "</b>" +
        (l.total !== null ? " · " + l.total : ""),
    );
  lines.push(
    "",
    "<i>" +
      esc(p.probabilityNote) +
      " Không suy ra xúc xắc tương lai từ MD5.</i>",
  );
  return lines.join("\n");
}
function rates(channels, collector, page = 0) {
  page = Math.max(0, Math.min(page, Math.ceil(channels.length / 6) - 1));
  const slice = channels.slice(page * 6, page * 6 + 6),
    rows = [];
  const lines = [
    "📊 <b>TỶ LỆ RIÊNG TỪNG CỔNG</b>",
    "Tỷ lệ dưới đây là kiểm thử theo thứ tự thời gian.",
    "",
  ];
  for (const c of slice) {
    const d = collector.getChannelData(c.id),
      b = d.prediction.backtest;
    lines.push(
      "<b>" + esc(c.platform) + " · " + esc(c.gameName) + "</b>",
      "Quá khứ: " +
        rate(b.winRate) +
        " (" +
        b.won +
        "/" +
        b.totalTested +
        ") · Trực tiếp: " +
        rate(d.ai.win_rate) +
        " (" +
        d.ai.total_wins +
        "/" +
        d.ai.total_bets +
        ")",
      "",
    );
    rows.push([
      { text: c.platform + " · " + c.gameName, callback_data: "pred_" + c.id },
    ]);
  }
  const nav = [];
  if (page > 0)
    nav.push({ text: "‹ Trước", callback_data: "rates_" + (page - 1) });
  if ((page + 1) * 6 < channels.length)
    nav.push({ text: "Sau ›", callback_data: "rates_" + (page + 1) });
  if (nav.length) rows.push(nav);
  rows.push([{ text: "⌂ Trang chủ", callback_data: "back_main" }]);
  return { text: lines.join("\n"), reply_markup: { inline_keyboard: rows } };
}
module.exports = {
  esc,
  rate,
  home,
  userKeyboard,
  adminKeyboard,
  portals,
  prediction,
  rates,
};
