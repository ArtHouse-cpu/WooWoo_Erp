import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import {Provider} from "react-redux";
import App from "./App.tsx";
import "./styles/index.css";
import { store } from "./store/redux.ts";
import { applyColorMode, readColorMode } from "./theme/theme.ts";

applyColorMode(readColorMode());

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Provider store={store}>
      <App />
    </Provider>
  </StrictMode>
);
