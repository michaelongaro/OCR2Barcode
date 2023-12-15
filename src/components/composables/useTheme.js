import { ref, watchEffect } from "vue";

export function useTheme() {
  const theme = ref(localStorage.getItem("ocrBarcodeTheme") || "light");

  watchEffect(() => {
    document.documentElement.setAttribute("data-theme", theme.value);
    localStorage.setItem("ocrBarcodeTheme", theme.value);
  });

  const toggleTheme = () => {
    theme.value = theme.value === "light" ? "dark" : "light";
  };

  return { theme, toggleTheme };
}
