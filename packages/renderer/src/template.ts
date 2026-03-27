import { getBrowserRuntimeScripts } from "./runtime";
import { getRenderThemeCssVariables, resolveRenderTheme, type RenderThemeConfig } from "./theme";

const css = String.raw`
      * {
        box-sizing: border-box;
      }

      html,
      body {
        margin: 0;
        padding: 0;
        background: radial-gradient(
          circle at top,
          color-mix(in srgb, var(--sheet-bg) 20%, var(--page-bg)) 0%,
          var(--page-bg) 62%
        );
        color: var(--text);
        font-family: var(--font-body);
        font-size: var(--font-size);
        line-height: var(--line-height);
        overflow-x: hidden;
      }

      body {
        padding: clamp(16px, 2vw, 0.3in);
      }

      .sheet {
        width: min(7.55in, 100%);
        margin: 0 auto;
        padding: var(--page-padding);
        background: linear-gradient(
          180deg,
          color-mix(in srgb, var(--sheet-bg) 90%, var(--page-bg)) 0%,
          var(--sheet-bg) 100%
        );
        box-shadow: var(--shadow);
        border-radius: var(--sheet-radius);
      }

      h1,
      h2,
      h3 {
        color: var(--text);
        margin: 0;
        line-height: 1.2;
        font-family: var(--font-heading);
      }

      h1 {
        font-size: var(--h1-size);
        font-weight: 800;
        letter-spacing: -0.03em;
        margin-bottom: 18px;
        padding-bottom: 14px;
        border-bottom: 3px solid var(--accent-soft);
      }

      h2 {
        font-size: var(--h2-size);
        font-weight: 800;
        margin-top: 28px;
        margin-bottom: 10px;
      }

      h3 {
        font-size: var(--h3-size);
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
        font-family: var(--font-mono);
        font-size: 0.9em;
        background: color-mix(in srgb, var(--accent-soft) 65%, #ffffff);
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
        background: var(--blockquote-bg);
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
        background: linear-gradient(
          180deg,
          color-mix(in srgb, var(--sheet-bg) 75%, var(--page-bg)) 0%,
          color-mix(in srgb, var(--sheet-bg) 92%, var(--blockquote-bg)) 100%
        );
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
        html,
        body,
        .sheet {
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
      }
`;

export async function buildHtmlDocument(
  contentHtml: string,
  title = "Markdown PDF",
  theme?: RenderThemeConfig
) {
  const runtimeScripts = await getBrowserRuntimeScripts();
  const embeddedTitle = JSON.stringify(title);
  const themeCss = getRenderThemeCssVariables(resolveRenderTheme(theme));

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${title}</title>
    <style>${runtimeScripts.fontCss}${themeCss}${css}</style>
  </head>
  <body>
    <main class="sheet">
      <article id="content">${contentHtml}</article>
    </main>
    <script>
      window.__MD2PDF_INPUT__ = {
        title: ${embeddedTitle}
      };
    </script>
    <script>${runtimeScripts.mermaidSource}</script>
    <script>${runtimeScripts.runtimeSource}</script>
  </body>
</html>`;
}
