import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { Sidebar } from "../components/Sidebar";
import { GamepadVisualizer } from "../components/GamepadVisualizer";
import { CompactWidget } from "../components/CompactWidget";
import { Navbar } from "../components/Navbar";
import { GamepadManagerCard } from "../components/GamepadManagerCard";
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

    it("triggers onToggleVirtualController when Ghost-Pad switch is clicked", () => {
      const onToggleVirtualController = vi.fn();
      render(
        <Sidebar
          activeTab="dashboard"
          onTabChange={vi.fn()}
          gamepads={mockGamepads}
          isMuted={false}
          onRefreshGamepads={vi.fn()}
          onSelectGamepad={vi.fn()}
          onToggleMute={vi.fn()}
          esp32Connected={false}
          isStep0Ready={true}
          onToggleVirtualController={onToggleVirtualController}
        />
      );

      const switchBtn = screen.getByRole("switch");
      fireEvent.click(switchBtn);
      expect(onToggleVirtualController).toHaveBeenCalled();
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

    it("displays empty state helper hint when no external gamepads connected", () => {
      render(
        <Sidebar
          activeTab="dashboard"
          onTabChange={vi.fn()}
          gamepads={[]}
          isMuted={false}
          onRefreshGamepads={vi.fn()}
          onSelectGamepad={vi.fn()}
          onToggleMute={vi.fn()}
          esp32Connected={false}
        />
      );

      expect(screen.getByText("未連線外接手把 (選用)")).toBeInTheDocument();
      expect(screen.getByText(/電腦鍵盤與畫面按鈕亦可直接操作/i)).toBeInTheDocument();
    });

    it("opens official gamepad pairing modal overlay when clicking question mark and closes with button", () => {
      render(
        <Sidebar
          activeTab="dashboard"
          onTabChange={vi.fn()}
          gamepads={mockGamepads}
          isMuted={false}
          onRefreshGamepads={vi.fn()}
          onSelectGamepad={vi.fn()}
          onToggleMute={vi.fn()}
          esp32Connected={false}
        />
      );

      const guideTrigger = screen.getByTitle("官方手把配對說明 (Pro / Joy-Con)");
      expect(screen.queryByText("官方手把藍牙配對指引")).not.toBeInTheDocument();

      // Click to open modal
      fireEvent.click(guideTrigger);
      expect(screen.getByText("官方手把藍牙配對指引")).toBeInTheDocument();
      expect(screen.getByText("Switch Pro 控制器")).toBeInTheDocument();
      expect(screen.getByText("Joy-Con (L / R)")).toBeInTheDocument();
      expect(screen.getByText(/外接手把非必須/i)).toBeInTheDocument();

      // Close via '我知道了' button
      const confirmCloseBtn = screen.getByText("我知道了");
      fireEvent.click(confirmCloseBtn);
      expect(screen.queryByText("官方手把藍牙配對指引")).not.toBeInTheDocument();
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
      expect(screen.getByText("鍵盤對照表")).toBeInTheDocument();
      expect(screen.getByText("側錄巨集")).toBeInTheDocument();
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

    it("keeps ghost sleeping with translucent background when bluetooth gamepad connects but ESP32 is not started", () => {
      const { container } = render(
        <GamepadVisualizer
          state={DEFAULT_CONTROLLER_STATE}
          gamepadName="8BitDo Micro"
          isMuted={false}
          esp32Connected={false}
        />
      );

      // Bluetooth gamepad is connected and unmuted, but ESP32 is false -> ghost stays sleeping
      const ghostSilhouette = container.querySelector('path[fill="url(#cuteGhostGradTranslucent)"]');
      expect(ghostSilhouette).toBeInTheDocument();

      // Sleeping indicator 'Z' is present
      expect(screen.getByText("Z")).toBeInTheDocument();
    });

    it("wakes ghost up with white background and triggers onToggleEsp32 when ESP32 starts", () => {
      const onToggleEsp32 = vi.fn();
      const { container } = render(
        <GamepadVisualizer
          state={DEFAULT_CONTROLLER_STATE}
          gamepadName="8BitDo Micro"
          isMuted={false}
          esp32Connected={true}
          onToggleEsp32={onToggleEsp32}
        />
      );

      // ESP32 is connected -> Ghost turns into white background
      const ghostSilhouette = container.querySelector('path[fill="url(#cuteGhostGradWhite)"]');
      expect(ghostSilhouette).toBeInTheDocument();

      // Sleeping 'Z' is gone
      expect(screen.queryByText("Z")).not.toBeInTheDocument();

      // Clicking center GHOST-PAD badge triggers onToggleEsp32
      const ghostPadBadge = screen.getByText("GHOST-PAD");
      fireEvent.click(ghostPadBadge);
      expect(onToggleEsp32).toHaveBeenCalled();
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

  describe("Navbar", () => {
    it("renders brand title and tabs, triggering onTabChange on tab clicks", () => {
      const onTabChange = vi.fn();
      render(
        <Navbar
          activeTab="dashboard"
          onTabChange={onTabChange}
          gamepadConnected={true}
          esp32Connected={false}
        />
      );

      expect(screen.getByText("Ghost-Pad")).toBeInTheDocument();
      expect(screen.getByText("Controller Bridge")).toBeInTheDocument();

      const macroTab = screen.getByText("巨集腳本");
      fireEvent.click(macroTab);
      expect(onTabChange).toHaveBeenCalledWith("macro");

      const hardwareTab = screen.getByText("ESP32 裝置");
      fireEvent.click(hardwareTab);
      expect(onTabChange).toHaveBeenCalledWith("hardware");
    });

    it("displays correct connection status chips for gamepad and esp32", () => {
      const { rerender } = render(
        <Navbar
          activeTab="dashboard"
          onTabChange={vi.fn()}
          gamepadConnected={true}
          esp32Connected={true}
        />
      );

      // Both are connected
      const connectedChips = screen.getAllByText("已連線");
      expect(connectedChips.length).toBe(2);

      // Rerender with both disconnected
      rerender(
        <Navbar
          activeTab="dashboard"
          onTabChange={vi.fn()}
          gamepadConnected={false}
          esp32Connected={false}
        />
      );

      const disconnectedChips = screen.getAllByText("未連線");
      expect(disconnectedChips.length).toBe(2);
    });
  });

  describe("GamepadManagerCard", () => {
    const mockGamepads: GamepadInfo[] = [
      { id: 0, name: "8BitDo Micro", is_connected: true, is_active: true },
      { id: 1, name: "Joy-Con (R)", is_connected: true, is_active: false },
    ];

    it("renders connected devices count and list", () => {
      const onSelectGamepad = vi.fn();
      const onRefresh = vi.fn();
      const onToggleMute = vi.fn();

      render(
        <GamepadManagerCard
          gamepads={mockGamepads}
          isMuted={false}
          onRefresh={onRefresh}
          onSelectGamepad={onSelectGamepad}
          onToggleMute={onToggleMute}
        />
      );

      expect(screen.getByText("控制器設定")).toBeInTheDocument();
      expect(screen.getByText("2")).toBeInTheDocument(); // 2 connected devices
      expect(screen.getByText("8BitDo Micro")).toBeInTheDocument();
      expect(screen.getByText("Joy-Con (R)")).toBeInTheDocument();

      // Click device to select
      fireEvent.click(screen.getByText("Joy-Con (R)"));
      expect(onSelectGamepad).toHaveBeenCalledWith(1);

      // Click refresh button
      const refreshBtn = screen.getByTitle("重新掃描");
      fireEvent.click(refreshBtn);
      expect(onRefresh).toHaveBeenCalled();

      // Click mute button
      const muteBtn = screen.getByText("輸入啟用");
      fireEvent.click(muteBtn);
      expect(onToggleMute).toHaveBeenCalled();
    });

    it("renders empty state when no gamepads connected", () => {
      render(
        <GamepadManagerCard
          gamepads={[]}
          isMuted={true}
          onRefresh={vi.fn()}
          onSelectGamepad={vi.fn()}
          onToggleMute={vi.fn()}
        />
      );

      expect(screen.getByText("尚未偵測到手把")).toBeInTheDocument();
      expect(screen.getByText("請先於 Mac 藍牙設定完成配對")).toBeInTheDocument();
      expect(screen.getByText("已暫停")).toBeInTheDocument();
    });

    it("toggles 8BitDo Micro pairing guide when help button is clicked", () => {
      render(
        <GamepadManagerCard
          gamepads={mockGamepads}
          isMuted={false}
          onRefresh={vi.fn()}
          onSelectGamepad={vi.fn()}
          onToggleMute={vi.fn()}
        />
      );

      const guideBtn = screen.getByTitle("8BitDo Micro 配對說明");
      expect(screen.queryByText(/8BitDo Micro 配對步驟/i)).not.toBeInTheDocument();

      fireEvent.click(guideBtn);
      expect(screen.getByText(/8BitDo Micro 配對步驟/i)).toBeInTheDocument();

      // Toggle off
      fireEvent.click(guideBtn);
      expect(screen.queryByText(/8BitDo Micro 配對步驟/i)).not.toBeInTheDocument();
    });
  });
});

