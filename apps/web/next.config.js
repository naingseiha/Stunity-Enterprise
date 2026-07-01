const createNextIntlPlugin = require('next-intl/plugin');
const withNextIntl = createNextIntlPlugin('./src/lib/i18n.ts');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'pub-772730709ea64ee7824db864842e5bc0.r2.dev',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '*.r2.dev',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'i.pravatar.cc',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'api.dicebear.com',
        pathname: '/**',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
        pathname: '/**',
      },
      {
        protocol: 'http',
        hostname: '**',
        pathname: '/uploads/**',
      },
    ],
  },
  webpack: (config, { isServer, webpack }) => {
    // pptxgenjs (Slides PPTX export) has optional Node-only codepaths
    // (writing files, fetching remote images by URL) that dynamically
    // `import('node:fs')` / `import('node:https')` even in its CJS build.
    // We only ever call it client-side with a base64 image already in hand,
    // but webpack treats `node:`-prefixed specifiers as a URI *scheme* and
    // fails to build them before `resolve.fallback` gets a chance to stub
    // them out. Strip the `node:` prefix first so plain `fs`/`https` requests
    // reach normal module resolution, where the fallback below no-ops them.
    if (!isServer) {
      config.plugins.push(
        new webpack.NormalModuleReplacementPlugin(/^node:/, (resource) => {
          resource.request = resource.request.replace(/^node:/, '');
        }),
      );
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        https: false,
        os: false,
        path: false,
        express: false,
        'image-size': false,
      };
    }
    return config;
  },
};

module.exports = withNextIntl(nextConfig);
