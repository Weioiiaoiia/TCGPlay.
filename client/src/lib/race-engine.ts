/**
 * Card Race Engine v5 — 纵向深渊竞速引擎
 * v5: 真正的随机赛跑 — 每张卡牌都有机会逆袭成第一名
 *     随机加速/减速事件让比赛过程充满悬念
 *     第一名12-13s完赛，最后一名≤22s完赛
 *     过程完全不确定，结果随机
 */

import type { RenaissCard } from "./renaiss-race";

// ── 赛道主题 ──
export type TrackTheme = "starlight-garden" | "golden-canyon" | "crystal-palace";

export const TRACK_THEMES: { id: TrackTheme; name: string; nameEn: string; color: string; bgGradient: string }[] = [
  {
    id: "starlight-garden",
    name: "Starlight Garden",
    nameEn: "Starlight Garden",
    color: "#d4a853",
    bgGradient: "linear-gradient(180deg, #1a1530 0%, #1e1838 30%, #16122a 60%, #0e0b1e 100%)",
  },
  {
    id: "golden-canyon",
    name: "Golden Canyon",
    nameEn: "Golden Canyon",
    color: "#e8c170",
    bgGradient: "linear-gradient(180deg, #1c1610 0%, #221a12 30%, #1a1410 60%, #120e0a 100%)",
  },
  {
    id: "crystal-palace",
    name: "Crystal Palace",
    nameEn: "Crystal Palace",
    color: "#b8a9d4",
    bgGradient: "linear-gradient(180deg, #161428 0%, #1a1630 30%, #141225 60%, #0c0a1a 100%)",
  },
];

// ── 道具系统 ──
export type PowerUpType = "nitro-burst" | "gravity-well" | "phase-shift" | "emp-pulse" | "time-warp";

export interface PowerUp {
  type: PowerUpType;
  name: string;
  description: string;
  color: string;
  icon: string;
}

export const POWER_UPS: PowerUp[] = [
  { type: "nitro-burst", name: "Nitro Burst", description: "Instant speed boost", color: "#d4a853", icon: "" },
  { type: "gravity-well", name: "Gravity Well", description: "Slow down nearby opponents", color: "#c47a5a", icon: "" },
  { type: "phase-shift", name: "Phase Shift", description: "Teleport forward", color: "#b8a9d4", icon: "" },
  { type: "emp-pulse", name: "EMP Pulse", description: "Stall the leader briefly", color: "#e8c170", icon: "" },
  { type: "time-warp", name: "Time Warp", description: "Slow all opponents briefly", color: "#a8c4a0", icon: "" },
];

// ── 赛道事件类型 ──
export type TrackEventType =
  | "speed-zone" | "slow-zone" | "bounce-pad" | "wind-gust"
  | "energy-drain" | "turbo-stream" | "gravity-flip" | "shortcut";

// ── 趣味标签 ──
export const FUN_TAGS = [
  "Comeback King", "Rock Steady", "Overtake Master", "Rocket Start",
  "Power-Up Lucky", "Final Sprinter", "Crash Maker", "Against All Odds",
  "Led All Way", "Late Bloomer", "Drama King", "Speed Demon",
  "Trap Harvester", "Lightning", "Unbreakable", "Drift King",
];

// ── 赛跑选手 ──
export interface Racer {
  id: string;
  wallet: string;
  card: RenaissCard;
  progress: number;
  lane: number;
  speed: number;
  baseSpeed: number;
  stamina: number;
  luck: number;
  momentum: number;
  targetFinishTime: number;
  targetRank: number;
  scaleX: number;
  scaleY: number;
  offsetX: number;
  offsetY: number;
  rotation: number;
  glowIntensity: number;
  trailLength: number;
  finished: boolean;
  finishTime: number | null;
  rank: number | null;
  activePowerUp: PowerUpType | null;
  powerUpTimer: number;
  lastEvent: string;
  lastEventTime: number;
  funTag: string;
  collisions: number;
  powerUpsUsed: number;
  overtakes: number;
  maxSpeed: number;
  leadTime: number;
  prevRank: number;
  // v5: 随机加速系统
  boostTimer: number;      // 当前加速/减速剩余时间
  boostMultiplier: number;  // 当前加速倍率 (>1加速, <1减速)
}

