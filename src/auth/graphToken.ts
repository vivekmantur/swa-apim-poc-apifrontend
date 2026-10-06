// MSAL is used only to get Microsoft Graph tokens. Sign-in itself is SWA's job.
import {
  InteractionRequiredAuthError,
  createStandardPublicClientApplication,
  type IPublicClientApplication,
} from "@azure/msal-browser";

const graphScopes = ["https://graph.microsoft.com/User.Read"];

let msalPromise: Promise<IPublicClientApplication> | undefined;

function getMsal(): Promise<IPublicClientApplication> {
  msalPromise ??= createStandardPublicClientApplication({
    auth: {
      clientId: import.meta.env.VITE_AZURE_CLIENT_ID,
      authority: `https://login.microsoftonline.com/${import.meta.env.VITE_AZURE_TENANT_ID}`,
      redirectUri: `${window.location.origin}/redirect.html`,
    },
    cache: { cacheLocation: "sessionStorage" },
  });
  return msalPromise!;
}

/**
 * Returns a Graph access token for the user already signed in through SWA.
 * Tries silently first (reusing the Entra session), then falls back to a popup.
 */
export async function getGraphToken(loginHint: string): Promise<string> {
  const msal = await getMsal();
  const account =
    msal.getAllAccounts().find((a) => a.username.toLowerCase() === loginHint.toLowerCase()) ?? null;

  if (account) {
    try {
      return (await msal.acquireTokenSilent({ scopes: graphScopes, account })).accessToken;
    } catch (error) {
      if (!(error instanceof InteractionRequiredAuthError)) {
        throw error;
      }
    }
  } else {
    try {
      return (await msal.ssoSilent({ scopes: graphScopes, loginHint })).accessToken;
    } catch {
      // Commonly fails when the browser blocks third-party cookies; the popup below handles it.
    }
  }

  return (await msal.acquireTokenPopup({ scopes: graphScopes, loginHint })).accessToken;
}
