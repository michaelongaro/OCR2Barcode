<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from "vue";
import { useBarcodeInputFocus } from "@/components/composables/useBarcodeInputFocus";
import { useBodyScrollLock } from "@/components/composables/useBodyScrollLock";
import { useCustomKeyboard } from "@/components/composables/useCustomKeyboard";
import { useTheme } from "@/components/composables/useTheme";
import { Button } from "@/components/ui/button";
import {
  createStoredBarcode,
  formatInput,
  getRawInputValue,
  isValidInputValue,
  loadStoredBarcodes,
  renderBarcodeToCanvas,
  saveStoredBarcodes,
  type InputType,
  type StoredBarcode,
  type ViewMode,
} from "@/lib/barcodes";

const inputType = ref<InputType>("dpci");
const inputValue = ref("");
const viewMode = ref<ViewMode>("create");
const inputRef = ref<HTMLInputElement | null>(null);
const inputKey = ref(0);
const barcodes = ref<StoredBarcode[]>([]);
const pendingLocation = ref<string | null>(null);

const { theme, toggleTheme } = useTheme();

const { lockBodyScroll, unlockBodyScroll } = useBodyScrollLock();

const {
  activeKeyboardRows,
  cleanupTouchOnlyDetection,
  closeCustomKeyboard,
  handleInputClick,
  handleInputFocus,
  handleInputPointerDown,
  keyboardVisible,
  pressCustomKey,
  resetCustomKeyboardMode,
  setupTouchOnlyDetection,
  shouldUseCustomKeyboard,
} = useCustomKeyboard(inputType, viewMode, inputValue);

const { clearFocusTimers, focusBarcodeInput, reopenBarcodeKeyboard } =
  useBarcodeInputFocus(viewMode, shouldUseCustomKeyboard, inputRef, inputKey);

const rawInputValue = computed(() => getRawInputValue(inputValue.value));

const isValidInput = computed(() => {
  return isValidInputValue(inputValue.value, inputType.value);
});

const newestBarcode = computed(() => {
  return barcodes.value[0] ?? null;
});

function handleInput(event: Event) {
  const target = event.target as HTMLInputElement;
  const formatted = formatInput(target.value, inputType.value);

  inputValue.value = formatted;
  target.value = formatted;
}

function setInputType(type: InputType) {
  inputType.value = type;
}

function saveBarcodes() {
  saveStoredBarcodes(barcodes.value);
}

function loadBarcodes() {
  barcodes.value = loadStoredBarcodes();
}

function generateCanvasBarcode(
  canvas: HTMLCanvasElement,
  barcode: StoredBarcode,
) {
  renderBarcodeToCanvas(canvas, barcode);
}

function handleMainBackgroundClick(event: MouseEvent) {
  if (!keyboardVisible.value) return;

  if (event.target !== event.currentTarget) return;

  closeCustomKeyboard();
}

async function renderNewestBarcode() {
  await nextTick();

  if (!newestBarcode.value) return;

  const canvas = document.getElementById(
    `barcode-${newestBarcode.value.id}`,
  ) as HTMLCanvasElement | null;

  if (canvas) {
    generateCanvasBarcode(canvas, newestBarcode.value);
  }
}

async function renderRecentBarcodes() {
  await nextTick();

  for (const barcode of barcodes.value) {
    const canvas = document.getElementById(
      `barcode-${barcode.id}`,
    ) as HTMLCanvasElement | null;

    if (canvas) {
      generateCanvasBarcode(canvas, barcode);
    }
  }
}

async function generateBarcode() {
  if (!isValidInput.value) return;

  closeCustomKeyboard();

  const type = inputType.value;
  const data = rawInputValue.value;

  const barcode = createStoredBarcode(type, data, pendingLocation.value);

  barcodes.value = [barcode, ...barcodes.value];
  saveBarcodes();

  if (type === "location") {
    pendingLocation.value = data;
  } else {
    pendingLocation.value = null;
  }

  inputValue.value = "";

  await renderNewestBarcode();
}

function handleVisibilityChange() {
  if (document.visibilityState === "visible") {
    focusBarcodeInput();
  }
}

function handleWindowFocus() {
  reopenBarcodeKeyboard();
}

