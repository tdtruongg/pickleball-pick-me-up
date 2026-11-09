import {
  BALL_GROUND_FRICTION,
  BALL_MIN_BOUNCE_SPEED,
  BALL_RADIUS,
  BALL_RESTITUTION,
  BALL_ROLL_DAMPING,
  GRAVITY,
  NET_HALF_SPAN,
  NET_HEIGHT_CENTER,
  NET_HEIGHT_POST,
  NET_RESTITUTION,
} from '../constants';
import { clamp, type Vec3 } from '../math';

export interface BallState {
  pos: Vec3;
  vel: Vec3;
}

export type BallEvent =
  | { kind: 'bounce'; x: number; z: number; speed: number }
  | { kind: 'net'; x: number; y: number };

/** Lưới võng xuống ở giữa: 36" ở cột, 34" ở giữa. Dùng parabol cho gần giống thật. */
export function netHeightAt(x: number): number {
  const t = clamp(Math.abs(x) / NET_HALF_SPAN, 0, 1);
  return NET_HEIGHT_CENTER + (NET_HEIGHT_POST - NET_HEIGHT_CENTER) * t * t;
}

export function isRolling(ball: BallState): boolean {
  return ball.pos.y <= BALL_RADIUS + 1e-6 && ball.vel.y === 0;
}

/**
 * Tiến bóng một bước. Sửa trực tiếp `ball` (tránh cấp phát mỗi tick trên server).
 * Chỉ dùng phép tính đơn giản theo thứ tự cố định → client và server ra cùng kết quả.
 */
export function stepBall(ball: BallState, dt: number, events?: BallEvent[]): void {
  const { pos, vel } = ball;
  const prevZ = pos.z;
  const rolling = isRolling(ball);

  if (!rolling) vel.y -= GRAVITY * dt;
  pos.x += vel.x * dt;
  pos.y += vel.y * dt;
  pos.z += vel.z * dt;

  // --- Lưới: bóng vượt mặt phẳng z = 0 trong bước này ---
  const crossed = (prevZ > 0 && pos.z <= 0) || (prevZ < 0 && pos.z >= 0);
  if (crossed && Math.abs(pos.x) <= NET_HALF_SPAN) {
    // Nội suy đúng điểm cắt lưới để không bỏ sót khi bóng nhanh.
    const t = prevZ / (prevZ - pos.z);
    const yAtNet = pos.y - vel.y * dt * (1 - t);
    const xAtNet = pos.x - vel.x * dt * (1 - t);
    if (yAtNet - BALL_RADIUS < netHeightAt(xAtNet)) {
      const side = Math.sign(prevZ) || 1;
      pos.z = side * BALL_RADIUS;
      vel.z = -vel.z * NET_RESTITUTION;
      vel.x *= 0.5;
      vel.y = Math.min(vel.y, 0) * 0.5;
      events?.push({ kind: 'net', x: xAtNet, y: yAtNet });
    }
  }

  // --- Mặt sân ---
  if (pos.y < BALL_RADIUS) {
    pos.y = BALL_RADIUS;
    if (vel.y < 0) {
      const impact = -vel.y;
      if (impact > BALL_MIN_BOUNCE_SPEED) {
        events?.push({ kind: 'bounce', x: pos.x, z: pos.z, speed: impact });
        vel.y = impact * BALL_RESTITUTION;
      } else {
        vel.y = 0;
      }
      vel.x *= BALL_GROUND_FRICTION;
      vel.z *= BALL_GROUND_FRICTION;
    }
  }

  if (isRolling(ball)) {
    const k = Math.max(0, 1 - BALL_ROLL_DAMPING * dt);
    vel.x *= k;
    vel.z *= k;
  }
}

/** Dự đoán quỹ đạo (dùng cho bot và debug). Không đụng vào `ball` gốc. */
export function predictBall(
  ball: BallState,
  dt: number,
  steps: number,
  visit: (b: BallState, step: number, bounced: boolean) => boolean | void,
): void {
  const b: BallState = {
    pos: { ...ball.pos },
    vel: { ...ball.vel },
  };
  const events: BallEvent[] = [];
  for (let i = 1; i <= steps; i++) {
    events.length = 0;
    stepBall(b, dt, events);
    const bounced = events.some((e) => e.kind === 'bounce');
    if (visit(b, i, bounced) === true) return;
  }
}
