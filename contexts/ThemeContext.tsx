import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useColorScheme } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { MD3DarkTheme, MD3LightTheme, PaperProvider } from "react-native-paper";

const THEME_KEY = "@thumbs_theme_mode";
const FONT_SIZE_KEY = "@thumbs_font_size";

export type ThemeMode = "light" | "dark" | "system";
export type FontSize = "small" | "medium" | "large" | "xlarge";

const FONT_SIZE_MAP: Record<FontSize, number> = {
  small: 18,
  medium: 22,
  large: 28,
  xlarge: 34,
};

interface ThemeContextType {
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
  isDark: boolean;
  fontSize: FontSize;
  setFontSize: (size: FontSize) => void;
  fontSizeValue: number;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const systemColorScheme = useColorScheme();
  const [themeMode, setThemeModeState] = useState<ThemeMode>("system");
  const [fontSize, setFontSizeState] = useState<FontSize>("medium");

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const [savedTheme, savedFontSize] = await Promise.all([
        AsyncStorage.getItem(THEME_KEY),
        AsyncStorage.getItem(FONT_SIZE_KEY),
      ]);

      if (savedTheme === "light" || savedTheme === "dark" || savedTheme === "system") {
        setThemeModeState(savedTheme);
      }

      if (
        savedFontSize === "small" ||
        savedFontSize === "medium" ||
        savedFontSize === "large" ||
        savedFontSize === "xlarge"
      ) {
        setFontSizeState(savedFontSize);
      }
    } catch (error) {
      console.error("Failed to load theme settings:", error);
    }
  };

  const setThemeMode = async (mode: ThemeMode) => {
    try {
      await AsyncStorage.setItem(THEME_KEY, mode);
      setThemeModeState(mode);
    } catch (error) {
      console.error("Failed to save theme mode:", error);
    }
  };

  const setFontSize = async (size: FontSize) => {
    try {
      await AsyncStorage.setItem(FONT_SIZE_KEY, size);
      setFontSizeState(size);
    } catch (error) {
      console.error("Failed to save font size:", error);
    }
  };

  const isDark =
    themeMode === "dark" ||
    (themeMode === "system" && systemColorScheme === "dark");

  const theme = isDark ? MD3DarkTheme : MD3LightTheme;
  const fontSizeValue = FONT_SIZE_MAP[fontSize];

  return (
    <ThemeContext.Provider
      value={{
        themeMode,
        setThemeMode,
        isDark,
        fontSize,
        setFontSize,
        fontSizeValue,
      }}
    >
      <PaperProvider theme={theme}>{children}</PaperProvider>
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};
