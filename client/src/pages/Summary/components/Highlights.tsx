/**
 * Highlights - Hall of Fame & Shame
 * 封神时刻 / 拍大腿警告 / 惨痛回忆 / 深情守望
 * Pure text, no emoji — premium editorial style
 */

import { motion } from "framer-motion";
import { Trophy, AlertTriangle, Skull, Heart, ExternalLink } from "lucide-react";
import type { CardHighlight } from "../hooks/useSummaryData";

interface HighlightsProps {
  godMoment: CardHighlight | null;
  regretCard: CardHighlight | null;
  worstCard: CardHighlight | null;
  longestHeldCard: CardHighlight | null;
}

interface HighlightCardProps {
  title: string;
  subtitle: string;
  icon: React.ElementType;
  card: CardHighlight | null;
  colorScheme: "gold" | "orange" | "red" | "blue";
  delay?: number;
  extraInfo?: string;
}

const colorSchemes = {
  gold: {
    border: "border-yellow-500/20",
    glow: "rgba(212, 168, 83, 0.18)",
    iconBg: "bg-yellow-500/10",
    iconColor: "text-yellow-400",
    titleColor: "text-yellow-400",
    badge: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
    valueBg: "bg-yellow-500/5",
  },
  orange: {
    border: "border-orange-500/20",
    glow: "rgba(249, 115, 22, 0.18)",
    iconBg: "bg-orange-500/10",
    iconColor: "text-orange-400",
    titleColor: "text-orange-400",
    badge: "bg-orange-500/10 text-orange-400 border-orange-500/20",
    valueBg: "bg-orange-500/5",
  },
  red: {
    border: "border-red-500/20",
    glow: "rgba(239, 68, 68, 0.18)",
    iconBg: "bg-red-500/10",
    iconColor: "text-red-400",
    titleColor: "text-red-400",
    badge: "bg-red-500/10 text-red-400 border-red-500/20",
    valueBg: "bg-red-500/5",
  },
  blue: {
    border: "border-blue-500/20",
    glow: "rgba(96, 165, 250, 0.18)",
    iconBg: "bg-blue-500/10",
    iconColor: "text-blue-400",
    titleColor: "text-blue-400",
    badge: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    valueBg: "bg-blue-500/5",
  },
};

