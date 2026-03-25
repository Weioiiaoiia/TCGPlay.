/**
 * Landing Page - Apple-inspired minimal elegance
 * Large breathing space, refined typography hierarchy, subtle motion
 */
import { Link } from "wouter";
import FoggyBg from "@/components/FoggyBg";
import Logo from "@/components/Logo";
import { motion } from "framer-motion";
import { useLanguage, type Language } from "@/i18n";
import { Globe } from "lucide-react";
import { useState } from "react";

export default function Landing() {
  const { language, setLanguage, t } = useLanguage();
  const [langOpen, setLangOpen] = useState(false);

  return (
    <div className="relative min-h-screen overflow-hidden flex flex-col">
      <FoggyBg />

      {/* Minimal Nav */}
      <motion.nav
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.1 }}
        className="relative z-10 px-6 md:px-10 pt-6"
      >
        <div className="glass-nav px-8 py-3.5 max-w-[1200px] mx-auto flex items-center justify-between">
          <Logo size="sm" />
          {/* Language switcher */}
          <div className="relative">
            <button
              onClick={() => setLangOpen(!langOpen)}
              className="flex items-center gap-1.5 text-white/50 hover:text-white/80 transition-colors text-sm"
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
        </div>
      </motion.nav>

      {/* Hero - centered with generous whitespace */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center text-center px-6">
        <div className="max-w-3xl mx-auto -mt-12">
          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="font-display text-5xl md:text-7xl lg:text-8xl font-bold text-white mb-8 leading-[1.05] tracking-tight"
            style={{ textShadow: "0 2px 40px rgba(0,0,0,0.3)" }}
          >
            {t("landing.title1")}
            <br />
            {t("landing.title2")}
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="text-white/45 text-base md:text-lg max-w-md mx-auto mb-12 font-sans font-light leading-relaxed tracking-wide"
          >
            {t("landing.subtitle")}
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.9, ease: [0.25, 0.46, 0.45, 0.94] }}
          >
            <Link
              href="/login"
              className="btn-purple-gradient inline-block no-underline text-base px-12 py-4"
            >
              {t("landing.cta")}
            </Link>
          </motion.div>
        </div>
      </main>

      {/* Footer - minimal, refined */}
      <motion.footer
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1, delay: 1.2 }}
        className="relative z-10 pb-10 px-6"
      >
        <div className="max-w-3xl mx-auto space-y-6">
          {/* Source note */}
          <p className="text-center text-white/20 text-xs font-sans tracking-wider uppercase">
            {t("landing.sourceNote")}
          </p>

          {/* Contact card */}
          <div className="glass-card px-8 py-6">
            <p className="text-white/50 text-xs font-sans font-medium tracking-widest uppercase text-center mb-4">
              {t("landing.officialContact")}
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-6 text-sm">
              <a href="https://x.com/renaissxyz" target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2.5 text-white/35 hover:text-white/70 transition-colors duration-300 no-underline">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
                <span className="font-sans">@renaissxyz</span>
              </a>
              <a href="https://discord.com/invite/renaiss" target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2.5 text-white/35 hover:text-white/70 transition-colors duration-300 no-underline">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.095 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.095 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
                </svg>
                <span className="font-sans">{t("landing.officialDiscord")}</span>
              </a>
              <a href="https://x.com/Chen1904o" target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2.5 text-white/35 hover:text-white/70 transition-colors duration-300 no-underline">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
                <span className="font-sans">@Chen1904o</span>
              </a>
            </div>
          </div>

          {/* Disclaimer */}
          <div className="text-center space-y-1.5">
            <p className="text-white/15 text-[11px] font-sans leading-relaxed tracking-wide">
              {t("landing.disclaimer")}
            </p>
            <p className="text-white/10 text-[11px] font-sans tracking-wider">
              {t("landing.copyright")}
            </p>
          </div>
        </div>
      </motion.footer>
    </div>
  );
}
