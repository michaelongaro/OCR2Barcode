<script setup lang="ts">
// import HelloWorld from "./components/HelloWorld.vue";
import { ref, nextTick, onMounted } from "vue";
import { Button } from "@/components/ui/button";
// import { useTheme } from "@/components/composables/useTheme";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import Tesseract from "tesseract.js";
import JsBarcode from "jsbarcode";
// import Patterns from "@/components/Patterns.vue";

// const { theme, toggleTheme } = useTheme();

const showingCamera = ref(false);
const showBarcodeDialog = ref(false);
const canvasContainer = ref(null as HTMLDivElement | null);
const canvasElements = ref([] as HTMLCanvasElement[]);
const imageBase64 = ref("");

onMounted(async () => {
  const permissions = await navigator.permissions.query({ name: "camera" });

  if (permissions.state === "granted") {
    initializeCamera();
  }
});

function initializeCamera() {
  const constraints = {
    video: {
      focusMode: ["continuous"],
    },
  };

  navigator.mediaDevices.getUserMedia(constraints).then(async (stream) => {
    showingCamera.value = true;
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
}

function takePicture() {
  // get image from canvas
  const player = document.getElementById("player");
  if (player instanceof HTMLVideoElement) {
    const canvas = document.createElement("canvas");
    canvas.width = player.videoWidth;
    canvas.height = player.videoHeight;
    const ctx = canvas.getContext("2d");

    if (ctx && player) {
      const sx = player.videoWidth * 0.125; // Start at 12.5% of the video width (to center the 75% width crop)
      const sy = player.videoHeight * 0.25; // Start at 25% of the video height (to center the 25% height crop)
      const sWidth = player.videoWidth * 0.75; // 75% of the video width
      const sHeight = player.videoHeight * 0.5; // 50% of the video height

      // Adjust the canvas size to match the source dimensions
      canvas.width = sWidth;
      canvas.height = sHeight;

      ctx.drawImage(player, sx, sy, sWidth, sHeight, 0, 0, sWidth, sHeight);
      const dataURI = canvas.toDataURL("image/jpeg");
      imageBase64.value = dataURI;

      // stop video stream to save on resources
      // player.srcObject?.getVideoTracks().forEach((track) => track.stop());

      Tesseract.recognize(dataURI, "eng").then(async ({ data: { text } }) => {
        const matches = parseThroughExtractedText(text);

        showBarcodeDialog.value = true;

        await nextTick();

        matches.forEach((_) => {
          const canvas = document.createElement("canvas");
          canvas.width = 250;
          canvas.height = 100;
          canvasElements.value.push(canvas);

          console.log(canvasContainer.value);

          canvasContainer.value?.appendChild(canvas);
          console.log("appended");
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
  console.log(barcodeText);
  JsBarcode(canvas, barcodeText, {
    format: "code39",
    displayValue: true,
    fontSize: 18,
    margin: 7,
    height: 75,
    width: 1.5,
  });
  // const dataURI = canvas.toDataURL("image/jpeg");
  // imageBase64.value = dataURI;
}
</script>

<template>
  <div class="baseVertFlex h-[100vh]">
    <!-- <div class="w-full bg-slate-800 h-16 baseFlex !justify-between px-8">
      <h1>Ocr2Barcode</h1>
      <Button @click="toggleTheme" class="!p-3">
        <v-icon v-if="theme === 'light'" name="bi-sun" scale="1" />
        <v-icon v-else name="bi-moon-stars" scale="1" />
      </Button>
    </div> -->

    <!-- <HelloWorld msg="Welcome to Your Vue.js + TypeScript App" /> -->
    <div class="h-full w-full relative">
      <div v-if="showingCamera" class="container relative h-full w-full">
        <video id="player" autoplay class="w-full h-full z-[1]"></video>

        <div class="absolute w-full h-full baseFlex top-0 left-0">
          <div class="border-red-700 border-2 rounded-lg w-3/4 h-1/4 z-[2]">
            <!-- <div
              class="absolute w-full h-full z-[2] pointer-events-none brightness-150"
            ></div> -->
          </div>
          <!-- <div
            class="absolute top-0 left-0 w-full h-full bg-gradient-to-center from-transparent via-transparent to-[rgba(0,0,0,0.5)] z-[3]"
          ></div> -->
        </div>

        <div class="absolute bottom-16 left-1/2 -translate-x-1/2 !z-50">
          <Button
            @click="takePicture"
            class="bg-slate-800 text-white p-4 rounded-full !z-50"
          >
            <v-icon name="bi-camera" scale="1" />
          </Button>
        </div>
      </div>
      <div v-else class="h-full w-full">
        <div class="absolute w-full h-full top-0 left-0 baseFlex">
          <Button
            @click="initializeCamera"
            class="bg-slate-800 baseFlex gap-2 text-white p-8 rounded-full"
          >
            Start scanning
            <v-icon name="bi-camera" scale="1" />
          </Button>
        </div>
      </div>
    </div>

    <!-- dialog w/ barcodes -->
    <Dialog v-model:open="showBarcodeDialog">
      <DialogContent class="w-5/6 h-1/2 max-h-[90vh]">
        <div class="w-full h-full baseVertFlex !justify-between">
          <DialogHeader>
            <!-- maybe specify how many barcodes were found? -->
            <DialogTitle>Scan results</DialogTitle>
          </DialogHeader>
          <!-- <DialogDescription>test</DialogDescription> -->

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
.container::after {
  content: "";
  position: absolute;
  top: 37.5%; /* adjust these values based on the desired rectangle size */
  left: 12.5%;
  right: 12.5%;
  bottom: 37.5%;
  background: rgba(0, 0, 0, 0); /* fully transparent */
  box-shadow: 0 0 0 1000px rgba(0, 0, 0, 0.75); /* darken the rest of the video */
  pointer-events: none; /* allow interaction with the video */
  border-radius: 0.375rem;
}
</style>
