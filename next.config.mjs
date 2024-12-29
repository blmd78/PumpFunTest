/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'ipfs-chainsafe.dev',
      },
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        // destination: '/api/proxy',
        destination: 'https://likeaserback.onrender.com/api/:path*'
      },
    ];
  },
};

export default nextConfig;
