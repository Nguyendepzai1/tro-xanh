# Trọ Xanh 1.2 — Chat, xác minh và giao dịch thử nghiệm

Đã kiểm thử 77/77 bài tự động. Xem kết quả trong `test-output-v1.2.txt`. Ngày cập nhật báo cáo: 24/10/2026.

## Chức năng dùng được

- Chat hai chiều theo từng phòng; tự lấy tin mới khoảng 3 giây, mốc đã đọc, lịch sử chia trang 100 tin, chặn gửi lặp bằng mã gửi và giới hạn 30 tin/phút.
- Hồ sơ công khai của chủ trọ với giới thiệu, khu vực, nhãn mức xét duyệt và phòng còn trống. Mở từ tên chủ trọ ở chi tiết phòng.
- Minh chứng quyền cho thuê được tải riêng dưới dạng JPEG/PNG tối đa 2 MB, lưu trong SQLite. Chỉ chủ tệp và admin đọc được. Quản trị viên ghi kết quả đối chiếu rồi cấp quyền. Tài khoản cũ được giữ quyền cũ, không tự nhận nhãn minh chứng đã xét duyệt; cần bổ sung trước khi tạo đề nghị nhận cọc.
- Tìm kiếm: vị trí chọn từ dữ liệu công khai, giá nhanh, nhiều tiện ích cùng lúc, bỏ từng bộ lọc, sắp xếp và phân trang gọn; hỗ trợ không dấu.
- Sổ mô phỏng tiền cọc, tiền thuê tháng, hoàn toàn bộ và phí thành công. **Không kết nối ngân hàng/ví, không chuyển tiền thật, không phải tài khoản ký quỹ.**

## Mô hình hoa hồng đã chọn

Chủ trọ trả **một lần khi thuê thành công**, mặc định đề xuất 5% tiền thuê tháng đầu. Phí không trừ vào tiền cọc. Tiền thuê hằng tháng không tạo thêm hoa hồng.

Ví dụ: tiền thuê 3 triệu/tháng, cọc 3 triệu → phí chủ trọ một lần 150.000đ; cọc vẫn ghi đủ 3 triệu. Quản trị viên có thể cấu hình 0–20%; đề nghị đã gửi giữ tỷ lệ đã chốt. Mức mặc định là cấu hình cho đồ án, không phải mức phí thị trường được chứng minh tối ưu.

## Thử toàn bộ quy trình

1. Chủ trọ đăng nhập, mở **Dành cho chủ trọ**, gửi minh chứng giả lập để thử. Không cần dùng giấy tờ cá nhân thật khi trình diễn.
2. Admin mở **Xác minh chủ trọ**, xem ảnh riêng, đối chiếu và nhập ghi chú, xác nhận đã kiểm tra, rồi duyệt. Hồ sơ cũ chỉ có lời nhắn chưa đủ điều kiện để duyệt quyền mới.
3. Chủ trọ mở **Hồ sơ chủ trọ** để cập nhật giới thiệu. Tin phòng được tạo và duyệt như trước.
4. Người tìm phòng mở một phòng → **Trò chuyện với chủ trọ**. Hai bên trao đổi và hẹn xem phòng. Hộp thư nằm trong tài khoản.
5. Chủ đã có minh chứng duyệt mở cuộc trò chuyện → **Gửi đề nghị đặt cọc**. Giá và cọc lấy từ tin; đọc phí hiển thị rồi điền điều kiện cọc, hoàn cọc và đồng ý mức phí.
6. Khách mở **Đặt cọc · Thanh toán**, đọc đề nghị và đồng ý, sau đó tạo giao dịch cọc thử nghiệm. Bấm lại trả về cùng giao dịch chờ.
7. Admin mở **Giao dịch thử nghiệm**, ghi nhận mô phỏng với ghi chú. Đề nghị chuyển sang đã ghi cọc; chưa phát sinh phí.
8. Chủ lập hợp đồng đúng email khách đã đăng ký, đúng phòng, giá thuê và cọc đã chốt. Khách xác nhận đã ký và nhận phòng trong đề nghị. Lúc này phát sinh một khoản phí chủ trọ, xem trong **Phí thành công/Hoa hồng**.
9. Chủ lập hóa đơn; khách tạo giao dịch thử nghiệm cho hóa đơn; admin đối soát mô phỏng. Hóa đơn đổi thành đã thu, không tạo phí thành công mới.

## Hủy, hết hạn và hoàn tiền

