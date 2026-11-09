import { describe, expect, it } from 'vitest';
import {
  BALL_RADIUS,
  BALL_RESTITUTION,
  HALF_WIDTH,
  KITCHEN_DEPTH,
  NET_HEIGHT_CENTER,
  NET_HEIGHT_POST,
  NET_HALF_SPAN,
  SIM_DT,
} from '../src/constants';
import { netHeightAt, stepBall, type BallEvent, type BallState } from '../src/physics/ball';
import { clearsNet, computeShot, solveShot } from '../src/physics/shot';

function simulate(ball: BallState, seconds: number): BallEvent[] {
  const events: BallEvent[] = [];
  for (let t = 0; t < seconds; t += SIM_DT) stepBall(ball, SIM_DT, events);
  return events;
}

describe('net', () => {
  it('võng 34" ở giữa, 36" ở cột', () => {
    expect(netHeightAt(0)).toBeCloseTo(NET_HEIGHT_CENTER, 5);
    expect(netHeightAt(NET_HALF_SPAN)).toBeCloseTo(NET_HEIGHT_POST, 5);
  });
});

describe('stepBall', () => {
  it('nảy lên ~64% vận tốc khi rơi', () => {
    const ball: BallState = { pos: { x: 0, y: 2, z: 3 }, vel: { x: 0, y: 0, z: 0 } };
    const events: BallEvent[] = [];
    while (events.length === 0) stepBall(ball, SIM_DT, events);
    const impact = (events[0] as Extract<BallEvent, { kind: 'bounce' }>).speed;
    expect(ball.vel.y).toBeCloseTo(impact * BALL_RESTITUTION, 5);
  });

  it('bóng thấp đập lưới và không sang sân bên kia', () => {
    const ball: BallState = { pos: { x: 0, y: 0.5, z: 3 }, vel: { x: 0, y: 0, z: -12 } };
    const events = simulate(ball, 1);
    expect(events.some((e) => e.kind === 'net')).toBe(true);
    expect(ball.pos.z).toBeGreaterThan(0);
  });

  it('bóng cao bay qua lưới', () => {
    const ball: BallState = { pos: { x: 0, y: 1.5, z: 3 }, vel: { x: 0, y: 1, z: -8 } };
    const events = simulate(ball, 0.6);
    expect(events.some((e) => e.kind === 'net')).toBe(false);
    expect(ball.pos.z).toBeLessThan(0);
  });

  it('deterministic: chạy 2 lần ra cùng kết quả', () => {
    const mk = (): BallState => ({ pos: { x: 0.3, y: 1, z: 5 }, vel: { x: -1.1, y: 3.2, z: -9.4 } });
    const a = mk();
    const b = mk();
    simulate(a, 3);
    simulate(b, 3);
    expect(a).toEqual(b);
  });

  it('cuối cùng nằm yên trên mặt sân', () => {
    const ball: BallState = { pos: { x: 0, y: 1, z: 2 }, vel: { x: 0, y: 2, z: 0 } };
    simulate(ball, 6);
    expect(ball.pos.y).toBeCloseTo(BALL_RADIUS, 5);
  });
});

describe('shot solver', () => {
  const from = { x: 0.5, y: 0.8, z: 5.5 };

  it('rơi đúng điểm đích (không vướng lưới)', () => {
    const target = { x: -1, z: -5 };
    const { vel, flightTime } = solveShot(from, target, 0.9);
    const ball: BallState = { pos: { ...from }, vel };
    const events: BallEvent[] = [];
    for (let t = 0; t < flightTime + 0.05 && !events.some((e) => e.kind === 'bounce'); t += SIM_DT) {
      stepBall(ball, SIM_DT, events);
    }
    const bounce = events.find((e) => e.kind === 'bounce') as Extract<BallEvent, { kind: 'bounce' }>;
    expect(bounce).toBeDefined();
    expect(bounce.x).toBeCloseTo(target.x, 1);
    expect(bounce.z).toBeCloseTo(target.z, 1);
  });

  it('aim assist: cú đánh thấp, nhanh vẫn được nâng qua lưới', () => {
    const low = { x: 0, y: 0.2, z: 3 };
    const { vel } = solveShot(low, { x: 0, z: -2 }, 0.25);
    expect(clearsNet(low, vel)).toBe(true);
  });

  it('dink rơi trong kitchen đối phương', () => {
    const r = computeShot({ type: 'dink', power: 0.5, ballPos: { x: 0, y: 0.4, z: 2 }, side: 1, aimX: 0, timing: 0 });
    expect(r.target.z).toBeLessThan(0);
    expect(-r.target.z).toBeLessThanOrEqual(KITCHEN_DEPTH);
  });

  it('điểm ngắm luôn nằm trong sân', () => {
    for (const aimX of [-1, 1]) {
      for (const timing of [-1, 1]) {
        const r = computeShot({ type: 'drive', power: 1, ballPos: from, side: 1, aimX, timing });
        expect(Math.abs(r.target.x)).toBeLessThan(HALF_WIDTH);
      }
    }
  });

  it('đối xứng giữa hai phía sân', () => {
    const a = computeShot({ type: 'drive', power: 0.6, ballPos: from, side: 1, aimX: 0, timing: 0 });
    const b = computeShot({
      type: 'drive',
      power: 0.6,
      ballPos: { x: from.x, y: from.y, z: -from.z },
      side: -1,
      aimX: 0,
      timing: 0,
    });
    expect(b.target.z).toBeCloseTo(-a.target.z, 6);
    expect(b.vel.z).toBeCloseTo(-a.vel.z, 6);
  });
});
