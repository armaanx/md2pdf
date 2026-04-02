import { rewriteAssetUrls } from "./assets";
import {
  renderMarkdownToContentHtml,
  validateMarkdown,
  validateMarkdownWithResolver
} from "./markdown";
import { buildHtmlDocument } from "./template";
import type {
  RenderAsset,
  RenderHtmlResult,
  RenderImageSourceResolver,
  RenderOptions,
  ResolveImageSourceInput,
  ResolvedImageSource
} from "./types";

export { validateMarkdown, validateMarkdownWithResolver } from "./markdown";
export type {
  RenderAsset,
  RenderHtmlResult,
  RenderImageSourceResolver,
  RenderOptions,
  ResolveImageSourceInput,
  ResolvedImageSource,
  ValidationIssue,
  ValidationResult
} from "./types";

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
