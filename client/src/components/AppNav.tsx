import { Link, useLocation } from "wouter";
import { Globe, Bell, User } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import Logo from "@/components/Logo";

const navItems = [
  { label: "Home", path: "/home" },
  { label: "Card Vault", path: "/card-vault" },
  { label: "3D Space", path: "/3d-space" },
  { label: "Games", path: "/games" },
  { label: "Album", path: "/album" },
  { label: "Summary", path: "/summary" },
];

export default function AppNav() {
  const [location] = useLocation();
  const { logout } = useAuth();
  const [langOpen, setLangOpen] = useState(false);
  const [lang, setLang] = useState("EN");
  const [profileOpen, setProfileOpen] = useState(false);

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
              <span className="font-heading">{lang}</span>
            </button>
            {langOpen && (
              <div className="absolute top-full right-0 mt-2 glass-card p-2 min-w-[100px]">
                {["CN", "EN", "JP", "KR"].map((l) => (
                  <button
                    key={l}
                    onClick={() => { setLang(l); setLangOpen(false); }}
                    className={`block w-full text-left px-3 py-1.5 rounded-lg text-sm transition-colors ${
                      lang === l ? "text-white bg-white/10" : "text-white/60 hover:text-white hover:bg-white/5"
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
              className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center border-2 border-white/20 hover:border-white/40 transition-colors"
            >
              <User className="w-4 h-4 text-white" />
            </button>
            {profileOpen && (
              <div className="absolute top-full right-0 mt-2 glass-card p-2 min-w-[160px]">
                <Link
                  href="/profile"
                  className="block px-3 py-2 rounded-lg text-sm text-white/80 hover:text-white hover:bg-white/5 transition-colors no-underline"
                  onClick={() => setProfileOpen(false)}
                >
                  My Profile
                </Link>
                <button
                  onClick={() => { logout(); setProfileOpen(false); window.location.href = "/"; }}
                  className="block w-full text-left px-3 py-2 rounded-lg text-sm text-white/80 hover:text-white hover:bg-white/5 transition-colors"
                >
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
