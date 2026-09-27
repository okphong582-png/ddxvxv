# HƯỚNG DẪN VÀ TÀI LIỆU HỆ THỐNG HOANGHA SKY - SOI CẦU TÀI XỈU AI & WEB DASHBOARD

Hệ thống bot Telegram kết hợp Web Dashboard soi cầu đa thuật toán thực chiến chuẩn phong cách Hoangha SKY kết nối hơn 25 cổng game (Sunwin, Hitclub, 789Club, B52, LC79, Rikvip, Betvip, Son789, Ta28, Luck8, Xocdia88...).

---

## 1. Thông Tin Admin Quản Trị Cấp Cao
- **Super Admin Duy Nhất**: ID Telegram `6482147126` (Hoangha)
- *Tài khoản này được phân quyền Super Admin vĩnh viễn, toàn quyền quản trị hệ thống và không cần nhập mã token.*

---

## 2. Các Lệnh Quản Trị Dành Riêng Cho Admin Trên Telegram
- `/updatecong`: Xem danh sách tất cả các cổng game, bấm chọn cổng và gửi link Cloudflare mới để cập nhật tức thì. Hoặc dùng cú pháp nhanh: `/updatecong <mã_cổng> <link_mới>`.
- `/baotri <nội dung>`: Đặt trạng thái bảo trì toàn hệ thống. Người dùng thông thường sẽ nhận được thông báo này và bị tạm khóa.
- `/tatbaotri`: Tắt bảo trì, mở lại cho người dùng truy cập bình thường.
- `/addadmin <id> [tên]`: Nâng quyền Admin cho một ID Telegram bất kỳ.
- `/deladmin <id>`: Chuyển một Admin thành Dân Thường (thu hồi quyền quản trị).
- `/chuyenquyen <id>`: Đảo chiều trạng thái 2 chiều: Admin ⇄ Dân Thường.

---

## 3. Bản Quyền & Cơ Chế Auto Kick-Out
- Khi người dùng mới vào bot, bot sẽ yêu cầu nhập Token và hiển thị liên hệ:
  - **Super Admin**: `Hoangha` (ID Telegram: `6482147126`)
- **Cơ chế Realtime Auth**: Mỗi lượt người dùng thao tác, bot kiểm tra trực tiếp Firebase:
  - Nếu mã Token bị Admin xóa trên web quản trị.
  - Hoặc mã Token hết hạn (1 ngày, 7 ngày, 30 ngày...).
  - 👉 **Người dùng lập tức bị out ngay (Kick-out)** và không thể tiếp tục soi cầu.

---

## 4. Trang Quản Trị Cấp Token Web
- Địa chỉ: `http://localhost:3000/admin.html`
- Kết nối Firebase Realtime Database: tạo mã token mới, xem mã nào đã kích hoạt (kèm Telegram ID & Tên người dùng), bật/tắt bảo trì hoặc xóa token.

---

## 5. Cơ Chế Chạy Tự Động 24/7 (GitHub Actions & Cloud)
- **Tự động chạy trên GitHub Actions:**
  - Hệ thống đã tích hợp sẵn workflow `.github/workflows/bot-247.yml`.
  - Khi push code lên GitHub, GitHub Actions sẽ tự động khởi động bot chạy 24/7.
  - Tự động xoay vòng phiên và dự phòng chạy lại định kỳ mỗi 4 giờ (`0 */4 * * *`).
  - *Lưu ý:* Khi tạo repo mới trên GitHub, hãy vào tab **Actions** và bấm **"I understand my workflows, go ahead and enable them"** (nếu GitHub hiển thị yêu cầu bật).
- **Tự động chạy trên Render / Railway:**
  - Đã có sẵn file `Procfile` (`web: npm start`) và `render.yaml`. Chỉ cần kết nối repo với Render là hệ thống tự build và chạy 24/7.
