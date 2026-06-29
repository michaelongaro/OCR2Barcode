import { ref, watchEffect } from "vue";

export function useTheme() {
  const theme = ref(localStorage.getItem("bcgTheme") || "light");

  watchEffect(() => {
    document.documentElement.setAttribute("data-theme", theme.value);
    localStorage.setItem("bcgTheme", theme.value);
  });

  const toggleTheme = () => {
    theme.value = theme.value === "light" ? "dark" : "light";
  };

  return { theme, toggleTheme };
}
