import { nextTick, type ComputedRef, type Ref } from "vue";
import type { ViewMode } from "@/lib/barcodes";

export function useBarcodeInputFocus(
  viewMode: Ref<ViewMode>,
  shouldUseCustomKeyboard: ComputedRef<boolean>,
  inputRef: Ref<HTMLInputElement | null>,
  inputKey: Ref<number>,
) {
  const focusTimers: number[] = [];

  function clearFocusTimers() {
    while (focusTimers.length) {
      const timer = focusTimers.pop();

      if (timer !== undefined) {
        window.clearTimeout(timer);
      }
    }
  }

  function focusBarcodeInput(delay = 0) {
    if (viewMode.value !== "create" || shouldUseCustomKeyboard.value) return;

    const timer = window.setTimeout(() => {
      inputRef.value?.focus({ preventScroll: true });
    }, delay);

    focusTimers.push(timer);
  }

  function reopenBarcodeKeyboard(options: { remount?: boolean } = {}) {
    if (viewMode.value !== "create" || shouldUseCustomKeyboard.value) return;

    clearFocusTimers();
    inputRef.value?.blur();

    if (options.remount) {
      inputKey.value += 1;
    }

    nextTick(() => {
      focusBarcodeInput(0);
      focusBarcodeInput(100);
      focusBarcodeInput(300);
    });
  }

  return {
    clearFocusTimers,
    focusBarcodeInput,
    inputKey,
    inputRef,
    reopenBarcodeKeyboard,
  };
}
