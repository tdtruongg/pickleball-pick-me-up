import * as THREE from 'three';
import type { PlayerState } from '@shared';

/**
 * Camera sau lưng, hơi cao. Chỉ bám theo người chơi một phần theo trục x
 * để luôn thấy toàn sân bên kia, không bị lắc theo từng bước chạy.
 */
export class CameraRig {
  readonly camera: THREE.PerspectiveCamera;
  private readonly look = new THREE.Vector3();
  private readonly desired = new THREE.Vector3();

  constructor(aspect: number) {
    this.camera = new THREE.PerspectiveCamera(55, aspect, 0.1, 200);
    this.camera.position.set(0, 6, 13);
    this.look.set(0, 0.5, -3);
  }

  resize(width: number, height: number): void {
    const aspect = width / height;
    this.camera.aspect = aspect;
    // Màn hình dọc thì mở rộng FOV để vẫn thấy hết chiều ngang sân.
    this.camera.fov = aspect < 1 ? 75 : 55;
    this.camera.updateProjectionMatrix();
  }

  update(me: PlayerState, dt: number): void {
    const s = me.team === 0 ? 1 : -1;
    this.desired.set(me.pos.x * 0.55, 5.2, me.pos.z + s * 6.8);
    const targetLook = new THREE.Vector3(me.pos.x * 0.3, 0.4, -s * 3.5);
    // Làm mượt độc lập với FPS (1 - e^{-k·dt}).
    const k = 1 - Math.exp(-6 * dt);
    this.camera.position.lerp(this.desired, k);
    this.look.lerp(targetLook, k);
    this.camera.lookAt(this.look);
  }
}
