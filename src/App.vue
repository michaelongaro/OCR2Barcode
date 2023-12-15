<script setup lang="ts">
// import HelloWorld from "./components/HelloWorld.vue";
import { ref, nextTick } from "vue";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/components/composables/useTheme";
import Tesseract from "tesseract.js";

const { theme, toggleTheme } = useTheme();

const showingCamera = ref(false);
const imageBase64 = ref("");

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
      const sy = player.videoHeight * 0.25; // Start at 25% of the video height (to center the 50% height crop)
      const sWidth = player.videoWidth * 0.75; // 75% of the video width
      const sHeight = player.videoHeight * 0.5; // 50% of the video height

      // Adjust the canvas size to match the source dimensions
      canvas.width = sWidth;
      canvas.height = sHeight;

      ctx.drawImage(player, sx, sy, sWidth, sHeight, 0, 0, sWidth, sHeight);
      const dataURI = canvas.toDataURL("image/jpeg");
      // console.log(dataURI);
      imageBase64.value = dataURI;

      // stop video stream to save on resources
      player.srcObject?.getVideoTracks().forEach((track) => track.stop());

      Tesseract.recognize(dataURI, "eng", {
        logger: (m) => console.log(m),
      }).then(({ data: { text } }) => {
        console.log(text);
      });
    }
  }
}
</script>

<template>
  <div class="baseVertFlex h-[100vh]">
    <div class="w-full bg-slate-800 h-16 baseFlex !justify-between px-8">
      <h1>Ocr2Barcode</h1>
      <Button @click="toggleTheme" class="!p-3">
        <v-icon v-if="theme === 'light'" name="bi-sun" scale="1" />
        <v-icon v-else name="bi-moon-stars" scale="1" />
      </Button>
    </div>

    <!-- <HelloWorld msg="Welcome to Your Vue.js + TypeScript App" /> -->
    <div class="h-1/2 w-full relative">
      <div v-if="showingCamera" class="h-full w-full">
        <video id="player" autoplay></video>

        <div class="absolute w-full h-full baseFlex top-0 left-0">
          <div class="border-red-700 border-2 rounded-lg w-3/4 h-1/2"></div>
        </div>

        <div class="absolute bottom-4 left-1/2 -translate-x-1/2">
          <Button
            @click="takePicture"
            class="bg-slate-800 text-white p-4 rounded-full"
          >
            <v-icon name="bi-camera" scale="1" />
          </Button>
        </div>
      </div>
      <div v-else class="h-full w-full">
        <div class="absolute w-full h-full top-0 left-0 baseFlex">
          <Button
            @click="initializeCamera"
            class="bg-slate-800 text-white p-4 rounded-full"
          >
            <v-icon name="bi-camera" scale="1" />
          </Button>
        </div>
      </div>
    </div>

    <div class="h-1/2 w-full"></div>

    <img :src="imageBase64" />
  </div>
</template>

<style scoped>
.logo {
  height: 6em;
  padding: 1.5em;
  will-change: filter;
  transition: filter 300ms;
}
.logo:hover {
  filter: drop-shadow(0 0 2em #646cffaa);
}
.logo.vue:hover {
  filter: drop-shadow(0 0 2em #42b883aa);
}
</style>
