/**
 * Card Race v2 — 纵向深渊竞速
 * 卡牌从上往下跑，镜头跟随最快选手
 * 第一名冲线后镜头切换跟随第二名，以此类推
 * Design: Vertical Abyss Racing
 */

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { pickRandomCardFromWallet, fetchRandomCard, fetchBatchRandomCards, batchPickFromWallets, type RenaissCard, type ProgressCallback } from "@/lib/renaiss-race";
import {
  type GameMode, type TrackTheme, type Racer, type RaceEvent, type CameraState,
  GAME_MODES, TRACK_THEMES, POWER_UPS,
  createRacer, updateRace, assignFunTags, initRaceTarget,
} from "@/lib/race-engine";

// ── Asset URLs ──
const ASSETS = {
  heroBanner: "https://d2xsxph8kpxj0f.cloudfront.net/310519663466247610/EMFBVVvGh3K8MCwV9c7zih/hero-banner-HsazpNXs6AmyCN35PQNSmP.webp",
  podium: "https://d2xsxph8kpxj0f.cloudfront.net/310519663466247610/EMFBVVvGh3K8MCwV9c7zih/podium-celebration-v2-Xk4SmTAadMnzWJE7PwGAyd.webp",
};

type Phase = "home" | "mode-select" | "setup" | "loading" | "starting-line" | "countdown" | "racing" | "result";

// ── Image preload helper ──
function preloadImage(url: string): Promise<void> {
  return new Promise((resolve) => {
    if (!url) { resolve(); return; }
    const img = new Image();
    img.onload = () => resolve();
    img.onerror = () => resolve();
    img.src = url;
  });
}

// ══════════════════════════════════════
// SVG Icons (no emoji)
// ══════════════════════════════════════
function SwordsIcon({ size = 32, color = "#d4a853" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.5 17.5L3 6V3h3l11.5 11.5" />
      <path d="M13 19l6-6" /><path d="M16 16l4 4" /><path d="M19 21l2-2" />
      <path d="M9.5 6.5L21 18v3h-3L6.5 9.5" />
      <path d="M11 5l-6 6" /><path d="M8 8L4 4" /><path d="M5 3L3 5" />
    </svg>
  );
}

function CrystalIcon({ size = 32, color = "#7c5cbf" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2L2 9l10 13L22 9z" /><path d="M2 9h20" /><path d="M12 2l4 7-4 13-4-13z" />
    </svg>
  );
}

function GalaxyIcon({ size = 32, color = "#a8c4a0" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(0 12 12)" />
      <ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(60 12 12)" />
      <ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(120 12 12)" />
    </svg>
  );
}

function ArrowLeftIcon({ size = 16, color = "#e8e6f0" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 12H5" /><path d="M12 19l-7-7 7-7" />
    </svg>
  );
}

function TrophyIcon({ size = 20, color = "#d4a853" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" /><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
      <path d="M4 22h16" /><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20 7 22" />
      <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20 17 22" />
      <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
    </svg>
  );
}

function ChainIcon({ size = 14, color = "#d4a853" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  );
}

function CloseIcon({ size = 18, color = "#9896a8" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 6L6 18" /><path d="M6 6l12 12" />
    </svg>
  );
}

function PlusIcon({ size = 14, color = "#e8e6f0" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 5v14" /><path d="M5 12h14" />
    </svg>
  );
}

function LiveIcon({ size = 10 }: { size?: number }) {
  return <span className="inline-block rounded-full animate-pulse" style={{ width: size, height: size, background: "#ef4444" }} />;
}

function ModeIcon({ icon, size = 40 }: { icon: string; size?: number }) {
  switch (icon) {
    case "swords": return <SwordsIcon size={size} />;
    case "crystal": return <CrystalIcon size={size} />;
    case "galaxy": return <GalaxyIcon size={size} />;
    default: return null;
  }
}

function RankBadge({ rank }: { rank: number }) {
  const colors: Record<number, { bg: string; text: string; border: string }> = {
    1: { bg: "rgba(212,168,83,0.2)", text: "#d4a853", border: "rgba(212,168,83,0.4)" },
    2: { bg: "rgba(192,192,208,0.15)", text: "#c0c0d0", border: "rgba(192,192,208,0.3)" },
    3: { bg: "rgba(205,127,50,0.15)", text: "#cd7f32", border: "rgba(205,127,50,0.3)" },
  };
  const c = colors[rank] || { bg: "rgba(152,150,168,0.1)", text: "#9896a8", border: "rgba(152,150,168,0.2)" };
  return (
    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-black"
      style={{ background: c.bg, color: c.text, border: `1.5px solid ${c.border}` }}>
      {rank}
    </span>
  );
}

