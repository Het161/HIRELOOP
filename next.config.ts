import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pin the file-tracing root to this project — a stray lockfile in the
  // home directory otherwise makes Next infer the wrong workspace root.
  outputFileTracingRoot: import.meta.dirname,
};

export default nextConfig;
