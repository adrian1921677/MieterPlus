/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  transpilePackages: ['@mieterplus/shared'],
  eslint: {
    // ESLint-Konfigurationskonflikt im Monorepo — wird beim Build ignoriert.
    // Lint lokal mit `npm run lint` ausführen.
    ignoreDuringBuilds: true,
  },
  async headers() {
    // Content-Security-Policy — funktional gehalten:
    // - script/style 'unsafe-inline' nötig für Next.js-Hydration + Tailwind
    //   (eine nonce-basierte strikte CSP ist ein späteres Upgrade)
    // - img/connect https: für Mapbox-Karten + Supabase Storage/Realtime
    // - frame-ancestors 'none' verhindert Clickjacking, object-src 'none'
    //   sperrt Plugins, base-uri/form-action 'self' gegen Injection-Tricks
    const csp = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https:",
      "font-src 'self' data:",
      "connect-src 'self' https: wss:",
      "frame-ancestors 'none'",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      'upgrade-insecure-requests',
    ].join('; ');

    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'Content-Security-Policy', value: csp },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(self)' },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
