import { createApp } from "vue";
import { registerSW } from "virtual:pwa-register";
import { OhVueIcon, addIcons } from "oh-vue-icons";
import {
  BiSun,
  BiMoonStars,
  BiKeyboard,
  BiUpcScan,
  HiPlus,
  MdReplayRound,
} from "oh-vue-icons/icons";
import App from "@/App.vue";
import "@/style.css";

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

addIcons(BiSun, BiMoonStars, BiKeyboard, BiUpcScan, HiPlus, MdReplayRound);

const app = createApp(App);

app.component("v-icon", OhVueIcon);

app.mount("#app");
