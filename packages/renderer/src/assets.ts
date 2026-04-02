import type {
  RenderAsset,
  RenderImageSourceResolver,
  ValidationIssue
} from "./types";

const imageRegex = /!\[[^\]]*]\((?<url>[^)\s]+)(?:\s+"[^"]*")?\)/g;

export function buildAssetMap(assets: RenderAsset[]) {
  return new Map(assets.map((asset) => [asset.id, asset.url]));
}

function isRemoteUrl(url: string) {
  return url.startsWith("http://") || url.startsWith("https://");
}

function isDataUrl(url: string) {
  return url.startsWith("data:");
}

function isLocalPathLike(url: string) {
  return (
    url.startsWith("./") ||
    url.startsWith("../") ||
    url.startsWith("/") ||
    url.startsWith("file:") ||
    /^[A-Za-z]:[\\/]/.test(url)
  );
}

export function rewriteAssetUrlsSync(markdown: string, assets: RenderAsset[]) {
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

    if (isRemoteUrl(url)) {
      issues.push({
        code: "unsupported_image_source",
        message: `Image source "${url}" is not allowed. Upload the file and reference it as asset://<id>.`
      });
    }

    if (isLocalPathLike(url)) {
      issues.push({
        code: "unresolved_local_image_source",
        message: `Image source "${url}" requires a local asset resolver before rendering.`
      });
    }

    return fullMatch;
  });

  return { markdown: rewritten, issues };
}

export async function rewriteAssetUrls(
  markdown: string,
  assets: RenderAsset[],
  resolveImageSource?: RenderImageSourceResolver
) {
  const assetMap = buildAssetMap(assets);
  const issues: ValidationIssue[] = [];
  let rewritten = "";
  let lastIndex = 0;

  for (const match of markdown.matchAll(imageRegex)) {
    const url = match.groups?.url?.trim();
    const fullMatch = match[0];
    const matchIndex = match.index ?? 0;

    rewritten += markdown.slice(lastIndex, matchIndex);
    lastIndex = matchIndex + fullMatch.length;

    if (!url) {
      rewritten += fullMatch;
      continue;
    }

    if (url.startsWith("asset://")) {
      const assetId = url.slice("asset://".length);
      const assetUrl = assetMap.get(assetId);

      if (!assetUrl) {
        issues.push({
          code: "unknown_asset",
          message: `Image asset "${assetId}" is not available for this render.`
        });
        rewritten += fullMatch;
        continue;
      }

      rewritten += fullMatch.replace(url, assetUrl);
      continue;
    }

    if (isDataUrl(url)) {
      rewritten += fullMatch;
      continue;
    }

    if (isRemoteUrl(url)) {
      issues.push({
        code: "unsupported_image_source",
        message: `Image source "${url}" is not allowed. Upload the file and reference it as asset://<id>.`
      });
      rewritten += fullMatch;
      continue;
    }

    if (resolveImageSource && isLocalPathLike(url)) {
      const resolved = await resolveImageSource({ url });

      if (resolved?.url) {
        rewritten += fullMatch.replace(url, resolved.url);
        continue;
      }
    }

    if (isLocalPathLike(url)) {
      issues.push({
        code: "unresolved_local_image_source",
        message: `Image source "${url}" could not be resolved from the local workspace.`
      });
      rewritten += fullMatch;
      continue;
    }

    rewritten += fullMatch;
  }

  rewritten += markdown.slice(lastIndex);

  return { markdown: rewritten, issues };
}
