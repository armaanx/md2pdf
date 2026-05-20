import { renderMarkdownToPdf } from "@md2pdf/renderer/pdf";
import { NextResponse } from "next/server";
import {
  convertRequestSchema,
  MAX_MARKDOWN_BYTES,
  RENDER_TIMEOUT_MS
} from "@/lib/schemas";

export const runtime = "nodejs";
export const maxDuration = 300;

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = convertRequestSchema.safeParse(body);

  if (!parsed.success) {
    return jsonError("Invalid convert payload.");
  }

  if (Buffer.byteLength(parsed.data.markdown, "utf8") > MAX_MARKDOWN_BYTES) {
    return jsonError(`Markdown exceeds ${MAX_MARKDOWN_BYTES} bytes.`);
  }

  try {
    const pdf = await renderMarkdownToPdf({
      markdown: parsed.data.markdown,
      assets: [],
      options: {
        ...parsed.data.options,
        title: parsed.data.options?.title ?? parsed.data.filename ?? "Document",
        timeoutMs: parsed.data.options?.timeoutMs ?? RENDER_TIMEOUT_MS
      }
    });

    const filename = (parsed.data.filename ?? "document.pdf").replace(/\.pdf$/i, "") + ".pdf";

    return new NextResponse(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "PDF conversion failed.";

    if (
      message.includes("Raw HTML") ||
      message.includes("Markdown validation") ||
      message.includes("asset")
    ) {
      return NextResponse.json({ error: message, issues: [{ message }] }, { status: 400 });
    }

    return jsonError(message, 500);
  }
}
