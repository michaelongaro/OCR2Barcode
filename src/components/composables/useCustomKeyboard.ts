import { computed, ref, type Ref } from "vue";
import {
  DPCI_KEYBOARD_ROWS,
  LOCATION_LETTER_ROWS,
  LOCATION_NUMBER_ROWS,
  formatInput,
  getRawInputValue,
  type CustomKeyboardMode,
  type InputType,
  type ViewMode,
} from "@/lib/barcodes";

export function useCustomKeyboard(
  inputType: Ref<InputType>,
  viewMode: Ref<ViewMode>,
  inputValue: Ref<string>,
) {
  const isTouchOnly = ref(false);
  const isCustomKeyboardOpen = ref(false);
  const customKeyboardMode = ref<CustomKeyboardMode>("letters");

  let touchOnlyMediaQuery: MediaQueryList | null = null;

  const shouldUseCustomKeyboard = computed(() => isTouchOnly.value);

  const keyboardVisible = computed(() => {
    return (
      shouldUseCustomKeyboard.value &&
      isCustomKeyboardOpen.value &&
      viewMode.value === "create"
    );
  });

  const activeKeyboardRows = computed(() => {
    if (inputType.value === "dpci") {
      return DPCI_KEYBOARD_ROWS;
    }

    return customKeyboardMode.value === "letters"
      ? LOCATION_LETTER_ROWS
      : LOCATION_NUMBER_ROWS;
  });

  function updateTouchOnlyStatus(event?: MediaQueryListEvent) {
    isTouchOnly.value = event?.matches ?? touchOnlyMediaQuery?.matches ?? false;

    if (!isTouchOnly.value) {
      isCustomKeyboardOpen.value = false;
    }
  }

  function openCustomKeyboard() {
    if (!shouldUseCustomKeyboard.value || viewMode.value !== "create") return;

    isCustomKeyboardOpen.value = true;
  }

  function closeCustomKeyboard() {
    isCustomKeyboardOpen.value = false;
  }

  function resetCustomKeyboardMode() {
    customKeyboardMode.value = "letters";
  }

  function handleInputPointerDown(event: PointerEvent) {
    if (!shouldUseCustomKeyboard.value) return;

    event.preventDefault();
    openCustomKeyboard();
  }

  function handleInputClick(event: MouseEvent) {
    if (!shouldUseCustomKeyboard.value) return;

    event.preventDefault();
    openCustomKeyboard();
  }

  function handleInputFocus(event: FocusEvent) {
    if (!shouldUseCustomKeyboard.value) return;

    openCustomKeyboard();

    const target = event.target as HTMLInputElement | null;
    target?.blur();
  }

  function pressCustomKey(key: string) {
    if (key === "ABC") {
      customKeyboardMode.value = "letters";
      return;
    }

    if (key === "123") {
      customKeyboardMode.value = "numbers";
      return;
    }

    if (key === "⌫") {
      inputValue.value = formatInput(
        getRawInputValue(inputValue.value).slice(0, -1),
        inputType.value,
      );
      return;
    }

    const isAllowedKey =
      inputType.value === "dpci" ? /^\d$/.test(key) : /^[A-Z0-9]$/.test(key);

    if (!isAllowedKey) return;

    inputValue.value = formatInput(
      `${getRawInputValue(inputValue.value)}${key}`,
      inputType.value,
    );
  }

  function setupTouchOnlyDetection() {
    touchOnlyMediaQuery = window.matchMedia(
      "(hover: none) and (pointer: coarse)",
    );
    updateTouchOnlyStatus();

    if (touchOnlyMediaQuery.addEventListener) {
      touchOnlyMediaQuery.addEventListener("change", updateTouchOnlyStatus);
    } else {
      touchOnlyMediaQuery.addListener(updateTouchOnlyStatus);
    }
  }

  function cleanupTouchOnlyDetection() {
    if (!touchOnlyMediaQuery) {
      return;
    }

    if (touchOnlyMediaQuery.removeEventListener) {
      touchOnlyMediaQuery.removeEventListener("change", updateTouchOnlyStatus);
    } else {
      touchOnlyMediaQuery.removeListener(updateTouchOnlyStatus);
    }
  }

  return {
    activeKeyboardRows,
    cleanupTouchOnlyDetection,
    closeCustomKeyboard,
    handleInputClick,
    handleInputFocus,
    handleInputPointerDown,
    keyboardVisible,
    openCustomKeyboard,
    pressCustomKey,
    resetCustomKeyboardMode,
    setupTouchOnlyDetection,
    shouldUseCustomKeyboard,
  };
}
