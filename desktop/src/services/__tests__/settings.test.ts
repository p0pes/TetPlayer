import { describe, it, expect, beforeEach, vi } from "vitest";
import { SettingsService, DEFAULT_SETTINGS } from "../settings";

describe("SettingsService", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("retorna as configurações padrão quando nada foi salvo", () => {
    const settings = SettingsService.getSettings();
    expect(settings.crossfadeSeconds).toBe(DEFAULT_SETTINGS.crossfadeSeconds);
    expect(settings.isAutoplayRadio).toBe(DEFAULT_SETTINGS.isAutoplayRadio);
    expect(settings.closeAction).toBe(DEFAULT_SETTINGS.closeAction);
  });

  it("atualiza e persiste uma configuração individual", () => {
    SettingsService.updateSetting("crossfadeSeconds", 7);
    expect(SettingsService.getSetting("crossfadeSeconds")).toBe(7);
    expect(localStorage.getItem("tetplayer_crossfade")).toBe("7");

    SettingsService.updateSetting("closeAction", "exit");
    expect(SettingsService.getSetting("closeAction")).toBe("exit");
  });

  it("notifica assinantes através do método subscribe", () => {
    const listener = vi.fn();
    const unsubscribe = SettingsService.subscribe(listener);

    SettingsService.updateSetting("auroraGlowIntensity", 40);
    expect(listener).toHaveBeenCalledWith(
      expect.objectContaining({ auroraGlowIntensity: 40 }),
      "auroraGlowIntensity"
    );

    unsubscribe();
    SettingsService.updateSetting("auroraGlowIntensity", 90);
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("restaura as configurações padrão com resetSettings", () => {
    SettingsService.updateSetting("crossfadeSeconds", 10);
    SettingsService.updateSetting("motionCoverEnabled", false);
    SettingsService.updateSetting("accentTheme", "emerald");

    const reset = SettingsService.resetSettings();
    expect(reset.crossfadeSeconds).toBe(DEFAULT_SETTINGS.crossfadeSeconds);
    expect(reset.motionCoverEnabled).toBe(DEFAULT_SETTINGS.motionCoverEnabled);
    expect(reset.accentTheme).toBe("ruby");
  });

  it("permite selecionar e persistir temas de acento (Item 3.2)", () => {
    expect(SettingsService.getSetting("accentTheme")).toBe("ruby");

    SettingsService.updateSetting("accentTheme", "indigo");
    expect(SettingsService.getSetting("accentTheme")).toBe("indigo");

    SettingsService.updateSetting("accentTheme", "lime");
    expect(SettingsService.getSetting("accentTheme")).toBe("lime");

    SettingsService.updateSetting("accentTheme", "chameleon");
    expect(SettingsService.getSetting("accentTheme")).toBe("chameleon");
  });

  it("aplica tokens dinâmicos para o tema camaleão (Item 2.1)", () => {
    SettingsService.updateSetting("accentTheme", "chameleon");
    const customTokens = {
      primary: "#06b6d4",
      hover: "#0891b2",
      active: "#0e7490",
      text: "#67e8f9",
      subtle: "rgba(6, 182, 212, 0.18)",
      border: "rgba(6, 182, 212, 0.45)",
      glow: "rgba(6, 182, 212, 0.85)",
      gradientFrom: "#06b6d4",
      gradientVia: "#3b82f6",
      gradientTo: "#8b5cf6",
    };

    SettingsService.applyChameleonTokens(customTokens);
    expect(SettingsService.getActiveChameleonTokens()).toEqual(customTokens);
  });
});
