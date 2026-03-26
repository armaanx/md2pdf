import type { RenderAsset, ValidationIssue } from "./types";

const imageRegex = /!\[[^\]]*]\((?<url>[^)\s]+)(?:\s+"[^"]*")?\)/g;

export function buildAssetMap(assets: RenderAsset[]) {
  return new Map(assets.map((asset) => [asset.id, asset.url]));
}

export function rewriteAssetUrls(markdown: string, assets: RenderAsset[]) {
  const assetMap = buildAssetMap(assets);
  const issues: ValidationIssue[] = [];

  const rewritten = markdown.replace(imageRegex, (fullMatch, _rawUrl, _offset, _input, groups) => {
    const url = groups?.url?.trim();

    if (!url) {
      return fullMatch;
    }

    if (url.startsWith("asset://")) {
      const assetId = url.slice("asset://".length);
      const assetUrl = assetMap.get(assetId);

      if (!assetUrl) {
        issues.push({
          code: "unknown_asset",
          message: `Image asset "${assetId}" is not available for this render.`
        });
        return fullMatch;
      }

      return fullMatch.replace(url, assetUrl);
    }

    if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("file:")) {
      issues.push({
        code: "unsupported_image_source",
        message: `Image source "${url}" is not allowed. Upload the file and reference it as asset://<id>.`
      });
    }

    return fullMatch;
  });

  return { markdown: rewritten, issues };
}

