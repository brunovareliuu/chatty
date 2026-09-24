import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /**
   * En desarrollo el servidor se expone por un túnel (ngrok, cloudflared),
   * porque Meta no acepta `localhost` como redirect ni como destino de
   * webhooks. Sin esto, Next bloquea las peticiones de dev que llegan desde
   * otro origen. El dominio del túnel va en DEV_TUNNEL_HOST (sin https://).
   * No tiene efecto en producción.
   */
  allowedDevOrigins: process.env.DEV_TUNNEL_HOST ? [process.env.DEV_TUNNEL_HOST] : [],

  /**
   * El service worker de los avisos push (public/sw.js) no se puede cachear:
   * si el CDN guardara una versión vieja, el celular seguiría con ella días.
   */
  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
    ];
  },
};

export default nextConfig;
