# Trọ Xanh 1.3

## Các nâng cấp đã thực hiện

Tìm kiếm mở ra toàn quốc, không phụ thuộc nơi đã có tin. Danh mục địa chỉ được lưu trong mã nguồn; xem DIA-CHI-VIET-NAM.md. Các tin cũ vẫn tìm được theo khu vực đã lưu.

Chọn “So sánh phòng” dưới 2 hoặc 3 thẻ phòng, mở bảng so sánh để xem giá thuê, cọc, diện tích, tiện ích, điện, nước và chủ trọ. Nhập lượng sử dụng dự kiến để tính tổng tháng và tháng đầu gồm cọc. Phí dịch vụ là khoản ước tính chung do người dùng nhập, cần hỏi lại từng chủ trọ. Phòng không còn công khai hoặc đang giữ chỗ bị loại khi tải bảng.

Người tìm phòng vào Quản lý → Đánh giá phòng thuê. Chỉ hợp đồng gắn đúng tài khoản và đã đến ngày bắt đầu mới đủ điều kiện. Một hợp đồng gửi một đánh giá, từ 1 đến 5 sao, nội dung 20–2.000 ký tự. Nội dung chờ quản trị viên duyệt. Không có tính năng sửa/gửi lại đánh giá đã gửi trong bản này. Điểm công khai chỉ tính đánh giá đã duyệt của tài khoản đang hoạt động.

Trong chi tiết phòng, chọn “Báo cáo thông tin tin phòng”. Sau đăng nhập có thể chọn thông tin sai, dấu hiệu lừa đảo, hết phòng hoặc nội dung không phù hợp. Báo cáo chỉ người gửi và quản trị viên đọc được. Một báo cáo mở cho mỗi người/tin và tối đa 10 báo cáo trong 24 giờ. Báo cáo không tự làm ẩn tin. Quản trị viên ghi quyết định và chọn có ẩn tin khi xử lý hay không.

## Kiểm thử

Lệnh: node --test tests/*.test.mjs . Kết quả: 97/97 đạt (22 cơ sở, 20 hồi quy, 27 mở rộng, 8 biên, 20 cộng đồng và địa chỉ). Bản ghi: test-output-v1.3.txt. Các ca chạy HTTP thật trên database tạm, kiểm tra quyền, dữ liệu sai, thao tác trùng/đồng thời và toàn vẹn SQLite. Xem thêm KIEM-THU-1.3.md cho quan sát giao diện.

## Hướng phát triển tiếp

Ưu tiên xác minh email, phục hồi/đổi mật khẩu và xác nhận hợp đồng từ hai phía. Sau đó thử cổng thanh toán sandbox với chữ ký thông báo và chống xử lý lặp; chỉ đưa tiền thật vào sau khi thống nhất phương án với đối tác thanh toán. Cần thử tải, nhiều trình duyệt và thiết bị thật trước vận hành công khai. Các mục này là kế hoạch, chưa triển khai.
