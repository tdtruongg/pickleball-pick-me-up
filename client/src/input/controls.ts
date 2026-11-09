import { MAX_CHARGE_TIME, MIN_SHOT_POWER, type ShotType, type SwingCommand } from '@shared';

const SHOT_KEYS: Record<string, ShotType> = {
  KeyJ: 'drive',
  Space: 'drive',
  KeyK: 'dink',
  KeyL: 'lob',
};

/**
 * Đọc bàn phím + chuột. Trả về input theo hệ "của người chơi"
 * (right / forward), main.ts đổi sang trục thế giới theo phía sân.
 * GĐ6 sẽ thêm TouchControls cùng interface này.
 */
export class Controls {
  private readonly keys = new Set<string>();
  private charging: { type: ShotType; start: number; source: string } | null = null;
  private pendingSwing: SwingCommand | null = null;
  private feedRequested = false;

  constructor(target: HTMLElement) {
    window.addEventListener('keydown', (e) => {
      if (e.repeat) return;
      this.keys.add(e.code);
      const shot = SHOT_KEYS[e.code];
      if (shot) {
        e.preventDefault();
        this.startCharge(shot, e.code);
      }
      if (e.code === 'KeyR') this.feedRequested = true;
    });
    window.addEventListener('keyup', (e) => {
      this.keys.delete(e.code);
      if (this.charging?.source === e.code) this.release();
    });
    // Mất focus thì thả hết phím, tránh nhân vật chạy mãi.
    window.addEventListener('blur', () => {
      this.keys.clear();
      this.charging = null;
    });

    target.addEventListener('contextmenu', (e) => e.preventDefault());
    target.addEventListener('pointerdown', (e) => {
      if (e.pointerType !== 'mouse') return;
      this.startCharge(e.button === 2 ? 'lob' : 'drive', `mouse${e.button}`);
    });
    window.addEventListener('pointerup', (e) => {
      if (this.charging?.source === `mouse${e.button}`) this.release();
    });
  }

  private startCharge(type: ShotType, source: string): void {
    if (this.charging) return;
    this.charging = { type, start: performance.now(), source };
  }

  private release(): void {
    if (!this.charging) return;
    const held = (performance.now() - this.charging.start) / 1000;
    const charge = Math.min(1, held / MAX_CHARGE_TIME);
    this.pendingSwing = { type: this.charging.type, power: MIN_SHOT_POWER + (1 - MIN_SHOT_POWER) * charge };
    this.charging = null;
  }

  /** 0..1 để vẽ thanh lực; null khi không giữ nút. */
  chargeLevel(): number | null {
    if (!this.charging) return null;
    return Math.min(1, (performance.now() - this.charging.start) / 1000 / MAX_CHARGE_TIME);
  }

  move(): { right: number; forward: number } {
    const k = (c: string) => (this.keys.has(c) ? 1 : 0);
    return {
      right: k('KeyD') + k('ArrowRight') - k('KeyA') - k('ArrowLeft'),
      forward: k('KeyW') + k('ArrowUp') - k('KeyS') - k('ArrowDown'),
    };
  }

  /** Lấy lệnh vung vợt (chỉ trả một lần). */
  takeSwing(): SwingCommand | null {
    const s = this.pendingSwing;
    this.pendingSwing = null;
    return s;
  }

  requeueSwing(s: SwingCommand): void {
    this.pendingSwing ??= s;
  }

  takeFeedRequest(): boolean {
    const r = this.feedRequested;
    this.feedRequested = false;
    return r;
  }
}
