import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { BookOpen, ChevronDown, Download, Github } from "lucide-react";
import { useContent } from "../../i18n/useContent";
import { GhostMascot, SketchCard, SpeechBubble } from "../sketch";

export function FaqAndFooterSection() {
  const content = useContent();
  const { faq, footer, meta } = content;
  const prefersReducedMotion = useReducedMotion();

  const [openId, setOpenId] = useState<string | null>(faq.items[0]?.id ?? null);

  function toggleItem(id: string) {
    setOpenId((prev) => (prev === id ? null : id));
  }

  return (
    <>
      <section
        id="faq"
        aria-labelledby="faq-heading"
        className="mx-auto max-w-6xl px-5 pt-12 pb-10 sm:px-8 md:pt-14 md:pb-12"
      >
        <div className="grid gap-8 lg:grid-cols-12 lg:items-start">
          {/* Left column: Heading + Mascot companion */}
          <div className="lg:col-span-4">
            <h2
              id="faq-heading"
              className="font-[var(--font-display)] text-3xl font-bold tracking-[-0.02em] text-ink sm:text-4xl"
            >
              {faq.heading}
            </h2>
            <p className="mt-3 text-base leading-relaxed text-ink-soft">
              {faq.subheading}
            </p>

            <div className="mt-6 flex items-end gap-4">
              <GhostMascot className="h-24 w-24 shrink-0" mood="happy" />
              <SpeechBubble tail="left" className="text-xs leading-relaxed text-ink-soft">
                {faq.mascotBubble}
              </SpeechBubble>
            </div>
          </div>

          {/* Right column: Accessible Accordion */}
          <div className="space-y-3 lg:col-span-8">
            {faq.items.map((item) => {
              const isOpen = openId === item.id;
              const panelId = `faq-panel-${item.id}`;
              const triggerId = `faq-trigger-${item.id}`;

              return (
                <div
                  key={item.id}
                  className={`rounded-2xl border-2 transition-[background-color,border-color] duration-150 ease-out ${
                    isOpen
                      ? "border-ink bg-paper-card paper-shadow-sm"
                      : "border-ink/15 bg-paper-card/75 hover:border-ink/30"
                  }`}
                >
                  <h3>
                    <button
                      type="button"
                      id={triggerId}
                      aria-expanded={isOpen}
                      aria-controls={panelId}
                      onClick={() => toggleItem(item.id)}
                      className="flex w-full cursor-pointer items-center justify-between gap-4 px-5 py-4 text-left font-[var(--font-display)] text-base font-bold text-ink sm:px-6 sm:text-lg"
                    >
                      <span>{item.question}</span>
                      <ChevronDown
                        className={`h-5 w-5 shrink-0 text-ink-soft transition-transform duration-200 ease-out ${
                          isOpen ? "rotate-180 text-ink" : ""
                        }`}
                        aria-hidden="true"
                      />
                    </button>
                  </h3>

                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        id={panelId}
                        role="region"
                        aria-labelledby={triggerId}
                        initial={
                          prefersReducedMotion
                            ? { opacity: 0 }
                            : { opacity: 0, y: -4 }
                        }
                        animate={{ opacity: 1, y: 0 }}
                        exit={
                          prefersReducedMotion
                            ? { opacity: 0 }
                            : { opacity: 0, y: -4 }
                        }
                        transition={{ duration: 0.18, ease: "easeOut" }}
                        className="border-t border-ink/10 px-5 pt-3.5 pb-5 text-sm leading-relaxed text-ink-soft sm:px-6 sm:text-base"
                      >
                        {item.answer}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </div>

        {/* Warm Paper Download CTA Card */}
        <div className="mt-12 md:mt-14">
          <SketchCard tone="warm" tape="corners" roughBorder className="p-7 sm:p-10">
            <div className="grid items-center gap-8 lg:grid-cols-12">
              <div className="space-y-4 lg:col-span-8">
                <h2 className="font-[var(--font-display)] text-2xl font-bold tracking-[-0.02em] text-ink sm:text-3xl">
                  {footer.ctaTitle}
                </h2>
                <p className="max-w-2xl text-base leading-relaxed text-ink-soft">
                  {footer.ctaBody}
                </p>
                <div className="flex flex-wrap items-center gap-3 pt-2">
                  <a
                    href={meta.releasesUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 rounded-xl border-2 border-ink bg-ghost-sky px-5 py-3 text-sm font-bold text-ink paper-shadow-sm transition-[background-color,transform] duration-150 ease-out hover:bg-ghost-sky/85 active:scale-[0.96]"
                  >
                    <Download className="h-4 w-4" aria-hidden="true" />
                    {footer.downloadButton}
                  </a>
                  <a
                    href={meta.githubUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 rounded-xl border-2 border-ink/25 bg-paper-card px-5 py-3 text-sm font-bold text-ink transition-[background-color,border-color,transform] duration-150 ease-out hover:border-ink hover:bg-marker-yellow/40 active:scale-[0.96]"
                  >
                    <BookOpen className="h-4 w-4" aria-hidden="true" />
                    {footer.docsButton}
                  </a>
                </div>
              </div>

              <div className="flex justify-center lg:col-span-4 lg:justify-end">
                <GhostMascot className="h-32 w-32 sm:h-36 sm:w-36" mood="excited" showSignals />
              </div>
            </div>
          </SketchCard>
        </div>
      </section>

      {/* Simple Footer */}
      <footer className="border-t border-ink/12 bg-paper-warm/50">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-5 py-6 text-sm text-ink-muted sm:flex-row sm:px-8">
          <div className="flex items-center gap-2.5 font-[var(--font-display)] font-bold text-ink">
            <GhostMascot className="h-7 w-7" mood="happy" />
            <span>{footer.copyright}</span>
          </div>

          <div className="flex items-center gap-5">
            <a
              href={meta.releasesUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 font-medium text-ink-soft transition-colors duration-150 ease-out hover:text-ink"
            >
              <Download className="h-4 w-4" aria-hidden="true" />
              <span>{footer.releasesLinkLabel}</span>
            </a>
            <a
              href={meta.githubUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 font-medium text-ink-soft transition-colors duration-150 ease-out hover:text-ink"
            >
              <Github className="h-4 w-4" aria-hidden="true" />
              <span>GitHub</span>
            </a>
          </div>
        </div>
      </footer>
    </>
  );
}

export default FaqAndFooterSection;
