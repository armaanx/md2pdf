import { describe, expect, it } from "vitest";
import { renderMarkdownToHtml, validateMarkdown } from "./render";

describe("validateMarkdown", () => {
  it("rejects raw html", () => {
    const result = validateMarkdown({
      markdown: "# Test\n\n<div>unsafe</div>"
    });

    expect(result.ok).toBe(false);
    expect(result.issues.some((issue) => issue.code === "raw_html_not_allowed")).toBe(true);
  });

  it("rejects unsupported remote image urls", () => {
    const result = validateMarkdown({
      markdown: "![Example](https://example.com/image.png)"
    });

    expect(result.ok).toBe(false);
    expect(result.issues.some((issue) => issue.code === "unsupported_image_source")).toBe(true);
  });
});

describe("renderMarkdownToHtml", () => {
  it("rewrites approved asset references into the render document", async () => {
    const result = await renderMarkdownToHtml({
      markdown: "![Asset](asset://abc123)",
      assets: [{ id: "abc123", url: "https://assets.local/file.png" }]
    });

    expect(result.validation.ok).toBe(true);
    expect(result.html).toContain("https://assets.local/file.png");
  });
});
