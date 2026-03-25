import AppNav from "@/components/AppNav";
import StarField from "@/components/StarField";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { Plus, Check, Image } from "lucide-react";
import { toast } from "sonner";

const DASHBOARD_BG = "https://d2xsxph8kpxj0f.cloudfront.net/310519663466251609/azZHMfkVbqxhqHw2ESyYVP/dashboard-bg-8ni7cofZ2v6EEBzuAsjAR3.webp";

// Mock cards for album
const albumCards = Array.from({ length: 9 }, (_, i) => ({
  id: i + 1,
  selected: i < 5,
}));

export default function Album() {
  const { isLoggedIn } = useAuth();
  const [, setLocation] = useLocation();
  const [selectedCards, setSelectedCards] = useState<number[]>([1, 2, 3, 4, 5]);
  const [walletInput, setWalletInput] = useState("");

  useEffect(() => {
    if (!isLoggedIn) setLocation("/login");
  }, [isLoggedIn, setLocation]);

  if (!isLoggedIn) return null;

  const toggleCard = (id: number) => {
    setSelectedCards((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  };

  return (
    <div className="relative min-h-screen">
      <div className="fixed inset-0 bg-cover bg-center bg-no-repeat" style={{ backgroundImage: `url(${DASHBOARD_BG})` }} />
      <div className="fixed inset-0 bg-black/50" />
      <StarField />
      <AppNav />

      <main className="relative z-10 pt-24 pb-16 px-4 max-w-[1300px] mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <h1 className="font-display text-3xl font-bold text-white mb-6">Card Album</h1>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left: Card selector */}
            <div className="glass-card p-6">
              {/* Wallet input */}
              <div className="flex items-center gap-2 mb-6">
                <input
                  type="text"
                  placeholder="Enter friend wallet address"
                  value={walletInput}
                  onChange={(e) => setWalletInput(e.target.value)}
                  className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none placeholder:text-white/30 font-heading focus:border-purple-500/40 transition-colors"
                />
                <button className="p-3 rounded-xl bg-white/5 border border-white/10 text-white/70 hover:bg-white/10 transition-colors">
                  <Plus className="w-5 h-5" />
                </button>
              </div>

              {/* Card grid */}
              <div className="grid grid-cols-3 gap-3">
                {albumCards.map((card) => (
                  <button
                    key={card.id}
                    onClick={() => toggleCard(card.id)}
                    className={`relative aspect-[2.5/3.5] rounded-lg border transition-all duration-300 overflow-hidden ${
                      selectedCards.includes(card.id)
                        ? "border-purple-500/60 bg-purple-500/10"
                        : "border-white/10 bg-white/5 hover:border-white/20"
                    }`}
                  >
                    {/* Card placeholder */}
                    <div className="w-full h-full flex items-center justify-center">
                      <div className="w-10 h-14 rounded bg-gradient-to-br from-amber-400/20 to-orange-500/20 border border-amber-500/20" />
                    </div>
                    {/* Selection indicator */}
                    {selectedCards.includes(card.id) && (
                      <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-purple-500 flex items-center justify-center">
                        <Check className="w-3 h-3 text-white" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Right: Album preview */}
            <div className="flex flex-col gap-4">
              <div className="glass-card p-6 flex-1 flex items-center justify-center min-h-[400px]">
                <div className="relative w-full max-w-sm aspect-[4/3] rounded-2xl overflow-hidden"
                  style={{ background: "linear-gradient(135deg, #e8d5f5 0%, #f0c6d8 30%, #c8e6f5 60%, #d5e8f0 100%)" }}
                >
                  {/* Album preview with stacked cards */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    {selectedCards.length > 0 ? (
                      <div className="relative w-48 h-48">
                        {selectedCards.slice(0, 3).map((_, i) => (
                          <div
                            key={i}
                            className="absolute w-24 h-32 rounded-lg border-2 border-amber-400/60 bg-gradient-to-br from-amber-200/40 to-orange-300/40 shadow-lg"
                            style={{
                              left: `${30 + i * 20}%`,
                              top: `${20 + i * 5}%`,
                              transform: `rotate(${(i - 1) * 12}deg)`,
                              zIndex: i,
                            }}
                          >
                            <div className="w-full h-full flex items-center justify-center">
                              <Image className="w-6 h-6 text-amber-600/40" />
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-500 font-heading text-sm">Select cards to preview</p>
                    )}
                  </div>
                  {/* Decorative elements */}
                  <div className="absolute top-3 left-3 text-pink-400/40 text-lg">&#9825;</div>
                  <div className="absolute top-3 right-3 text-blue-400/40 text-lg">&#9733;</div>
                  <div className="absolute bottom-3 left-3 text-purple-400/40 text-lg">&#9733;</div>
                  <div className="absolute bottom-3 right-3 text-pink-400/40 text-lg">&#9825;</div>
                </div>
              </div>

              <button
                onClick={() => toast.info("Album generation coming soon!")}
                className="btn-purple-gradient text-center py-4 text-base"
              >
                Generate Album
              </button>
            </div>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
