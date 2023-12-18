import { createApp } from "vue";
import "@/style.css";
import App from "@/App.vue";

import { OhVueIcon, addIcons } from "oh-vue-icons";
import {
  BiSun,
  BiMoonStars,
  BiCamera,
  MdEditnoteRound,
  MdDeleteforeverRound,
} from "oh-vue-icons/icons";

addIcons(BiSun, BiMoonStars, BiCamera, MdEditnoteRound, MdDeleteforeverRound);
const app = createApp(App);
app.component("v-icon", OhVueIcon);
app.mount("#app");
