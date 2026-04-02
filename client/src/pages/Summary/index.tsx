/**
 * Summary - Renaiss Battle Report System
 * 链上全量数据战报 — 王者总结风格
 *
 * Features:
 * - On-chain transaction analysis (machine tier detection)
 * - Financial settlement model (net worth, ROI)
 * - Luck index with animated arc gauge
 * - Hall of Fame & Shame highlights
 * - Asset distribution charts
 * - Art poster export
 * - Skeleton screen loading
 *
 * Pure text, no emoji — premium editorial aesthetic
 */

import AppNav from "@/components/AppNav";
import FoggyBg from "@/components/FoggyBg";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import {
  Search,
  RotateCcw,
  AlertCircle,
  ChevronDown,
} from "lucide-react";

import { useSummaryData } from "./hooks/useSummaryData";
import StatsOverview from "./components/StatsOverview";
import MachineBreakdown from "./components/MachineBreakdown";
import AssetChart from "./components/AssetChart";
import Highlights from "./components/Highlights";
import LuckIndex from "./components/LuckIndex";
import PosterExport from "./components/PosterExport";
import SummarySkeleton from "./components/SummarySkeleton";

const DEFAULT_ADDRESS = "0xDc856d647dBa054DfAFB777be2E261Ec0e59B6E0";

type TimeMode = "genesis" | "monthly";

const MONTH_OPTIONS = [
  { value: "2026-04", label: "2026 年 4 月" },
  { value: "2026-03", label: "2026 年 3 月" },
  { value: "2026-02", label: "2026 年 2 月" },
  { value: "2026-01", label: "2026 年 1 月" },
];

