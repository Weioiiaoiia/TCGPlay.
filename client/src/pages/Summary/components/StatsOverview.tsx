/**
 * StatsOverview - Core financial metrics dashboard
 * Features: animated count-up numbers, neon glow effects, ROI display
 */

import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, Wallet, Target, Zap, DollarSign } from "lucide-react";
import { useCountUp } from "../hooks/useCountUp";
import type { SummaryData } from "../hooks/useSummaryData";

interface StatsOverviewProps {
  data: SummaryData;
}

function StatCard({
  label,
  value,
  prefix = "",
  suffix = "",
  isPositive,
  icon: Icon,
  delay = 0,
  large = false,
  glowColor = "purple",
}: {
  label: string;
  value: number;
  prefix?: string;
  suffix?: string;
  isPositive?: boolean;
  icon: React.ElementType;
  delay?: number;
  large?: boolean;
  glowColor?: "purple" | "gold" | "green" | "red" | "blue";
}) {
  const animated = useCountUp({ end: value, duration: 1600, decimals: 1, delay });

  const glowColors = {
    purple: "rgba(139, 92, 246, 0.3)",
    gold: "rgba(212, 168, 83, 0.3)",
    green: "rgba(34, 197, 94, 0.3)",
    red: "rgba(239, 68, 68, 0.3)",
    blue: "rgba(96, 165, 250, 0.3)",
  };

  const textColors = {
    purple: "text-purple-400",
    gold: "text-yellow-400",
    green: "text-emerald-400",
    red: "text-red-400",
    blue: "text-blue-400",
  };

  const borderColors = {
    purple: "border-purple-500/20",
    gold: "border-yellow-500/20",
    green: "border-emerald-500/20",
    red: "border-red-500/20",
    blue: "border-blue-500/20",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: delay / 1000 }}
      className={`glass-card p-5 border ${borderColors[glowColor]} relative overflow-hidden`}
      style={{
        boxShadow: `0 0 30px ${glowColors[glowColor]}, inset 0 1px 0 rgba(255,255,255,0.05)`,
      }}
    >
      {/* Background glow */}
      <div
        className="absolute inset-0 opacity-5 rounded-xl"
        style={{
          background: `radial-gradient(ellipse at top left, ${glowColors[glowColor].replace("0.3", "1")} 0%, transparent 70%)`,
        }}
      />

      <div className="relative z-10">
        <div className="flex items-center justify-between mb-3">
          <span className="text-white/40 text-xs font-heading font-medium tracking-wider uppercase">
            {label}
          </span>
          <div
            className={`w-8 h-8 rounded-lg flex items-center justify-center`}
            style={{ background: `${glowColors[glowColor].replace("0.3", "0.15")}` }}
          >
            <Icon className={`w-4 h-4 ${textColors[glowColor]}`} />
          </div>
        </div>

        <div className={`font-display font-bold ${large ? "text-3xl md:text-4xl" : "text-2xl"} ${textColors[glowColor]}`}>
          {isPositive !== undefined && (
            <span className={isPositive ? "text-emerald-400" : "text-red-400"}>
              {isPositive ? "+" : ""}
            </span>
          )}
          {prefix}
          {Math.abs(animated).toFixed(1)}
          {suffix}
        </div>
      </div>
    </motion.div>
  );
}

export default function StatsOverview({ data }: StatsOverviewProps) {
  const isProfit = data.netWorth >= 0;
  const roiAnimated = useCountUp({ end: data.roi, duration: 2000, decimals: 1, delay: 200 });

  return (
    <div className="space-y-6">
      {/* Hero P&L Display */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.7 }}
        className="glass-card p-8 md:p-10 text-center relative overflow-hidden"
        style={{
          boxShadow: isProfit
            ? "0 0 60px rgba(34, 197, 94, 0.15), 0 0 120px rgba(34, 197, 94, 0.05)"
            : "0 0 60px rgba(239, 68, 68, 0.15), 0 0 120px rgba(239, 68, 68, 0.05)",
          border: isProfit ? "1px solid rgba(34, 197, 94, 0.15)" : "1px solid rgba(239, 68, 68, 0.15)",
        }}
      >
        {/* Animated background gradient */}
        <div
          className="absolute inset-0 opacity-10"
          style={{
            background: isProfit
              ? "radial-gradient(ellipse at center, rgba(34, 197, 94, 0.4) 0%, transparent 70%)"
              : "radial-gradient(ellipse at center, rgba(239, 68, 68, 0.4) 0%, transparent 70%)",
          }}
        />

        {/* Scan line effect */}
        <motion.div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: "linear-gradient(0deg, transparent 0%, rgba(255,255,255,0.03) 50%, transparent 100%)",
            backgroundSize: "100% 4px",
          }}
        />

        <div className="relative z-10">
          <p className="text-white/40 text-sm font-heading uppercase tracking-widest mb-2">
            综合净值 / Net Worth
          </p>

          <motion.div
            className={`font-display text-5xl md:text-7xl font-bold mb-2 ${isProfit ? "text-emerald-400" : "text-red-400"}`}
            style={{
              textShadow: isProfit
                ? "0 0 40px rgba(34, 197, 94, 0.6), 0 0 80px rgba(34, 197, 94, 0.3)"
                : "0 0 40px rgba(239, 68, 68, 0.6), 0 0 80px rgba(239, 68, 68, 0.3)",
            }}
          >
            {isProfit ? "+" : ""}
            <NetWorthCounter value={data.netWorth} />
            <span className="text-2xl md:text-3xl ml-1">U</span>
          </motion.div>

          <div className="flex items-center justify-center gap-3 mt-3">
            <div
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-heading font-semibold ${
                isProfit
                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                  : "bg-red-500/10 text-red-400 border border-red-500/20"
              }`}
            >
              {isProfit ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
              回本进度 ROI: {isProfit ? "+" : ""}{roiAnimated.toFixed(1)}%
            </div>
          </div>

          <p className="text-white/25 text-xs font-heading mt-4">
            首次探索于 {data.firstTxDate?.toLocaleDateString("zh-CN")} · 已征战 {data.totalTxCount} 笔链上记录
          </p>
        </div>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <StatCard
          label="总投入"
          value={data.totalInvested}
          suffix=" U"
          icon={DollarSign}
          delay={100}
          glowColor="purple"
        />
        <StatCard
          label="已回笼"
          value={data.totalRecovered}
          suffix=" U"
          icon={Wallet}
          delay={200}
          glowColor="blue"
        />
        <StatCard
          label="持仓估值"
          value={data.currentInventoryValue}
          suffix=" U"
          icon={Target}
          delay={300}
          glowColor="gold"
        />
        <StatCard
          label="总抽次数"
          value={data.totalMintCount}
          suffix=" 次"
          icon={Zap}
          delay={400}
          glowColor="purple"
        />
        <StatCard
          label="当前持仓"
          value={data.currentNFTCount}
          suffix=" 张"
          icon={Target}
          delay={500}
          glowColor="blue"
        />
        <StatCard
          label="Gas 消耗"
          value={data.gasFeesTotal}
          suffix=" U"
          icon={Zap}
          delay={600}
          glowColor="gold"
        />
      </div>
    </div>
  );
}

function NetWorthCounter({ value }: { value: number }) {
  const animated = useCountUp({ end: value, duration: 2200, decimals: 1, delay: 300, easing: "easeInOut" });
  return <>{Math.abs(animated).toFixed(1)}</>;
}