// ══════════════════════════════════════
// Main Component
// ══════════════════════════════════════
export default function CardRace() {
  const [phase, setPhase] = useState<Phase>("home");
  const [gameMode, setGameMode] = useState<GameMode>("friend-battle");
  const [trackTheme, setTrackTheme] = useState<TrackTheme>("starlight-garden");
  const [walletInputs, setWalletInputs] = useState<string[]>(["", ""]);
  const [racers, setRacers] = useState<Racer[]>([]);
  const [countdown, setCountdown] = useState(3);
  const [raceEvents, setRaceEvents] = useState<RaceEvent[]>([]);
  const [isLoadingCards, setIsLoadingCards] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadProgress, setLoadProgress] = useState("");
  const [loadDetail, setLoadDetail] = useState("");
  const [matchCount, setMatchCount] = useState(5); // 随机匹配对手人数 (1-9, 总人数2-10)
  const [loadedCount, setLoadedCount] = useState(0); // 已加载的选手数
  const [totalToLoad, setTotalToLoad] = useState(0); // 总共需要加载的选手数
  const [camera, setCamera] = useState<CameraState>({ focusId: "", focusProgress: 0, smoothProgress: 0, shakeX: 0, shakeY: 0, zoom: 1 });

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef(0);
  const seedRef = useRef(Math.floor(Math.random() * 100000));

  useEffect(() => {
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, []);

  useEffect(() => {
    const themes: TrackTheme[] = ["starlight-garden", "golden-canyon", "crystal-palace"];
    setTrackTheme(themes[Math.floor(Math.random() * themes.length)]);
  }, []);

  // ── Wallet input management (no upper limit for friend battle) ──
  const addPlayer = () => { setWalletInputs([...walletInputs, ""]); };
  const removePlayer = (idx: number) => { if (walletInputs.length > 2) setWalletInputs(walletInputs.filter((_, i) => i !== idx)); };
  const updateWallet = (idx: number, val: string) => {
    const copy = [...walletInputs]; copy[idx] = val; setWalletInputs(copy);
  };

  const onProgress: ProgressCallback = (msg) => { setLoadDetail(msg); };

  // ── Preload all racer images ──
  const preloadAllImages = async (racerList: Racer[]) => {
    await Promise.all(racerList.map(r => preloadImage(r.card.image)));
  };

  // ── Start race from wallets (batch parallel) ──
  const startRaceFromWallets = useCallback(async () => {
    const validWallets = walletInputs.filter(w => w.trim().startsWith("0x") && w.trim().length === 42);
    if (validWallets.length < 2) { setLoadError("At least 2 valid wallet addresses required (starts with 0x, 42 chars)"); return; }

    setIsLoadingCards(true);
    setLoadError(null);
    setPhase("loading");
    setTotalToLoad(validWallets.length);
    setLoadedCount(0);
    setLoadProgress(`Fetching cards for ${validWallets.length} players from BNB Chain...`);
    setLoadDetail("All wallets loading in parallel...");

    // Start a smooth progress animation (fills to ~90% over 4.5s while waiting)
    const progressStart = Date.now();
    const progressInterval = setInterval(() => {
      const elapsed = Date.now() - progressStart;
      const t = Math.min(elapsed / 4500, 1);
      const simulated = Math.floor(t * t * (3 - 2 * t) * validWallets.length * 0.9);
      setLoadedCount(Math.min(simulated, validWallets.length - 1));
    }, 60);

    try {
      // Batch parallel fetch all wallets at once
      const results = await batchPickFromWallets(
        validWallets.map(w => w.trim()),
        onProgress
      );

      clearInterval(progressInterval);

      const newRacers: Racer[] = [];
      let laneIdx = 0;
      for (const result of results) {
        if (result.card) {
          newRacers.push(createRacer(result.wallet, result.card, laneIdx));
          laneIdx++;
        }
      }

      setLoadedCount(validWallets.length);
      setLoadProgress(`${newRacers.length} players ready!`);

      if (newRacers.length < 2) {
        setLoadError(`Only ${newRacers.length} player(s) loaded. At least 2 wallets with Renaiss cards required.`);
        setIsLoadingCards(false);
        setPhase("setup");
        return;
      }

      // Preload all card images in parallel
      setLoadDetail("Loading card images...");
      await preloadAllImages(newRacers);

      setRacers(newRacers);
      setIsLoadingCards(false);
      setPhase("starting-line");
    } catch (e) {
      clearInterval(progressInterval);
      console.error("Batch load failed:", e);
      setLoadError("Failed to load cards. Please try again.");
      setIsLoadingCards(false);
      setPhase("setup");
    }
  }, [walletInputs]);

  // ── Chain adventure mode (batch parallel) ──
  const startChainAdventure = useCallback(async () => {
    const myWallet = walletInputs[0]?.trim();
    if (!myWallet || !myWallet.startsWith("0x") || myWallet.length !== 42) {
      setLoadError("Please enter a valid wallet address (starts with 0x, 42 chars)"); return;
    }

    setIsLoadingCards(true);
    setLoadError(null);
    setPhase("loading");
    const opponentCount = matchCount;
    const totalPlayers = opponentCount + 1;
    setTotalToLoad(totalPlayers);
    setLoadedCount(0);
    setLoadProgress(`Fetching your card + ${opponentCount} opponents from BNB Chain...`);
    setLoadDetail("Loading all cards in parallel...");

    // Start a smooth progress animation (fills to ~90% over 4.5s while waiting)
    const progressStart = Date.now();
    const progressInterval = setInterval(() => {
      const elapsed = Date.now() - progressStart;
      const t = Math.min(elapsed / 4500, 1);
      const simulated = Math.floor(t * t * (3 - 2 * t) * totalPlayers * 0.9);
      setLoadedCount(Math.min(simulated, totalPlayers - 1));
    }, 60);

    try {
      // Fetch my card and batch random opponents in parallel
      const [myCardResult, opponentCards] = await Promise.all([
        pickRandomCardFromWallet(myWallet, onProgress),
        fetchBatchRandomCards(opponentCount, onProgress),
      ]);

      clearInterval(progressInterval);

      const newRacers: Racer[] = [];
      if (myCardResult) {
        newRacers.push(createRacer(myWallet, myCardResult, 0));
      }
      for (let i = 0; i < opponentCards.length; i++) {
        const card = opponentCards[i];
        newRacers.push(createRacer(card.owner || `random-${i}`, card, newRacers.length));
      }

      setLoadedCount(totalPlayers);
      setLoadProgress(`${newRacers.length} players ready!`);

      if (newRacers.length < 2) {
        setLoadError("Unable to fetch enough on-chain cards. Please try again later.");
        setIsLoadingCards(false);
        setPhase("setup");
        return;
      }

      // Preload all card images in parallel
      setLoadDetail("Loading card images...");
      await preloadAllImages(newRacers);

      setRacers(newRacers);
      setIsLoadingCards(false);
      setPhase("starting-line");
    } catch (e) {
      clearInterval(progressInterval);
      console.error("Chain adventure batch load failed:", e);
      setLoadError("Failed to load cards. Please try again.");
      setIsLoadingCards(false);
      setPhase("setup");
    }
  }, [walletInputs, matchCount]);

  // ── From starting line to countdown ──
  const goToCountdown = useCallback((racerList: Racer[]) => {
    beginCountdown(racerList);
  }, []);

  // ── Countdown ──
  const beginCountdown = (racerList: Racer[]) => {
    setPhase("countdown");
    let count = 3;
    setCountdown(count);
    const cdInterval = setInterval(() => {
      count--;
      setCountdown(count);
      if (count <= 0) {
        clearInterval(cdInterval);
        beginRacing(racerList);
      }
    }, 1000);
  };

  // ── Start racing ──
  const beginRacing = (racerList: Racer[]) => {
    setPhase("racing");
    startTimeRef.current = Date.now();
    seedRef.current = Math.floor(Math.random() * 100000);
    // v4: initRaceTarget now assigns target finish times to each racer
    const preparedRacers = initRaceTarget(seedRef.current, racerList) || racerList;
    setRacers(preparedRacers);
    setRaceEvents([]);

    intervalRef.current = setInterval(() => {
      const elapsed = (Date.now() - startTimeRef.current) / 1000;

      setRacers(prev => {
        const result = updateRace(prev, elapsed, seedRef.current);

        if (result.events.length > 0) {
          setRaceEvents(evts => [...evts.slice(-30), ...result.events]);
        }

        setCamera(result.camera);

        if (result.allFinished) {
          if (intervalRef.current) clearInterval(intervalRef.current);
          const tagged = assignFunTags(result.racers);
          setTimeout(() => {
            setRacers(tagged);
            setPhase("result");
          }, 2000);
          return tagged;
        }

        return result.racers;
      });
    }, 60); // 60ms for smoother animation
  };

  // ── Reset ──
  const resetAll = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setPhase("home");
    setRacers([]);
    setRaceEvents([]);
    setLoadError(null);
    setCamera({ focusId: "", focusProgress: 0, smoothProgress: 0, shakeX: 0, shakeY: 0, zoom: 1 });
  };

  return (
    <div className="min-h-screen relative overflow-hidden" style={{
      background: "linear-gradient(135deg, #0a0e27 0%, #0d1230 40%, #1a1145 70%, #0d0a1a 100%)",
    }}>
      <StarField />
      <div className="relative z-10">
        <AnimatePresence mode="wait">
          {phase === "home" && <HeroSection key="hero" onStart={() => setPhase("mode-select")} />}
          {phase === "mode-select" && (
            <ModeSelectSection key="mode"
              onSelect={(mode) => { setGameMode(mode); setPhase("setup"); }}
              onBack={() => setPhase("home")}
            />
          )}
          {phase === "setup" && (
            <SetupSection key="setup"
              gameMode={gameMode}
              walletInputs={walletInputs}
              loadError={loadError}
              matchCount={matchCount}
              onMatchCountChange={setMatchCount}
              onUpdateWallet={updateWallet}
              onAddPlayer={addPlayer}
              onRemovePlayer={removePlayer}
              onStart={gameMode === "chain-adventure" ? startChainAdventure : startRaceFromWallets}
              onBack={() => setPhase("mode-select")}
            />
          )}
          {phase === "loading" && <LoadingSection key="loading" progress={loadProgress} detail={loadDetail} loadedCount={loadedCount} totalToLoad={totalToLoad} />}
          {phase === "starting-line" && (
            <StartingLineSection key="starting-line"
              racers={racers}
              trackTheme={trackTheme}
              onReady={() => goToCountdown(racers)}
            />
          )}
          {phase === "countdown" && <CountdownSection key="countdown" count={countdown} trackTheme={trackTheme} racers={racers} />}
          {phase === "racing" && (
            <VerticalRacingSection key="racing"
              racers={racers}
              trackTheme={trackTheme}
              events={raceEvents}
              camera={camera}
            />
          )}
          {phase === "result" && (
            <ResultSection key="result" racers={racers} onPlayAgain={resetAll} />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ══════════════════════════════════════
// Star Field Background
// ══════════════════════════════════════
function StarField() {
  return (
    <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
      {Array.from({ length: 50 }).map((_, i) => (
        <div key={i} className="absolute rounded-full"
          style={{
            width: Math.random() * 2.5 + 0.5 + "px",
            height: Math.random() * 2.5 + 0.5 + "px",
            left: Math.random() * 100 + "%",
            top: Math.random() * 100 + "%",
            background: `radial-gradient(circle, rgba(255,255,255,${0.3 + Math.random() * 0.5}) 0%, transparent 70%)`,
            animation: `float ${4 + Math.random() * 6}s ease-in-out infinite`,
            animationDelay: `${Math.random() * 5}s`,
          }}
        />
      ))}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full opacity-10"
        style={{ background: "radial-gradient(circle, #7c5cbf 0%, transparent 70%)", filter: "blur(80px)" }} />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full opacity-8"
        style={{ background: "radial-gradient(circle, #d4a853 0%, transparent 70%)", filter: "blur(60px)" }} />
    </div>
  );
}

// ══════════════════════════════════════
// Hero Section (PRESERVED)
// ══════════════════════════════════════
function HeroSection({ onStart }: { onStart: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="min-h-screen flex flex-col items-center justify-center px-4"
    >
      <motion.h1
        initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.4 }}
        className="text-5xl md:text-7xl font-black mb-3 text-gradient-candy"
        style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
      >
        TCG Card Race
      </motion.h1>
      <motion.p
        initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.5 }}
        className="text-lg md:text-xl mb-2 font-medium" style={{ color: "#e8e6f0" }}
      >
        Renaiss TCG Card Racing
      </motion.p>
      <motion.p
        initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.6 }}
        className="text-sm max-w-lg text-center mb-10" style={{ color: "#9896a8" }}
      >
        On-chain Card Speed Racing
      </motion.p>

      <motion.button
        initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.7 }}
        whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
        onClick={onStart}
        className="gold-jelly-button text-lg px-12 py-4 rounded-2xl"
      >
        Start Race
      </motion.button>

      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.9 }}
        className="mt-6 flex items-center gap-2 text-xs" style={{ color: "#9896a8" }}
      >
        <ChainIcon size={12} />
        Powered by Renaiss Protocol on BNB Chain | TCG Card Race
      </motion.div>
    </motion.div>
  );
}

