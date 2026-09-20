import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pin the file-tracing root to this project — a stray lockfile in the
  // home directory otherwise makes Next infer the wrong workspace root.
  outputFileTracingRoot: import.meta.dirname,

  images: {
    // Serve the brand PNGs straight from /public instead of through
    // /_next/image.
    //
    // This repo lives on an exFAT volume, where macOS writes an AppleDouble
    // `._<name>` sidecar next to every file. Next's image cache picks the
    // sidecar out of its cache directory and serves 4KB of "Mac OS X"
    // metadata with a `Content-Type: image/png`, so every logo renders as a
    // broken image on the second request onward. The assets are already
    // small and generated at the sizes we display, so the optimizer was
    // buying us nothing.
    unoptimized: true,
  },
};

export default nextConfig;
