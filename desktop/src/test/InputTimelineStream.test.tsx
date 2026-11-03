import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import {
  InputTimelineStream,
  getStickDirection,
  LANES,
  DURATION_OPTIONS,
} from "../components/InputTimelineStream";
import { DEFAULT_CONTROLLER_STATE } from "../types";

describe("InputTimelineStream and Stick Math", () => {
  describe("getStickDirection", () => {
    it("returns null within stick deadzone", () => {
      expect(getStickDirection(128, 128, "L")).toBeNull();
      expect(getStickDirection(135, 128, "L")).toBeNull();
      expect(getStickDirection(120, 130, "L")).toBeNull();
    });

    it("detects cardinal directions correctly", () => {
      // Right (x = 255, y = 128)
      expect(getStickDirection(255, 128, "L")).toBe("L▶");
      // Up (x = 128, y = 255)
      expect(getStickDirection(128, 255, "L")).toBe("L▲");
      // Left (x = 0, y = 128)
      expect(getStickDirection(0, 128, "L")).toBe("L◀");
      // Down (x = 128, y = 0)
      expect(getStickDirection(128, 0, "L")).toBe("L▼");
    });

    it("detects diagonal directions correctly", () => {
      // Up-Right (x = 220, y = 220)
      expect(getStickDirection(220, 220, "L")).toBe("L↗");
      // Up-Left (x = 30, y = 220)
      expect(getStickDirection(30, 220, "L")).toBe("L↖");
      // Down-Left (x = 30, y = 30)
      expect(getStickDirection(30, 30, "L")).toBe("L↙");
      // Down-Right (x = 220, y = 30)
      expect(getStickDirection(220, 30, "L")).toBe("L↘");
    });

    it("supports R prefix for right stick", () => {
      expect(getStickDirection(255, 128, "R")).toBe("R▶");
    });
  });

  describe("Constants", () => {
    it("has 5 distinct track lanes", () => {
      expect(LANES).toHaveLength(5);
      expect(LANES.map((l) => l.name)).toEqual([
        "ABXY",
        "十字鍵",
        "搖桿",
        "肩鍵",
        "系統",
      ]);
    });

    it("has expected duration options", () => {
      expect(DURATION_OPTIONS).toEqual([10, 15, 30, 60]);
    });
  });

  describe("Component Rendering", () => {
    it("renders the timeline stream header and controls", () => {
      render(<InputTimelineStream state={DEFAULT_CONTROLLER_STATE} />);

      expect(screen.getByText("即時操作時序流 (Live Stream)")).toBeInTheDocument();
      expect(screen.getByText(/操作次數:/i)).toBeInTheDocument();
      expect(screen.getByText(/總長度 30s/i)).toBeInTheDocument();
    });

    it("cycles duration when duration toggle button is clicked", () => {
      render(<InputTimelineStream state={DEFAULT_CONTROLLER_STATE} />);

      const durationBtn = screen.getByTitle("點擊切換時間軸總長度 (10s / 15s / 30s / 60s)");
      expect(durationBtn).toHaveTextContent("總長度 30s");

      // Clicking once switches 30s -> 60s
      fireEvent.click(durationBtn);
      expect(durationBtn).toHaveTextContent("總長度 60s");

      // Clicking again switches 60s -> 10s
      fireEvent.click(durationBtn);
      expect(durationBtn).toHaveTextContent("總長度 10s");
    });

    it("clears operations when reset button is clicked", () => {
      render(<InputTimelineStream state={DEFAULT_CONTROLLER_STATE} />);

      const clearBtn = screen.getByTitle("清空歷史紀錄");
      expect(clearBtn).toBeInTheDocument();
      fireEvent.click(clearBtn);
    });
  });
});
