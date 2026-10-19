import React, { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Globe, ChevronDown, Check } from "lucide-react";

export const LanguageSwitcher: React.FC = () => {
  const { i18n } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const languages = [
    { code: "en", label: "English" },
    { code: "ja", label: "日本語" },
    { code: "zh-TW", label: "繁體中文" },
  ];

  const currentLang = languages.find((l) => l.code === i18n.language) || languages[0];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (code: string) => {
    i18n.changeLanguage(code);
    setIsOpen(false);
  };

  return (
    <div className="relative inline-block text-left shrink-0" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-surface-card border border-border-element hover:bg-interactive-hover text-xs text-text-primary transition-colors focus:outline-none focus:ring-1 focus:ring-border-focus whitespace-nowrap shrink-0 shadow-xs cursor-pointer"
        aria-expanded={isOpen}
        aria-haspopup="true"
        title="Change Language / 切換語系 / 言語切替"
      >
        <Globe className="w-3.5 h-3.5 text-text-muted shrink-0" />
        <span className="font-medium whitespace-nowrap text-[11px]">{currentLang.label}</span>
        <ChevronDown className="w-3 h-3 text-text-muted shrink-0" />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-1.5 w-36 rounded-xl bg-surface-modal border border-border-element shadow-xl py-1 z-50 animate-in fade-in zoom-in-95 duration-100">
          {languages.map((lang) => {
            const isSelected = i18n.language === lang.code;
            return (
              <button
                key={lang.code}
                onClick={() => handleSelect(lang.code)}
                className={`w-full flex items-center justify-between px-3 py-1.5 text-xs text-left transition-colors cursor-pointer ${
                  isSelected
                    ? "bg-interactive-selected text-text-primary font-semibold"
                    : "text-text-secondary hover:bg-interactive-hover hover:text-text-primary"
                }`}
              >
                <span>{lang.label}</span>
                {isSelected && <Check className="w-3.5 h-3.5 text-emerald-600" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
