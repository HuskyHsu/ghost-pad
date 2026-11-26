import { LocaleProvider, useContent } from "./i18n/useContent";
import { GhostCompanionProvider, TravelingGhostLayer } from "./components/sketch";
import { Navbar } from "./components/sections/Navbar";
import { HeroSection } from "./components/sections/HeroSection";
import { QuickStartSection } from "./components/sections/QuickStartSection";
import { InteractiveControlsSection } from "./components/sections/InteractiveControlsSection";
import { MacroStudioSection } from "./components/sections/MacroStudioSection";
import { AppTourSection } from "./components/sections/AppTourSection";
import { FaqAndFooterSection } from "./components/sections/FaqAndFooterSection";

function AppShell() {
  const content = useContent();

  return (
    <div className="relative min-h-dvh bg-notebook-dots text-ink">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:rounded-xl focus:border-2 focus:border-ink focus:bg-marker-yellow focus:px-4 focus:py-2 focus:text-sm focus:font-bold focus:text-ink"
      >
        {content.meta.skipToContent}
      </a>

      <Navbar />

      <main id="main-content">
        <HeroSection />
        <AppTourSection />
        <InteractiveControlsSection />
        <MacroStudioSection />
        <QuickStartSection />
        <FaqAndFooterSection />
      </main>

      <TravelingGhostLayer />
    </div>
  );
}

export function App() {
  return (
    <LocaleProvider>
      <GhostCompanionProvider>
        <AppShell />
      </GhostCompanionProvider>
    </LocaleProvider>
  );
}

export default App;
