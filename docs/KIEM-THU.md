# Biên bản kiểm thử Trọ Xanh phiên bản 1.1

Ngày thực hiện: 23/10/2026, múi giờ Việt Nam UTC+7.

## Kết quả tự động

**42/42 bài kiểm thử đạt, 0 lỗi, 0 bỏ qua.** Bản ghi cuối cùng trong `test-output.txt`. Chạy lại bằng:

```powershell
node --test --test-reporter=spec tests/*.test.mjs
```

Môi trường: Windows, Node.js 24.19.0, SQLite 3.53.3. Máy chủ HTTP thật lắng nghe cổng tạm; database và ảnh thử nằm trong thư mục tạm riêng, không sửa database vận hành.

| Mã | Nội dung | Kết quả |
| --- | --- | --- |
| 01 | Khách xem tin công khai và trang web; có CSP | Đạt |
| 02 | Mật khẩu băm scrypt; đối chiếu đúng/sai | Đạt |
| 03 | Đăng nhập sai; chặn CSRF và Origin không hợp lệ | Đạt |
| 04 | Đăng nhập chủ trọ, chủ chờ duyệt, người tìm phòng, quản trị | Đạt |
| 05 | Chặn khách, người tìm phòng, chủ chưa duyệt đăng tin | Đạt |
| 06 | Chặn yêu cầu cấp quyền trùng; từ chối rồi gửi lại | Đạt |
| 07 | Duyệt cấp quyền; chặn xử lý trùng | Đạt |
| 08 | Tin mới chờ duyệt; khách không xem được | Đạt |
| 09 | Chặn sửa chéo dữ liệu, giá âm, URL ảnh không hợp lệ | Đạt |
| 10 | Duyệt tin, lọc giá/tiện ích; truy vấn SQL injection không vượt điều kiện | Đạt |
| 11 | Lưu và bỏ lưu, không trùng, đúng vai trò | Đạt |
| 12 | Chặn lịch quá khứ; gửi và xác nhận lịch xem theo đúng chủ tin | Đạt |
| 13 | Sửa tin về pending; giữ ảnh mẫu hợp lệ | Đạt |
| 14 | Ngày hợp lệ; chặn thuê trùng; phòng đang thuê ngừng nhận liên hệ | Đạt |
| 15 | Hóa đơn đúng 3.510.000 đ; chặn trùng, sai kỳ, tiêu thụ âm, thu chéo | Đạt |
| 16 | Ghi thu một lần; người thuê thấy trạng thái | Đạt |
| 17 | Kết thúc thuê làm phòng trống; giữ hóa đơn lịch sử | Đạt |
| 18 | Khóa chủ hủy phiên, ẩn tin; không khóa quản trị viên | Đạt |
| 19 | Chặn tự đăng ký admin, mật khẩu ngắn, email trùng | Đạt |
| 20 | Tải/đọc PNG hợp lệ; chặn ảnh giả và file máy chủ | Đạt |
| 21 | Mở lại database giữ dữ liệu; integrity_check và foreign_key_check đạt | Đạt |
| 22 | Đăng xuất hủy phiên | Đạt |

## Kiểm tra giao diện thực tế

- Trang chủ và ảnh phòng hiển thị trong trình duyệt, chiều rộng khoảng 1133 px.
- Lọc Đà Nẵng và giá tối đa 3 triệu: 2 phòng phù hợp trước khi tạo hợp đồng mẫu.
- Người tìm phòng đăng nhập, lưu phòng số 4 và gửi lời nhắn.
- Chủ trọ nhận được yêu cầu và chuyển thành “Đã xác nhận”.
- Tạo hợp đồng mẫu phòng số 4, ngày 01/10/2026 đến 01/10/2027, gắn email người tìm phòng mẫu.
- Lập hóa đơn tháng 10/2026: thuê 1.800.000 + điện 100 × 3.500 + nước 4 × 15.000 + dịch vụ 100.000 = **2.310.000 đ**. Kết quả khớp.
- Mở trang yêu cầu cấp quyền của quản trị viên và hộp ghi chú quyết định.
- Không có error/warn trong log trình duyệt của các luồng vừa thực hiện.
- Tài khoản chủ trọ chờ duyệt được giữ nguyên để người dùng tự trình diễn.
- Đã chạy `node backup.mjs` thành công, tạo bản sao lưu database và thư mục ảnh.
- Đã khởi động bằng `START.bat` với database kiểm tra riêng trên cổng 3531; HTTP đọc được 6 phòng mẫu. Node.js cài trên máy dùng cho lần thử launcher là 24.20.0.
- Đã sửa khoảng cách lề trang quản lý, kiểm tra lại ảnh hóa đơn, bổ sung nhãn sắp xếp và hiển thị các mốc thời gian theo UTC+7.

Ảnh minh chứng nằm cạnh biên bản. Dữ liệu từ kiểm tra giao diện là dữ liệu giả và được giữ trong database mẫu để minh họa.

## Giới hạn

Chưa kiểm thử tải, xâm nhập, điện thoại thật hoặc nhiều trình duyệt. CSS responsive đã có; cần kiểm tra trực quan tiếp trên các kích thước nhỏ. Bộ kiểm thử xác minh các tình huống nêu trên, không chứng minh ứng dụng không còn mọi lỗi. Bản local chưa có xác minh email, quên/đổi mật khẩu, ngân hàng, SMS/email tự động hoặc ký điện tử.

## Kiểm tra báo cáo

Báo cáo Word được dựng từ bản sao mẫu, giữ kiểu chữ và khổ trang, thay nội dung bằng đề tài Trọ Xanh. Bản mẫu không bị sửa. Xuất PDF bằng Microsoft Word và tạo ảnh từng trang bằng Poppler để rà bố cục. Các thông tin học phần và sinh viên chưa được cung cấp để dạng trường điền trên bìa.

## Đợt kiểm thử bổ sung

22 bài cơ sở ở trên và 20 bài R01–R20 đều đạt. Xem `KIEM-THU-BO-SUNG.md` để biết lỗi tái hiện, kết quả trước và sau khi sửa. Word cập nhật có 60 trang, thêm 14 sơ đồ hoạt động và 14 sơ đồ tuần tự cho 14 nghiệp vụ.
