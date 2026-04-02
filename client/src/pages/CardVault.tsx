/**
 * Card Vault - Connect wallet, fetch on-chain Renaiss NFT cards
 * Displays real card data from BNB Smart Chain
 *
 * v5: Dual-path loading (tRPC cache + tokenURI fallback)
 *     ALL cards shown (even those not in tRPC index)
 *     Skeleton placeholders for pending cards, auto-polled
 *     Total FMV from server, shown immediately after load
 *     5-column grid layout
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
  ZoomIn,
} from "lucide-react";
import { toast } from "sonner";
import {
  isValidAddress,
  getCardAttribute,
  type RenaisCard,
} from "@/lib/renaiss";
import { useT } from "@/i18n";

type ViewMode = "grid" | "list";

const CARDS_PER_PAGE = 20;

// ── localStorage persistence helpers ──
const VAULT_STORAGE_PREFIX = "tcgplay-vault-";

function getVaultStorageKey(userId: string): string {
  return `${VAULT_STORAGE_PREFIX}${userId}`;
}

interface VaultPersistData {
  walletAddress: string;
  cards: RenaisCard[];
  totalFMV: number;
  timestamp: number;
}

function loadVaultData(userId: string): VaultPersistData | null {
  try {
    const raw = localStorage.getItem(getVaultStorageKey(userId));
    if (raw) return JSON.parse(raw) as VaultPersistData;
  } catch {}
  return null;
}

function saveVaultData(userId: string, data: VaultPersistData): void {
  try {
    localStorage.setItem(getVaultStorageKey(userId), JSON.stringify(data));
  } catch {}
}

function clearVaultData(userId: string): void {
  localStorage.removeItem(getVaultStorageKey(userId));
}

// ── Map server card response to RenaisCard ──
function mapServerCard(c: any): RenaisCard {
  return {
    tokenId: c.tokenId,
    tokenIdHex: c.tokenIdHex,
    fmv: c.fmv ?? null,
    loading: c.loading ?? false,
    renaisUrl: `https://renaiss.xyz/card/${c.tokenId}`,
    metadata: c.metadata || {
      name: c.name || "",
      description: "",
      collection_name: c.collection_name || "",
      external_url: "",
      image: c.image || "",
      animation_url: c.animation_url || null,
      video: c.video || null,
      token_info: {
        token_id: c.tokenId,
        contract_address: "0xF8646A3Ca093e97Bb404c3b25e675C0394DD5b30",
        chain: "BSC Mainnet",
        proof_of_integrity: { fingerprint: "", salt: "", hex_proof: "" },
      },
      item_info: { original_owner: { username: "", address: "" }, asset_pictures: [] },
      attributes: c.attributes || [],
      product_type: "",
    },
  };
}

// ── Fetch wallet cards from server ──
async function fetchWalletCardsFromServer(wallet: string): Promise<{
  cards: RenaisCard[];
  totalFMV: number;
  balance: number;
  pendingTokenIds: string[];
}> {
  const response = await fetch(`/api/renaiss/wallet-cards/${wallet}`, {
    signal: AbortSignal.timeout(30000),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || `HTTP ${response.status}`);
  }
  const data = await response.json();
  const cards: RenaisCard[] = (data.cards || []).map(mapServerCard);
  return {
    cards,
    totalFMV: data.totalFMV || 0,
    balance: data.balance || 0,
    pendingTokenIds: data.pendingTokenIds || [],
  };
}

// ── Poll server for pending (loading) cards ──
async function fetchPendingCards(tokenIds: string[]): Promise<RenaisCard[]> {
  if (!tokenIds.length) return [];
  const response = await fetch(`/api/renaiss/wallet-cards-pending`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tokenIds }),
    signal: AbortSignal.timeout(60000),
  });
  if (!response.ok) return [];
  const data = await response.json();
  return (data.cards || []).map(mapServerCard);
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
  const [totalFMV, setTotalFMV] = useState(0);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState("");
  const [pendingTokenIds, setPendingTokenIds] = useState<string[]>([]);

  // UI state
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [selectedCard, setSelectedCard] = useState<RenaisCard | null>(null);
  const [copied, setCopied] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  // Track if we already restored from cache
  const restoredRef = useRef(false);
  const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!isLoggedIn) setLocation("/login");
  }, [isLoggedIn, setLocation]);

  // ── Poll for pending cards ──
  useEffect(() => {
    if (!pendingTokenIds.length) return;

    const poll = async () => {
      try {
        const fetched = await fetchPendingCards(pendingTokenIds);
        if (fetched.length > 0) {
          setCards((prev) => {
            const updated = [...prev];
            const fetchedMap = new Map(fetched.map((c) => [c.tokenId, c]));
            for (let i = 0; i < updated.length; i++) {
              const replacement = fetchedMap.get(updated[i].tokenId);
              if (replacement) updated[i] = replacement;
            }
            return updated;
          });
          // Remove resolved tokenIds from pending
          const resolvedIds = new Set(fetched.map((c) => c.tokenId));
          setPendingTokenIds((prev) => prev.filter((id) => !resolvedIds.has(id)));
        }
      } catch {}
    };

    pollTimerRef.current = setTimeout(poll, 3000);
    return () => {
      if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
    };
  }, [pendingTokenIds]);

  // ── Restore wallet connection from localStorage on mount ──
  useEffect(() => {
    if (!userId || restoredRef.current) return;
    restoredRef.current = true;

    const saved = loadVaultData(userId);
    if (saved && saved.walletAddress && saved.cards.length > 0) {
      setWalletAddress(saved.walletAddress);
      setCards(saved.cards);
      setTotalFMV(saved.totalFMV || 0);
      setWalletConnected(true);

      // Background refresh
      fetchWalletCardsFromServer(saved.walletAddress)
        .then(({ cards: freshCards, totalFMV: freshFMV, pendingTokenIds: pending }) => {
          if (freshCards.length > 0) {
            setCards(freshCards);
            setTotalFMV(freshFMV);
            if (pending.length > 0) setPendingTokenIds(pending);
            saveVaultData(userId, {
              walletAddress: saved.walletAddress,
              cards: freshCards.filter((c) => !c.loading),
              totalFMV: freshFMV,
              timestamp: Date.now(),
            });
          }
        })
        .catch(() => {});
    }
  }, [userId]);

  // ── Filtered and paginated cards ──
  const filteredCards = useMemo(() => {
    return cards.filter((card) => {
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      const name = (card.metadata.name || "").toLowerCase();
      const collection = (card.metadata.collection_name || "").toLowerCase();
      const serial = (getCardAttribute(card.metadata, "Serial") || "").toLowerCase();
      return name.includes(q) || collection.includes(q) || serial.includes(q);
    });
  }, [cards, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredCards.length / CARDS_PER_PAGE));
  const paginatedCards = useMemo(() => {
    const start = (currentPage - 1) * CARDS_PER_PAGE;
    return filteredCards.slice(start, start + CARDS_PER_PAGE);
  }, [filteredCards, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

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
    setTotalFMV(0);
    setCurrentPage(1);
    setPendingTokenIds([]);

    try {
      const { cards: result, totalFMV: fmv, balance, pendingTokenIds: pending } =
        await fetchWalletCardsFromServer(trimmed);

      setCards(result);
      setTotalFMV(fmv);
      setWalletConnected(true);
      if (pending.length > 0) setPendingTokenIds(pending);

      if (userId) {
        saveVaultData(userId, {
          walletAddress: trimmed,
          cards: result.filter((c) => !c.loading),
          totalFMV: fmv,
          timestamp: Date.now(),
        });
      }

      if (result.length === 0) {
        toast.info(t("vault.noCardsFound"));
      } else {
        toast.success(t("vault.foundCards", { count: balance }));
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
    setTotalFMV(0);
    setWalletAddress("");
    setSelectedCard(null);
    setFetchError("");
    setCurrentPage(1);
    setPendingTokenIds([]);
    if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
    if (userId) clearVaultData(userId);
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
                <h2 className="font-heading text-xl font-semibold text-white mb-2">
                  {t("vault.connectTitle")}
                </h2>
                <p className="text-white/40 text-sm font-heading mb-8 leading-relaxed">
                  {t("vault.connectDesc")}
                </p>

                {/* Wallet Input */}
                <div className="relative mb-4">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-white/25">
                    <Wallet className="w-4 h-4" />
                  </div>
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
                    className="w-full pl-10 pr-4 py-3.5 bg-white/[0.04] border border-white/[0.08] rounded-xl text-white/80 text-sm font-mono placeholder-white/20 focus:outline-none focus:border-[#d4a853]/40 focus:bg-white/[0.06] transition-all"
                  />
                </div>

                {inputError && (
                  <p className="text-red-400/80 text-xs font-heading mb-3 flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5" />
                    {inputError}
                  </p>
                )}

                {fetchError && (
                  <p className="text-red-400/80 text-xs font-heading mb-3 flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5" />
                    {fetchError}
                  </p>
                )}

                <button
                  onClick={handleConnectWallet}
                  disabled={loading}
                  className="w-full py-3.5 rounded-xl font-heading font-semibold text-sm text-white transition-all hover:brightness-110 hover:-translate-y-px disabled:opacity-50 disabled:cursor-not-allowed disabled:translate-y-0"
                  style={{
                    background: "linear-gradient(135deg, #c9953c 0%, #d4a853 50%, #c9953c 100%)",
                    backgroundSize: "200% 200%",
                    boxShadow: "0 4px 20px rgba(212,168,83,0.25)",
                  }}
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      {t("vault.loading")}
                    </span>
                  ) : (
                    t("vault.loadCards")
                  )}
                </button>

                <p className="text-white/15 text-[11px] font-heading mt-5 leading-relaxed">
                  {t("vault.disclaimer")}
                  <br />
                  {t("vault.contract")}: 0xF864...5b30
                </p>
              </motion.div>
            </div>
          ) : (
            /* ============ Card Library State ============ */
            <>
              {/* Stats Bar */}
              <div className="flex flex-wrap items-center gap-3 mb-5">
                {/* Wallet address */}
                <button
                  onClick={handleCopyAddress}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.06] text-white/40 hover:text-white/70 transition-all text-xs font-mono"
                >
                  {copied ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
                  {walletAddress.slice(0, 8)}...{walletAddress.slice(-6)}
                </button>

                {/* Card count */}
                <div className="px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.06] text-white/40 text-xs font-heading">
                  {cards.length} {t("vault.cards")}
                  {pendingTokenIds.length > 0 && (
                    <span className="ml-1.5 text-white/25">
                      (<Loader2 className="inline w-2.5 h-2.5 animate-spin mr-0.5" />
                      {pendingTokenIds.length} {t("vault.loading")})
                    </span>
                  )}
                </div>

                {/* Total FMV */}
                <div className="px-3 py-1.5 rounded-lg bg-[#d4a853]/[0.08] border border-[#d4a853]/[0.15] flex items-center gap-2">
                  <span className="text-white/30 text-[10px] font-heading uppercase tracking-wide">
                    {t("vault.totalFMV")}
                  </span>
                  <span className="text-[#e8c675] text-sm font-bold font-mono">
                    {totalFMV > 0 ? `$${totalFMV.toFixed(2)}` : "--"}
                  </span>
                </div>

                {/* Spacer */}
                <div className="flex-1" />

                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/25" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={t("vault.search")}
                    className="pl-8 pr-3 py-1.5 bg-white/[0.04] border border-white/[0.06] rounded-lg text-white/70 text-xs font-heading placeholder-white/20 focus:outline-none focus:border-white/[0.12] transition-all w-48"
                  />
                </div>

                {/* View toggle */}
                <div className="flex items-center gap-1 p-1 rounded-lg bg-white/[0.04] border border-white/[0.06]">
                  <button
                    onClick={() => setViewMode("grid")}
                    className={`p-1.5 rounded-lg transition-all ${viewMode === "grid" ? "bg-white/[0.08] text-white/80" : "text-white/25 hover:text-white/50"}`}
                  >
                    <Grid3X3 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setViewMode("list")}
                    className={`p-1.5 rounded-lg transition-all ${viewMode === "list" ? "bg-white/[0.08] text-white/80" : "text-white/25 hover:text-white/50"}`}
                  >
                    <List className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Card Grid / List */}
              {paginatedCards.length > 0 ? (
                viewMode === "grid" ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                    {paginatedCards.map((card, i) => (
                      card.loading ? (
                        <CardSkeleton key={card.tokenId} index={i} />
                      ) : (
                        <CardGridItem
                          key={card.tokenId}
                          card={card}
                          index={i}
                          fmv={card.fmv ?? null}
                          onClick={() => setSelectedCard(card)}
                        />
                      )
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    {paginatedCards.map((card, i) => (
                      card.loading ? (
                        <CardListSkeleton key={card.tokenId} index={i} />
                      ) : (
                        <CardListItem
                          key={card.tokenId}
                          card={card}
                          index={i}
                          fmv={card.fmv ?? null}
                          onClick={() => setSelectedCard(card)}
                        />
                      )
                    ))}
                  </div>
                )
              ) : (
                <div className="text-center py-20 text-white/25 font-heading">
                  {searchQuery ? t("vault.noResults") : t("vault.noCardsFound")}
                </div>
              )}

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-1.5 mt-8">
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
            fmv={selectedCard.fmv ?? null}
            onClose={() => setSelectedCard(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

/* ============ Skeleton Components ============ */
function CardSkeleton({ index }: { index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.05 * Math.min(index, 8) }}
    >
      <div className="glass-card overflow-hidden">
        <div className="relative aspect-[3/4] bg-white/[0.04] rounded-t-[1rem] animate-pulse" />
        <div className="p-2.5 space-y-2">
          <div className="h-3 bg-white/[0.04] rounded animate-pulse" />
          <div className="h-3 bg-white/[0.04] rounded w-2/3 animate-pulse" />
        </div>
      </div>
    </motion.div>
  );
}

function CardListSkeleton({ index }: { index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.03 * Math.min(index, 10) }}
    >
      <div className="glass-card p-3.5 flex items-center gap-4">
        <div className="w-14 h-[4.5rem] rounded-lg bg-white/[0.04] animate-pulse flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="h-3 bg-white/[0.04] rounded animate-pulse" />
          <div className="h-3 bg-white/[0.04] rounded w-1/2 animate-pulse" />
        </div>
      </div>
    </motion.div>
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
  const [magnifier, setMagnifier] = useState({ active: false, x: 0, y: 0 });
  const imgRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const LENS_SIZE = 160;
  const ZOOM = 3;
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
      <div className="absolute inset-0 bg-black/75 backdrop-blur-[10px]" />

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ duration: 0.3 }}
        className="relative w-[960px] max-w-[95vw] max-h-[92vh] overflow-hidden bg-[rgba(14,13,22,0.97)] backdrop-blur-[40px] border border-white/[0.06] rounded-[1.25rem] flex"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-3.5 right-3.5 z-10 w-8 h-8 rounded-full bg-white/[0.08] border border-white/[0.08] flex items-center justify-center text-white/50 hover:text-white hover:bg-white/[0.15] transition-all"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Image Section - LEFT with Magnifier */}
        <div
          ref={containerRef}
          className="w-[380px] flex-shrink-0 bg-black/25 flex items-center justify-center rounded-l-[1.25rem] p-6 relative overflow-hidden"
          style={{ cursor: 'crosshair' }}
          onMouseMove={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            setMagnifier({ active: true, x: e.clientX - rect.left, y: e.clientY - rect.top });
          }}
          onMouseLeave={() => setMagnifier({ active: false, x: 0, y: 0 })}
        >
          <img
            ref={imgRef}
            src={card.metadata.image}
            alt={card.metadata.name}
            className="max-w-full max-h-[72vh] object-contain rounded-lg select-none"
            draggable={false}
          />

          {/* Magnifier Lens */}
          {magnifier.active && (() => {
            const img = imgRef.current;
            const container = containerRef.current;
            if (!img || !container) return null;

            const imgRect = img.getBoundingClientRect();
            const conRect = container.getBoundingClientRect();
            const imgLeft = imgRect.left - conRect.left;
            const imgTop = imgRect.top - conRect.top;
            const imgW = imgRect.width;
            const imgH = imgRect.height;

            const relX = magnifier.x - imgLeft;
            const relY = magnifier.y - imgTop;
            const pctX = Math.max(0, Math.min(1, relX / imgW));
            const pctY = Math.max(0, Math.min(1, relY / imgH));

            const zoomedW = imgW * ZOOM;
            const zoomedH = imgH * ZOOM;
            const bgX = -(pctX * zoomedW - LENS_SIZE / 2);
            const bgY = -(pctY * zoomedH - LENS_SIZE / 2);

            const lensLeft = Math.max(0, Math.min(conRect.width - LENS_SIZE, magnifier.x - LENS_SIZE / 2));
            const lensTop = Math.max(0, Math.min(conRect.height - LENS_SIZE, magnifier.y - LENS_SIZE / 2));

            return (
              <div
                style={{
                  position: 'absolute',
                  left: lensLeft,
                  top: lensTop,
                  width: LENS_SIZE,
                  height: LENS_SIZE,
                  borderRadius: '50%',
                  border: '2.5px solid rgba(212,168,83,0.75)',
                  boxShadow: '0 0 0 1px rgba(0,0,0,0.5), 0 8px 32px rgba(0,0,0,0.7)',
                  overflow: 'hidden',
                  pointerEvents: 'none',
                  zIndex: 20,
                  backgroundImage: `url(${card.metadata.image})`,
                  backgroundRepeat: 'no-repeat',
                  backgroundSize: `${zoomedW}px ${zoomedH}px`,
                  backgroundPosition: `${bgX}px ${bgY}px`,
                }}
              />
            );
          })()}

          {!magnifier.active && (
            <div className="absolute bottom-4 right-4 w-7 h-7 rounded-full bg-black/50 border border-white/15 flex items-center justify-center text-white/30 pointer-events-none">
              <ZoomIn className="w-3.5 h-3.5" />
            </div>
          )}
        </div>

        {/* Details Section - RIGHT */}
        <div className="flex-1 p-6 flex flex-col justify-between gap-0 min-h-0">
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

          {/* Attributes */}
          <div className="flex flex-col gap-2.5 flex-1 justify-center">
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

            {/* Chain Info */}
            <div className="bg-white/[0.02] border border-white/[0.03] rounded-lg px-3 py-2.5">
              <p className="text-white/20 text-[9px] font-heading uppercase tracking-wide mb-1.5">{t("vault.onChainInfo")}</p>
              <div className="space-y-0.5">
                <div className="flex items-center justify-between">
                  <span className="text-white/20 text-[11px] font-heading">{t("vault.chain")}</span>
                  <span className="text-white/55 text-[11px] font-mono">BSC Mainnet</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-white/20 text-[11px] font-heading">{t("vault.contract")}</span>
                  <span className="text-white/55 text-[11px] font-mono">0xF864...5b30</span>
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

          {/* Action Buttons */}
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
