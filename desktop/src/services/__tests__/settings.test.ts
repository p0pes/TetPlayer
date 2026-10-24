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

    SettingsService.updateSetting("accentTheme", "monochrome");
    expect(SettingsService.getSetting("accentTheme")).toBe("monochrome");
  });
});
