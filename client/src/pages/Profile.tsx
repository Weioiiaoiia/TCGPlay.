import AppNav from "@/components/AppNav";
import StarField from "@/components/StarField";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { Plus, User } from "lucide-react";
import { toast } from "sonner";

const DASHBOARD_BG = "https://d2xsxph8kpxj0f.cloudfront.net/310519663466251609/azZHMfkVbqxhqHw2ESyYVP/dashboard-bg-8ni7cofZ2v6EEBzuAsjAR3.webp";

export default function Profile() {
  const { isLoggedIn, user } = useAuth();
  const [, setLocation] = useLocation();
  const [displayName, setDisplayName] = useState("");
  const [lang, setLang] = useState("EN");

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

      <main className="relative z-10 pt-24 pb-16 px-4 max-w-[900px] mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <h1 className="font-display text-3xl font-bold text-white mb-8">My Profile</h1>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Avatar section */}
            <div className="glass-card p-8 text-center">
              <h2 className="text-white font-heading font-semibold text-lg mb-6 text-left">Avatar</h2>
              <div className="relative w-40 h-40 mx-auto mb-4">
                {/* Glow ring */}
                <div className="absolute inset-0 rounded-full bg-gradient-to-br from-purple-500 via-pink-500 to-purple-500 p-[3px] animate-spin" style={{ animationDuration: "8s" }}>
                  <div className="w-full h-full rounded-full bg-[#1a1040]" />
                </div>
                {/* Avatar */}
                <div className="absolute inset-2 rounded-full bg-gradient-to-br from-purple-900/50 to-indigo-900/50 flex items-center justify-center border border-white/10">
                  <User className="w-16 h-16 text-white/30" />
                </div>
                {/* Upload button */}
                <button className="absolute bottom-2 right-2 w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-lg hover:scale-110 transition-transform">
                  <Plus className="w-4 h-4 text-white" />
                </button>
              </div>
              <p className="text-white/40 text-sm font-heading">Upload your photo</p>
            </div>

            {/* Profile details */}
            <div className="glass-card p-8">
              <h2 className="text-white font-heading font-semibold text-lg mb-6">Profile Details</h2>

              {/* Display Name */}
              <div className="mb-5">
                <label className="text-white/70 text-sm font-heading block mb-2">Display Name</label>
                <input
                  type="text"
                  placeholder="Enter your display name"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none placeholder:text-white/30 font-heading focus:border-purple-500/40 transition-colors"
                />
              </div>

              {/* Wallet Status */}
              <div className="mb-5">
                <label className="text-white/70 text-sm font-heading block mb-2">Wallet Status</label>
                <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-4 py-3">
                  <span className="w-2.5 h-2.5 rounded-full bg-green-400" />
                  <span className="text-white/80 text-sm font-mono">{user?.wallet || "0x...e4F9a8"}</span>
                </div>
              </div>

              {/* Language */}
              <div className="mb-6">
                <label className="text-white/70 text-sm font-heading block mb-2">Language</label>
                <div className="flex items-center gap-2">
                  {["CN", "EN", "JP", "KR"].map((l) => (
                    <button
                      key={l}
                      onClick={() => setLang(l)}
                      className={`px-5 py-2 rounded-full text-sm font-heading transition-all duration-300 ${
                        lang === l
                          ? "bg-white/15 text-white border border-white/20"
                          : "text-white/40 bg-white/5 border border-white/10 hover:text-white/70"
                      }`}
                    >
                      {l}
                    </button>
                  ))}
                </div>
              </div>

              {/* Save button */}
              <button
                onClick={() => toast.success("Profile saved!")}
                className="w-full py-3 rounded-xl font-heading font-semibold text-white text-sm transition-all duration-300"
                style={{ background: "linear-gradient(135deg, #a855f7 0%, #ec4899 100%)" }}
              >
                Save Changes
              </button>
            </div>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
