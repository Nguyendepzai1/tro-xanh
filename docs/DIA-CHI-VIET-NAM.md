# Danh mục địa chỉ Việt Nam

Ngày cập nhật: 24/10/2026. Danh mục trong bản 1.3 có **34 tỉnh/thành phố, 3.321 đơn vị cấp xã** (phường, xã, đặc khu), theo mô hình từ 01/07/2025. Không dùng danh sách ba thành phố có tin mẫu để giới hạn địa chỉ.

## Nguồn

- Bảng danh mục và mã số công bố trên Cổng Thông tin điện tử Chính phủ: https://baochinhphu.vn/bang-danh-muc-va-ma-so-cua-34-tinh-thanh-moi-3321-don-vi-hanh-chinh-cap-xa-moi-102250704153652947.htm
- Danh sách đầy đủ: https://xaydungchinhsach.chinhphu.vn/danh-sach-3321-don-vi-hanh-chinh-cap-xa-tai-34-tinh-thanh-sau-sap-xep-sap-nhap-119250710102358656.htm
- Dữ liệu tên/mã dạng JSON lấy ngày 24/10/2026 từ Vietnam Provinces Open API v2: https://provinces.open-api.vn/api/v2/?depth=2 ; đơn vị duy trì API: Nguyễn Hồng Quân, https://github.com/hongquan/vn-open-api-provinces . Đây là nguồn chuyển đổi dữ liệu độc lập, không phải API của Chính phủ.

## Cách sử dụng

1. Chọn tỉnh/thành phố.
2. Chọn phường/xã/đặc khu. Có thể gõ tên không dấu vào “Tìm nhanh tên khu vực” để rút gọn danh sách.
3. Chọn khoảng giá, diện tích và tiện ích rồi tìm phòng.

Trang đăng/sửa tin dùng cùng danh mục. Khi đổi tỉnh, phường/xã cũ được bỏ chọn để tránh gán nhầm.

File resources/vietnam-addresses.json lưu cục bộ tên, mã và quan hệ tỉnh–phường/xã. Website không gọi dịch vụ địa chỉ ngoài khi sử dụng. GET /api/address-catalog trả danh sách tỉnh, GET /api/address-catalog/:code trả các phường/xã thuộc tỉnh.

Địa chỉ mẫu theo quận/huyện cũ được giữ trong nhóm “Khu vực theo địa chỉ cũ”. Các tên TP. Hồ Chí Minh, Thành phố Hồ Chí Minh, Hồ Chí Minh, Sài Gòn và hcm được chuẩn hóa khi lọc. Không tự suy đoán chuyển mọi địa chỉ cũ thành phường mới. Tỉnh có danh mục nhưng chưa có tin được hiển thị 0 kết quả, không tạo phòng giả.

Kiểm thử N01–N04 kiểm tra đủ 34 tỉnh, tổng 3.321 mã cấp xã không trùng, mã tỉnh sai trả 404, tên tương đương và đăng/duyệt/tìm phòng tại Cà Mau trong database kiểm thử riêng. Khi có quyết định hành chính mới, phải cập nhật file danh mục, mốc hiệu lực và kiểm thử tương ứng.
