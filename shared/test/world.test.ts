import { describe, expect, it } from 'vitest';
import { DEAD_BALL_DELAY, SIM_DT } from '../src/constants';
import { computeBotInput } from '../src/ai/simpleBot';
import { createWorld, feedBall, stepWorld } from '../src/game/world';
import type { PlayerInput, WorldEvent } from '../src/game/types';

describe('world', () => {
  it('tự phát bóng sau DEAD_BALL_DELAY', () => {
    const w = createWorld([
      { id: 'p1', team: 0 },
      { id: 'bot', team: 1 },
    ]);
    const events: WorldEvent[] = [];
    for (let t = 0; t < DEAD_BALL_DELAY + 0.05; t += SIM_DT) events.push(...stepWorld(w, {}));
    expect(events.some((e) => e.kind === 'feed')).toBe(true);
    expect(w.ballInPlay).toBe(true);
  });

  it('không ai đánh → bóng chết vì nảy 2 lần', () => {
    const w = createWorld([{ id: 'bot', team: 1 }]);
    feedBall(w, 1);
    const events: WorldEvent[] = [];
    for (let t = 0; t < 4; t += SIM_DT) events.push(...stepWorld(w, {}));
    expect(events.some((e) => e.kind === 'dead' && e.reason === 'double-bounce')).toBe(true);
  });

  it('hai bot rally được với nhau vài quả', () => {
    const w = createWorld([
      { id: 'a', team: 0 },
      { id: 'b', team: 1 },
    ]);
    feedBall(w, 1);
    let hits = 0;
    for (let t = 0; t < 12 && w.ballInPlay; t += SIM_DT) {
      const inputs: Record<string, PlayerInput> = {};
      for (const p of w.players) inputs[p.id] = computeBotInput(w, p);
      for (const e of stepWorld(w, inputs)) if (e.kind === 'hit') hits++;
    }
    expect(hits).toBeGreaterThanOrEqual(3);
  });
});
