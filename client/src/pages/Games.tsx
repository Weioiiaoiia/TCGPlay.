import AppNav from "@/components/AppNav";
import StarField from "@/components/StarField";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { useEffect } from "react";
import { Swords, Flag, CircleDot } from "lucide-react";
import { toast } from "sonner";

const DASHBOARD_BG = "https://d2xsxph8kpxj0f.cloudfront.net/310519663466251609/azZHMfkVbqxhqHw2ESyYVP/dashboard-bg-8ni7cofZ2v6EEBzuAsjAR3.webp";

const games = [
  {
    title: "TCG Card Battle",
    desc: "Challenge players in real-time strategy card games. Build your deck, plan your strategy, and dominate the arena.",
    icon: Swords,
    gradient: "from-purple-600/30 to-pink-600/30",
    border: "border-purple-500/40",
    iconColor: "text-purple-400",
    status: "coming_soon",
  },
  {
    title: "TCG Card Race",
    desc: "Compete in high-speed card-based racing events. Use your cards wisely to boost speed and outrun opponents.",
    icon: Flag,
    gradient: "from-green-600/30 to-emerald-600/30",
    border: "border-green-500/40",
    iconColor: "text-green-400",
    status: "coming_soon",
  },
  {
    title: "Gashapon Machine",
    desc: "Try your luck at the capsule machine! Collect rare cards and exclusive rewards with every pull.",
    icon: CircleDot,
    gradient: "from-pink-600/30 to-rose-600/30",
    border: "border-pink-500/40",
    iconColor: "text-pink-400",
    status: "coming_soon",
  },
];

export default function Games() {
  const { isLoggedIn } = useAuth();
  const [, setLocation] = useLocation();

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
          <h1 className="font-display text-3xl font-bold text-white mb-2">Games</h1>
          <p className="text-white/50 font-heading mb-8">Choose your game and start playing</p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {games.map((game, i) => (
              <motion.div
                key={game.title}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: i * 0.15 }}
              >
                <button
                  onClick={() => toast.info("Coming Soon! This game is under development.")}
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
                      <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10">
                        <span className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
                        <span className="text-white/60 font-heading text-xs">Coming Soon</span>
                      </div>
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
