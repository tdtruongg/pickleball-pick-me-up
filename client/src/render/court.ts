import * as THREE from 'three';
import {
  COURT_LENGTH,
  COURT_WIDTH,
  HALF_LENGTH,
  HALF_WIDTH,
  KITCHEN_DEPTH,
  LINE_WIDTH,
  NET_HALF_SPAN,
  NET_HEIGHT_POST,
  netHeightAt,
} from '@shared';

const COLORS = {
  grass: 0x8fd07a,
  apron: 0x2b6e4f,
  court: 0x2e8b57,
  kitchen: 0x3a7bd5,
  line: 0xffffff,
  post: 0x2d3436,
};

/** Một mảng phẳng nằm trên mặt đất; y nhỏ khác nhau để tránh z-fighting. */
function flat(w: number, d: number, color: number, y: number, x = 0, z = 0): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshLambertMaterial({ color }));
  m.rotation.x = -Math.PI / 2;
  m.position.set(x, y, z);
  m.receiveShadow = true;
  return m;
}

function buildLines(): THREE.Group {
  const g = new THREE.Group();
  const mat = new THREE.MeshBasicMaterial({ color: COLORS.line });
  const y = 0.004;
  const add = (w: number, d: number, x: number, z: number) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), mat);
    m.rotation.x = -Math.PI / 2;
    m.position.set(x, y, z);
    g.add(m);
  };
  // Biên dọc & biên ngang (vạch nằm trong sân theo luật)
  add(LINE_WIDTH, COURT_LENGTH, -HALF_WIDTH + LINE_WIDTH / 2, 0);
  add(LINE_WIDTH, COURT_LENGTH, HALF_WIDTH - LINE_WIDTH / 2, 0);
  add(COURT_WIDTH, LINE_WIDTH, 0, -HALF_LENGTH + LINE_WIDTH / 2);
  add(COURT_WIDTH, LINE_WIDTH, 0, HALF_LENGTH - LINE_WIDTH / 2);
  // Vạch kitchen
  add(COURT_WIDTH, LINE_WIDTH, 0, -KITCHEN_DEPTH);
  add(COURT_WIDTH, LINE_WIDTH, 0, KITCHEN_DEPTH);
  // Vạch giữa: từ vạch kitchen tới cuối sân (kitchen không chia ô)
  const centerLen = HALF_LENGTH - KITCHEN_DEPTH;
  add(LINE_WIDTH, centerLen, 0, -(KITCHEN_DEPTH + centerLen / 2));
  add(LINE_WIDTH, centerLen, 0, KITCHEN_DEPTH + centerLen / 2);
  return g;
}

/** Texture lưới vẽ bằng canvas: không cần file ảnh, nhẹ. */
function netTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 64;
  c.height = 64;
  const ctx = c.getContext('2d')!;
  ctx.clearRect(0, 0, 64, 64);
  ctx.strokeStyle = 'rgba(20,20,20,0.85)';
  ctx.lineWidth = 3;
  ctx.strokeRect(0, 0, 64, 64);
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(NET_HALF_SPAN * 2 * 22, NET_HEIGHT_POST * 22);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function buildNet(): THREE.Group {
  const g = new THREE.Group();
  const segs = 32;
  const span = NET_HALF_SPAN * 2;

  // Lưới: dải mặt phẳng có mép trên võng theo netHeightAt (giống hệt vật lý).
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  for (let i = 0; i <= segs; i++) {
    const x = -NET_HALF_SPAN + (span * i) / segs;
    const top = netHeightAt(x);
    positions.push(x, 0.02, 0, x, top, 0);
    const u = i / segs;
    uvs.push(u, 0, u, top / NET_HEIGHT_POST);
    if (i < segs) {
      const a = i * 2;
      indices.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  const net = new THREE.Mesh(
    geo,
    new THREE.MeshBasicMaterial({ map: netTexture(), transparent: true, side: THREE.DoubleSide, depthWrite: false }),
  );
  g.add(net);

  // Băng trắng mép trên lưới
  const topPts: THREE.Vector3[] = [];
  for (let i = 0; i <= segs; i++) {
    const x = -NET_HALF_SPAN + (span * i) / segs;
    topPts.push(new THREE.Vector3(x, netHeightAt(x), 0));
  }
  const tape = new THREE.Mesh(
    new THREE.TubeGeometry(new THREE.CatmullRomCurve3(topPts), 48, 0.025, 6, false),
    new THREE.MeshLambertMaterial({ color: 0xffffff }),
  );
  g.add(tape);

  // Cột lưới
  const postGeo = new THREE.CylinderGeometry(0.04, 0.04, NET_HEIGHT_POST + 0.05, 10);
  const postMat = new THREE.MeshLambertMaterial({ color: COLORS.post });
  for (const sx of [-1, 1]) {
    const post = new THREE.Mesh(postGeo, postMat);
    post.position.set(sx * NET_HALF_SPAN, (NET_HEIGHT_POST + 0.05) / 2, 0);
    post.castShadow = true;
    g.add(post);
  }
  return g;
}

export function buildCourt(): THREE.Group {
  const g = new THREE.Group();
  g.add(flat(80, 80, COLORS.grass, -0.01));
  g.add(flat(COURT_WIDTH + 6, COURT_LENGTH + 7, COLORS.apron, 0));
  g.add(flat(COURT_WIDTH, COURT_LENGTH, COLORS.court, 0.001));
  // Kitchen tô màu riêng để người chơi nhìn là biết vùng cấm vô-lê
  g.add(flat(COURT_WIDTH, KITCHEN_DEPTH, COLORS.kitchen, 0.002, 0, -KITCHEN_DEPTH / 2));
  g.add(flat(COURT_WIDTH, KITCHEN_DEPTH, COLORS.kitchen, 0.002, 0, KITCHEN_DEPTH / 2));
  g.add(buildLines());
  g.add(buildNet());
  return g;
}
