/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/browser-agent/:path*',
        destination: 'http://localhost:3001/api/browser-agent/:path*',
      },
    ];
  },
};

module.exports = nextConfig; 