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
 * Excluir /proxy-api: es el túnel same-origin hacia Django; si Clerk corre aquí,
 * puede romper fetch (auth/me, etc.) aunque no llames a auth.protect.
 */
export const config = {
  matcher: [
    "/",
    "/((?!_next|proxy-api/|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ico|woff2?|map)).*)",
    "/(api|trpc)(.*)",
  ],
};
