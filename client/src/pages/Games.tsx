import AppNav from "@/components/AppNav";
import FoggyBg from "@/components/FoggyBg";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { useEffect } from "react";
import { Swords, Flag, CircleDot } from "lucide-react";
import { toast } from "sonner";
import { useT } from "@/i18n";

export default function Games() {
  const { isLoggedIn } = useAuth();
  const [, setLocation] = useLocation();
  const t = useT();

  const games = [
    {
      title: t("games.cardBattle"),
      desc: t("games.cardBattleDesc"),
      icon: Swords,
      gradient: "from-purple-600/30 to-pink-600/30",
      border: "border-purple-500/30",
      iconColor: "text-purple-400",
      action: () => setLocation("/card-battle"),
      status: "live" as const,
    },
    {
      title: t("games.cardRace"),
      desc: t("games.cardRaceDesc"),
      icon: Flag,
      gradient: "from-green-600/30 to-emerald-600/30",
      border: "border-green-500/30",
      iconColor: "text-green-400",
      action: () => setLocation("/card-race"),
      status: "live" as const,
    },
    {
      title: t("games.gashapon"),
      desc: t("games.gashaponDesc"),
      icon: CircleDot,
      gradient: "from-pink-600/30 to-rose-600/30",
      border: "border-pink-500/30",
      iconColor: "text-pink-400",
      action: () => toast.info(t("games.comingSoonToast")),
      status: "coming-soon" as const,
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
          <h1 className="font-display text-3xl font-bold text-white mb-2">{t("games.title")}</h1>
          <p className="text-white/50 font-heading mb-8">{t("games.subtitle")}</p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {games.map((game, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: i * 0.15 }}
              >
                <button
                  onClick={game.action}
                  className="w-full text-left"
                >
                  <div className={`glass-card glass-card-hover p-8 h-full border ${game.border} group relative overflow-hidden`}>
                    <div className={`absolute inset-0 bg-gradient-to-br ${game.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
                    <div className="relative z-10">
                      <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                        <game.icon className={`w-8 h-8 ${game.iconColor}`} />
                      </div>
                      <h3 className="text-white font-heading font-semibold text-xl mb-3">{game.title}</h3>
                      <p className="text-white/50 text-sm font-heading leading-relaxed mb-6">{game.desc}</p>
                      {game.status === "live" ? (
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-500/10 border border-green-500/30">
                          <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                          <span className="text-green-400 font-heading text-xs font-semibold">Play Now</span>
                        </div>
                      ) : (
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10">
                          <span className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
                          <span className="text-white/60 font-heading text-xs">{t("games.comingSoon")}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </button>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </main>
    </div>
  );
}
