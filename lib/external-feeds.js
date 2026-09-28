const { esc } = require("./menu");
const { timestamp } = require("./sessions");
const cache = new Map();
async function read(url) {
  const cached = cache.get(url);
  if (cached && Date.now() - cached.at < 15000) return cached.data;
  const response = await fetch(url, { signal: AbortSignal.timeout(7000) });
  if (!response.ok) throw Error("HTTP " + response.status);
  const data = await response.json();
  cache.set(url, { at: Date.now(), data });
  return data;
}
const back = { text: "⌂ Trang chủ", callback_data: "back_main" };
async function view(data) {
  try {
    if (data === "external_volta") {
      const json = await read(
        "https://exploration-channels-note-headline.trycloudflare.com/api/volta",
      );
      return {
        text:
          "⚽ <b>VOLTA · NGUỒN BÓNG ĐÁ</b>\n\nDự đoán do nguồn cung cấp: " +
          esc(json.du_doan || "Chưa có") +
          "\nHệ số home: " +
          esc(json.ty_le?.home ?? "—") +
          " · away: " +
          esc(json.ty_le?.away ?? "—") +
          "\nCập nhật nguồn: " +
          esc(json.update_at || "Không có") +
          "\n\nĐây không phải kết quả TX. Bot không dùng nguồn này để huấn luyện hoặc tính tỷ lệ thắng.",
        reply_markup: { inline_keyboard: [[back]] },
      };
    }
    if (data.startsWith("external_sexy1_")) {
      const id = data.slice("external_sexy1_".length);
      if (!/^(?:[1-9]|10|C0[1-9]|C1[0-5]|100[1-9]|101[0-5])$/.test(id))
        throw Error("Mã bàn không hợp lệ");
      const json = await read(
        "https://elements-reporters-milton-dividend.trycloudflare.com/api/bcr/" +
          id,
      );
      return {
        text:
          "🃏 <b>SEXY V1 · BÀN " +
          esc(id) +
          "</b>\nTrạng thái nguồn: " +
          esc(json.status || "Chưa có") +
          "\nPhiên nguồn: " +
          esc(json.phien ?? "—") +
          " · Shoe: " +
          esc(json.summary?.shoe ?? "—") +
          "\nKết quả nguồn: " +
          esc(json.current_winner || "Chưa có") +
          "\n\nNguồn chưa cung cấp đủ lịch sử kết quả để kiểm thử. Không dùng trường recommended_bet làm xác suất do bot tính.",
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: "‹ Danh sách bàn",
                callback_data: "external_sexy1menu_0",
              },
            ],
            [back],
          ],
        },
      };
    }
    if (data.startsWith("external_sexy1menu_")) {
      const ids = [
        ...Array.from({ length: 10 }, (_, i) => String(i + 1)),
        ...Array.from(
          { length: 15 },
          (_, i) => "C" + String(i + 1).padStart(2, "0"),
        ),
        ...Array.from({ length: 15 }, (_, i) => String(1001 + i)),
      ];
      const page = Math.max(
          0,
          Math.min(4, Number(data.split("_").at(-1)) || 0),
        ),
        rows = ids
          .slice(page * 8, page * 8 + 8)
          .map((id) => [
            { text: "Bàn " + id, callback_data: "external_sexy1_" + id },
          ]);
      const nav = [];
      if (page)
        nav.push({
          text: "‹ Trước",
          callback_data: "external_sexy1menu_" + (page - 1),
        });
      if (page < 4)
        nav.push({
          text: "Sau ›",
          callback_data: "external_sexy1menu_" + (page + 1),
        });
      rows.push(nav, [back]);
      return {
        text: "🃏 <b>SEXY V1 · CHỌN BÀN</b>\nChỉ hiển thị dữ liệu nguồn; chưa có tỷ lệ dự đoán được kiểm chứng.",
        reply_markup: { inline_keyboard: rows },
      };
    }
    const json = await read(
      "https://construct-vacuum-bosnia-travel.trycloudflare.com/api/bcr",
    );
    if (!Array.isArray(json.data)) throw Error("Nguồn không có danh sách bàn");
    if (data.startsWith("external_sexy2table_")) {
      const id = data.slice("external_sexy2table_".length),
        table = json.data.find((t) => String(t.ban) === id);
      if (!table) throw Error("Không có bàn này");
      const seq = String(table.results || "");
      if (!/^[BPT]*$/.test(seq)) throw Error("Chuỗi kết quả không hợp lệ");
      const count = (c) => seq.split("").filter((v) => v === c).length,
        at = timestamp(table.update_at),
        fresh = at && Date.now() - at < 180000;
      return {
        text:
          "🃏 <b>SEXY V2 · BÀN " +
          esc(id) +
          "</b>\n" +
          (fresh
            ? "🟢 Nguồn vừa cập nhật"
            : "⚠️ Nguồn cũ hoặc không có thời gian") +
          "\n\nChuỗi nguồn: <code>" +
          esc(seq.slice(-60)) +
          "</code>\nB = Cái · P = Con · T = Hòa\nSố kết quả: " +
          seq.length +
          "\nCái: " +
          count("B") +
          " · Con: " +
          count("P") +
          " · Hòa: " +
          count("T") +
          "\n\nChưa có mã phiên và shoe để đối chiếu: chỉ thống kê chuỗi hiện tại, không gộp các bàn hay đưa tỷ lệ thắng giả.",
        reply_markup: {
          inline_keyboard: [
            [{ text: "🔄 Cập nhật", callback_data: data }],
            [{ text: "‹ Danh sách bàn", callback_data: "external_sexy2_0" }],
            [back],
          ],
        },
      };
    }
    const page = Math.max(
      0,
      Math.min(
        Math.ceil(json.data.length / 8) - 1,
        Number(data.split("_").at(-1)) || 0,
      ),
    );
    const rows = json.data
      .slice(page * 8, page * 8 + 8)
      .filter((t) => /^[a-z0-9]{1,12}$/i.test(String(t.ban)))
      .map((t) => [
        { text: "Bàn " + t.ban, callback_data: "external_sexy2table_" + t.ban },
      ]);
    const nav = [];
    if (page)
      nav.push({
        text: "‹ Trước",
        callback_data: "external_sexy2_" + (page - 1),
      });
    if ((page + 1) * 8 < json.data.length)
      nav.push({
        text: "Sau ›",
        callback_data: "external_sexy2_" + (page + 1),
      });
    if (nav.length) rows.push(nav);
    rows.push(
      [{ text: "Xem nguồn V1", callback_data: "external_sexy1menu_0" }],
      [back],
    );
    return {
      text: "🃏 <b>SEXY V2 · BACCARAT</b>\nChọn bàn để đọc chuỗi kết quả riêng.",
      reply_markup: { inline_keyboard: rows },
    };
  } catch (e) {
    return {
      text: "⚠️ Không đọc được nguồn: " + esc(e.message),
      reply_markup: {
        inline_keyboard: [
          [{ text: "🔄 Thử lại", callback_data: data }],
          [back],
        ],
      },
    };
  }
}
module.exports = { view };
