import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@mallguide/shared'],
  images: {
    remotePatterns: [
      // Local dev — API serves uploaded files at :3001/uploads/*
      { protocol: 'http', hostname: 'localhost', port: '3001' },
      // Local MinIO
      { protocol: 'http', hostname: 'localhost', port: '9000' },
      // Cloudflare R2 + CDN
      { protocol: 'https', hostname: '*.r2.dev' },
      { protocol: 'https', hostname: '*.cloudflare.com' },
      // Unsplash (placeholder images)
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'source.unsplash.com' },
      // Google Places Photos
      { protocol: 'https', hostname: 'maps.googleapis.com' },
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
    ],
  },
};

export default withNextIntl(nextConfig);
