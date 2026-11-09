import * as THREE from 'three';
import { SWING_WINDOW, type PlayerState } from '@shared';

/**
 * Nhân vật tạm dựng từ khối cơ bản (GĐ7 sẽ thay bằng GLB + Mixamo).
 * Hướng mặc định nhìn về -z (về phía lưới với đội 0).
 */
export class PlayerView {
  readonly root = new THREE.Group();
  private readonly body = new THREE.Group();
  private readonly armPivot = new THREE.Group();
  private swingAnim = 0;

  constructor(color: number) {
    const toon = (c: number) => new THREE.MeshToonMaterial({ color: c });

    const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.24, 0.55, 4, 10), toon(color));
    torso.position.y = 0.85;
    torso.castShadow = true;

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.2, 14, 10), toon(0xffd8b1));
    head.position.y = 1.5;
    head.castShadow = true;

    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.21, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), toon(color));
    cap.position.y = 1.53;

    const legs = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.16, 0.5, 8), toon(0x2d3436));
    legs.position.y = 0.3;
    legs.castShadow = true;

    // Tay phải + vợt quay quanh vai
    this.armPivot.position.set(0.28, 1.1, 0);
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.45, 6), toon(0xffd8b1));
    arm.rotation.z = Math.PI / 2;
    arm.position.x = 0.22;
    const paddle = new THREE.Group();
    const face = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.26, 0.025), toon(0xff4757));
    face.position.y = 0.2;
    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.13, 6), toon(0x222222));
    handle.position.y = 0.02;
    paddle.add(face, handle);
    paddle.position.set(0.46, 0, 0);
    paddle.castShadow = true;
    this.armPivot.add(arm, paddle);

    this.body.add(torso, head, cap, legs, this.armPivot);
    this.root.add(this.body);
  }

  update(p: PlayerState, dt: number): void {
    this.root.position.set(p.pos.x, 0, p.pos.z);
    // Đội 1 đứng phía bên kia nên quay 180°.
    this.root.rotation.y = p.team === 0 ? 0 : Math.PI;

    // Nghiêng người theo hướng chạy cho có cảm giác chuyển động.
    const sign = p.team === 0 ? 1 : -1;
    this.body.rotation.z = THREE.MathUtils.lerp(this.body.rotation.z, -p.vel.x * 0.04 * sign, 0.2);
    this.body.rotation.x = THREE.MathUtils.lerp(this.body.rotation.x, p.vel.z * 0.04 * sign, 0.2);

    if (p.swingTimer > 0 && this.swingAnim <= 0) this.swingAnim = SWING_WINDOW;
    if (this.swingAnim > 0) this.swingAnim = Math.max(0, this.swingAnim - dt);

    // Vung từ sau ra trước: 0 → 1 trong thời gian swing.
    const t = this.swingAnim > 0 ? 1 - this.swingAnim / SWING_WINDOW : 0;
    const swingAngle = this.swingAnim > 0 ? THREE.MathUtils.lerp(1.0, -1.3, t) : 0.35;
    this.armPivot.rotation.y = THREE.MathUtils.lerp(this.armPivot.rotation.y, swingAngle, 0.5);
  }
}
