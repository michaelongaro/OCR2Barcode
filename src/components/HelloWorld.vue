<script setup lang="ts">
import { ref } from "vue";
import Tesseract from "tesseract.js";

defineProps<{ msg: string }>();

const count = ref(0);

function test() {
  const player = document.getElementById("player");

  const constraints = {
    video: true,
  };

  navigator.mediaDevices.getUserMedia(constraints).then((stream) => {
    if (player instanceof HTMLVideoElement) {
      player.srcObject = stream;
    }
  });
}

function handleClick() {
  Tesseract.recognize(
    "https://tesseract.projectnaptha.com/img/eng_bw.png",
    "eng",
    { logger: (m) => console.log(m) }
  ).then(({ data: { text } }) => {
    console.log(text);
  });
}
</script>

<template>
  <h1>{{ msg }}</h1>

  <button @click="test">asdf</button>
  <video id="player" controls autoplay></video>
</template>

<style scoped>
.read-the-docs {
  color: #888;
}
</style>
