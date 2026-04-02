/**
 * SummarySkeleton - Loading skeleton screen for Summary page
 * Matches the final layout to prevent layout shift
 */

import { motion } from "framer-motion";

function SkeletonBlock({ className = "" }: { className?: string }) {
  return (
    <div className={`bg-white/[0.04] animate-pulse rounded-xl ${className}`} />
  );
}

interface SummarySkeletonProps {
  phase: string;
  progress: number;
}

const PHASE_LABELS: Record<string, string> = {
  "fetching-txs": "正在拉取链上交易记录",
  "analyzing-machines": "正在识别卡机交互数据",
  "fetching-nfts": "正在扫描 NFT 持仓",
  "computing-metrics": "正在计算财务指标",
};

export default function SummarySkeleton({ phase, progress }: SummarySkeletonProps) {
  const label = PHASE_LABELS[phase] || "数据加载中";

  return (
    <div className="space-y-6">
      {/* Progress indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="glass-card p-5 border border-purple-500/15"
      >
        <div className="flex items-center justify-between mb-3">
          <span className="text-white/50 text-sm font-heading">{label}</span>
          <span className="text-purple-400 text-sm font-mono">{progress}%</span>
        </div>
        <div className="h-1 bg-white/5 rounded-full overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            style={{
              background: "linear-gradient(90deg, #7c3aed, #9333ea)",
              boxShadow: "0 0 12px rgba(124, 58, 237, 0.5)",
            }}
            initial={{ width: "0%" }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.4, ease: "easeOut" }}
          />
        </div>
      </motion.div>

      {/* Hero skeleton */}
      <SkeletonBlock className="h-48" />

      {/* Stats grid skeleton */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <SkeletonBlock key={i} className="h-24" />
        ))}
      </div>

      {/* Breakdown skeleton */}
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonBlock key={i} className="h-16" />
        ))}
      </div>

      {/* Charts skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <SkeletonBlock className="h-52" />
        <SkeletonBlock className="h-52" />
      </div>

      {/* Highlights skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonBlock key={i} className="h-44" />
        ))}
      </div>
    </div>
  );
}
