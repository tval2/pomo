/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { isServer }) => {
    // Existing configuration
    config.resolve.fallback = { fs: false };

    // New configuration for Picovoice Cobra
    if (isServer) {
      config.externals.push({
        "@picovoice/cobra-node": "commonjs @picovoice/cobra-node",
      });
    }

    return config;
  },
  transpilePackages: ["@picovoice/web-voice-processor"],
};

module.exports = nextConfig;
