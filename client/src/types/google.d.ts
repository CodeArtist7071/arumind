declare global {
  interface Window {
    gapi: typeof gapi;
    google: typeof google;
  }
}
export {};