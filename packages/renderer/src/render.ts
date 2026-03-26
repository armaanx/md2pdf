import { rewriteAssetUrls } from "./assets";
import { validateMarkdown } from "./markdown";
import { renderPdfFromHtml } from "./pdf";
import { buildHtmlDocument } from "./template";
import type { RenderAsset, RenderHtmlResult, RenderOptions } from "./types";

export { validateMarkdown } from "./markdown";
export { closeRendererBrowser } from "./pdf";

export async function renderMarkdownToHtml(input: {
  markdown: string;
  assets?: RenderAsset[];
  options?: RenderOptions;
}): Promise<RenderHtmlResult> {
  const validation = validateMarkdown({
    markdown: input.markdown,
    assets: input.assets
  });

  const rewritten = rewriteAssetUrls(input.markdown, input.assets ?? []);
  const html = await buildHtmlDocument(rewritten.markdown, input.options?.title);

  return {
    html,
    validation
  };
}

export async function renderMarkdownToPdf(input: {
  markdown: string;
  assets?: RenderAsset[];
  options?: RenderOptions;
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