// ══════════════════════════════════════
// Mode Selection (PRESERVED)
// ══════════════════════════════════════
function ModeSelectSection({ onSelect, onBack }: { onSelect: (mode: GameMode) => void; onBack: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }}
      className="min-h-screen flex flex-col items-center justify-center px-4 py-20"
    >
      <button onClick={onBack} className="absolute top-6 left-6 text-sm jelly-button px-4 py-2 flex items-center gap-2">
        <ArrowLeftIcon size={14} /> Back
      </button>

      <h2 className="text-3xl md:text-4xl font-bold mb-2 text-gradient-cosmic" style={{ fontFamily: "Georgia, serif" }}>
        Select Mode
      </h2>
      <p className="text-sm mb-10" style={{ color: "#9896a8" }}>Choose your race format</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-2xl w-full">
        {GAME_MODES.map((mode, i) => (
          <motion.button
            key={mode.id}
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: i * 0.1 }}
            whileHover={{ scale: 1.03, y: -4 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => onSelect(mode.id)}
            className="glass-panel p-6 text-left transition-all duration-300 group"
            style={{ borderColor: `${mode.color}20` }}
          >
            <h3 className="text-xl font-bold mb-1" style={{ color: mode.color }}>{mode.name}</h3>
            <p className="text-xs mb-3 font-medium" style={{ color: "#e8e6f0" }}>{mode.nameEn}</p>
            <p className="text-xs leading-relaxed mb-3" style={{ color: "#9896a8" }}>{mode.description}</p>
            <div className="flex items-center gap-2">
              <span className="text-xs px-2 py-1 rounded-full" style={{ background: `${mode.color}20`, color: mode.color }}>
                {mode.maxPlayers}
              </span>
            </div>
          </motion.button>
        ))}
      </div>
    </motion.div>
  );
}

// ══════════════════════════════════════
// Setup (Wallet Input) (PRESERVED)
// ══════════════════════════════════════
function SetupSection({
  gameMode, walletInputs, loadError, matchCount,
  onMatchCountChange, onUpdateWallet, onAddPlayer, onRemovePlayer, onStart, onBack,
}: {
  gameMode: GameMode;
  walletInputs: string[];
  loadError: string | null;
  matchCount: number;
  onMatchCountChange: (count: number) => void;
  onUpdateWallet: (idx: number, val: string) => void;
  onAddPlayer: () => void;
  onRemovePlayer: (idx: number) => void;
  onStart: () => void;
  onBack: () => void;
}) {
  const modeInfo = GAME_MODES.find(m => m.id === gameMode)!;
  const isChainAdventure = gameMode === "chain-adventure";

  return (
    <motion.div
      initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }}
      className="min-h-screen flex flex-col items-center justify-center px-4 py-20"
    >
      <button onClick={onBack} className="absolute top-6 left-6 text-sm jelly-button px-4 py-2 flex items-center gap-2">
        <ArrowLeftIcon size={14} /> Back
      </button>

      <h2 className="text-2xl md:text-3xl font-bold mb-1" style={{ color: modeInfo.color, fontFamily: "Georgia, serif" }}>
        {modeInfo.name}
      </h2>
      <p className="text-xs mb-8" style={{ color: "#9896a8" }}>{modeInfo.description}</p>

      <div className="glass-panel p-6 md:p-8 max-w-xl w-full">
        {isChainAdventure ? (
          <div className="space-y-4 mb-6">
            <div className="space-y-3">
              <label className="text-xs font-medium" style={{ color: "#e8e6f0" }}>Your Wallet Address</label>
              <input
                type="text" value={walletInputs[0]} onChange={e => onUpdateWallet(0, e.target.value)}
                placeholder="0x..."
                className="w-full px-4 py-3 rounded-2xl text-sm transition-all duration-300"
                style={{
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  color: "#e8e6f0",
                  outline: "none",
                }}
                onFocus={e => { e.target.style.borderColor = "rgba(124,92,191,0.4)"; e.target.style.boxShadow = "0 0 20px rgba(124,92,191,0.15)"; }}
                onBlur={e => { e.target.style.borderColor = "rgba(255,255,255,0.1)"; e.target.style.boxShadow = "none"; }}
              />
            </div>

            {/* Player count selector */}
            <div className="space-y-3">
              <label className="text-xs font-medium" style={{ color: "#e8e6f0" }}>Total Players (including you): {matchCount + 1}</label>
              <div className="flex items-center gap-2">
                <span className="text-xs" style={{ color: "#9896a8" }}>2</span>
                <input
                  type="range" min={1} max={9} value={matchCount}
                  onChange={e => onMatchCountChange(Number(e.target.value))}
                  className="flex-1 h-2 rounded-full appearance-none cursor-pointer"
                  style={{
                    background: `linear-gradient(to right, #7c5cbf ${((matchCount - 1) / 8) * 100}%, rgba(255,255,255,0.1) ${((matchCount - 1) / 8) * 100}%)`,
                  }}
                />
                <span className="text-xs" style={{ color: "#9896a8" }}>10</span>
              </div>
              <div className="flex justify-center gap-1.5 flex-wrap">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => (
                  <button key={n} onClick={() => onMatchCountChange(n)}
                    className="w-8 h-8 rounded-xl text-xs font-bold transition-all duration-200"
                    style={{
                      background: matchCount === n ? "linear-gradient(135deg, #7c5cbf, #b8a9d4)" : "rgba(255,255,255,0.05)",
                      color: matchCount === n ? "#fff" : "#9896a8",
                      border: matchCount === n ? "1px solid rgba(124,92,191,0.5)" : "1px solid rgba(255,255,255,0.08)",
                      boxShadow: matchCount === n ? "0 0 12px rgba(124,92,191,0.3)" : "none",
                    }}
                  >
                    {n + 1}
                  </button>
                ))}
              </div>
              <p className="text-xs text-center" style={{ color: "#9896a8" }}>
                Randomly match {matchCount} on-chain Renaiss card holders as opponents
              </p>
            </div>
          </div>
        ) : (
          <>
            <div className="space-y-3 mb-4" style={{ maxHeight: walletInputs.length > 8 ? "400px" : "auto", overflowY: walletInputs.length > 8 ? "auto" : "visible" }}>
              {walletInputs.map((w, i) => (
                <div key={i} className="flex gap-3 items-center">
                  <span className="text-xs w-8 text-right font-bold shrink-0" style={{ color: i === 0 ? "#d4a853" : "#9896a8" }}>
                    #{i + 1}
                  </span>
                  <input
                    type="text" value={w} onChange={e => onUpdateWallet(i, e.target.value)}
                    placeholder="Wallet address 0x..."
                    className="flex-1 px-4 py-3 rounded-2xl text-sm transition-all duration-300"
                    style={{
                      background: "rgba(255,255,255,0.05)",
                      border: "1px solid rgba(255,255,255,0.1)",
                      color: "#e8e6f0",
                      outline: "none",
                    }}
                    onFocus={e => { e.target.style.borderColor = "rgba(124,92,191,0.4)"; }}
                    onBlur={e => { e.target.style.borderColor = "rgba(255,255,255,0.1)"; }}
                  />
                  {walletInputs.length > 2 && (
                    <button onClick={() => onRemovePlayer(i)}
                      className="text-red-400/60 hover:text-red-400 transition-colors w-6 shrink-0">
                      <CloseIcon size={14} color="currentColor" />
                    </button>
                  )}
                </div>
              ))}
            </div>
            <button onClick={onAddPlayer} className="jelly-button text-xs px-4 py-2 mb-4 w-full flex items-center justify-center gap-2">
              <PlusIcon size={12} /> Add Player ({walletInputs.length} players)
            </button>
          </>
        )}

        {loadError && (
          <div className="text-sm text-center mb-4 p-3 rounded-xl" style={{ color: "#ff6b6b", background: "rgba(255,107,107,0.08)", border: "1px solid rgba(255,107,107,0.15)" }}>
            {loadError}
          </div>
        )}

        <button onClick={onStart} className="gold-jelly-button text-sm w-full py-3 rounded-2xl">
          Fetch Cards & Start Race
        </button>


      </div>
    </motion.div>
  );
}

