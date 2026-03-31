import { marked, Tokens } from "marked";
import type {
  RenderAsset,
  RenderImageSourceResolver,
  ValidationIssue,
  ValidationResult
} from "./types";
import { rewriteAssetUrls, rewriteAssetUrlsSync } from "./assets";

marked.setOptions({
  gfm: true,
  breaks: false
});

function walkTokens(tokens: TokensListLike, issues: ValidationIssue[]) {
  for (const token of tokens) {
    if (token.type === "html") {
      issues.push({
        code: "raw_html_not_allowed",
        message: "Raw HTML is disabled for public rendering."
      });
    }

    if ("tokens" in token && Array.isArray(token.tokens)) {
      walkTokens(token.tokens as TokensListLike, issues);
    }

    if ("items" in token && Array.isArray(token.items)) {
      for (const item of token.items) {
        if (Array.isArray(item.tokens)) {
          walkTokens(item.tokens as TokensListLike, issues);
        }
      }
    }
  }
}

type TokensListLike = Array<Tokens.Generic | Tokens.ListItem>;

export function validateMarkdown(input: { markdown: string; assets?: RenderAsset[] }): ValidationResult {
  if (!input.markdown.trim()) {
    return {
      ok: false,
      issues: [
        {
          code: "missing_markdown",
          message: "Markdown content is required."
        }
      ]
    };
  }

  const issues: ValidationIssue[] = [];
  const tokens = marked.lexer(input.markdown);
  walkTokens(tokens as TokensListLike, issues);

  const assetValidation = rewriteAssetUrlsSync(input.markdown, input.assets ?? []);
  issues.push(...assetValidation.issues);

  return {
    ok: issues.length === 0,
    issues
  };
}

export async function validateMarkdownWithResolver(input: {
  markdown: string;
  assets?: RenderAsset[];
  resolveImageSource?: RenderImageSourceResolver;
}): Promise<ValidationResult> {
  if (!input.markdown.trim()) {
    return {
      ok: false,
      issues: [
        {
          code: "missing_markdown",
          message: "Markdown content is required."
        }
      ]
    };
  }

  const issues: ValidationIssue[] = [];
  const tokens = marked.lexer(input.markdown);
  walkTokens(tokens as TokensListLike, issues);

  const assetValidation = await rewriteAssetUrls(
    input.markdown,
    input.assets ?? [],
    input.resolveImageSource
  );
  issues.push(...assetValidation.issues);

  return {
    ok: issues.length === 0,
    issues
  };
}

export function renderMarkdownToContentHtml(markdown: string) {
  return marked.parse(markdown) as string;
}
