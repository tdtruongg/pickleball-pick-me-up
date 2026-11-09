# Pickleball 3D

Game Pickleball 3D chơi trên trình duyệt cùng bạn bè. Context đầy đủ của dự án nằm ở [docs/project-context.md](docs/project-context.md).

## Chạy lần đầu

Cần Node.js 20 trở lên.

```bash
npm run setup      # cài package cho root (test) và client
npm run dev        # mở http://localhost:5173
```

## Lệnh thường dùng

| Lệnh | Việc |
| --- | --- |
| `npm run dev` | Chạy game ở chế độ dev (hot reload, cả máy khác trong mạng LAN vào được) |
| `npm test` | Chạy unit test của `shared/` (Vitest) |
| `npm run typecheck` | Kiểm tra TypeScript cho `shared/` và `client/` |
| `npm run build` | Build bản production vào `client/dist` |

## Cấu trúc

```
client/   game Three.js (render, input, âm thanh, HUD)
shared/   hằng số, vật lý bóng, cú đánh, world step, bot tạm — không phụ thuộc Three.js
docs/     context dự án + ghi chú từng giai đoạn
server/   (GĐ4) Colyseus
```
