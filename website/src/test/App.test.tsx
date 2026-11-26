import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import App from "../App";
import { IDLE_SLEEP_MS } from "../components/sketch";
import { zhTWContent } from "../content/zh-TW";
import { enContent } from "../content/en";
import { jaContent } from "../content/ja";

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

beforeAll(() => {
  if (typeof globalThis.ResizeObserver === "undefined") {
    class MockResizeObserver implements ResizeObserver {
      observe(): void {}
      unobserve(): void {}
      disconnect(): void {}
    }
    globalThis.ResizeObserver = MockResizeObserver;
  }

  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: {
      writeText: vi.fn().mockResolvedValue(undefined),
    },
  });
});

afterEach(() => {
  cleanup();
  window.history.replaceState(null, "", "/");
  document.documentElement.lang = "";
  vi.clearAllMocks();
});

describe("Ghost-Pad Guide Website", () => {
  it("renders all major sections in English by default including Gatekeeper xattr command and Nugget Bridge showcase", () => {
    render(<App />);

    // Hero
    expect(screen.getByText(enContent.hero.title)).toBeInTheDocument();
    expect(screen.getByText(enContent.hero.diagram.title)).toBeInTheDocument();

    // QuickStart + macOS Gatekeeper (collapsed by default, expands to reveal xattr command)
    expect(screen.getByText(enContent.quickStart.heading)).toBeInTheDocument();
    const gatekeeperToggle = screen.getByRole("button", {
      name: new RegExp(escapeRegExp(enContent.quickStart.macosGatekeeper.title)),
    });
    expect(gatekeeperToggle).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(gatekeeperToggle);
    expect(gatekeeperToggle).toHaveAttribute("aria-expanded", "true");
    expect(
      screen.getByText(enContent.quickStart.macosGatekeeper.methodB.command),
    ).toBeInTheDocument();

    // InteractiveControls (including browser simulation preview banner & 30s DAW timeline)
    expect(screen.getByText(enContent.controls.heading)).toBeInTheDocument();
    expect(
      screen.getByText(enContent.controls.simulationBanner),
    ).toBeInTheDocument();
    expect(
      screen.getByText(enContent.controls.timelineTitle),
    ).toBeInTheDocument();
    expect(
      screen.getByText(enContent.controls.timelineDurationLabel),
    ).toBeInTheDocument();
    expect(
      screen.getByText(new RegExp(escapeRegExp(enContent.controls.handyTips[0].title))),
    ).toBeInTheDocument();

    // MacroStudio + Pokemon FireRed/LeafGreen Nugget Bridge showcase
    expect(screen.getByText(enContent.macro.heading)).toBeInTheDocument();
    expect(
      screen.getByText(enContent.macro.emergencyNote),
    ).toBeInTheDocument();
    expect(
      screen.getByText(enContent.macro.showcase.title),
    ).toBeInTheDocument();
    expect(
      screen.getByText(enContent.macro.showcase.syncStatusReady),
    ).toBeInTheDocument();
    expect(
      screen.getByText(enContent.macro.showcase.switchVideoCaption),
    ).toBeInTheDocument();
    expect(
      screen.getByText(enContent.macro.showcase.appVideoCaption),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", {
        name: new RegExp(escapeRegExp(enContent.macro.showcase.scriptReadyLabel)),
      }),
    ).toHaveAttribute("href", enContent.macro.showcase.scriptSrc);

    // AppTour
    expect(screen.getByText(enContent.tour.heading)).toBeInTheDocument();
    for (const tab of enContent.tour.tabs) {
      const tabEl =
        screen.queryByRole("tab", { name: new RegExp(escapeRegExp(tab.label)) }) ??
        screen.getByRole("button", { name: new RegExp(escapeRegExp(tab.label)) });
      expect(tabEl).toBeInTheDocument();
    }

    // FAQ & Footer
    expect(screen.getByText(enContent.faq.heading)).toBeInTheDocument();
    expect(screen.getByText(enContent.footer.ctaTitle)).toBeInTheDocument();
    expect(screen.getByText(enContent.footer.copyright)).toBeInTheDocument();
  });

  it("copies the macOS Gatekeeper xattr command when clicking the copy button", async () => {
    render(<App />);

    const gatekeeperToggle = screen.getByRole("button", {
      name: new RegExp(escapeRegExp(enContent.quickStart.macosGatekeeper.title)),
    });
    fireEvent.click(gatekeeperToggle);

    const copyButton = screen.getByRole("button", {
      name: new RegExp(
        escapeRegExp(enContent.quickStart.macosGatekeeper.methodB.copyLabel),
      ),
    });
    fireEvent.click(copyButton);

    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
        enContent.quickStart.macosGatekeeper.methodB.command,
      );
    });

    expect(
      await screen.findByText(
        new RegExp(
          escapeRegExp(enContent.quickStart.macosGatekeeper.methodB.copiedLabel),
        ),
      ),
    ).toBeInTheDocument();
  });

  it("responds to keyboard input ('w' and 'l') and toggles Mute in InteractiveControlsSection", () => {
    const { container } = render(<App />);
    const controlsSection = container.querySelector("#controls") as HTMLElement | null;
    expect(controlsSection).not.toBeNull();

    // Toggle Mute button on and off
    const muteBtn = within(controlsSection!).getByRole("button", {
      name: new RegExp(escapeRegExp(enContent.controls.muteToggle.activeLabel)),
    });
    expect(muteBtn).toBeInTheDocument();

    fireEvent.click(muteBtn);
    const unmuteBtn = within(controlsSection!).getByRole("button", {
      name: new RegExp(escapeRegExp(enContent.controls.muteToggle.mutedLabel)),
    });
    expect(unmuteBtn).toBeInTheDocument();

    fireEvent.click(unmuteBtn);
    expect(
      within(controlsSection!).getByRole("button", {
        name: new RegExp(escapeRegExp(enContent.controls.muteToggle.activeLabel)),
      }),
    ).toBeInTheDocument();

    // Press keyboard keys 'w' (stick up) and 'l' (A button) and verify keycap state updates
    const controls = within(controlsSection!);
    const wKeycap = controls.getByRole("button", { name: /^W \(/ });
    const lKeycap = controls.getByRole("button", { name: /^L \(/ });
    expect(wKeycap).toHaveAttribute("aria-pressed", "false");
    expect(lKeycap).toHaveAttribute("aria-pressed", "false");

    fireEvent.keyDown(window, { key: "w", code: "KeyW" });
    fireEvent.keyDown(window, { key: "l", code: "KeyL" });
    expect(wKeycap).toHaveAttribute("aria-pressed", "true");
    expect(lKeycap).toHaveAttribute("aria-pressed", "true");

    fireEvent.keyUp(window, { key: "w", code: "KeyW" });
    fireEvent.keyUp(window, { key: "l", code: "KeyL" });
    expect(wKeycap).toHaveAttribute("aria-pressed", "false");
    expect(lKeycap).toHaveAttribute("aria-pressed", "false");
  });

  it("switches tabs and displays pin details when clicked in AppTourSection", async () => {
    const { container } = render(<App />);
    const tourSection = container.querySelector("#tour") as HTMLElement | null;
    expect(tourSection).not.toBeNull();
    const tour = within(tourSection!);

    // Click pin 3 on the default Dashboard tab
    const dashboardTab = enContent.tour.tabs[0];
    const targetDashboardPin = dashboardTab.pins[2];
    const dashboardPinBtn = tour.getByRole("button", {
      name: `${targetDashboardPin.number}. ${targetDashboardPin.title}`,
    });
    fireEvent.click(dashboardPinBtn);
    expect(dashboardPinBtn).toHaveAttribute("aria-pressed", "true");
    expect(
      await tour.findByRole("heading", { level: 3, name: targetDashboardPin.title }),
    ).toBeInTheDocument();
    expect(await tour.findByText(targetDashboardPin.detail)).toBeInTheDocument();

    // Switch to the second tab (Macro Studio)
    const macroTab = enContent.tour.tabs[1];
    const macroTabTrigger = tour.getByRole("tab", {
      name: new RegExp(escapeRegExp(macroTab.label)),
    });
    fireEvent.click(macroTabTrigger);
    expect(macroTabTrigger).toHaveAttribute("aria-selected", "true");
    expect(tour.getByText(macroTab.caption)).toBeInTheDocument();

    // Click pin 2 on the Macro Studio tab
    const targetMacroPin = macroTab.pins[1];
    const macroPinBtn = tour.getByRole("button", {
      name: `${targetMacroPin.number}. ${targetMacroPin.title}`,
    });
    fireEvent.click(macroPinBtn);
    expect(macroPinBtn).toHaveAttribute("aria-pressed", "true");
    expect(
      await tour.findByRole("heading", { level: 3, name: targetMacroPin.title }),
    ).toBeInTheDocument();
    expect(await tour.findByText(targetMacroPin.detail)).toBeInTheDocument();

    // Switch to the third tab (Button Edit & Drag)
    const macroEditTab = enContent.tour.tabs[2];
    const macroEditTabTrigger = tour.getByRole("tab", {
      name: new RegExp(escapeRegExp(macroEditTab.label)),
    });
    fireEvent.click(macroEditTabTrigger);
    expect(macroEditTabTrigger).toHaveAttribute("aria-selected", "true");
    expect(tour.getByText(macroEditTab.caption)).toBeInTheDocument();
    expect(tour.getByRole("img").getAttribute("src")).toBe(
      "./screenshots/en/macro-edit.png",
    );
  });

  it("expands and collapses FAQ items in FaqAndFooterSection", async () => {
    const { container } = render(<App />);
    const faqSection = container.querySelector("#faq") as HTMLElement | null;
    expect(faqSection).not.toBeNull();
    const faq = within(faqSection!);

    const secondItem = enContent.faq.items[1];
    const questionBtn = faq.getByRole("button", {
      name: new RegExp(escapeRegExp(secondItem.question)),
    });

    const initiallyExpanded = questionBtn.getAttribute("aria-expanded") === "true";

    // First click toggles state
    fireEvent.click(questionBtn);
    expect(questionBtn).toHaveAttribute(
      "aria-expanded",
      initiallyExpanded ? "false" : "true",
    );

    if (!initiallyExpanded) {
      expect(faq.getByText(secondItem.answer)).toBeInTheDocument();
    }

    // Second click restores original state
    fireEvent.click(questionBtn);
    expect(questionBtn).toHaveAttribute(
      "aria-expanded",
      initiallyExpanded ? "true" : "false",
    );

    if (!initiallyExpanded) {
      await waitFor(() => {
        expect(faq.queryByText(secondItem.answer)).not.toBeInTheDocument();
      });
    }
  });

  it("switches language at runtime via the Navbar language dropdown (English -> 繁體中文 -> 日本語)", () => {
    const { container } = render(<App />);

    // Default locale is en
    expect(screen.getByText(enContent.hero.title)).toBeInTheDocument();
    expect(document.documentElement.lang).toBe("en");
    const tourSection = container.querySelector("#tour") as HTMLElement | null;
    expect(tourSection).not.toBeNull();
    expect(
      within(tourSection!).getByRole("img").getAttribute("src"),
    ).toBe("./screenshots/en/dashboard.png");

    // Open language dropdown and switch to Traditional Chinese (繁體中文)
    const header = container.querySelector("header") as HTMLElement | null;
    expect(header).not.toBeNull();
    const enTrigger = within(header!).getByRole("button", {
      name: enContent.nav.languageLabel,
    });
    fireEvent.click(enTrigger);
    expect(enTrigger).toHaveAttribute("aria-expanded", "true");

    const zhOption = within(header!).getByRole("menuitemradio", {
      name: "繁體中文",
    });
    fireEvent.click(zhOption);

    expect(screen.getByText(zhTWContent.hero.title)).toBeInTheDocument();
    expect(document.documentElement.lang).toBe("zh-TW");
    expect(
      within(tourSection!).getByRole("img").getAttribute("src"),
    ).toBe("./screenshots/zh-TW/dashboard.png");

    // Open language dropdown and switch to Japanese (日本語)
    const zhTrigger = within(header!).getByRole("button", {
      name: zhTWContent.nav.languageLabel,
    });
    fireEvent.click(zhTrigger);
    const jaOption = within(header!).getByRole("menuitemradio", {
      name: "日本語",
    });
    fireEvent.click(jaOption);

    expect(screen.getByText(jaContent.hero.title)).toBeInTheDocument();
    expect(document.documentElement.lang).toBe("ja");
    expect(
      within(tourSection!).getByRole("img").getAttribute("src"),
    ).toBe("./screenshots/ja/dashboard.png");
  });

  it("initializes locale strictly from ?lang= URL parameter and syncs window.location.search on change", () => {
    // ?lang=ja loads Japanese
    window.history.replaceState(null, "", "/?lang=ja");
    const jaRender = render(<App />);
    expect(screen.getByText(jaContent.hero.title)).toBeInTheDocument();
    expect(document.documentElement.lang).toBe("ja");
    jaRender.unmount();

    // ?lang=zh-TW loads Traditional Chinese
    window.history.replaceState(null, "", "/?lang=zh-TW#quickstart");
    const { container } = render(<App />);
    expect(screen.getByText(zhTWContent.hero.title)).toBeInTheDocument();
    expect(document.documentElement.lang).toBe("zh-TW");

    const header = container.querySelector("header") as HTMLElement | null;
    expect(header).not.toBeNull();

    // Switch to Japanese -> ?lang=ja, preserving #quickstart hash
    fireEvent.click(
      within(header!).getByRole("button", { name: zhTWContent.nav.languageLabel }),
    );
    fireEvent.click(
      within(header!).getByRole("menuitemradio", { name: "日本語" }),
    );
    expect(screen.getByText(jaContent.hero.title)).toBeInTheDocument();
    expect(window.location.search).toBe("?lang=ja");
    expect(window.location.hash).toBe("#quickstart");

    // Switch to English -> ?lang= is omitted for a clean default URL
    fireEvent.click(
      within(header!).getByRole("button", { name: jaContent.nav.languageLabel }),
    );
    fireEvent.click(
      within(header!).getByRole("menuitemradio", { name: "English" }),
    );
    expect(screen.getByText(enContent.hero.title)).toBeInTheDocument();
    expect(window.location.search).toBe("");
    expect(window.location.hash).toBe("#quickstart");
  });

  it("renders a single traveling GhostMascot across 4 dock slots and sleeps after idle timeout", () => {
    vi.useFakeTimers();
    try {
      const { container } = render(<App />);

      // Exactly 1 living GhostMascot across the entire page
      const mascots = screen.getAllByRole("img", { name: /^Ghost-Pad mascot/ });
      expect(mascots).toHaveLength(1);
      expect(mascots[0]).toHaveAttribute("aria-label", "Ghost-Pad mascot (happy)");

      // 4 reserved dock slots (hero, controls, faq, cta)
      const docks = Array.from(container.querySelectorAll("[data-ghost-dock]")).map((el) =>
        el.getAttribute("data-ghost-dock"),
      );
      expect(docks).toEqual(["hero", "controls", "faq", "cta"]);

      // Enters sleeping mode after IDLE_SLEEP_MS of inactivity
      act(() => {
        vi.advanceTimersByTime(IDLE_SLEEP_MS + 50);
      });
      expect(
        screen.getByRole("img", { name: "Ghost-Pad mascot (sleeping)" }),
      ).toBeInTheDocument();

      // Wakes up immediately on user activity
      fireEvent.keyDown(window, { key: "w", code: "KeyW" });
      expect(
        screen.getByRole("img", { name: "Ghost-Pad mascot (happy)" }),
      ).toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });
});
