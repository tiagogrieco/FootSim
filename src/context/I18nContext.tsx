import React, { createContext, useContext, useState, type ReactNode } from "react";
import ptBR from "../locales/pt-BR.json";
import enUS from "../locales/en-US.json";

type Language = "pt-BR" | "en-US";
type Translations = Record<string, string>;

const locales: Record<Language, Translations> = {
  "pt-BR": ptBR,
  "en-US": enUS,
};

interface I18nContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const I18nContext = createContext<I18nContextType | null>(null);

export const useTranslation = () => {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error("useTranslation must be used within an I18nProvider");
  }
  return context;
};

export const I18nProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem("footsim_language");
    if (saved === "pt-BR" || saved === "en-US") return saved as Language;
    
    // Auto-detect based on browser
    const browserLang = navigator.language;
    if (browserLang.startsWith("pt")) return "pt-BR";
    return "en-US"; // Default fallback
  });

  const setLanguage = (lang: Language) => {
    localStorage.setItem("footsim_language", lang);
    setLanguageState(lang);
  };

  const t = (key: string): string => {
    const dict = locales[language];
    return dict[key] || key; // Return key if translation is missing
  };

  return (
    <I18nContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </I18nContext.Provider>
  );
};
