import { createServer } from "node:http";
import { EventEmitter } from "node:events";
import path from "node:path";
import { prepareDocument, generatePreviewHtml, recordHistory } from "@md2pdf/cli-core";
import type { PreviewSessionState } from "@md2pdf/cli-core";

function buildPreviewShell(title: string) {
  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${title}</title>
    <style>
      * { box-sizing: border-box; }
      html, body { margin: 0; padding: 0; height: 100%; background: #0d1117; color: #d0d7de; font-family: ui-sans-serif, system-ui, sans-serif; }
      header { display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; border-bottom: 1px solid rgba(208, 215, 222, 0.16); }
      .badge { display: inline-flex; align-items: center; gap: 8px; padding: 6px 10px; border-radius: 999px; background: rgba(56, 139, 253, 0.14); color: #7cc0ff; font-size: 12px; }
      iframe { width: 100%; height: calc(100vh - 58px); border: 0; background: #111827; }
    </style>
  </head>
  <body>
    <header>
      <strong>${title}</strong>
      <span class="badge">Live Preview</span>
    </header>
    <iframe id="preview-frame" src="/document"></iframe>
    <script>
      const events = new EventSource("/events");
      events.onmessage = () => {
        const frame = document.getElementById("preview-frame");
        if (frame instanceof HTMLIFrameElement) {
          frame.src = "/document?t=" + Date.now();
        }
      };
    </script>
  </body>
</html>`;
}

export async function startPreviewServer(inputPath: string, port: number) {
  const updates = new EventEmitter();
  let currentHtml = "";
  let currentError = "";
  let sessionState: PreviewSessionState | null = null;

  async function refreshPreview(kind: "startup" | "watch" = "watch") {
    const startedAt = Date.now();
    const prepared = await prepareDocument(inputPath);
    const preview = await generatePreviewHtml(prepared);

    currentHtml = preview.html;
    currentError = preview.validation.ok
      ? ""
      : preview.validation.issues.map((issue) => issue.message).join("\n");

    sessionState = {
      id: path.basename(inputPath),
      port,
      inputPath: prepared.inputPath,
      watched: true,
      themePreset: prepared.theme.presetId,
      startedAt: sessionState?.startedAt ?? new Date().toISOString(),
      lastRenderedAt: new Date().toISOString(),
      issueCount: preview.validation.issues.length,
      openUrl: `http://127.0.0.1:${port}`
    };

    if (kind === "startup") {
      await recordHistory(prepared.workspace, {
        kind: "preview",
        inputPath: prepared.inputPath,
        outputPath: null,
        title: prepared.title,
        themePreset: prepared.theme.presetId,
        status: preview.validation.ok ? "success" : "error",
        durationMs: Date.now() - startedAt,
        issueCount: preview.validation.issues.length,
        notes: preview.validation.ok ? undefined : currentError
      });
    }

    updates.emit("refresh");
  }

  await refreshPreview("startup");

  const server = createServer((request, response) => {
    const requestUrl = request.url ?? "/";

    if (requestUrl.startsWith("/document")) {
      response.writeHead(currentError ? 422 : 200, {
        "Content-Type": "text/html; charset=utf-8"
      });
      response.end(
        currentError
          ? `<pre style="font-family: ui-monospace, monospace; padding: 24px; white-space: pre-wrap;">${currentError}</pre>`
          : currentHtml
      );
      return;
    }

    if (requestUrl.startsWith("/events")) {
      response.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive"
      });
      response.write("retry: 1000\n\n");
      const handler = () => {
        response.write(`data: ${Date.now()}\n\n`);
      };
      updates.on("refresh", handler);
      request.on("close", () => updates.off("refresh", handler));
      return;
    }

    response.writeHead(200, {
      "Content-Type": "text/html; charset=utf-8"
    });
    response.end(buildPreviewShell(path.basename(inputPath)));
  });

  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, "127.0.0.1", () => resolve());
  });

  return {
    sessionState,
    refreshPreview,
    close: () =>
      new Promise<void>((resolve, reject) => {
        server.close((error) => {
          if (error) {
            reject(error);
            return;
          }

          resolve();
        });
      })
  };
}
