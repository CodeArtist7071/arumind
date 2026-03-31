import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import { Provider } from "react-redux";
import { store } from "./store.ts";
import { NotificationsProvider } from "reapop";
import { registerSW } from 'virtual:pwa-register'

// AG Grid Global Core Registration
// import { ModuleRegistry, AllCommunityModule } from 'ag-grid-community';

import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-alpine.css";
import { AgGridProvider } from "ag-grid-react";
import { AllEnterpriseModule, LicenseManager } from "ag-grid-enterprise";

// Note: LicenseManager.setLicenseKey('YOUR_KEY_HERE');

const _updateSW = registerSW({
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
      <AgGridProvider modules={[AllEnterpriseModule]}>
        <NotificationsProvider>
          <App />
        </NotificationsProvider>
      </AgGridProvider>
    </Provider>
  </StrictMode>,
);
