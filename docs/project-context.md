# PROJECT CONTEXT: PICKLEBALL 3D ONLINE (CHƠI VỚI BẠN BÈ)

## 1. Vai trò
Senior game developer kiêm kỹ sư multiplayer networking, giỏi Three.js và game realtime trên web. Phong cách vibe coding: mô tả ý tưởng → code chạy được ngay, giải thích ngắn gọn, chủ động cảnh báo vấn đề. Ưu tiên đơn giản, chạy được, vui để chơi — không over-engineering.

## 2. Tổng quan sản phẩm
- Game Pickleball 3D chơi trên trình duyệt (desktop và điện thoại), KHÔNG phát hành lên app store.
- Người chơi: nhóm bạn 10–15 người. Không tài khoản, không xếp hạng.
- Vào chơi: nhập nickname → tạo phòng (mã 4–6 ký tự) hoặc nhập mã để vào phòng.
- Chế độ: 1v1, 2v2 online; chơi với bot để luyện tập.
- Góc nhìn: camera 3D phía sau người chơi, hơi cao, thấy toàn sân.
- Đồ họa: low-poly cartoon, màu tươi sáng, nhẹ cho điện thoại tầm trung.
- Cảm giác: điều khiển mượt, đánh bóng "đã tay", âm thanh "pop" khi chạm vợt.

## 3. Tech stack
- Client: TypeScript + Three.js, Vite. Deploy Render Static Site (Vercel bị khóa tài khoản → chuyển sang Render, gom client + server về một nơi).
- Server: Node.js + TypeScript + Colyseus. Deploy Render free tier, Singapore.
- Không database. Trạng thái chỉ trong phòng; phòng tự xóa khi hết người.
- Vật lý bóng tự viết, đơn giản, deterministic, trong `shared/`.
- Asset: sân/lưới/bóng/vợt dựng bằng code; nhân vật Kenney/Quaternius (GLB), hoạt ảnh Mixamo. Âm thanh Kenney/freesound (CC0).

## 4. Luật cần mô phỏng
- Sân 20 × 44 ft (6.10 × 13.41 m). Kitchen sâu 7 ft mỗi bên. Lưới 36" ở hai đầu, 34" ở giữa.
- Giao bóng: từ dưới lên, sau vạch cuối, chéo sang ô đối diện, không rơi vào kitchen.
- Two-bounce rule: bên nhận để bóng nảy, rồi bên giao cũng để bóng nảy, sau đó mới được vô-lê.
- Kitchen: không vô-lê khi đứng trong kitchen hoặc chạm vạch kitchen.
- Lỗi: bóng ra ngoài, không qua lưới, nảy hai lần, vô-lê trong kitchen, giao sai ô.
- Tính điểm: mặc định rally scoring tới 11, thắng cách 2; tùy chọn tính điểm truyền thống (chỉ bên giao ghi điểm, đánh đôi có Server 1/Server 2).
- Tùy chọn "luật dễ": tắt kitchen và two-bounce.
- Toàn bộ luật trong `shared/rules/`, server phán quyết, client chỉ hiển thị.

## 5. Kiến trúc multiplayer
- Server-authoritative vừa đủ: server quyết định vị trí bóng, điểm, lỗi. Validate cơ bản (tốc độ di chuyển, tầm với vợt).
- Client gửi input (di chuyển, loại cú đánh, hướng, lực).
- Server tick 30 Hz, gửi state qua Colyseus schema.
- Client: prediction cho nhân vật mình, interpolation cho đối thủ và bóng.
- Chịu được ping 50–120 ms (VN → Singapore).
- Mất kết nối: vào lại trong 30 giây với cùng nickname; quá thời gian thì bot thay.
- Server Render có thể ngủ: client hiện "Đang đánh thức server…" và tự thử lại.

## 6. Gameplay & điều khiển
- Desktop: WASD/mũi tên di chuyển; chuột hoặc phím để đánh (giữ tích lực, thả để đánh).
- Điện thoại: joystick ảo trái, nút cú đánh phải, màn hình ngang.
- Cú đánh: drive, dink, lob, smash. Hướng bóng phụ thuộc thời điểm chạm (sớm/đúng/muộn) và hướng di chuyển.
- Aim assist nhẹ cho người mới.
- Hiệu ứng: trail, bóng đổ dưới quả bóng, hiệu ứng nhỏ khi ghi điểm.
- Bot: dễ / vừa / khó.

## 7. Hiệu năng
- 60 FPS laptop, ≥ 30 FPS điện thoại tầm trung.
- Low-poly, ít đèn, MeshToonMaterial hoặc MeshStandardMaterial đơn giản; shadow chỉ cho nhân vật và bóng.
- Asset tải lần đầu < 10 MB.

## 8. Cấu trúc thư mục
/client – game Three.js · /server – Colyseus · /shared – types, hằng số, luật, vật lý · /docs – ghi chú

## 9. Quy ước code
- TypeScript strict, hạn chế `any`.
- Hằng số trong `shared/constants.ts` (thực tế: `shared/src/constants.ts`).
- Tách logic game khỏi render.
- Unit test luật và tính điểm bằng Vitest.
- Tên biến/hàm tiếng Anh; comment "tại sao" bằng tiếng Việt.

## 10. Cách làm việc
- Tính năng lớn: tóm tắt kế hoạch 3–5 ý trước, hỏi nếu mơ hồ.
- Chỉ rõ lệnh cần chạy.
- Làm bản đơn giản chạy được trước. Không thêm thư viện nếu không cần.
- Yêu cầu mâu thuẫn mục 5 hoặc 7 → cảnh báo trước.
- Cuối mỗi phần: đã làm gì, cách test thủ công, bước tiếp theo.
- Trả lời tiếng Việt, thuật ngữ kỹ thuật giữ tiếng Anh.

## 11. Lộ trình
- [x] GĐ1 – Prototype offline: sân 3D, camera, nhân vật di chuyển, bóng có vật lý, đánh bóng cơ bản.
- [ ] GĐ2 – Luật chơi: giao bóng, two-bounce, kitchen, tính điểm, kết thúc trận, luật dễ.
- [ ] GĐ3 – Bot 3 mức độ.
- [ ] GĐ4 – Multiplayer 1v1 qua mã phòng (Colyseus), prediction + interpolation.
- [ ] GĐ5 – 2v2, reconnect, màn hình "đánh thức server".
- [ ] GĐ6 – Điều khiển cảm ứng.
- [ ] GĐ7 – Nhân vật GLB + hoạt ảnh, âm thanh, hiệu ứng, polish.
- [ ] GĐ8 – Deploy client + server trên Render, test với bạn bè.

Trạng thái hiện tại: GĐ1 xong, chờ playtest thủ công trước khi sang GĐ2.
