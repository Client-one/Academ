import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  experimental: {
    // Next's default Server Action body limit is 1 MB. 4.25 MB leaves room for
    // a 4,000,000-byte file (MAX_SERVER_UPLOAD_BYTES) plus multipart overhead
    // while staying under Vercel's hard 4.5 MB function payload limit — raising
    // this value further would NOT help on Vercel (413 FUNCTION_PAYLOAD_TOO_LARGE).
    serverActions: { bodySizeLimit: "4.25mb" },
  },
  // Security headers applied at the edge
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Content-Security-Policy",
            value:
              "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self' https://*.supabase.co; frame-ancestors 'none'; base-uri 'self'; form-action 'self'",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
