import { HALF_LENGTH, IDEAL_CONTACT_FRONT, KITCHEN_DEPTH, REACH_RADIUS, SIM_DT } from '../constants';
import { clamp, type Vec2 } from '../math';
import { predictBall } from '../physics/ball';
import type { PlayerInput, PlayerState, WorldState } from '../game/types';
import { sideOf } from '../game/world';

/**
 * "Máy tập" GĐ1: chạy tới chỗ bóng sẽ rơi rồi đánh trả.
 * Chưa phải bot thật (GĐ3 sẽ có 3 mức độ), chỉ để có người rally cùng.
 */
export function computeBotInput(w: WorldState, bot: PlayerState): PlayerInput {
  const s = sideOf(bot.team);
  const home: Vec2 = { x: 0, z: s * (HALF_LENGTH - 1.0) };
  let goal: Vec2 = home;

  const incoming = w.ballInPlay && w.lastHitTeam !== bot.team;
  if (incoming) {
    // Tìm điểm đánh thuận lợi: bóng đã nảy một lần trên sân bot và đang rơi xuống dưới ~1 m.
    let hit: Vec2 | null = null;
    let bouncedOnMySide = false;
    predictBall(w.ball, SIM_DT, Math.round(2.5 / SIM_DT), (b, _i, bounced) => {
      if (bounced && b.pos.z * s > 0) bouncedOnMySide = true;
      if (bouncedOnMySide && b.vel.y < 0 && b.pos.y < 1.0) {
        hit = { x: b.pos.x, z: b.pos.z };
        return true;
      }
      return false;
    });
    const h = hit as Vec2 | null;
    if (h) {
      // Đứng lùi sau điểm đánh một chút để bóng ở "trước mặt".
      goal = { x: h.x - 0.3, z: h.z + s * IDEAL_CONTACT_FRONT };
    } else {
      goal = { x: w.ball.pos.x, z: bot.pos.z };
    }
  }

  const dx = goal.x - bot.pos.x;
  const dz = goal.z - bot.pos.z;
  const dist = Math.hypot(dx, dz);
  // Giảm tốc khi gần đích để không bị "rung" quanh điểm đứng.
  const speed = clamp(dist / 0.6, 0, 1);
  const moveX = dist > 0.05 ? (dx / dist) * speed : 0;
  const moveZ = dist > 0.05 ? (dz / dist) * speed : 0;

  let swing: PlayerInput['swing'] = null;
  if (incoming && bot.cooldown <= 0) {
    const b = w.ball.pos;
    const reach = Math.hypot(b.x - bot.pos.x, b.z - bot.pos.z);
    if (b.z * s > 0 && reach < REACH_RADIUS * 0.85 && b.y < 2.4) {
      const atNet = Math.abs(bot.pos.z) < KITCHEN_DEPTH + 1;
      // Đổi hướng ngắm theo số quả để đường bóng đa dạng mà vẫn deterministic.
      const aimSeq = [0.4, -0.5, 0, 0.6, -0.3];
      const aim = aimSeq[w.rally % aimSeq.length] ?? 0;
      swing = { type: atNet ? 'dink' : 'drive', power: atNet ? 0.5 : 0.45 };
      // Hướng ngắm lấy từ moveX ở đúng tick vung vợt (giống người chơi thật nhấn A/D).
      return { moveX: aim, moveZ: 0, swing };
    }
  }

  return { moveX, moveZ, swing };
}
