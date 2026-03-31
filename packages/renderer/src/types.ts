import type { RenderThemeConfig } from "./theme";

export type RenderAsset = {
  id: string;
  url: string;
};

export type ResolveImageSourceInput = {
  url: string;
};

export type ResolvedImageSource = {
  url: string;
};

export type RenderImageSourceResolver = (
  input: ResolveImageSourceInput
) => Promise<ResolvedImageSource | null> | ResolvedImageSource | null;

export type RenderOptions = {
  title?: string;
  timeoutMs?: number;
  theme?: RenderThemeConfig;
};

export type ValidationIssue = {
  code:
    | "raw_html_not_allowed"
    | "unsupported_image_source"
    | "unknown_asset"
    | "missing_markdown"
    | "unresolved_local_image_source";
  message: string;
};

export type ValidationResult = {
  ok: boolean;
  issues: ValidationIssue[];
};

export type RenderHtmlResult = {
  html: string;
  validation: ValidationResult;
};
