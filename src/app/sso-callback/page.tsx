import { AuthenticateWithRedirectCallback } from "@clerk/nextjs";

/**
 * Página de callback para OAuth (Google, etc).
 * Clerk redirige aquí tras autenticarse con un proveedor externo.
 */
export default function SSOCallbackPage() {
  return <AuthenticateWithRedirectCallback />;
}
