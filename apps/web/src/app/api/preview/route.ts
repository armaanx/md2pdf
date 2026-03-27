import { getEnv, previewRequestSchema } from "@md2pdf/core";
import { renderMarkdownToHtml } from "@md2pdf/renderer/html";
import { NextResponse } from "next/server";
import { getOwnedAssets, toRenderAssets } from "@/lib/assets";
import { getCurrentUser } from "@/lib/auth";
import { jsonError } from "@/lib/http";

export async function POST(request: Request) {
  const user = await getCurrentUser();

  if (!user) {
    return jsonError("Unauthorized", 401);
  }

  const body = await request.json().catch(() => null);
  const parsed = previewRequestSchema.safeParse(body);

  if (!parsed.success) {
    return jsonError("Invalid preview payload.");
  }

  const env = getEnv();

  if (Buffer.byteLength(parsed.data.markdown, "utf8") > env.MAX_MARKDOWN_BYTES) {
    return jsonError(`Markdown exceeds ${env.MAX_MARKDOWN_BYTES} bytes.`);
  }

  const assetIds = parsed.data.assetIds;
  const assets = await getOwnedAssets(user.id, assetIds);

  if (assets.length !== assetIds.length) {
    return jsonError("One or more assets do not belong to the current user.");
  }

  const result = await renderMarkdownToHtml({
    markdown: parsed.data.markdown,
    assets: toRenderAssets(assets),
    options: parsed.data.options
  });

  const previewBlockingIssueCodes = new Set(["missing_markdown", "raw_html_not_allowed"]);
  const canRenderPreview = result.validation.issues.every(
    (issue) => !previewBlockingIssueCodes.has(issue.code)
  );

  return NextResponse.json({
    html: canRenderPreview ? result.html : "",
    issues: result.validation.issues
  });
}
