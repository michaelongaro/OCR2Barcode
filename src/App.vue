<script setup lang="ts">
import { ref, onMounted, computed, watch, nextTick } from "vue";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/components/composables/useTheme";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import JsBarcode from "jsbarcode";

const { theme, toggleTheme } = useTheme();

const inputType = ref<"dpci" | "location">("dpci");
const inputValue = ref("");
const showManualBarcodeDialog = ref(false);
const isPWA = ref(false);
let deferredPrompt: any = null;

// Computed values for input
const rawInputValue = computed(() => {
  // Strip all non-alphanumeric characters for validation
  return inputValue.value.replace(/[-\s]/g, "").toUpperCase();
});

const isValidInput = computed(() => {
  if (inputType.value === "dpci") {
    return /^\d{9}$/.test(rawInputValue.value);
  } else {
    return rawInputValue.value.length === 9;
  }
});

// Format input as user types
function formatInput(value: string) {
  // Remove all non-relevant characters
  let cleaned = "";

  if (inputType.value === "dpci") {
    // For DPCI, only allow digits
    cleaned = value.replace(/\D/g, "").slice(0, 9);

    // Format as XXX-XX-XXXX
    if (cleaned.length <= 3) {
      return cleaned;
    } else if (cleaned.length <= 5) {
      return `${cleaned.slice(0, 3)}-${cleaned.slice(3)}`;
    } else {
      return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 5)}-${cleaned.slice(
        5,
      )}`;
    }
  } else {
    // For Location, allow alphanumeric
    cleaned = value
      .replace(/[^a-zA-Z0-9]/g, "")
      .toUpperCase()
      .slice(0, 9);

    // Format as XXX XXX XXX
    if (cleaned.length <= 3) {
      return cleaned;
    } else if (cleaned.length <= 6) {
      return `${cleaned.slice(0, 3)} ${cleaned.slice(3)}`;
    } else {
      return `${cleaned.slice(0, 3)} ${cleaned.slice(3, 6)} ${cleaned.slice(
        6,
      )}`;
    }
  }
}

function handleInput(event: Event) {
  const target = event.target as HTMLInputElement;
  const formatted = formatInput(target.value);
  inputValue.value = formatted;
  // Update the input element directly to handle cursor position
  target.value = formatted;
}

// Clear input when switching input types
watch(inputType, () => {
  inputValue.value = "";
});

onMounted(async () => {
  isPWA.value = window.matchMedia("(display-mode: standalone)").matches;

  window.addEventListener("beforeinstallprompt", (e) => {
    // Prevent Chrome 67 and earlier from automatically showing the prompt
    e.preventDefault();
    // Stash the event so it can be triggered later.
    deferredPrompt = e;
  });
});

async function generateManualBarcode() {
  if (!isValidInput.value) return;

  showManualBarcodeDialog.value = true;
  await nextTick();

  const canvas = document.getElementById(
    "manualBarcodeCanvas",
  ) as HTMLCanvasElement;
  if (canvas) {
    generateBarcode(canvas, rawInputValue.value);
  }
}

function closeManualBarcodeDialog() {
  showManualBarcodeDialog.value = false;
  inputValue.value = "";
}

function generateBarcode(canvas: HTMLCanvasElement, barcodeText: string) {
  JsBarcode(canvas, barcodeText, {
    format: "code39",
    displayValue: true,
    text: formatInput(barcodeText),
    fontOptions: "bold",
    textMargin: 0,
    fontSize: 18,
    margin: 7,
    height: 75,
    width: 1.5,
  });
}

function showInstallPrompt() {
  if (deferredPrompt) {
    deferredPrompt.prompt();
    deferredPrompt.userChoice.then((choiceResult: any) => {
      if (choiceResult.outcome === "accepted") {
        isPWA.value = true;
      }
      deferredPrompt = null;
    });
  }
}
</script>

<template>
  <div class="baseVertFlex relative h-dvh">
    <div class="h-full w-full baseFlex">
      <div class="baseVertFlex gap-6 w-full max-w-md px-4">
        <!-- DPCI / Location Toggle -->
        <div
          :class="`baseFlex gap-2 rounded-lg p-1 ${theme === 'light' ? 'bg-secondary/100' : 'bg-secondary/20'}`"
        >
          <Button
            :variant="inputType === 'dpci' ? 'default' : 'ghost'"
            @click="inputType = 'dpci'"
            class="flex-1"
          >
            DPCI
          </Button>

          <Button
            :variant="inputType === 'location' ? 'default' : 'ghost'"
            @click="inputType = 'location'"
            class="flex-1"
          >
            Location
          </Button>
        </div>

        <div class="baseFlex gap-4">
          <!-- Input Field -->
          <div class="w-full baseFlex">
            <input
              :value="inputValue"
              @input="handleInput"
              :inputmode="inputType === 'dpci' ? 'tel' : 'text'"
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
      </div>
    </div>

    <!-- Top Bar -->
    <div class="baseFlex absolute top-4 left-0 px-4 gap-4 w-full !justify-end">
      <!-- Install trigger -->
      <div class="baseFlex gap-2">
        <Button v-if="!isPWA" @click="showInstallPrompt" class="baseFlex gap-2">
          Install app
          <v-icon name="hi-solid-download" scale="1" />
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

    <!-- Manual Barcode Dialog -->
    <Dialog
      v-model:open="showManualBarcodeDialog"
      @update:open="
        () => {
          if (!showManualBarcodeDialog) {
            closeManualBarcodeDialog();
          }
        }
      "
    >
      <DialogContent class="baseVertFlex w-[90%] min-h-[35vh] max-h-[90vh]">
        <div class="baseVertFlex !justify-between min-h-[35vh] max-h-[90vh]">
          <div class="baseVertFlex gap-2">
            <DialogHeader>
              <DialogTitle>Generated Barcode</DialogTitle>
            </DialogHeader>
            <DialogDescription>
              <p class="mt-2 mb-4">
                {{ inputType === "dpci" ? "DPCI" : "Location" }}:
                {{ inputValue }}
              </p>
            </DialogDescription>
          </div>

          <div class="w-full h-full baseFlex">
            <canvas
              id="manualBarcodeCanvas"
              width="250"
              height="100"
              class="rounded-md"
            ></canvas>
          </div>

          <DialogFooter>
            <Button class="flex gap-4 mt-4" @click="closeManualBarcodeDialog">
              Done
              <v-icon name="bi-check-lg" scale="1" />
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  </div>
</template>