// ══════════════════════════════════════
// Loading - 简洁进度条版
// ══════════════════════════════════════
function LoadingSection({ progress, detail, loadedCount, totalToLoad }: { progress: string; detail: string; loadedCount: number; totalToLoad: number }) {
  const progressPercent = totalToLoad > 0 ? Math.round((loadedCount / totalToLoad) * 100) : 0;

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: 0.15 } }}
      className="min-h-screen flex flex-col items-center justify-center px-4 relative"
    >
      {/* Background ambient glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          animate={{ scale: [1, 1.15, 1], opacity: [0.12, 0.22, 0.12] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full"
          style={{ background: "radial-gradient(circle, rgba(124,92,191,0.25) 0%, rgba(212,168,83,0.08) 40%, transparent 70%)", filter: "blur(80px)" }}
        />
      </div>

      {/* Main content */}
      <div className="relative z-10 flex flex-col items-center w-full" style={{ maxWidth: 420 }}>
        {/* 大百分比数字 */}
        <motion.div
          className="mb-8"
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1, type: "spring", stiffness: 300 }}
        >
          <span
            className="text-6xl font-black"
            style={{
              fontFamily: "Georgia, serif",
              background: "linear-gradient(135deg, #d4a853 0%, #e8c170 40%, #d4a853 60%, #b8a9d4 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            {progressPercent}%
          </span>
        </motion.div>

        {/* 进度条 */}
        <div className="w-full mb-6">
          <div className="relative h-3 rounded-full overflow-hidden" style={{
            background: "rgba(255,255,255,0.06)",
            boxShadow: "inset 0 1px 3px rgba(0,0,0,0.3)",
          }}>
            {/* 背景微光 */}
            <div className="absolute inset-0 rounded-full" style={{
              background: "linear-gradient(90deg, rgba(124,92,191,0.05) 0%, rgba(212,168,83,0.05) 100%)",
            }} />
            {/* 进度填充 */}
            <motion.div
              className="h-full rounded-full relative"
              style={{
                background: "linear-gradient(90deg, #7c5cbf 0%, #9b7fd4 25%, #d4a853 60%, #e8c170 100%)",
                boxShadow: "0 0 12px rgba(212,168,83,0.4), 0 0 24px rgba(124,92,191,0.2)",
              }}
              initial={{ width: "0%" }}
              animate={{ width: `${progressPercent}%` }}
              transition={{ duration: 0.3, ease: "easeOut" }}
            >
              {/* 进度条上的光泽效果 */}
              <div className="absolute inset-0 rounded-full" style={{
                background: "linear-gradient(180deg, rgba(255,255,255,0.25) 0%, transparent 60%)",
              }} />
              {/* 右侧发光点 */}
              {progressPercent > 0 && progressPercent < 100 && (
                <motion.div
                  className="absolute right-0 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full"
                  animate={{ opacity: [0.6, 1, 0.6], scale: [1, 1.3, 1] }}
                  transition={{ duration: 0.8, repeat: Infinity, ease: "easeInOut" }}
                  style={{ background: "#fff", boxShadow: "0 0 8px rgba(255,255,255,0.8)" }}
                />
              )}
              {/* 100% 完成特效 */}
              {progressPercent >= 100 && (
                <motion.div
                  className="absolute inset-0 rounded-full"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: [0, 0.6, 0] }}
                  transition={{ duration: 0.5 }}
                  style={{ background: "rgba(255,255,255,0.4)" }}
                />
              )}
            </motion.div>
          </div>
          {/* 进度条下方信息 */}
          <div className="flex justify-between mt-2.5">
            <span className="text-xs font-medium" style={{ color: "#9896a8" }}>
              {loadedCount}/{totalToLoad} Players Ready
            </span>
            <span className="text-xs font-medium" style={{ color: "#d4a853" }}>
              {progressPercent}%
            </span>
          </div>
        </div>

        {/* Status text */}
        {progress && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-sm text-center mb-1"
            style={{ color: "#e8e6f0" }}
          >
            {progress}
          </motion.p>
        )}
        {detail && (
          <p className="text-xs text-center" style={{ color: "#9896a8" }}>
            {detail}
          </p>
        )}

      </div>
    </motion.div>
  );
}

// ══════════════════════════════════════
// Starting Line - 所有卡牌在起跑线展示
// ══════════════════════════════════════
function StartingLineSection({ racers, trackTheme, onReady }: { racers: Racer[]; trackTheme: TrackTheme; onReady: () => void }) {
  const theme = TRACK_THEMES.find(t => t.id === trackTheme)!;
  const laneColors = ["#d4a853", "#b8a9d4", "#e8c170", "#c4917a", "#a8c4a0", "#d4b8a0", "#e0a0b0", "#8cb8d0", "#c8b870", "#a0d0a0", "#d0a0d0", "#b0c8a0", "#d0b090", "#a0a0d0", "#c0d0a0", "#d0c0a0", "#a0c0c0", "#c0a0b0", "#b0d0c0", "#d0a0a0"];

  // Auto-proceed to countdown after 2 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      onReady();
    }, 2000);
    return () => clearTimeout(timer);
  }, [onReady]);

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="min-h-screen flex flex-col items-center justify-center px-4 relative"
      style={{ background: theme.bgGradient }}
    >
      {/* Title */}
      <motion.div
        initial={{ y: -30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.1, type: "spring", stiffness: 300 }}
        className="mb-2"
      >
        <h2 className="text-2xl md:text-3xl font-black text-center" style={{
          fontFamily: "Georgia, serif",
          background: "linear-gradient(135deg, #d4a853 0%, #e8c170 50%, #d4a853 100%)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          backgroundClip: "text",
        }}>
          Racers Ready
        </h2>
      </motion.div>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.15 }}
        className="text-sm mb-8"
        style={{ color: "#9896a8" }}
      >
        {racers.length} cards on the starting line
      </motion.p>

      {/* Starting line visualization */}
      <div className="relative w-full max-w-4xl">
        {/* Starting line */}
        <motion.div
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ delay: 0.1, duration: 0.4, ease: "easeOut" }}
          className="mx-4 md:mx-8 mb-8"
          style={{
            height: "4px",
            background: `repeating-linear-gradient(90deg, #d4a853 0px, #d4a853 12px, transparent 12px, transparent 24px)`,
            boxShadow: "0 0 20px rgba(212,168,83,0.4)",
            borderRadius: "2px",
            transformOrigin: "center",
          }}
        />

        {/* Cards grid */}
        <div className="flex flex-wrap justify-center gap-4 md:gap-6 px-4">
          {racers.map((racer, i) => {
            const color = laneColors[i % laneColors.length];
            return (
              <motion.div
                key={racer.id}
                initial={{ y: 60, opacity: 0, scale: 0.8 }}
                animate={{ y: 0, opacity: 1, scale: 1 }}
                transition={{ delay: 0.15 + i * 0.06, type: "spring", stiffness: 300, damping: 20 }}
                className="flex flex-col items-center"
              >
                {/* Card image */}
                <div className="relative" style={{
                  width: racers.length > 6 ? "70px" : racers.length > 4 ? "80px" : "100px",
                  height: racers.length > 6 ? "98px" : racers.length > 4 ? "112px" : "140px",
                  borderRadius: "12px",
                  overflow: "hidden",
                  background: "linear-gradient(135deg, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0.05) 100%)",
                  border: `2.5px solid ${color}`,
                  boxShadow: `0 4px 20px rgba(0,0,0,0.4), 0 0 16px ${color}40`,
                }}>
                  <img
                    src={racer.card.image}
                    alt={racer.card.name}
                    className="w-full h-full object-cover"
                    loading="eager"
                    decoding="sync"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                  />
                  {/* Holographic overlay */}
                  <div className="absolute inset-0" style={{
                    background: "linear-gradient(135deg, rgba(255,255,255,0.25) 0%, transparent 40%, rgba(255,255,255,0.08) 100%)",
                  }} />
                </div>

                {/* Lane number badge */}
                <div className="mt-2 flex items-center justify-center" style={{
                  width: "22px", height: "22px", borderRadius: "50%",
                  background: `${color}cc`, color: "#fff",
                  fontSize: "11px", fontWeight: 800,
                  boxShadow: `0 2px 8px rgba(0,0,0,0.3)`,
                }}>
                  {i + 1}
                </div>

                {/* Card name */}
                <p className="mt-1 text-center font-bold truncate" style={{
                  color: color,
                  fontSize: racers.length > 6 ? "8px" : "10px",
                  maxWidth: racers.length > 6 ? "70px" : "100px",
                }}>
                  {racer.card.name.length > 18 ? racer.card.name.slice(0, 18) + "..." : racer.card.name}
                </p>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Ready button */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 + racers.length * 0.04 }}
        className="mt-10"
      >
        <motion.button
          whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
          onClick={onReady}
          className="gold-jelly-button text-sm px-10 py-3 rounded-2xl"
        >
          Start Countdown
        </motion.button>
      </motion.div>

      {/* Track info */}

    </motion.div>
  );
}

