<script setup lang="ts">
import { ref, nextTick, onMounted, computed, watch } from "vue";
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
import Tesseract from "tesseract.js";
import JsBarcode from "jsbarcode";

const { theme, toggleTheme } = useTheme();

// Main mode toggle: 'manual' or 'ocr'
const appMode = ref<"manual" | "ocr">("manual");

// Manual input mode state
const manualInputType = ref<"location" | "dpci">("location");
const manualInputValue = ref("");
const showManualBarcodeDialog = ref(false);

// OCR mode state
const showingCamera = ref(false);
const showBarcodeDialog = ref(false);
const showingPostImageTakenLoadingSpinner = ref(false);
const checkedCameraPermissions = ref(false);

const videoStream = ref<MediaStream | null>(null);
const canvasContainer = ref(null as HTMLDivElement | null);
const canvasElements = ref([] as HTMLCanvasElement[]);

// Computed values for manual input
const rawInputValue = computed(() => {
  // Strip all non-alphanumeric characters for validation
  return manualInputValue.value.replace(/[-\s]/g, "").toUpperCase();
});

const isValidInput = computed(() => {
  if (manualInputType.value === "dpci") {
    return /^\d{9}$/.test(rawInputValue.value);
  } else {
    return rawInputValue.value.length === 9;
  }
});