function handlePageShow() {
  reopenBarcodeKeyboard();
}

watch(inputType, () => {
  inputValue.value = "";
  resetCustomKeyboardMode();

  reopenBarcodeKeyboard({ remount: true });
});

watch(viewMode, async (mode) => {
  await nextTick();

  if (mode === "create") {
    await renderNewestBarcode();
  } else {
    closeCustomKeyboard();
    await renderRecentBarcodes();
  }
});

onMounted(async () => {
  lockBodyScroll();
  loadBarcodes();
  setupTouchOnlyDetection();

  document.addEventListener("visibilitychange", handleVisibilityChange);
  window.addEventListener("focus", handleWindowFocus);
  window.addEventListener("pageshow", handlePageShow);

  await nextTick();

  focusBarcodeInput();
  await renderNewestBarcode();
});

onUnmounted(() => {
  clearFocusTimers();
  unlockBodyScroll();
  cleanupTouchOnlyDetection();

  document.removeEventListener("visibilitychange", handleVisibilityChange);
  window.removeEventListener("focus", handleWindowFocus);
  window.removeEventListener("pageshow", handlePageShow);
});
</script>

<template>
  <div
    class="baseVertFlex h-svh w-full overflow-hidden overscroll-none touch-manipulation bg-background text-foreground"
    @click.self="handleMainBackgroundClick"
  >
    <!-- Header -->
    <header
      class="relative z-10 w-full shrink-0 bg-background px-2 pb-2 pt-[calc(env(safe-area-inset-top)+0.5rem)]"
    >
      <div class="baseFlex gap-4 w-full !justify-between">
        <!-- Create / Recent Toggle -->
        <div
          :class="`baseFlex gap-2 rounded-lg p-1 ${
            theme === 'light' ? 'bg-secondary/100' : 'bg-secondary/20'
          }`"
        >
          <Button
            :variant="viewMode === 'create' ? 'default' : 'ghost'"
            @click="viewMode = 'create'"
          >
            <div class="baseFlex gap-2">
              <v-icon name="hi-plus" scale="0.75" />
              Create
            </div>
          </Button>

          <Button
            :variant="viewMode === 'recent' ? 'default' : 'ghost'"
            @click="viewMode = 'recent'"
          >
            <div class="baseFlex gap-2">
              <v-icon name="md-replay-round" scale="0.75" />

              Recent
            </div>
          </Button>
        </div>

        <div class="baseFlex gap-2">
          <!-- Theme Toggle -->
          <Button
            variant="link"
            aria-label="Toggle light/dark theme"
            size="icon"
            @click="toggleTheme"
            class="!p-2.5"
          >
            <v-icon v-if="theme === 'light'" name="bi-moon-stars" scale="1" />
            <v-icon v-else name="bi-sun" scale="1" />
          </Button>
        </div>
      </div>
    </header>

    <!-- Create View -->
    <div
      v-if="viewMode === 'create'"
      class="min-h-0 flex-1 w-full overflow-hidden baseFlex"
      @click.self="handleMainBackgroundClick"
    >
      <div
        class="baseVertFlex gap-6 w-full max-w-sm px-4"
        @click.self="handleMainBackgroundClick"
      >
        <!-- DPCI / Location Toggle -->
        <div
          :class="`baseFlex gap-2 rounded-lg p-1 ${
            theme === 'light' ? 'bg-secondary/100' : 'bg-secondary/20'
          }`"
        >
          <Button
            :variant="inputType === 'dpci' ? 'default' : 'ghost'"
            @click="setInputType('dpci')"
            class="flex-1"
          >
            DPCI
          </Button>

          <Button
            :variant="inputType === 'location' ? 'default' : 'ghost'"
            @click="setInputType('location')"
            class="flex-1"
          >
            Location
          </Button>
        </div>

        <div class="baseFlex gap-4 w-full">
          <!-- Input Field -->
          <div class="w-full baseFlex">
            <input
              :key="inputKey"
              ref="inputRef"
              :value="inputValue"
              :readonly="shouldUseCustomKeyboard"
              @input="handleInput"
              @keydown.enter.prevent="generateBarcode"
              @pointerdown="handleInputPointerDown"
              @click="handleInputClick"
              @focus="handleInputFocus"
              :inputmode="inputType === 'dpci' ? 'tel' : 'text'"
              enterkeyhint="done"
              autocomplete="off"
              autocorrect="off"
              autocapitalize="characters"
              :spellcheck="false"
              :placeholder="
                inputType === 'dpci' ? 'XXX-XX-XXXX' : 'XXX XXX XXX'
              "
              :aria-expanded="keyboardVisible"
              :class="[
                'w-full text-center text-2xl tracking-widest p-4 rounded-lg border-2 bg-background text-foreground focus:outline-none focus:border-primary transition-colors',
                keyboardVisible ? 'border-primary ' : 'border-border',
              ]"
            />
          </div>

          <!-- Generate Button -->
          <Button
            @click="generateBarcode"
            :disabled="!isValidInput"
            class="baseFlex h-16"
          >
            <v-icon name="ri-barcode-fill" scale="1.5" />
          </Button>
        </div>

        <!-- Newest Barcode -->
        <div
          v-if="newestBarcode"
          class="baseVertFlex gap-2 w-full rounded-lg border border-border bg-background p-4"
        >
          <canvas
            :id="`barcode-${newestBarcode.id}`"
            width="250"
            height="100"
            class="rounded-md"
          ></canvas>

          <div
            class="baseFlex !justify-between w-full text-left text-sm text-muted-foreground"
          >
            <p>{{ newestBarcode.timestamp }}</p>

            <p v-if="newestBarcode.location">
              Location:
              {{ formatInput(newestBarcode.location, "location") }}
            </p>
          </div>
        </div>
        <!-- Filler space to prevent layout shift -->
        <div v-else class="h-[169px] w-full baseFlex"></div>
      </div>
    </div>

    <!-- Recent View -->
    <div
      v-else
      class="min-h-0 flex-1 w-full overflow-hidden px-4 py-1"
      @click.self="handleMainBackgroundClick"
    >
      <div
        class="recent-scroll h-full w-full overflow-y-auto overscroll-contain"
        @click.self="handleMainBackgroundClick"
      >
        <div
          v-if="barcodes.length"
          class="baseVertFlex gap-4 w-full max-w-sm mx-auto"
          @click.self="handleMainBackgroundClick"
        >
          <div
            v-for="barcode in barcodes"
            :key="barcode.id"
            class="baseVertFlex gap-2 w-full rounded-lg border border-border bg-background p-4"
          >
            <canvas
              :id="`barcode-${barcode.id}`"
              width="250"
              height="100"
              class="rounded-md"
            ></canvas>

            <div
              class="baseFlex !justify-between w-full text-left sm:px-4 text-sm text-muted-foreground"
            >
              <p>{{ barcode.timestamp }}</p>

              <p v-if="barcode.location">
                Location:
                {{ formatInput(barcode.location, "location") }}
              </p>
            </div>
          </div>
        </div>

        <div v-else class="h-full w-full baseFlex text-muted-foreground">
          No recent barcodes yet.
        </div>
      </div>
    </div>

    <Transition name="custom-keyboard">
      <div
        v-if="keyboardVisible"
        class="fixed inset-x-0 baseFlex bottom-0 h-[calc(env(safe-area-inset-bottom)+240px)] z-50 border-t border-border bg-background/95 px-2 pb-[calc(env(safe-area-inset-bottom)+0.5rem)] pt-2 shadow-2xl backdrop-blur"
      >
        <div class="mx-auto w-full max-w-xl">
          <div class="flex w-full flex-col gap-2">
            <div
              v-for="(row, rowIndex) in activeKeyboardRows"
              :key="rowIndex"
              class="flex w-full justify-center gap-1.5"
            >
              <button
                v-for="key in row"
                :key="key"
                type="button"
                :class="[
                  'h-12 rounded-lg border border-border bg-secondary text-lg font-semibold text-foreground transition active:scale-95 active:bg-primary active:text-primary-foreground flex-1',
                  key === '123' || key === 'ABC' ? 'text-sm' : '',
                ]"
                @pointerdown.prevent="pressCustomKey(key)"
                @click.prevent
              >
                {{ key }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>