// ══════════════════════════════════════
// Countdown (ENHANCED with racers on starting line)
// ══════════════════════════════════════
function CountdownSection({ count, trackTheme, racers }: { count: number; trackTheme: TrackTheme; racers: Racer[] }) {
  const theme = TRACK_THEMES.find(t => t.id === trackTheme)!;
  const laneColors = ["#d4a853", "#b8a9d4", "#e8c170", "#c4917a", "#a8c4a0", "#d4b8a0", "#e0a0b0", "#8cb8d0", "#c8b870", "#a0d0a0"];

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="min-h-screen flex flex-col items-center justify-center px-4 relative"
    >
      {/* Card showcase at bottom */}
      <div className="absolute bottom-8 left-0 right-0 flex justify-center gap-5 px-8 flex-wrap">
        {racers.map((racer, i) => {
          const color = laneColors[i % laneColors.length];
          return (
            <motion.div
              key={racer.id}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: [0, -6, 0] }}
              transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.15, ease: "easeInOut" }}
              className="flex flex-col items-center gap-1.5"
            >
              <div style={{
                width: "80px", height: "112px", borderRadius: "10px", overflow: "hidden",
                border: `2px solid ${color}`, boxShadow: `0 0 16px ${color}40, 0 4px 12px rgba(0,0,0,0.4)`,
                background: "rgba(0,0,0,0.3)",
              }}>
                <img src={racer.card.image} alt={racer.card.name} className="w-full h-full object-cover"
                  loading="eager" decoding="sync"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
              </div>
              <span className="text-xs font-medium truncate max-w-[80px]" style={{ color }}>
                {racer.card.name.length > 12 ? racer.card.name.slice(0, 12) + "..." : racer.card.name}
              </span>
            </motion.div>
          );
        })}
      </div>


      <motion.div
        key={count}
        initial={{ scale: 3, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.5, opacity: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
        className="text-8xl md:text-9xl font-black"
        style={{ color: count > 0 ? "#d4a853" : "#e8c170", fontFamily: "Georgia, serif", textShadow: `0 0 60px ${count > 0 ? "rgba(212,168,83,0.5)" : "rgba(232,193,112,0.5)"}` }}
      >
        {count > 0 ? count : "GO!"}
      </motion.div>

    </motion.div>
  );
}

