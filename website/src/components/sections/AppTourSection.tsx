import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Compass, Layers, Cpu } from "lucide-react";
import { useContent } from "../../i18n/useContent";
import type { TourTab } from "../../content/zh-TW";
import { SketchCard } from "../sketch";

const TAB_ICONS: Record<TourTab["id"], typeof Compass> = {
  dashboard: Compass,
  macro: Layers,
  hardware: Cpu,
};

export function AppTourSection() {
  const content = useContent();
  const { tour } = content;
  const prefersReducedMotion = useReducedMotion();

  const [activeTabId, setActiveTabId] = useState<TourTab["id"]>(tour.tabs[0].id);
  const activeTab = tour.tabs.find((t) => t.id === activeTabId) ?? tour.tabs[0];

  const [activePinId, setActivePinId] = useState<string>(activeTab.pins[0]?.id ?? "");
  const activePin =
    activeTab.pins.find((p) => p.id === activePinId) ?? activeTab.pins[0];

  function handleSelectTab(tab: TourTab) {
    setActiveTabId(tab.id);
    setActivePinId(tab.pins[0]?.id ?? "");
  }

  return (
    <section
      id="tour"
      aria-labelledby="tour-heading"
      className="mx-auto max-w-6xl px-5 py-12 sm:px-8 md:py-14"
    >
      {/* Section Header */}
      <div className="max-w-2xl">
        <h2
          id="tour-heading"
          className="font-[var(--font-display)] text-3xl font-bold tracking-[-0.02em] text-ink sm:text-4xl"
        >
          {tour.heading}
        </h2>
        <p className="mt-3 text-base leading-relaxed text-ink-soft sm:text-lg">
          {tour.subheading}
        </p>
      </div>

      {/* Tab switcher */}
      <div
        role="tablist"
        aria-label={tour.tablistAriaLabel}
        className="mt-6 grid w-full grid-cols-3 gap-1 rounded-2xl border border-ink/15 bg-paper-warm/80 p-1.5 sm:inline-flex sm:w-auto sm:gap-2"
      >
        {tour.tabs.map((tab) => {
          const Icon = TAB_ICONS[tab.id];
          const isSelected = tab.id === activeTab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              id={`tour-tab-${tab.id}`}
              aria-selected={isSelected}
              aria-controls={`tour-panel-${tab.id}`}
              onClick={() => handleSelectTab(tab)}
              className={`relative inline-flex cursor-pointer flex-col items-center justify-center gap-1 rounded-xl px-1.5 py-2 text-center text-[11px] font-bold leading-tight transition-[color,transform] duration-150 ease-out active:scale-[0.96] sm:flex-row sm:gap-2 sm:px-4 sm:py-2.5 sm:text-sm ${
                isSelected ? "text-ink" : "text-ink-muted hover:text-ink"
              }`}
            >
              {isSelected && (
                <motion.span
                  layoutId="tour-active-tab"
                  transition={{ type: "spring", duration: 0.4, bounce: 0 }}
                  className="absolute inset-0 rounded-xl border-2 border-ink bg-paper-card paper-shadow-sm"
                />
              )}
              <Icon className="relative z-10 h-4 w-4 shrink-0" aria-hidden="true" />
              <span className="relative z-10">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Main Viewer + Callout Detail Panel */}
      <div
        role="tabpanel"
        id={`tour-panel-${activeTab.id}`}
        aria-labelledby={`tour-tab-${activeTab.id}`}
        className="mt-6 grid gap-6 lg:grid-cols-12 lg:items-start"
      >
        {/* Screenshot canvas with interactive numbered callout pins */}
        <div className="lg:col-span-8">
          <SketchCard tone="paper" roughBorder className="p-3 sm:p-4">
            <div className="relative overflow-hidden rounded-xl border border-ink/15 bg-ink/5">
              <img
                src={activeTab.image}
                alt={activeTab.alt}
                className="block h-auto w-full select-none"
              />

              {/* Numbered hand-drawn callout pins */}
              {activeTab.pins.map((pin) => {
                const isActive = activePin?.id === pin.id;
                return (
                  <button
                    key={pin.id}
                    type="button"
                    aria-pressed={isActive}
                    aria-label={`${pin.number}. ${pin.title}`}
                    onClick={() => setActivePinId(pin.id)}
                    style={{ left: `${pin.x}%`, top: `${pin.y}%` }}
                    className={`absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer rounded-full border-2 font-[var(--font-display)] text-sm font-bold tabular-nums transition-[transform,background-color,color,box-shadow] duration-150 ease-out active:scale-[0.96] ${
                      isActive
                        ? "z-20 h-10 w-10 scale-110 border-ink bg-marker-yellow text-ink ring-4 ring-ghost-sky/70"
                        : "z-10 h-9 w-9 border-ink bg-paper-card text-ink hover:scale-105 hover:bg-ghost-sky-pale"
                    }`}
                  >
                    <span className="sr-only">{pin.title}</span>
                    <span aria-hidden="true">{pin.number}</span>
                  </button>
                );
              })}
            </div>
          </SketchCard>
        </div>

        {/* Active Callout Detail Panel (always readable, never clips) */}
        <div className="space-y-4 lg:col-span-4">
          <p className="text-sm leading-relaxed text-ink-soft">{activeTab.caption}</p>

          {activePin && (
            <SketchCard tone="sky" className="p-5">
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={activePin.id}
                  initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: -4 }}
                  transition={{ duration: 0.15, ease: "easeOut" }}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 border-ink bg-marker-yellow font-[var(--font-display)] text-xs font-bold text-ink tabular-nums">
                      {activePin.number}
                    </span>
                    <h3 className="font-[var(--font-display)] text-lg font-bold text-ink">
                      {activePin.title}
                    </h3>
                  </div>
                  <p className="mt-3 text-sm leading-relaxed text-ink-soft">
                    {activePin.detail}
                  </p>
                </motion.div>
              </AnimatePresence>
            </SketchCard>
          )}

          {/* Pin directory list for effortless keyboard & mobile navigation */}
          <div className="space-y-2" aria-label={tour.pinListAriaLabel}>
            {activeTab.pins.map((pin) => {
              const isActive = activePin?.id === pin.id;
              return (
                <button
                  key={pin.id}
                  type="button"
                  onClick={() => setActivePinId(pin.id)}
                  aria-current={isActive ? "true" : undefined}
                  className={`flex w-full cursor-pointer items-center gap-3 rounded-xl border px-3.5 py-2.5 text-left text-sm transition-[background-color,border-color,transform] duration-150 ease-out active:scale-[0.96] ${
                    isActive
                      ? "border-ink bg-paper-card font-bold text-ink paper-shadow-sm"
                      : "border-ink/12 bg-paper-warm/60 font-medium text-ink-soft hover:border-ink/30 hover:bg-paper-card"
                  }`}
                >
                  <span
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border font-[var(--font-display)] text-xs font-bold tabular-nums ${
                      isActive
                        ? "border-ink bg-marker-yellow text-ink"
                        : "border-ink/25 bg-paper text-ink-muted"
                    }`}
                  >
                    {pin.number}
                  </span>
                  <span className="min-w-0 flex-1 truncate">{pin.title}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

export default AppTourSection;
