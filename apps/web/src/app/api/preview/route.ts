import { renderMarkdownToHtml } from "@md2pdf/renderer/html";
import { NextResponse } from "next/server";
import { MAX_MARKDOWN_BYTES, previewRequestSchema } from "@/lib/schemas";

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = previewRequestSchema.safeParse(body);

  if (!parsed.success) {
    return jsonError("Invalid preview payload.");
  }

  if (Buffer.byteLength(parsed.data.markdown, "utf8") > MAX_MARKDOWN_BYTES) {
    return jsonError(`Markdown exceeds ${MAX_MARKDOWN_BYTES} bytes.`);
  }

  const result = await renderMarkdownToHtml({
    markdown: parsed.data.markdown,
    assets: [],
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