// ══════════════════════════════════════
// VERTICAL RACING SECTION (NEW!)
// 纵向赛道 + 镜头跟随 + 冲线接力
// ══════════════════════════════════════
function VerticalRacingSection({
  racers, trackTheme, events, camera,
}: {
  racers: Racer[];
  trackTheme: TrackTheme;
  events: RaceEvent[];
  camera: CameraState;
}) {
  const theme = TRACK_THEMES.find(t => t.id === trackTheme)!;
  const sorted = [...racers].sort((a, b) => b.progress - a.progress);
  const finishedCount = racers.filter(r => r.finished).length;
  const [eventsExpanded, setEventsExpanded] = useState(false);

  // Camera focus racer - use smoothProgress for smooth transitions
  const focusRacer = racers.find(r => r.id === camera.focusId);
  const cameraProgress = camera.smoothProgress || focusRacer?.progress || 0;

  // 赛道总高度（虚拟像素）
  const TRACK_HEIGHT = 4000;
  // 视口高度
  const VIEWPORT_HEIGHT = typeof window !== "undefined" ? window.innerHeight : 800;

  // 镜头Y偏移：跟随焦点选手
  const cameraY = (cameraProgress / 100) * TRACK_HEIGHT;

  // 终点线是否可见（进度>85%时显示）
  const showFinishLine = cameraProgress > 82;

  // 赛道颜色 - 温暖精致色调
  const laneColors = ["#d4a853", "#b8a9d4", "#e8c170", "#c4917a", "#a8c4a0", "#d4b8a0", "#e0a0b0", "#8cb8d0", "#c8b870", "#a0d0a0", "#d0a0d0", "#b0c8a0", "#d0b090", "#a0a0d0", "#c0d0a0", "#d0c0a0", "#a0c0c0", "#c0a0b0", "#b0d0c0", "#d0a0a0"];

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="h-screen flex flex-col overflow-hidden"
      style={{ background: theme.bgGradient }}
    >
      {/* Top HUD */}
      <div className="absolute top-0 left-0 right-0 z-30 px-4 pt-3">
        <div className="glass-panel px-4 py-2 flex items-center justify-between" style={{ borderRadius: 12 }}>
          <div className="flex items-center gap-3">
            <LiveIcon />
            <span className="text-xs font-bold" style={{ color: "#e8e6f0" }}>LIVE</span>
          </div>
          <div className="text-xs font-medium" style={{ color: theme.color }}>
            {theme.name}
          </div>
          <div className="text-xs" style={{ color: "#d4a853" }}>
            {finishedCount}/{racers.length} Finished
          </div>
        </div>
      </div>

      {/* Main racing viewport */}
      <div className="flex-1 relative overflow-hidden">
        {/* Scrolling track background with energy lines */}
        <div className="absolute inset-0" style={{
          background: `repeating-linear-gradient(
            180deg,
            transparent 0px,
            rgba(255,255,255,0.02) 2px,
            transparent 4px,
            transparent 80px
          )`,
          transform: `translateY(${-(cameraY % 80)}px)`,
          transition: "transform 0.1s linear",
        }} />

        {/* Flowing energy streams on sides */}
        <div className="absolute left-[8%] top-0 bottom-0 w-px" style={{
          background: `linear-gradient(180deg, transparent, ${theme.color}40, transparent)`,
          boxShadow: `0 0 10px ${theme.color}20`,
        }} />
        <div className="absolute right-[8%] top-0 bottom-0 w-px" style={{
          background: `linear-gradient(180deg, transparent, ${theme.color}40, transparent)`,
          boxShadow: `0 0 10px ${theme.color}20`,
        }} />

        {/* Lane dividers */}
        {racers.map((_, i) => {
          if (i === 0) return null;
          const xPos = 10 + (i * 80 / racers.length);
          return (
            <div key={`lane-${i}`} className="absolute top-0 bottom-0" style={{
              left: `${xPos}%`,
              width: "1px",
              background: `linear-gradient(180deg, transparent 0%, rgba(255,255,255,0.05) 30%, rgba(255,255,255,0.05) 70%, transparent 100%)`,
            }} />
          );
        })}

        {/* Speed particles flowing upward (creates sense of downward movement) */}
        <SpeedParticles color={theme.color} speed={cameraProgress} />

        {/* Finish line (only visible when close) */}
        <AnimatePresence>
          {showFinishLine && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="absolute left-[6%] right-[6%] z-20"
              style={{
                bottom: `${Math.max(5, Math.min(40, (100 - cameraProgress) * 4))}%`,
                transition: "bottom 0.15s linear",
              }}
            >
              <div style={{
                height: "4px",
                background: `repeating-linear-gradient(90deg, #d4a853 0px, #d4a853 12px, #1a1145 12px, #1a1145 24px)`,
                boxShadow: "0 0 20px rgba(212,168,83,0.5)",
                borderRadius: "2px",
              }} />
              <div className="text-center mt-1">
                <span className="text-xs font-black px-3 py-0.5 rounded-full" style={{
                  color: "#d4a853",
                  background: "rgba(212,168,83,0.15)",
                  border: "1px solid rgba(212,168,83,0.3)",
                  textShadow: "0 0 10px rgba(212,168,83,0.5)",
                }}>
                  FINISH LINE
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Racers */}
        {racers.map((racer, i) => {
          const laneWidth = 80 / racers.length;
          const laneX = 10 + i * laneWidth + laneWidth / 2;
          const color = laneColors[i % laneColors.length];

          // Y position relative to camera
          const racerWorldY = (racer.progress / 100) * TRACK_HEIGHT;
          const relativeY = racerWorldY - cameraY;
          // Map to screen: camera focus is at ~60% from top
          const screenY = 60 - (relativeY / TRACK_HEIGHT) * 300;

          // Only render if roughly on screen
          if (screenY < -30 || screenY > 130) {
            // Show off-screen indicator
            return (
              <div key={racer.id} className="absolute z-25" style={{
                left: `${laneX}%`,
                top: screenY < -30 ? "8px" : "auto",
                bottom: screenY > 130 ? "8px" : "auto",
                transform: "translateX(-50%)",
              }}>
                <div className="flex flex-col items-center" style={{ opacity: 0.6 }}>
                  <div className="w-6 h-6 rounded-full overflow-hidden" style={{ border: `2px solid ${color}`, boxShadow: `0 0 8px ${color}40` }}>
                    <img src={racer.card.image} alt="" className="w-full h-full object-cover"
                      loading="eager" decoding="sync"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                  </div>
                  <span className="text-xs mt-0.5 font-bold" style={{ color, fontSize: 9 }}>
                    {Math.round(racer.progress)}%
                  </span>
                </div>
              </div>
            );
          }

          const powerUp = racer.activePowerUp ? POWER_UPS.find(p => p.type === racer.activePowerUp) : null;
          const isFocused = camera.focusId === racer.id;

          return (
            <motion.div
              key={racer.id}
              className="absolute z-10"
              style={{
                left: `${laneX + (racer.offsetX / 10)}%`,
                top: `${screenY}%`,
                transform: "translate(-50%, -50%)",
                transition: "left 0.12s ease-out, top 0.08s linear",
              }}
            >
              {/* Trail effect */}
              {racer.trailLength > 0 && (
                <div className="absolute left-1/2 -translate-x-1/2" style={{
                  bottom: "100%",
                  width: "4px",
                  height: `${racer.trailLength * 20}px`,
                  background: `linear-gradient(180deg, transparent, ${color}80)`,
                  borderRadius: "2px",
                  filter: `blur(2px)`,
                }} />
              )}

              {/* Glow ring for focused racer */}
              {isFocused && (
                <div className="absolute -inset-4 rounded-full animate-pulse" style={{
                  background: `radial-gradient(circle, ${color}20 0%, transparent 70%)`,
                }} />
              )}

              {/* Card body */}
              <motion.div
                animate={{
                  scaleX: racer.scaleX,
                  scaleY: racer.scaleY,
                  rotate: racer.rotation,
                }}
                transition={{ type: "spring", stiffness: 400, damping: 15 }}
                className="relative"
              >
                {/* Power-up glow */}
                {powerUp && (
                  <div className="absolute -inset-2 rounded-xl animate-pulse" style={{
                    border: `2px solid ${powerUp.color}`,
                    boxShadow: `0 0 16px ${powerUp.color}60, inset 0 0 8px ${powerUp.color}20`,
                    borderRadius: "14px",
                  }} />
                )}

                {/* The actual card - size adapts to player count */}
                <div className="relative" style={{
                  width: `${Math.max(40, Math.min(80, 120 - racers.length * 6))}px`,
                  height: `${Math.max(56, Math.min(112, 168 - racers.length * 8.4))}px`,
                  borderRadius: "12px",
                  overflow: "hidden",
                  background: "linear-gradient(135deg, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0.05) 100%)",
                  border: `2.5px solid ${color}${isFocused ? "cc" : "60"}`,
                  boxShadow: `0 4px 20px rgba(0,0,0,0.4), 0 0 ${isFocused ? 20 : 8}px ${color}${isFocused ? "50" : "20"}, inset 0 1px 0 rgba(255,255,255,0.2)`,
                  filter: racer.glowIntensity > 0.5 ? `brightness(${1 + racer.glowIntensity * 0.3})` : "none",
                }}>
                  <img
                    src={racer.card.image}
                    alt={racer.card.name}
                    className="w-full h-full object-cover"
                    loading="eager"
                    decoding="sync"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                  />
                  {/* Holographic overlay */}
                  <div className="absolute inset-0" style={{
                    background: "linear-gradient(135deg, rgba(255,255,255,0.25) 0%, transparent 40%, rgba(255,255,255,0.08) 100%)",
                  }} />
                </div>

                {/* Rank badge */}
                <div className="absolute -top-2 -right-2 z-20">
                  <span className="inline-flex items-center justify-center rounded-full text-xs font-black" style={{
                    width: racers.length > 6 ? "18px" : "24px",
                    height: racers.length > 6 ? "18px" : "24px",
                    background: racer.rank ? (racer.rank === 1 ? "#d4a853" : racer.rank === 2 ? "#c0c0d0" : racer.rank === 3 ? "#cd7f32" : "rgba(100,100,120,0.8)") : `${color}cc`,
                    color: "#fff",
                    fontSize: racers.length > 6 ? "8px" : "11px",
                    boxShadow: `0 2px 8px rgba(0,0,0,0.4)`,
                  }}>
                    {racer.rank || (sortedIndexOf(racers, racer) + 1)}
                  </span>
                </div>

                {/* Name label */}
                <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap">
                  <span className="text-xs font-bold px-2 py-1 rounded" style={{
                    background: "rgba(0,0,0,0.7)",
                    color: color,
                    fontSize: racers.length > 6 ? "8px" : "10px",
                    backdropFilter: "blur(4px)",
                  }}>
                    {racer.card.name.length > (racers.length > 6 ? 12 : 18) ? racer.card.name.slice(0, racers.length > 6 ? 12 : 18) + "..." : racer.card.name}
                  </span>
                </div>

                {/* Event popup */}
                {racer.lastEvent && racer.lastEventTime > 0 && (
                  <motion.div
                    key={racer.lastEvent + racer.lastEventTime}
                    initial={{ y: 0, opacity: 1, scale: 1 }}
                    animate={{ y: -30, opacity: 0, scale: 0.8 }}
                    transition={{ duration: 1.5 }}
                    className="absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap"
                  >
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{
                      background: "rgba(0,0,0,0.7)",
                      color: powerUp ? powerUp.color : "#ffaa00",
                      fontSize: "9px",
                      border: `1px solid ${powerUp ? powerUp.color : "#ffaa00"}40`,
                    }}>
                      {racer.lastEvent}
                    </span>
                  </motion.div>
                )}
              </motion.div>
            </motion.div>
          );
        })}
      </div>

      {/* Bottom HUD: Compact rankings + Collapsible events */}
      <div className="absolute bottom-0 left-0 right-0 z-30 px-3 pb-2">
        <div className="flex gap-2 items-end">
          {/* Mini Rankings - compact */}
          <div className="glass-panel px-2 py-1.5 shrink-0" style={{ borderRadius: 10, maxHeight: 100, overflow: "auto", minWidth: 140, maxWidth: 200, background: "rgba(10,14,39,0.7)" }}>
            <div className="space-y-0.5">
              {sorted.slice(0, 5).map((r, i) => (
                <div key={r.id} className="flex items-center gap-1 text-xs" style={{
                  opacity: camera.focusId === r.id ? 1 : 0.6,
                }}>
                  <span className="font-bold shrink-0" style={{ color: i === 0 ? "#d4a853" : i === 1 ? "#c0c0d0" : i === 2 ? "#cd7f32" : "#9896a8", fontSize: 9, width: 14, textAlign: "center" }}>
                    {r.rank || (i + 1)}
                  </span>
                  <span className="truncate flex-1" style={{ color: camera.focusId === r.id ? "#fff" : "#c8c6d0", fontSize: 9 }}>
                    {r.card.name.length > 15 ? r.card.name.slice(0, 15) + "..." : r.card.name}
                  </span>
                  <span className="shrink-0" style={{ color: r.finished ? "#d4a853" : "#9896a8", fontSize: 9 }}>
                    {r.finished ? `#${r.rank}` : `${Math.round(r.progress)}%`}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Events - collapsible */}
          <div className="flex-1 min-w-0">
            <button
              onClick={() => setEventsExpanded(!eventsExpanded)}
              className="flex items-center gap-1.5 px-2 py-1 rounded-lg transition-all"
              style={{ background: "rgba(10,14,39,0.6)", backdropFilter: "blur(8px)", border: "1px solid rgba(124,92,191,0.2)" }}
            >
              <span style={{ color: "#7c5cbf", fontSize: 9, fontWeight: 700 }}>
                {eventsExpanded ? "▼" : "▲"} Race Log
              </span>
              {!eventsExpanded && events.length > 0 && (
                <span style={{ color: "#d4a853", fontSize: 9 }}>
                  {events[events.length - 1]?.message.slice(0, 30)}{events[events.length - 1]?.message.length > 30 ? "..." : ""}
                </span>
              )}
            </button>
            {eventsExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="glass-panel px-2 py-1.5 mt-1" style={{ borderRadius: 10, maxHeight: 100, overflow: "auto", background: "rgba(10,14,39,0.75)" }}
              >
                <div className="space-y-0.5">
                  {events.slice(-6).reverse().map((evt, i) => (
                    <p key={i} className="text-xs" style={{
                      color: evt.importance >= 3 ? "#d4a853" : evt.importance >= 2 ? "#b8a9d4" : "#9896a8",
                      fontSize: 9,
                      fontWeight: evt.importance >= 3 ? 700 : 400,
                      lineHeight: 1.3,
                    }}>
                      {evt.message}
                    </p>
                  ))}
                  {events.length === 0 && <p style={{ color: "#9896a8", fontSize: 9 }}>Racing in progress...</p>}
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </div>

      {/* Camera focus indicator */}
      {focusRacer && (
        <div className="absolute top-14 left-1/2 -translate-x-1/2 z-30">
          <motion.div
            key={camera.focusId}
            initial={{ y: -10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="flex items-center gap-2 px-3 py-1 rounded-full"
            style={{
              background: "rgba(0,0,0,0.5)",
              backdropFilter: "blur(8px)",
              border: "1px solid rgba(255,255,255,0.1)",
            }}
          >
            <div className="w-4 h-4 rounded-full overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.3)" }}>
              <img src={focusRacer.card.image} alt="" className="w-full h-full object-cover"
                loading="eager" decoding="sync"
                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
            </div>
            <span className="text-xs font-medium" style={{ color: "#e8e6f0", fontSize: 10 }}>
              Following: {focusRacer.card.name.slice(0, 20)}
            </span>
            <span className="text-xs font-bold" style={{ color: "#d4a853", fontSize: 10 }}>
              {Math.round(focusRacer.progress)}%
            </span>
          </motion.div>
        </div>
      )}
    </motion.div>
  );
}

// Helper: get sorted rank index
function sortedIndexOf(racers: Racer[], racer: Racer): number {
  const sorted = [...racers].sort((a, b) => b.progress - a.progress);
  return sorted.findIndex(r => r.id === racer.id);
}

// ══════════════════════════════════════
// Speed Particles (creates sense of downward movement)
// ══════════════════════════════════════
function SpeedParticles({ color, speed }: { color: string; speed: number }) {
  const particles = useMemo(() =>
    Array.from({ length: 30 }).map((_, i) => ({
      id: i,
      x: Math.random() * 100,
      delay: Math.random() * 3,
      size: Math.random() * 2 + 1,
      duration: 1 + Math.random() * 2,
    })), []);

  const intensity = Math.min(1, speed / 50);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" style={{ opacity: 0.3 + intensity * 0.5 }}>
      {particles.map(p => (
        <div key={p.id} className="absolute rounded-full" style={{
          left: `${p.x}%`,
          width: `${p.size}px`,
          height: `${p.size * (3 + intensity * 8)}px`,
          background: `linear-gradient(180deg, ${color}00, ${color}60, ${color}00)`,
          animation: `particle-fall ${p.duration / (0.5 + intensity)}s linear infinite`,
          animationDelay: `${p.delay}s`,
        }} />
      ))}
    </div>
  );
}

