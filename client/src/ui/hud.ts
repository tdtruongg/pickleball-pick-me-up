import type { ShotType } from '@shared';

const SHOT_LABEL: Record<ShotType, string> = {
  drive: 'Drive',
  dink: 'Dink',
  lob: 'Lob',
  smash: 'Smash!',
};

export class Hud {
  private readonly flash: HTMLDivElement;
  private readonly power: HTMLDivElement;
  private readonly powerFill: HTMLDivElement;
  private readonly rally: HTMLDivElement;
  private readonly fps: HTMLDivElement;
  private flashTimer = 0;
  private frames = 0;
  private fpsTime = 0;

  constructor(parent: HTMLElement) {
    const root = document.createElement('div');
    root.className = 'hud';
    root.innerHTML = `
      <div class="hud-help">
        <b>WASD / mũi tên</b>: di chuyển<br>
        Giữ rồi thả để đánh (giữ lâu = mạnh)<br>
        <b>J / Space / chuột trái</b>: Drive (bóng cao → Smash)<br>
        <b>K</b>: Dink &nbsp; <b>L / chuột phải</b>: Lob<br>
        Nhấn <b>A/D</b> lúc đánh để ngắm trái/phải · <b>R</b>: phát bóng mới
      </div>
      <div class="hud-stats"><div class="hud-rally">0</div><div>rally</div><div class="hud-fps"></div></div>
      <div class="hud-flash"></div>
      <div class="hud-power"><div class="hud-power-fill"></div></div>
    `;
    parent.appendChild(root);
    this.flash = root.querySelector('.hud-flash')!;
    this.power = root.querySelector('.hud-power')!;
    this.powerFill = root.querySelector('.hud-power-fill')!;
    this.rally = root.querySelector('.hud-rally')!;
    this.fps = root.querySelector('.hud-fps')!;
  }

  showHit(shot: ShotType, timing: number, perfect: boolean): void {
    // timing > 0 là chạm bóng sớm (bóng còn ở xa phía trước).
    const t = perfect ? 'CHUẨN!' : timing > 0 ? 'Sớm' : 'Muộn';
    this.showText(`${SHOT_LABEL[shot]} · ${t}`, perfect);
  }

  showText(text: string, highlight = false): void {
    this.flash.textContent = text;
    this.flash.classList.toggle('perfect', highlight);
    this.flash.classList.add('show');
    this.flashTimer = 0.9;
  }

  setRally(n: number): void {
    this.rally.textContent = String(n);
  }

  update(dt: number, charge: number | null): void {
    if (this.flashTimer > 0) {
      this.flashTimer -= dt;
      if (this.flashTimer <= 0) this.flash.classList.remove('show');
    }
    this.power.classList.toggle('show', charge !== null);
    if (charge !== null) this.powerFill.style.width = `${Math.round(charge * 100)}%`;

    this.frames++;
    this.fpsTime += dt;
    if (this.fpsTime >= 0.5) {
      this.fps.textContent = `${Math.round(this.frames / this.fpsTime)} FPS`;
      this.frames = 0;
      this.fpsTime = 0;
    }
  }
}
