import type { Browser } from "playwright-core";

let browserPromise: Promise<Browser> | null = null;

function isServerlessBrowser() {
  return (
    process.env.MD2PDF_BROWSER === "serverless" ||
    (process.env.VERCEL === "1" && process.env.MD2PDF_BROWSER !== "local")
  );
}

async function launchBrowser() {
  if (isServerlessBrowser()) {
    const [{ chromium }, sparticuzChromium] = await Promise.all([
      import("playwright-core"),
      import("@sparticuz/chromium")
    ]);

    sparticuzChromium.default.setGraphicsMode = false;

    return chromium.launch({
      args: sparticuzChromium.default.args,
      executablePath: await sparticuzChromium.default.executablePath(),
      headless: sparticuzChromium.default.headless
    });
  }

  const { chromium } = await import("playwright");

  return chromium.launch({
    headless: true
  });
}

function getBrowser() {
  if (!browserPromise) {
    browserPromise = launchBrowser();
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
  const context = isServerlessBrowser() ? null : await browser.newContext();
  const page = context ? await context.newPage() : await browser.newPage();

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

    if (context) {
      await context.close();
    }
  }
}
