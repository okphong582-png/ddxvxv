const fs = require("node:fs");
const path = require("node:path");
const { loadEndpoints } = require("../lib/config");
const { normalizeResponse, consecutive } = require("../lib/sessions");
const predictor = require("../lib/predictor");
async function audit() {
  const channels = loadEndpoints(),
    saved = JSON.parse(
      fs.readFileSync(
        path.join(__dirname, "..", "data", "history_store.json"),
        "utf8",
      ),
    );
  const rows = await Promise.all(
    channels.map(async (c) => {
      if (c.gameType === "external")
        return {
          id: c.id,
          platform: c.platform,
          game: c.gameName,
          status: "Không phải dữ liệu Tài Xỉu",
          valid: 0,
          rejected: (saved[c.id] || []).length,
          tested: 0,
          wins: 0,
          rate: null,
        };
      const original = saved[c.id] || [],
        normalized = original
          .map((h) =>
            h.provenance === "api-v2"
              ? h
              : h.raw
                ? normalizeResponse(h.raw, c, 0)
                : null,
          )
          .filter(Boolean),
        history = predictor.clean(normalized, c.gameType);
      const prediction = predictor.predict(history, c.gameType),
        bt = prediction.backtest;
      let status,
        latest = null;
      try {
        const r = await fetch(c.url, { signal: AbortSignal.timeout(10000) });
        if (!r.ok) throw Error("HTTP " + r.status);
        latest = normalizeResponse(await r.json(), c);
        if (!latest) throw Error("Thiếu kết quả/mã phiên hợp lệ");
        const age = latest.sourceAt ? Date.now() - latest.sourceAt : null;
        status =
          age !== null && (age > 180000 || age < -60000)
            ? "Dữ liệu cũ/thời gian sai"
            : age === null
              ? "Có kết quả; cần theo dõi đổi phiên"
              : "Có kết quả mới";
      } catch (e) {
        status = e.message;
      }
      return {
        id: c.id,
        platform: c.platform,
        game: c.gameName,
        status,
        latest: latest?.phien,
        sourceAt: latest?.sourceAt
          ? new Date(latest.sourceAt).toISOString()
          : null,
        valid: history.length,
        rejected: original.length - history.length,
        gaps: history.slice(1).filter((h, i) => !consecutive(history[i], h))
          .length,
        tested: bt.totalTested,
        wins: bt.won,
        losses: bt.lost,
        rate: bt.winRate,
        interval95: bt.interval95,
        baseline: bt.baselineWinRate,
        brier: bt.brier,
        signalTested: bt.signalTested,
        signalRate: bt.signalWinRate,
        abstain: prediction.abstain,
      };
    }),
  );
  const report = {
    generatedAt: new Date().toISOString(),
    method:
      "walk-forward-v2; 20 phiên khởi động; 5 phiên liên tiếp; chỉ chấm đúng phiên kế tiếp; cùng thuật toán với bot",
    source:
      "data/history_store.json trong commit; chỉ nhận phiên có raw API hợp lệ; probe API hiện tại dùng kiểm tra trạng thái, không trộn vào kiểm thử",
    rows,
  };
  const dir = path.join(__dirname, "..", "reports");
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(
    path.join(dir, "portal-audit.json"),
    JSON.stringify(report, null, 2) + "\n",
  );
  const rate = (v) => (v == null ? "Chưa có mẫu" : v + "%");
  const md = [
    "# Kiểm tra tỷ lệ từng cổng",
    "",
    "Thời điểm: " + report.generatedAt,
    "",
    report.method + ".",
    "",
    report.source + ".",
    "",
    "**Không có cam kết chính xác tuyệt đối.** Tỷ lệ dưới đây là kiểm thử lịch sử, không phải lợi nhuận hay xác suất chắc chắn cho phiên sau. Mẫu ít và khoảng mất phiên có thể làm kết quả thiếu ổn định.",
    "",
    "| Cổng | Trạng thái API | Phiên hợp lệ | Bỏ dữ liệu không kiểm chứng | Số lần kiểm thử | Đúng | Tỷ lệ | Khoảng 95% | Mốc đa số |",
    "|---|---|---:|---:|---:|---:|---:|---|---:|",
    ...rows.map(
      (r) =>
        "| " +
        r.platform +
        " · " +
        r.game +
        " | " +
        r.status +
        " | " +
        r.valid +
        " | " +
        r.rejected +
        " | " +
        r.tested +
        " | " +
        r.wins +
        " | " +
        rate(r.rate) +
        " | " +
        (r.interval95 ? r.interval95.join("–") + "%" : "—") +
        " | " +
        rate(r.baseline) +
        " |",
    ),
    "",
    "## Đọc kết quả",
    "",
    "- Một phiên chỉ được chấm nếu dự đoán được tính từ các phiên trước đó; phiên trùng, thiếu hoặc sai cấu trúc không được tự lấp.",
    "- Dữ liệu cũ từng có lịch sử mô phỏng và tỷ lệ bị ép lên. Các bộ đếm live cũ không được chuyển sang bộ máy mới.",
    "- Tỷ lệ ước lượng và tỷ lệ đúng quá khứ là hai đại lượng khác nhau. Bot chờ khi chưa có đủ bằng chứng; không tăng tiền sau chuỗi thua.",
    "- Sicbo bộ ba được tách thành BÃO. Tỷ lệ nhị phân có điều kiện không có bộ ba; khi chấm dự báo Tài/Xỉu, bộ ba được tính là sai.",
    "- Sexy V1/V2 được hiển thị trong menu Baccarat riêng. Không gán mã phiên giả cho chuỗi V2; không dùng recommended_bet của API làm tỷ lệ của bot.",
    "- Volta trả dự đoán bóng đá, đã loại khỏi mô hình TX. Báo cáo không xác minh tính ngẫu nhiên hay tính trung thực của nguồn ngoài.",
    "",
    "Chạy lại: npm run audit. Trạng thái API có thể thay đổi sau thời điểm trên.",
  ];
  fs.writeFileSync(path.join(dir, "portal-audit.md"), md.join("\n") + "\n");
  console.log(
    JSON.stringify(
      {
        generatedAt: report.generatedAt,
        portals: rows.length,
        newData: rows.filter((r) => r.status === "Có kết quả mới").length,
        rows: rows.map(({ id, status, tested, wins, rate }) => ({
          id,
          status,
          tested,
          wins,
          rate,
        })),
      },
      null,
      2,
    ),
  );
}
audit().catch((e) => {
  console.error(e.message);
  process.exitCode = 1;
});
