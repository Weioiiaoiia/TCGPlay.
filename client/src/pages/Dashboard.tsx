import AppNav from "@/components/AppNav";
import StarField from "@/components/StarField";
import { useAuth } from "@/contexts/AuthContext";
import { Link, useLocation } from "wouter";
import { motion } from "framer-motion";
import { useEffect } from "react";

const DASHBOARD_BG = "https://d2xsxph8kpxj0f.cloudfront.net/310519663466251609/azZHMfkVbqxhqHw2ESyYVP/dashboard-bg-8ni7cofZ2v6EEBzuAsjAR3.webp";
const CARDS_IMG = "https://d2xsxph8kpxj0f.cloudfront.net/310519663466251609/azZHMfkVbqxhqHw2ESyYVP/cards-showcase-Pypqmwv24XP5dRC2rrmpdw.webp";
const ICONS_IMG = "https://d2xsxph8kpxj0f.cloudfront.net/310519663466251609/azZHMfkVbqxhqHw2ESyYVP/game-icons-bg-L3XvriupMAvceNHHmyKUoZ.webp";

const features = [
  { title: "Card Vault", desc: "Securely store and manage your entire digital collection.", path: "/card-vault", icon: "🗃️", gradient: "from-amber-500/20 to-orange-600/20", border: "border-amber-500/30" },
  { title: "3D Mood Space", desc: "Design and customize your personal immersive space.", path: "/3d-space", icon: "🧊", gradient: "from-cyan-500/20 to-blue-600/20", border: "border-cyan-500/30" },
  { title: "TCG Card Battle", desc: "Challenge players in real-time strategy card games.", path: "/games", icon: "⚔️", gradient: "from-purple-500/20 to-pink-600/20", border: "border-purple-500/30" },
  { title: "Card Race", desc: "Compete in high-speed card-based racing events.", path: "/games", icon: "🏁", gradient: "from-green-500/20 to-emerald-600/20", border: "border-green-500/30" },
  { title: "Gashapon Machine", desc: "Try your luck for rare cards and exclusive rewards.", path: "/games", icon: "🎰", gradient: "from-pink-500/20 to-rose-600/20", border: "border-pink-500/30" },
  { title: "Card Album", desc: "Curate and showcase your card sets in a digital album.", path: "/album", icon: "📖", gradient: "from-indigo-500/20 to-violet-600/20", border: "border-indigo-500/30" },
];

export default function Dashboard() {
  const { isLoggedIn, user } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoggedIn) setLocation("/login");
  }, [isLoggedIn, setLocation]);

  if (!isLoggedIn) return null;

  return (
    <div className="relative min-h-screen">
      <div
        className="fixed inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${DASHBOARD_BG})` }}
      />
      <div className="fixed inset-0 bg-black/40" />
      <StarField />
      <AppNav />

      <main className="relative z-10 pt-24 pb-16 px-4 max-w-[1300px] mx-auto">
        {/* Welcome banner */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="glass-card p-8 mb-8 text-center overflow-hidden relative"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-purple-600/10 via-transparent to-pink-600/10" />
          <img
            src={CARDS_IMG}
            alt="Cards"
            className="w-48 h-auto mx-auto mb-4 relative z-10 drop-shadow-lg"
          />
          <h1 className="font-display text-3xl md:text-4xl font-bold text-white relative z-10">
            Welcome back, {user?.name}
          </h1>
          <p className="text-white/50 font-mono text-sm mt-2 relative z-10">
            {user?.wallet}
          </p>
        </motion.div>

        {/* Feature grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 * i }}
            >
              <Link href={f.path} className="no-underline block">
                <div className={`glass-card glass-card-hover p-6 h-full transition-all duration-400 border ${f.border} group`}>
                  <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${f.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-400`} />
                  <div className="relative z-10 flex items-start gap-4">
                    <span className="text-3xl">{f.icon}</span>
                    <div>
                      <h3 className="text-white font-heading font-semibold text-lg mb-1">
                        {f.title}
                      </h3>
                      <p className="text-white/50 text-sm font-heading">
                        {f.desc}
                      </p>
                    </div>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>

        {/* Footer */}
        <div className="text-center mt-12">
          <p className="text-white/20 text-xs font-heading">
            &copy; 2025 TCGPlay. All rights reserved.
          </p>
        </div>
      </main>
    </div>
  );
}
