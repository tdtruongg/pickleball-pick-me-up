import {
  BALL_RADIUS,
  DEAD_BALL_DELAY,
  FEED_DEPTH,
  FEED_FLIGHT_TIME,
  HALF_LENGTH,
  HALF_WIDTH,
  IDEAL_CONTACT_FRONT,
  PLAYER_ACCEL,
  PLAYER_SPEED,
  PLAYER_START_DEPTH,
  REACH_MAX_Y,
  REACH_MIN_Y,
  REACH_RADIUS,
  RUNOFF_BACK,
  RUNOFF_SIDE,
  SIM_DT,
  SMASH_MIN_HEIGHT,
  SWING_COOLDOWN,
  SWING_WINDOW,
  TIMING_SPAN,
} from '../constants';
import { approach, clamp, type Vec3 } from '../math';
import { isRolling, stepBall, type BallEvent } from '../physics/ball';
import { computeShot, solveShot } from '../physics/shot';
import type { PlayerInput, PlayerState, Team, WorldEvent, WorldState } from './types';

export const sideOf = (team: Team): 1 | -1 => (team === 0 ? 1 : -1);

function createPlayer(id: string, team: Team): PlayerState {
  return {
    id,
    team,
    pos: { x: 0, z: sideOf(team) * PLAYER_START_DEPTH },
    vel: { x: 0, z: 0 },
    swingTimer: 0,
    swingType: 'drive',
    swingPower: 0,
    cooldown: 0,
    aimX: 0,
  };
}

export function createWorld(playerIds: { id: string; team: Team }[]): WorldState {
  return {
    time: 0,
    ball: { pos: { x: 0, y: BALL_RADIUS, z: -PLAYER_START_DEPTH }, vel: { x: 0, y: 0, z: 0 } },
    ballInPlay: false,
    lastHitTeam: null,
    lastHitterId: null,
    bouncesSinceHit: 0,
    // Bắt đầu đếm ngay để quả đầu tiên được phát sau DEAD_BALL_DELAY.
    deadTimer: 0,
    feedCount: 0,
    rally: 0,
    players: playerIds.map((p) => createPlayer(p.id, p.team)),
  };
}

/** Vị trí vợt/tay khi đứng yên (bóng phát ra từ đây). */
function paddlePos(p: PlayerState): Vec3 {
  return { x: p.pos.x + 0.3, y: 1.0, z: p.pos.z - sideOf(p.team) * 0.4 };
}

/**
 * Phát bóng tập (GĐ1 chưa có luật giao bóng): người của đội `feederTeam`
 * đẩy một quả nhẹ sang phần sân đối diện, đổi vị trí rơi mỗi lần cho đỡ chán.
 */
export function feedBall(w: WorldState, feederTeam: Team = 1, events?: WorldEvent[]): void {
  const feeder = w.players.find((p) => p.team === feederTeam);
  const from = feeder ? paddlePos(feeder) : { x: 0, y: 1, z: sideOf(feederTeam) * 5 };
  const xs = [-1.2, 0.8, 0, 1.6, -0.5, 1.1, -1.7];
  const tx = xs[w.feedCount % xs.length] ?? 0;
  const target = { x: tx, z: -sideOf(feederTeam) * FEED_DEPTH };
  const { vel } = solveShot(from, target, FEED_FLIGHT_TIME);

  w.ball.pos = { ...from };
  w.ball.vel = vel;
  w.ballInPlay = true;
  w.lastHitTeam = feederTeam;
  w.lastHitterId = feeder?.id ?? null;
  w.bouncesSinceHit = 0;
  w.deadTimer = 0;
  w.rally = 0;
  w.feedCount++;
  events?.push({ kind: 'feed' });
}

function killBall(w: WorldState, reason: Extract<WorldEvent, { kind: 'dead' }>['reason'], events: WorldEvent[]): void {
  if (!w.ballInPlay) return;
  w.ballInPlay = false;
  w.deadTimer = 0;
  events.push({ kind: 'dead', reason });
}

