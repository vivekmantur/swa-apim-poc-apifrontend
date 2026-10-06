import { broadcastResponseToMainFrame } from "@azure/msal-browser/redirect-bridge";

broadcastResponseToMainFrame().catch((error: unknown) => {
  document.body.textContent = "Sign-in could not complete. Close this window and try again.";
  console.error(error);
});
