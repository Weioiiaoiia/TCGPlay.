import AppNav from "@/components/AppNav";
import FoggyBg from "@/components/FoggyBg";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { useEffect } from "react";
import { Image } from "lucide-react";
import { useT } from "@/i18n";

export default function Album() {
  const { isLoggedIn } = useAuth();
  const [, setLocation] = useLocation();
  const t = useT();

  useEffect(() => {
    if (!isLoggedIn) setLocation("/login");
  }, [isLoggedIn, setLocation]);

  if (!isLoggedIn) return null;

  return (
    <div className="relative min-h-screen">
      <FoggyBg />
      <AppNav />

      <main className="relative z-10 pt-24 pb-16 px-4 max-w-[1200px] mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex flex-col items-center justify-center min-h-[60vh]"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="glass-card p-12 md:p-16 text-center max-w-lg w-full"
          >
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-white/10 flex items-center justify-center mx-auto mb-6">
              <Image className="w-10 h-10 text-purple-400" />
            </div>

            <h1 className="font-display text-3xl md:text-4xl font-bold text-white mb-4">
              {t("album.title")}
            </h1>

            <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-yellow-500/10 border border-yellow-500/20 mb-6">
              <span className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
              <span className="text-yellow-400 font-heading text-sm font-semibold">Coming Soon</span>
            </div>

            <p className="text-white/40 text-sm font-heading leading-relaxed">
              {t("album.generationComingSoon")}
            </p>
          </motion.div>
        </motion.div>
      </main>
    </div>
  );
}
