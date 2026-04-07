import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isAdminRoute = createRouteMatcher(["/admin(.*)"]);

/** Next.js 15+: en middleware las redirecciones deben ser URLs absolutas. */
function absoluteUrl(path: string, req: Request): string {
  const envBase =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
    process.env.ADMIN_APP_URL?.replace(/\/$/, "");
  if (envBase) {
    return `${envBase}${path.startsWith("/") ? path : `/${path}`}`;
  }
  return new URL(path, req.url).href;
}

export default clerkMiddleware(async (auth, req) => {
  if (isAdminRoute(req)) {
    await auth.protect({
      unauthenticatedUrl: absoluteUrl("/sign-in", req),
    });
  }
});

/**
 * Excluir túneles hacia Django del matcher principal: /mpx (multipart proxy),
 * /proxy-api y /api/multipart-proxy (legacy). Así no entran en el mismo pipeline
 * que /api/* y Clerk no interfiere con fetch same-origin a esas rutas.
 */
export const config = {
  matcher: [
    "/",
    "/((?!_next|proxy-api/|api/multipart-proxy/|mpx/|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ico|woff2?|map)).*)",
    "/(api|trpc)(.*)",
  ],
};
