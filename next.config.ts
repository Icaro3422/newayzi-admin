import type { NextConfig } from "next";

/** Solo si está definido en build; sin esto no registrar rewrite (evita 404 en /proxy-api). */
const apiUpstream = (
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.API_PROXY_TARGET ||
  ""
)
  .trim()
  .replace(/\/$/, "");

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