function stepPlayer(p: PlayerState, input: PlayerInput, dt: number, events: WorldEvent[]): void {
  // Chuẩn hoá để đi chéo không nhanh hơn đi thẳng.
  let mx = clamp(input.moveX, -1, 1);
  let mz = clamp(input.moveZ, -1, 1);
  const len = Math.hypot(mx, mz);
  if (len > 1) {
    mx /= len;
    mz /= len;
  }
  const dv = PLAYER_ACCEL * dt;
  p.vel.x = approach(p.vel.x, mx * PLAYER_SPEED, dv);
  p.vel.z = approach(p.vel.z, mz * PLAYER_SPEED, dv);
  p.pos.x += p.vel.x * dt;
  p.pos.z += p.vel.z * dt;

  // Giữ người chơi trong phần sân của mình (không được chạm/vượt lưới).
  const s = sideOf(p.team);
  p.pos.x = clamp(p.pos.x, -(HALF_WIDTH + RUNOFF_SIDE), HALF_WIDTH + RUNOFF_SIDE);
  const near = 0.3;
  const far = HALF_LENGTH + RUNOFF_BACK;
  p.pos.z = s > 0 ? clamp(p.pos.z, near, far) : clamp(p.pos.z, -far, -near);

  p.aimX = mx;
  p.cooldown = Math.max(0, p.cooldown - dt);
  p.swingTimer = Math.max(0, p.swingTimer - dt);

  if (input.swing && p.cooldown <= 0) {
    p.swingTimer = SWING_WINDOW;
    p.swingType = input.swing.type;
    p.swingPower = clamp(input.swing.power, 0, 1);
    p.cooldown = SWING_COOLDOWN;
    events.push({ kind: 'swing', playerId: p.id });
  }
}

function tryHit(w: WorldState, p: PlayerState, events: WorldEvent[]): boolean {
  if (p.swingTimer <= 0 || !w.ballInPlay) return false;
  if (w.lastHitTeam === p.team) return false;

  const b = w.ball.pos;
  const s = sideOf(p.team);
  // Chỉ đánh được bóng đang ở phần sân mình (cho phép lố lưới một chút khi vô-lê sát lưới).
  if (b.z * s < -0.05) return false;
  if (b.y < REACH_MIN_Y || b.y > REACH_MAX_Y) return false;
  const dx = b.x - p.pos.x;
  const dz = b.z - p.pos.z;
  if (Math.hypot(dx, dz) > REACH_RADIUS) return false;

  // front > 0: bóng ở trước mặt (phía lưới). Lý tưởng là hơi trước người.
  const front = (p.pos.z - b.z) * s;
  const timing = clamp((front - IDEAL_CONTACT_FRONT) / TIMING_SPAN, -1, 1);
  const type = p.swingType === 'drive' && b.y >= SMASH_MIN_HEIGHT ? 'smash' : p.swingType;

  const shot = computeShot({ type, power: p.swingPower, ballPos: b, side: s, aimX: p.aimX, timing });
  w.ball.vel = shot.vel;
  w.lastHitTeam = p.team;
  w.lastHitterId = p.id;
  w.bouncesSinceHit = 0;
  w.rally++;
  p.swingTimer = 0;
  events.push({
    kind: 'hit',
    playerId: p.id,
    team: p.team,
    shot: type,
    timing,
    perfect: shot.perfect,
    x: b.x,
    y: b.y,
    z: b.z,
  });
  return true;
}

/**
 * Một bước mô phỏng cố định. Thuần logic, không phụ thuộc Three.js
 * → GĐ4 server Colyseus gọi đúng hàm này.
 */
export function stepWorld(
  w: WorldState,
  inputs: Record<string, PlayerInput | undefined>,
  dt: number = SIM_DT,
): WorldEvent[] {
  const events: WorldEvent[] = [];
  w.time += dt;

  for (const p of w.players) {
    const input = inputs[p.id] ?? { moveX: 0, moveZ: 0, swing: null };
    stepPlayer(p, input, dt, events);
  }

  if (w.ballInPlay) {
    const ballEvents: BallEvent[] = [];
    stepBall(w.ball, dt, ballEvents);
    for (const e of ballEvents) {
      events.push(e);
      if (e.kind === 'bounce') {
        w.bouncesSinceHit++;
        if (w.bouncesSinceHit >= 2) killBall(w, 'double-bounce', events);
      }
    }

    // Kiểm tra va chạm vợt sau khi bóng di chuyển.
    for (const p of w.players) {
      if (tryHit(w, p, events)) break;
    }

    const b = w.ball.pos;
    if (Math.abs(b.x) > HALF_WIDTH + RUNOFF_SIDE + 3 || Math.abs(b.z) > HALF_LENGTH + RUNOFF_BACK + 3) {
      killBall(w, 'out-of-area', events);
    } else if (isRolling(w.ball) && Math.hypot(w.ball.vel.x, w.ball.vel.z) < 0.3) {
      killBall(w, 'stopped', events);
    }
  } else {
    w.deadTimer += dt;
    if (w.deadTimer >= DEAD_BALL_DELAY) feedBall(w, 1, events);
  }

  return events;
}
