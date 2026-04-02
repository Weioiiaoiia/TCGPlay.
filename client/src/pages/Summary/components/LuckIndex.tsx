/**
 * LuckIndex - Luck score visualization with dynamic badge
 * 欧气指数 — 0-100 score with animated arc gauge and rank badge
 * Pure text, no emoji — premium editorial style
 */

import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { useCountUp } from "../hooks/useCountUp";

interface LuckIndexProps {
  luckIndex: number;
  luckRank: string;
  luckBadgeColor: string;
  totalMints: number;
}

const RANK_DESCRIPTIONS: Record<string, string> = {
  "神话传说": "稀有卡牌产出率远超全服均值，本赛季欧气值位居顶尖梯队。",
  "荣耀典藏": "稀有卡牌产出率显著高于平均水平，运势处于强势区间。",
  "永恒钻石": "稀有卡牌产出率高于均值，抽卡运气整体偏好。",
  "黄金荣耀": "稀有卡牌产出率接近全服平均，偶有超预期收获。",
  "白银勇士": "稀有卡牌产出率略低于均值，整体运势趋于平稳。",
  "青铜守卫": "稀有卡牌产出率低于平均水平，欧气储备有待积累。",
  "欧气枯竭": "稀有卡牌产出率显著低于均值，建议调整策略后再战。",
};

export default function LuckIndex({ luckIndex, luckRank, luckBadgeColor, totalMints }: LuckIndexProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animatedScore = useCountUp({ end: luckIndex, duration: 2000, delay: 500 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const size = canvas.width;
    const cx = size / 2;
    const cy = size / 2;
    const radius = size * 0.38;
    const lineWidth = size * 0.055;

    ctx.clearRect(0, 0, size, size);

    // Background track
    ctx.beginPath();
    ctx.arc(cx, cy, radius, Math.PI * 0.75, Math.PI * 2.25);
    ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
    ctx.lineWidth = lineWidth;
    ctx.lineCap = "round";
    ctx.stroke();

    // Progress arc
    const progress = luckIndex / 100;
    const startAngle = Math.PI * 0.75;
    const endAngle = startAngle + Math.PI * 1.5 * progress;

    if (progress > 0) {
      const gradient = ctx.createLinearGradient(0, 0, size, size);
      gradient.addColorStop(0, luckBadgeColor + "60");
      gradient.addColorStop(1, luckBadgeColor);

      ctx.beginPath();
      ctx.arc(cx, cy, radius, startAngle, endAngle);
      ctx.strokeStyle = gradient;
      ctx.lineWidth = lineWidth;
      ctx.lineCap = "round";
      ctx.shadowBlur = 18;
      ctx.shadowColor = luckBadgeColor;
      ctx.stroke();
    }
  }, [luckIndex, luckBadgeColor]);

  const description = RANK_DESCRIPTIONS[luckRank] || "继续探索你的链上旅程。";

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
          <Sparkles className="w-4 h-4 text-purple-400" />
        </div>
        <div>
          <h3 className="text-white font-heading font-semibold">欧气指数</h3>
          <p className="text-white/30 text-xs font-heading">基于稀有度产出比综合计算</p>
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.92 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        className="glass-card p-6 md:p-8"
        style={{
          border: `1px solid ${luckBadgeColor}25`,
          boxShadow: `0 0 40px ${luckBadgeColor}12`,
        }}
      >
        <div className="flex flex-col md:flex-row items-center gap-8">
          {/* Arc gauge */}
          <div className="relative flex-shrink-0">
            <canvas ref={canvasRef} width={200} height={200} className="w-40 h-40 md:w-48 md:h-48" />
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <motion.div
                className="font-display text-4xl md:text-5xl font-bold"
                style={{
                  color: luckBadgeColor,
                  textShadow: `0 0 28px ${luckBadgeColor}70`,
                }}
              >
                {animatedScore}
              </motion.div>
              <div className="text-white/25 text-xs font-mono mt-1">/ 100</div>
            </div>
          </div>

          {/* Info panel */}
          <div className="flex-1 text-center md:text-left">
            {/* Rank badge */}
            <motion.div
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.4, type: "spring" }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-4"
              style={{
                background: `${luckBadgeColor}12`,
                border: `1px solid ${luckBadgeColor}35`,
              }}
            >
              <div
                className="w-1.5 h-1.5 rounded-full"
                style={{ background: luckBadgeColor, boxShadow: `0 0 6px ${luckBadgeColor}` }}
              />
              <span
                className="font-display text-base font-bold tracking-wide"
                style={{ color: luckBadgeColor }}
              >
                {luckRank}
              </span>
            </motion.div>

            <p className="text-white/50 text-sm font-heading leading-relaxed mb-5">
              {description}
            </p>

            {/* Stats row */}
            <div className="grid grid-cols-2 gap-3">
              <div
                className="rounded-xl p-3 text-center"
                style={{
                  background: `${luckBadgeColor}07`,
                  border: `1px solid ${luckBadgeColor}18`,
                }}
              >
                <div
                  className="font-display text-2xl font-bold"
                  style={{ color: luckBadgeColor }}
                >
                  {totalMints}
                </div>
                <div className="text-white/25 text-xs font-heading mt-0.5 uppercase tracking-wider">
                  总抽次数
                </div>
              </div>
              <div
                className="rounded-xl p-3 text-center"
                style={{
                  background: `${luckBadgeColor}07`,
                  border: `1px solid ${luckBadgeColor}18`,
                }}
              >
                <div
                  className="font-display text-xl font-bold"
                  style={{ color: luckBadgeColor }}
                >
                  {luckIndex >= 50 ? "高于均值" : "低于均值"}
                </div>
                <div className="text-white/25 text-xs font-heading mt-0.5 uppercase tracking-wider">
                  全服对比
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
