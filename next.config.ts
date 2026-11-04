import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Next's dev server blocks cross-origin requests to dev assets/HMR by
  // default. Without this, loading the app through the cloudflared tunnel
  // (for mobile testing) silently breaks client-side JS — chunks 403,
  // the HMR websocket fails, and interactive components like the navbar's
  // sign-in button never finish mounting.
  allowedDevOrigins: ["*.trycloudflare.com"],
  // The PDF template reads public/revlv-logo.png from disk at request
  // time; make sure it is bundled into the serverless functions that
  // render PDFs (and the create/edit routes that upload them to Drive).
  outputFileTracingIncludes: {
    "/api/**/pdf": ["./public/revlv-logo.png"],
    "/api/supplier-submissions": ["./public/revlv-logo.png"],
    "/api/supplier-submissions/[token]": ["./public/revlv-logo.png"],
  },
};

export default nextConfig;
