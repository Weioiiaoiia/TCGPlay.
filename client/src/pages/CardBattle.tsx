/**
 * TCG Card Battle
 * Style: Deep Cosmic Luxury — Spotlight Circular Stage
 * Cards: Real on-chain Renaiss card images (no extra decoration)
 * Integrated into TCGPlay with server-side proxy API
 */

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Swords, Crown, Skull, Shield, Zap, Heart,
  Plus, Trash2, Loader2, Shuffle, Users, Wallet,
  RotateCcw, Target, X, LogOut, ArrowLeft
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useT } from "@/i18n";

import {
  type RenaissCard,
  pickRandomCardFromWallet,
  fetchBatchRandomCards,
  batchPickFromWallets,
} from "@/lib/renaiss-race";

/* ═══════ Types ═══════ */

interface BattleCard {
  id: string;
  name: string;
  image: string;
  grade: string;
  year: string;
  serial: string;
  set: string;
  owner: string;
  ownerShort: string;
  ownerLabel: string;
  x: number; y: number;
  vx: number; vy: number;
  hp: number; maxHp: number;
  attack: number; defense: number; speed: number;
  alive: boolean;
  fragments: Fragment[];
  fragFade: number;
  borderHue: number;
  isPlayer: boolean;
  targetId: string | null;
}

interface Fragment {
  x: number; y: number;
  vx: number; vy: number;
  size: number; rotation: number; rotSpeed: number;
  opacity: number; color: string; gravity: number;
}

type Phase = "setup" | "loading" | "countdown" | "battle" | "result";
type Mode = "random" | "friends";

/* ═══════ Constants ═══════ */
const CARD_W = 90;
const CARD_H = 126;
const COLLISION_DIST = 95;
const BORDER_HUES = [45, 270, 150, 0, 200, 330, 30, 180, 60, 300];
const FRAG_FADE_FRAMES = 80;
const STAGE_W = 800;
const STAGE_H = 600;
const MAX_BATTLE_FRAMES = 60 * 60; /* 60fps * 60s = 1min max */
const OVERTIME_DMG = 30; /* overtime damage per second */

/* ═══════ Random Stats — HP -30%, wide ATK/DEF range ═══════ */
function randomStats() {
  const hp = Math.round(280 + Math.random() * 210);
  const attack = Math.round(8 + Math.random() * 22);
  const defense = Math.round(2 + Math.random() * 15);
  const speed = 0.8 + Math.random() * 1.0;
  return { hp, maxHp: hp, attack, defense, speed };
}

/* ═══════ Fragments ═══════ */
function generateFragments(x: number, y: number, hue: number): Fragment[] {
  const frags: Fragment[] = [];
  const colors = [
    `hsl(${hue}, 65%, 45%)`, `hsl(${hue}, 55%, 35%)`, `hsl(${hue}, 75%, 55%)`,
    `hsl(${hue + 15}, 50%, 40%)`, `hsl(${hue - 15}, 55%, 30%)`,
    "#d4a853", "#c9a040", "#1a1145", "#2a1a3a", "#f0d78c",
  ];
  for (let i = 0; i < 48; i++) {
    const angle = Math.random() * Math.PI * 2;
    const spd = 2 + Math.random() * 7;
    frags.push({
      x: x + (Math.random() - 0.5) * 70,
      y: y + (Math.random() - 0.5) * 90,
      vx: Math.cos(angle) * spd,
      vy: Math.sin(angle) * spd - 4,
      size: 4 + Math.random() * 12,
      rotation: Math.random() * 360,
      rotSpeed: (Math.random() - 0.5) * 20,
      opacity: 1,
      color: colors[Math.floor(Math.random() * colors.length)],
      gravity: 0.18 + Math.random() * 0.14,
    });
  }
  return frags;
}

/* ═══════ Canvas Helpers ═══════ */
function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function shortenAddress(addr: string): string {
  if (!addr || addr.length < 10) return addr;
  return addr.slice(0, 6) + "..." + addr.slice(-4);
}

/* ═══════════════════════════════════════════
   Main Component
   ═══════════════════════════════════════════ */

