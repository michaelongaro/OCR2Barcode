<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, watch, nextTick } from "vue";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/components/composables/useTheme";
import JsBarcode from "jsbarcode";

const { theme, toggleTheme } = useTheme();

type InputType = "dpci" | "location";
type ViewMode = "create" | "recent";

interface StoredBarcode {
  id: string;
  type: InputType;
  data: string;
  timestamp: string;
  location?: string;
}

const STORAGE_KEY = "bcg-generated-barcodes";

const inputType = ref<InputType>("dpci");
const inputValue = ref("");
const viewMode = ref<ViewMode>("create");
const inputRef = ref<HTMLInputElement | null>(null);
const inputKey = ref(0);
const barcodes = ref<StoredBarcode[]>([]);
const pendingLocation = ref<string | null>(null);
const focusTimers: number[] = [];

// Computed values for input
const rawInputValue = computed(() => {
  return inputValue.value.replace(/[-\s]/g, "").toUpperCase();
});

const isValidInput = computed(() => {
  if (inputType.value === "dpci") {
    return /^\d{9}$/.test(rawInputValue.value);
  }

  return rawInputValue.value.length === 9;
});

const newestBarcode = computed(() => {
  return barcodes.value[0] ?? null;
});

// Format input as user types
function formatInput(value: string, type: InputType = inputType.value) {
  let cleaned = "";

  if (type === "dpci") {
    cleaned = value.replace(/\D/g, "").slice(0, 9);

    if (cleaned.length <= 3) {
      return cleaned;
    } else if (cleaned.length <= 5) {
      return `${cleaned.slice(0, 3)}-${cleaned.slice(3)}`;
    } else {
      return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 5)}-${cleaned.slice(
        5,
      )}`;
    }
  }

  cleaned = value
    .replace(/[^a-zA-Z0-9]/g, "")
    .toUpperCase()
    .slice(0, 9);

  if (cleaned.length <= 3) {
    return cleaned;
  } else if (cleaned.length <= 6) {
    return `${cleaned.slice(0, 3)} ${cleaned.slice(3)}`;
  } else {
    return `${cleaned.slice(0, 3)} ${cleaned.slice(3, 6)} ${cleaned.slice(6)}`;
  }
}

function handleInput(event: Event) {
  const target = event.target as HTMLInputElement;
  const formatted = formatInput(target.value);

  inputValue.value = formatted;
  target.value = formatted;
}

function clearFocusTimers() {
  while (focusTimers.length) {
    const timer = focusTimers.pop();

    if (timer !== undefined) {
      window.clearTimeout(timer);
    }
  }
}

function focusBarcodeInput(delay = 0) {
  if (viewMode.value !== "create") return;

  const timer = window.setTimeout(() => {
    inputRef.value?.focus({ preventScroll: true });
  }, delay);

  focusTimers.push(timer);
}

function reopenBarcodeKeyboard(options: { remount?: boolean } = {}) {
  if (viewMode.value !== "create") return;

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

function setInputType(type: InputType) {
  if (inputType.value === type) {
    reopenBarcodeKeyboard({ remount: true });
    return;
  }

  inputType.value = type;
}

function handleRootPointerDown(event: PointerEvent) {
  if (viewMode.value !== "create") return;

  const target = event.target;

  if (!(target instanceof HTMLElement)) return;

  if (target.closest("button, input, canvas")) return;

  focusBarcodeInput();
}

function saveBarcodes() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(barcodes.value));
}

function loadBarcodes() {
  const stored = localStorage.getItem(STORAGE_KEY);

  if (!stored) return;

  try {
    const parsed = JSON.parse(stored) as StoredBarcode[];

    if (Array.isArray(parsed)) {
      barcodes.value = parsed;
    }
  } catch {
    barcodes.value = [];
  }
}

function generateBarcode(canvas: HTMLCanvasElement, barcode: StoredBarcode) {
  JsBarcode(canvas, barcode.data, {
    format: "code39",
    displayValue: true,
    text: formatInput(barcode.data, barcode.type),
    fontOptions: "bold",
    textMargin: 0,
    fontSize: 18,
    margin: 7,
    marginLeft: 24,
    marginRight: 24,
    height: 75,
    width: 1.5,
  });
}

async function renderNewestBarcode() {
  await nextTick();

  if (!newestBarcode.value) return;

  const canvas = document.getElementById(
    `barcode-${newestBarcode.value.id}`,
  ) as HTMLCanvasElement | null;

  if (canvas) {
    generateBarcode(canvas, newestBarcode.value);
  }
}

async function renderRecentBarcodes() {
  await nextTick();

  for (const barcode of barcodes.value) {
    const canvas = document.getElementById(
      `barcode-${barcode.id}`,
    ) as HTMLCanvasElement | null;

    if (canvas) {
      generateBarcode(canvas, barcode);
    }
  }
}

async function generateManualBarcode() {
  if (!isValidInput.value) return;

  const type = inputType.value;
  const data = rawInputValue.value;

  const barcode: StoredBarcode = {
    id: crypto.randomUUID(),
    type,
    data,
    timestamp: new Date().toLocaleString(undefined, {
      dateStyle: "short",
      timeStyle: "short",
    }),
  };

  if (type === "dpci" && pendingLocation.value) {
    barcode.location = pendingLocation.value;
  }

  barcodes.value = [barcode, ...barcodes.value];
  saveBarcodes();

  if (type === "location") {
    pendingLocation.value = data;
  } else {
    pendingLocation.value = null;
  }

  inputValue.value = "";

  await renderNewestBarcode();
  focusBarcodeInput();
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

// Clear input when switching input types
watch(inputType, () => {
  inputValue.value = "";

  reopenBarcodeKeyboard({ remount: true });
});

watch(viewMode, async (mode) => {
  await nextTick();

  if (mode === "create") {
    await renderNewestBarcode();
    inputRef.value?.focus();
  } else {
    await renderRecentBarcodes();
  }
});

onMounted(async () => {
  loadBarcodes();

  document.addEventListener("visibilitychange", handleVisibilityChange);
  window.addEventListener("focus", handleWindowFocus);
  window.addEventListener("pageshow", handlePageShow);

  await nextTick();

  focusBarcodeInput();
  await renderNewestBarcode();
});

onUnmounted(() => {
  clearFocusTimers();
  document.removeEventListener("visibilitychange", handleVisibilityChange);
  window.removeEventListener("focus", handleWindowFocus);
  window.removeEventListener("pageshow", handlePageShow);
});
</script>

<template>
  <div
    class="baseVertFlex relative h-dvh touch-manipulation"
    @pointerdown="handleRootPointerDown"
  >
    <!-- Top Bar -->
    <div
      class="baseFlex absolute top-4 left-0 px-4 gap-4 w-full !justify-between"
    >
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
          Create
        </Button>

        <Button
          :variant="viewMode === 'recent' ? 'default' : 'ghost'"
          @click="viewMode = 'recent'"
        >
          Recent
        </Button>
      </div>

      <div class="baseFlex gap-2">
        <!-- Theme Toggle -->
        <Button
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

    <!-- Create View -->
    <div v-if="viewMode === 'create'" class="h-full w-full baseFlex">
      <div class="baseVertFlex gap-6 w-full max-w-sm px-4">
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
              @input="handleInput"
              @keydown.enter.prevent="generateManualBarcode"
              :inputmode="inputType === 'dpci' ? 'tel' : 'text'"
              enterkeyhint="done"
              autocomplete="off"
              autocorrect="off"
              autocapitalize="characters"
              :spellcheck="false"
              :placeholder="
                inputType === 'dpci' ? 'XXX-XX-XXXX' : 'XXX XXX XXX'
              "
              class="w-full text-center text-2xl tracking-widest p-4 rounded-lg border-2 border-border bg-background text-foreground focus:outline-none focus:border-primary transition-colors"
            />
          </div>

          <!-- Generate Button -->
          <Button
            @click="generateManualBarcode"
            :disabled="!isValidInput"
            class="baseFlex h-16"
          >
            <v-icon name="bi-upc-scan" scale="1.5" />
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
      </div>
    </div>

    <!-- Recent View -->
    <div v-else class="h-full w-full overflow-y-auto pt-24 pb-6 px-4">
      <div
        v-if="barcodes.length"
        class="baseVertFlex gap-4 w-full max-w-sm mx-auto"
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
</template>
