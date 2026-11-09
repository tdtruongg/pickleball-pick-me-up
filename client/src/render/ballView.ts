import * as THREE from 'three';
import { BALL_RADIUS, type BallState } from '@shared';

// Bóng thật chỉ 7,4 cm, nhìn từ camera rất nhỏ → phóng to khi vẽ để dễ theo dõi.
// Chỉ ảnh hưởng hình ảnh, vật lý vẫn dùng BALL_RADIUS thật.
const VISUAL_SCALE = 1.8;
const TRAIL_LEN = 14;

function blobTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const ctx = c.getContext('2d')!;
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(0,0,0,0.55)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}

export class BallView {
  readonly root = new THREE.Group();
  private readonly ball: THREE.Mesh;
  private readonly shadow: THREE.Mesh;
  private readonly shadowMat: THREE.MeshBasicMaterial;
  private readonly trail: THREE.InstancedMesh;
  private readonly history: THREE.Vector3[] = [];
  private readonly tmp = new THREE.Object3D();

  constructor() {
    const r = BALL_RADIUS * VISUAL_SCALE;
    this.ball = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 1), new THREE.MeshToonMaterial({ color: 0xf5d547 }));

    // Blob shadow: bóng đổ ngay dưới quả bóng, mờ dần khi bóng lên cao
    // → người chơi phán đoán được độ cao và điểm rơi (rẻ hơn shadow map nhiều).
    this.shadowMat = new THREE.MeshBasicMaterial({ map: blobTexture(), transparent: true, depthWrite: false });
    this.shadow = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), this.shadowMat);
    this.shadow.rotation.x = -Math.PI / 2;

    // Trail bằng các khối cầu nhỏ dần: 1 draw call, nhìn rõ hơn THREE.Line 1px.
    this.trail = new THREE.InstancedMesh(
      new THREE.IcosahedronGeometry(r, 0),
      new THREE.MeshBasicMaterial({ color: 0xfff3b0, transparent: true, opacity: 0.35, depthWrite: false }),
      TRAIL_LEN,
    );
    this.trail.frustumCulled = false;

    this.root.add(this.ball, this.shadow, this.trail);
  }

  update(b: BallState, visible: boolean): void {
    this.root.visible = visible;
    this.ball.position.set(b.pos.x, b.pos.y, b.pos.z);

    const h = Math.max(0, b.pos.y);
    const size = 0.22 + h * 0.06;
    this.shadow.scale.set(size, size, 1);
    this.shadow.position.set(b.pos.x, 0.006, b.pos.z);
    this.shadowMat.opacity = THREE.MathUtils.clamp(1 - h / 5, 0.25, 1);

    this.history.unshift(this.ball.position.clone());
    if (this.history.length > TRAIL_LEN) this.history.pop();
    const speed = Math.hypot(b.vel.x, b.vel.y, b.vel.z);
    const showTrail = visible && speed > 3;
    for (let i = 0; i < TRAIL_LEN; i++) {
      const p = this.history[i];
      const s = showTrail && p ? 1 - i / TRAIL_LEN : 0;
      this.tmp.position.copy(p ?? this.ball.position);
      this.tmp.scale.setScalar(s);
      this.tmp.updateMatrix();
      this.trail.setMatrixAt(i, this.tmp.matrix);
    }
    this.trail.instanceMatrix.needsUpdate = true;
  }

  resetTrail(): void {
    this.history.length = 0;
  }
}