// ── 镜头状态 ──
export interface CameraState {
  focusId: string;
  focusProgress: number;
  smoothProgress: number;
  shakeX: number;
  shakeY: number;
  zoom: number;
}

/**
 * 基于卡牌链上属性计算赛跑属性
 * v5: 属性差异很小，主要靠随机事件决定胜负
 */
export function calculateRacerStats(card: RenaissCard): { speed: number; stamina: number; luck: number } {
  let speed = 1.8;
  let stamina = 1.0;
  let luck = 0.5;

  const gradeMatch = card.grade?.match(/(\d+(\.\d+)?)/);
  if (gradeMatch) {
    speed += parseFloat(gradeMatch[1]) * 0.05; // 极小的属性影响
  }

  const yearMatch = card.year?.match(/(\d{4})/);
  if (yearMatch) {
    const age = 2030 - parseInt(yearMatch[1]);
    stamina += age * 0.03;
  }

  if (card.serial) {
    const hash = card.serial.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
    speed += (hash % 10) * 0.01;
    luck += (hash % 15) * 0.04;
  }

  if (card.name) {
    stamina += (card.name.length % 10) * 0.01;
  }

  return {
    speed: Math.max(1.6, Math.min(2.2, speed)),  // 极小的速度范围差异
    stamina: Math.max(0.5, Math.min(2.0, stamina)),
    luck: Math.max(0.3, Math.min(1.5, luck)),
  };
}

/**
 * 创建赛跑选手
 */
export function createRacer(wallet: string, card: RenaissCard, lane: number): Racer {
  const stats = calculateRacerStats(card);
  return {
    id: `${wallet}-${card.tokenId}`,
    wallet,
    card,
    progress: 0,
    lane,
    speed: stats.speed,
    baseSpeed: stats.speed,
    stamina: stats.stamina,
    luck: stats.luck,
    momentum: 0,
    targetFinishTime: 0,
    targetRank: 0,
    scaleX: 1,
    scaleY: 1,
    offsetX: 0,
    offsetY: 0,
    rotation: 0,
    glowIntensity: 0,
    trailLength: 0,
    finished: false,
    finishTime: null,
    rank: null,
    activePowerUp: null,
    powerUpTimer: 0,
    lastEvent: "",
    lastEventTime: 0,
    funTag: "",
    collisions: 0,
    powerUpsUsed: 0,
    overtakes: 0,
    maxSpeed: 0,
    leadTime: 0,
    prevRank: lane + 1,
    boostTimer: 0,
    boostMultiplier: 1,
  };
}

// ── 游戏模式 ──
export type GameMode = "friend-battle" | "chain-adventure";

export interface GameModeInfo {
  id: GameMode;
  name: string;
  nameEn: string;
  description: string;
  icon: string;
  maxPlayers: string;
  color: string;
}

export const GAME_MODES: GameModeInfo[] = [
  {
    id: "friend-battle",
    name: "Friend Battle",
    nameEn: "Friend Battle",
    description: "Enter friends' wallet addresses for a head-to-head card race. No player limit!",
    icon: "swords",
    maxPlayers: "2+ players, no limit",
    color: "#d4a853",
  },
  {
    id: "chain-adventure",
    name: "Random Match",
    nameEn: "Random Match",
    description: "Choose opponent count, randomly match real on-chain card holders!",
    icon: "crystal",
    maxPlayers: "2-10 players",
    color: "#7c5cbf",
  },
];

export interface RaceEvent {
  type: "collision" | "trap" | "powerup" | "portal-forward" | "portal-back" | "finish"
    | "overtake" | "speed-zone" | "slow-zone" | "bounce" | "drama" | "comeback";
  racerId: string;
  message: string;
  importance: number;
}

// ══════════════════════════════════════
// v5 随机赛跑系统
// 核心思路：所有选手基础速度几乎相同
// 通过频繁的随机加速/减速事件制造位置变化
// 任何选手都可能在任何时刻冲到第一
// 用全局节奏控制确保12-22秒完赛
// ══════════════════════════════════════

let raceGlobalSeed = 0;
let raceNumRacers = 0;

/**
 * 初始化比赛
 */
export function initRaceTarget(seed: number, racers?: Racer[]): Racer[] | void {
  raceGlobalSeed = seed;
  if (!racers || racers.length === 0) return;
  raceNumRacers = racers.length;
  // v5: 不预分配目标时间，比赛过程完全随机
  return [...racers];
}