// ══════════════════════════════════════
// Result & Podium (ENHANCED)
// ══════════════════════════════════════
function ResultSection({ racers, onPlayAgain }: { racers: Racer[]; onPlayAgain: () => void }) {
  const sorted = [...racers].sort((a, b) => (a.rank || 99) - (b.rank || 99));
  const top3 = sorted.slice(0, 3);
  const [showDetail, setShowDetail] = useState<string | null>(null);

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="min-h-screen px-4 py-8 flex flex-col items-center"
    >
      {/* Title */}
      <motion.div
        initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
        className="flex items-center gap-3 mb-8"
      >
        <TrophyIcon size={28} />
        <h2 className="text-3xl md:text-4xl font-black text-gradient-gold" style={{ fontFamily: "Georgia, serif" }}>
          Race Complete
        </h2>
        <TrophyIcon size={28} />
      </motion.div>

      {/* Podium with real card photos */}
      <div className="relative w-full max-w-3xl mb-8">
        <div className="relative flex items-end justify-center gap-4 md:gap-8 py-8 px-4">
          {/* 2nd place */}
          {top3[1] && (
            <motion.div
              initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.3 }}
              className="flex flex-col items-center cursor-pointer"
              onClick={() => setShowDetail(top3[1].id)}
            >
              <PodiumCard racer={top3[1]} rank={2} />
              <div className="w-24 md:w-32 h-20 rounded-t-xl mt-2 flex items-center justify-center"
                style={{ background: "linear-gradient(180deg, rgba(192,192,208,0.3) 0%, rgba(192,192,208,0.1) 100%)", border: "1px solid rgba(192,192,208,0.2)" }}>
                <span className="text-2xl font-black" style={{ color: "#c0c0d0" }}>2</span>
              </div>
            </motion.div>
          )}

          {/* 1st place */}
          {top3[0] && (
            <motion.div
              initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }}
              className="flex flex-col items-center -mt-8 cursor-pointer"
              onClick={() => setShowDetail(top3[0].id)}
            >
              <PodiumCard racer={top3[0]} rank={1} />
              <div className="w-28 md:w-36 h-28 rounded-t-xl mt-2 flex items-center justify-center"
                style={{ background: "linear-gradient(180deg, rgba(212,168,83,0.3) 0%, rgba(212,168,83,0.1) 100%)", border: "1px solid rgba(212,168,83,0.3)", boxShadow: "0 0 40px rgba(212,168,83,0.15)" }}>
                <span className="text-3xl font-black" style={{ color: "#d4a853" }}>1</span>
              </div>
            </motion.div>
          )}

          {/* 3rd place */}
          {top3[2] && (
            <motion.div
              initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.5 }}
              className="flex flex-col items-center cursor-pointer"
              onClick={() => setShowDetail(top3[2].id)}
            >
              <PodiumCard racer={top3[2]} rank={3} />
              <div className="w-24 md:w-32 h-14 rounded-t-xl mt-2 flex items-center justify-center"
                style={{ background: "linear-gradient(180deg, rgba(205,127,50,0.3) 0%, rgba(205,127,50,0.1) 100%)", border: "1px solid rgba(205,127,50,0.2)" }}>
                <span className="text-2xl font-black" style={{ color: "#cd7f32" }}>3</span>
              </div>
            </motion.div>
          )}
        </div>
      </div>

      {/* Full leaderboard */}
      <div className="glass-panel p-4 md:p-6 w-full max-w-2xl mb-8" style={{ borderRadius: 20 }}>
        <h3 className="text-sm font-bold mb-4 flex items-center gap-2" style={{ color: "#d4a853" }}>
          <TrophyIcon size={14} /> Full Leaderboard
        </h3>
        <div className="space-y-2">
          {sorted.map((racer, i) => (
            <motion.div
              key={racer.id}
              initial={{ x: 60, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: i * 0.08 }}
              className="flex items-center gap-3 p-2 rounded-xl cursor-pointer transition-all duration-200 hover:bg-white/5"
              onClick={() => setShowDetail(racer.id === showDetail ? null : racer.id)}
            >
              <RankBadge rank={i + 1} />

              <div className="w-8 h-11 rounded-lg overflow-hidden shrink-0"
                style={{ border: `1.5px solid ${i === 0 ? "#d4a853" : i === 1 ? "#c0c0d0" : i === 2 ? "#cd7f32" : "rgba(255,255,255,0.1)"}40`, boxShadow: i < 3 ? `0 0 8px ${i === 0 ? "#d4a853" : i === 1 ? "#c0c0d0" : "#cd7f32"}20` : "none" }}>
                <img src={racer.card.image} alt={racer.card.name} className="w-full h-full object-cover"
                  loading="eager" decoding="sync"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                />
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate" style={{ color: "#e8e6f0" }}>{racer.card.name}</p>
                <p className="text-xs" style={{ color: "#9896a8" }}>
                  {racer.wallet.slice(0, 6)}...{racer.wallet.slice(-4)}
                  {racer.funTag && <span className="ml-2" style={{ color: "#d4a853" }}>{racer.funTag}</span>}
                </p>
              </div>

              <div className="text-right">
                <span className="text-xs font-mono block" style={{ color: "#e8e6f0" }}>
                  {racer.finishTime?.toFixed(1)}s
                </span>
                <span className="text-xs" style={{ color: "#9896a8", fontSize: 9 }}>
                  {racer.overtakes} overtakes
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Card detail modal */}
      <AnimatePresence>
        {showDetail && (
          <CardDetailModal
            racer={sorted.find(r => r.id === showDetail)!}
            onClose={() => setShowDetail(null)}
          />
        )}
      </AnimatePresence>

      {/* Play again */}
      <motion.button
        initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.5 }}
        whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
        onClick={onPlayAgain}
        className="gold-jelly-button text-sm px-10 py-3 rounded-2xl"
      >
        Race Again
      </motion.button>
    </motion.div>
  );
}

