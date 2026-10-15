import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { Sidebar } from "../components/Sidebar";
import { GamepadVisualizer } from "../components/GamepadVisualizer";
import { CompactWidget } from "../components/CompactWidget";
import { DEFAULT_CONTROLLER_STATE, GamepadInfo } from "../types";

describe("UI Components", () => {
  describe("Sidebar", () => {
    const mockGamepads: GamepadInfo[] = [
      { id: 0, name: "8BitDo Micro", is_connected: true, is_active: true },
      { id: 1, name: "Switch Pro Controller", is_connected: false, is_active: false },
    ];

    it("renders navigation buttons and triggers onTabChange", () => {
      const onTabChange = vi.fn();
      render(
        <Sidebar
          activeTab="dashboard"
          onTabChange={onTabChange}
          gamepads={mockGamepads}
          isMuted={false}
          onRefreshGamepads={vi.fn()}
          onSelectGamepad={vi.fn()}
          onToggleMute={vi.fn()}
          esp32Connected={true}
        />
      );

      expect(screen.getByText("即時儀表板")).toBeInTheDocument();
      expect(screen.getByText("ESP32 與韌體")).toBeInTheDocument();
      expect(screen.getByText("巨集腳本庫")).toBeInTheDocument();

      fireEvent.click(screen.getByText("ESP32 與韌體"));
      expect(onTabChange).toHaveBeenCalledWith("hardware");
    });

    it("displays connected gamepad list and status", () => {
      const onSelectGamepad = vi.fn();
      render(
        <Sidebar
          activeTab="dashboard"
          onTabChange={vi.fn()}
          gamepads={mockGamepads}
          isMuted={false}
          onRefreshGamepads={vi.fn()}
          onSelectGamepad={onSelectGamepad}
          onToggleMute={vi.fn()}
          esp32Connected={true}
        />
      );

      expect(screen.getByText("8BitDo Micro")).toBeInTheDocument();
      expect(screen.getByText("Switch Pro Controller")).toBeInTheDocument();
      expect(screen.getByText("主控")).toBeInTheDocument();

      fireEvent.click(screen.getByText("8BitDo Micro"));
      expect(onSelectGamepad).toHaveBeenCalledWith(0);
    });

    it("triggers onToggleMute when mute button is clicked", () => {
      const onToggleMute = vi.fn();
      render(
        <Sidebar
          activeTab="dashboard"
          onTabChange={vi.fn()}
          gamepads={mockGamepads}
          isMuted={false}
          onRefreshGamepads={vi.fn()}
          onSelectGamepad={vi.fn()}
          onToggleMute={onToggleMute}
          esp32Connected={false}
        />
      );

      const muteBtn = screen.getByText("輸入啟用");
      fireEvent.click(muteBtn);
      expect(onToggleMute).toHaveBeenCalled();
    });

    it("triggers onRefreshGamepads when refresh button is clicked", () => {
      const onRefreshGamepads = vi.fn();
      render(
        <Sidebar
          activeTab="dashboard"
          onTabChange={vi.fn()}
          gamepads={mockGamepads}
          isMuted={false}
          onRefreshGamepads={onRefreshGamepads}
          onSelectGamepad={vi.fn()}
          onToggleMute={vi.fn()}
          esp32Connected={false}
        />
      );

      const refreshBtn = screen.getByTitle("重新掃描設備");
      fireEvent.click(refreshBtn);
      expect(onRefreshGamepads).toHaveBeenCalled();
    });
  });

  describe("GamepadVisualizer", () => {
    it("renders the visualizer with controller status and active buttons", () => {
      const state = {
        ...DEFAULT_CONTROLLER_STATE,
        a: true,
        b: false,
      };

      render(
        <GamepadVisualizer
          state={state}
          gamepadName="Test Gamepad"
          isMuted={false}
          fps={60}
        />
      );

      expect(screen.getByText("Test Gamepad")).toBeInTheDocument();
      expect(screen.getByText(/60\s*Hz/i)).toBeInTheDocument();
    });

    it("toggles keyboard mapping guide modal", () => {
      render(
        <GamepadVisualizer
          state={DEFAULT_CONTROLLER_STATE}
          gamepadName="Controller"
        />
      );

      const guideBtn = screen.getByText("鍵盤對照表");
      fireEvent.click(guideBtn);
      expect(screen.getByText(/電腦鍵盤操作對照表/i)).toBeInTheDocument();

      // Click outside / toggle again
      fireEvent.click(guideBtn);
      expect(screen.queryByText(/電腦鍵盤操作對照表/i)).not.toBeInTheDocument();
    });
  });

  describe("CompactWidget", () => {
    it("renders compact widget and reacts to mute button", () => {
      const onToggleMute = vi.fn();
      render(
        <CompactWidget
          state={DEFAULT_CONTROLLER_STATE}
          gamepads={[]}
          isMuted={false}
          onToggleMute={onToggleMute}
          fps={100}
        />
      );

      expect(screen.getByText(/100\s*Hz/i)).toBeInTheDocument();
      const muteBtn = screen.getByText("已啟用");
      fireEvent.click(muteBtn);
      expect(onToggleMute).toHaveBeenCalled();
    });
  });
});
