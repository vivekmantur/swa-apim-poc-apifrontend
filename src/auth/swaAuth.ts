// Static Web Apps built-in authentication: sign-in, sign-out and the current user.

export interface ClientPrincipal {
  identityProvider: string;
  userId: string;
  userDetails: string;
  userRoles: string[];
  claims?: { typ: string; val: string }[];
}

export async function getClientPrincipal(): Promise<ClientPrincipal | null> {
  const response = await fetch("/.auth/me", { cache: "no-store" });
  if (!response.ok) {
    return null;
  }
  const payload = (await response.json()) as { clientPrincipal: ClientPrincipal | null };
  return payload.clientPrincipal;
}

export function signIn(): void {
  window.location.href = "/.auth/login/aad?post_login_redirect_uri=/dashboard";
}

export function signOut(): void {
  window.location.href = "/.auth/logout?post_logout_redirect_uri=/login";
}
