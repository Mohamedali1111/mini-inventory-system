import "./style.css";
import { renderApp } from "./ui";

const root = document.querySelector<HTMLDivElement>("#app");

if (root) {
  renderApp(root);
}
