import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { type RouteSeoData, routes } from './app.routes';

const REPO_ROOT = path.resolve(__dirname, '../..');

function readRepoFile(relPath: string): string {
  return fs.readFileSync(path.join(REPO_ROOT, relPath), 'utf-8');
}

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function isIndexableSeo(seo?: RouteSeoData): seo is RouteSeoData & { canonicalPath: string } {
  return Boolean(seo?.canonicalPath && (!seo.robots || !seo.robots.includes('noindex')));
}

describe('Cross-File SEO, Manifest & Metadata Text Consistency', () => {
  const indexHtml = readRepoFile('src/index.html');
  const manifest = JSON.parse(readRepoFile('public/site.webmanifest'));
  const robotsTxt = readRepoFile('public/robots.txt');
  const sitemapXml = readRepoFile('public/sitemap.xml');
  const llmsTxt = readRepoFile('public/llms.txt');
  const ardJson = JSON.parse(readRepoFile('public/.well-known/ard.json'));
  const assetLinksJson = JSON.parse(readRepoFile('public/.well-known/assetlinks.json'));
  const aasaJson = JSON.parse(readRepoFile('public/.well-known/apple-app-site-association'));
  const capacitorConfigTs = readRepoFile('capacitor.config.ts');
  const serverTs = readRepoFile('src/server.ts');
  const trailerHtml = readRepoFile('src/app/trailer/trailer.html');

  const rootRoute = routes.find((r) => r.path === '');
  const trailerRoute = routes.find((r) => r.path === 'trailer');
  const wildcardRoute = routes.find((r) => r.path === '**');

  it('keeps the primary application title identical across index.html, site.webmanifest, and app.routes.ts', () => {
    const expectedTitle = rootRoute?.title as string;
    expect(expectedTitle).toBeTruthy();

    const htmlTitleMatch = indexHtml.match(/<title>([^<]+)<\/title>/);
    const ogTitleMatch = indexHtml.match(/<meta\s+property="og:title"\s+content="([^"]+)"/);
    const twitterTitleMatch = indexHtml.match(/<meta\s+name="twitter:title"\s+content="([^"]+)"/);

    expect(decodeHtmlEntities(htmlTitleMatch?.[1] ?? '')).toBe(expectedTitle);
    expect(decodeHtmlEntities(ogTitleMatch?.[1] ?? '')).toBe(expectedTitle);
    expect(decodeHtmlEntities(twitterTitleMatch?.[1] ?? '')).toBe(expectedTitle);
    expect(manifest.name).toBe(expectedTitle);
  });

  it('keeps the primary meta description identical across index.html, site.webmanifest, and app.routes.ts', () => {
    const rootSeo = rootRoute?.data?.seo as RouteSeoData | undefined;
    const expectedDescription = rootSeo?.description ?? '';
    expect(expectedDescription.length).toBeGreaterThan(50);

    const metaDescMatch = indexHtml.match(/<meta\s+name="description"\s+content="([^"]+)"/);
    const ogDescMatch = indexHtml.match(/<meta\s+property="og:description"\s+content="([^"]+)"/);
    const twitterDescMatch = indexHtml.match(/<meta\s+name="twitter:description"\s+content="([^"]+)"/);

    expect(decodeHtmlEntities(metaDescMatch?.[1] ?? '')).toBe(expectedDescription);
    expect(decodeHtmlEntities(ogDescMatch?.[1] ?? '')).toBe(expectedDescription);
    expect(decodeHtmlEntities(twitterDescMatch?.[1] ?? '')).toBe(expectedDescription);
    expect(manifest.description).toBe(expectedDescription);
  });

  it('restricts VideoObject JSON-LD to the trailer watch page and keeps it synchronized with sitemap.xml and 404 SEO rules', () => {
    const rootSeo = rootRoute?.data?.seo as RouteSeoData;
    const trailerSeo = trailerRoute?.data?.seo as RouteSeoData;
    const wildcardSeo = wildcardRoute?.data?.seo as RouteSeoData | undefined;

    const rootGraph = (rootSeo.jsonLd as { '@graph': Record<string, unknown>[] })['@graph'];
    const rootVideoObject = rootGraph.find((item) => item['@type'] === 'VideoObject');
    expect(rootVideoObject).toBeUndefined();

    const { '@context': _ctx, ...trailerVideoObject } = trailerSeo.jsonLd as Record<string, string>;
    expect(trailerVideoObject['@type']).toBe('VideoObject');

    expect(sitemapXml).toContain(`<video:thumbnail_loc>${trailerVideoObject.thumbnailUrl}</video:thumbnail_loc>`);
    expect(sitemapXml).toContain(`<video:content_loc>${trailerVideoObject.contentUrl}</video:content_loc>`);
    expect(sitemapXml).toContain(`<video:player_loc>${trailerVideoObject.embedUrl}</video:player_loc>`);
    expect(sitemapXml).toContain(`<video:publication_date>${trailerVideoObject.uploadDate}</video:publication_date>`);

    expect(wildcardSeo?.robots).toBe('noindex, nofollow');
    expect(wildcardSeo?.canonicalPath).toBeUndefined();
  });

  it('references the canonical lossless screenshot /SOIL-screenshot.png everywhere and has no redundant marketing/SOIL-screenshot.jpg', () => {
    expect(fs.existsSync(path.join(REPO_ROOT, 'public/SOIL-screenshot.png'))).toBe(true);
    expect(fs.existsSync(path.join(REPO_ROOT, 'marketing/SOIL-screenshot.jpg'))).toBe(false);

    expect(indexHtml).toContain('property="og:image" content="https://soil.app/SOIL-screenshot.png"');
    expect(indexHtml).toContain('name="twitter:image" content="https://soil.app/SOIL-screenshot.png"');
    expect(manifest.screenshots[0].src).toBe('/SOIL-screenshot.png');
    expect(trailerHtml).toContain('poster="/SOIL-screenshot.png"');
  });

  it('keeps static public metadata files (robots.txt, sitemap.xml, llms.txt, ard.json) synchronized with server.ts fallbacks', () => {
    expect(serverTs).toContain(robotsTxt.trim());
    expect(serverTs).toContain(sitemapXml.trim());

    const normalizedServerTs = serverTs.replace(/\\`/g, '`');
    expect(normalizedServerTs).toContain(llmsTxt.trim());

    const ardEntry = ardJson.entries[0];
    expect(serverTs).toContain(ardEntry.identifier);
    expect(serverTs).toContain(ardEntry.description);
    for (const query of ardEntry.representativeQueries) {
      expect(serverTs).toContain(query);
    }

    const assetLinkEntry = assetLinksJson[0];
    expect(assetLinkEntry.target.package_name).toBe('app.soil.twa');
    expect(serverTs).toContain(assetLinkEntry.target.package_name);
    for (const fingerprint of assetLinkEntry.target.sha256_cert_fingerprints) {
      expect(serverTs).toContain(fingerprint);
    }
    expect(capacitorConfigTs).toContain("appId: 'app.soil'");

    const aasaAppId = aasaJson.applinks.details[0].appIDs[0] as string;
    expect(aasaAppId).toContain('app.soil');
    expect(serverTs).toContain(aasaAppId);
  });

  it('lists every indexable route from app.routes.ts in both public/sitemap.xml and public/robots.txt', () => {
    const indexablePaths = new Set(
      routes
        .map((route) => route.data?.seo as RouteSeoData | undefined)
        .filter(isIndexableSeo)
        .map((seo) => seo.canonicalPath),
    );
    expect(indexablePaths.size).toBeGreaterThan(0);

    for (const canonicalPath of indexablePaths) {
      const fullUrl = `https://soil.app${canonicalPath === '/' ? '/' : canonicalPath}`;
      expect(sitemapXml).toContain(`<loc>${fullUrl}</loc>`);
      expect(robotsTxt).toContain(`Allow: ${canonicalPath}`);
    }
  });
});