/**
 * 确定性随机数生成器
 */
function seededRandom(seed: number): number {
  const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
}

/**
 * 基于种子的平滑噪声（Perlin-like），让速度变化更自然
 */
function smoothNoise(seed: number, t: number, freq: number): number {
  const i = Math.floor(t * freq);
  const f = (t * freq) - i;
  // 平滑插值
  const smooth = f * f * (3 - 2 * f);
  const a = seededRandom(seed + i);
  const b = seededRandom(seed + i + 1);
  return a + (b - a) * smooth;
}

/**
 * 赛跑物理引擎 - 每帧更新
 * v5: 真正的随机赛跑，每张卡牌都有机会逆袭
 */
export function updateRace(
  racers: Racer[],
  elapsed: number,
  seed: number
): { racers: Racer[]; events: RaceEvent[]; allFinished: boolean; camera: CameraState } {
  const events: RaceEvent[] = [];
  let finishCount = racers.filter(r => r.finished).length;
  const n = racers.length;

  // 计算当前排名
  const sortedByProgress = [...racers].filter(r => !r.finished).sort((a, b) => b.progress - a.progress);
  const totalActive = sortedByProgress.length;

  // ═══ 全局节奏控制 ═══
  // 目标：第一名12-13s完赛，整体比赛在22s内结束
  // 通过动态调整全局速度倍率来控制节奏
  const leaderProgress = sortedByProgress.length > 0 ? sortedByProgress[0].progress : 100;
  const lastProgress = sortedByProgress.length > 0 ? sortedByProgress[sortedByProgress.length - 1].progress : 100;

  // 理想的领先者进度曲线（S曲线）
  let idealLeaderProgress: number;
  const targetFirstFinish = 12.5; // 第一名目标完赛时间
  const tNorm = elapsed / targetFirstFinish;
  if (tNorm < 0.15) {
    idealLeaderProgress = (tNorm / 0.15) * (tNorm / 0.15) * 10;
  } else if (tNorm < 0.7) {
    idealLeaderProgress = 10 + ((tNorm - 0.15) / 0.55) * 70;
  } else if (tNorm < 1.0) {
    const p = (tNorm - 0.7) / 0.3;
    idealLeaderProgress = 80 + (1 - (1 - p) * (1 - p)) * 20;
  } else {
    idealLeaderProgress = 100;
  }

  // 全局速度调节：让领先者大致跟随理想曲线
  const progressError = idealLeaderProgress - leaderProgress;
  const globalSpeedAdjust = 1.0 + progressError * 0.03;

  // 超时保护：22秒后强制加速所有未完赛选手
  const overtimeBoost = elapsed > 20 ? 1 + (elapsed - 20) * 0.8 : 1;

  const updated = racers.map((r, idx) => {
    if (r.finished) return r;

    const racer = { ...r };
    const currentRank = sortedByProgress.findIndex(s => s.id === racer.id) + 1;

    // ═══ 基础速度（所有选手几乎相同）═══
    let currentSpeed = racer.baseSpeed;

    // ═══ 核心：随机速度波动（制造位置变化的关键）═══
    // 每个选手有独立的噪声频率，产生不同节奏的速度变化
    const noiseFreq1 = 1.5 + (idx * 0.3); // 慢波：大趋势
    const noiseFreq2 = 4.0 + (idx * 0.5); // 快波：快速抖动
    const noiseFreq3 = 0.6 + (idx * 0.15); // 超慢波：长期趋势变化

    const slowWave = smoothNoise(seed + idx * 1000, elapsed, noiseFreq1) * 2 - 1; // -1 to 1
    const fastWave = smoothNoise(seed + idx * 2000 + 500, elapsed, noiseFreq2) * 2 - 1;
    const trendWave = smoothNoise(seed + idx * 3000 + 999, elapsed, noiseFreq3) * 2 - 1;

    // 波动幅度随比赛进行变化：开头小，中段大，尾段收敛
    let waveAmplitude: number;
    if (elapsed < 3) {
      waveAmplitude = 0.3 + elapsed * 0.15; // 开头慢慢增大
    } else if (elapsed < 15) {
      waveAmplitude = 0.8; // 中段最大波动
    } else {
      waveAmplitude = 0.8 - (elapsed - 15) * 0.05; // 尾段收敛
    }
    waveAmplitude = Math.max(0.2, waveAmplitude);

    currentSpeed += (slowWave * 0.6 + fastWave * 0.25 + trendWave * 0.4) * waveAmplitude;

    // ═══ 随机爆发加速（逆袭的关键！）═══
    if (racer.boostTimer > 0) {
      racer.boostTimer -= 0.06;
      currentSpeed *= racer.boostMultiplier;

      // 视觉效果
      if (racer.boostMultiplier > 1.3) {
        racer.glowIntensity = Math.min(1, racer.glowIntensity + 0.05);
        racer.trailLength = Math.min(5, racer.trailLength + 0.1);
      }
    } else {
      racer.boostMultiplier = 1;
    }

    // 随机触发加速/减速事件（高频率！让排名不断变化）
    const boostChance = seededRandom(seed + Math.floor(elapsed * 16.67) + idx * 31);
    if (racer.boostTimer <= 0 && boostChance > 0.92) {
      const boostType = seededRandom(seed + Math.floor(elapsed * 10) + idx * 71);

      if (boostType > 0.55) {
        // 加速爆发！
        racer.boostMultiplier = 1.4 + seededRandom(seed + idx + Math.floor(elapsed * 5)) * 0.8; // 1.4x - 2.2x
        racer.boostTimer = 0.8 + seededRandom(seed + idx * 3 + Math.floor(elapsed * 7)) * 1.2; // 0.8-2秒
        racer.lastEvent = "Turbo boost!";
        racer.lastEventTime = elapsed;
        racer.scaleX = 0.85;
        racer.scaleY = 1.2;
        racer.glowIntensity = 1;
        racer.trailLength = 4;
        events.push({
          type: "speed-zone",
          racerId: racer.id,
          message: `${racer.card.name} turbo boost!`,
          importance: 2,
        });
      } else if (boostType > 0.2) {
        // 减速！
        racer.boostMultiplier = 0.4 + seededRandom(seed + idx * 5 + Math.floor(elapsed * 3)) * 0.3; // 0.4x - 0.7x
        racer.boostTimer = 0.5 + seededRandom(seed + idx * 7 + Math.floor(elapsed * 9)) * 0.8; // 0.5-1.3秒
        racer.lastEvent = "Stumble!";
        racer.lastEventTime = elapsed;
        racer.scaleX = 1.2;
        racer.scaleY = 0.8;
        events.push({
          type: "slow-zone",
          racerId: racer.id,
          message: `${racer.card.name} stumbled!`,
          importance: 1,
        });
      } else {
        // 超级爆发（稀有！逆袭神器）
        racer.boostMultiplier = 2.0 + seededRandom(seed + idx * 11 + Math.floor(elapsed * 13)) * 1.0; // 2x - 3x
        racer.boostTimer = 1.0 + seededRandom(seed + idx * 13 + Math.floor(elapsed * 11)) * 1.0; // 1-2秒
        racer.lastEvent = "MEGA BOOST!";
        racer.lastEventTime = elapsed;
        racer.scaleX = 0.8;
        racer.scaleY = 1.3;
        racer.glowIntensity = 1;
        racer.trailLength = 5;
        racer.momentum += 0.5;
        events.push({
          type: "comeback",
          racerId: racer.id,
          message: `${racer.card.name} MEGA BOOST! Incredible surge!`,
          importance: 3,
        });
      }
    }

    // ═══ 道具系统 ═══
    if (racer.activePowerUp) {
      racer.powerUpTimer -= 0.06;
      if (racer.powerUpTimer <= 0) {
        racer.activePowerUp = null;
        racer.glowIntensity = Math.max(0, racer.glowIntensity - 0.3);
      } else {
        switch (racer.activePowerUp) {
          case "nitro-burst":
            currentSpeed *= 1.5;
            racer.scaleX = 0.9;
            racer.scaleY = 1.15;
            racer.glowIntensity = 1;
            racer.trailLength = 3;
            break;
          case "gravity-well":
            racer.glowIntensity = 0.7;
            break;
          case "phase-shift":
            racer.glowIntensity = 0.5;
            break;
          case "emp-pulse":
            racer.glowIntensity = 0.8;
            break;
          case "time-warp":
            currentSpeed *= 1.3;
            racer.glowIntensity = 0.6;
            break;
        }
      }
    }

    // ═══ 被其他选手道具影响 ═══
    racers.forEach(other => {
      if (other.id === racer.id || other.finished) return;
      const dist = Math.abs(other.progress - racer.progress);
      if (dist < 8) {
        if (other.activePowerUp === "gravity-well" && other.powerUpTimer > 0) {
          currentSpeed *= 0.7;
          racer.lastEvent = "Gravity pull!";
          racer.lastEventTime = elapsed;
        }
        if (other.activePowerUp === "emp-pulse" && other.powerUpTimer > 0 && racer.progress > other.progress) {
          currentSpeed *= 0.5;
          racer.lastEvent = "EMP hit!";
          racer.lastEventTime = elapsed;
        }
        if (other.activePowerUp === "time-warp" && other.powerUpTimer > 0) {
          currentSpeed *= 0.75;
        }
      }
    });

    // ═══ 随机道具触发 ═══
    {
      const powerUpChance = 0.005 + racer.luck * 0.002;
      if (!racer.activePowerUp && seededRandom(seed + elapsed * 50 + idx * 7) > (1 - powerUpChance)) {
        const powerUp = POWER_UPS[Math.floor(seededRandom(seed + idx * 13 + elapsed) * POWER_UPS.length)];
        racer.activePowerUp = powerUp.type;
        racer.powerUpTimer = 1.5 + seededRandom(seed + idx + elapsed) * 1.5;
        racer.powerUpsUsed++;

        if (powerUp.type === "phase-shift") {
          const teleport = seededRandom(seed + idx + elapsed * 3);
          if (teleport > 0.4) {
            const jump = 3 + seededRandom(seed + idx * 2 + elapsed) * 5;
            racer.progress = Math.min(95, racer.progress + jump);
            events.push({
              type: "portal-forward",
              racerId: racer.id,
              message: `${racer.card.name} phase jumped forward!`,
              importance: 2,
            });
          } else {
            racer.progress = Math.max(3, racer.progress - 3);
            events.push({
              type: "portal-back",
              racerId: racer.id,
              message: `${racer.card.name} phase jump failed!`,
              importance: 2,
            });
          }
        } else {
          events.push({
            type: "powerup",
            racerId: racer.id,
            message: `${racer.card.name} got ${powerUp.name}!`,
            importance: 1,
          });
        }
      }
    }

    // ═══ 随机赛道事件（视觉效果）═══
    const eventRate = 0.012;
    if (seededRandom(seed + elapsed * 30 + idx * 11) > (1 - eventRate)) {
      const eventType = seededRandom(seed + idx * 17 + elapsed);

      if (eventType < 0.15) {
        racer.scaleX = 1.3;
        racer.scaleY = 0.7;
        racer.offsetX = (seededRandom(seed + idx + elapsed * 2) - 0.5) * 30;
        racer.collisions++;
        racer.momentum = Math.max(0, racer.momentum - 0.2);
        racer.lastEvent = "Collision!";
        racer.lastEventTime = elapsed;
        events.push({ type: "collision", racerId: racer.id, message: `${racer.card.name} collision!`, importance: 1 });
      } else if (eventType < 0.25) {
        racer.scaleY = 1.3;
        racer.scaleX = 0.8;
        racer.lastEvent = "Trapped!";
        racer.lastEventTime = elapsed;
        events.push({ type: "trap", racerId: racer.id, message: `${racer.card.name} trapped!`, importance: 2 });
      } else if (eventType < 0.4) {
        racer.offsetY = -25;
        racer.scaleY = 0.7;
        racer.lastEvent = "Bounce!";
        racer.lastEventTime = elapsed;
        events.push({ type: "bounce", racerId: racer.id, message: `${racer.card.name} bounce!`, importance: 0 });
      } else if (eventType < 0.55) {
        racer.glowIntensity = 0.6;
        racer.trailLength = 2;
        racer.lastEvent = "Speed zone!";
        racer.lastEventTime = elapsed;
        events.push({ type: "speed-zone", racerId: racer.id, message: `${racer.card.name} speed zone!`, importance: 0 });
      } else if (eventType < 0.65) {
        racer.lastEvent = "Slow zone!";
        racer.lastEventTime = elapsed;
        events.push({ type: "slow-zone", racerId: racer.id, message: `${racer.card.name} slow zone!`, importance: 0 });
      } else if (eventType < 0.75) {
        racer.rotation = (seededRandom(seed + idx + elapsed) - 0.5) * 15;
        racer.lastEvent = "Wind gust!";
        racer.lastEventTime = elapsed;
      } else if (eventType < 0.88) {
        racer.glowIntensity = 1;
        racer.trailLength = 4;
        racer.lastEvent = "Energy burst!";
        racer.lastEventTime = elapsed;
        events.push({ type: "speed-zone", racerId: racer.id, message: `${racer.card.name} energy burst!`, importance: 2 });
      } else {
        racer.offsetX = (seededRandom(seed + idx + elapsed) - 0.5) * 40;
        racer.rotation = (seededRandom(seed + idx * 2 + elapsed) - 0.5) * 10;
      }
    }

    // ═══ 戏剧性事件 ═══
    if (elapsed > 4 && racer.progress > 20 && racer.progress < 92) {
      // 领先者可能被"命运之手"减速
      if (currentRank === 1 && seededRandom(seed + elapsed * 77 + idx) > 0.992) {
        currentSpeed *= 0.3;
        racer.momentum = 0;
        racer.boostTimer = 0;
        racer.boostMultiplier = 1;
        racer.lastEvent = "Hand of fate!";
        racer.lastEventTime = elapsed;
        racer.scaleX = 1.2;
        racer.scaleY = 0.8;
        events.push({
          type: "drama",
          racerId: racer.id,
          message: `${racer.card.name} struck by hand of fate!`,
          importance: 3,
        });
      }

      // 最后一名获得逆袭之力
      if (currentRank === totalActive && totalActive > 1 && seededRandom(seed + elapsed * 88 + idx) > 0.985) {
        racer.boostMultiplier = 2.5;
        racer.boostTimer = 2.0;
        racer.momentum += 0.5;
        racer.glowIntensity = 1;
        racer.trailLength = 5;
        racer.lastEvent = "Comeback surge!";
        racer.lastEventTime = elapsed;
        events.push({
          type: "comeback",
          racerId: racer.id,
          message: `${racer.card.name} comeback surge! Racing to the front!`,
          importance: 3,
        });
      }
    }

    // ═══ 动量系统 ═══
    const momentumBonus = racer.momentum * 0.08;
    currentSpeed += momentumBonus;

    // ═══ 冲刺阶段（最后15%加速）═══
    if (racer.progress > 85) {
      const sprintBonus = (racer.progress - 85) / 15 * 0.5;
      currentSpeed += sprintBonus;
      racer.glowIntensity = Math.min(1, racer.glowIntensity + 0.02);
      racer.trailLength = Math.min(4, racer.trailLength + 0.03);
    }

    // ═══ 应用全局速度调节 ═══
    currentSpeed *= globalSpeedAdjust * overtimeBoost;

    // ═══ 物理形变恢复 ═══
    racer.scaleX += (1 - racer.scaleX) * 0.12;
    racer.scaleY += (1 - racer.scaleY) * 0.12;
    racer.offsetX += (0 - racer.offsetX) * 0.08;
    racer.offsetY += (0 - racer.offsetY) * 0.1;
    racer.rotation += (0 - racer.rotation) * 0.08;
    racer.glowIntensity = Math.max(0, racer.glowIntensity - 0.01);
    racer.trailLength = Math.max(0, racer.trailLength - 0.05);

    // ═══ 动量衰减 ═══
    racer.momentum = Math.max(0, racer.momentum - 0.004);

    // ═══ 进度更新 ═══
    currentSpeed = Math.max(0.1, currentSpeed);
    racer.speed = currentSpeed;
    racer.maxSpeed = Math.max(racer.maxSpeed, racer.speed);

    // 进度步进（调整系数控制整体比赛时长）
    racer.progress = Math.min(100, racer.progress + currentSpeed * 0.20);

    // 动量积累
    if (currentSpeed > racer.baseSpeed * 1.2) {
      racer.momentum = Math.min(2, racer.momentum + 0.01);
    }

    // ═══ 超车检测 ═══
    const newRank = sortedByProgress.findIndex(s => s.id === racer.id) + 1;
    if (newRank < racer.prevRank && racer.prevRank > 0) {
      racer.overtakes++;
      if (newRank <= 3) {
        events.push({
          type: "overtake",
          racerId: racer.id,
          message: `${racer.card.name} overtook to #${newRank}!`,
          importance: newRank === 1 ? 3 : 2,
        });
      }
    }
    racer.prevRank = newRank;

    if (newRank === 1) {
      racer.leadTime += 0.06;
    }

    // ═══ 冲线 ═══
    if (racer.progress >= 100 && !racer.finished) {
      finishCount++;
      racer.finished = true;
      racer.finishTime = elapsed;
      racer.rank = finishCount;
      racer.progress = 100;
      racer.glowIntensity = 1;
      racer.trailLength = 0;
      events.push({
        type: "finish",
        racerId: racer.id,
        message: `${racer.card.name} finished #${finishCount}!`,
        importance: finishCount <= 3 ? 3 : 2,
      });
    }

    return racer;
  });

  const camera = calculateCamera(updated);

  return {
    racers: updated,
    events,
    allFinished: finishCount >= racers.length,
    camera,
  };
}

