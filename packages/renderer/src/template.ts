import { getBrowserRuntimeScripts } from "./runtime";

const css = String.raw`
      :root {
        --page-bg: #edf2f7;
        --sheet-bg: #ffffff;
        --text: #132238;
        --muted: #5b6b7f;
        --line: #d9e2ec;
        --accent: #12677c;
        --accent-soft: #e3f2f3;
        --code-bg: #0f172a;
        --code-text: #e2e8f0;
        --table-head: #f6fbfc;
        --shadow: 0 24px 60px rgba(15, 23, 42, 0.12);
      }

      * {
        box-sizing: border-box;
      }

      html,
      body {
        margin: 0;
        padding: 0;
        background: radial-gradient(circle at top, #f8fbff 0%, var(--page-bg) 62%);
        color: var(--text);
        font-family: "Manrope", sans-serif;
        line-height: 1.62;
        overflow-x: hidden;
      }

      body {
        padding: clamp(16px, 2vw, 0.3in);
      }

      .sheet {
        width: min(7.55in, 100%);
        margin: 0 auto;
        padding: 0.48in 0.52in 0.56in;
        background: linear-gradient(180deg, #ffffff 0%, #fcfeff 100%);
        box-shadow: var(--shadow);
      }

      h1,
      h2,
      h3 {
        color: #0f2d3a;
        margin: 0;
        line-height: 1.2;
      }

      h1 {
        font-size: 28px;
        font-weight: 800;
        letter-spacing: -0.03em;
        margin-bottom: 18px;
        padding-bottom: 14px;
        border-bottom: 3px solid var(--accent-soft);
      }

      h2 {
        font-size: 19px;
        font-weight: 800;
        margin-top: 28px;
        margin-bottom: 10px;
      }

      h3 {
        font-size: 15px;
        font-weight: 800;
        margin-top: 18px;
        margin-bottom: 8px;
      }

      p,
      ul,
      ol,
      table,
      pre,
      blockquote {
        margin-top: 0;
        margin-bottom: 12px;
      }

      ul,
      ol {
        padding-left: 22px;
      }

      li {
        margin: 4px 0;
      }

      code {
        font-family: "JetBrains Mono", monospace;
        font-size: 0.9em;
        background: #eef5f7;
        border-radius: 6px;
        padding: 2px 6px;
      }

      pre {
        background: var(--code-bg);
        color: var(--code-text);
        padding: 16px 18px;
        border-radius: 14px;
        overflow: hidden;
        white-space: pre-wrap;
        word-break: break-word;
        box-shadow: inset 0 0 0 1px rgba(148, 163, 184, 0.12);
      }

      pre code {
        background: transparent;
        color: inherit;
        padding: 0;
      }

      table {
        width: 100%;
        max-width: 100%;
        border-collapse: collapse;
        font-size: 13px;
        overflow: hidden;
        border-radius: 12px;
        box-shadow: inset 0 0 0 1px var(--line);
      }

      th,
      td {
        border: 1px solid var(--line);
        padding: 10px 12px;
        text-align: left;
        vertical-align: top;
      }

      th {
        background: var(--table-head);
        font-weight: 800;
      }

      blockquote {
        padding: 12px 16px;
        margin-left: 0;
        border-left: 4px solid var(--accent);
        background: #f7fbfc;
        color: var(--muted);
      }

      a {
        color: var(--accent);
        text-decoration: none;
      }

      hr {
        border: 0;
        border-top: 1px solid var(--line);
        margin: 24px 0;
      }

      .mermaid-card {
        margin: 16px 0 18px;
        padding: 14px;
        background: linear-gradient(180deg, #f7fbfc 0%, #ffffff 100%);
        border: 1px solid var(--line);
        border-radius: 16px;
        overflow: hidden;
      }

      .mermaid {
        display: flex;
        justify-content: center;
        align-items: center;
      }

      .mermaid svg {
        max-width: 100%;
        height: auto;
      }

      img,
      svg,
      canvas,
      iframe {
        max-width: 100%;
      }

      .render-error {
        padding: 14px 16px;
        border-radius: 16px;
        background: #fff5f5;
        border: 1px solid #fecaca;
        color: #991b1b;
      }

      @media print {
        body {
          padding: 0;
          background: #ffffff;
        }

        .sheet {
          width: 100%;
          margin: 0;
          box-shadow: none;
        }
      }
`;

export async function buildHtmlDocument(markdown: string, title = "Markdown PDF") {
  const runtimeScripts = await getBrowserRuntimeScripts();
  const embeddedMarkdown = JSON.stringify(markdown);
  const embeddedTitle = JSON.stringify(title);

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${title}</title>
    <style>${runtimeScripts.fontCss}${css}</style>
  </head>
  <body>
    <main class="sheet">
      <article id="content"></article>
    </main>
    <script>
      window.__MD2PDF_INPUT__ = {
        markdown: ${embeddedMarkdown},
        title: ${embeddedTitle}
      };
    </script>
    <script>${runtimeScripts.markedSource}</script>
    <script>${runtimeScripts.mermaidSource}</script>
    <script>${runtimeScripts.runtimeSource}</script>
  </body>
</html>`;
}
