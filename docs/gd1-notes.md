# GĐ1 – Prototype offline: ghi chú thiết kế

## Đã làm

- Sân đúng kích thước 20 × 44 ft, kitchen 7 ft tô màu xanh dương, lưới võng 34"/36" (hình lưới dùng chung hàm `netHeightAt` với vật lý).
- Vật lý bóng tự viết trong `shared/src/physics/ball.ts`: bước cố định 120 Hz, trọng lực, nảy (hệ số 0,64), ma sát mặt sân, va chạm lưới có nội suy điểm cắt. Không lực cản để quỹ đạo là parabol, bộ giải cú đánh tính chính xác.
- Cú đánh trong `shared/src/physics/shot.ts`: chọn điểm rơi + thời gian bay → giải ra vận tốc. Aim assist: quỹ đạo không qua lưới thì kéo dài thời gian bay đến khi qua.
- Timing: bóng ở trước người khoảng 0,35 m là "Chuẩn"; sớm/muộn làm lệch điểm rơi sang ngang và hơi ngắn lại.
- World step trong `shared/src/game/world.ts`: người chơi (gia tốc, giới hạn phần sân), cửa sổ vung vợt 0,28 s, phát hiện chạm vợt, bóng chết (nảy 2 lần, bay xa, dừng lăn), tự phát bóng sau 1,2 s.
- "Máy tập" `shared/src/ai/simpleBot.ts`: dự đoán quỹ đạo, chạy tới điểm đánh sau khi bóng nảy, trả drive/dink.
- Client: camera sau lưng, nhân vật dựng bằng khối, blob shadow + trail cho bóng, âm thanh WebAudio tổng hợp, HUD (hướng dẫn, thanh lực, Sớm/Chuẩn/Muộn, đếm rally, FPS).

## Quyết định đáng nhớ

- Sim 120 Hz trên client; server GĐ4 chạy 30 Hz tick mạng nhưng vẫn có thể step vật lý 4 bước con mỗi tick để kết quả giống client.
- Bóng vẽ to gấp 1,8 lần thật để dễ nhìn; vật lý dùng bán kính thật.
- Input gửi theo trục thế giới (`moveX`, `moveZ`, `swing`) → đúng format sẽ gửi lên server.

## Chưa làm (để giai đoạn sau)

- Luật (giao bóng, two-bounce, kitchen, tính điểm) → GĐ2, đặt trong `shared/rules/`.
- Điều khiển cảm ứng → GĐ6. Hiện trên điện thoại chỉ xem được, chưa chơi được.
