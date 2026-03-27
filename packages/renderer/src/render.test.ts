import { describe, expect, it } from "vitest";
import { renderMarkdownToHtml, validateMarkdown } from "./html";

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
  it("renders markdown headings into html instead of leaving literal syntax in the preview", async () => {
    const result = await renderMarkdownToHtml({
      markdown: "# Technical Specification\n\n## Overview"
    });

    expect(result.validation.ok).toBe(true);
    expect(result.html).toContain("<article id=\"content\"><h1>Technical Specification</h1>");
    expect(result.html).toContain("<h2>Overview</h2>");
    expect(result.html).not.toContain("# Technical Specification");
    expect(result.html).not.toContain("## Overview");
  });

  it("rewrites approved asset references into the render document", async () => {
    const result = await renderMarkdownToHtml({
      markdown: "![Asset](asset://abc123)",
      assets: [{ id: "abc123", url: "https://assets.local/file.png" }]
    });

    expect(result.validation.ok).toBe(true);
    expect(result.html).toContain("https://assets.local/file.png");
  });
});