// ── Podium Card ──
function PodiumCard({ racer, rank }: { racer: Racer; rank: number }) {
  const borderColor = rank === 1 ? "#d4a853" : rank === 2 ? "#c0c0d0" : "#cd7f32";
  const size = rank === 1 ? "w-32 h-44 md:w-40 md:h-56" : "w-24 h-34 md:w-32 md:h-44";

  return (
    <motion.div
      className="relative flex flex-col items-center"
      whileHover={{ scale: 1.03, y: -3 }}
    >
      <div className={`${size} rounded-xl overflow-hidden relative`}
        style={{
          border: `3px solid ${borderColor}`,
          boxShadow: `0 8px 24px rgba(0,0,0,0.3)`,
        }}
      >
        <img src={racer.card.image} alt={racer.card.name} className="w-full h-full object-cover"
          loading="eager" decoding="sync"
          onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
        />
      </div>

      <p className="text-sm font-bold text-center mt-2 truncate max-w-36" style={{ color: borderColor }}>
        {racer.card.name.length > 22 ? racer.card.name.slice(0, 22) + "..." : racer.card.name}
      </p>
      {racer.funTag && (
        <p className="text-xs text-center mt-0.5" style={{ color: "#9896a8" }}>
          {racer.funTag}
        </p>
      )}
    </motion.div>
  );
}

// ── Card Detail Modal ──
function CardDetailModal({ racer, onClose }: { racer: Racer; onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <motion.div
        initial={{ scale: 0.8, y: 30 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.8, y: 30 }}
        className="glass-panel p-6 md:p-8 max-w-md w-full relative z-10"
        style={{ borderRadius: 24 }}
        onClick={e => e.stopPropagation()}
      >
        <button onClick={onClose} className="absolute top-4 right-4 hover:opacity-70 transition-opacity">
          <CloseIcon size={18} />
        </button>

        <div className="flex justify-center mb-6">
          <motion.div
            className="w-48 h-64 rounded-2xl overflow-hidden relative"
            animate={{ rotateY: [0, 5, -5, 0] }}
            transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
            style={{
              background: "linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.03) 100%)",
              border: `2px solid ${racer.rank === 1 ? "#d4a853" : racer.rank === 2 ? "#c0c0d0" : racer.rank === 3 ? "#cd7f32" : "rgba(255,255,255,0.15)"}`,
              boxShadow: `0 12px 48px rgba(0,0,0,0.5), 0 0 30px ${racer.rank === 1 ? "rgba(212,168,83,0.2)" : "rgba(124,92,191,0.15)"}`,
              perspective: "1000px",
            }}
          >
            <img src={racer.card.image} alt={racer.card.name} className="w-full h-full object-cover"
              loading="eager" decoding="sync"
              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
            />
            <div className="absolute inset-0" style={{
              background: "linear-gradient(135deg, rgba(255,255,255,0.2) 0%, transparent 50%, rgba(255,255,255,0.05) 100%)",
            }} />
          </motion.div>
        </div>

        <h3 className="text-xl font-bold text-center mb-1" style={{ color: "#e8e6f0" }}>{racer.card.name}</h3>
        <p className="text-xs text-center mb-4" style={{ color: "#9896a8" }}>
          {racer.wallet.slice(0, 10)}...{racer.wallet.slice(-6)}
        </p>

        <div className="grid grid-cols-2 gap-2 mb-4">
          {[
            { label: "Grade", value: racer.card.grade, color: "#d4a853" },
            { label: "Year", value: racer.card.year, color: "#b8a9d4" },
            { label: "Serial", value: racer.card.serial, color: "#a8c4a0" },
            { label: "Grader", value: racer.card.grader, color: "#c4917a" },
          ].map(attr => (
            <div key={attr.label} className="p-2 rounded-xl text-center" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <p className="text-xs" style={{ color: "#9896a8" }}>{attr.label}</p>
              <p className="text-sm font-bold truncate" style={{ color: attr.color }}>{attr.value || "N/A"}</p>
            </div>
          ))}
        </div>

        <div className="p-3 rounded-xl" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
          <div className="flex justify-between text-xs mb-1">
            <span style={{ color: "#9896a8" }}>Rank</span>
            <span className="font-bold" style={{ color: "#d4a853" }}>#{racer.rank}</span>
          </div>
          <div className="flex justify-between text-xs mb-1">
            <span style={{ color: "#9896a8" }}>Finish Time</span>
            <span className="font-mono" style={{ color: "#e8e6f0" }}>{racer.finishTime?.toFixed(2)}s</span>
          </div>
          <div className="flex justify-between text-xs mb-1">
            <span style={{ color: "#9896a8" }}>Overtakes</span>
            <span style={{ color: "#e8e6f0" }}>{racer.overtakes}</span>
          </div>
          <div className="flex justify-between text-xs mb-1">
            <span style={{ color: "#9896a8" }}>Max Speed</span>
            <span style={{ color: "#e8e6f0" }}>{racer.maxSpeed.toFixed(1)}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span style={{ color: "#9896a8" }}>Power-ups Used</span>
            <span style={{ color: "#e8e6f0" }}>{racer.powerUpsUsed}</span>
          </div>
          {racer.funTag && (
            <div className="mt-2 text-center">
              <span className="text-xs px-3 py-1 rounded-full" style={{ background: "rgba(212,168,83,0.12)", color: "#d4a853", border: "1px solid rgba(212,168,83,0.2)" }}>
                {racer.funTag}
              </span>
            </div>
          )}
        </div>

        {/* 前往卡牌 button */}
        <a
          href={`https://www.renaiss.xyz/card/${racer.card.tokenId}`}
          target="_blank"
          rel="noopener noreferrer"
          className="block mt-4 w-full text-center py-3 rounded-xl text-sm font-bold transition-all duration-200 hover:brightness-110"
          style={{
            background: "linear-gradient(135deg, #d4a853 0%, #e8c170 100%)",
            color: "#1a1530",
            boxShadow: "0 4px 16px rgba(212,168,83,0.3)",
          }}
        >
          前往卡牌
        </a>
        <p className="text-center mt-2 text-xs" style={{ color: "#9896a8" }}>
          Token ID: {racer.card.tokenId}
        </p>
      </motion.div>
    </motion.div>
  );
}
