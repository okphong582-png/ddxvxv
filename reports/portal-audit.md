# Kiểm tra tỷ lệ từng cổng

Thời điểm: 2026-09-28T06:37:28.711Z

walk-forward-v2; 20 phiên khởi động; 5 phiên liên tiếp; chỉ chấm đúng phiên kế tiếp; cùng thuật toán với bot.

data/history_store.json trong commit; chỉ nhận phiên có raw API hợp lệ; probe API hiện tại dùng kiểm tra trạng thái, không trộn vào kiểm thử.

**Không có cam kết chính xác tuyệt đối.** Tỷ lệ dưới đây là kiểm thử lịch sử, không phải lợi nhuận hay xác suất chắc chắn cho phiên sau. Mẫu ít và khoảng mất phiên có thể làm kết quả thiếu ổn định.

| Cổng | Trạng thái API | Phiên hợp lệ | Bỏ dữ liệu không kiểm chứng | Số lần kiểm thử | Đúng | Tỷ lệ | Khoảng 95% | Mốc đa số |
|---|---|---:|---:|---:|---:|---:|---|---:|
| 68GB · Bàn Xanh · Tài Xỉu | Có kết quả mới | 0 | 0 | 0 | 0 | Chưa có mẫu | — | Chưa có mẫu |
| 68GB · Bàn Đỏ · MD5 | Dữ liệu cũ/thời gian sai | 0 | 0 | 0 | 0 | Chưa có mẫu | — | Chưa có mẫu |
| Sunwin · Tài Xỉu Thường | Có kết quả mới | 87 | 13 | 39 | 19 | 48.7% | 33.9–63.8% | 48.7% |
| Sunwin · Xóc Đĩa Live | Dữ liệu cũ/thời gian sai | 1 | 42 | 0 | 0 | Chưa có mẫu | — | Chưa có mẫu |
| Sunwin · Sicbo | HTTP 500 | 100 | 0 | 57 | 32 | 56.1% | 43.3–68.2% | 56.1% |
| Hitclub / Go88 · Tài Xỉu Thường | Có kết quả mới | 100 | 0 | 68 | 37 | 54.4% | 42.7–65.7% | 58.8% |
| Hitclub / Go88 · Tài Xỉu MD5 | Có kết quả mới | 100 | 0 | 70 | 37 | 52.9% | 41.3–64.1% | 54.3% |
| Hitclub / Go88 · Sicbo | Có kết quả mới | 100 | 0 | 58 | 28 | 48.3% | 35.9–60.8% | 53.4% |
| 789Club · Tài Xỉu Thường | Có kết quả mới | 100 | 0 | 67 | 34 | 50.7% | 39.1–62.3% | 53.7% |
| 789Club · Xóc Đĩa Live | Có kết quả mới | 100 | 0 | 67 | 29 | 43.3% | 32.1–55.2% | 46.3% |
| 789Club · Sicbo | Có kết quả mới | 100 | 0 | 56 | 28 | 50% | 37.3–62.7% | 41.1% |
| B52 · Tài Xỉu Thường | Có kết quả mới | 100 | 0 | 66 | 34 | 51.5% | 39.7–63.2% | 47% |
| B52 · Tài Xỉu MD5 | Có kết quả; cần theo dõi đổi phiên | 100 | 0 | 68 | 31 | 45.6% | 34.3–57.3% | 48.5% |
| B52 · Sicbo | HTTP 500 | 100 | 0 | 57 | 29 | 50.9% | 38.3–63.4% | 49.1% |
| Rikvip · Tài Xỉu Thường | Có kết quả mới | 100 | 0 | 44 | 24 | 54.5% | 40.1–68.3% | 38.6% |
| Rikvip · Tài Xỉu MD5 | Có kết quả mới | 100 | 0 | 51 | 21 | 41.2% | 28.8–54.8% | 41.2% |
| LC79 · Tài Xỉu Thường | Có kết quả mới | 100 | 0 | 62 | 31 | 50% | 37.9–62.1% | 50% |
| LC79 · Tài Xỉu MD5 | Có kết quả mới | 100 | 0 | 67 | 33 | 49.3% | 37.7–60.9% | 47.8% |
| LC79 · Xóc Đĩa MD5 | Có kết quả mới | 100 | 0 | 67 | 33 | 49.3% | 37.7–60.9% | 56.7% |
| Betvip · Tài Xỉu Thường | Có kết quả mới | 100 | 0 | 67 | 39 | 58.2% | 46.3–69.3% | 61.2% |
| Betvip · Tài Xỉu MD5 | Có kết quả mới | 100 | 0 | 80 | 44 | 55% | 44.1–65.4% | 53.8% |
| Son789 · Tài Xỉu Thường | Có kết quả mới | 100 | 0 | 68 | 32 | 47.1% | 35.7–58.8% | 45.6% |
| Son789 · Tài Xỉu MD5 | Có kết quả mới | 100 | 0 | 68 | 32 | 47.1% | 35.7–58.8% | 47.1% |
| Ta28 · Tài Xỉu Thường | Có kết quả mới | 100 | 0 | 68 | 35 | 51.5% | 39.8–62.9% | 52.9% |
| Ta28 · Tài Xỉu MD5 | Có kết quả mới | 100 | 0 | 68 | 34 | 50% | 38.4–61.6% | 51.5% |
| Luck8 · Tài Xỉu MD5 | The operation was aborted due to timeout | 100 | 0 | 64 | 32 | 50% | 38.1–61.9% | 48.4% |
| Luck8 · Sicbo 40 Giây | The operation was aborted due to timeout | 100 | 0 | 68 | 33 | 48.5% | 37.1–60.2% | 50% |
| Xocdia88 · Tài Xỉu MD5 | Có kết quả mới | 100 | 0 | 67 | 30 | 44.8% | 33.5–56.6% | 50.7% |
| OGKFAN · Tài Xỉu MD5 | Thiếu kết quả/mã phiên hợp lệ | 76 | 24 | 21 | 7 | 33.3% | 17.2–54.6% | 33.3% |
| Iwin · Tài Xỉu Thường | Có kết quả mới | 100 | 0 | 18 | 13 | 72.2% | 49.1–87.5% | 72.2% |
| Iwin · Tài Xỉu MD5 | Có kết quả mới | 100 | 0 | 69 | 41 | 59.4% | 47.6–70.2% | 59.4% |
| Max789 · Tài Xỉu Thường | Có kết quả mới | 100 | 0 | 68 | 33 | 48.5% | 37.1–60.2% | 47.1% |
| Max789 · Tài Xỉu MD5 | Có kết quả; cần theo dõi đổi phiên | 100 | 0 | 67 | 37 | 55.2% | 43.4–66.5% | 53.7% |
| Volta Sunwin & 789Club · Volta bóng đá · không phải TX | Không phải dữ liệu Tài Xỉu | 0 | 100 | 0 | 0 | Chưa có mẫu | — | Chưa có mẫu |

## Đọc kết quả

- Một phiên chỉ được chấm nếu dự đoán được tính từ các phiên trước đó; phiên trùng, thiếu hoặc sai cấu trúc không được tự lấp.
- Dữ liệu cũ từng có lịch sử mô phỏng và tỷ lệ bị ép lên. Các bộ đếm live cũ không được chuyển sang bộ máy mới.
- Tỷ lệ ước lượng và tỷ lệ đúng quá khứ là hai đại lượng khác nhau. Bot chờ khi chưa có đủ bằng chứng; không tăng tiền sau chuỗi thua.
- Sicbo bộ ba được tách thành BÃO. Tỷ lệ nhị phân có điều kiện không có bộ ba; khi chấm dự báo Tài/Xỉu, bộ ba được tính là sai.
- Sexy V1/V2 được hiển thị trong menu Baccarat riêng. Không gán mã phiên giả cho chuỗi V2; không dùng recommended_bet của API làm tỷ lệ của bot.
- Volta trả dự đoán bóng đá, đã loại khỏi mô hình TX. Báo cáo không xác minh tính ngẫu nhiên hay tính trung thực của nguồn ngoài.

Chạy lại: npm run audit. Trạng thái API có thể thay đổi sau thời điểm trên.
