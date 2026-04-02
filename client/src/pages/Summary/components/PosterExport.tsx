/**
 * PosterExport - Art poster generation and download
 * Generates a branded 3D-art style battle report poster
 * Pure text, no emoji
 */

import { useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Download, X, Share2 } from "lucide-react";
import type { SummaryData } from "../hooks/useSummaryData";

interface PosterExportProps {
  data: SummaryData;
}

function PosterCanvas({ data, canvasRef }: { data: SummaryData; canvasRef: React.RefObject<HTMLCanvasElement | null> }) {
  const isProfit = data.netWorth >= 0;

  return (
    <canvas
      ref={canvasRef}
      width={800}
      height={1000}
      className="hidden"
    />
  );
}

function PosterPreview({ data }: { data: SummaryData }) {
  const isProfit = data.netWorth >= 0;
  const netWorthColor = isProfit ? "#34d399" : "#f87171";
  const rankColor = data.luckBadgeColor;

  return (
    <div
      className="relative w-full overflow-hidden rounded-2xl"
      style={{
        background: "linear-gradient(135deg, #08070f 0%, #0d0b1a 40%, #0a0818 100%)",
        border: "1px solid rgba(255,255,255,0.06)",
        aspectRatio: "4/5",
        boxShadow: "0 0 80px rgba(139, 92, 246, 0.12)",
      }}
    >
      {/* Background grid */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)
          `,
          backgroundSize: "40px 40px",
        }}
      />

      {/* Top ambient glow */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-1/3 opacity-20"
        style={{
          background: `radial-gradient(ellipse, ${rankColor} 0%, transparent 70%)`,
          filter: "blur(60px)",
        }}
      />

      {/* Bottom ambient */}
      <div
        className="absolute bottom-0 right-0 w-1/2 h-1/3 opacity-10"
        style={{
          background: `radial-gradient(ellipse, ${netWorthColor} 0%, transparent 70%)`,
          filter: "blur(80px)",
        }}
      />

      <div className="relative z-10 p-8 h-full flex flex-col">
        {/* Brand header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <p className="font-display text-xs tracking-[0.3em] text-white/30 uppercase">
              Renaiss · TCGPlay
            </p>
            <p className="font-display text-lg font-bold text-white mt-0.5">
              链上战报
            </p>
          </div>
          <div
            className="px-3 py-1.5 rounded-full text-xs font-heading font-semibold"
            style={{
              background: `${rankColor}15`,
              border: `1px solid ${rankColor}30`,
              color: rankColor,
            }}
          >
            {data.luckRank}
          </div>
        </div>

        {/* Address */}
        <p className="text-white/20 font-mono text-xs mb-6 tracking-wider">
          {data.walletAddress.slice(0, 6)}...{data.walletAddress.slice(-4)}
          &nbsp;&nbsp;·&nbsp;&nbsp;
          {data.firstTxDate?.toLocaleDateString("zh-CN")} — {data.lastTxDate?.toLocaleDateString("zh-CN")}
        </p>

        {/* Hero metric */}
        <div className="flex-1 flex flex-col justify-center">
          <p className="text-white/30 text-xs font-heading uppercase tracking-widest mb-2">
            综合净值
          </p>
          <div
            className="font-display text-6xl font-bold mb-1"
            style={{
              color: netWorthColor,
              textShadow: `0 0 40px ${netWorthColor}50`,
            }}
          >
            {isProfit ? "+" : ""}{data.netWorth.toFixed(1)} U
          </div>
          <div
            className="inline-flex items-center gap-2 mt-2"
          >
            <div
              className="px-3 py-1 rounded-full text-sm font-heading font-semibold"
              style={{
                background: `${netWorthColor}12`,
                border: `1px solid ${netWorthColor}25`,
                color: netWorthColor,
              }}
            >
              ROI {isProfit ? "+" : ""}{data.roi.toFixed(1)}%
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="h-px bg-white/5 my-6" />

        {/* Key metrics grid */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          {[
            { label: "总投入", value: `${data.totalInvested} U` },
            { label: "已回笼", value: `${data.totalRecovered} U` },
            { label: "持仓估值", value: `${data.currentInventoryValue} U` },
          ].map((item) => (
            <div key={item.label} className="text-center">
              <p className="text-white/70 font-mono text-sm font-semibold">{item.value}</p>
              <p className="text-white/25 text-xs font-heading mt-0.5">{item.label}</p>
            </div>
          ))}
        </div>

        {/* Luck index bar */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-white/30 text-xs font-heading uppercase tracking-wider">欧气指数</span>
            <span className="font-mono text-sm font-bold" style={{ color: rankColor }}>
              {data.luckIndex} / 100
            </span>
          </div>
          <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full"
              style={{
                width: `${data.luckIndex}%`,
                background: `linear-gradient(90deg, ${rankColor}60, ${rankColor})`,
                boxShadow: `0 0 8px ${rankColor}50`,
              }}
            />
          </div>
        </div>

        {/* God moment */}
        {data.godMoment && (
          <div
            className="rounded-xl p-4 mb-4"
            style={{
              background: "rgba(212, 168, 83, 0.05)",
              border: "1px solid rgba(212, 168, 83, 0.15)",
            }}
          >
            <p className="text-yellow-400/60 text-xs font-heading uppercase tracking-wider mb-1">
              封神时刻
            </p>
            <div className="flex items-center justify-between">
              <p className="text-white/70 text-sm font-heading">{data.godMoment.name}</p>
              <p className="text-yellow-400 font-mono text-sm font-bold">
                +{data.godMoment.profit} U &nbsp; {data.godMoment.profitMultiplier.toFixed(2)}x
              </p>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-white/5">
          <p className="text-white/15 text-xs font-mono">
            {new Date().toLocaleDateString("zh-CN")} · TCGPlay.xyz
          </p>
          <p className="text-white/15 text-xs font-heading">
            {data.totalMintCount} 次抽卡 · {data.currentNFTCount} 张持仓
          </p>
        </div>
      </div>
    </div>
  );
}

export default function PosterExport({ data }: PosterExportProps) {
  const [showPreview, setShowPreview] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const { default: html2canvas } = await import("html2canvas");
      const element = document.getElementById("poster-preview-inner");
      if (!element) return;

      const canvas = await html2canvas(element, {
        backgroundColor: "#08070f",
        scale: 2,
        useCORS: true,
        logging: false,
      });

      const link = document.createElement("a");
      link.download = `renaiss-battle-report-${data.walletAddress.slice(0, 8)}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    } catch (err) {
      console.error("Export failed:", err);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <>
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => setShowPreview(true)}
        className="w-full flex items-center justify-center gap-2.5 py-3.5 rounded-xl font-heading font-semibold text-sm transition-all"
        style={{
          background: "linear-gradient(135deg, rgba(139, 92, 246, 0.15) 0%, rgba(168, 85, 247, 0.15) 100%)",
          border: "1px solid rgba(139, 92, 246, 0.3)",
          color: "#a78bfa",
          boxShadow: "0 0 20px rgba(139, 92, 246, 0.1)",
        }}
      >
        <Share2 className="w-4 h-4" />
        导出战报海报
      </motion.button>

      <AnimatePresence>
        {showPreview && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: "rgba(0, 0, 0, 0.85)", backdropFilter: "blur(12px)" }}
            onClick={() => setShowPreview(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              transition={{ type: "spring", damping: 25 }}
              className="relative w-full max-w-sm"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close button */}
              <button
                onClick={() => setShowPreview(false)}
                className="absolute -top-3 -right-3 z-10 w-8 h-8 rounded-full bg-white/10 border border-white/10 flex items-center justify-center hover:bg-white/15 transition-colors"
              >
                <X className="w-4 h-4 text-white/60" />
              </button>

              {/* Poster preview */}
              <div id="poster-preview-inner">
                <PosterPreview data={data} />
              </div>

              {/* Download button */}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleDownload}
                disabled={downloading}
                className="mt-4 w-full flex items-center justify-center gap-2 py-3 rounded-xl font-heading font-semibold text-sm text-white transition-all disabled:opacity-50"
                style={{
                  background: "linear-gradient(135deg, #7c3aed 0%, #9333ea 100%)",
                  boxShadow: "0 4px 20px rgba(124, 58, 237, 0.35)",
                }}
              >
                <Download className="w-4 h-4" />
                {downloading ? "生成中..." : "下载海报"}
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
