/**
 * MachineBreakdown - Machine tier statistics with expandable tx details
 * Shows each gacha machine tier with pull counts, spending, and recovery
 */

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ExternalLink, Layers } from "lucide-react";
import type { MachineStats } from "../hooks/useSummaryData";

interface MachineBreakdownProps {
  machineStats: MachineStats[];
  totalInvested: number;
}

function MachineRow({ machine, totalInvested, index }: { machine: MachineStats; totalInvested: number; index: number }) {
  const [expanded, setExpanded] = useState(false);
  const percentage = totalInvested > 0 ? (machine.totalSpent / totalInvested) * 100 : 0;
  const roi = machine.totalSpent > 0 ? ((machine.recovered - machine.totalSpent) / machine.totalSpent) * 100 : 0;
  const isProfit = machine.recovered >= machine.totalSpent;

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      className="glass-card overflow-hidden"
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-4 md:p-5 text-left hover:bg-white/[0.02] transition-colors"
      >
        <div className="flex items-center gap-4">
          {/* Color indicator */}
          <div
            className="w-3 h-10 rounded-full flex-shrink-0"
            style={{ background: machine.color, boxShadow: `0 0 12px ${machine.color}60` }}
          />

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-white font-heading font-semibold text-sm md:text-base">
                  {machine.label}
                </span>
                <span
                  className="px-2 py-0.5 rounded-full text-xs font-mono font-bold"
                  style={{
                    background: `${machine.color}20`,
                    color: machine.color,
                    border: `1px solid ${machine.color}40`,
                  }}
                >
                  ×{machine.count}
                </span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <span className="text-white/50 font-mono">{machine.totalSpent}U 投入</span>
                <span
                  className={`font-mono font-semibold ${isProfit ? "text-emerald-400" : "text-red-400"}`}
                >
                  {isProfit ? "+" : ""}{roi.toFixed(0)}%
                </span>
                <ChevronDown
                  className={`w-4 h-4 text-white/30 transition-transform ${expanded ? "rotate-180" : ""}`}
                />
              </div>
            </div>

            {/* Progress bar */}
            <div className="relative h-1.5 bg-white/5 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${percentage}%` }}
                transition={{ duration: 1, delay: index * 0.1 + 0.3, ease: "easeOut" }}
                className="absolute inset-y-0 left-0 rounded-full"
                style={{
                  background: `linear-gradient(90deg, ${machine.color}80, ${machine.color})`,
                  boxShadow: `0 0 8px ${machine.color}60`,
                }}
              />
            </div>

            <div className="flex justify-between mt-1.5 text-xs text-white/30 font-mono">
              <span>回笼: {machine.recovered}U</span>
              <span>{percentage.toFixed(0)}% 占比</span>
            </div>
          </div>
        </div>
      </button>

      {/* Expandable TX list */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-4 border-t border-white/5">
              <p className="text-white/30 text-xs font-heading uppercase tracking-wider mt-3 mb-2">
                链上交易记录
              </p>
              <div className="space-y-2">
                {machine.txHashes.map((hash, i) => (
                  <motion.div
                    key={hash}
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="flex items-center justify-between p-2.5 rounded-lg bg-white/[0.02] border border-white/5"
                  >
                    <span className="text-white/40 font-mono text-xs">
                      #{i + 1} · {hash.slice(0, 18)}...{hash.slice(-6)}
                    </span>
                    <a
                      href={`https://bscscan.com/tx/${hash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-purple-400 hover:text-purple-300 text-xs font-heading transition-colors"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <ExternalLink className="w-3 h-3" />
                      BSCScan
                    </a>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function MachineBreakdown({ machineStats, totalInvested }: MachineBreakdownProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
          <Layers className="w-4 h-4 text-purple-400" />
        </div>
        <div>
          <h3 className="text-white font-heading font-semibold">卡机分布 Breakdown</h3>
          <p className="text-white/30 text-xs font-heading">点击展开查看链上流水</p>
        </div>
      </div>

      <div className="space-y-3">
        {machineStats.map((machine, i) => (
          <MachineRow key={machine.tier} machine={machine} totalInvested={totalInvested} index={i} />
        ))}
      </div>
    </div>
  );
}
