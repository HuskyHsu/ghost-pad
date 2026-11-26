import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  Check,
  ChevronDown,
  Download,
  Github,
  Globe,
  Menu,
  X,
} from "lucide-react";
import {
  LOCALE_OPTIONS,
  useContent,
  useLocale,
} from "../../i18n/useContent";
import { GhostMascot } from "../sketch";

export function Navbar() {
  const content = useContent();
  const { locale, setLocale } = useLocale();
  const prefersReducedMotion = Boolean(useReducedMotion());
  const [menuOpen, setMenuOpen] = useState(false);
  const [langMenuOpen, setLangMenuOpen] = useState(false);
  const langMenuRef = useRef<HTMLDivElement | null>(null);

  const currentLocaleOption =
    LOCALE_OPTIONS.find((opt) => opt.code === locale) ?? LOCALE_OPTIONS[0];

  useEffect(() => {
    if (!menuOpen && !langMenuOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMenuOpen(false);
        setLangMenuOpen(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [menuOpen, langMenuOpen]);

  useEffect(() => {
    if (!langMenuOpen) return;
    const onPointerDown = (event: MouseEvent) => {
      if (
        langMenuRef.current &&
        !langMenuRef.current.contains(event.target as Node)
      ) {
        setLangMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [langMenuOpen]);

  return (
    <header className="sticky top-0 z-40 px-4 pt-3 pb-2 sm:px-6">
      <nav
        aria-label={content.meta.brand}
        className="mx-auto flex max-w-6xl items-center justify-between gap-4 border-2 border-ink/15 bg-paper/92 px-4 py-2.5 backdrop-blur-md paper-shadow-sm sketch-corner sm:px-5"
      >
        {/* Left cluster: Brand + subtle divider + left-aligned nav links */}
        <div className="flex min-w-0 items-center gap-3">
          <a
            href="#"
            className="group flex shrink-0 items-center gap-2.5 whitespace-nowrap rounded-lg py-0.5 pr-1 text-ink transition-[opacity] duration-150 ease-out hover:opacity-85"
          >
            <GhostMascot className="h-9 w-9 shrink-0" mood="happy" />
            <span className="font-[family-name:var(--font-display)] text-lg font-bold tracking-[-0.02em] text-ink">
              {content.meta.brand}
            </span>
          </a>

          <span
            aria-hidden="true"
            className="hidden h-5 w-px shrink-0 bg-ink/15 lg:block"
          />

          <ul className="hidden items-center gap-1 lg:flex">
            {content.nav.items.map((item) => (
              <li key={item.id} className="shrink-0">
                <a
                  href={`#${item.id}`}
                  className="inline-block whitespace-nowrap rounded-lg px-2.5 py-1.5 text-[13.5px] font-medium text-ink-soft transition-[background-color,color] duration-150 ease-out hover:bg-paper-warm hover:text-ink"
                >
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </div>

        {/* Right cluster: uniform h-9 controls (Language Dropdown + GitHub + Download CTA) */}
        <div className="hidden shrink-0 items-center justify-end gap-2 lg:flex">
          <div ref={langMenuRef} className="relative shrink-0">
            <button
              type="button"
              onClick={() => setLangMenuOpen((prev) => !prev)}
              aria-label={content.nav.languageLabel}
              aria-haspopup="menu"
              aria-expanded={langMenuOpen}
              className="inline-flex h-9 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-xl border border-ink/15 bg-paper-card px-3 text-xs font-semibold text-ink transition-[transform,background-color,border-color] duration-150 ease-out hover:border-ink/30 hover:bg-paper-warm active:scale-[0.96]"
            >
              <Globe
                className="h-3.5 w-3.5 shrink-0 text-ink-muted"
                aria-hidden="true"
              />
              <span>{currentLocaleOption.label}</span>
              <ChevronDown
                className={`h-3.5 w-3.5 shrink-0 text-ink-muted transition-[transform] duration-150 ease-out ${
                  langMenuOpen ? "rotate-180" : "rotate-0"
                }`}
                aria-hidden="true"
              />
            </button>

            <AnimatePresence>
              {langMenuOpen && (
                <motion.div
                  key="lang-dropdown"
                  role="menu"
                  aria-label={content.nav.languageLabel}
                  initial={
                    prefersReducedMotion
                      ? { opacity: 0 }
                      : { opacity: 0, y: -6, scale: 0.96 }
                  }
                  animate={
                    prefersReducedMotion
                      ? { opacity: 1 }
                      : { opacity: 1, y: 0, scale: 1 }
                  }
                  exit={
                    prefersReducedMotion
                      ? { opacity: 0 }
                      : { opacity: 0, y: -6, scale: 0.97 }
                  }
                  transition={
                    prefersReducedMotion
                      ? { duration: 0.15, ease: "easeOut" }
                      : { type: "spring", duration: 0.25, bounce: 0 }
                  }
                  className="absolute top-full right-0 z-50 mt-2 min-w-[148px] origin-top-right border-2 border-ink/15 bg-paper-card p-1.5 paper-shadow sketch-corner"
                >
                  {LOCALE_OPTIONS.map((opt) => {
                    const active = locale === opt.code;
                    return (
                      <button
                        key={opt.code}
                        type="button"
                        role="menuitemradio"
                        aria-checked={active}
                        onClick={() => {
                          setLocale(opt.code);
                          setLangMenuOpen(false);
                        }}
                        className={`flex w-full items-center justify-between gap-2 whitespace-nowrap rounded-lg px-2.5 py-1.5 text-left text-xs font-semibold transition-[transform,background-color,color] duration-150 ease-out active:scale-[0.96] ${
                          active
                            ? "bg-ghost-sky-pale/80 text-ink"
                            : "text-ink-soft hover:bg-paper-warm hover:text-ink"
                        }`}
                      >
                        <span>{opt.label}</span>
                        {active && (
                          <Check
                            className="h-3.5 w-3.5 shrink-0 text-ghost-sky-deep"
                            aria-hidden="true"
                          />
                        )}
                      </button>
                    );
                  })}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <a
            href={content.meta.githubUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="GitHub"
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-ink/15 bg-paper-card text-ink-soft transition-[transform,background-color,color,border-color] duration-150 ease-out hover:border-ink/30 hover:bg-paper-warm hover:text-ink active:scale-[0.96]"
          >
            <Github className="h-4 w-4" aria-hidden="true" />
          </a>

          <a
            href={content.meta.releasesUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-9 min-w-[144px] shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-xl bg-ink px-3.5 text-sm font-semibold text-paper transition-[transform,background-color] duration-150 ease-out hover:bg-ink-soft active:scale-[0.96]"
          >
            <Download className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>{content.nav.downloadCta}</span>
          </a>
        </div>

        <button
          type="button"
          onClick={() => setMenuOpen((prev) => !prev)}
          aria-expanded={menuOpen}
          aria-controls="mobile-nav-drawer"
          aria-label={menuOpen ? content.nav.closeMenu : content.nav.openMenu}
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-ink/15 bg-paper-card text-ink transition-[transform,background-color] duration-150 ease-out hover:bg-paper-warm active:scale-[0.96] lg:hidden"
        >
          <AnimatePresence mode="popLayout" initial={false}>
            {menuOpen ? (
              <motion.span
                key="close"
                initial={
                  prefersReducedMotion
                    ? { opacity: 0 }
                    : { opacity: 0, scale: 0.25, filter: "blur(4px)" }
                }
                animate={
                  prefersReducedMotion
                    ? { opacity: 1 }
                    : { opacity: 1, scale: 1, filter: "blur(0px)" }
                }
                exit={
                  prefersReducedMotion
                    ? { opacity: 0 }
                    : { opacity: 0, scale: 0.25, filter: "blur(4px)" }
                }
                transition={{ type: "spring", duration: 0.3, bounce: 0 }}
                className="flex items-center justify-center"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </motion.span>
            ) : (
              <motion.span
                key="open"
                initial={
                  prefersReducedMotion
                    ? { opacity: 0 }
                    : { opacity: 0, scale: 0.25, filter: "blur(4px)" }
                }
                animate={
                  prefersReducedMotion
                    ? { opacity: 1 }
                    : { opacity: 1, scale: 1, filter: "blur(0px)" }
                }
                exit={
                  prefersReducedMotion
                    ? { opacity: 0 }
                    : { opacity: 0, scale: 0.25, filter: "blur(4px)" }
                }
                transition={{ type: "spring", duration: 0.3, bounce: 0 }}
                className="flex items-center justify-center"
              >
                <Menu className="h-5 w-5" aria-hidden="true" />
              </motion.span>
            )}
          </AnimatePresence>
        </button>
      </nav>

      <AnimatePresence>
        {menuOpen && (
          <>
            <motion.div
              key="nav-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
              onClick={() => setMenuOpen(false)}
              className="fixed inset-0 z-30 bg-ink/20 backdrop-blur-[2px] lg:hidden"
              aria-hidden="true"
            />
            <motion.div
              key="nav-drawer"
              id="mobile-nav-drawer"
              role="dialog"
              aria-modal="true"
              aria-label={content.meta.brand}
              initial={
                prefersReducedMotion
                  ? { opacity: 0 }
                  : { opacity: 0, y: -12, scale: 0.98 }
              }
              animate={
                prefersReducedMotion
                  ? { opacity: 1 }
                  : { opacity: 1, y: 0, scale: 1 }
              }
              exit={
                prefersReducedMotion
                  ? { opacity: 0 }
                  : { opacity: 0, y: -12, scale: 0.99 }
              }
              transition={
                prefersReducedMotion
                  ? { duration: 0.15, ease: "easeOut" }
                  : { type: "spring", duration: 0.35, bounce: 0 }
              }
              className="relative z-40 mx-auto mt-2 max-w-6xl origin-top border-2 border-ink/15 bg-paper p-4 paper-shadow sketch-corner lg:hidden"
            >
              <ul className="flex flex-col gap-1">
                {content.nav.items.map((item) => (
                  <li key={item.id}>
                    <a
                      href={`#${item.id}`}
                      onClick={() => setMenuOpen(false)}
                      className="block rounded-xl px-3.5 py-2.5 text-base font-medium text-ink transition-[background-color] duration-150 ease-out hover:bg-paper-warm"
                    >
                      {item.label}
                    </a>
                  </li>
                ))}
              </ul>

              <div className="mt-3 flex flex-col gap-2.5 border-t border-ink/10 pt-3">
                <div
                  role="group"
                  aria-label={content.nav.languageLabel}
                  className="grid grid-cols-3 gap-1 rounded-xl border border-ink/15 bg-paper-warm/70 p-1"
                >
                  {LOCALE_OPTIONS.map((opt) => {
                    const active = locale === opt.code;
                    return (
                      <button
                        key={opt.code}
                        type="button"
                        onClick={() => setLocale(opt.code)}
                        aria-pressed={active}
                        title={opt.label}
                        className={`whitespace-nowrap rounded-lg py-1.5 text-xs font-semibold transition-[transform,background-color,color] duration-150 ease-out active:scale-[0.96] ${
                          active
                            ? "bg-ink text-paper"
                            : "text-ink-soft hover:bg-paper-card hover:text-ink"
                        }`}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>

                <a
                  href={content.meta.releasesUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setMenuOpen(false)}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-ink px-4 py-2.5 text-sm font-semibold text-paper transition-[transform,background-color] duration-150 ease-out hover:bg-ink-soft active:scale-[0.96]"
                >
                  <Download className="h-4 w-4" aria-hidden="true" />
                  <span>{content.nav.downloadCta}</span>
                </a>
                <a
                  href={content.meta.githubUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setMenuOpen(false)}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-ink/20 bg-paper-card px-4 py-2.5 text-sm font-medium text-ink transition-[transform,background-color] duration-150 ease-out hover:bg-paper-warm active:scale-[0.96]"
                >
                  <Github className="h-4 w-4" aria-hidden="true" />
                  <span>GitHub</span>
                </a>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </header>
  );
}
