import AppNav from "@/components/AppNav";
import FoggyBg from "@/components/FoggyBg";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { TrendingUp, TrendingDown, Heart, AlertTriangle } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";
import { useT } from "@/i18n";

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

export default function Summary() {
  const { isLoggedIn } = useAuth();
  const [, setLocation] = useLocation();
  const [activePeriod, setActivePeriod] = useState("1year");
  const t = useT();

  const periods = [
    { key: "30days", label: t("summary.30days") },
    { key: "1year", label: t("summary.1year") },
    { key: "allTime", label: t("summary.allTime") },
  ];

  const summaryCards = [
    {
      title: t("summary.bestPurchase"),
      icon: TrendingUp,
      iconColor: "text-green-400",
      content: (
        <div>
          <p className="text-green-400 font-heading font-semibold text-lg">{t("summary.value")}</p>
          <p className="text-white/60 text-sm font-heading mt-1">{t("summary.bought", { amount: "20" })}</p>
          <p className="text-white/60 text-sm font-heading">{t("summary.now", { amount: "110" })}</p>
        </div>
      ),
    },
    {
      title: t("summary.biggestLoss"),
      icon: TrendingDown,
      iconColor: "text-red-400",
      content: (
        <div>
          <p className="text-red-400 font-heading font-semibold text-lg">{t("summary.lost", { amount: "35" })}</p>
          <p className="text-white/60 text-sm font-heading mt-1">{t("summary.bought", { amount: "80" })}</p>
          <p className="text-white/60 text-sm font-heading">{t("summary.now", { amount: "45" })}</p>
        </div>
      ),
    },
    {
      title: t("summary.longestHeld"),
      icon: Heart,
      iconColor: "text-pink-400",
      content: (
        <div>
          <p className="text-white font-heading font-semibold text-lg">{t("summary.days", { count: "847" })}</p>
          <p className="text-white/60 text-sm font-heading mt-1">{t("summary.since")}</p>
          <p className="text-white/60 text-sm font-heading">{t("summary.cardValue", { amount: "120" })}</p>
        </div>
      ),
    },
    {
      title: t("summary.soldTooEarly"),
      icon: AlertTriangle,
      iconColor: "text-yellow-400",
      content: (
        <div>
          <p className="text-yellow-400 font-heading font-semibold text-sm">{t("summary.missedGain")}</p>
          <p className="text-white/60 text-sm font-heading mt-1">{t("summary.sold", { sold: "50", now: "150" })}</p>
          <p className="text-white/60 text-sm font-heading">{t("summary.difference", { amount: "100" })}</p>
        </div>
      ),
    },
  ];

  useEffect(() => {
    if (!isLoggedIn) setLocation("/login");
  }, [isLoggedIn, setLocation]);

  if (!isLoggedIn) return null;

  return (
    <div className="relative min-h-screen">
      <FoggyBg />
      <AppNav />

      <main className="relative z-10 pt-24 pb-16 px-4 max-w-[1200px] mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <div className="text-center mb-8">
            <h1 className="font-display text-4xl md:text-5xl font-bold text-white mb-4">
              {t("summary.title")}
            </h1>
            <div className="inline-flex items-center gap-2 p-1 rounded-full bg-white/5 border border-white/10">
              {periods.map((p) => (
                <button
                  key={p.key}
                  onClick={() => setActivePeriod(p.key)}
                  className={`px-5 py-2 rounded-full text-sm font-heading transition-all duration-300 ${
                    activePeriod === p.key
                      ? "bg-white/15 text-white border border-white/20"
                      : "text-white/50 hover:text-white/80"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

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
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 12 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 12 }} />
                <Tooltip
                  contentStyle={{
                    background: "rgba(20, 10, 40, 0.9)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: "12px",
                    color: "white",
                  }}
                />
                <Area type="monotone" dataKey="value" stroke="#a855f7" strokeWidth={2} fillOpacity={1} fill="url(#colorValue)" />
              </AreaChart>
            </ResponsiveContainer>
          </motion.div>

          <div className="text-center mt-6">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10">
              <span className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
              <span className="text-white/50 font-heading text-xs">{t("summary.featureComingSoon")}</span>
            </div>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
