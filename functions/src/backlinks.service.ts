/**
 * @fileoverview Server-side link verifier for curated OER and directory backlinks.
 * Strictly iterates over hardcoded `live` entries in `KNOWN_BACKLINKS` (zero user-supplied URLs / zero SSRF surface).
 */

import {
  type BacklinkCheckResult,
  type BacklinkStatusResponse,
  KNOWN_BACKLINKS,
  type KnownBacklinkEntry,
} from './types';

export const BACKLINK_CHECK_TIMEOUT_MS = 8000;
export const BACKLINK_CHECKER_USER_AGENT = 'SOIL-LinkChecker/1.0 (+https://soil.app)';

export type FetchLike = (input: string | URL | Request, init?: RequestInit) => Promise<Response>;

export function containsSoilReference(bodyText: string): boolean {
  if (!bodyText) return false;
  const normalized = bodyText.toLowerCase();
  return normalized.includes('soil.app') || normalized.includes('/sodix/proxy-file/30188');
}

function formatFetchError(err: unknown): string {
  if (err && typeof err === 'object' && 'name' in err) {
    const name = String((err as { name?: unknown }).name || '');
    if (name === 'TimeoutError' || name === 'AbortError') {
      return 'Zeitüberschreitung (8s)';
    }
  }
  if (err instanceof Error && err.message) {
    return err.message.slice(0, 120);
  }
  return 'Verbindungsfehler';
}

async function checkSingleBacklink(
  entry: KnownBacklinkEntry,
  fetchImpl: FetchLike,
  checkedAt: string,
): Promise<BacklinkCheckResult> {
  try {
    const response = await fetchImpl(entry.listingUrl, {
      method: 'GET',
      redirect: 'follow',
      signal: AbortSignal.timeout(BACKLINK_CHECK_TIMEOUT_MS),
      headers: {
        'User-Agent': BACKLINK_CHECKER_USER_AGENT,
        Accept: 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.8',
      },
    });

    const isSuccessStatus = response.status >= 200 && response.status < 300;
    const html = isSuccessStatus ? await response.text() : '';
    const linksToSoil = isSuccessStatus && containsSoilReference(html);

    return {
      id: entry.id,
      ok: isSuccessStatus && linksToSoil,
      httpStatus: response.status,
      linksToSoil,
      checkedAt,
    };
  } catch (err: unknown) {
    return {
      id: entry.id,
      ok: false,
      httpStatus: null,
      linksToSoil: false,
      checkedAt,
      error: formatFetchError(err),
    };
  }
}

export async function verifyKnownBacklinks(fetchImpl: FetchLike = fetch): Promise<BacklinkStatusResponse> {
  const checkedAt = new Date().toISOString();
  const liveEntries = KNOWN_BACKLINKS.filter((entry) => entry.status === 'live');
  const results = await Promise.all(liveEntries.map((entry) => checkSingleBacklink(entry, fetchImpl, checkedAt)));

  return {
    results,
    checkedAt,
  };
}