function HighlightCard({ title, subtitle, icon: Icon, card, colorScheme, delay = 0, extraInfo }: HighlightCardProps) {
  const colors = colorSchemes[colorScheme];

  if (!card) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay }}
        className={`glass-card p-5 border ${colors.border} relative overflow-hidden opacity-40`}
      >
        <div className="flex items-center gap-3 mb-3">
          <div className={`w-9 h-9 rounded-xl ${colors.iconBg} flex items-center justify-center`}>
            <Icon className={`w-5 h-5 ${colors.iconColor}`} />
          </div>
          <div>
            <p className={`font-heading font-bold text-sm ${colors.titleColor}`}>{title}</p>
            <p className="text-white/30 text-xs">{subtitle}</p>
          </div>
        </div>
        <p className="text-white/20 text-sm font-heading">暂无数据</p>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      className={`glass-card p-5 border ${colors.border} relative overflow-hidden`}
      style={{ boxShadow: `0 0 28px ${colors.glow}` }}
    >
      {/* Ambient background */}
      <div
        className="absolute inset-0 opacity-[0.04] pointer-events-none"
        style={{
          background: `radial-gradient(ellipse at top right, ${colors.glow.replace("0.18", "1")} 0%, transparent 70%)`,
        }}
      />

      <div className="relative z-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-xl ${colors.iconBg} flex items-center justify-center`}>
              <Icon className={`w-5 h-5 ${colors.iconColor}`} />
            </div>
            <div>
              <p className={`font-heading font-bold text-sm ${colors.titleColor}`}>{title}</p>
              <p className="text-white/30 text-xs font-heading">{subtitle}</p>
            </div>
          </div>
          <span
            className={`px-2.5 py-1 rounded-full text-xs font-heading font-semibold border ${colors.badge}`}
          >
            {card.rarity}
          </span>
        </div>

        {/* Card info block */}
        <div className={`rounded-xl p-3 ${colors.valueBg} border border-white/5 mb-3`}>
          <p className="text-white font-heading font-semibold text-sm mb-2">{card.name}</p>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs font-mono">
            {card.buyPrice > 0 && (
              <div className="flex justify-between">
                <span className="text-white/30">买入</span>
                <span className="text-white/60">{card.buyPrice} U</span>
              </div>
            )}
            {card.sellPrice > 0 && (
              <div className="flex justify-between">
                <span className="text-white/30">卖出</span>
                <span className="text-white/60">{card.sellPrice} U</span>
              </div>
            )}
            {card.currentFMV > 0 && (
              <div className="flex justify-between">
                <span className="text-white/30">当前估值</span>
                <span className="text-white/60">{card.currentFMV} U</span>
              </div>
            )}
            {card.holdDays > 0 && (
              <div className="flex justify-between">
                <span className="text-white/30">持有周期</span>
                <span className="text-white/60">{card.holdDays} 天</span>
              </div>
            )}
          </div>
        </div>

        {/* Extra narrative */}
        {extraInfo && (
          <p className={`text-xs font-heading leading-relaxed ${colors.titleColor} opacity-80 mb-3`}>
            {extraInfo}
          </p>
        )}

        {/* P&L row */}
        {card.profit !== 0 && (
          <div className="flex items-center justify-between border-t border-white/5 pt-3">
            <span className="text-white/25 text-xs font-heading uppercase tracking-wider">盈亏</span>
            <span
              className={`font-mono font-bold text-sm ${card.profit > 0 ? "text-emerald-400" : "text-red-400"}`}
            >
              {card.profit > 0 ? "+" : ""}{card.profit} U
              {card.profitMultiplier !== 1 && (
                <span className="text-xs ml-1.5 opacity-60">
                  {card.profitMultiplier.toFixed(2)}x
                </span>
              )}
            </span>
          </div>
        )}

        {/* TX link */}
        <a
          href={`https://bscscan.com/tx/${card.txHash}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-white/15 hover:text-white/40 text-xs font-mono mt-2.5 transition-colors"
        >
          <ExternalLink className="w-3 h-3" />
          {card.txHash.slice(0, 14)}...{card.txHash.slice(-6)}
        </a>
      </div>
    </motion.div>
  );
}

export default function Highlights({ godMoment, regretCard, worstCard, longestHeldCard }: HighlightsProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-lg bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center">
          <Trophy className="w-4 h-4 text-yellow-400" />
        </div>
        <div>
          <h3 className="text-white font-heading font-semibold">荣耀殿堂</h3>
          <p className="text-white/30 text-xs font-heading">你的链上传奇时刻</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <HighlightCard
          title="封神时刻"
          subtitle="赚得最多的一张卡"
          icon={Trophy}
          card={godMoment}
          colorScheme="gold"
          delay={0.1}
          extraInfo={
            godMoment
              ? `当前市值 ${godMoment.currentFMV} U，浮盈 ${godMoment.profit} U，涨幅 ${godMoment.profitMultiplier.toFixed(2)}x`
              : undefined
          }
        />

        <HighlightCard
          title="拍大腿警告"
          subtitle="卖出后继续上涨的遗憾"
          icon={AlertTriangle}
          card={regretCard}
          colorScheme="orange"
          delay={0.2}
          extraInfo={
            regretCard
              ? `卖出价 ${regretCard.sellPrice} U，随后涨至 ${regretCard.currentFMV} U，错失 ${regretCard.currentFMV - regretCard.sellPrice} U`
              : undefined
          }
        />

        <HighlightCard
          title="惨痛回忆"
          subtitle="亏损最大的一张卡"
          icon={Skull}
          card={worstCard}
          colorScheme="red"
          delay={0.3}
          extraInfo={
            worstCard
              ? `亏损 ${Math.abs(worstCard.profit)} U，回收率 ${(worstCard.sellPrice / worstCard.buyPrice * 100).toFixed(0)}%`
              : undefined
          }
        />

        <HighlightCard
          title="深情守望"
          subtitle="持有周期最长的卡"
          icon={Heart}
          card={longestHeldCard}
          colorScheme="blue"
          delay={0.4}
          extraInfo={
            longestHeldCard
              ? `已持有 ${longestHeldCard.holdDays} 天，当前估值 ${longestHeldCard.currentFMV} U`
              : undefined
          }
        />
      </div>
    </div>
  );
}
