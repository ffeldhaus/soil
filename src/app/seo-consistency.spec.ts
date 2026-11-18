import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { INFO_FAQ_ITEMS, type RouteSeoData, routes } from './app.routes';

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

    expect(trailerVideoObject.contentUrl).toBe('https://soil.app/assets/video/soil-trailer.mp4');
    expect(trailerVideoObject.embedUrl).toBeUndefined();

    expect(sitemapXml).toContain(`<video:thumbnail_loc>${trailerVideoObject.thumbnailUrl}</video:thumbnail_loc>`);
    expect(sitemapXml).toContain(`<video:content_loc>${trailerVideoObject.contentUrl}</video:content_loc>`);
    expect(sitemapXml).not.toContain('<video:player_loc>');
    expect(sitemapXml).not.toContain('youtube.com');
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

  it('enforces Google & Bing title (30–60 chars) and meta description (145–160 chars) length budgets across all indexable routes', () => {
    const expectedIndexablePaths = ['', 'trailer', 'manual', 'info', 'research', 'admin'];
    const indexableRoutes = routes.filter((r) => isIndexableSeo(r.data?.seo as RouteSeoData | undefined));

    expect(indexableRoutes.map((r) => r.path).sort()).toEqual([...expectedIndexablePaths].sort());

    for (const routePath of expectedIndexablePaths) {
      const route = routes.find((r) => r.path === routePath);
      expect(route, `missing route for '${routePath}'`).toBeTruthy();

      const title = (route?.title as string) ?? '';
      const seo = route?.data?.seo as RouteSeoData;

      expect(title.length, `title length for '${routePath}' (${title.length}): ${title}`).toBeGreaterThanOrEqual(30);
      expect(title.length, `title length for '${routePath}' (${title.length}): ${title}`).toBeLessThanOrEqual(60);
      expect(
        seo.description.length,
        `description length for '${routePath}' (${seo.description.length}): ${seo.description}`,
      ).toBeGreaterThanOrEqual(145);
      expect(
        seo.description.length,
        `description length for '${routePath}' (${seo.description.length}): ${seo.description}`,
      ).toBeLessThanOrEqual(160);
    }
  });

  it('keeps visible descriptive h1 headings (<= 140 chars, zero hidden-only h1) on /, /manual, /info, and /admin', () => {
    const landingHtml = readRepoFile('src/app/landing/landing.html');
    const manualHtml = readRepoFile('src/app/manual/manual.html');
    const manualTs = readRepoFile('src/app/manual/manual.ts');
    const infoHtml = readRepoFile('src/app/info/info.html');
    const dashboardHtml = readRepoFile('src/app/admin/dashboard/dashboard.html');

    const landingH1Match = landingHtml.match(/<h1[^>]*>([\s\S]*?)<\/h1>/);
    expect(landingH1Match).toBeTruthy();
    expect(landingH1Match?.[0]).not.toContain('sr-only');
    const landingH1Text = decodeHtmlEntities((landingH1Match?.[1] ?? '').replace(/<[^>]+>/g, ' '))
      .replace(/\s+/g, ' ')
      .trim();
    expect(landingH1Text).toContain('SOIL');
    expect(landingH1Text).toContain('Unterrichtsmaterial');
    expect(landingH1Text.length).toBeLessThanOrEqual(140);

    expect(manualHtml).not.toMatch(/<h1[^>]*sr-only/);
    const manualTitleMatch = manualTs.match(/'manual\.title':\s*'([^']+)'/);
    expect(manualTitleMatch?.[1]).toContain('Handbuch');
    expect((manualTitleMatch?.[1] ?? '').length).toBeGreaterThanOrEqual(15);
    expect((manualTitleMatch?.[1] ?? '').length).toBeLessThanOrEqual(140);

    const infoH1Match = infoHtml.match(/<h1[^>]*>([\s\S]*?)<\/h1>/);
    const infoH1Text = decodeHtmlEntities((infoH1Match?.[1] ?? '').replace(/<[^>]+>/g, ' '))
      .replace(/\s+/g, ' ')
      .trim();
    expect(infoH1Text).toContain('Hintergrund');
    expect(infoH1Text.length).toBeLessThanOrEqual(140);

    expect(dashboardHtml).not.toMatch(/<h1[^>]*sr-only/);
    const dashboardH1Matches = [...dashboardHtml.matchAll(/<h1[^>]*>([\s\S]*?)<\/h1>/g)];
    expect(dashboardH1Matches).toHaveLength(2);
    for (const match of dashboardH1Matches) {
      const h1Text = decodeHtmlEntities(match[1].replace(/<[^>]+>/g, ' '))
        .replace(/\s+/g, ' ')
        .trim();
      expect(h1Text.length).toBeGreaterThanOrEqual(20);
      expect(h1Text.length).toBeLessThanOrEqual(140);
    }
  });

  it('targets Unterrichtsmaterial across Biologie, Erdkunde/Geografie, Wirtschaft & BNE in root, /info, and /manual metadata & JSON-LD', () => {
    const infoRoute = routes.find((r) => r.path === 'info');
    const manualRoute = routes.find((r) => r.path === 'manual');

    const rootTitle = (rootRoute?.title as string) ?? '';
    const rootSeo = rootRoute?.data?.seo as RouteSeoData;
    const infoTitle = (infoRoute?.title as string) ?? '';
    const infoSeo = infoRoute?.data?.seo as RouteSeoData;
    const manualSeo = manualRoute?.data?.seo as RouteSeoData;

    for (const term of ['SOIL', 'Planspiel', 'Unterrichtsmaterial', 'BNE']) {
      expect(rootTitle).toContain(term);
    }
    for (const term of ['Unterrichtsmaterial', 'Biologie', 'Erdkunde', 'Wirtschaft', 'SOIL']) {
      expect(infoTitle).toContain(term);
    }
    for (const term of ['Unterrichtsmaterial', 'Biologie', 'Erdkunde', 'Geografie', 'Wirtschaft', 'BNE']) {
      expect(rootSeo.description).toContain(term);
      expect(infoSeo.description).toContain(term);
    }

    expect(manualSeo.description).toContain('Unterrichtsmaterial');

    const rootGraph = (rootSeo.jsonLd as { '@graph': Record<string, unknown>[] })['@graph'];
    const learningResource = rootGraph.find((item) => item['@type'] === 'LearningResource') as Record<string, unknown>;
    expect(learningResource).toBeTruthy();
    expect(learningResource.learningResourceType).toContain('Unterrichtsmaterial');
    expect(learningResource.keywords).toEqual(
      expect.arrayContaining([
        'Unterrichtsmaterial Biologie',
        'Unterrichtsmaterial Erdkunde',
        'Unterrichtsmaterial Geografie',
        'Unterrichtsmaterial Geographie',
        'Unterrichtsmaterial Wirtschaft',
        'Planspiel BNE',
        'OER Unterrichtsmaterial',
      ]),
    );
  });

  it('keeps INFO_FAQ_ITEMS as single source of truth between info.ts and FAQPage JSON-LD', () => {
    const infoTs = readRepoFile('src/app/info/info.ts');
    expect(infoTs).toContain("import { INFO_FAQ_ITEMS } from '../app.routes';");
    expect(infoTs).toContain('readonly faqItems = INFO_FAQ_ITEMS;');

    const infoRoute = routes.find((r) => r.path === 'info');
    const infoSeo = infoRoute?.data?.seo as RouteSeoData;
    const infoGraph = (infoSeo.jsonLd as { '@graph': Record<string, unknown>[] })['@graph'];
    const faqPage = infoGraph.find((item) => item['@type'] === 'FAQPage') as {
      mainEntity: Array<{ name: string; acceptedAnswer: { text: string } }>;
    };

    expect(faqPage.mainEntity).toHaveLength(INFO_FAQ_ITEMS.length);
    for (let i = 0; i < INFO_FAQ_ITEMS.length; i++) {
      expect(faqPage.mainEntity[i].name).toBe(INFO_FAQ_ITEMS[i].question);
      expect(faqPage.mainEntity[i].acceptedAnswer.text).toBe(INFO_FAQ_ITEMS[i].answer);
    }

    const subjectFaq = INFO_FAQ_ITEMS.find((item) =>
      item.question.includes('Für welche Schulfächer eignet sich SOIL als Unterrichtsmaterial?'),
    );
    expect(subjectFaq).toBeTruthy();
    for (const term of ['Biologie', 'Erdkunde', 'Geografie', 'Geographie', 'Wirtschaft', 'BNE']) {
      expect(subjectFaq?.answer).toContain(term);
    }
  });

  it('prevents fixed school grade levels and hardcoded round-count drift across SEO & landing/info files', () => {
    const filesToCheck = [
      'src/app/app.routes.ts',
      'src/index.html',
      'public/site.webmanifest',
      'public/sitemap.xml',
      'public/llms.txt',
      'src/app/landing/landing.html',
      'src/app/info/info.ts',
      'src/app/info/info.html',
    ];
    const forbiddenPatterns = [
      /Klasse\s*5/i,
      /Klassen\s*5/i,
      /Klassenstufen\s*5/i,
      /ab\s+Klasse/i,
      /zehn\s+Runden/i,
      /zehn\s+Spielrunden/i,
      /zehn\s+Jahre\s+Zeit/i,
      /10\s+Runden/i,
    ];

    for (const relPath of filesToCheck) {
      const content = readRepoFile(relPath);
      for (const pattern of forbiddenPatterns) {
        expect(content, `${relPath} must not match ${pattern}`).not.toMatch(pattern);
      }
    }
  });
});