- Hai bên có thể hủy đề nghị chưa ghi cọc. Đề nghị chưa thu tự hủy sau 24 giờ kể từ lúc tạo, giải phóng giữ chỗ; không tự hủy cọc đã ghi nhận.
- Khách có thể hủy giao dịch `pending`, sau đó tạo lại hoặc trả trực tiếp để chủ ghi thu thủ công. Chủ không ghi thu trực tiếp khi hóa đơn đang có giao dịch chờ.
- Admin mô phỏng hoàn **toàn bộ** cọc trước hợp đồng: payment và deal cùng đổi thành `refunded`, chưa tạo hoa hồng.
- Admin mô phỏng hoàn hóa đơn đã thu: payment thành `refunded`, hóa đơn trở lại `unpaid`, giữ lịch sử và cho phép giao dịch mới.
- Hoàn cọc khi đã có hợp đồng/nhận phòng, hoàn một phần, tranh chấp và hoàn phí thành công chưa có luồng xử lý. Không thử coi đây là giao dịch thật.

## Tính nhất quán và riêng tư

- Mọi số tiền lấy từ máy chủ, dùng số nguyên VNĐ. Không tin `amount`, giá hay tỷ lệ phí do trình duyệt tự gửi.
- Transaction và UNIQUE chặn giữ chỗ đồng thời, payment đang hiệu lực trùng và hoa hồng trùng hợp đồng.
- Chỉ hai bên xem tin nhắn. Admin không mặc nhiên được đọc hội thoại riêng.
- Khi khóa tài khoản, phiên hết hiệu lực và chủ biến mất khỏi hồ sơ/tìm kiếm công khai. Bên còn lại chỉ đọc lịch sử chat.
- Ảnh minh chứng nằm trong database và bản sao lưu. Không chia sẻ bản sao lưu chứa minh chứng cá nhân ra công khai.
- Nhãn xét duyệt thể hiện kiểm tra thủ công hồ sơ, không bảo đảm quyền sở hữu pháp lý hoặc chất lượng phòng.

## Database và sao lưu

Schema phiên bản 3 tự tạo thêm 9 bảng trong `upgrade.sql`. Không xóa bảng lõi hoặc dữ liệu cũ. DB Browser for SQLite tiếp tục mở được `data/tro-xanh.db`.

Chạy `node backup.mjs` trước khi nâng cấp. Database sao lưu bao gồm tin nhắn và tệp minh chứng BLOB; thư mục `uploads` chứa ảnh phòng công khai. Khi khôi phục cần dừng server và dùng một bộ sao lưu nhất quán như README.

## Trước khi thanh toán thật

Đề xuất thử **MoMo sandbox** ở bước tích hợp sau: có môi trường Test riêng và quy trình xác thực hồ sơ doanh nghiệp trước Production. Bản 1.2 chưa tích hợp sandbox hay nhận credential. Đăng ký nhà cung cấp, thống nhất mô hình nhận/chuyển tiền cho chủ trọ, phí cổng, hoàn tiền và các nghĩa vụ liên quan trước khi triển khai thật; tài liệu API không tự chứng minh mọi mô hình thu hộ được chấp nhận.

Nguồn chính thức:

- [Merchant Profile](https://developers.momo.vn/v3/docs/payment/onboarding/merchant-profile/)
- [Integration Procedures](https://developers.momo.vn/v3/docs/payment/onboarding/integration-process/)
- [Payment Notification](https://developers.momo.vn/v3/docs/payment/api/result-handling/notification/) yêu cầu kiểm chữ ký IPN và đối chiếu PartnerCode, OrderId, Amount. Không tin riêng trang redirect.

## Kiểm thử đã thực hiện và giới hạn

77 bài: 22 cơ sở, 20 hồi quy, 27 mở rộng, 8 biên. Bao gồm đăng ký mới không tự cấp quyền; minh chứng riêng; hồ sơ bị khóa; CSRF; chat hai chiều, chống lặp, 205 tin phân trang, giới hạn spam; giữ chỗ đồng thời; phí chốt; đối soát, hủy, hoàn và hóa đơn; migration và toàn vẹn dữ liệu.

Trình duyệt đã thử quy trình chat–cọc–hợp đồng–nhận phòng–hóa đơn–đối soát và tải/duyệt minh chứng giả lập. Kiểm tra bố cục ở kích thước desktop và khung nhìn 390px. Chưa kiểm thử cổng thật, điện thoại vật lý, tải lớn hay đánh giá xâm nhập chuyên sâu. Số bài đạt không đồng nghĩa đã bao phủ mọi tình huống thực tế.