// Previous camera state for smooth transitions
let prevCameraFocusId = "";
let prevSmoothProgress = 0;

function calculateCamera(racers: Racer[]): CameraState {
  const activeRacers = [...racers].filter(r => !r.finished);
  activeRacers.sort((a, b) => b.progress - a.progress);
  const leader = activeRacers[0];

  let focusRacer: Racer | undefined;
  if (leader) {
    focusRacer = leader;
  } else {
    const byFinish = [...racers].sort((a, b) => (b.finishTime || 0) - (a.finishTime || 0));
    focusRacer = byFinish[0];
  }

  if (!focusRacer) {
    return { focusId: "", focusProgress: 0, smoothProgress: 0, shakeX: 0, shakeY: 0, zoom: 1 };
  }

  const targetProgress = focusRacer.progress;

  if (prevCameraFocusId !== focusRacer.id) {
    prevCameraFocusId = focusRacer.id;
  }

  const lerpSpeed = 0.08;
  prevSmoothProgress = prevSmoothProgress + (targetProgress - prevSmoothProgress) * lerpSpeed;

  const shakeIntensity = Math.min(1, focusRacer.speed / 8);
  const shakeX = (Math.random() - 0.5) * shakeIntensity * 3;
  const shakeY = (Math.random() - 0.5) * shakeIntensity * 2;

  const zoom = targetProgress > 85 ? 0.93 : 1;

  return {
    focusId: focusRacer.id,
    focusProgress: targetProgress,
    smoothProgress: prevSmoothProgress,
    shakeX,
    shakeY,
    zoom,
  };
}

