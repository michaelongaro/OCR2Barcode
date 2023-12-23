<script setup lang="ts">
import { ref, nextTick, onMounted } from "vue";
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

const showingCamera = ref(false);
const showBarcodeDialog = ref(false);
const showingPostImageTakenLoadingSpinner = ref(false);
const checkedCameraPermissions = ref(false);

const videoStream = ref<MediaStream | null>(null);
const canvasContainer = ref(null as HTMLDivElement | null);
const canvasElements = ref([] as HTMLCanvasElement[]);

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
      const sx = player.videoWidth * 0.075; // Start at 7.5% of the video width (to center the 75% width crop)
      const sy = player.videoHeight * 0.375; // Start at 37.5% of the video height (to center the 25% height crop)
      const sWidth = player.videoWidth * 0.85; // 85% of the video width
      const sHeight = player.videoHeight * 0.25; // 25% of the video height

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
    <div class="h-full w-full relative">
      <div
        v-if="showingCamera"
        class="mainContainer baseFlex relative h-full w-full"
      >
        <video id="player" autoplay></video>

        <div class="absolute w-full h-full baseFlex top-0 left-0">
          <div
            class="border-red-700 border-2 rounded-lg w-5/6 h-1/4 z-10"
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

    <div
      class="baseFlex absolute top-4 left-0 px-4 w-full !justify-between sm:!justify-end sm:gap-4"
    >
      <Button v-if="!isPWA" @click="showInstallPrompt" class="baseFlex gap-2">
        Install app
        <v-icon name="hi-solid-download" scale="1" />
      </Button>
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

    <!-- dialog w/ barcodes -->
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
      <DialogContent class="w-5/6 h-1/2 max-h-[90vh]">
        <div class="w-full h-full baseVertFlex !justify-between">
          <DialogHeader>
            <!-- maybe specify how many barcodes were found? -->
            <DialogTitle>Scan results</DialogTitle>
          </DialogHeader>
          <DialogDescription>
            <p v-if="canvasElements.length > 0" class="mt-2">
              {{ canvasElements.length }} barcode
              {{ canvasElements.length > 1 ? "s" : "" }} found
            </p>
          </DialogDescription>

          <!-- barcode map displayed here -->
          <div
            ref="canvasContainer"
            class="baseVertFlex gap-2 w-full h-full [&_canvas]:rounded-md"
          >
            <div v-if="canvasElements.length === 0" class="baseVertFlex gap-2">
              No barcodes detected
              <v-icon name="io-sad-sharp" scale="1" />
            </div>
          </div>

          <DialogFooter>
            <Button class="baseFlex gap-4" @click="scanMoreBarcodes">
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
  top: 37.5%; /* adjust these values based on the desired rectangle size */
  left: 8.5%;
  right: 8.5%;
  bottom: 37.5%;
  background: rgba(0, 0, 0, 0); /* fully transparent */
  box-shadow: 0 0 0 1000px rgba(0, 0, 0, 0.5); /* darken the rest of the video */
  pointer-events: none; /* allow interaction with the video */
  border-radius: 0.5rem;
}
</style>
