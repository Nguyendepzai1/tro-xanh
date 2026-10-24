# Biên bản kiểm thử bản 1.3

Ngày: 24/10/2026. Môi trường Windows, Node.js 24.20.0, SQLite 3.53.4; kiểm thử tự động bằng node:test qua máy chủ HTTP và SQLite tạm riêng. Lệnh chạy: `node --test tests/*.test.mjs`.

**Kết quả: 97 bài đạt, 0 lỗi, 0 bỏ qua.** Bản ghi đầy đủ ở `test-output-v1.3.txt`.

| Nhóm | Số bài | Nội dung |
| --- | ---: | --- |
| Cơ sở | 22 | Xác thực, quyền, tin phòng, liên hệ, hợp đồng, hóa đơn |
| Hồi quy | 20 | Kiểu dữ liệu, CSRF, ngày giờ, riêng tư, dữ liệu cũ |
| Mở rộng | 27 | Minh chứng, hồ sơ, chat, cọc, tiền thuê, hoa hồng |
| Biên giao dịch | 8 | Giữ chỗ, hoàn tiền, gửi lại, tài khoản bị khóa |
| Cộng đồng và địa chỉ | 20 | So sánh, đánh giá, báo cáo, 34 tỉnh và 3.321 đơn vị cấp xã |

Các ca mới kiểm tra giới hạn 2–3 phòng không trùng, loại tin không công khai/đã thuê, không lộ ghi chú nội bộ; chỉ người có hợp đồng đã bắt đầu được đánh giá, chặn đánh giá trùng đồng thời, số sao sai kiểu và đọc chéo; công khai cả đánh giá ít sao; báo cáo riêng tư, giới hạn gửi, quyết định nhất quán và xử lý đồng thời. Đọc lại database xác nhận schema v4, toàn vẹn SQLite và khóa ngoại.

## Kiểm thử trên trình duyệt

Thực hiện ghi dữ liệu tại máy chủ kiểm thử riêng cổng 3531; dữ liệu chính cổng 3530 chỉ dùng để xem và kiểm tra bộ lọc.

| Thao tác | Quan sát |
| --- | --- |
| Mở tìm kiếm chưa chọn tỉnh | Có đủ 34 tỉnh/thành, khu vực yêu cầu chọn tỉnh trước |
| Chọn Cà Mau, gõ `dat mui` | Danh sách rút đúng còn Xã Đất Mũi |
| Tìm Cà Mau + Xã Đất Mũi | Giữ lựa chọn qua URL, báo 0 kết quả với dữ liệu mẫu hiện có |
| Mở URL TP. Hồ Chí Minh + Bình Thạnh | Chọn đúng tỉnh mới và khu vực cũ; trả đúng phòng mẫu |
| Đổi Cà Mau sang Cao Bằng trong đăng tin | Không giữ Xã Đất Mũi; trả phường/xã thuộc Cao Bằng |
| Gõ tìm nhanh khi khu vực đã chọn vẫn khớp | Giữ Xã Đất Mũi, bộ đếm hiện 1 khu vực phù hợp |
| Chọn 2 phòng và tính 100 kWh, 4 m³, 50.000đ dịch vụ | Phòng 2.800.000đ: tháng 3.260.000đ, tháng đầu gồm cọc 6.060.000đ |
| Người thuê gửi đánh giá 2 sao cho hợp đồng đã bắt đầu | Một bản chờ duyệt, hợp đồng không còn trong danh sách gửi mới |
| Admin công khai với ghi chú | Hồ sơ chủ trọ hiện 2/5 từ một đánh giá, không lộ ghi chú nội bộ |
| Gửi báo cáo tin, admin xử lý kèm ẩn tin | Báo cáo chuyển Đã xử lý, không còn nút xử lý lại; tin bị ẩn |
| Kiểm tra bộ lọc tại 390 × 844 px | Bố cục một cột, chiều rộng nội dung không vượt khung nhìn |
| Thanh điều hướng tại 390 px | Liên kết trên một dòng có thể cuộn ngang; trạng thái trang hiện tại rõ ràng |
| Log trình duyệt trong luồng mới | Không ghi nhận lỗi hoặc cảnh báo JavaScript |

Ảnh kiểm tra: `search-v1.3.png`, `compare-v1.3.png`, `search-mobile-v1.3.png`. Các minh chứng, đánh giá và báo cáo thử chỉ là dữ liệu minh họa.

## Giới hạn

Chưa đo tải lớn, chưa thử mọi trình duyệt hoặc điện thoại vật lý, chưa kiểm thử cổng thanh toán thật. 97 bài đạt không có nghĩa mọi tình huống đều đã được kiểm chứng. Thanh toán vẫn là mô phỏng. Danh mục hành chính cần cập nhật khi có thay đổi mới.
