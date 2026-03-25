import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import { BrowserRouter, HashRouter } from "react-router";
import { Provider } from "react-redux";
import { store } from "./store.ts";
import { NotificationsProvider } from "reapop";
import { registerSW } from 'virtual:pwa-register'

const updateSW = registerSW({
  onNeedRefresh() {
    console.log('New content available, click on reload button.')
  },
  onOfflineReady() {
    console.log('App ready to work offline.')
  },
})

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Provider store={store}>
      <NotificationsProvider>
        <App />
      </NotificationsProvider>
    </Provider>
  </StrictMode>,
);
