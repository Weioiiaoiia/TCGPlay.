/**
 * AssetChart - Asset distribution and net worth timeline visualization
 * Uses Recharts with project-native styling
 * Pure text, no emoji
 */

import { motion } from "framer-motion";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { BarChart3 } from "lucide-react";
import type { SummaryData } from "../hooks/useSummaryData";

interface AssetChartProps {
  data: SummaryData;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass-card px-3 py-2 border border-white/10 text-xs font-mono">
      <p className="text-white/50 mb-1">{label}</p>
      {payload.map((entry) => (
        <p key={entry.name} style={{ color: entry.color }}>
          {entry.name}: {entry.value > 0 ? "+" : ""}{entry.value.toFixed(1)} U
        </p>
      ))}
    </div>
  );
}

export default function AssetChart({ data }: AssetChartProps) {
  // Pie chart data for machine distribution
  const pieData = data.machineStats.map((m) => ({
    name: m.label,
    value: m.totalSpent,
    color: m.color,
  }));

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
          <BarChart3 className="w-4 h-4 text-blue-400" />
        </div>
        <div>
          <h3 className="text-white font-heading font-semibold">资产分布</h3>
          <p className="text-white/30 text-xs font-heading">资金在各卡机档位的分布比例</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Net Worth Timeline */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="glass-card p-5"
        >
          <p className="text-white/40 text-xs font-heading uppercase tracking-wider mb-4">
            净值走势
          </p>
          <ResponsiveContainer width="100%" height={160}>
            <AreaChart data={data.timelineData} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
              <defs>
                <linearGradient id="netWorthGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="date"
                tick={{ fill: "rgba(255,255,255,0.25)", fontSize: 10, fontFamily: "DM Sans" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: "rgba(255,255,255,0.25)", fontSize: 10, fontFamily: "Space Mono" }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="netWorth"
                name="净值"
                stroke="#8b5cf6"
                strokeWidth={2}
                fill="url(#netWorthGrad)"
                dot={{ fill: "#8b5cf6", r: 3, strokeWidth: 0 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Machine Distribution Pie */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="glass-card p-5"
        >
          <p className="text-white/40 text-xs font-heading uppercase tracking-wider mb-4">
            卡机投入占比
          </p>
          <div className="flex items-center gap-4">
            <ResponsiveContainer width={140} height={140}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={38}
                  outerRadius={62}
                  paddingAngle={3}
                  dataKey="value"
                  strokeWidth={0}
                >
                  {pieData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.color}
                      opacity={0.85}
                    />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>

            {/* Legend */}
            <div className="flex-1 space-y-2">
              {pieData.map((entry) => {
                const pct = data.totalInvested > 0
                  ? ((entry.value / data.totalInvested) * 100).toFixed(0)
                  : "0";
                return (
                  <div key={entry.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ background: entry.color }}
                      />
                      <span className="text-white/50 text-xs font-heading">{entry.name}</span>
                    </div>
                    <span className="text-white/70 text-xs font-mono">{pct}%</span>
                  </div>
                );
              })}
            </div>
          </div>
        </motion.div>
      </div>

      {/* Monthly breakdown table */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
        className="glass-card p-5"
      >
        <p className="text-white/40 text-xs font-heading uppercase tracking-wider mb-4">
          月度数据对比
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-xs font-mono">
            <thead>
              <tr className="border-b border-white/5">
                <th className="text-left text-white/25 font-heading pb-2 pr-4">月份</th>
                <th className="text-right text-white/25 font-heading pb-2 px-3">投入 U</th>
                <th className="text-right text-white/25 font-heading pb-2 px-3">回笼 U</th>
                <th className="text-right text-white/25 font-heading pb-2 px-3">抽次</th>
                <th className="text-right text-white/25 font-heading pb-2 pl-3">净变化</th>
              </tr>
            </thead>
            <tbody>
              {data.monthlyStats.map((row, i) => (
                <motion.tr
                  key={row.month}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.35 + i * 0.06 }}
                  className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors"
                >
                  <td className="text-white/60 py-2.5 pr-4 font-heading">{row.month}</td>
                  <td className="text-white/50 py-2.5 px-3 text-right">{row.invested}</td>
                  <td className="text-white/50 py-2.5 px-3 text-right">{row.recovered}</td>
                  <td className="text-white/50 py-2.5 px-3 text-right">{row.mintCount}</td>
                  <td
                    className={`py-2.5 pl-3 text-right font-semibold ${
                      row.netChange >= 0 ? "text-emerald-400" : "text-red-400"
                    }`}
                  >
                    {row.netChange >= 0 ? "+" : ""}{row.netChange}
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  );
}
