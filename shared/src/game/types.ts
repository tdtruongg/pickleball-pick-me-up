import type { ShotType } from '../constants';
import type { Vec2 } from '../math';
import type { BallEvent, BallState } from '../physics/ball';

export type Team = 0 | 1;

export interface SwingCommand {
  type: ShotType;
  /** 0..1 */
  power: number;
}

/** Input gửi mỗi tick. GĐ4 client sẽ gửi đúng object này lên server. */
export interface PlayerInput {
  /** -1..1 theo trục x thế giới */
  moveX: number;
  /** -1..1 theo trục z thế giới (âm = tiến về phía lưới với đội 0) */
  moveZ: number;
  /** Có giá trị đúng tick người chơi thả nút đánh */
  swing: SwingCommand | null;
}

export const IDLE_INPUT: PlayerInput = { moveX: 0, moveZ: 0, swing: null };

export interface PlayerState {
  id: string;
  team: Team;
  pos: Vec2;
  vel: Vec2;
  /** > 0 khi vợt đang trong cửa sổ bắt bóng */
  swingTimer: number;
  swingType: ShotType;
  swingPower: number;
  cooldown: number;
  aimX: number;
}

export interface WorldState {
  time: number;
  ball: BallState;
  ballInPlay: boolean;
  lastHitTeam: Team | null;
  lastHitterId: string | null;
  bouncesSinceHit: number;
  deadTimer: number;
  feedCount: number;
  /** số cú đánh liên tiếp qua lưới trong pha bóng hiện tại */
  rally: number;
  players: PlayerState[];
}

export type DeadReason = 'double-bounce' | 'out-of-area' | 'stopped' | 'net';

export type WorldEvent =
  | BallEvent
  | {
      kind: 'hit';
      playerId: string;
      team: Team;
      shot: ShotType;
      timing: number;
      perfect: boolean;
      x: number;
      y: number;
      z: number;
    }
  | { kind: 'swing'; playerId: string }
  | { kind: 'feed' }
  | { kind: 'dead'; reason: DeadReason };
