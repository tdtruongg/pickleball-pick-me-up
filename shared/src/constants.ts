// Đơn vị: mét, giây, m/s. Hệ trục: x = ngang sân, y = hướng lên, z = dọc sân.
// Lưới nằm ở z = 0. Đội 0 (người chơi gần camera) ở phía z > 0, đội 1 ở z < 0.

// ---------- Sân ----------
const FT = 0.3048;
const INCH = 0.0254;

export const COURT_WIDTH = 20 * FT; // 6.096 m
export const COURT_LENGTH = 44 * FT; // 13.411 m
export const HALF_WIDTH = COURT_WIDTH / 2;
export const HALF_LENGTH = COURT_LENGTH / 2;
export const KITCHEN_DEPTH = 7 * FT; // 2.134 m tính từ lưới
export const LINE_WIDTH = 2 * INCH;

export const NET_HEIGHT_CENTER = 34 * INCH; // 0.864 m
export const NET_HEIGHT_POST = 36 * INCH; // 0.914 m
// Cột lưới đặt cách biên dọc 12 inch theo luật.
export const NET_POST_OFFSET = 12 * INCH;
export const NET_HALF_SPAN = HALF_WIDTH + NET_POST_OFFSET;

// Khoảng không ngoài sân mà người chơi được chạy ra.
export const RUNOFF_SIDE = 2.5;
export const RUNOFF_BACK = 3.0;

// ---------- Bóng ----------
export const GRAVITY = 9.81;
export const BALL_RADIUS = 0.037;
// Bóng pickleball thả từ 78 inch nảy lên ~30–34 inch → hệ số ~0.64.
export const BALL_RESTITUTION = 0.64;
// Phần vận tốc ngang còn lại sau mỗi lần nảy (ma sát mặt sân).
export const BALL_GROUND_FRICTION = 0.82;
// Dưới ngưỡng này coi như bóng hết nảy, chuyển sang lăn.
export const BALL_MIN_BOUNCE_SPEED = 0.5;
export const BALL_ROLL_DAMPING = 1.5; // 1/s
// Bóng chạm lưới thì bật ngược rất yếu.
export const NET_RESTITUTION = 0.15;
// GĐ1 chưa dùng lực cản không khí: giữ quỹ đạo là parabol để bộ giải cú đánh
// tính chính xác điểm rơi, và để client/server luôn ra cùng kết quả.

// ---------- Mô phỏng ----------
// Bước cố định 120 Hz: nhỏ đủ để bóng không "xuyên" qua lưới/mặt sân.
export const SIM_DT = 1 / 120;

// ---------- Người chơi ----------
export const PLAYER_SPEED = 5.0;
export const PLAYER_ACCEL = 28; // m/s² — đủ nhanh để cảm giác nhạy, vẫn có quán tính nhẹ
export const PLAYER_START_DEPTH = 5.6; // khoảng cách từ lưới khi bắt đầu

// Tầm với vợt tính từ tâm người chơi (nới rộng một chút làm aim assist cho người mới).
export const REACH_RADIUS = 1.3;
export const REACH_MIN_Y = 0.04;
export const REACH_MAX_Y = 2.6;

// Sau khi thả nút, vợt "sống" trong khoảng này để bắt bóng.
export const SWING_WINDOW = 0.28;
export const SWING_COOLDOWN = 0.35;
// Giữ nút tối đa bao lâu thì đầy lực.
export const MAX_CHARGE_TIME = 0.7;
// Bấm nhả nhanh vẫn có lực tối thiểu để bóng đi được.
export const MIN_SHOT_POWER = 0.3;

// ---------- Cú đánh ----------
export type ShotType = 'drive' | 'dink' | 'lob' | 'smash';

export interface ShotConfig {
  /** thời gian bay tới điểm rơi [lực thấp, lực cao] */
  flightTime: [number, number];
  /** khoảng cách điểm rơi tính từ lưới [lực thấp, lực cao] */
  depth: [number, number];
}

export const SHOTS: Record<ShotType, ShotConfig> = {
  drive: { flightTime: [1.0, 0.62], depth: [4.0, 5.9] },
  dink: { flightTime: [1.15, 1.0], depth: [0.9, 1.9] }, // rơi trong kitchen đối phương
  lob: { flightTime: [1.9, 2.3], depth: [5.0, 6.2] },
  smash: { flightTime: [0.5, 0.36], depth: [3.0, 5.2] },
};

// Bóng cao hơn mức này mà bấm drive thì tự chuyển thành smash.
export const SMASH_MIN_HEIGHT = 1.7;
// Biên độ ngắm sang hai bên (nhấn A/D lúc đánh).
export const AIM_RANGE = 2.3;
// Đánh sớm/muộn làm lệch điểm rơi theo phương ngang tối đa bao nhiêu mét.
export const TIMING_X_OFFSET = 1.1;
// Vị trí lý tưởng: bóng ở trước người khoảng này (theo hướng nhìn ra lưới).
export const IDEAL_CONTACT_FRONT = 0.35;
export const TIMING_SPAN = 0.8;
export const PERFECT_TIMING = 0.25;
// Aim assist: quỹ đạo phải cao hơn mép lưới ít nhất ngần này.
export const NET_CLEAR_MARGIN = 0.1;
// Không cho điểm rơi sát vạch quá, tránh "out oan" do làm tròn.
export const TARGET_EDGE_MARGIN = 0.25;

// ---------- Nhịp trận (GĐ1) ----------
export const DEAD_BALL_DELAY = 1.2; // chờ bao lâu rồi phát bóng mới
export const FEED_FLIGHT_TIME = 1.35;
export const FEED_DEPTH = 4.6;
