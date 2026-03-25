import AppNav from "@/components/AppNav";
import StarField from "@/components/StarField";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { TrendingUp, TrendingDown, Heart, AlertTriangle } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";

const DASHBOARD_BG = "https://d2xsxph8kpxj0f.cloudfront.net/310519663466251609/azZHMfkVbqxhqHw2ESyYVP/dashboard-bg-8ni7cofZ2v6EEBzuAsjAR3.webp";

// Mock chart data
const chartData = [
  { month: "Jan", value: 200 },
  { month: "Feb", value: 280 },
  { month: "Mar", value: 350 },
  { month: "Apr", value: 320 },
  { month: "May", value: 480 },
  { month: "Jun", value: 520 },
  { month: "Jul", value: 580 },
  { month: "Aug", value: 650 },
  { month: "Sep", value: 720 },
  { month: "Oct", value: 850 },
  { month: "Nov", value: 980 },
  { month: "Dec", value: 1100 },
];

const periods = ["30 Days", "1 Year", "All Time"];

const summaryCards = [
  {
    title: "Best Purchase",
    icon: TrendingUp,
    iconColor: "text-green-400",
    content: (
      <div>
        <p className="text-green-400 font-heading font-semibold text-lg">+450% Value</p>
        <p className="text-white/60 text-sm font-heading mt-1">Bought: $20</p>
        <p className="text-white/60 text-sm font-heading">Now: $110</p>
      </div>
    ),
  },
  {
    title: "Biggest Loss",
    icon: TrendingDown,
    iconColor: "text-red-400",
    content: (
      <div>
        <p className="text-red-400 font-heading font-semibold text-lg">Lost: $35</p>
        <p className="text-white/60 text-sm font-heading mt-1">Bought: $80</p>
        <p className="text-white/60 text-sm font-heading">Now: $45</p>
      </div>
    ),
  },
  {
    title: "Longest Held",
    icon: Heart,
    iconColor: "text-pink-400",
    content: (
      <div>
        <p className="text-white font-heading font-semibold text-lg">847 days</p>
        <p className="text-white/60 text-sm font-heading mt-1">Since May 2023</p>
        <p className="text-white/60 text-sm font-heading">Value: $120</p>
      </div>
    ),
  },
  {
    title: "Sold Too Early",
    icon: AlertTriangle,
    iconColor: "text-yellow-400",
    content: (
      <div>
        <p className="text-yellow-400 font-heading font-semibold text-sm">Oops! Missed +200%</p>
        <p className="text-white/60 text-sm font-heading mt-1">Sold: $50 &nbsp; Now: $150</p>
        <p className="text-white/60 text-sm font-heading">Difference: $100</p>
      </div>
    ),
  },
];

export default function Summary() {
  const { isLoggedIn } = useAuth();
  const [, setLocation] = useLocation();
  const [activePeriod, setActivePeriod] = useState("1 Year");

  useEffect(() => {
    if (!isLoggedIn) setLocation("/login");
  }, [isLoggedIn, setLocation]);

  if (!isLoggedIn) return null;

  return (
    <div className="relative min-h-screen">
      <div className="fixed inset-0 bg-cover bg-center bg-no-repeat" style={{ backgroundImage: `url(${DASHBOARD_BG})` }} />
      <div className="fixed inset-0 bg-black/50" />
      <StarField />
      <AppNav />

      <main className="relative z-10 pt-24 pb-16 px-4 max-w-[1300px] mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          {/* Title */}
          <div className="text-center mb-8">
            <h1 className="font-display text-4xl md:text-5xl font-bold text-white mb-4">
              My Card Journey 2025
            </h1>
            {/* Period selector */}
            <div className="inline-flex items-center gap-2 p-1 rounded-full bg-white/5 border border-white/10">
              {periods.map((p) => (
                <button
                  key={p}
                  onClick={() => setActivePeriod(p)}
                  className={`px-5 py-2 rounded-full text-sm font-heading transition-all duration-300 ${
                    activePeriod === p
                      ? "bg-white/15 text-white border border-white/20"
                      : "text-white/50 hover:text-white/80"
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* Summary cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {summaryCards.map((card, i) => (
              <motion.div
                key={card.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: i * 0.1 }}
                className="glass-card p-5"
              >
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-white/80 font-heading font-medium text-sm">{card.title}</h3>
                  <card.icon className={`w-5 h-5 ${card.iconColor}`} />
                </div>
                {card.content}
              </motion.div>
            ))}
          </div>

          {/* Chart */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="glass-card p-6"
          >
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#a855f7" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#a855f7" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="month"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 12, fontFamily: "Inter" }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 12, fontFamily: "Inter" }}
                />
                <Tooltip
                  contentStyle={{
                    background: "rgba(20, 10, 40, 0.9)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: "12px",
                    color: "white",
                    fontFamily: "Inter",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="#a855f7"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorValue)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </motion.div>

          {/* Coming soon note */}
          <div className="text-center mt-6">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10">
              <span className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
              <span className="text-white/50 font-heading text-xs">Full summary features coming soon</span>
            </div>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