/**
 * 为选手分配趣味标签
 */
export function assignFunTags(racers: Racer[]): Racer[] {
  const sorted = [...racers].sort((a, b) => (a.rank || 99) - (b.rank || 99));

  const mostCollisions = [...racers].sort((a, b) => b.collisions - a.collisions)[0];
  if (mostCollisions && mostCollisions.collisions > 0) mostCollisions.funTag = "Crash Maker";

  const mostPowerUps = [...racers].sort((a, b) => b.powerUpsUsed - a.powerUpsUsed)[0];
  if (mostPowerUps && !mostPowerUps.funTag) mostPowerUps.funTag = "Power-Up Lucky";

  const mostOvertakes = [...racers].sort((a, b) => b.overtakes - a.overtakes)[0];
  if (mostOvertakes && mostOvertakes.overtakes > 0 && !mostOvertakes.funTag) mostOvertakes.funTag = "Overtake Master";

  const mostLead = [...racers].sort((a, b) => b.leadTime - a.leadTime)[0];
  if (mostLead && !mostLead.funTag) mostLead.funTag = "Led All Way";

  const fastestSpeed = [...racers].sort((a, b) => b.maxSpeed - a.maxSpeed)[0];
  if (fastestSpeed && !fastestSpeed.funTag) fastestSpeed.funTag = "Speed Demon";

  const lastPlace = sorted[sorted.length - 1];
  if (lastPlace && lastPlace.overtakes > 2 && !lastPlace.funTag) lastPlace.funTag = "Late Bloomer";

  sorted.forEach(r => {
    if (!r.funTag) {
      const available = FUN_TAGS.filter(t => !sorted.some(s => s.funTag === t));
      if (available.length > 0) {
        r.funTag = available[Math.floor(Math.random() * available.length)];
      }
    }
  });

  return sorted;
}
