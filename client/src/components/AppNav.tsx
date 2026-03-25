import { Link, useLocation } from "wouter";
import { Globe, Bell, User } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import Logo from "@/components/Logo";
import { useLanguage, type Language } from "@/i18n";

export default function AppNav() {
  const [location] = useLocation();
  const { logout, user } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const [langOpen, setLangOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const navItems = [
    { label: t("nav.home"), path: "/home" },
    { label: t("nav.cardVault"), path: "/card-vault" },
    { label: t("nav.3dSpace"), path: "/3d-space" },
    { label: t("nav.games"), path: "/games" },
    { label: t("nav.album"), path: "/album" },
    { label: t("nav.summary"), path: "/summary" },
  ];

  const handleLogout = async () => {
    setProfileOpen(false);
    await logout();
    window.location.href = "/";
  };

  return (
    <nav className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-[95%] max-w-[1300px]">
      <div className="glass-nav flex items-center justify-between px-6 py-3">
        {/* Logo */}
        <Link href="/home" className="flex items-center gap-2 no-underline">
          <Logo size="sm" />
        </Link>

        {/* Nav Links */}
        <div className="hidden md:flex items-center gap-1">
          {navItems.map((item) => (
            <Link
              key={item.path}
              href={item.path}
              className={`px-4 py-2 text-sm font-heading font-medium rounded-full transition-all duration-300 no-underline ${
                location === item.path
                  ? "text-white bg-white/10"
                  : "text-white/70 hover:text-white hover:bg-white/5"
              }`}
            >
              {item.label}
              {location === item.path && (
                <span className="block h-0.5 mt-1 bg-gradient-to-r from-purple-400 to-purple-600 rounded-full" />
              )}
            </Link>
          ))}
        </div>

        {/* Right side */}
        <div className="flex items-center gap-3">
          {/* Language */}
          <div className="relative">
            <button
              onClick={() => { setLangOpen(!langOpen); setProfileOpen(false); }}
              className="flex items-center gap-1.5 text-white/70 hover:text-white transition-colors text-sm"
            >
              <Globe className="w-4 h-4" />
              <span className="font-heading">{language}</span>
            </button>
            {langOpen && (
              <div className="absolute top-full right-0 mt-2 glass-card p-2 min-w-[100px]">
                {(["CN", "EN", "JP", "KR"] as Language[]).map((l) => (
                  <button
                    key={l}
                    onClick={() => { setLanguage(l); setLangOpen(false); }}
                    className={`block w-full text-left px-3 py-1.5 rounded-lg text-sm transition-colors ${
                      language === l ? "text-white bg-white/10" : "text-white/60 hover:text-white hover:bg-white/5"
                    }`}
                  >
                    {l}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Notification */}
          <button className="text-white/70 hover:text-white transition-colors relative">
            <Bell className="w-5 h-5" />
            <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full" />
          </button>

          {/* Profile */}
          <div className="relative">
            <button
              onClick={() => { setProfileOpen(!profileOpen); setLangOpen(false); }}
              className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center border-2 border-white/20 hover:border-white/40 transition-colors overflow-hidden"
            >
              {user?.avatar ? (
                <img src={user.avatar} alt="" className="w-full h-full object-cover" />
              ) : (
                <User className="w-4 h-4 text-white" />
              )}
            </button>
            {profileOpen && (
              <div className="absolute top-full right-0 mt-2 glass-card p-2 min-w-[200px]">
                {/* User info */}
                {user && (
                  <div className="px-3 py-2 border-b border-white/10 mb-1">
                    <p className="text-white text-sm font-heading font-medium truncate">{user.name}</p>
                    <p className="text-white/40 text-xs font-heading truncate">{user.identifier}</p>
                  </div>
                )}
                <Link
                  href="/profile"
                  className="block px-3 py-2 rounded-lg text-sm text-white/80 hover:text-white hover:bg-white/5 transition-colors no-underline"
                  onClick={() => setProfileOpen(false)}
                >
                  {t("nav.myProfile")}
                </Link>
                <button
                  onClick={handleLogout}
                  className="block w-full text-left px-3 py-2 rounded-lg text-sm text-white/80 hover:text-white hover:bg-white/5 transition-colors"
                >
                  {t("nav.logout")}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
