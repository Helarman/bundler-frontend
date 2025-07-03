"use client"

import { useTheme } from "next-themes"

export function useThemeToggle() {
  const { setTheme, theme } = useTheme()
  
  return {
    setTheme,
    theme,
  }
}