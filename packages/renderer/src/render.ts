import { rewriteAssetUrls } from "./assets";
import {
  renderMarkdownToContentHtml,
  validateMarkdown,
  validateMarkdownWithResolver
} from "./markdown";
import { renderPdfFromHtml } from "./pdf";
import { buildHtmlDocument } from "./template";
import type {
  RenderAsset,
  RenderHtmlResult,
  RenderImageSourceResolver,
  RenderOptions
} from "./types";

export { validateMarkdown, validateMarkdownWithResolver } from "./markdown";
export { closeRendererBrowser } from "./pdf";

export async function renderMarkdownToHtml(input: {
  markdown: string;
  assets?: RenderAsset[];
  options?: RenderOptions;
  resolveImageSource?: RenderImageSourceResolver;
}): Promise<RenderHtmlResult> {
  const validation = await validateMarkdownWithResolver({
    markdown: input.markdown,
    assets: input.assets,
    resolveImageSource: input.resolveImageSource
  });

  const rewritten = await rewriteAssetUrls(
    input.markdown,
    input.assets ?? [],
    input.resolveImageSource
  );
  const contentHtml = renderMarkdownToContentHtml(rewritten.markdown);
  const html = await buildHtmlDocument(contentHtml, input.options?.title, input.options?.theme);

  return {
    html,
    validation
  };
}

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