export default function Summary() {
  const { isLoggedIn } = useAuth();
  const [, setLocation] = useLocation();

  const [walletInput, setWalletInput] = useState(DEFAULT_ADDRESS);
  const [inputError, setInputError] = useState("");
  const [timeMode, setTimeMode] = useState<TimeMode>("genesis");
  const [selectedMonth, setSelectedMonth] = useState("2026-04");

  const { data, phase, error, progress, fetchSummary, reset } = useSummaryData();

  // Preview mode: allow unauthenticated access for sandbox demo
  // In production, uncomment the auth guard below:
  // useEffect(() => {
  //   if (!isLoggedIn) setLocation("/login");
  // }, [isLoggedIn, setLocation]);
  // if (!isLoggedIn) return null;

  const isLoading = phase !== "idle" && phase !== "done" && phase !== "error";
  const isDone = phase === "done";

  const handleSearch = () => {
    if (!/^0x[a-fA-F0-9]{40}$/.test(walletInput.trim())) {
      setInputError("请输入有效的钱包地址（0x 开头，共 42 位）");
      return;
    }
    setInputError("");
    fetchSummary(walletInput.trim());
  };

  const handleReset = () => {
    reset();
    setWalletInput(DEFAULT_ADDRESS);
    setInputError("");
  };

  return (
    <div className="relative min-h-screen">
      <FoggyBg />
      <AppNav />

      <main className="relative z-10 pt-24 pb-20 px-4 max-w-[1100px] mx-auto">
        {/* Page header */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8"
        >
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div>
              <h1 className="font-display text-3xl md:text-4xl font-bold text-white mb-1">
                链上战报
              </h1>
              <p className="text-white/30 text-sm font-heading">
                Renaiss 全量数据分析 · 财务清算 · 生涯总结
              </p>
            </div>

            {isDone && data && (
              <PosterExport data={data} />
            )}
          </div>
        </motion.div>

        {/* Input panel */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="glass-card p-5 mb-6"
        >
          {/* Time mode selector */}
          <div className="flex items-center gap-2 mb-4">
            {(["genesis", "monthly"] as TimeMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => setTimeMode(mode)}
                className={`px-4 py-1.5 rounded-full text-xs font-heading font-semibold transition-all ${
                  timeMode === mode
                    ? "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                    : "text-white/30 hover:text-white/50 border border-transparent"
                }`}
              >
                {mode === "genesis" ? "创世总结" : "月度总结"}
              </button>
            ))}

            {timeMode === "monthly" && (
              <div className="relative ml-2">
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="appearance-none bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 pr-7 text-xs font-heading text-white/60 focus:outline-none focus:border-purple-500/40"
                >
                  {MONTH_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value} className="bg-[#0d0b1a]">
                      {opt.label}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-white/30 pointer-events-none" />
              </div>
            )}
          </div>

          {/* Address input */}
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <input
                type="text"
                value={walletInput}
                onChange={(e) => {
                  setWalletInput(e.target.value);
                  if (inputError) setInputError("");
                }}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                placeholder="输入钱包地址 0x..."
                className={`w-full bg-white/[0.03] border rounded-xl px-4 py-3 text-sm font-mono text-white/80 placeholder:text-white/20 focus:outline-none transition-colors ${
                  inputError
                    ? "border-red-500/40 focus:border-red-500/60"
                    : "border-white/8 focus:border-purple-500/40"
                }`}
              />
              {inputError && (
                <div className="flex items-center gap-1.5 mt-1.5 text-red-400 text-xs font-heading">
                  <AlertCircle className="w-3 h-3" />
                  {inputError}
                </div>
              )}
            </div>

            <button
              onClick={handleSearch}
              disabled={isLoading}
              className="flex items-center gap-2 px-5 py-3 rounded-xl font-heading font-semibold text-sm text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              style={{
                background: "linear-gradient(135deg, #7c3aed 0%, #9333ea 100%)",
                boxShadow: "0 4px 20px rgba(124, 58, 237, 0.25)",
              }}
            >
              <Search className="w-4 h-4" />
              {isLoading ? "分析中" : "开始分析"}
            </button>

            {(isDone || phase === "error") && (
              <button
                onClick={handleReset}
                className="flex items-center gap-1.5 px-4 py-3 rounded-xl border border-white/8 text-white/40 hover:text-white/60 hover:border-white/15 transition-all text-sm font-heading"
              >
                <RotateCcw className="w-4 h-4" />
                重置
              </button>
            )}
          </div>
        </motion.div>

        {/* Error state */}
        <AnimatePresence>
          {phase === "error" && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="glass-card p-4 mb-6 border border-red-500/20 flex items-center gap-3"
            >
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
              <p className="text-red-400 text-sm font-heading">{error}</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Loading skeleton */}
        <AnimatePresence>
          {isLoading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <SummarySkeleton phase={phase} progress={progress} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main content */}
        <AnimatePresence>
          {isDone && data && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4 }}
              className="space-y-10"
            >
              {/* Narrative header */}
              {timeMode === "genesis" && data.firstTxDate && (
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="glass-card p-5 border border-purple-500/10"
                >
                  <p className="text-white/40 text-sm font-heading leading-relaxed">
                    那是{" "}
                    <span className="text-purple-300 font-semibold">
                      {data.firstTxDate.toLocaleDateString("zh-CN", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </span>
                    ，你开启了在 Renaiss 的第一次探索。此后{" "}
                    <span className="text-purple-300 font-semibold">{data.totalTxCount} 笔</span>{" "}
                    链上记录，见证了你的每一次出手与抉择。
                  </p>
                </motion.div>
              )}

              {timeMode === "monthly" && (
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="glass-card p-5 border border-purple-500/10"
                >
                  <p className="text-white/40 text-sm font-heading leading-relaxed">
                    在{" "}
                    <span className="text-purple-300 font-semibold">
                      {MONTH_OPTIONS.find((o) => o.value === selectedMonth)?.label}
                    </span>
                    ，你的欧气指数超越了全服{" "}
                    <span className="text-purple-300 font-semibold">
                      {data.luckIndex >= 50 ? Math.round(data.luckIndex) : 100 - Math.round(data.luckIndex)}%
                    </span>{" "}
                    的玩家。
                  </p>
                </motion.div>
              )}

              {/* Section 1: Financial overview */}
              <section>
                <SectionLabel index="01" title="财务总览" subtitle="Net Worth · ROI · 核心指标" />
                <StatsOverview data={data} />
              </section>

              {/* Section 2: Machine breakdown */}
              <section>
                <SectionLabel index="02" title="卡机明细" subtitle="各档位投入 · 回笼 · 链上流水" />
                <MachineBreakdown
                  machineStats={data.machineStats}
                  totalInvested={data.totalInvested}
                />
              </section>

              {/* Section 3: Asset charts */}
              <section>
                <SectionLabel index="03" title="资产分布" subtitle="净值走势 · 卡机占比 · 月度对比" />
                <AssetChart data={data} />
              </section>

              {/* Section 4: Highlights */}
              <section>
                <SectionLabel index="04" title="荣耀殿堂" subtitle="封神 · 遗憾 · 惨痛 · 守望" />
                <Highlights
                  godMoment={data.godMoment}
                  regretCard={data.regretCard}
                  worstCard={data.worstCard}
                  longestHeldCard={data.longestHeldCard}
                />
              </section>

              {/* Section 5: Luck index */}
              <section>
                <SectionLabel index="05" title="欧气指数" subtitle="稀有度产出比 · 全服排名" />
                <LuckIndex
                  luckIndex={data.luckIndex}
                  luckRank={data.luckRank}
                  luckBadgeColor={data.luckBadgeColor}
                  totalMints={data.totalMintCount}
                />
              </section>

              {/* Export CTA */}
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="pt-4"
              >
                <PosterExport data={data} />
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Idle state */}
        {phase === "idle" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-20 text-center"
          >
            <div className="w-16 h-16 rounded-2xl bg-purple-500/10 border border-purple-500/15 flex items-center justify-center mb-5">
              <Search className="w-8 h-8 text-purple-400/60" />
            </div>
            <p className="text-white/30 text-sm font-heading max-w-xs leading-relaxed">
              输入钱包地址，系统将自动扫描链上数据并生成你的专属战报
            </p>
          </motion.div>
        )}
      </main>
    </div>
  );
}

function SectionLabel({
  index,
  title,
  subtitle,
}: {
  index: string;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="flex items-center gap-4 mb-5">
      <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-white/[0.03] border border-white/8 flex items-center justify-center">
        <span className="font-mono text-xs text-white/20 font-bold">{index}</span>
      </div>
      <div className="flex-1 min-w-0">
        <h2 className="text-white font-heading font-bold text-base">{title}</h2>
        <p className="text-white/25 text-xs font-heading">{subtitle}</p>
      </div>
      <div className="h-px flex-1 bg-white/5" />
    </div>
  );
}
