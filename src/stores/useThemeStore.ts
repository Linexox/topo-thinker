import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ThemeColor = 'indigo' | 'blue' | 'green' | 'red' | 'orange' | 'violet' | 'pink' | 'zinc';

export const themeColors: Record<ThemeColor, Record<number, string>> = {
  indigo: {
    50: '238 242 255',
    100: '224 231 255',
    200: '199 210 254',
    300: '165 180 252',
    400: '129 140 248',
    500: '99 102 241',
    600: '79 70 229',
    700: '67 56 202',
    800: '55 48 163',
    900: '49 46 129',
    950: '30 27 75',
  },
  blue: {
    50: '239 246 255',
    100: '219 234 254',
    200: '191 219 254',
    300: '147 197 253',
    400: '96 165 250',
    500: '59 130 246',
    600: '37 99 235',
    700: '29 78 216',
    800: '30 64 175',
    900: '30 58 138',
    950: '23 37 84',
  },
  green: {
    50: '240 253 244',
    100: '220 252 231',
    200: '187 247 208',
    300: '134 239 172',
    400: '74 222 128',
    500: '34 197 94',
    600: '22 163 74',
    700: '21 128 61',
    800: '22 101 52',
    900: '20 83 45',
    950: '5 46 22',
  },
  red: {
    50: '254 242 242',
    100: '254 226 226',
    200: '254 202 202',
    300: '252 165 165',
    400: '248 113 113',
    500: '239 68 68',
    600: '220 38 38',
    700: '185 28 28',
    800: '153 27 27',
    900: '127 29 29',
    950: '69 10 10',
  },
  orange: {
    50: '255 247 237',
    100: '255 237 213',
    200: '254 215 170',
    300: '253 186 116',
    400: '251 146 60',
    500: '249 115 22',
    600: '234 88 12',
    700: '194 65 12',
    800: '154 52 18',
    900: '124 45 18',
    950: '67 20 7',
  },
  violet: {
    50: '245 243 255',
    100: '237 233 254',
    200: '221 214 254',
    300: '196 181 253',
    400: '167 139 250',
    500: '139 92 246',
    600: '124 58 237',
    700: '109 40 217',
    800: '91 33 182',
    900: '76 29 149',
    950: '46 16 101',
  },
  pink: {
    50: '253 242 248',
    100: '252 231 243',
    200: '251 204 231',
    300: '249 168 212',
    400: '244 114 182',
    500: '236 72 153',
    600: '219 39 119',
    700: '190 24 93',
    800: '157 23 77',
    900: '131 24 67',
    950: '80 7 36',
  },
  zinc: {
    50: '250 250 250',
    100: '244 244 245',
    200: '228 228 231',
    300: '212 212 216',
    400: '161 161 170',
    500: '113 113 122',
    600: '82 82 91',
    700: '63 63 70',
    800: '39 39 42',
    900: '24 24 27',
    950: '9 9 11',
  },
};

interface ThemeState {
  themeColor: ThemeColor;
  setThemeColor: (color: ThemeColor) => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      themeColor: 'indigo',
      setThemeColor: (color) => {
        set({ themeColor: color });
        updateThemeVariables(color);
      },
    }),
    {
      name: 'theme-storage',
      onRehydrateStorage: () => (state) => {
        if (state) {
          updateThemeVariables(state.themeColor);
        }
      },
    }
  )
);

export function updateThemeVariables(color: ThemeColor) {
  const root = document.documentElement;
  const palette = themeColors[color];
  
  if (palette) {
    Object.entries(palette).forEach(([shade, value]) => {
      root.style.setProperty(`--color-primary-${shade}`, value);
    });
  }
}
