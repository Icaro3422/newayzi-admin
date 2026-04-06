import type { NextConfig } from "next";

/** Solo si está definido en build; sin esto no registrar rewrite (evita 404 en /proxy-api).
 *  Normaliza la URL: si no lleva protocolo, añade https:// para que Next.js pueda hacer el rewrite.
 *  Funciona tanto con "api.production.newayzi.com" como con "https://api.production.newayzi.com".
 */
function normalizeUpstreamUrl(raw: string): string {
  const trimmed = raw.trim().replace(/\/$/, "");
  if (!trimmed) return "";
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) return trimmed;
  return `https://${trimmed}`;
}

const apiUpstream = normalizeUpstreamUrl(
  process.env.NEXT_PUBLIC_API_URL || process.env.API_PROXY_TARGET || ""
);

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "img.clerk.com", pathname: "/**" },
      { protocol: "https", hostname: "images.clerk.dev", pathname: "/**" },
    ],
  },
  /**
   * El navegador llama a /proxy-api/* same-origin; Next reenvía al API (misma URL que NEXT_PUBLIC_API_URL).
   * Requiere NEXT_PUBLIC_API_URL en el build; si no hay, admin-api no usa /proxy-api.
   */
  async rewrites() {
    if (!apiUpstream) return [];
    return [
      {
        source: "/proxy-api/:path*",
        destination: `${apiUpstream}/:path*`,
      },
    ];
  },
};

export default nextConfig;
