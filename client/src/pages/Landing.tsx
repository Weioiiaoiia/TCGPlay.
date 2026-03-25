import { Link } from "wouter";
import StarField from "@/components/StarField";
import { motion } from "framer-motion";

const HERO_BG = "https://d2xsxph8kpxj0f.cloudfront.net/310519663466251609/azZHMfkVbqxhqHw2ESyYVP/hero-bg-VbCWACbYuCYDhc8vCD6ZS5.webp";

export default function Landing() {
  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Background */}
      <div
        className="fixed inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${HERO_BG})` }}
      />
      <div className="fixed inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/60" />
      <StarField />

      {/* Top Nav - only logo, no right-side links */}
      <nav className="relative z-10 flex items-center justify-between px-8 py-5 max-w-[1400px] mx-auto">
        <div className="glass-nav px-6 py-3 flex items-center w-full">
          <div className="flex items-center gap-2">
            <span className="font-display text-xl font-bold gold-shimmer tracking-wider">
              TCGPlay
            </span>
          </div>
        </div>
      </nav>

      {/* Hero - clean, no card images */}
      <main className="relative z-10 flex flex-col items-center justify-center text-center px-4 mt-16 md:mt-28">
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="font-display text-5xl md:text-7xl font-bold text-white mb-6 leading-tight"
          style={{ textShadow: "0 4px 30px rgba(0,0,0,0.5)" }}
        >
          Your Cards, Your Party
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="text-white/70 text-lg md:text-xl max-w-xl mb-10 font-heading font-light"
        >
          The future of trading card games, reimagined with true ownership and community-driven play.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
        >
          <Link
            href="/login"
            className="btn-purple-gradient text-lg px-10 py-4 inline-block no-underline"
          >
            Start Playing Now
          </Link>
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 mt-auto pb-8 px-4 absolute bottom-0 left-0 right-0">
        <div className="max-w-4xl mx-auto">
          {/* Card image source notice */}
          <div className="text-center mb-8">
            <p className="text-white/40 text-xs font-heading">
              Card images sourced from Renaiss on-chain assets
            </p>
          </div>

          {/* Contact info */}
          <div className="glass-card p-6 mb-6">
            <h3 className="text-white/90 text-sm font-heading font-semibold mb-4 text-center">
              Official Contact
            </h3>
            <div className="flex flex-col md:flex-row items-center justify-center gap-6 text-sm">
              <a
                href="https://x.com/renaissxyz"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-white/60 hover:text-white transition-colors no-underline"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
                <span>@renaissxyz</span>
              </a>
              <a
                href="https://discord.com/invite/renaiss"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-white/60 hover:text-white transition-colors no-underline"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.095 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.095 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
                </svg>
                <span>Official Discord</span>
              </a>
              <a
                href="https://x.com/Chen1904o"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-white/60 hover:text-white transition-colors no-underline"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
                <span>@Chen1904o (Tech Support)</span>
              </a>
            </div>
          </div>

          {/* Disclaimer */}
          <div className="text-center">
            <p className="text-white/30 text-xs font-heading leading-relaxed">
              Disclaimer: TCGPlay is a community entertainment free game. This is not a commercial product.
              <br />
              All card images are sourced from Renaiss on-chain data and are used for non-commercial community entertainment purposes only.
            </p>
            <p className="text-white/20 text-xs mt-3 font-heading">
              &copy; 2025 TCGPlay Community. Free to play.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
