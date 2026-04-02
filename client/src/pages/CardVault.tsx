/**
 * Card Vault - Connect wallet, fetch on-chain Renaiss NFT cards
 * Displays real card data from BNB Smart Chain
 *
 * v3: 5-column grid layout, real-time FMV from Renaiss,
 *     single-screen modal (no scroll), gold+ice-blue premium palette,
 *     pagination support for large collections
 */
import AppNav from "@/components/AppNav";
import FoggyBg from "@/components/FoggyBg";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import {
  Search,
  Grid3X3,
  List,
  Wallet,
  ExternalLink,
  Loader2,
  AlertCircle,
  X,
  Copy,
  Check,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import {
  fetchWalletCards,
  fetchBatchFMV,
  isValidAddress,
  getCardAttribute,
  type RenaisCard,
} from "@/lib/renaiss";
import { useT } from "@/i18n";

type ViewMode = "grid" | "list";

const CARDS_PER_PAGE = 10;

// ── localStorage persistence helpers ──
const VAULT_STORAGE_PREFIX = "tcgplay-vault-";

function getVaultStorageKey(userId: string): string {
  return `${VAULT_STORAGE_PREFIX}${userId}`;
}

interface VaultPersistData {
  walletAddress: string;
  cards: RenaisCard[];
  timestamp: number;
}

function loadVaultData(userId: string): VaultPersistData | null {
  try {
    const raw = localStorage.getItem(getVaultStorageKey(userId));
    if (raw) {
      return JSON.parse(raw) as VaultPersistData;
    }
  } catch {
    // ignore parse errors
  }
  return null;
}

function saveVaultData(userId: string, data: VaultPersistData): void {
  try {
    localStorage.setItem(getVaultStorageKey(userId), JSON.stringify(data));
  } catch {
    // localStorage might be full, silently fail
  }
}

function clearVaultData(userId: string): void {
  localStorage.removeItem(getVaultStorageKey(userId));
}

export default function CardVault() {
  const { isLoggedIn, user } = useAuth();
  const [, setLocation] = useLocation();
  const t = useT();
  const userId = user?.id || "";

  // Wallet state
  const [walletAddress, setWalletAddress] = useState("");
  const [walletConnected, setWalletConnected] = useState(false);
  const [inputError, setInputError] = useState("");

  // Cards state
  const [cards, setCards] = useState<RenaisCard[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadProgress, setLoadProgress] = useState({ loaded: 0, total: 0 });
  const [fetchError, setFetchError] = useState("");

  // FMV state
  const [fmvMap, setFmvMap] = useState<Record<string, number | null>>({});
  const [fmvLoading, setFmvLoading] = useState(false);

  // UI state
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [selectedCard, setSelectedCard] = useState<RenaisCard | null>(null);
  const [copied, setCopied] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  // Track if we already restored from cache
  const restoredRef = useRef(false);

  useEffect(() => {
    if (!isLoggedIn) setLocation("/login");
  }, [isLoggedIn, setLocation]);

  // ── Restore wallet connection from localStorage on mount ──
  useEffect(() => {
    if (!userId || restoredRef.current) return;
    restoredRef.current = true;

    const saved = loadVaultData(userId);
    if (saved && saved.walletAddress && saved.cards.length > 0) {
      setWalletAddress(saved.walletAddress);
      setCards(saved.cards);
      setWalletConnected(true);

      // Background refresh
      fetchWalletCards(saved.walletAddress, () => {})
        .then((freshCards) => {
          if (freshCards.length > 0) {
            setCards(freshCards);
            saveVaultData(userId, {
              walletAddress: saved.walletAddress,
              cards: freshCards,
              timestamp: Date.now(),
            });
          }
        })
        .catch(() => {});
    }
  }, [userId]);

  // ── Fetch FMV for current page cards ──
  const filteredCards = useMemo(() => {
    return cards.filter((card) => {
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      const name = card.metadata.name.toLowerCase();
      const collection = card.metadata.collection_name?.toLowerCase() || "";
      const serial = getCardAttribute(card.metadata, "Serial")?.toLowerCase() || "";
      return name.includes(q) || collection.includes(q) || serial.includes(q);
    });
  }, [cards, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredCards.length / CARDS_PER_PAGE));
  const paginatedCards = useMemo(() => {
    const start = (currentPage - 1) * CARDS_PER_PAGE;
    return filteredCards.slice(start, start + CARDS_PER_PAGE);
  }, [filteredCards, currentPage]);

  // Reset page when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  // Fetch FMV for visible cards
  useEffect(() => {
    if (paginatedCards.length === 0) return;
    const tokenIds = paginatedCards.map((c) => c.tokenId);
    // Only fetch for cards we don't have FMV for yet
    const missing = tokenIds.filter((id) => !(id in fmvMap));
    if (missing.length === 0) return;

    setFmvLoading(true);
    fetchBatchFMV(missing)
      .then((results) => {
        setFmvMap((prev) => ({ ...prev, ...results }));
      })
      .finally(() => setFmvLoading(false));
  }, [paginatedCards]);

  // Total FMV calculation
  const totalFMV = useMemo(() => {
    let sum = 0;
    for (const card of cards) {
      const fmv = fmvMap[card.tokenId];
      if (fmv != null) sum += fmv;
    }
    return sum;
  }, [cards, fmvMap]);

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
    setFmvMap({});
    setCurrentPage(1);

    try {
      const result = await fetchWalletCards(trimmed, (loaded, total) => {
        setLoadProgress({ loaded, total });
      });

      setCards(result);
      setWalletConnected(true);

      if (userId) {
        saveVaultData(userId, {
          walletAddress: trimmed,
          cards: result,
          timestamp: Date.now(),
        });
      }

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
  }, [walletAddress, t, userId]);

  const handleDisconnect = () => {
    setWalletConnected(false);
    setCards([]);
    setWalletAddress("");
    setSelectedCard(null);
    setFetchError("");
    setFmvMap({});
    setCurrentPage(1);
    if (userId) {
      clearVaultData(userId);
    }
  };

  const handleCopyAddress = async () => {
    try {
      await navigator.clipboard.writeText(walletAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  if (!isLoggedIn) return null;

  return (
    <div className="relative min-h-screen">
      <FoggyBg />
      <AppNav />

      <main className="relative z-10 pt-24 pb-16 px-4 max-w-[1400px] mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* Page Header */}
          <div className="flex items-center justify-between mb-5">
            <h1 className="font-display text-3xl font-bold text-white">{t("vault.title")}</h1>
            {walletConnected && (
              <button
                onClick={handleDisconnect}
                className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/[0.04] border border-white/[0.06] text-white/45 hover:text-white/80 hover:bg-white/[0.08] transition-all text-sm font-heading"
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
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#d4a853]/20 to-[#7eb8d4]/20 border border-white/10 flex items-center justify-center mx-auto mb-6">
                  <Wallet className="w-10 h-10 text-[#d4a853]" />
                </div>
                <h2 className="font-heading text-xl font-semibold text-white mb-3">
                  {t("vault.connectWallet")}
                </h2>
                <p className="text-white/40 text-sm font-heading mb-8 leading-relaxed">
                  {t("vault.connectDesc")}
                </p>

                <div className="mb-4">
                  <div
                    className={`flex items-center gap-2 bg-white/5 rounded-xl px-4 py-3 border transition-colors ${
                      inputError
                        ? "border-red-500/50"
                        : "border-white/10 focus-within:border-[#d4a853]/40"
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
                  className="vault-btn-gold text-sm px-8 py-3 w-full flex items-center justify-center gap-2 disabled:opacity-50"
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
              <div className="glass-card p-3 px-5 mb-5 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#d4a853]/25 to-[#7eb8d4]/25 border border-white/10 flex items-center justify-center">
                    <Wallet className="w-4 h-4 text-[#d4a853]" />
                  </div>
                  <div>
                    <p className="text-white/35 text-[11px] font-heading uppercase tracking-wider">
                      {t("vault.connectedWallet")}
                    </p>
                    <div className="flex items-center gap-2">
                      <p className="text-white/75 text-sm font-mono">
                        {walletAddress.slice(0, 10)}...{walletAddress.slice(-8)}
                      </p>
                      <button
                        onClick={handleCopyAddress}
                        className="text-white/30 hover:text-white/60 transition-colors"
                      >
                        {copied ? (
                          <Check className="w-3.5 h-3.5 text-[#d4a853]" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
                <div className="text-sm font-heading text-white/55">
                  {t("vault.cardsFound", { count: cards.length })}
                </div>
              </div>

              {/* Search & View Toggle */}
              {cards.length > 0 && (
                <div className="flex items-center gap-3 mb-5">
                  <div className="flex-1 flex items-center gap-2 bg-white/[0.04] rounded-[0.875rem] px-4 py-2.5 border border-white/[0.06] focus-within:border-[#d4a853]/25 transition-colors">
                    <Search className="w-4 h-4 text-white/30" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder={t("vault.searchPlaceholder")}
                      className="bg-transparent text-white text-sm outline-none w-full placeholder:text-white/20 font-heading"
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
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setViewMode("grid")}
                      className={`p-2.5 rounded-[0.625rem] border transition-colors ${
                        viewMode === "grid"
                          ? "bg-white/[0.08] border-white/[0.12] text-white"
                          : "bg-white/[0.03] border-white/[0.06] text-white/40 hover:bg-white/[0.06]"
                      }`}
                    >
                      <Grid3X3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setViewMode("list")}
                      className={`p-2.5 rounded-[0.625rem] border transition-colors ${
                        viewMode === "list"
                          ? "bg-white/[0.08] border-white/[0.12] text-white"
                          : "bg-white/[0.03] border-white/[0.06] text-white/40 hover:bg-white/[0.06]"
                      }`}
                    >
                      <List className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* Stats - 5 columns */}
              {cards.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-5">
                  <div className="glass-card p-3.5 text-center">
                    <p className="text-white/35 text-[11px] font-heading mb-0.5">{t("vault.totalCards")}</p>
                    <p className="text-white font-heading font-semibold text-base">{cards.length}</p>
                  </div>
                  <div className="glass-card p-3.5 text-center">
                    <p className="text-white/35 text-[11px] font-heading mb-0.5">{t("vault.collections")}</p>
                    <p className="text-white font-heading font-semibold text-base">
                      {new Set(cards.map((c) => c.metadata.collection_name)).size}
                    </p>
                  </div>
                  <div className="glass-card p-3.5 text-center">
                    <p className="text-white/35 text-[11px] font-heading mb-0.5">{t("vault.highestGrade")}</p>
                    <p className="text-[#e8c675] font-heading font-semibold text-base">
                      {cards.length > 0
                        ? getCardAttribute(cards[0].metadata, "Grade") || "--"
                        : "--"}
                    </p>
                  </div>
                  <div className="glass-card p-3.5 text-center">
                    <p className="text-white/35 text-[11px] font-heading mb-0.5">{t("vault.totalFMV")}</p>
                    <p className="text-[#e8c675] font-heading font-semibold text-base">
                      {totalFMV > 0 ? `$${totalFMV.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}` : "--"}
                    </p>
                  </div>
                  <div className="glass-card p-3.5 text-center">
                    <p className="text-white/35 text-[11px] font-heading mb-0.5">{t("vault.fmvSource")}</p>
                    <p className="font-heading font-semibold text-sm">
                      <span className="inline-flex items-center gap-1.5 text-[#e8c675]">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#e8c675] animate-pulse" />
                        Renaiss {t("vault.live")}
                      </span>
                    </p>
                  </div>
                </div>
              )}

              {/* Card Grid / List - 5 columns */}
              {paginatedCards.length > 0 ? (
                viewMode === "grid" ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3.5">
                    {paginatedCards.map((card, i) => (
                      <CardGridItem
                        key={card.tokenId}
                        card={card}
                        index={i}
                        fmv={fmvMap[card.tokenId] ?? null}
                        onClick={() => setSelectedCard(card)}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {paginatedCards.map((card, i) => (
                      <CardListItem
                        key={card.tokenId}
                        card={card}
                        index={i}
                        fmv={fmvMap[card.tokenId] ?? null}
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

              {/* Pagination */}
              {filteredCards.length > CARDS_PER_PAGE && (
                <div className="flex items-center justify-center gap-1.5 mt-6">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="p-2 rounded-lg bg-white/[0.04] border border-white/[0.06] text-white/50 hover:bg-white/[0.08] disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                    let pageNum: number;
                    if (totalPages <= 7) {
                      pageNum = i + 1;
                    } else if (currentPage <= 4) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 3) {
                      pageNum = totalPages - 6 + i;
                    } else {
                      pageNum = currentPage - 3 + i;
                    }
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-heading transition-all ${
                          currentPage === pageNum
                            ? "bg-[#d4a853]/15 border border-[#d4a853]/20 text-[#e8c675]"
                            : "bg-white/[0.04] border border-white/[0.06] text-white/50 hover:bg-white/[0.06]"
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                  <button
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="p-2 rounded-lg bg-white/[0.04] border border-white/[0.06] text-white/50 hover:bg-white/[0.08] disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                  <span className="text-white/30 text-xs font-heading ml-2">
                    {(currentPage - 1) * CARDS_PER_PAGE + 1}-{Math.min(currentPage * CARDS_PER_PAGE, filteredCards.length)} / {filteredCards.length}
                  </span>
                </div>
              )}
            </>
          )}

          {/* Disclaimer */}
          <div className="text-center mt-8">
            <p className="text-white/15 text-xs font-heading leading-relaxed">
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
            fmv={fmvMap[selectedCard.tokenId] ?? null}
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
  fmv,
  onClick,
}: {
  card: RenaisCard;
  index: number;
  fmv: number | null;
  onClick: () => void;
}) {
  const grade = getCardAttribute(card.metadata, "Grade");
  const t = useT();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.05 * Math.min(index, 8) }}
    >
      <div
        onClick={onClick}
        className="glass-card glass-card-hover overflow-hidden cursor-pointer group"
      >
        {/* Card Image */}
        <div className="relative aspect-[3/4] bg-black/25 overflow-hidden rounded-t-[1rem]">
          <img
            src={card.metadata.image}
            alt={card.metadata.name}
            className="w-full h-full object-contain transition-transform duration-500 group-hover:scale-[1.04]"
            loading="lazy"
          />
          {grade && (
            <div className="absolute top-2 right-2 px-2 py-0.5 rounded-md bg-black/55 backdrop-blur-sm border border-white/[0.08]">
              <span className="text-[9px] font-heading font-semibold text-[#e8c675]">
                {grade}
              </span>
            </div>
          )}
        </div>

        {/* Card Info */}
        <div className="p-2.5">
          <h3 className="text-white/90 font-heading text-[11px] font-medium leading-snug mb-1.5 line-clamp-2 min-h-[2em]">
            {card.metadata.name}
          </h3>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              <span className="text-white/20 text-[9px] font-heading uppercase tracking-wide">FMV</span>
              <span className="text-[#e8c675] text-xs font-semibold font-mono">
                {fmv != null ? `$${fmv.toFixed(2)}` : "--"}
              </span>
            </div>
            <span className="text-white/20 text-[9px] font-heading flex items-center gap-0.5 group-hover:text-[#d4a853] transition-colors">
              {t("vault.details")} <ExternalLink className="w-2.5 h-2.5" />
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
  fmv,
  onClick,
}: {
  card: RenaisCard;
  index: number;
  fmv: number | null;
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
      transition={{ duration: 0.3, delay: 0.03 * Math.min(index, 10) }}
    >
      <div
        onClick={onClick}
        className="glass-card glass-card-hover p-3.5 cursor-pointer group flex items-center gap-4"
      >
        <div className="w-14 h-[4.5rem] rounded-lg overflow-hidden bg-black/25 flex-shrink-0">
          <img
            src={card.metadata.image}
            alt={card.metadata.name}
            className="w-full h-full object-contain"
            loading="lazy"
          />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-white/90 font-heading text-sm font-medium leading-snug mb-1 truncate">
            {card.metadata.name}
          </h3>
          <div className="flex items-center gap-3 text-[11px] text-white/30 font-heading">
            {year && <span>{year}</span>}
            {set && <span className="truncate">{set}</span>}
          </div>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          {fmv != null && (
            <span className="text-[#e8c675] text-sm font-semibold font-mono">
              ${fmv.toFixed(2)}
            </span>
          )}
          {grade && (
            <span className="px-2 py-0.5 rounded-md bg-[#d4a853]/10 border border-[#d4a853]/15 text-[#e8c675] text-[10px] font-heading font-semibold">
              {grade}
            </span>
          )}
          {serial && (
            <span className="text-white/20 text-[10px] font-mono hidden md:block">
              {serial}
            </span>
          )}
          <ExternalLink className="w-4 h-4 text-white/20 group-hover:text-[#d4a853] transition-colors" />
        </div>
      </div>
    </motion.div>
  );
}

/* ============ Card Detail Modal - NO SCROLL, ONE SCREEN ============ */
function CardDetailModal({
  card,
  fmv,
  onClose,
}: {
  card: RenaisCard;
  fmv: number | null;
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

  const psaCertNumber = serial ? serial.replace(/^PSA/i, "").trim() : null;
  const psaVerifyUrl = psaCertNumber
    ? `https://www.psacard.com/cert/${psaCertNumber}`
    : null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/75 backdrop-blur-[10px]" />

      {/* Modal - NO SCROLL */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ duration: 0.3 }}
        className="relative w-[960px] max-w-[95vw] max-h-[92vh] overflow-hidden bg-[rgba(14,13,22,0.97)] backdrop-blur-[40px] border border-white/[0.06] rounded-[1.25rem] flex"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-3.5 right-3.5 z-10 w-8 h-8 rounded-full bg-white/[0.08] border border-white/[0.08] flex items-center justify-center text-white/50 hover:text-white hover:bg-white/[0.15] transition-all"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Image Section - LEFT, LARGE */}
        <div className="w-[380px] flex-shrink-0 bg-black/25 flex items-center justify-center rounded-l-[1.25rem] p-6">
          <img
            src={card.metadata.image}
            alt={card.metadata.name}
            className="max-w-full max-h-[72vh] object-contain rounded-lg"
          />
        </div>

        {/* Details Section - RIGHT, COMPACT, NO SCROLL */}
        <div className="flex-1 p-6 flex flex-col justify-between gap-0 min-h-0">
          {/* TOP: Title + FMV */}
          <div className="flex flex-col gap-3">
            {card.metadata.collection_name && (
              <p className="text-[#9ccde5] text-[10px] font-heading uppercase tracking-wider opacity-80">
                {card.metadata.collection_name}
              </p>
            )}
            <h2 className="text-white font-heading text-[1.0625rem] font-semibold leading-snug">
              {card.metadata.name}
            </h2>

            {/* FMV Price Box */}
            <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-[#d4a853]/[0.06] border border-[#d4a853]/[0.12]">
              <div className="flex items-baseline gap-2.5">
                <span className="text-white/35 text-[10px] font-heading uppercase tracking-wide">FMV</span>
                <span className="text-[#e8c675] text-[1.375rem] font-bold font-mono">
                  {fmv != null ? `$${fmv.toFixed(2)}` : "--"}
                </span>
              </div>
              <div className="flex flex-col items-end gap-0.5">
                <span className="inline-flex items-center gap-1 text-[#e8c675] text-[10px] font-semibold">
                  <span className="w-[5px] h-[5px] rounded-full bg-[#e8c675] animate-pulse" />
                  LIVE
                </span>
                <span className="text-white/20 text-[9px]">Renaiss {t("vault.onChainData")}</span>
              </div>
            </div>
          </div>

          {/* MID: Attributes + Chain */}
          <div className="flex flex-col gap-2.5 flex-1 justify-center">
            {/* Attributes 3-column grid */}
            <div className="grid grid-cols-3 gap-2">
              {grader && (
                <div className="bg-white/[0.03] border border-white/[0.04] rounded-lg p-2">
                  <p className="text-white/20 text-[9px] font-heading uppercase tracking-wide">{t("vault.grader")}</p>
                  <p className="text-white/60 text-xs font-heading font-medium">{grader}</p>
                </div>
              )}
              {grade && (
                <div className="bg-white/[0.03] border border-white/[0.04] rounded-lg p-2">
                  <p className="text-white/20 text-[9px] font-heading uppercase tracking-wide">{t("vault.grade")}</p>
                  <p className="text-[#e8c675] text-xs font-heading font-medium">{grade}</p>
                </div>
              )}
              {year && (
                <div className="bg-white/[0.03] border border-white/[0.04] rounded-lg p-2">
                  <p className="text-white/20 text-[9px] font-heading uppercase tracking-wide">{t("vault.year")}</p>
                  <p className="text-white/60 text-xs font-heading font-medium">{year}</p>
                </div>
              )}
              {serial && (
                <div className="bg-white/[0.03] border border-white/[0.04] rounded-lg p-2">
                  <p className="text-white/20 text-[9px] font-heading uppercase tracking-wide">{t("vault.serial")}</p>
                  <p className="text-white/60 text-[11px] font-mono">{serial}</p>
                </div>
              )}
              {language && (
                <div className="bg-white/[0.03] border border-white/[0.04] rounded-lg p-2">
                  <p className="text-white/20 text-[9px] font-heading uppercase tracking-wide">{t("vault.language")}</p>
                  <p className="text-white/60 text-xs font-heading font-medium">{language}</p>
                </div>
              )}
              {cardNumber && (
                <div className="bg-white/[0.03] border border-white/[0.04] rounded-lg p-2">
                  <p className="text-white/20 text-[9px] font-heading uppercase tracking-wide">{t("vault.cardNumber")}</p>
                  <p className="text-white/60 text-xs font-heading font-medium">#{cardNumber}</p>
                </div>
              )}
              {set && (
                <div className="bg-white/[0.03] border border-white/[0.04] rounded-lg p-2 col-span-3">
                  <p className="text-white/20 text-[9px] font-heading uppercase tracking-wide">{t("vault.set")}</p>
                  <p className="text-white/60 text-xs font-heading font-medium">{set}</p>
                </div>
              )}
            </div>

            {/* Chain Info - compact */}
            <div className="bg-white/[0.02] border border-white/[0.03] rounded-lg px-3 py-2.5">
              <p className="text-white/20 text-[9px] font-heading uppercase tracking-wide mb-1.5">{t("vault.onChainInfo")}</p>
              <div className="space-y-0.5">
                <div className="flex items-center justify-between">
                  <span className="text-white/20 text-[11px] font-heading">{t("vault.chain")}</span>
                  <span className="text-white/55 text-[11px] font-mono">
                    {card.metadata.token_info?.chain || "BSC Mainnet"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-white/20 text-[11px] font-heading">{t("vault.contract")}</span>
                  <span className="text-white/55 text-[11px] font-mono">
                    {card.metadata.token_info?.contract_address
                      ? `${card.metadata.token_info.contract_address.slice(0, 6)}...${card.metadata.token_info.contract_address.slice(-4)}`
                      : "0xF864...5b30"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-white/20 text-[11px] font-heading">{t("vault.tokenId")}</span>
                  <span className="text-white/55 text-[11px] font-mono">
                    {card.tokenId.length > 16
                      ? `${card.tokenId.slice(0, 8)}...${card.tokenId.slice(-8)}`
                      : card.tokenId}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* BOTTOM: Action Buttons */}
          <div className="flex flex-col gap-2">
            <div className="flex gap-2.5">
              {psaVerifyUrl && (
                <a
                  href={psaVerifyUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-[0.625rem] text-xs font-semibold text-white no-underline transition-all hover:brightness-110 hover:-translate-y-px"
                  style={{
                    background: "linear-gradient(135deg, #c9953c 0%, #d4a853 50%, #c9953c 100%)",
                    backgroundSize: "200% 200%",
                    boxShadow: "0 2px 12px rgba(212,168,83,0.2)",
                  }}
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  {t("vault.psaVerify")}
                </a>
              )}
              <a
                href={card.renaisUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-[0.625rem] text-xs font-semibold text-white no-underline transition-all hover:brightness-110 hover:-translate-y-px"
                style={{
                  background: "linear-gradient(135deg, #5a8fa8 0%, #7eb8d4 50%, #5a8fa8 100%)",
                  backgroundSize: "200% 200%",
                  boxShadow: "0 2px 12px rgba(126,184,212,0.15)",
                }}
              >
                <ExternalLink className="w-3.5 h-3.5" />
                {t("vault.viewOnRenaiss")}
              </a>
            </div>
            <p className="text-white/[0.1] text-[9px] text-center font-heading">
              {t("vault.opensRenaiss")}
            </p>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