// Format input as user types
function formatManualInput(value: string) {
  // Remove all non-relevant characters
  let cleaned = "";

  if (manualInputType.value === "dpci") {
    // For DPCI, only allow digits
    cleaned = value.replace(/\D/g, "").slice(0, 9);

    // Format as XXX-XX-XXXX
    if (cleaned.length <= 3) {
      return cleaned;
    } else if (cleaned.length <= 5) {
      return `${cleaned.slice(0, 3)}-${cleaned.slice(3)}`;
    } else {
      return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 5)}-${cleaned.slice(
        5
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
        6
      )}`;
    }
  }
}

function handleManualInput(event: Event) {
  const target = event.target as HTMLInputElement;
  const formatted = formatManualInput(target.value);
  manualInputValue.value = formatted;
  // Update the input element directly to handle cursor position
  target.value = formatted;
}

// Clear input when switching input types
watch(manualInputType, () => {
  manualInputValue.value = "";
});

// Stop camera when switching to manual mode
watch(appMode, (newMode) => {
  if (newMode === "manual" && videoStream.value) {
    videoStream.value.getTracks().forEach((track) => track.stop());
    showingCamera.value = false;
  }
});

async function generateManualBarcode() {
  if (!isValidInput.value) return;

  showManualBarcodeDialog.value = true;
  await nextTick();

  const canvas = document.getElementById(
    "manualBarcodeCanvas"
  ) as HTMLCanvasElement;
  if (canvas) {
    generateBarcode(canvas, rawInputValue.value);
  }
}

function closeManualBarcodeDialog() {
  showManualBarcodeDialog.value = false;
}

const isPWA = ref(false);
let deferredPrompt: any = null;

onMounted(async () => {
  isPWA.value = window.matchMedia("(display-mode: standalone)").matches;

  // @ts-expect-error asdf
  const permissions = await navigator.permissions.query({ name: "camera" });

  if (permissions.state === "granted") {
    initializeCamera();
  }

  checkedCameraPermissions.value = true;

  window.addEventListener("beforeinstallprompt", (e) => {
    // Prevent Chrome 67 and earlier from automatically showing the prompt
    e.preventDefault();
    // Stash the event so it can be triggered later.
    deferredPrompt = e;
  });

  window.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      if (permissions.state === "granted") {
        initializeCamera();
      }
    } else {
      if (videoStream.value) {
        videoStream.value.getTracks().forEach((track) => track.stop());
      }
    }
  });

  // TODO: error handling for if camera is already in use by another app (just show a message saying exactly that?)
  // also if user revokes camera permissions while using the app, need to handle that as well maybe
});

// choosing to not unsubscribe from listeners added above since this is a SPA
// and the listeners will be needed for the entire lifetime of the app

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

function initializeCamera() {
  const constraints = {
    video: {
      focusMode: ["continuous"],
      facingMode: "environment",
      width: { min: window.innerWidth },
      height: { max: window.innerHeight },
    },
  };

  showingCamera.value = true;

  navigator.mediaDevices.getUserMedia(constraints).then(async (stream) => {
    videoStream.value = stream;
    await nextTick();
    const player = document.getElementById("player");
    if (player instanceof HTMLVideoElement) {
      player.srcObject = stream;
    }
  });
}

function scanMoreBarcodes() {
  showBarcodeDialog.value = false;
  canvasElements.value = [];
  canvasContainer.value?.remove();
  canvasContainer.value = null;

  const player = document.getElementById("player");
  if (player instanceof HTMLVideoElement && videoStream.value) {
    player.srcObject = videoStream.value;
    player.play();
  }
}

async function takePicture() {
  showingPostImageTakenLoadingSpinner.value = true;

  // get image from canvas
  const player = document.getElementById("player");
  if (player instanceof HTMLVideoElement) {
    const canvas = document.createElement("canvas");
    canvas.width = player.videoWidth;
    canvas.height = player.videoHeight;
    const ctx = canvas.getContext("2d");

    if (ctx && player) {
      const sx = player.videoWidth * 0.15; // Start at 7.5% of the video width (to center the 75% width crop)
      const sy = player.videoHeight * 0.4; // Start at 37.5% of the video height (to center the 25% height crop)
      const sWidth = player.videoWidth * 0.7; // 85% of the video width
      const sHeight = player.videoHeight * 0.2; // 25% of the video height

      // Adjust the canvas size to match the source dimensions
      canvas.width = sWidth;
      canvas.height = sHeight;

      ctx.drawImage(player, sx, sy, sWidth, sHeight, 0, 0, sWidth, sHeight);
      const dataURI = canvas.toDataURL("image/jpeg");

      // pausing the video stream to save on resources
      if (player) {
        player.pause();
      }

      const worker = await Tesseract.createWorker("eng", 1);

      worker.recognize(dataURI).then(async ({ data: { text } }) => {
        const matches = parseThroughExtractedText(text);

        showBarcodeDialog.value = true;
        await nextTick();
        showingPostImageTakenLoadingSpinner.value = false;

        matches.forEach((_) => {
          const canvas = document.createElement("canvas");
          canvas.width = 250;
          canvas.height = 100;
          canvasElements.value.push(canvas);

          canvasContainer.value?.appendChild(canvas);
        });

        await nextTick();

        matches.forEach((match, index) => {
          generateBarcode(canvasElements.value[index], match);
        });
      });
    }
  }
}

function isBackroomLocation(s: string) {
  return s.length === 9 && /^\d{2}[A-Z]\d{3}[A-Z]\d{2}$/.test(s);
}

function isDPCI(s: string) {
  return s.length === 9 && /^\d{9}$/.test(s);
}

function parseThroughExtractedText(text: string) {
  const minifiedText = text.replace(/\s/g, "").toUpperCase();
  const matches = [];

  for (let i = 0; i <= minifiedText.length - 9; i++) {
    const substring = minifiedText.substring(i, i + 9);

    if (isBackroomLocation(substring) || isDPCI(substring)) {
      matches.push(substring);
      i += 8; // skip ahead 8 characters since we already found a match
    }
  }

  return matches;
}

function generateBarcode(canvas: HTMLCanvasElement, barcodeText: string) {
  JsBarcode(canvas, barcodeText, {
    format: "code39",
    displayValue: true,
    fontSize: 18,
    margin: 7,
    height: 75,
    width: 1.5,
  });
}
</script>

<template>
  <div class="baseVertFlex relative h-dvh">
    <!-- Manual Input Mode -->
    <div v-if="appMode === 'manual'" class="h-full w-full baseFlex">
      <div class="baseVertFlex gap-6 w-full max-w-md px-4">
        <!-- DPCI / Location Toggle -->
        <div class="baseFlex gap-2 bg-secondary/20 rounded-lg p-1">
          <Button
            :variant="manualInputType === 'location' ? 'default' : 'ghost'"
            @click="manualInputType = 'location'"
            class="flex-1"
          >
            Location
          </Button>
          <Button
            :variant="manualInputType === 'dpci' ? 'default' : 'ghost'"
            @click="manualInputType = 'dpci'"
            class="flex-1"
          >
            DPCI
          </Button>
        </div>

        <div class="baseFlex gap-4">
          <!-- Input Field -->
          <div class="w-full baseFlex">
            <input
              :value="manualInputValue"
              @input="handleManualInput"
              :inputmode="manualInputType === 'dpci' ? 'tel' : 'text'"
              :placeholder="
                manualInputType === 'dpci' ? 'XXX-XX-XXXX' : 'XXX XXX XXX'
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
            <v-icon name="bi-upc-scan" scale="1.4" />
          </Button>
        </div>
      </div>
    </div>

    <!-- OCR Mode -->
    <div v-else class="h-full w-full relative">
      <div
        v-if="showingCamera"
        class="mainContainer baseFlex relative h-full w-full"
      >
        <video id="player" autoplay playsinline></video>

        <div class="absolute w-full h-full baseFlex top-0 left-0">
          <div
            class="border-red-700 border-2 rounded-lg w-[70%] h-[20%] z-10"
          ></div>
        </div>

        <div class="absolute bottom-16 left-1/2 -translate-x-1/2 z-10">
          <Button
            aria-label="Take a picture"
            @click="takePicture"
            class="p-4 rounded-full z-10"
          >
            <v-icon
              v-if="!showingPostImageTakenLoadingSpinner"
              name="bi-camera"
              scale="1"
            />
            <svg
              v-else
              class="animate-spin size-5 text-secondary dark:text-primary"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                class="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                stroke-width="4"
              ></circle>
              <path
                class="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
          </Button>
        </div>
      </div>
      <div v-else-if="checkedCameraPermissions" class="h-full w-full">
        <div class="absolute w-full h-full top-0 left-0 baseFlex">
          <Button
            @click="initializeCamera"
            class="baseFlex gap-2 p-8 rounded-lg"
          >
            Start scanning
            <v-icon name="bi-camera" scale="1" />
          </Button>
        </div>
      </div>
    </div>

    <!-- Top Bar with Controls -->
    <div
      class="baseFlex absolute top-4 left-0 px-4 w-full !justify-between sm:!justify-end sm:gap-4"
    >
      <div class="baseFlex gap-2">
        <Button v-if="!isPWA" @click="showInstallPrompt" class="baseFlex gap-2">
          Install app
          <v-icon name="hi-solid-download" scale="1" />
        </Button>
      </div>
      <div class="baseFlex gap-2">
        <!-- Manual / OCR Mode Toggle -->
        <div class="baseFlex gap-1 bg-secondary/20 rounded-lg p-1">
          <Button
            :variant="appMode === 'manual' ? 'default' : 'ghost'"
            @click="appMode = 'manual'"
            size="sm"
            class="baseFlex gap-1"
          >
            <v-icon name="bi-keyboard" scale="0.9" />
            <span class="hidden sm:inline">Manual</span>
          </Button>
          <Button
            :variant="appMode === 'ocr' ? 'default' : 'ghost'"
            @click="appMode = 'ocr'"
            size="sm"
            class="baseFlex gap-1"
          >
            <v-icon name="bi-camera" scale="0.9" />
            <span class="hidden sm:inline">OCR</span>
          </Button>
        </div>
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
                {{ manualInputType === "dpci" ? "DPCI" : "Location" }}:
                {{ manualInputValue }}
              </p>
            </DialogDescription>
          </div>

          <div class="w-full h-full baseFlex">
            <canvas id="manualBarcodeCanvas" width="250" height="100"></canvas>
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

    <!-- OCR Barcode Dialog -->
    <Dialog
      v-model:open="showBarcodeDialog"
      @update:open="
        () => {
          if (!showBarcodeDialog) {
            scanMoreBarcodes();
          }
        }
      "
    >
      <DialogContent class="baseVertFlex w-5/6 min-h-[35vh] max-h-[90vh]">
        <div class="baseVertFlex !justify-between min-h-[35vh] max-h-[90vh]">
          <div class="baseVertFlex gap-2">
            <DialogHeader>
              <DialogTitle>Scan results</DialogTitle>
            </DialogHeader>
            <DialogDescription>
              <p v-if="canvasElements.length > 0" class="mt-2 mb-4">
                {{ canvasElements.length }}
                {{ canvasElements.length > 1 ? "barcodes" : "barcode" }} found
              </p>
            </DialogDescription>
          </div>

          <div
            v-show="canvasElements.length > 0"
            class="w-full h-full baseFlex !items-start overflow-y-scroll"
          >
            <div
              ref="canvasContainer"
              class="baseVertFlex gap-4 w-full h-full rounded-md"
            ></div>
          </div>

          <div
            v-show="canvasElements.length === 0"
            class="baseVertFlex gap-4 w-full h-[200px] rounded-md"
          >
            <div class="baseVertFlex gap-2">
              No barcodes detected
              <v-icon name="io-sad-sharp" scale="1" />
            </div>
          </div>

          <DialogFooter>
            <Button class="flex gap-4 mt-4" @click="scanMoreBarcodes">
              Scan more barcodes
              <v-icon name="bi-camera" scale="1" />
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  </div>
</template>

<style scoped>
.mainContainer::after {
  content: "";
  position: absolute;
  top: 40%; /* adjust these values based on the desired rectangle size */
  left: 15%;
  right: 15%;
  bottom: 40%;
  background: rgba(0, 0, 0, 0); /* fully transparent */
  box-shadow: 0 0 0 1000px rgba(0, 0, 0, 0.5); /* darken the rest of the video */
  pointer-events: none; /* allow interaction with the video */
  border-radius: 0.5rem;
}
</style>
