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
  IoSadSharp,
} from "oh-vue-icons/icons";

addIcons(
  BiSun,
  BiMoonStars,
  BiCamera,
  MdEditnoteRound,
  MdDeleteforeverRound,
  IoSadSharp
);
const app = createApp(App);
app.component("v-icon", OhVueIcon);
app.mount("#app");