export default function CardBattle() {
  const { isLoggedIn, user } = useAuth();
  const t = useT();
  const [phase, setPhase] = useState<Phase>("setup");
  const [mode, setMode] = useState<Mode>("random");
  const [myWallet, setMyWallet] = useState("");
  const [friendWallets, setFriendWallets] = useState<string[]>([""]);
  const [battleCards, setBattleCards] = useState<BattleCard[]>([]);
  const [countdown, setCountdown] = useState(3);
  const [winner, setWinner] = useState<BattleCard | null>(null);
  const [battleLog, setBattleLog] = useState<string[]>([]);
  const [loadingMsg, setLoadingMsg] = useState("");
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [error, setError] = useState("");
  const [matchPlayerCount, setMatchPlayerCount] = useState(6);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const cardsRef = useRef<BattleCard[]>([]);
  const cardImagesRef = useRef<Map<string, HTMLImageElement>>(new Map());
  const battleActiveRef = useRef(false);

  // Auto-fill wallet from auth context
  useEffect(() => {
    if (user?.wallet && !myWallet) {
      setMyWallet(user.wallet);
    }
  }, [user, myWallet]);

  /* Friend wallet management */
  const addFriendWallet = () => setFriendWallets([...friendWallets, ""]);
  const removeFriendWallet = (idx: number) => setFriendWallets(friendWallets.filter((_, i) => i !== idx));
  const updateFriendWallet = (idx: number, val: string) => {
    const next = [...friendWallets]; next[idx] = val; setFriendWallets(next);
  };

  /* Preload images */
  const preloadImages = useCallback((cards: BattleCard[]) => {
    cards.forEach((card) => {
      if (!cardImagesRef.current.has(card.id)) {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.src = card.image;
        cardImagesRef.current.set(card.id, img);
      }
    });
  }, []);

  /* RenaissCard → BattleCard */
  const toBattleCard = useCallback((card: RenaissCard, index: number, total: number, label: string, isPlayer: boolean): BattleCard => {
    const stats = randomStats();
    const cx = STAGE_W / 2, cy = STAGE_H / 2;
    const radius = Math.min(STAGE_W, STAGE_H) * 0.25;
    const angle = (index / total) * Math.PI * 2 - Math.PI / 2;
    const moveAngle = Math.random() * Math.PI * 2;
    return {
      id: card.tokenId, name: card.name, image: card.image,
      grade: card.grade, year: card.year, serial: card.serial,
      set: card.set, owner: card.owner || "Unknown", ownerShort: shortenAddress(card.owner || "Unknown"),
      ownerLabel: label, ...stats,
      x: cx + Math.cos(angle) * radius,
      y: cy + Math.sin(angle) * radius,
      vx: Math.cos(moveAngle) * stats.speed,
      vy: Math.sin(moveAngle) * stats.speed,
      alive: true,
      fragments: [], fragFade: -1,
      borderHue: BORDER_HUES[index % BORDER_HUES.length],
      isPlayer,
      targetId: null,
    };
  }, []);

  /* ═══════ Random Match — using server proxy API ═══════ */
  const startRandomMatch = useCallback(async () => {
    if (!myWallet.trim()) { setError("Please enter your wallet address"); return; }
    setError(""); setPhase("loading"); setLoadingMsg("Connecting to BSC chain..."); setLoadingProgress(0);
    const opponentCount = matchPlayerCount - 1;
    try {
      setLoadingProgress(10);
      setLoadingMsg("Fetching your card...");
      const myCard = await pickRandomCardFromWallet(myWallet.trim(), (msg) => setLoadingMsg(msg));
      if (!myCard) { setError("No Renaiss cards found in your wallet"); setPhase("setup"); return; }
      setLoadingProgress(20);
      setLoadingMsg(`Finding ${opponentCount} opponents...`);
      const opponentCards = await fetchBatchRandomCards(opponentCount, (msg) => setLoadingMsg(msg));
      if (opponentCards.length < 1) { setError("Not enough opponents found, please retry"); setPhase("setup"); return; }
      setLoadingProgress(100);
      const allCards = [myCard, ...opponentCards];
      const total = allCards.length;
      const bCards: BattleCard[] = allCards.map((c, i) => toBattleCard(c, i, total, i === 0 ? "You" : `Player ${i + 1}`, i === 0));
      preloadImages(bCards);
      setBattleCards(bCards); cardsRef.current = bCards;
      setBattleLog([]); setWinner(null);
      setTimeout(() => {
        setPhase("countdown"); setCountdown(3);
        let c = 3;
        const timer = setInterval(() => { c--; setCountdown(c); if (c <= 0) { clearInterval(timer); setPhase("battle"); runBattle(bCards); } }, 1000);
      }, 400);
    } catch (err: any) { setError(err?.message || "Failed to connect on-chain"); setPhase("setup"); }
  }, [myWallet, matchPlayerCount, toBattleCard, preloadImages]);

  /* ═══════ Friend Battle — using server proxy API ═══════ */
  const startFriendBattle = useCallback(async () => {
    if (!myWallet.trim()) { setError("Please enter your wallet address"); return; }
    const validFriends = friendWallets.filter((w) => w.trim().length > 0);
    if (validFriends.length === 0) { setError("Please add at least one friend wallet"); return; }
    setError(""); setPhase("loading"); setLoadingMsg("Connecting to BSC chain..."); setLoadingProgress(0);
    try {
      const allWallets = [myWallet.trim(), ...validFriends.map((w) => w.trim())];
      setLoadingMsg(`Fetching cards for ${allWallets.length} wallets...`);
      setLoadingProgress(10);
      
      const results = await batchPickFromWallets(allWallets, (msg) => setLoadingMsg(msg));
      
      const allCards: RenaissCard[] = [];
      const labels: string[] = [];
      
      results.forEach((result, i) => {
        if (result.card) {
          allCards.push(result.card);
          labels.push(i === 0 ? "You" : `Friend ${String.fromCharCode(64 + i)}`);
        }
      });
      
      setLoadingProgress(90);
      
      if (allCards.length < 2) { setError("At least 2 players with cards required"); setPhase("setup"); return; }
      setLoadingProgress(100);
      const total = allCards.length;
      const bCards: BattleCard[] = allCards.map((c, i) => toBattleCard(c, i, total, labels[i], i === 0));
      preloadImages(bCards);
      setBattleCards(bCards); cardsRef.current = bCards;
      setBattleLog([]); setWinner(null);
      setTimeout(() => {
        setPhase("countdown"); setCountdown(3);
        let c = 3;
        const timer = setInterval(() => { c--; setCountdown(c); if (c <= 0) { clearInterval(timer); setPhase("battle"); runBattle(bCards); } }, 1000);
      }, 400);
    } catch (err: any) { setError(err?.message || "Failed to connect on-chain"); setPhase("setup"); }
  }, [myWallet, friendWallets, toBattleCard, preloadImages]);

  /* ═══════ Battle Engine — Target AI + Overtime ═══════ */
  const runBattle = useCallback((initialCards: BattleCard[]) => {
    const cards = initialCards.map((c) => ({ ...c }));
    cardsRef.current = cards;
    battleActiveRef.current = true;

    const collisionCooldown = new Map<string, number>();
    const COOLDOWN_FRAMES = 25;
    let frameCount = 0;

    function findNearestTarget(card: BattleCard, alive: BattleCard[]): BattleCard | null {
      let best: BattleCard | null = null;
      let bestDist = Infinity;
      for (const other of alive) {
        if (other.id === card.id) continue;
        const dx = other.x - card.x, dy = other.y - card.y;
        const d = dx * dx + dy * dy;
        if (d < bestDist) { bestDist = d; best = other; }
      }
      return best;
    }

    const tick = () => {
      if (!battleActiveRef.current) return;
      frameCount++;

      const aliveCards = cards.filter((c) => c.alive);

      if (aliveCards.length <= 1) {
        if (aliveCards.length === 1) {
          for (const card of cards) { card.fragments = []; card.fragFade = -1; }
          setWinner(aliveCards[0]);
          setBattleLog((prev) => [...prev, `${aliveCards[0].name} (${aliveCards[0].ownerLabel}) won the battle!`]);
        }
        setBattleCards([...cards]);
        setPhase("result");
        battleActiveRef.current = false;
        return;
      }

      /* Overtime: after 1 min, deal increasing damage per second */
      if (frameCount > MAX_BATTLE_FRAMES && frameCount % 60 === 0) {
        const overtimeSeconds = Math.floor((frameCount - MAX_BATTLE_FRAMES) / 60);
        const dmg = OVERTIME_DMG + overtimeSeconds * 10;
        for (const card of aliveCards) {
          card.hp -= dmg;
          if (card.hp <= 0 && card.alive) {
            const othersStillUp = aliveCards.filter(c => c !== card && c.alive && c.hp > 0).length;
            if (othersStillUp === 0) { card.hp = 1; }
            else {
              card.alive = false; card.hp = 0;
              card.fragments = generateFragments(card.x, card.y, card.borderHue);
              card.fragFade = FRAG_FADE_FRAMES;
              setBattleLog((prev) => [...prev, `${card.name} (${card.ownerLabel}) destroyed by overtime storm!`]);
            }
          }
        }
        if (overtimeSeconds === 0) {
          setBattleLog((prev) => [...prev, "Overtime! Storm damage begins!"]);
        }
      }

      const cx = STAGE_W / 2, cy = STAGE_H / 2;

      for (const card of aliveCards) {
        /* ====== Target AI: actively track nearest enemy ====== */
        const target = findNearestTarget(card, aliveCards);
        if (target) {
          card.targetId = target.id;
          const toTX = target.x - card.x;
          const toTY = target.y - card.y;
          const toTD = Math.sqrt(toTX * toTX + toTY * toTY);
          if (toTD > 1) {
            const seekForce = 0.12;
            card.vx += (toTX / toTD) * seekForce;
            card.vy += (toTY / toTD) * seekForce;
          }
        }

        /* Weak center gravity to prevent edge-sticking */
        const toCX = cx - card.x, toCY = cy - card.y;
        const toCD = Math.sqrt(toCX * toCX + toCY * toCY);
        if (toCD > 120) { card.vx += (toCX / toCD) * 0.008; card.vy += (toCY / toCD) * 0.008; }

        /* Small random perturbation for natural movement */
        card.vx += (Math.random() - 0.5) * 0.03;
        card.vy += (Math.random() - 0.5) * 0.03;

        card.x += card.vx;
        card.y += card.vy;

        /* Circular boundary bounce */
        const stageR = Math.min(STAGE_W, STAGE_H) / 2 - 45 - CARD_W / 2;
        const dx = card.x - cx, dy = card.y - cy;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > stageR) {
          const nx = dx / dist, ny = dy / dist;
          const dot = card.vx * nx + card.vy * ny;
          card.vx -= 2 * dot * nx; card.vy -= 2 * dot * ny;
          card.x = cx + nx * (stageR - 2); card.y = cy + ny * (stageR - 2);
        }

        /* Speed limit */
        const spd = Math.sqrt(card.vx * card.vx + card.vy * card.vy);
        const maxSpd = 2.5;
        const minSpd = 0.6;
        if (spd > maxSpd) { card.vx = (card.vx / spd) * maxSpd; card.vy = (card.vy / spd) * maxSpd; }
        else if (spd < minSpd && spd > 0.01) { card.vx = (card.vx / spd) * minSpd; card.vy = (card.vy / spd) * minSpd; }
      }

      /* Collision detection */
      for (let i = 0; i < aliveCards.length; i++) {
        for (let j = i + 1; j < aliveCards.length; j++) {
          const a = aliveCards[i], b = aliveCards[j];
          const ddx = a.x - b.x, ddy = a.y - b.y;
          const d = Math.sqrt(ddx * ddx + ddy * ddy);

          if (d < COLLISION_DIST) {
            const pairKey = a.id < b.id ? `${a.id}-${b.id}` : `${b.id}-${a.id}`;
            const lastCollision = collisionCooldown.get(pairKey) || 0;
            const doDamage = frameCount - lastCollision >= COOLDOWN_FRAMES;

            if (doDamage) {
              collisionCooldown.set(pairKey, frameCount);
              const dmgToB = Math.max(1, a.attack - b.defense * 0.4 + Math.random() * 5);
              const dmgToA = Math.max(1, b.attack - a.defense * 0.4 + Math.random() * 5);
              b.hp -= dmgToB; a.hp -= dmgToA;

              const wouldBothDie = a.hp <= 0 && b.hp <= 0;
              const othersAlive = aliveCards.filter(c => c !== a && c !== b && c.alive).length;
              if (wouldBothDie && othersAlive === 0) {
                if (a.hp >= b.hp) { a.hp = 1; } else { b.hp = 1; }
              }

              if (b.hp <= 0 && b.alive) {
                b.alive = false; b.hp = 0;
                b.fragments = generateFragments(b.x, b.y, b.borderHue);
                b.fragFade = FRAG_FADE_FRAMES;
                setBattleLog((prev) => [...prev, `${b.name} (${b.ownerLabel}) destroyed by ${a.name}!`]);
              }
              if (a.hp <= 0 && a.alive) {
                a.alive = false; a.hp = 0;
                a.fragments = generateFragments(a.x, a.y, a.borderHue);
                a.fragFade = FRAG_FADE_FRAMES;
                setBattleLog((prev) => [...prev, `${a.name} (${a.ownerLabel}) destroyed by ${b.name}!`]);
              }
            }

            /* Bounce apart */
            const nx = ddx / (d || 1), ny = ddy / (d || 1);
            const bounce = 1.5;
            a.vx += nx * bounce; a.vy += ny * bounce;
            b.vx -= nx * bounce; b.vy -= ny * bounce;

            const overlap = COLLISION_DIST - d;
            a.x += nx * overlap * 0.5; a.y += ny * overlap * 0.5;
            b.x -= nx * overlap * 0.5; b.y -= ny * overlap * 0.5;
          }
        }
      }

      /* Fragment update */
      for (const card of cards) {
        if (card.fragments.length === 0) continue;
        if (card.fragFade > 0) {
          card.fragFade--;
          const fadeProgress = card.fragFade / FRAG_FADE_FRAMES;
          for (const frag of card.fragments) {
            frag.x += frag.vx; frag.y += frag.vy;
            frag.vy += frag.gravity; frag.rotation += frag.rotSpeed;
            frag.vx *= 0.98; frag.opacity = fadeProgress;
          }
        }
        if (card.fragFade === 0) card.fragments = [];
      }

      setBattleCards([...cards]);
      animRef.current = requestAnimationFrame(tick);
    };

    animRef.current = requestAnimationFrame(tick);
  }, []);

  /* ═══════ Canvas Rendering ═══════ */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const cx = STAGE_W / 2, cy = STAGE_H / 2;
    const stageR = Math.min(STAGE_W, STAGE_H) / 2 - 20;

    const resize = () => {
      const container = canvas.parentElement;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr; canvas.height = rect.height * dpr;
      canvas.style.width = rect.width + "px"; canvas.style.height = rect.height + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    let drawId: number;
    let frame = 0;

    const draw = () => {
      frame++;
      const dpr = window.devicePixelRatio || 1;
      const canvasW = canvas.width / dpr, canvasH = canvas.height / dpr;
      ctx.clearRect(0, 0, canvasW, canvasH);

      const scaleX = canvasW / STAGE_W, scaleY = canvasH / STAGE_H;
      const scale = Math.min(scaleX, scaleY);
      const offsetX = (canvasW - STAGE_W * scale) / 2;
      const offsetY = (canvasH - STAGE_H * scale) / 2;

      ctx.save();
      ctx.translate(offsetX, offsetY);
      ctx.scale(scale, scale);

      /* ════ Stage Rendering ════ */

      /* Spotlight beam */
      const spotGrad = ctx.createLinearGradient(cx, 0, cx, cy + stageR * 0.3);
      spotGrad.addColorStop(0, "rgba(255, 240, 200, 0.12)");
      spotGrad.addColorStop(0.3, "rgba(255, 240, 200, 0.06)");
      spotGrad.addColorStop(0.7, "rgba(255, 240, 200, 0.02)");
      spotGrad.addColorStop(1, "rgba(255, 240, 200, 0)");
      ctx.beginPath();
      ctx.moveTo(cx - 60, 0);
      ctx.lineTo(cx - stageR * 0.9, cy);
      ctx.lineTo(cx + stageR * 0.9, cy);
      ctx.lineTo(cx + 60, 0);
      ctx.closePath();
      ctx.fillStyle = spotGrad;
      ctx.fill();

      const spot2Grad = ctx.createLinearGradient(cx, 0, cx, cy + stageR * 0.5);
      spot2Grad.addColorStop(0, "rgba(200, 180, 255, 0.05)");
      spot2Grad.addColorStop(0.5, "rgba(200, 180, 255, 0.02)");
      spot2Grad.addColorStop(1, "rgba(200, 180, 255, 0)");
      ctx.beginPath();
      ctx.moveTo(cx - 120, 0);
      ctx.lineTo(cx - stageR * 1.1, cy + 40);
      ctx.lineTo(cx + stageR * 1.1, cy + 40);
      ctx.lineTo(cx + 120, 0);
      ctx.closePath();
      ctx.fillStyle = spot2Grad;
      ctx.fill();

      /* Frosted stage floor */
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, stageR, 0, Math.PI * 2);
      const floorGrad = ctx.createRadialGradient(cx, cy * 0.88, 0, cx, cy, stageR);
      floorGrad.addColorStop(0, "rgba(180, 170, 200, 0.45)");
      floorGrad.addColorStop(0.2, "rgba(150, 140, 175, 0.38)");
      floorGrad.addColorStop(0.45, "rgba(110, 100, 140, 0.32)");
      floorGrad.addColorStop(0.7, "rgba(70, 62, 100, 0.4)");
      floorGrad.addColorStop(0.9, "rgba(40, 35, 70, 0.55)");
      floorGrad.addColorStop(1, "rgba(25, 20, 50, 0.7)");
      ctx.fillStyle = floorGrad;
      ctx.fill();
      ctx.restore();

      /* Frosted texture overlay */
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, stageR, 0, Math.PI * 2);
      ctx.clip();
      const frostOverlay = ctx.createRadialGradient(cx, cy * 0.9, stageR * 0.05, cx, cy, stageR);
      frostOverlay.addColorStop(0, "rgba(200, 195, 220, 0.08)");
      frostOverlay.addColorStop(0.3, "rgba(170, 165, 195, 0.05)");
      frostOverlay.addColorStop(0.6, "rgba(140, 135, 170, 0.03)");
      frostOverlay.addColorStop(1, "rgba(100, 95, 130, 0.01)");
      ctx.fillStyle = frostOverlay;
      ctx.fillRect(cx - stageR, cy - stageR, stageR * 2, stageR * 2);
      ctx.restore();

      /* Soft center glow */
      const centerGlow = ctx.createRadialGradient(cx, cy * 0.85, 0, cx, cy, stageR * 0.7);
      centerGlow.addColorStop(0, "rgba(220, 210, 240, 0.12)");
      centerGlow.addColorStop(0.3, "rgba(200, 190, 220, 0.06)");
      centerGlow.addColorStop(0.7, "rgba(180, 170, 210, 0.02)");
      centerGlow.addColorStop(1, "rgba(160, 150, 200, 0)");
      ctx.beginPath();
      ctx.arc(cx, cy, stageR * 0.7, 0, Math.PI * 2);
      ctx.fillStyle = centerGlow;
      ctx.fill();

      /* Frosted edge - thin dark border */
      ctx.beginPath();
      ctx.arc(cx, cy, stageR, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(120, 110, 150, 0.3)";
      ctx.lineWidth = 1.5;
      ctx.stroke();

      /* Bottom purple ambient light */
      const pulse = Math.sin(frame * 0.012) * 0.015;
      const ambientGrad = ctx.createRadialGradient(cx, cy + stageR * 0.3, stageR * 0.6, cx, cy + stageR * 0.3, stageR * 1.3);
      ambientGrad.addColorStop(0, `rgba(120, 90, 180, ${0.04 + pulse})`);
      ambientGrad.addColorStop(0.5, `rgba(100, 70, 160, ${0.02 + pulse})`);
      ambientGrad.addColorStop(1, "rgba(80, 50, 140, 0)");
      ctx.beginPath();
      ctx.arc(cx, cy + stageR * 0.3, stageR * 1.3, 0, Math.PI * 2);
      ctx.fillStyle = ambientGrad;
      ctx.fill();

      /* ════ Draw Cards ════ */
      const cards = cardsRef.current;
      const images = cardImagesRef.current;

      for (const card of cards) {
        /* Fragments */
        for (const frag of card.fragments) {
          ctx.save();
          ctx.translate(frag.x, frag.y);
          ctx.rotate((frag.rotation * Math.PI) / 180);
          ctx.globalAlpha = Math.max(0, frag.opacity);
          ctx.fillStyle = frag.color;
          ctx.fillRect(-frag.size / 2, -frag.size / 2, frag.size, frag.size);
          ctx.strokeStyle = "rgba(0,0,0,0.4)";
          ctx.lineWidth = 0.8;
          ctx.strokeRect(-frag.size / 2, -frag.size / 2, frag.size, frag.size);
          ctx.restore();
        }

        if (!card.alive) continue;

        /* Card rendering — gold border + inner glow + shadow + PSA/renaiss labels */
        const drawX = card.x - CARD_W / 2;
        const drawY = card.y - CARD_H / 2;
        const hpRatio = card.hp / card.maxHp;
        const borderPad = 3;

        /* Drop shadow */
        ctx.save();
        ctx.shadowColor = "rgba(212, 168, 83, 0.5)";
        ctx.shadowBlur = 18;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 4;
        ctx.fillStyle = "rgba(0,0,0,0.01)";
        roundRect(ctx, drawX - borderPad, drawY - borderPad, CARD_W + borderPad * 2, CARD_H + borderPad * 2, 7);
        ctx.fill();
        ctx.restore();

        /* Gold border */
        ctx.save();
        const goldGrad = ctx.createLinearGradient(drawX, drawY, drawX + CARD_W, drawY + CARD_H);
        goldGrad.addColorStop(0, "#c9a040");
        goldGrad.addColorStop(0.3, "#f0d78c");
        goldGrad.addColorStop(0.5, "#d4a853");
        goldGrad.addColorStop(0.7, "#f0d78c");
        goldGrad.addColorStop(1, "#c9a040");
        ctx.fillStyle = goldGrad;
        roundRect(ctx, drawX - borderPad, drawY - borderPad, CARD_W + borderPad * 2, CARD_H + borderPad * 2, 7);
        ctx.fill();
        ctx.restore();

        /* Card image */
        const img = images.get(card.id);
        if (img && img.complete && img.naturalWidth > 0) {
          ctx.save();
          roundRect(ctx, drawX, drawY, CARD_W, CARD_H, 5);
          ctx.clip();
          const imgRatio = img.naturalWidth / img.naturalHeight;
          const slotRatio = CARD_W / CARD_H;
          let sx = 0, sy = 0, sw = img.naturalWidth, sh = img.naturalHeight;
          if (imgRatio > slotRatio) { sw = img.naturalHeight * slotRatio; sx = (img.naturalWidth - sw) / 2; }
          else { sh = img.naturalWidth / slotRatio; sy = (img.naturalHeight - sh) / 2; }
          ctx.drawImage(img, sx, sy, sw, sh, drawX, drawY, CARD_W, CARD_H);
          ctx.restore();
        } else {
          ctx.fillStyle = "rgba(40, 30, 80, 0.6)";
          roundRect(ctx, drawX, drawY, CARD_W, CARD_H, 5);
          ctx.fill();
          ctx.fillStyle = "rgba(255,255,255,0.15)";
          ctx.font = "8px Inter, sans-serif";
          ctx.textAlign = "center";
          ctx.fillText("Loading...", card.x, card.y + 3);
        }

        /* Inner glow */
        ctx.save();
        roundRect(ctx, drawX, drawY, CARD_W, CARD_H, 5);
        ctx.clip();
        const innerGlow = ctx.createRadialGradient(card.x, card.y, 0, card.x, card.y, CARD_W * 0.8);
        innerGlow.addColorStop(0, "rgba(240, 215, 140, 0)");
        innerGlow.addColorStop(0.7, "rgba(240, 215, 140, 0)");
        innerGlow.addColorStop(1, "rgba(212, 168, 83, 0.25)");
        ctx.fillStyle = innerGlow;
        ctx.fillRect(drawX, drawY, CARD_W, CARD_H);
        ctx.restore();

        /* PSA label (top-left) */
        const psaText = `PSA ${card.grade}`;
        ctx.save();
        ctx.font = "bold 7px Inter, sans-serif";
        const psaW = ctx.measureText(psaText).width + 8;
        const psaH = 12;
        const psaX = drawX - borderPad;
        const psaY = drawY - borderPad - psaH + 2;
        const psaGrad = ctx.createLinearGradient(psaX, psaY, psaX + psaW, psaY);
        psaGrad.addColorStop(0, "#c9a040");
        psaGrad.addColorStop(1, "#d4a853");
        ctx.fillStyle = psaGrad;
        roundRect(ctx, psaX, psaY, psaW, psaH, 3);
        ctx.fill();
        ctx.fillStyle = "#fff";
        ctx.textAlign = "left";
        ctx.fillText(psaText, psaX + 4, psaY + 9);
        ctx.restore();

        /* renaiss label (top-right) */
        ctx.save();
        ctx.font = "bold 6px Inter, sans-serif";
        const renText = "renaiss";
        const renW = ctx.measureText(renText).width + 8;
        const renH = 12;
        const renX = drawX + CARD_W + borderPad - renW;
        const renY = drawY - borderPad - renH + 2;
        ctx.fillStyle = "rgba(20, 15, 50, 0.85)";
        roundRect(ctx, renX, renY, renW, renH, 3);
        ctx.fill();
        ctx.strokeStyle = "rgba(212, 168, 83, 0.6)";
        ctx.lineWidth = 0.5;
        roundRect(ctx, renX, renY, renW, renH, 3);
        ctx.stroke();
        ctx.fillStyle = "#f0d78c";
        ctx.textAlign = "left";
        ctx.fillText(renText, renX + 4, renY + 9);
        ctx.restore();

        /* HP bar */
        const hpBarW = CARD_W;
        const hpBarH = 5;
        const hpBarX = drawX;
        const hpBarY = drawY + CARD_H + 6;

        ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
        roundRect(ctx, hpBarX, hpBarY, hpBarW, hpBarH, 2.5);
        ctx.fill();

        const hpColor = hpRatio > 0.5 ? "#4ade80" : hpRatio > 0.25 ? "#fbbf24" : "#ef4444";
        const hpGrad = ctx.createLinearGradient(hpBarX, hpBarY, hpBarX + hpBarW * Math.max(0, hpRatio), hpBarY);
        hpGrad.addColorStop(0, hpColor);
        hpGrad.addColorStop(1, hpRatio > 0.5 ? "#22c55e" : hpRatio > 0.25 ? "#f59e0b" : "#dc2626");
        ctx.fillStyle = hpGrad;
        roundRect(ctx, hpBarX, hpBarY, hpBarW * Math.max(0, hpRatio), hpBarH, 2.5);
        ctx.fill();

        /* HP value */
        ctx.fillStyle = "rgba(255,255,255,0.7)";
        ctx.font = "bold 7px Inter, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(`${Math.round(card.hp)}/${card.maxHp}`, card.x, hpBarY - 1);

        /* Player name */
        const labelText = card.ownerLabel;
        ctx.font = "bold 9px Inter, sans-serif";
        const nameLabelW = Math.max(CARD_W, ctx.measureText(labelText).width + 16);
        const nameLabelY = hpBarY + hpBarH + 3;
        ctx.fillStyle = "rgba(0, 0, 0, 0.65)";
        roundRect(ctx, card.x - nameLabelW / 2, nameLabelY, nameLabelW, 15, 7);
        ctx.fill();
        ctx.fillStyle = card.isPlayer ? "#f0d78c" : "#d0cee0";
        ctx.textAlign = "center";
        ctx.fillText(labelText, card.x, nameLabelY + 11);
      }

      ctx.restore();
      drawId = requestAnimationFrame(draw);
    };

    drawId = requestAnimationFrame(draw);
    return () => { cancelAnimationFrame(drawId); window.removeEventListener("resize", resize); };
  }, [battleCards]);

  /* Cleanup */
  useEffect(() => {
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current); battleActiveRef.current = false; };
  }, []);

  /* Reset */
  const handleReset = () => {
    if (animRef.current) cancelAnimationFrame(animRef.current);
    battleActiveRef.current = false;
    setPhase("setup"); setBattleCards([]); cardsRef.current = [];
    setWinner(null); setBattleLog([]); setCountdown(3); setError("");
  };

  /* ═══════ Render ═══════ */
  return (
    <div className="min-h-screen relative overflow-hidden" style={{ background: "linear-gradient(135deg, #0a0e27 0%, #1a1145 50%, #0d0a1a 100%)" }}>
      <div className="fixed inset-0 pointer-events-none" style={{ zIndex: 1 }}>
        <div className="absolute top-0 left-1/4 w-96 h-96 rounded-full opacity-10" style={{ background: "radial-gradient(circle, rgba(124,92,191,0.4) 0%, transparent 70%)" }} />
        <div className="absolute bottom-0 right-1/4 w-80 h-80 rounded-full opacity-10" style={{ background: "radial-gradient(circle, rgba(212,168,83,0.3) 0%, transparent 70%)" }} />
      </div>

      {/* ═══════ Back to Games Lobby Button — Top Left ═══════ */}
      <button
        onClick={() => { window.location.href = "/home"; }}
        className="fixed top-4 left-4 z-50 flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 hover:scale-105 hover:brightness-110"
        style={{
          background: "linear-gradient(135deg, rgba(212,168,83,0.15), rgba(212,168,83,0.05))",
          border: "1px solid rgba(212,168,83,0.3)",
          color: "#f0d78c",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
          fontFamily: "Cinzel, serif",
        }}
      >
        <ArrowLeft size={16} />
        {t("battle.backToLobby")}
      </button>

      <div className="relative z-10 min-h-screen flex flex-col">
        <header className="text-center pt-5 pb-2 px-4">
          <motion.h1 initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
            className="text-3xl md:text-5xl font-bold" style={{ fontFamily: "Cinzel, Georgia, serif" }}>
            <span className="text-gradient-gold">TCG Card Battle</span>
          </motion.h1>
        </header>

        <div className="flex-1 flex flex-col lg:flex-row gap-3 px-4 pb-4 max-w-[1500px] mx-auto w-full">

          {/* Left Panel */}
          <AnimatePresence mode="wait">
            {(phase === "setup" || phase === "loading") && (
              <motion.div initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} className="lg:w-[300px] shrink-0">
                <div className="glass-panel p-5 space-y-4">
                  <div>
                    <p className="text-[10px] font-semibold mb-2 uppercase tracking-wider" style={{ color: "#9896a8" }}>Battle Mode</p>
                    <div className="grid grid-cols-2 gap-2">
                      <button onClick={() => setMode("random")}
                        className="py-2.5 px-3 rounded-xl text-xs font-medium transition-all flex items-center justify-center gap-1.5"
                        style={{ background: mode === "random" ? "linear-gradient(135deg, rgba(212,168,83,0.2), rgba(212,168,83,0.08))" : "rgba(255,255,255,0.04)", border: `1px solid ${mode === "random" ? "rgba(212,168,83,0.4)" : "rgba(255,255,255,0.08)"}`, color: mode === "random" ? "#f0d78c" : "#9896a8" }}>
                        <Shuffle size={13} /> Random Match
                      </button>
                      <button onClick={() => setMode("friends")}
                        className="py-2.5 px-3 rounded-xl text-xs font-medium transition-all flex items-center justify-center gap-1.5"
                        style={{ background: mode === "friends" ? "linear-gradient(135deg, rgba(124,92,191,0.2), rgba(124,92,191,0.08))" : "rgba(255,255,255,0.04)", border: `1px solid ${mode === "friends" ? "rgba(124,92,191,0.4)" : "rgba(255,255,255,0.08)"}`, color: mode === "friends" ? "#a78bfa" : "#9896a8" }}>
                        <Users size={13} /> Friend Battle
                      </button>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Wallet size={12} style={{ color: "#d4a853" }} />
                      <p className="text-xs font-semibold" style={{ color: "#f0d78c", fontFamily: "Cinzel, serif" }}>Your Wallet</p>
                    </div>
                    <input type="text" value={myWallet} onChange={(e) => setMyWallet(e.target.value)}
                      placeholder="Enter your wallet address (0x...)"
                      className="w-full px-3 py-2.5 rounded-xl text-xs focus:outline-none transition-all"
                      style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(212,168,83,0.25)", color: "#e8e6f0" }} />
                  </div>

                  {mode === "random" && (
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Users size={12} style={{ color: "#d4a853" }} />
                          <p className="text-xs font-semibold" style={{ color: "#f0d78c", fontFamily: "Cinzel, serif" }}>Players</p>
                        </div>
                        <span className="text-sm font-bold px-3 py-0.5 rounded-full" style={{ background: "rgba(212,168,83,0.15)", color: "#f0d78c" }}>{matchPlayerCount} P</span>
                      </div>
                      <div className="relative px-1">
                        <input type="range" min={2} max={10} step={1} value={matchPlayerCount}
                          onChange={(e) => setMatchPlayerCount(Number(e.target.value))}
                          className="w-full h-2 rounded-full appearance-none cursor-pointer"
                          style={{ background: `linear-gradient(to right, #d4a853 0%, #d4a853 ${((matchPlayerCount - 2) / 8) * 100}%, rgba(255,255,255,0.1) ${((matchPlayerCount - 2) / 8) * 100}%, rgba(255,255,255,0.1) 100%)`, accentColor: "#d4a853" }} />
                        <div className="flex justify-between mt-1">
                          {[2,3,4,5,6,7,8,9,10].map((n) => (
                            <button key={n} onClick={() => setMatchPlayerCount(n)}
                              className="text-[8px] w-5 h-5 rounded-full flex items-center justify-center transition-all"
                              style={{ color: n === matchPlayerCount ? "#f0d78c" : "#9896a8", background: n === matchPlayerCount ? "rgba(212,168,83,0.2)" : "transparent", fontWeight: n === matchPlayerCount ? 700 : 400 }}>
                              {n}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {mode === "friends" && (
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Users size={12} style={{ color: "#a78bfa" }} />
                          <p className="text-xs font-semibold" style={{ color: "#a78bfa", fontFamily: "Cinzel, serif" }}>Friend Wallets</p>
                        </div>
                        <span className="text-[9px] px-2 py-0.5 rounded-full" style={{ background: "rgba(124,92,191,0.2)", color: "#a78bfa" }}>
                          {friendWallets.filter((w) => w.trim()).length} added
                        </span>
                      </div>
                      <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1" style={{ scrollbarWidth: "thin" }}>
                        {friendWallets.map((val, idx) => (
                          <div key={idx} className="flex gap-2">
                            <input type="text" value={val} onChange={(e) => updateFriendWallet(idx, e.target.value)}
                              placeholder={`Friend ${idx + 1} wallet (0x...)`}
                              className="flex-1 px-3 py-2 rounded-xl text-xs focus:outline-none transition-all"
                              style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "#e8e6f0" }} />
                            {friendWallets.length > 1 && (
                              <button onClick={() => removeFriendWallet(idx)}
                                className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors shrink-0"
                                style={{ background: "rgba(239,68,68,0.12)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.2)" }}>
                                <Trash2 size={12} />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                      <button onClick={addFriendWallet}
                        className="w-full mt-2 py-2 rounded-xl text-xs font-medium transition-all hover:scale-[1.02] flex items-center justify-center gap-1"
                        style={{ background: "rgba(124,92,191,0.08)", border: "1px dashed rgba(124,92,191,0.3)", color: "#a78bfa" }}>
                        <Plus size={12} /> Add Friend Wallet
                      </button>
                    </div>
                  )}

                  {error && (
                    <div className="rounded-xl p-3 flex items-start gap-2" style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)" }}>
                      <X size={12} className="shrink-0 mt-0.5" style={{ color: "#ef4444" }} />
                      <p className="text-[10px]" style={{ color: "#ef4444" }}>{error}</p>
                    </div>
                  )}

                  <button onClick={mode === "random" ? startRandomMatch : startFriendBattle}
                    disabled={phase === "loading"}
                    className="w-full py-3 rounded-xl text-sm font-bold transition-all duration-300 hover:scale-[1.03] disabled:opacity-50 disabled:hover:scale-100 flex items-center justify-center gap-2"
                    style={{ background: "linear-gradient(135deg, #d4a853 0%, #b8860b 50%, #d4a853 100%)", color: "#fff", boxShadow: "0 0 25px rgba(212,168,83,0.25), 0 4px 15px rgba(0,0,0,0.3)", fontFamily: "Cinzel, serif" }}>
                    {phase === "loading" ? (<><Loader2 size={16} className="animate-spin" /> Loading...</>) : (<><Swords size={16} /> {mode === "random" ? `Start ${matchPlayerCount}P Match` : `Start Friend Battle`}</>)}
                  </button>

                  {phase === "loading" && (
                    <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.08)" }}>
                      <motion.div className="h-full rounded-full" style={{ background: "linear-gradient(90deg, #d4a853, #f0d78c)" }}
                        initial={{ width: "0%" }} animate={{ width: `${loadingProgress}%` }} transition={{ duration: 0.3 }} />
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Center Stage */}
          <div className="flex-1 flex flex-col min-h-0">
            <div className="flex-1 relative rounded-2xl overflow-hidden" style={{
              minHeight: "520px", maxHeight: "680px",
              aspectRatio: `${STAGE_W}/${STAGE_H}`, margin: "0 auto", width: "100%",
              background: "radial-gradient(ellipse at center, rgba(20,15,50,0.4) 0%, rgba(8,6,20,0.8) 100%)",
              border: "1px solid rgba(120,110,150,0.15)",
              boxShadow: "0 0 60px rgba(124,92,191,0.06), inset 0 0 80px rgba(0,0,0,0.3)",
            }}>
              <canvas ref={canvasRef} className="w-full h-full" />

              <AnimatePresence>
                {phase === "countdown" && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="absolute inset-0 flex items-center justify-center" style={{ background: "rgba(10,14,39,0.75)" }}>
                    <motion.div key={countdown} initial={{ scale: 2.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.3, opacity: 0 }} transition={{ type: "spring", stiffness: 200 }}>
                      <div className="text-8xl md:text-9xl font-black text-gradient-gold" style={{ fontFamily: "Cinzel, Georgia, serif" }}>
                        {countdown > 0 ? countdown : "FIGHT!"}
                      </div>
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>

              {phase === "battle" && (
                <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2">
                  <div className="glass-panel px-5 py-2 flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: "#ef4444" }} />
                    <span className="text-xs font-semibold" style={{ color: "#f0d78c", fontFamily: "Cinzel, serif" }}>Battle in Progress</span>
                  </div>
                  <button onClick={handleReset}
                    className="glass-panel px-3 py-2 flex items-center gap-1.5 transition-all hover:scale-105"
                    style={{ border: "1px solid rgba(239,68,68,0.3)", cursor: "pointer" }}>
                    <LogOut size={12} style={{ color: "#ef4444" }} />
                    <span className="text-xs font-semibold" style={{ color: "#ef4444" }}>Exit</span>
                  </button>
                </div>
              )}
            </div>

            {battleCards.length > 0 && (phase === "battle" || phase === "result" || phase === "countdown") && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-2 flex flex-wrap gap-1.5 justify-center">
                {battleCards.map((card) => (
                  <div key={card.id} className="glass-panel px-2.5 py-1.5 flex items-center gap-1.5 transition-all duration-300"
                    style={{ opacity: card.alive ? 1 : 0.3, borderColor: card.alive ? `hsla(${card.borderHue}, 60%, 50%, 0.25)` : "rgba(255,255,255,0.04)" }}>
                    <div className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: card.alive ? `hsl(${card.borderHue}, 60%, 50%)` : "#444" }} />
                    <div className="min-w-0">
                      <p className="text-[9px] font-semibold truncate" style={{ color: card.alive ? (card.isPlayer ? "#f0d78c" : "#e0dff0") : "#555" }}>{card.ownerLabel}</p>
                      <p className="text-[8px] truncate max-w-[120px]" style={{ color: "#9896a8" }}>{card.name}</p>
                    </div>
                    <div className="text-[8px] ml-0.5 shrink-0" style={{ color: card.alive ? "#4ade80" : "#ef4444" }}>
                      {card.alive ? `${Math.round(card.hp)}HP` : "OUT"}
                    </div>
                  </div>
                ))}
              </motion.div>
            )}
          </div>

          {/* Right Panel */}
          <AnimatePresence mode="wait">
            {(phase === "battle" || phase === "result") && (
              <motion.div initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 30 }} className="lg:w-[280px] shrink-0">
                <div className="glass-panel p-4 space-y-4">
                  {phase === "result" && winner && (
                    <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", stiffness: 200 }}
                      className="text-center p-4 rounded-xl"
                      style={{ background: "linear-gradient(135deg, rgba(212,168,83,0.12) 0%, rgba(212,168,83,0.04) 100%)", border: "1px solid rgba(212,168,83,0.25)" }}>
                      <Crown size={32} className="mx-auto mb-2" style={{ color: "#d4a853" }} />
                      <h3 className="text-base font-bold text-gradient-gold mb-1" style={{ fontFamily: "Cinzel, serif" }}>Champion</h3>
                      <p className="text-sm font-semibold" style={{ color: "#f0d78c" }}>{winner.ownerLabel}</p>
                      <p className="text-[10px] mt-0.5 px-2 leading-relaxed" style={{ color: "#9896a8" }}>{winner.name}</p>
                      <div className="flex justify-center gap-3 mt-3">
                        <div className="text-center"><p className="text-[8px] uppercase" style={{ color: "#9896a8" }}>Grade</p><p className="text-xs font-bold" style={{ color: "#d4a853" }}>PSA {winner.grade}</p></div>
                        <div className="text-center"><p className="text-[8px] uppercase" style={{ color: "#9896a8" }}>Year</p><p className="text-xs font-bold" style={{ color: "#e8e6f0" }}>{winner.year}</p></div>
                        <div className="text-center"><p className="text-[8px] uppercase" style={{ color: "#9896a8" }}>Owner</p><p className="text-xs font-bold" style={{ color: "#e8e6f0" }}>{winner.ownerShort}</p></div>
                      </div>
                      <button onClick={handleReset}
                        className="mt-4 w-full py-2 rounded-xl text-xs font-semibold transition-all hover:scale-[1.03] flex items-center justify-center gap-1.5"
                        style={{ background: "linear-gradient(135deg, #d4a853 0%, #b8860b 100%)", color: "#fff", fontFamily: "Cinzel, serif" }}>
                        <RotateCcw size={12} /> Play Again
                      </button>
                    </motion.div>
                  )}

                  <div>
                    <div className="flex items-center gap-1.5 mb-2">
                      <Swords size={11} style={{ color: "#a78bfa" }} />
                      <h3 className="text-xs font-semibold" style={{ color: "#a78bfa", fontFamily: "Cinzel, serif" }}>Battle Log</h3>
                    </div>
                    <div className="space-y-1 max-h-48 overflow-y-auto pr-1" style={{ scrollbarWidth: "thin" }}>
                      {battleLog.length === 0 ? (
                        <p className="text-[10px]" style={{ color: "#9896a8" }}>Waiting for collision...</p>
                      ) : battleLog.map((log, i) => (
                        <motion.div key={i} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }}
                          className="text-[10px] py-1.5 px-2 rounded-lg flex items-start gap-1.5"
                          style={{ background: "rgba(255,255,255,0.03)", color: log.includes("won") ? "#f0d78c" : log.includes("destroyed") ? "#ef4444" : "#9896a8" }}>
                          {log.includes("won") ? <Crown size={10} className="shrink-0 mt-0.5" style={{ color: "#d4a853" }} /> : <Skull size={10} className="shrink-0 mt-0.5" style={{ color: "#ef4444" }} />}
                          <span>{log}</span>
                        </motion.div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center gap-1.5 mb-2">
                      <Target size={11} style={{ color: "#d4a853" }} />
                      <h3 className="text-xs font-semibold" style={{ color: "#d4a853", fontFamily: "Cinzel, serif" }}>Card Stats</h3>
                    </div>
                    <div className="space-y-1">
                      {battleCards.map((card) => (
                        <div key={card.id} className="flex items-center gap-1.5 py-1.5 px-2 rounded-lg transition-all"
                          style={{ background: card.alive ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.01)", opacity: card.alive ? 1 : 0.35 }}>
                          <div className="w-2 h-2 rounded-sm shrink-0" style={{ background: `hsl(${card.borderHue}, 60%, 50%)` }} />
                          <div className="flex-1 min-w-0">
                            <p className="text-[9px] font-medium truncate" style={{ color: card.isPlayer ? "#f0d78c" : "#e0dff0" }}>{card.ownerLabel}</p>
                          </div>
                          <div className="flex gap-1.5 text-[8px] shrink-0">
                            <span style={{ color: "#4ade80" }}><Heart size={7} className="inline mr-0.5" />{Math.round(card.hp)}</span>
                            <span style={{ color: "#f87171" }}><Zap size={7} className="inline mr-0.5" />{card.attack}</span>
                            <span style={{ color: "#60a5fa" }}><Shield size={7} className="inline mr-0.5" />{card.defense}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <footer className="text-center py-3 px-4">
          <p className="text-[9px]" style={{ color: "rgba(152,150,168,0.35)" }}>TCGPlay Card Battle -- Powered by Renaiss On-Chain Cards (BSC)</p>
        </footer>
      </div>
    </div>
  );
}
