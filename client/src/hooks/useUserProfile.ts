import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";

/** Profile data stored per user */
export interface UserProfileData {
  displayName: string;
  avatarUrl: string;
  bio: string;
}

const STORAGE_PREFIX = "tcgplay-profile-";

function getStorageKey(userId: string): string {
  return `${STORAGE_PREFIX}${userId}`;
}

function loadProfile(userId: string): UserProfileData {
  try {
    const raw = localStorage.getItem(getStorageKey(userId));
    if (raw) {
      return JSON.parse(raw) as UserProfileData;
    }
  } catch {
    // ignore parse errors
  }
  return { displayName: "", avatarUrl: "", bio: "" };
}

function saveProfile(userId: string, data: UserProfileData): void {
  localStorage.setItem(getStorageKey(userId), JSON.stringify(data));
}

/**
 * Hook to manage per-user profile data.
 * Data is persisted in localStorage keyed by the Privy user DID,
 * so each account (Google / email / Twitter) has its own profile.
 */
export function useUserProfile() {
  const { user } = useAuth();
  const userId = user?.id || "";

  const [profile, setProfile] = useState<UserProfileData>(() =>
    userId ? loadProfile(userId) : { displayName: "", avatarUrl: "", bio: "" }
  );
  const [loaded, setLoaded] = useState(false);

  // Reload profile when user changes (e.g. different account logs in)
  useEffect(() => {
    if (userId) {
      setProfile(loadProfile(userId));
      setLoaded(true);
    } else {
      setProfile({ displayName: "", avatarUrl: "", bio: "" });
      setLoaded(false);
    }
  }, [userId]);

  const updateProfile = useCallback(
    (patch: Partial<UserProfileData>) => {
      setProfile((prev) => {
        const next = { ...prev, ...patch };
        if (userId) {
          saveProfile(userId, next);
        }
        return next;
      });
    },
    [userId]
  );

  const save = useCallback(() => {
    if (userId) {
      saveProfile(userId, profile);
    }
  }, [userId, profile]);

  return { profile, updateProfile, save, loaded };
}
