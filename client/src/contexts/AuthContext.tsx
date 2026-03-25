import { createContext, useContext, ReactNode, useMemo } from "react";
import { usePrivy, User as PrivyUser } from "@privy-io/react-auth";

/** Unified user shape consumed by the rest of the app */
export interface AppUser {
  /** Privy DID – unique per user, used as storage key */
  id: string;
  /** Best display name we can derive from linked accounts */
  name: string;
  /** Login method label (e.g. "google", "email", "twitter") */
  loginMethod: string;
  /** Email or social handle */
  identifier: string;
  /** Avatar URL if available */
  avatar: string;
  /** Legacy wallet field kept for backward compat */
  wallet: string;
}

interface AuthContextType {
  isLoggedIn: boolean;
  ready: boolean;
  user: AppUser | null;
  login: () => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/** Derive a friendly AppUser from the Privy user object */
function deriveAppUser(privyUser: PrivyUser): AppUser {
  const id = privyUser.id; // Privy DID

  // Try to get info from linked accounts
  let name = "";
  let loginMethod = "unknown";
  let identifier = "";
  let avatar = "";

  // Check Google account
  const google = privyUser.google;
  if (google) {
    name = google.name || "";
    identifier = google.email || "";
    loginMethod = "google";
  }

  // Check Twitter account
  const twitter = privyUser.twitter;
  if (twitter) {
    name = twitter.name || twitter.username || "";
    identifier = twitter.username ? `@${twitter.username}` : "";
    loginMethod = "twitter";
    if (twitter.profilePictureUrl) {
      avatar = twitter.profilePictureUrl;
    }
  }

  // Check email account
  const email = privyUser.email;
  if (email) {
    if (!name) name = email.address.split("@")[0];
    if (!identifier) identifier = email.address;
    if (loginMethod === "unknown") loginMethod = "email";
  }

  // Fallback name
  if (!name) {
    name = identifier || id.slice(0, 10);
  }

  // Wallet address (embedded or linked)
  const walletAccount = privyUser.wallet;
  const wallet = walletAccount?.address || "";

  return { id, name, loginMethod, identifier, avatar, wallet };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const { ready, authenticated, user: privyUser, login: privyLogin, logout: privyLogout } = usePrivy();

  const isLoggedIn = ready && authenticated;

  const user = useMemo<AppUser | null>(() => {
    if (!isLoggedIn || !privyUser) return null;
    return deriveAppUser(privyUser);
  }, [isLoggedIn, privyUser]);

  const login = () => {
    privyLogin();
  };

  const logout = () => {
    privyLogout();
  };

  return (
    <AuthContext.Provider value={{ isLoggedIn, ready, user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
