import { chromium, type Browser } from "playwright";

let browserPromise: Promise<Browser> | null = null;

function getBrowser() {
  if (!browserPromise) {
    browserPromise = chromium.launch({
      headless: true
    });
  }

  return browserPromise;
}

export async function ensureRendererBrowser() {
  await getBrowser();
}

export async function closeRendererBrowser() {
  if (!browserPromise) {
    return;
  }

  const browser = await browserPromise;
  await browser.close();
  browserPromise = null;
}

export async function renderPdfFromHtml(input: {
  html: string;
  timeoutMs: number;
}) {
  const browser = await getBrowser();
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    await page.setContent(input.html, {
      waitUntil: "load",
      timeout: input.timeoutMs
    });

    await page.emulateMedia({ media: "screen" });
    await page.waitForFunction(
      () => {
        const runtimeWindow = window as Window & {
          __PDF_READY__?: boolean;
          __PDF_ERROR__?: { message: string };
        };

        return Boolean(runtimeWindow.__PDF_READY__ || runtimeWindow.__PDF_ERROR__);
      },
      undefined,
      { timeout: input.timeoutMs }
    );

    const error = await page.evaluate(() => {
      const runtimeWindow = window as Window & {
        __PDF_ERROR__?: { message: string };
      };

      return runtimeWindow.__PDF_ERROR__ ?? null;
    });

    if (error) {
      throw new Error(error.message);
    }

    const heightPx = await page.evaluate(() =>
      Math.max(
        document.documentElement.scrollHeight,
        document.body ? document.body.scrollHeight : 0,
        document.querySelector(".sheet") instanceof HTMLElement
          ? document.querySelector(".sheet")!.scrollHeight
          : 0
      )
    );

    const pageHeightIn = Math.max(1, Math.ceil(heightPx + 8) / 96);

    await page.addStyleTag({
      content: `@page { size: 8.27in ${pageHeightIn.toFixed(2)}in; margin: 0; }`
    });

    return await page.pdf({
      printBackground: true,
      preferCSSPageSize: true,
      margin: {
        top: "0",
        right: "0",
        bottom: "0",
        left: "0"
      }
    });
  } finally {
    await page.close();
    await context.close();
  }
}
