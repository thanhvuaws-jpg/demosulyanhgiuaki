# Lọc cực đại & Lọc cực tiểu – Demo trên web

Ứng dụng minh họa cho **Thuyết trình 1 – Đề tài 3: Lọc cực đại (Maximum Filter) và lọc cực tiểu (Minimum Filter)**, môn Xử lý ảnh và thị giác máy tính.

👉 **Chạy trực tiếp:** https://thanhvuaws-jpg.github.io/demosulyanhgiuaki/

Không cần cài đặt gì: mở link bằng trình duyệt (máy tính hay điện thoại đều được). Mọi phép tính chạy ngay trên trình duyệt, ảnh không bị gửi đi đâu cả.

## Các tab

| Tab | Nội dung |
|---|---|
| 1. Cửa sổ trượt (5×5) | Ví dụ tính tay giống slide: cửa sổ 3×3 trượt qua 9 vị trí, sắp xếp 9 giá trị, lấy max / min. Có nút Tiếp, Lùi, Tự chạy và ma trận ngẫu nhiên. |
| 2. Lọc cực đại / cực tiểu | Áp dụng lên ảnh thật; đổi kích thước (1–21) và hình dạng cửa sổ (vuông, chữ thập, đĩa tròn, đoạn ngang, đoạn dọc). |
| 3. Khử nhiễu muối / tiêu | Chọn loại nhiễu, mật độ, bộ lọc (min / max / trung vị) và kích thước; xem PSNR và tỉ lệ điểm bất thường; app báo chọn đúng hay sai bộ lọc. |
| 4. Mở – đóng từng bước | Làm sạch nhiễu muối tiêu qua 4 bước min → max → max → min, so sánh với lọc trung vị. |
| 5. Tách biên | Gradient hình thái = max − min, có ngưỡng để lấy điểm biên. |
| 6. Top-hat tách chữ | Ảnh gốc − phép mở để bỏ nền sáng không đều trước khi nhị phân hóa (Otsu). |

Nút **“Mở ảnh khác…”** ở góc trên cho phép thử với ảnh của bạn (ảnh lớn được thu nhỏ còn cạnh dài nhất 900 điểm ảnh).

## Ghi chú kỹ thuật

- Chỉ dùng HTML + CSS + JavaScript thuần, không thư viện ngoài.
- Lọc max / min dùng hàng đợi đơn điệu (O(1) mỗi điểm ảnh) nên kéo thanh trượt vẫn mượt. Cửa sổ vuông tách thành hàng rồi cột; chữ thập, đĩa tròn và đoạn thẳng ghép từ các cửa sổ 1 chiều.
- Kết quả đã được đối chiếu từng điểm ảnh với OpenCV (`cv2.dilate`, `cv2.erode`, `cv2.medianBlur`, ngưỡng Otsu): khớp hoàn toàn.
- Nhiễu được tạo bằng bộ sinh số ngẫu nhiên có hạt giống (seed) nên mỗi lần mở trang cho cùng một kết quả; bấm “Tạo nhiễu ngẫu nhiên mới” để đổi.

## Chạy trên máy (không cần mạng)

```bash
python -m http.server 8000
```

Sau đó mở http://localhost:8000 (mở trực tiếp file `index.html` cũng chạy, nhưng khi đó trình duyệt có thể chặn đọc ảnh mẫu và app sẽ dùng ảnh tổng hợp thay thế).
