import { describe, expect, it, vi } from 'vitest';
import {
  BACKLINK_CHECKER_USER_AGENT,
  containsSoilReference,
  type FetchLike,
  verifyKnownBacklinks,
} from './backlinks.service';
import { KNOWN_BACKLINKS } from './types';

function mockResponse(status: number, body: string): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: async () => body,
  } as unknown as Response;
}

describe('backlinks.service', () => {
  it('detects direct soil.app links, URL-encoded ytInitialData links, and HubbS SODIX proxy paths', () => {
    expect(containsSoilReference('<a href="https://soil.app/manual">Handbuch</a>')).toBe(true);
    expect(
      containsSoilReference('{"ytInitialData":{"url":"https://www.youtube.com/redirect?q=https%3A%2F%2Fsoil.app"}}'),
    ).toBe(true);
    expect(containsSoilReference('<a href="/sodix/proxy-file/30188/0">Zum Medium</a>')).toBe(true);
    expect(containsSoilReference('<html><body>Allgemeine Übersichtsseite ohne Zielverweis</body></html>')).toBe(false);
    expect(containsSoilReference('')).toBe(false);
  });

  it('checks only hardcoded live entries with User-Agent header and reports 200 + link, 200 without link, 404, and timeouts', async () => {
    const calledUrls: string[] = [];
    const capturedHeaders: Record<string, string>[] = [];

    const mockBodiesBySubstring: ReadonlyArray<readonly [string, number, string]> = [
      ['bpb.de', 200, '<a href="https://soil.app/" rel="noopener noreferrer">SOIL</a>'],
      ['globaleslernen.de', 200, '<html><body>Kein Link gerendert</body></html>'],
      ['hubbs.schule', 200, '<a href="/sodix/proxy-file/30188/0">Starten</a>'],
      [
        'https://mundo.schule/api/source/6aeddd2caf9d24e43514425d',
        200,
        '{"name":"SOIL","website":"https://soil.app/","imprint":"https://soil.app/impressum"}',
      ],
      ['github.com', 404, 'Not Found'],
    ];

    const fetchMock: FetchLike = vi.fn(async (input, init) => {
      const url = String(input);
      calledUrls.push(url);
      capturedHeaders.push((init?.headers as Record<string, string>) ?? {});

      for (const [pattern, status, body] of mockBodiesBySubstring) {
        if (url.includes(pattern)) {
          return mockResponse(status, body);
        }
      }
      const timeoutErr = new Error('The operation was aborted due to timeout');
      timeoutErr.name = 'TimeoutError';
      throw timeoutErr;
    });

    const response = await verifyKnownBacklinks(fetchMock);

    const expectedLiveIds = KNOWN_BACKLINKS.filter((b) => b.status === 'live').map((b) => b.id);
    expect(response.results.map((r) => r.id)).toEqual(expectedLiveIds);
    expect(response.results.some((r) => r.id === 'bne-portal')).toBe(false);
    expect(calledUrls.length).toBe(6);
    expect(calledUrls).toContain('https://mundo.schule/api/source/6aeddd2caf9d24e43514425d');
    expect(calledUrls).not.toContain('https://mundo.schule/details/SODIX-0001172770');
    expect(capturedHeaders[0]['User-Agent']).toBe(BACKLINK_CHECKER_USER_AGENT);

    const bpb = response.results.find((r) => r.id === 'bpb');
    expect(bpb).toMatchObject({ ok: true, httpStatus: 200, linksToSoil: true });

    const globales = response.results.find((r) => r.id === 'globaleslernen');
    expect(globales).toMatchObject({ ok: false, httpStatus: 200, linksToSoil: false });

    const hubbs = response.results.find((r) => r.id === 'hubbs');
    expect(hubbs).toMatchObject({ ok: true, httpStatus: 200, linksToSoil: true });

    const mundo = response.results.find((r) => r.id === 'mundo');
    expect(mundo).toMatchObject({ ok: true, httpStatus: 200, linksToSoil: true });

    const github = response.results.find((r) => r.id === 'github');
    expect(github).toMatchObject({ ok: false, httpStatus: 404, linksToSoil: false });

    const youtube = response.results.find((r) => r.id === 'youtube');
    expect(youtube).toMatchObject({
      ok: false,
      httpStatus: null,
      linksToSoil: false,
      error: 'Zeitüberschreitung (8s)',
    });
  });
});
