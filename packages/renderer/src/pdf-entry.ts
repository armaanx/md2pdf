import { renderMarkdownToHtml } from "./html";
import { closeRendererBrowser, ensureRendererBrowser, renderPdfFromHtml } from "./pdf";
import type { RenderAsset, RenderImageSourceResolver, RenderOptions } from "./types";

export { closeRendererBrowser, ensureRendererBrowser } from "./pdf";

export async function renderMarkdownToPdf(input: {
  markdown: string;
  assets?: RenderAsset[];
  options?: RenderOptions;
  resolveImageSource?: RenderImageSourceResolver;
}) {
  const htmlResult = await renderMarkdownToHtml(input);

  if (!htmlResult.validation.ok) {
    const issue = htmlResult.validation.issues[0];
    throw new Error(issue?.message ?? "Markdown validation failed.");
  }

  return renderPdfFromHtml({
    html: htmlResult.html,
    timeoutMs: input.options?.timeoutMs ?? 30_000
  });
}
