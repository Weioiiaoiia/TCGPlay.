import AppNav from "@/components/AppNav";
import StarField from "@/components/StarField";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { useEffect } from "react";
import { Search, Filter, Grid3X3, List } from "lucide-react";

const DASHBOARD_BG = "https://d2xsxph8kpxj0f.cloudfront.net/310519663466251609/azZHMfkVbqxhqHw2ESyYVP/dashboard-bg-8ni7cofZ2v6EEBzuAsjAR3.webp";

// Mock card data
const mockCards = Array.from({ length: 12 }, (_, i) => ({
  id: i + 1,
  name: `Card #${i + 1}`,
  rarity: ["Common", "Rare", "Ultra Rare", "Secret Rare"][i % 4],
  value: `$${(Math.random() * 200 + 10).toFixed(0)}`,
  grade: "PSA 10",
}));

const rarityColors: Record<string, string> = {
  Common: "text-gray-400",
  Rare: "text-blue-400",
  "Ultra Rare": "text-purple-400",
  "Secret Rare": "text-yellow-400",
};

export default function CardVault() {
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
          <h1 className="font-display text-3xl font-bold text-white mb-6">Card Vault</h1>

          {/* Search and filters */}
          <div className="glass-card p-4 mb-6 flex flex-col md:flex-row items-center gap-4">
            <div className="flex-1 flex items-center gap-2 bg-white/5 rounded-xl px-4 py-2.5 border border-white/10 w-full">
              <Search className="w-4 h-4 text-white/40" />
              <input
                type="text"
                placeholder="Search your cards..."
                className="bg-transparent text-white text-sm outline-none w-full placeholder:text-white/30 font-heading"
              />
            </div>
            <div className="flex items-center gap-2">
              <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white/70 hover:bg-white/10 transition-colors text-sm">
                <Filter className="w-4 h-4" />
                Filter
              </button>
              <button className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-white/70 hover:bg-white/10 transition-colors">
                <Grid3X3 className="w-4 h-4" />
              </button>
              <button className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-white/70 hover:bg-white/10 transition-colors">
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {[
              { label: "Total Cards", value: "128" },
              { label: "Total Value", value: "$4,520" },
              { label: "Rarest Card", value: "PSA 10" },
              { label: "Collections", value: "5" },
            ].map((s) => (
              <div key={s.label} className="glass-card p-4 text-center">
                <p className="text-white/50 text-xs font-heading mb-1">{s.label}</p>
                <p className="text-white font-heading font-semibold text-lg">{s.value}</p>
              </div>
            ))}
          </div>

          {/* Card grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {mockCards.map((card, i) => (
              <motion.div
                key={card.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: i * 0.05 }}
                className="glass-card glass-card-hover p-3 group cursor-pointer"
              >
                {/* Card placeholder */}
                <div className="aspect-[2.5/3.5] rounded-lg bg-gradient-to-br from-purple-900/40 to-indigo-900/40 border border-white/10 mb-3 flex items-center justify-center overflow-hidden group-hover:border-purple-500/30 transition-colors">
                  <div className="text-center">
                    <div className="w-12 h-16 mx-auto mb-2 rounded bg-gradient-to-br from-amber-400/30 to-orange-500/30 border border-amber-500/20" />
                    <span className="text-white/30 text-xs font-mono">{card.grade}</span>
                  </div>
                </div>
                <p className="text-white text-xs font-heading font-medium truncate">{card.name}</p>
                <div className="flex items-center justify-between mt-1">
                  <span className={`text-xs font-heading ${rarityColors[card.rarity]}`}>{card.rarity}</span>
                  <span className="text-white/60 text-xs font-mono">{card.value}</span>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </main>
    </div>
  );
}
