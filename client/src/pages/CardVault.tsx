/**
 * Card Vault - Connect wallet, fetch on-chain Renaiss NFT cards
 * Displays real card data from BNB Smart Chain
 */
import AppNav from "@/components/AppNav";
import FoggyBg from "@/components/FoggyBg";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState, useCallback } from "react";
import {
  Search,
  Filter,
  Grid3X3,
  List,
  Wallet,
  ExternalLink,
  Loader2,
  AlertCircle,
  ChevronDown,
  X,
  Copy,
  Check,
} from "lucide-react";
import { toast } from "sonner";
import {
  fetchWalletCards,
  isValidAddress,
  getCardAttribute,
  type RenaisCard,
} from "@/lib/renaiss";
import { useT } from "@/i18n";

type ViewMode = "grid" | "list";

export default function CardVault() {
  const { isLoggedIn } = useAuth();
  const [, setLocation] = useLocation();
  const t = useT();

  // Wallet state
  const [walletAddress, setWalletAddress] = useState("");
  const [walletConnected, setWalletConnected] = useState(false);
  const [inputError, setInputError] = useState("");

  // Cards state
  const [cards, setCards] = useState<RenaisCard[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadProgress, setLoadProgress] = useState({ loaded: 0, total: 0 });
  const [fetchError, setFetchError] = useState("");

  // UI state
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [selectedCard, setSelectedCard] = useState<RenaisCard | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!isLoggedIn) setLocation("/login");
  }, [isLoggedIn, setLocation]);

  const handleConnectWallet = useCallback(async () => {
    const trimmed = walletAddress.trim();
    if (!trimmed) {
      setInputError(t("vault.enterAddress"));
      return;
    }
    if (!isValidAddress(trimmed)) {
      setInputError(t("vault.invalidAddress"));
      return;
    }

    setInputError("");
    setLoading(true);
    setFetchError("");
    setCards([]);

    try {
      const result = await fetchWalletCards(trimmed, (loaded, total) => {
        setLoadProgress({ loaded, total });
      });

      setCards(result);
      setWalletConnected(true);

      if (result.length === 0) {
        toast.info(t("vault.noCardsFound"));
      } else {
        toast.success(t("vault.foundCards", { count: result.length }));
      }
    } catch (error: any) {
      console.error("Failed to fetch cards:", error);
      setFetchError(error.message || "Failed to fetch cards from blockchain");
      toast.error(t("vault.failedLoad"));
    } finally {
      setLoading(false);
    }
  }, [walletAddress, t]);

  const handleDisconnect = () => {
    setWalletConnected(false);
    setCards([]);
    setWalletAddress("");
    setSelectedCard(null);
    setFetchError("");
  };

  const handleCopyAddress = async () => {
    try {
      await navigator.clipboard.writeText(walletAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  // Filter cards by search query
  const filteredCards = cards.filter((card) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    const name = card.metadata.name.toLowerCase();
    const collection = card.metadata.collection_name?.toLowerCase() || "";
    const serial = getCardAttribute(card.metadata, "Serial")?.toLowerCase() || "";
    return name.includes(q) || collection.includes(q) || serial.includes(q);
  });

  if (!isLoggedIn) return null;

  return (
    <div className="relative min-h-screen">
      <FoggyBg />
      <AppNav />

      <main className="relative z-10 pt-24 pb-16 px-4 max-w-[1200px] mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="flex items-center justify-between mb-6">
            <h1 className="font-display text-3xl font-bold text-white">{t("vault.title")}</h1>
            {walletConnected && (
              <button
                onClick={handleDisconnect}
                className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-white/50 hover:text-white/80 hover:bg-white/10 transition-all text-sm font-heading"
              >
                <Wallet className="w-4 h-4" />
                <span className="hidden sm:inline">
                  {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
                </span>
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {!walletConnected ? (
            /* ============ Wallet Connection State ============ */
            <div className="flex flex-col items-center justify-center min-h-[60vh]">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="glass-card p-10 md:p-12 text-center max-w-md w-full"
              >
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-white/10 flex items-center justify-center mx-auto mb-6">
                  <Wallet className="w-10 h-10 text-purple-400" />
                </div>
                <h2 className="font-heading text-xl font-semibold text-white mb-3">
                  {t("vault.connectWallet")}
                </h2>
                <p className="text-white/40 text-sm font-heading mb-8 leading-relaxed">
                  {t("vault.connectDesc")}
                </p>

                {/* Wallet address input */}
                <div className="mb-4">
                  <div
                    className={`flex items-center gap-2 bg-white/5 rounded-xl px-4 py-3 border transition-colors ${
                      inputError
                        ? "border-red-500/50"
                        : "border-white/10 focus-within:border-purple-500/50"
                    }`}
                  >
                    <Wallet className="w-4 h-4 text-white/30 flex-shrink-0" />
                    <input
                      type="text"
                      value={walletAddress}
                      onChange={(e) => {
                        setWalletAddress(e.target.value);
                        setInputError("");
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !loading) handleConnectWallet();
                      }}
                      placeholder="0x..."
                      className="bg-transparent text-white text-sm outline-none w-full placeholder:text-white/25 font-mono"
                      disabled={loading}
                    />
                  </div>
                  {inputError && (
                    <p className="text-red-400/80 text-xs mt-2 text-left font-heading flex items-center gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5" />
                      {inputError}
                    </p>
                  )}
                </div>

                <button
                  onClick={handleConnectWallet}
                  disabled={loading}
                  className="btn-purple-gradient text-sm px-8 py-3 w-full flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      {t("vault.loadingCards")}
                      {loadProgress.total > 0 && (
                        <span>
                          ({loadProgress.loaded}/{loadProgress.total})
                        </span>
                      )}
                    </>
                  ) : (
                    t("vault.loadCards")
                  )}
                </button>

                {fetchError && (
                  <p className="text-red-400/70 text-xs mt-4 font-heading flex items-center justify-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5" />
                    {fetchError}
                  </p>
                )}

                {/* Hint */}
                <p className="text-white/20 text-[11px] mt-6 font-heading leading-relaxed">
                  {t("vault.erc721Note")}
                  <br />
                  {t("vault.contract")}: 0xF864...5b30
                </p>
              </motion.div>
            </div>
          ) : (
            /* ============ Cards Display ============ */
            <>
              {/* Wallet info bar */}
              <div className="glass-card p-4 mb-6 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500/30 to-pink-500/30 border border-white/10 flex items-center justify-center">
                    <Wallet className="w-4 h-4 text-purple-400" />
                  </div>
                  <div>
                    <p className="text-white/40 text-[11px] font-heading uppercase tracking-wider">
                      {t("vault.connectedWallet")}
                    </p>
                    <div className="flex items-center gap-2">
                      <p className="text-white/80 text-sm font-mono">
                        {walletAddress.slice(0, 10)}...{walletAddress.slice(-8)}
                      </p>
                      <button
                        onClick={handleCopyAddress}
                        className="text-white/30 hover:text-white/60 transition-colors"
                      >
                        {copied ? (
                          <Check className="w-3.5 h-3.5 text-green-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
                <div className="text-sm font-heading text-white/60">
                  {t("vault.cardsFound", { count: cards.length })}
                </div>
              </div>

              {/* Search and view controls */}
              {cards.length > 0 && (
                <div className="glass-card p-4 mb-6 flex flex-col md:flex-row items-center gap-4">
                  <div className="flex-1 flex items-center gap-2 bg-white/5 rounded-xl px-4 py-2.5 border border-white/10 w-full">
                    <Search className="w-4 h-4 text-white/40" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder={t("vault.searchPlaceholder")}
                      className="bg-transparent text-white text-sm outline-none w-full placeholder:text-white/30 font-heading"
                    />
                    {searchQuery && (
                      <button
                        onClick={() => setSearchQuery("")}
                        className="text-white/30 hover:text-white/60"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setViewMode("grid")}
                      className={`p-2.5 rounded-xl border transition-colors ${
                        viewMode === "grid"
                          ? "bg-white/10 border-white/20 text-white"
                          : "bg-white/5 border-white/10 text-white/50 hover:bg-white/10"
                      }`}
                    >
                      <Grid3X3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setViewMode("list")}
                      className={`p-2.5 rounded-xl border transition-colors ${
                        viewMode === "list"
                          ? "bg-white/10 border-white/20 text-white"
                          : "bg-white/5 border-white/10 text-white/50 hover:bg-white/10"
                      }`}
                    >
                      <List className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* Stats */}
              {cards.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div className="glass-card p-4 text-center">
                    <p className="text-white/40 text-xs font-heading mb-1">{t("vault.totalCards")}</p>
                    <p className="text-white font-heading font-semibold text-lg">{cards.length}</p>
                  </div>
                  <div className="glass-card p-4 text-center">
                    <p className="text-white/40 text-xs font-heading mb-1">{t("vault.collections")}</p>
                    <p className="text-white font-heading font-semibold text-lg">
                      {new Set(cards.map((c) => c.metadata.collection_name)).size}
                    </p>
                  </div>
                  <div className="glass-card p-4 text-center">
                    <p className="text-white/40 text-xs font-heading mb-1">{t("vault.highestGrade")}</p>
                    <p className="text-white font-heading font-semibold text-lg">
                      {cards.length > 0
                        ? getCardAttribute(cards[0].metadata, "Grade") || "--"
                        : "--"}
                    </p>
                  </div>
                  <div className="glass-card p-4 text-center">
                    <p className="text-white/40 text-xs font-heading mb-1">{t("vault.chain")}</p>
                    <p className="text-white font-heading font-semibold text-lg">BSC</p>
                  </div>
                </div>
              )}

              {/* Card Grid / List */}
              {filteredCards.length > 0 ? (
                viewMode === "grid" ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {filteredCards.map((card, i) => (
                      <CardGridItem
                        key={card.tokenId}
                        card={card}
                        index={i}
                        onClick={() => setSelectedCard(card)}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredCards.map((card, i) => (
                      <CardListItem
                        key={card.tokenId}
                        card={card}
                        index={i}
                        onClick={() => setSelectedCard(card)}
                      />
                    ))}
                  </div>
                )
              ) : cards.length > 0 && searchQuery ? (
                <div className="glass-card p-16 text-center">
                  <Search className="w-8 h-8 text-white/20 mx-auto mb-4" />
                  <h3 className="text-white/60 font-heading text-lg mb-2">{t("vault.noResults")}</h3>
                  <p className="text-white/30 text-sm font-heading">
                    {t("vault.noMatch", { query: searchQuery })}
                  </p>
                </div>
              ) : cards.length === 0 ? (
                <div className="glass-card p-16 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-4">
                    <Wallet className="w-8 h-8 text-white/30" />
                  </div>
                  <h3 className="text-white/60 font-heading text-lg mb-2">{t("vault.noRenaisCards")}</h3>
                  <p className="text-white/30 text-sm font-heading">
                    {t("vault.noRenaisCardsDesc")}
                  </p>
                </div>
              ) : null}
            </>
          )}

          {/* Disclaimer */}
          <div className="text-center mt-8">
            <p className="text-white/20 text-xs font-heading leading-relaxed">
              {t("vault.disclaimer")}
            </p>
          </div>
        </motion.div>
      </main>

      {/* Card Detail Modal */}
      <AnimatePresence>
        {selectedCard && (
          <CardDetailModal
            card={selectedCard}
            onClose={() => setSelectedCard(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

/* ============ Card Grid Item ============ */
function CardGridItem({
  card,
  index,
  onClick,
}: {
  card: RenaisCard;
  index: number;
  onClick: () => void;
}) {
  const grade = getCardAttribute(card.metadata, "Grade");
  const serial = getCardAttribute(card.metadata, "Serial");
  const t = useT();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.05 * index }}
    >
      <div
        onClick={onClick}
        className="glass-card glass-card-hover overflow-hidden cursor-pointer group"
      >
        {/* Card Image */}
        <div className="relative aspect-[3/4] bg-black/30 overflow-hidden">
          <img
            src={card.metadata.image}
            alt={card.metadata.name}
            className="w-full h-full object-contain transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
          />
          {/* Grade badge */}
          {grade && (
            <div className="absolute top-3 right-3 px-2.5 py-1 rounded-lg bg-black/60 backdrop-blur-sm border border-white/10">
              <span className="text-[11px] font-heading font-semibold text-amber-400">
                {grade}
              </span>
            </div>
          )}
        </div>

        {/* Card Info */}
        <div className="p-4">
          <h3 className="text-white/90 font-heading text-sm font-medium leading-snug mb-2 line-clamp-2">
            {card.metadata.name}
          </h3>
          <div className="flex items-center justify-between">
            {serial && (
              <span className="text-white/30 text-[11px] font-mono">{serial}</span>
            )}
            <span className="text-purple-400/60 text-[11px] font-heading flex items-center gap-1 group-hover:text-purple-400 transition-colors">
              {t("vault.details")} <ExternalLink className="w-3 h-3" />
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

/* ============ Card List Item ============ */
function CardListItem({
  card,
  index,
  onClick,
}: {
  card: RenaisCard;
  index: number;
  onClick: () => void;
}) {
  const grade = getCardAttribute(card.metadata, "Grade");
  const serial = getCardAttribute(card.metadata, "Serial");
  const year = getCardAttribute(card.metadata, "Year");
  const set = getCardAttribute(card.metadata, "Set");

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.03 * index }}
    >
      <div
        onClick={onClick}
        className="glass-card glass-card-hover p-4 cursor-pointer group flex items-center gap-4"
      >
        {/* Thumbnail */}
        <div className="w-16 h-20 rounded-lg overflow-hidden bg-black/30 flex-shrink-0">
          <img
            src={card.metadata.image}
            alt={card.metadata.name}
            className="w-full h-full object-contain"
            loading="lazy"
          />
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <h3 className="text-white/90 font-heading text-sm font-medium leading-snug mb-1 truncate">
            {card.metadata.name}
          </h3>
          <div className="flex items-center gap-3 text-[11px] text-white/30 font-heading">
            {year && <span>{year}</span>}
            {set && <span className="truncate">{set}</span>}
          </div>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-3 flex-shrink-0">
          {grade && (
            <span className="px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[11px] font-heading font-semibold">
              {grade}
            </span>
          )}
          {serial && (
            <span className="text-white/25 text-[11px] font-mono hidden md:block">
              {serial}
            </span>
          )}
          <ExternalLink className="w-4 h-4 text-white/20 group-hover:text-purple-400 transition-colors" />
        </div>
      </div>
    </motion.div>
  );
}

/* ============ Card Detail Modal ============ */
function CardDetailModal({
  card,
  onClose,
}: {
  card: RenaisCard;
  onClose: () => void;
}) {
  const t = useT();
  const grade = getCardAttribute(card.metadata, "Grade");
  const serial = getCardAttribute(card.metadata, "Serial");
  const year = getCardAttribute(card.metadata, "Year");
  const set = getCardAttribute(card.metadata, "Set");
  const grader = getCardAttribute(card.metadata, "Grader");
  const language = getCardAttribute(card.metadata, "Language");
  const cardNumber = getCardAttribute(card.metadata, "Card Number");

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

      {/* Modal */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ duration: 0.3 }}
        className="relative glass-card p-0 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full bg-white/10 border border-white/10 flex items-center justify-center text-white/60 hover:text-white hover:bg-white/20 transition-all"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex flex-col md:flex-row">
          {/* Card Image */}
          <div className="md:w-[280px] flex-shrink-0 bg-black/30 p-6 flex items-center justify-center">
            <img
              src={card.metadata.image}
              alt={card.metadata.name}
              className="max-w-full max-h-[400px] object-contain rounded-lg"
            />
          </div>

          {/* Card Details */}
          <div className="flex-1 p-6 md:p-8">
            {/* Collection name */}
            {card.metadata.collection_name && (
              <p className="text-purple-400/70 text-[11px] font-heading uppercase tracking-wider mb-2">
                {card.metadata.collection_name}
              </p>
            )}

            <h2 className="text-white font-heading text-lg font-semibold leading-snug mb-4">
              {card.metadata.name}
            </h2>

            {/* Attributes grid */}
            <div className="grid grid-cols-2 gap-3 mb-6">
              {grader && (
                <div className="bg-white/5 rounded-xl p-3 border border-white/5">
                  <p className="text-white/30 text-[10px] font-heading uppercase tracking-wider mb-0.5">
                    {t("vault.grader")}
                  </p>
                  <p className="text-white/80 text-sm font-heading font-medium">{grader}</p>
                </div>
              )}
              {grade && (
                <div className="bg-white/5 rounded-xl p-3 border border-white/5">
                  <p className="text-white/30 text-[10px] font-heading uppercase tracking-wider mb-0.5">
                    {t("vault.grade")}
                  </p>
                  <p className="text-amber-400 text-sm font-heading font-medium">{grade}</p>
                </div>
              )}
              {serial && (
                <div className="bg-white/5 rounded-xl p-3 border border-white/5">
                  <p className="text-white/30 text-[10px] font-heading uppercase tracking-wider mb-0.5">
                    {t("vault.serial")}
                  </p>
                  <p className="text-white/80 text-sm font-mono">{serial}</p>
                </div>
              )}
              {year && (
                <div className="bg-white/5 rounded-xl p-3 border border-white/5">
                  <p className="text-white/30 text-[10px] font-heading uppercase tracking-wider mb-0.5">
                    {t("vault.year")}
                  </p>
                  <p className="text-white/80 text-sm font-heading font-medium">{year}</p>
                </div>
              )}
              {set && (
                <div className="bg-white/5 rounded-xl p-3 border border-white/5 col-span-2">
                  <p className="text-white/30 text-[10px] font-heading uppercase tracking-wider mb-0.5">
                    {t("vault.set")}
                  </p>
                  <p className="text-white/80 text-sm font-heading font-medium">{set}</p>
                </div>
              )}
              {language && (
                <div className="bg-white/5 rounded-xl p-3 border border-white/5">
                  <p className="text-white/30 text-[10px] font-heading uppercase tracking-wider mb-0.5">
                    {t("vault.language")}
                  </p>
                  <p className="text-white/80 text-sm font-heading font-medium">{language}</p>
                </div>
              )}
              {cardNumber && (
                <div className="bg-white/5 rounded-xl p-3 border border-white/5">
                  <p className="text-white/30 text-[10px] font-heading uppercase tracking-wider mb-0.5">
                    {t("vault.cardNumber")}
                  </p>
                  <p className="text-white/80 text-sm font-heading font-medium">#{cardNumber}</p>
                </div>
              )}
            </div>

            {/* Token info */}
            <div className="bg-white/[0.03] rounded-xl p-4 border border-white/5 mb-6">
              <p className="text-white/30 text-[10px] font-heading uppercase tracking-wider mb-2">
                {t("vault.onChainInfo")}
              </p>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-white/30 text-xs font-heading">{t("vault.chain")}</span>
                  <span className="text-white/60 text-xs font-heading">
                    {card.metadata.token_info?.chain || "BSC Mainnet"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-white/30 text-xs font-heading">{t("vault.contract")}</span>
                  <span className="text-white/60 text-xs font-mono">
                    {card.metadata.token_info?.contract_address
                      ? `${card.metadata.token_info.contract_address.slice(0, 6)}...${card.metadata.token_info.contract_address.slice(-4)}`
                      : "0xF864...5b30"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-white/30 text-xs font-heading">{t("vault.tokenId")}</span>
                  <span className="text-white/60 text-xs font-mono">
                    {card.tokenId.length > 16
                      ? `${card.tokenId.slice(0, 8)}...${card.tokenId.slice(-8)}`
                      : card.tokenId}
                  </span>
                </div>
                {card.metadata.item_info?.original_owner?.username && (
                  <div className="flex items-center justify-between">
                    <span className="text-white/30 text-xs font-heading">{t("vault.originalOwner")}</span>
                    <span className="text-white/60 text-xs font-heading">
                      {card.metadata.item_info.original_owner.username}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Action button - link to Renaiss */}
            <a
              href={card.renaisUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-purple-gradient text-sm px-6 py-3 w-full flex items-center justify-center gap-2 no-underline"
            >
              <ExternalLink className="w-4 h-4" />
              {t("vault.viewOnRenaiss")}
            </a>

            <p className="text-white/15 text-[10px] mt-3 text-center font-heading">
              {t("vault.opensRenaiss")}
            </p>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
