const nextConfig = {
  transpilePackages: ["@omnisignal/shared"],
  experimental: {
    externalDir: true,
    optimizePackageImports: ["lucide-react"]
  }
};

export default nextConfig;
