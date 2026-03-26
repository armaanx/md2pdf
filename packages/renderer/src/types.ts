export type RenderAsset = {
  id: string;
  url: string;
};

export type RenderOptions = {
  title?: string;
  timeoutMs?: number;
};

export type ValidationIssue = {
  code:
    | "raw_html_not_allowed"
    | "unsupported_image_source"
    | "unknown_asset"
    | "missing_markdown";
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

