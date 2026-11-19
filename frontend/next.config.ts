import type { NextConfig } from 'next';
import { withSentryConfig } from '@sentry/nextjs/config';

// Static security headers applied to every response.
// Set via next.config.ts (not middleware.ts) so Vercel's edge can serve them
// from the CDN cache without invoking a function — zero per-request latency.
//
// CSP statique (sans nonce, pour garder les pages publiques pré-rendues et
// servies depuis le CDN) : scripts et styles du site lui-même seulement ;
// `unsafe-inline` reste nécessaire aux scripts d'amorçage de Next.js.
// Aucune ressource tierce hormis les tuiles de la carte et Sentry.
const tilesOrigin = (() => {
  try {
    const raw = process.env.NEXT_PUBLIC_MAP_TILES_URL || 'https://tile.openstreetmap.org';
    return new URL(raw.replace(/\{[a-z]\}/g, 'a')).origin;
  } catch {
    return 'https://tile.openstreetmap.org';
  }
})();
const isDev = process.env.NODE_ENV !== 'production';
const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval'${isDev ? " 'unsafe-eval'" : ''}`,
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: blob: ${tilesOrigin} https://*.tile.openstreetmap.org https://res.cloudinary.com https://lh3.googleusercontent.com`,
  "font-src 'self' data:",
  `connect-src 'self' https://*.ingest.sentry.io https://*.ingest.de.sentry.io${isDev ? ' ws: wss:' : ''}`,
  "worker-src 'self' blob:",
  "media-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join('; ');

const securityHeaders = [
  { key: 'Content-Security-Policy', value: contentSecurityPolicy },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  {
    key: 'Permissions-Policy',
    // Caméra (photo de l'ordonnance) et position : le site lui-même seulement.
    value: 'camera=(self), microphone=(), geolocation=(self), interest-cohort=()',
  },
  { key: 'X-DNS-Prefetch-Control', value: 'off' },
];

const config: NextConfig = {
  reactStrictMode: true,
  // Standalone output bundles a self-contained server.js + minimal node_modules
  // into .next/standalone — required by the Docker runtime image (frontend/Dockerfile).
  // Has no impact on `next dev` / `next start` workflows.
  output: 'standalone',
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
    ];
  },
};

// Sentry build-time wrapper. Uploads source maps when SENTRY_AUTH_TOKEN +
// SENTRY_ORG + SENTRY_PROJECT are present (typically only in CI). Without
// those env vars the wrapper still works — it just skips the upload step.
// Without a token, release creation and source-map upload are switched off
// and the plugin stays silent, so the build log has no « No auth token »
// warnings. (`disableLogger` was dropped: deprecated, and its replacement
// `webpack.treeshake.removeDebugLogging` does not apply to Turbopack.)
const sentryAuthToken = process.env.SENTRY_AUTH_TOKEN;

export default withSentryConfig(config, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: sentryAuthToken,
  silent: !sentryAuthToken,
  // Tunnel client requests through a Next.js route to bypass ad-blockers
  // that filter direct Sentry calls. Off by default — turn on if your
  // user base has heavy ad-blocker usage.
  // tunnelRoute: '/monitoring',
  release: { create: Boolean(sentryAuthToken) },
  sourcemaps: { disable: !sentryAuthToken, deleteSourcemapsAfterUpload: true },
});
