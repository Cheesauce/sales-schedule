import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Next's dev server blocks cross-origin requests to dev assets/HMR by
  // default. Without this, loading the app through the cloudflared tunnel
  // (for mobile testing) silently breaks client-side JS — chunks 403,
  // the HMR websocket fails, and interactive components like the navbar's
  // sign-in button never finish mounting.
  allowedDevOrigins: ["*.trycloudflare.com"],
};

export default nextConfig;
