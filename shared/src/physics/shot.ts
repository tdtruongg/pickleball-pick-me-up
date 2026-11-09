import {
  AIM_RANGE,
  BALL_RADIUS,
  GRAVITY,
  HALF_WIDTH,
  NET_CLEAR_MARGIN,
  PERFECT_TIMING,
  SHOTS,
  TARGET_EDGE_MARGIN,
  TIMING_X_OFFSET,
  type ShotType,
} from '../constants';
import { clamp, lerp, type Vec2, type Vec3 } from '../math';
import { netHeightAt } from './ball';

/**
 * Vận tốc ban đầu để bóng đi từ `from` rơi đúng `target` sau `flightTime` giây
 * (quỹ đạo parabol, không lực cản).
 */
export function velocityForTarget(from: Vec3, target: Vec2, flightTime: number): Vec3 {
  const T = flightTime;
  return {
    x: (target.x - from.x) / T,
    y: (BALL_RADIUS - from.y + 0.5 * GRAVITY * T * T) / T,
    z: (target.z - from.z) / T,
  };
}

/** Độ cao bóng khi đi qua mặt phẳng lưới; null nếu quỹ đạo không cắt lưới. */
export function heightAtNet(from: Vec3, vel: Vec3): { y: number; x: number } | null {
  if (vel.z === 0) return null;
  const t = -from.z / vel.z;
  if (t <= 0) return null;
  return {
    y: from.y + vel.y * t - 0.5 * GRAVITY * t * t,
    x: from.x + vel.x * t,
  };
}

export function clearsNet(from: Vec3, vel: Vec3, margin = NET_CLEAR_MARGIN): boolean {
  const h = heightAtNet(from, vel);
  if (!h) return true;
  return h.y - BALL_RADIUS >= netHeightAt(h.x) + margin;
}

/**
 * Aim assist: nếu quỹ đạo thấp hơn lưới thì kéo dài thời gian bay (bóng vồng hơn)
 * cho tới khi qua lưới. Người mới vẫn đưa được bóng sang sân, chỉ là chậm hơn.
 */
export function solveShot(from: Vec3, target: Vec2, flightTime: number): { vel: Vec3; flightTime: number } {
  let T = flightTime;
  let vel = velocityForTarget(from, target, T);
  // Giới hạn tuyệt đối (không nhân theo flightTime) vì cú ngắn + bóng thấp cần nâng nhiều.
  const maxT = Math.max(flightTime * 3, 3);
  while (!clearsNet(from, vel) && T < maxT) {
    T += 0.03;
    vel = velocityForTarget(from, target, T);
  }
  return { vel, flightTime: T };
}

export interface ShotParams {
  type: ShotType;
  /** 0..1 */
  power: number;
  ballPos: Vec3;
  /** +1 nếu người đánh ở phía z > 0, -1 nếu ở phía z < 0 */
  side: 1 | -1;
  /** -1..1, hướng ngắm ngang lấy từ phím di chuyển lúc đánh (theo trục x thế giới) */
  aimX: number;
  /** -1 (muộn) .. 0 (chuẩn) .. 1 (sớm) */
  timing: number;
}

export interface ShotResult {
  vel: Vec3;
  target: Vec2;
  flightTime: number;
  perfect: boolean;
}

export function computeShot(p: ShotParams): ShotResult {
  const cfg = SHOTS[p.type];
  const power = clamp(p.power, 0, 1);
  const perfect = Math.abs(p.timing) <= PERFECT_TIMING;

  // Đánh lệch nhịp thì bóng ngắn lại một chút → dễ bị đối thủ tấn công.
  const timingPenalty = perfect ? 1 : 1 - 0.15 * Math.abs(p.timing);
  const depth = lerp(cfg.depth[0], cfg.depth[1], power) * timingPenalty;
  const flightTime = lerp(cfg.flightTime[0], cfg.flightTime[1], power);

  // Sớm → bóng kéo chéo sang một bên, muộn → đẩy sang bên kia.
  // Nhân với side để cảm giác giống nhau ở cả hai phía sân.
  const timingShift = perfect ? 0 : -p.timing * TIMING_X_OFFSET * p.side;
  const xLimit = HALF_WIDTH - TARGET_EDGE_MARGIN;
  const target: Vec2 = {
    x: clamp(p.aimX * AIM_RANGE + timingShift, -xLimit, xLimit),
    z: -p.side * depth,
  };

  const solved = solveShot(p.ballPos, target, flightTime);
  return { vel: solved.vel, target, flightTime: solved.flightTime, perfect };
}
