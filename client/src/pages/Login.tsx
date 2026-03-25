/**
 * Login Page - Apple-inspired clean glass card
 * Minimal decoration, refined spacing, subtle hover states
 */
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import FoggyBg from "@/components/FoggyBg";
import Logo from "@/components/Logo";
import { motion } from "framer-motion";
import { useState } from "react";

export default function Login() {
  const { login } = useAuth();
  const [, setLocation] = useLocation();
  const [lang, setLang] = useState("EN");

  const handleLogin = () => {
    login();
    setLocation("/home");
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden">
      <FoggyBg />

      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.8, ease: [0.25, 0.46, 0.45, 0.94] }}
        className="relative z-10 w-full max-w-[400px] mx-6"
      >
        <div className="glass-card px-10 py-12 text-center">
          {/* Logo */}
          <div className="mb-12">
            <Logo size="lg" />
          </div>

          {/* Login buttons */}
          <div className="space-y-3.5">
            <button
              onClick={handleLogin}
              className="w-full flex items-center justify-center gap-3 py-3.5 px-6 rounded-2xl bg-white/[0.05] border border-white/[0.08] text-white/80 hover:bg-white/[0.08] hover:border-white/[0.14] hover:text-white transition-all duration-400 font-sans text-sm font-medium tracking-wide"
            >
              <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Continue with Google
            </button>

            <button
              onClick={handleLogin}
              className="w-full flex items-center justify-center gap-3 py-3.5 px-6 rounded-2xl bg-white/[0.05] border border-white/[0.08] text-white/80 hover:bg-white/[0.08] hover:border-white/[0.14] hover:text-white transition-all duration-400 font-sans text-sm font-medium tracking-wide"
            >
              <svg className="w-[18px] h-[18px]" fill="currentColor" viewBox="0 0 24 24">
                <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" />
              </svg>
              Email Login
            </button>

            <button
              onClick={handleLogin}
              className="w-full flex items-center justify-center gap-3 py-3.5 px-6 rounded-2xl bg-white/[0.05] border border-white/[0.08] text-white/80 hover:bg-white/[0.08] hover:border-white/[0.14] hover:text-white transition-all duration-400 font-sans text-sm font-medium tracking-wide"
            >
              <svg className="w-[18px] h-[18px]" fill="currentColor" viewBox="0 0 24 24">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
              Continue with X
            </button>
          </div>

          {/* Language selector */}
          <div className="flex items-center justify-center gap-1.5 mt-10">
            {["CN", "EN", "JP", "KR"].map((l) => (
              <button
                key={l}
                onClick={() => setLang(l)}
                className={`px-4 py-1.5 rounded-full text-xs font-sans font-medium tracking-wider transition-all duration-400 ${
                  lang === l
                    ? "bg-white text-gray-900"
                    : "text-white/30 hover:text-white/60 hover:bg-white/[0.04]"
                }`}
              >
                {l}
              </button>
            ))}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
