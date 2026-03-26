import { rewriteAssetUrls } from "./assets";
import { validateMarkdown } from "./markdown";
import { buildHtmlDocument } from "./template";
import type { RenderAsset, RenderHtmlResult, RenderOptions } from "./types";

export { validateMarkdown } from "./markdown";
export type {
  RenderAsset,
  RenderHtmlResult,
  RenderOptions,
  ValidationIssue,
  ValidationResult
} from "./types";

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
