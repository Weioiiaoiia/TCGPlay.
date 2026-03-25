import AppNav from "@/components/AppNav";
import FoggyBg from "@/components/FoggyBg";
import { useAuth } from "@/contexts/AuthContext";
import { Link, useLocation } from "wouter";
import { motion } from "framer-motion";
import { useEffect } from "react";
import { Wallet, Box, Swords, Car, Disc3, BookOpen } from "lucide-react";

const features = [
  {
    title: "Card Vault",
    desc: "Securely store and manage your entire digital collection.",
    path: "/card-vault",
    icon: Wallet,
    gradient: "from-amber-500/20 to-orange-600/10",
    border: "border-amber-500/20",
    iconColor: "text-amber-400",
  },
  {
    title: "3D Mood Space",
    desc: "Design and customize your personal immersive space.",
    path: "/3d-space",
    icon: Box,
    gradient: "from-cyan-500/20 to-blue-600/10",
    border: "border-cyan-500/20",
    iconColor: "text-cyan-400",
  },
  {
    title: "TCG Card Battle",
    desc: "Challenge players in real-time strategy card games.",
    path: "/games",
    icon: Swords,
    gradient: "from-purple-500/20 to-pink-600/10",
    border: "border-purple-500/20",
    iconColor: "text-purple-400",
  },
  {
    title: "Card Race",
    desc: "Compete in high-speed card-based racing events.",
    path: "/games",
    icon: Car,
    gradient: "from-green-500/20 to-emerald-600/10",
    border: "border-green-500/20",
    iconColor: "text-green-400",
  },
  {
    title: "Gashapon Machine",
    desc: "Try your luck for rare cards and exclusive rewards.",
    path: "/games",
    icon: Disc3,
    gradient: "from-pink-500/20 to-rose-600/10",
    border: "border-pink-500/20",
    iconColor: "text-pink-400",
  },
  {
    title: "Card Album",
    desc: "Curate and showcase your card sets in a digital album.",
    path: "/album",
    icon: BookOpen,
    gradient: "from-indigo-500/20 to-violet-600/10",
    border: "border-indigo-500/20",
    iconColor: "text-indigo-400",
  },
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
      <FoggyBg />
      <AppNav />

      <main className="relative z-10 pt-24 pb-16 px-4 max-w-[1200px] mx-auto">
        {/* Welcome banner */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="glass-card p-8 mb-8 text-center overflow-hidden relative"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-purple-600/5 via-transparent to-pink-600/5" />
          {/* Holographic card icons */}
          <div className="flex justify-center gap-3 mb-5 relative z-10">
            <div className="w-16 h-22 rounded-lg bg-gradient-to-br from-purple-400/20 to-cyan-400/20 border border-white/10 transform -rotate-6 shadow-lg" />
            <div className="w-18 h-24 rounded-lg bg-gradient-to-br from-amber-400/20 to-pink-400/20 border border-white/10 shadow-lg z-10" />
            <div className="w-16 h-22 rounded-lg bg-gradient-to-br from-green-400/20 to-blue-400/20 border border-white/10 transform rotate-6 shadow-lg" />
          </div>
          <h1 className="font-display text-3xl md:text-4xl font-bold text-white relative z-10">
            Welcome back, {user?.name}
          </h1>
          <p className="text-white/40 font-mono text-sm mt-2 relative z-10">
            {user?.wallet}
          </p>
        </motion.div>

        {/* Feature grid - 3x2 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map((f, i) => {
            const Icon = f.icon;
            return (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.08 * i }}
              >
                <Link href={f.path} className="no-underline block">
                  <div className={`glass-card glass-card-hover p-5 h-full transition-all duration-300 border ${f.border} group relative overflow-hidden`}>
                    <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${f.gradient} opacity-50 group-hover:opacity-100 transition-opacity duration-300`} />
                    <div className="relative z-10 flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center flex-shrink-0 ${f.iconColor}`}>
                        <Icon className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="text-white font-heading font-semibold text-base mb-0.5">
                          {f.title}
                        </h3>
                        <p className="text-white/40 text-sm font-heading leading-snug">
                          {f.desc}
                        </p>
                      </div>
                    </div>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="text-center mt-12">
          <p className="text-white/20 text-xs font-heading">
            &copy; 2026 TCGPlay. All rights reserved.
          </p>
        </div>
      </main>
    </div>
  );
}
