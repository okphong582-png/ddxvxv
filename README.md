# HOANGHA SKY · Theo dõi TX và kiểm thử thống kê

Bot Telegram và dashboard đọc dữ liệu riêng cho từng cổng. Bản này loại bỏ lịch sử ngẫu nhiên, tỷ lệ thắng bị ép lên và xúc xắc tự tạo. Không cam kết dự đoán chính xác tuyệt đối, giải mã MD5 hoặc thắng tiền.

## Đã thay đổi

- 33 cổng TX/Sicbo/Xóc Đĩa, bao gồm 68GB bàn xanh và bàn đỏ. Chỉ nhận mã phiên và kết quả hợp lệ; giữ dữ liệu từng cổng tách biệt.
- Sexy V1 và V2 có menu Baccarat riêng. V2 thiếu mã phiên/shoe, nên chỉ thống kê chuỗi nguồn hiện tại. V1 đang trả dữ liệu chờ cũng không được xem là kết quả. Volta là nguồn bóng đá, tách khỏi mô hình TX.
- Mô hình thống kê kết hợp mốc 50/50, tần suất Bayesian, Markov bậc 1/2; trọng số thích nghi theo sai số của các dự báo trước đó. Không dùng giả thuyết “bệt dài chắc chắn phải đảo”.
- Kiểm thử walk-forward dùng cùng thuật toán với dự báo, chỉ nhìn dữ liệu trước phiên được chấm. Bỏ các khoảng mất phiên. Có số mẫu, tỷ lệ đúng thật, khoảng Wilson 95%, Brier score và mốc dự báo theo đa số.
- Tỷ lệ kiểm thử lịch sử và tỷ lệ đối chiếu trực tiếp được hiển thị riêng. Bộ đếm live cũ không được kế thừa vì từng chứa tỷ lệ không trung thực.
- Chờ thêm dữ liệu khi chưa có 20 phiên hợp lệ, 5 phiên cuối liên tiếp, ít nhất 30 dự báo kiểm thử hoặc cận dưới khoảng 95% chưa vượt 50%. Đây là bộ lọc tham khảo, không phải chứng minh khả năng sinh lời.
- Nguồn quá 3 phút, phiên lùi, phiên bị sửa kết quả hoặc lỗi API không được trình bày là tín hiệu mới. API không có thời gian được kiểm tra bằng việc mã phiên có tiếp tục thay đổi hay không.

## Menu Telegram

Dùng /start để mở menu. Các nút tách Tài Xỉu thường, MD5, Sicbo, Xóc Đĩa, tỷ lệ từng cổng, lịch sử và nguồn ngoài. Danh sách có phân trang, trạng thái kết nối và nút về trang chủ.

Admin: mở **Gửi thông báo** hoặc gửi /broadcast nội_dung, kiểm tra bản xem trước rồi bấm **Gửi thông báo**. Bản nháp hết hạn sau 10 phút. Chỉ admin sở hữu bản nháp có thể xác nhận; nút xác nhận không thể gửi lặp lại một đợt. Mục **Tiến độ gửi** cho phép xem hoặc dừng.

- Gửi tới người từng nhắn bot và các tài khoản đã có trong cơ sở dữ liệu người dùng. Telegram không cho bot tự mở hội thoại với người chưa dùng bot.
- Gửi văn bản tối đa 3.500 ký tự, khoảng 10 tin/giây, chờ theo retry_after khi gặp 429; đánh dấu người đã chặn bot khi gặp 403.
- /stop dừng thông báo; /nhanthongbao bật lại. /cancel hủy thao tác đang soạn.
- Nếu mất kết nối đúng lúc gửi, trạng thái được báo là “chưa rõ”, không tự gửi lại mù quáng. Sau khi khởi động lại, hàng đợi tiếp tục từ vị trí đã lưu. Vì Telegram không hỗ trợ khóa chống trùng cho sendMessage, không thể bảo đảm vừa không trùng vừa không bỏ sót khi mạng đứt đúng thời điểm.
- Thông báo phiên tự động hiện theo Sunwin; quyền truy cập được kiểm tra lại trước khi gửi.

