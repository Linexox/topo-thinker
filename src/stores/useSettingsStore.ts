import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface ApiConfig {
  baseUrl: string;
  apiKey: string;
  model: string;
}

export interface UiConfig {
  fontSize: number;
  lineHeight: number;
  fontFamily: string;
  layoutMode: 'top' | 'side' | 'zen';
}

interface SettingsState {
  apiConfig: ApiConfig;
  uiConfig: UiConfig;
  customFonts: string[];
  setApiConfig: (config: Partial<ApiConfig>) => void;
  setUiConfig: (config: Partial<UiConfig>) => void;
  addCustomFont: (name: string) => void;
  removeCustomFont: (name: string) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      apiConfig: {
        baseUrl: "https://api.openai.com/v1",
        apiKey: "",
        model: "gpt-3.5-turbo",
      },
      uiConfig: {
        fontSize: 14,
        lineHeight: 1.6,
        fontFamily: "sans-serif",
        layoutMode: 'top',
      },
      customFonts: [],
      setApiConfig: (config) =>
        set((state) => ({
          apiConfig: { ...state.apiConfig, ...config },
        })),
      setUiConfig: (config) =>
        set((state) => ({
          uiConfig: { ...state.uiConfig, ...config },
        })),
      addCustomFont: (name) =>
        set((state) => ({
          customFonts: state.customFonts.includes(name)
            ? state.customFonts
            : [...state.customFonts, name],
        })),
      removeCustomFont: (name) =>
        set((state) => ({
          customFonts: state.customFonts.filter((f) => f !== name),
          uiConfig:
            state.uiConfig.fontFamily === name || state.uiConfig.fontFamily === `'${name}'`
              ? { ...state.uiConfig, fontFamily: "sans-serif" }
              : state.uiConfig,
        })),
    }),
    {
      name: "topo-settings:v1",
    }
  )
);
