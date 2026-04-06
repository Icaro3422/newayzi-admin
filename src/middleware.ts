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
 * Excluir /proxy-api y /api/multipart-proxy: son túneles same-origin hacia Django.
 * Si Clerk corre en estos paths puede romper fetch aunque no llames a auth.protect.
 */
export const config = {
  matcher: [
    "/",
    "/((?!_next|proxy-api/|api/multipart-proxy/|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ico|woff2?|map)).*)",
    "/(api|trpc)(.*)",
  ],
};
