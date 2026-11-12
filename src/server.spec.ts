import { existsSync } from 'node:fs';
import { request as httpRequest, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { resolve } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { app } from './server';

describe('SSR & Canonical Express Server Routing (src/server.ts)', () => {
  let server: Server;
  let baseUrl: string;

  beforeAll(async () => {
    await new Promise<void>((resolve, reject) => {
      server = app.listen(0, '127.0.0.1', () => {
        const address = server.address() as AddressInfo;
        baseUrl = `http://127.0.0.1:${address.port}`;
        resolve();
      });
      server.once('error', reject);
    });
  });

  afterAll(async () => {
    if (server) {
      await new Promise<void>((resolve, reject) => {
        server.close((err) => (err ? reject(err) : resolve()));
      });
    }
  });

  it('returns immediate HTTP 404 (0 hops) without canonical tag for /en/, /en, /en/*, and /en-US/*', async () => {
    const resTrailing = await fetch(`${baseUrl}/en/`, { redirect: 'manual' });
    expect(resTrailing.status).toBe(404);
    expect(resTrailing.headers.get('location')).toBeNull();
    expect(resTrailing.headers.get('x-robots-tag')).toBe('noindex, nofollow');
    expect(resTrailing.headers.get('content-type')).toContain('text/html');

    const html = await resTrailing.text();
    expect(html).toContain('404');
    expect(html).toContain('Seite nicht gefunden');
    expect(html).toContain('noindex, nofollow');
    expect(html).toContain('/impressum');
    expect(html).toContain('/privacy');
    expect(html).not.toContain('rel="canonical"');

    for (const path of ['/en', '/en/manual', '/en-US', '/en-US/']) {
      const res = await fetch(`${baseUrl}${path}`, { redirect: 'manual' });
      expect(res.status, `expected 404 for ${path}`).toBe(404);
      expect(res.headers.get('location')).toBeNull();
      expect(res.headers.get('x-robots-tag')).toBe('noindex, nofollow');
    }
  });

  it('eliminates Soft-404s by returning HTTP 404 directly on unknown routes and missing asset files', async () => {
    for (const unknownRoute of ['/does-not-exist', '/does-not-exist/', '/old-page.html']) {
      const res = await fetch(`${baseUrl}${unknownRoute}`, { redirect: 'manual' });
      expect(res.status, `expected 404 for ${unknownRoute}`).toBe(404);
      expect(res.headers.get('location')).toBeNull();
      expect(res.headers.get('x-robots-tag')).toBe('noindex, nofollow');
      expect(res.headers.get('content-type')).toContain('text/html');
      const body = await res.text();
      expect(body).not.toContain('rel="canonical"');
    }

    const missingAssetRes = await fetch(`${baseUrl}/missing-bundle.js`, { redirect: 'manual' });
    expect(missingAssetRes.status).toBe(404);
    expect(missingAssetRes.headers.get('location')).toBeNull();
    expect(missingAssetRes.headers.get('x-robots-tag')).toBe('noindex, nofollow');
    expect(missingAssetRes.headers.get('content-type')).toContain('text/plain');
    expect(await missingAssetRes.text()).toBe('Not Found');
  });

  it('redirects valid /de and /de/<known-route> URLs in a single 301 hop and returns 404 for unknown /de/* paths', async () => {
    const cases: Array<{ path: string; expectedLocation: string }> = [
      { path: '/de', expectedLocation: '/' },
      { path: '/de/', expectedLocation: '/' },
      { path: '/de/manual?foo=1', expectedLocation: '/manual?foo=1' },
      { path: '/de/manual/', expectedLocation: '/manual' },
      { path: '/de/manual/index.html', expectedLocation: '/manual' },
      { path: '/de/index.html', expectedLocation: '/' },
    ];

    for (const { path, expectedLocation } of cases) {
      const res = await fetch(`${baseUrl}${path}`, { redirect: 'manual' });
      expect(res.status, `expected 301 for ${path}`).toBe(301);
      expect(res.headers.get('location')).toBe(expectedLocation);
    }

    for (const invalidDePath of ['/de/does-not-exist', '/de/de/', '/de/en/', '/de/missing.js']) {
      const res = await fetch(`${baseUrl}${invalidDePath}`, { redirect: 'manual' });
      expect(res.status, `expected 404 for ${invalidDePath}`).toBe(404);
      expect(res.headers.get('location')).toBeNull();
      expect(res.headers.get('x-robots-tag')).toBe('noindex, nofollow');
    }
  });

  it('normalizes trailing slashes and /index.html on known routes with a single 301 redirect and honors Host: soil.app', async () => {
    const normalizationCases: Array<{ path: string; expectedLocation: string }> = [
      { path: '/manual/', expectedLocation: '/manual' },
      { path: '/admin/', expectedLocation: '/admin' },
      { path: '/game/', expectedLocation: '/game' },
      { path: '/index.html', expectedLocation: '/' },
      { path: '/manual/index.html', expectedLocation: '/manual' },
      { path: '/manual/index.html?ref=1', expectedLocation: '/manual?ref=1' },
    ];

    for (const { path, expectedLocation } of normalizationCases) {
      const res = await fetch(`${baseUrl}${path}`, { redirect: 'manual' });
      expect(res.status, `expected 301 for ${path}`).toBe(301);
      expect(res.headers.get('location')).toBe(expectedLocation);
    }

    const address = server.address() as AddressInfo;
    const prodHostHeader = await new Promise<{ statusCode?: number; location?: string }>((resolveReq, rejectReq) => {
      const req = httpRequest(
        {
          host: '127.0.0.1',
          port: address.port,
          path: '/de/manual',
          method: 'GET',
          headers: { Host: 'soil.app' },
        },
        (res) => {
          res.resume();
          resolveReq({ statusCode: res.statusCode, location: res.headers.location });
        },
      );
      req.once('error', rejectReq);
      req.end();
    });
    expect(prodHostHeader.statusCode).toBe(301);
    expect(prodHostHeader.location).toBe('https://soil.app/manual');

    const forwardedHostRes = await fetch(`${baseUrl}/de/manual`, {
      redirect: 'manual',
      headers: { 'X-Forwarded-Host': 'soil.app' },
    });
    expect(forwardedHostRes.status).toBe(301);
    expect(forwardedHostRes.headers.get('location')).toBe('https://soil.app/manual');
  });

  it('serves noindex prerendered and CSR shells with X-Robots-Tag and stripped homepage canonical when dist exists', async () => {
    const distBrowser = resolve(__dirname, '../dist/soil/browser');
    if (!existsSync(resolve(distBrowser, 'index.csr.html'))) {
      return;
    }

    const impressumRes = await fetch(`${baseUrl}/impressum`, { redirect: 'manual' });
    expect(impressumRes.status).toBe(200);
    expect(impressumRes.headers.get('x-robots-tag')).toBe('noindex, nofollow');

    const gameRes = await fetch(`${baseUrl}/game`, { redirect: 'manual' });
    expect(gameRes.status).toBe(200);
    expect(gameRes.headers.get('x-robots-tag')).toBe('noindex, nofollow');
    const gameHtml = await gameRes.text();
    expect(gameHtml).toContain('content="noindex, nofollow"');
    expect(gameHtml).not.toContain('rel="canonical"');
  });
});