Các chức năng token, quản lý admin, cập nhật link và gia hạn vẫn có. Chủ bot được cấu hình bởi ADMIN_IDS. Cập nhật API qua Telegram bằng /updatecong; URL phải là HTTPS thuộc trycloudflare.com. Giao diện web sửa cấu hình cần ADMIN_API_KEY; có thể dùng Telegram thay cho web.

## Chạy và kiểm thử

Yêu cầu Node.js 22 trở lên.

    npm ci
    npm test
    npm run audit
    node --env-file=.env runner-247.js

Sao chép .env.example thành .env và điền biến môi trường trước khi chạy. Mọi dữ liệu đang hoạt động nằm ở data/runtime hoặc DATA_DIR. Không commit thư mục này.

Báo cáo tái tạo được: [reports/portal-audit.md](reports/portal-audit.md) và bản máy đọc [reports/portal-audit.json](reports/portal-audit.json). Báo cáo dùng dữ liệu lịch sử có raw API trong repo, không coi dữ liệu mô phỏng cũ là mẫu thật. Trạng thái API chỉ đúng tại thời điểm kiểm tra.

## GitHub Actions và khôi phục

Workflow bot-247.yml chạy khi push main, gọi thủ công hoặc lịch dự phòng mỗi 4 giờ. Quy trình: npm ci → kiểm thử → kiểm tra Secrets/getMe → khôi phục trạng thái → chạy supervisor. Chỉ một workflow cùng nhóm được chạy tại một thời điểm. Bản push mới thay thế bản cũ.

Repository Secrets cần có:

- TELEGRAM_BOT_TOKEN: token bot.
- STATE_ENCRYPTION_KEY: khóa ngẫu nhiên 32 byte viết thành 64 ký tự hex, cần giữ ổn định để giải mã trạng thái.
- DOITHEVIP_PARTNER_ID, DOITHEVIP_PARTNER_KEY, DOITHEVIP_WALLET: nếu dùng nạp thẻ.

Supervisor chạy lại server khi tiến trình thoát, tăng khoảng chờ tối đa 30 giây; healthcheck lỗi ba lần cũng khởi động lại. Sau khoảng 4 giờ 50 phút, tiến trình dừng, lưu cache đã mã hóa AES-256-GCM và yêu cầu lượt tiếp theo. Tài khoản người dùng, nội dung thông báo và khóa bí mật không được upload dưới dạng văn bản rõ. Hủy workflow thủ công không tự yêu cầu chạy lại ngay; lịch dự phòng vẫn có thể chạy sau đó. Muốn dừng hẳn, disable workflow.

GitHub Actions **không bảo đảm chạy liên tục không gián đoạn**: runner có giới hạn 6 giờ/job, lịch có thể trễ, cache có thể bị loại bỏ, repo công khai không hoạt động 60 ngày có thể bị tắt lịch. Mất máy đột ngột trước bước sao lưu có thể mất phần trạng thái chưa được chuyển đi. Muốn vận hành lâu dài ổn định hơn, dùng máy chủ có đĩa bền vững và process manager; không chạy hai nơi bằng cùng token Telegram.

Tài liệu: [Giới hạn Actions](https://docs.github.com/en/actions/reference/limits), [Lịch workflow](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule), [Giới hạn gửi Telegram](https://core.telegram.org/bots/faq#my-bot-is-hitting-limits-how-do-i-avoid-this).

Token bot và khóa đối tác từng được nhúng trong lịch sử Git cũ. Bản mới dùng biến môi trường/Secrets, nhưng việc bỏ khỏi mã hiện tại không thu hồi khóa đã công khai. Chủ bot nên đổi token qua BotFather và đổi khóa đối tác rồi cập nhật Secrets.
