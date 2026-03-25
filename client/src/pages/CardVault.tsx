import AppNav from "@/components/AppNav";
import FoggyBg from "@/components/FoggyBg";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { Search, Filter, Grid3X3, List, Wallet } from "lucide-react";
import { toast } from "sonner";

export default function CardVault() {
  const { isLoggedIn } = useAuth();
  const [, setLocation] = useLocation();
  const [walletConnected, setWalletConnected] = useState(false);

  useEffect(() => {
    if (!isLoggedIn) setLocation("/login");
  }, [isLoggedIn, setLocation]);

  if (!isLoggedIn) return null;

  const handleConnectWallet = () => {
    // Mock wallet connection - will be replaced with real Privy integration
    setWalletConnected(true);
    toast.success("Wallet connected successfully!");
  };

  return (
    <div className="relative min-h-screen">
      <FoggyBg />
      <AppNav />

      <main className="relative z-10 pt-24 pb-16 px-4 max-w-[1200px] mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <h1 className="font-display text-3xl font-bold text-white mb-6">Card Vault</h1>

          {!walletConnected ? (
            /* Wallet not connected state */
            <div className="flex flex-col items-center justify-center min-h-[60vh]">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="glass-card p-12 text-center max-w-md w-full"
              >
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-white/10 flex items-center justify-center mx-auto mb-6">
                  <Wallet className="w-10 h-10 text-purple-400" />
                </div>
                <h2 className="font-heading text-xl font-semibold text-white mb-3">
                  Connect Your Wallet
                </h2>
                <p className="text-white/40 text-sm font-heading mb-8 leading-relaxed">
                  Connect your wallet to view and manage your card collection. Your on-chain cards will be automatically loaded.
                </p>
                <button
                  onClick={handleConnectWallet}
                  className="btn-purple-gradient text-sm px-8 py-3 w-full"
                >
                  Connect Wallet
                </button>
              </motion.div>
            </div>
          ) : (
            /* Wallet connected - show cards */
            <>
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
                  { label: "Total Cards", value: "0" },
                  { label: "Total Value", value: "$0" },
                  { label: "Rarest Card", value: "--" },
                  { label: "Collections", value: "0" },
                ].map((s) => (
                  <div key={s.label} className="glass-card p-4 text-center">
                    <p className="text-white/40 text-xs font-heading mb-1">{s.label}</p>
                    <p className="text-white font-heading font-semibold text-lg">{s.value}</p>
                  </div>
                ))}
              </div>

              {/* Empty state */}
              <div className="glass-card p-16 text-center">
                <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-4">
                  <Wallet className="w-8 h-8 text-white/30" />
                </div>
                <h3 className="text-white/60 font-heading text-lg mb-2">No Cards Found</h3>
                <p className="text-white/30 text-sm font-heading">
                  Your wallet is connected but no cards were found. Cards from Renaiss on-chain data will appear here.
                </p>
              </div>
            </>
          )}
        </motion.div>

        {/* Disclaimer */}
        <div className="text-center mt-8">
          <p className="text-white/20 text-xs font-heading leading-relaxed">
            Disclaimer: TCGPlay is a community entertainment free game. Card images sourced from Renaiss on-chain assets.
          </p>
        </div>
      </main>
    </div>
  );
}
