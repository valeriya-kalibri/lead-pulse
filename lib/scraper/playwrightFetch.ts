/**
 * playwrightFetch — headless browser fallback for SPA/React sites.
 *
 * Used only when node-fetch returns an EMPTY_PAGE error (client-side rendered sites
 * that return a nearly-empty HTML shell which Cheerio cannot parse).
 *
 * Local dev: uses the system Chromium installed by `npx playwright install chromium`.
 * Vercel: uses @sparticuz/chromium-min which ships a Lambda-compatible binary.
 */

import type { Browser } from 'playwright-core'

let _chromiumPath: string | null = null
let _browser: Browser | null = null

async function getChromiumPath(): Promise<string | undefined> {
  // On Vercel (Lambda), use the sparticuz binary.
  // In local dev, fall back to the system Chromium playwright installed.
  if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
    if (!_chromiumPath) {
      const chromium = await import('@sparticuz/chromium-min')
      _chromiumPath = await chromium.default.executablePath(
        `https://github.com/Sparticuz/chromium/releases/download/v148.0.0/chromium-v148.0.0-pack.tar`
      )
    }
    return _chromiumPath
  }
  // Local — playwright-core will find the system Chromium
  return undefined
}

async function getBrowser(): Promise<Browser> {
  if (_browser && _browser.isConnected()) return _browser

  const { chromium } = await import('playwright-core')
  const executablePath = await getChromiumPath()

  let chromiumArgs: string[] = []
  if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
    const chromiumMod = await import('@sparticuz/chromium-min')
    chromiumArgs = chromiumMod.default.args
  }

  _browser = await chromium.launch({
    args: chromiumArgs.length > 0
      ? chromiumArgs
      : ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    executablePath,
    headless: true,
  })

  return _browser
}

/**
 * Fetches a URL using a headless Chromium browser and waits for the DOM to stabilize.
 * Returns the rendered HTML or null on failure.
 */
export async function playwrightFetch(url: string, timeoutMs = 15_000): Promise<string | null> {
  let browser: Browser | null = null
  try {
    browser = await getBrowser()
    const page = await browser.newPage()

    await page.setExtraHTTPHeaders({
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
    })

    await page.route('**/*.{png,jpg,jpeg,gif,webp,svg,woff,woff2,ttf,eot,ico}', (route) =>
      route.abort()
    )

    await page.goto(url, {
      waitUntil: 'domcontentloaded',
      timeout: timeoutMs,
    })

    // Give JS frameworks a moment to render
    await page.waitForTimeout(1500)

    const html = await page.content()
    await page.close()
    return html
  } catch {
    return null
  }
}

/**
 * Returns whether the given HTML is effectively empty — i.e. the page
 * is a client-side SPA shell that didn't render server-side content.
 */
export function isEmptyPage(html: string): boolean {
  const bodyText = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  return bodyText.length < 200
}
