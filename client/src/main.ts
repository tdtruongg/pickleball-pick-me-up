import * as THREE from 'three';
import {
  SIM_DT,
  computeBotInput,
  createWorld,
  feedBall,
  sideOf,
  stepWorld,
  type PlayerInput,
  type WorldEvent,
} from '@shared';
import './style.css';
import { Sfx } from './audio/sfx';
import { Controls } from './input/controls';
import { BallView } from './render/ballView';
import { CameraRig } from './render/cameraRig';
import { buildCourt } from './render/court';
import { PlayerView } from './render/playerView';
import { Hud } from './ui/hud';

const ME = 'me';
const BOT = 'bot';
// Tránh "vòng xoáy chết": nếu tab bị treo lâu thì không cố mô phỏng bù quá nhiều bước.
const MAX_FRAME_DT = 0.1;

const app = document.getElementById('app')!;

// ---------- Renderer ----------
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
// Giới hạn pixel ratio 2: màn hình 3x trên điện thoại tốn GPU mà nhìn không khác mấy.
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
app.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x9fd8ef);
scene.fog = new THREE.Fog(0x9fd8ef, 35, 70);

// Ít đèn: 1 hemisphere + 1 directional (chỉ đèn này đổ bóng).
scene.add(new THREE.HemisphereLight(0xffffff, 0x6aa86a, 1.6));
const sun = new THREE.DirectionalLight(0xffffff, 1.6);
sun.position.set(6, 14, 6);
sun.castShadow = true;
sun.shadow.mapSize.set(1024, 1024);
const sc = sun.shadow.camera;
sc.left = -6;
sc.right = 6;
sc.top = 10;
sc.bottom = -10;
sc.near = 1;
sc.far = 40;
scene.add(sun);

scene.add(buildCourt());

// ---------- Game state (thuần logic, nằm trong shared) ----------
const world = createWorld([
  { id: ME, team: 0 },
  { id: BOT, team: 1 },
]);

const views = new Map<string, PlayerView>([
  [ME, new PlayerView(0xff7a59)],
  [BOT, new PlayerView(0x6c5ce7)],
]);
for (const v of views.values()) scene.add(v.root);
const ballView = new BallView();
scene.add(ballView.root);

const rig = new CameraRig(window.innerWidth / window.innerHeight);
const controls = new Controls(renderer.domElement);
const sfx = new Sfx();
const hud = new Hud(document.body);

function resize(): void {
  renderer.setSize(window.innerWidth, window.innerHeight);
  rig.resize(window.innerWidth, window.innerHeight);
}
window.addEventListener('resize', resize);
resize();

function handleEvents(events: WorldEvent[]): void {
  for (const e of events) {
    switch (e.kind) {
      case 'hit': {
        const p = world.players.find((pl) => pl.id === e.playerId);
        sfx.paddle(p?.swingPower ?? 0.5, e.perfect);
        if (e.playerId === ME) hud.showHit(e.shot, e.timing, e.perfect);
        hud.setRally(world.rally);
        break;
      }
      case 'bounce':
        sfx.bounce(e.speed);
        break;
      case 'net':
        sfx.net();
        break;
      case 'feed':
        ballView.resetTrail();
        hud.setRally(0);
        break;
      case 'dead':
        break;
      case 'swing':
        break;
    }
  }
}

// ---------- Vòng lặp: mô phỏng bước cố định, render theo FPS màn hình ----------
const me = world.players.find((p) => p.id === ME)!;
const bot = world.players.find((p) => p.id === BOT)!;
let accumulator = 0;
let last = performance.now();

function frame(now: number): void {
  const dt = Math.min(MAX_FRAME_DT, (now - last) / 1000);
  last = now;
  accumulator += dt;

  if (controls.takeFeedRequest()) {
    feedBall(world, 1);
    ballView.resetTrail();
    hud.setRally(0);
  }

  // Input theo góc nhìn người chơi → trục thế giới. Đội 0 nhìn về -z.
  const s = sideOf(me.team);
  const mv = controls.move();
  let swing = controls.takeSwing();

  while (accumulator >= SIM_DT) {
    const myInput: PlayerInput = { moveX: mv.right * s, moveZ: -mv.forward * s, swing };
    swing = null; // lệnh vung chỉ áp dụng cho 1 tick
    const inputs = { [ME]: myInput, [BOT]: computeBotInput(world, bot) };
    handleEvents(stepWorld(world, inputs, SIM_DT));
    accumulator -= SIM_DT;
  }
  // Frame chưa đủ 1 tick thì giữ lệnh vung cho frame sau, không đánh rơi thao tác.
  if (swing) controls.requeueSwing(swing);

  for (const p of world.players) views.get(p.id)?.update(p, dt);
  ballView.update(world.ball, world.ballInPlay || world.deadTimer < 0.6);
  rig.update(me, dt);
  hud.update(dt, controls.chargeLevel());
  renderer.render(scene, rig.camera);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// Để debug trong console: window.__game.world
(window as unknown as { __game: unknown }).__game = { world, feedBall };
