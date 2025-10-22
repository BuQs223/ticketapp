import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Ensure proper build output
  output: 'standalone',
  
  // Optimize images (if you add any later)
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'wumuduiakrmofnkehbfc.supabase.co',
      },
    ],
  },
  
  // Enable experimental features for better performance
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
  
  // ESLint configuration for production builds
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true,
  },
  
  // TypeScript configuration
  typescript: {
    // !! WARN !!
    // Dangerously allow production builds to successfully complete even if
    // your project has type errors.
    // !! WARN !!
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
