import { createApp } from "vue";
import "@/style.css";
import App from "@/App.vue";

import { OhVueIcon, addIcons } from "oh-vue-icons";
import {
  BiSun,
  BiMoonStars,
  BiCamera,
  BiKeyboard,
  BiUpcScan,
  BiCheckLg,
  MdEditnoteRound,
  MdDeleteforeverRound,
  IoSadSharp,
  HiSolidDownload,
} from "oh-vue-icons/icons";

import { registerSW } from "virtual:pwa-register";

const updateSW = registerSW({
  immediate: true,
  onNeedRefresh() {
    updateSW(true);
  },
  onOfflineReady() {
    console.log("App is ready to work offline.");
  },
  onRegisteredSW(_swUrl, registration) {
    if (registration) {
      setInterval(
        () => {
          registration.update();
        },
        60 * 60 * 1000,
      );
    }
  },
  onRegisterError(error) {
    console.error("Service worker registration error:", error);
  },
});

addIcons(
  BiSun,
  BiMoonStars,
  BiCamera,
  BiKeyboard,
  BiUpcScan,
  BiCheckLg,
  MdEditnoteRound,
  MdDeleteforeverRound,
  IoSadSharp,
  HiSolidDownload,
);

const app = createApp(App);

app.component("v-icon", OhVueIcon);

app.mount("#app");
