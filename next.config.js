/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "i.seadn.io", pathname: "/**" },
      { protocol: "https", hostname: "images.unsplash.com", pathname: "/**" },
      { protocol: "https", hostname: "picsum.photos", pathname: "/**" },
    ],
    formats: ["image/avif", "image/webp"],
  },
  webpack: (config) => {
    config.module.rules.push({
      test: /@magic-ext[\\/]+oauth[\\/]+dist[\\/]+es[\\/]+index\\.(mjs|js)$/,
      parser: { amd: false },
    });

    return config;
  },
};

export default nextConfig;
