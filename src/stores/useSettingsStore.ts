import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface ApiConfig {
  baseUrl: string;
  apiKey: string;
  model: string;
}

interface SettingsState {
  apiConfig: ApiConfig;
  setApiConfig: (config: Partial<ApiConfig>) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      apiConfig: {
        baseUrl: "https://api.openai.com/v1",
        apiKey: "",
        model: "gpt-3.5-turbo",
      },
      setApiConfig: (config) =>
        set((state) => ({
          apiConfig: { ...state.apiConfig, ...config },
        })),
    }),
    {
      name: "topo-settings:v1",
    }
  )
);
