/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@nextal/shared'],
  distDir: process.env.NEXT_DIST_DIR || (process.env.NODE_ENV === 'production' ? '.next-build' : '.next'),
  async rewrites() {
    return [
      {
        source: '/api/v1/:path*',
        destination: `${process.env.API_ORIGIN || 'http://127.0.0.1:5000'}/api/v1/:path*`,
      },
    ];
  },
};

export default nextConfig;
