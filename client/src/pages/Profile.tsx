import AppNav from "@/components/AppNav";
import FoggyBg from "@/components/FoggyBg";
import { useAuth } from "@/contexts/AuthContext";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { useEffect } from "react";
import { Plus, User, Mail, Chrome, Twitter } from "lucide-react";
import { toast } from "sonner";
import { useLanguage, type Language } from "@/i18n";

/** Small badge showing the login method */
function LoginMethodBadge({ method }: { method: string }) {
  const iconClass = "w-3.5 h-3.5";
  let icon = <Mail className={iconClass} />;
  let label = "Email";
  let color = "from-blue-500 to-cyan-500";

  if (method === "google") {
    icon = <Chrome className={iconClass} />;
    label = "Google";
    color = "from-red-500 to-yellow-500";
  } else if (method === "twitter") {
    icon = <Twitter className={iconClass} />;
    label = "Twitter / X";
    color = "from-sky-400 to-blue-500";
  }

  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-heading font-medium text-white bg-gradient-to-r ${color}`}>
      {icon}
      {label}
    </span>
  );
}

export default function Profile() {
  const { isLoggedIn, user } = useAuth();
  const { profile, updateProfile } = useUserProfile();
  const [, setLocation] = useLocation();
  const { language, setLanguage, t } = useLanguage();

  useEffect(() => {
    if (!isLoggedIn) setLocation("/login");
  }, [isLoggedIn, setLocation]);

  if (!isLoggedIn || !user) return null;

  const handleSave = () => {
    // Profile is already auto-saved via updateProfile, but we trigger a toast
    toast.success(t("profile.saved"));
  };

  return (
    <div className="relative min-h-screen">
      <FoggyBg />
      <AppNav />

      <main className="relative z-10 pt-24 pb-16 px-4 max-w-[900px] mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <h1 className="font-display text-3xl font-bold text-white mb-8">{t("profile.title")}</h1>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Avatar section */}
            <div className="glass-card p-8 text-center">
              <h2 className="text-white font-heading font-semibold text-lg mb-6 text-left">{t("profile.avatar")}</h2>
              <div className="relative w-40 h-40 mx-auto mb-4">
                <div className="absolute inset-0 rounded-full bg-gradient-to-br from-purple-500 via-pink-500 to-purple-500 p-[3px] animate-spin" style={{ animationDuration: "8s" }}>
                  <div className="w-full h-full rounded-full bg-[#0d0b1a]" />
                </div>
                <div className="absolute inset-2 rounded-full bg-gradient-to-br from-purple-900/50 to-indigo-900/50 flex items-center justify-center border border-white/10 overflow-hidden">
                  {user.avatar ? (
                    <img src={user.avatar} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-16 h-16 text-white/30" />
                  )}
                </div>
                <button className="absolute bottom-2 right-2 w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-lg hover:scale-110 transition-transform">
                  <Plus className="w-4 h-4 text-white" />
                </button>
              </div>
              <p className="text-white/40 text-sm font-heading">{t("profile.uploadPhoto")}</p>

              {/* Login method badge */}
              <div className="mt-6">
                <LoginMethodBadge method={user.loginMethod} />
              </div>
            </div>

            {/* Profile details */}
            <div className="glass-card p-8">
              <h2 className="text-white font-heading font-semibold text-lg mb-6">{t("profile.profileDetails")}</h2>

              {/* Display Name */}
              <div className="mb-5">
                <label className="text-white/70 text-sm font-heading block mb-2">{t("profile.displayName")}</label>
                <input
                  type="text"
                  placeholder={t("profile.displayNamePlaceholder")}
                  value={profile.displayName || user.name}
                  onChange={(e) => updateProfile({ displayName: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none placeholder:text-white/30 font-heading focus:border-purple-500/40 transition-colors"
                />
              </div>

              {/* Account / Identifier */}
              <div className="mb-5">
                <label className="text-white/70 text-sm font-heading block mb-2">{t("profile.account")}</label>
                <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-4 py-3">
                  <span className="w-2.5 h-2.5 rounded-full bg-green-400" />
                  <span className="text-white/80 text-sm font-mono truncate">{user.identifier}</span>
                </div>
              </div>

              {/* Wallet (if available) */}
              {user.wallet && (
                <div className="mb-5">
                  <label className="text-white/70 text-sm font-heading block mb-2">{t("profile.walletStatus")}</label>
                  <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-4 py-3">
                    <span className="w-2.5 h-2.5 rounded-full bg-green-400" />
                    <span className="text-white/80 text-sm font-mono truncate">{user.wallet}</span>
                  </div>
                </div>
              )}

              {/* Language */}
              <div className="mb-6">
                <label className="text-white/70 text-sm font-heading block mb-2">{t("profile.language")}</label>
                <div className="flex items-center gap-2">
                  {(["CN", "EN", "JP", "KR"] as Language[]).map((l) => (
                    <button
                      key={l}
                      onClick={() => setLanguage(l)}
                      className={`px-5 py-2 rounded-full text-sm font-heading transition-all duration-300 ${
                        language === l
                          ? "bg-white/15 text-white border border-white/20"
                          : "text-white/40 bg-white/5 border border-white/10 hover:text-white/70"
                      }`}
                    >
                      {l}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={handleSave}
                className="w-full py-3 rounded-xl font-heading font-semibold text-white text-sm transition-all duration-300"
                style={{ background: "linear-gradient(135deg, #a855f7 0%, #ec4899 100%)" }}
              >
                {t("profile.saveChanges")}
              </button>
            </div>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
