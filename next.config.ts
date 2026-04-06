import type { NextConfig } from "next";

/** Destino del proxy same-origin (debe coincidir con getDirectApiBase / NEXT_PUBLIC_API_URL). */
const apiUpstream = (
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.API_PROXY_TARGET ||
  "https://api.production.newayzi.com"
).replace(/\/$/, "");

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "img.clerk.com", pathname: "/**" },
      { protocol: "https", hostname: "images.clerk.dev", pathname: "/**" },
    ],
  },
  /**
   * El navegador llama a /proxy-api/* en el mismo host que el admin (sin CORS).
   * Next reenvía al API real; imprescindible cuando el panel vive en portal.* y el API en api.production.*.
   */
  async rewrites() {
    return [
      {
        source: "/proxy-api/:path*",
        destination: `${apiUpstream}/:path*`,
      },
    ];
  },
};

export default nextConfig;
