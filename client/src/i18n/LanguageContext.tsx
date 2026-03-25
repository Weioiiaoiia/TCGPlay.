import React, { createContext, useContext, useState, useCallback, useMemo } from "react";
import { translations, type Language, type TranslationKeys } from "./translations";

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: TranslationKeys, params?: Record<string, string | number>) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    const stored = localStorage.getItem("tcgplay-lang");
    if (stored && (stored === "EN" || stored === "CN" || stored === "JP" || stored === "KR")) {
      return stored as Language;
    }
    return "EN";
  });

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem("tcgplay-lang", lang);
  }, []);

  const t = useCallback(
    (key: TranslationKeys, params?: Record<string, string | number>): string => {
      let text = translations[language]?.[key] || translations.EN[key] || key;
      if (params) {
        Object.entries(params).forEach(([k, v]) => {
          text = text.replace(new RegExp(`\\{${k}\\}`, "g"), String(v));
        });
      }
      return text;
    },
    [language]
  );

  const value = useMemo(
    () => ({ language, setLanguage, t }),
    [language, setLanguage, t]
  );

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within LanguageProvider");
  }
  return context;
}

/** Shorthand hook that returns only the translation function */
export function useT() {
  return useLanguage().t;
}
