/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        window: {
          base: "var(--window-base)",
          titlebar: "var(--window-titlebar)",
        },
        surface: {
          sidebar: "var(--surface-sidebar)",
          card: "var(--surface-card)",
          modal: "var(--surface-modal)",
          input: "var(--surface-input)",
        },
        border: {
          subtle: "var(--border-subtle)",
          element: "var(--border-element)",
          focus: "var(--border-focus)",
        },
        text: {
          primary: "var(--text-primary)",
          secondary: "var(--text-secondary)",
          muted: "var(--text-muted)",
          disabled: "var(--text-disabled)",
        },
        interactive: {
          hover: "var(--interactive-hover)",
          active: "var(--interactive-active)",
          selected: "var(--interactive-selected)",
        },
        accent: {
          DEFAULT: "var(--accent-primary)",
          primary: "var(--accent-primary)",
          hover: "var(--accent-hover)",
          foreground: "var(--accent-foreground)",
        },
        feedback: {
          success: {
            bg: "var(--feedback-success-bg)",
            text: "var(--feedback-success-text)",
            border: "var(--feedback-success-border)",
          },
          warning: {
            bg: "var(--feedback-warning-bg)",
            text: "var(--feedback-warning-text)",
            border: "var(--feedback-warning-border)",
          },
          error: {
            bg: "var(--feedback-error-bg)",
            text: "var(--feedback-error-text)",
            border: "var(--feedback-error-border)",
          },
        },
      },
    },
  },
  plugins: [],
};
