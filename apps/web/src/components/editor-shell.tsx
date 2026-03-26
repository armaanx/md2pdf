"use client";

import { markdown } from "@codemirror/lang-markdown";
import CodeMirror from "@uiw/react-codemirror";
import { startTransition, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";

type AssetSummary = {
  id: string;
  name: string;
  markdownUrl: string;
};

type JobSummary = {
  id: string;
  status: string;
  filename: string;
  createdAt: string;
  completedAt: string | null;
  downloadUrl: string | null;
  errorMessage: string | null;
};

type EditorShellProps = {
  userName: string;
  initialJobs: JobSummary[];
};

const starterMarkdown = `# md2pdf Studio

This renderer keeps the same print-first styling as your original script.

## Mermaid support

\`\`\`mermaid
flowchart TD
  A[Markdown] --> B[Renderer Service]
  B --> C[Chromium]
  C --> D[PDF]
\`\`\`

## Notes

- Upload assets to reference them as \`asset://<id>\`
- Raw HTML is disabled in v1
- Export runs through the worker queue
`;

export function EditorShell({ userName, initialJobs }: EditorShellProps) {
  const [markdownValue, setMarkdownValue] = useState(starterMarkdown);
  const deferredMarkdown = useDeferredValue(markdownValue);
  const [previewHtml, setPreviewHtml] = useState<string>("");
  const [validationIssues, setValidationIssues] = useState<string[]>([]);
  const [previewPending, setPreviewPending] = useState(false);
  const [uploadPending, setUploadPending] = useState(false);
  const [exportPending, setExportPending] = useState(false);
  const [assets, setAssets] = useState<AssetSummary[]>([]);
  const [jobs, setJobs] = useState<JobSummary[]>(initialJobs);
  const [toast, setToast] = useState<string | null>(null);
  const pollTimer = useRef<number | null>(null);

  const assetIds = useMemo(() => assets.map((asset) => asset.id), [assets]);

  useEffect(() => {
    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      setPreviewPending(true);

      const response = await fetch("/api/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          markdown: deferredMarkdown,
          assetIds
        }),
        signal: controller.signal
      });

      const payload = (await response.json()) as {
        html?: string;
        issues?: Array<{ message: string }>;
      };

      startTransition(() => {
        setPreviewPending(false);
        setPreviewHtml(payload.html ?? "");
        setValidationIssues(payload.issues?.map((issue) => issue.message) ?? []);
      });
    }, 350);

    return () => {
      controller.abort();
      window.clearTimeout(timeout);
    };
  }, [assetIds, deferredMarkdown]);

  useEffect(() => {
    const activeJobs = jobs.filter((job) => job.status === "queued" || job.status === "rendering");

    if (!activeJobs.length) {
      if (pollTimer.current) {
        window.clearInterval(pollTimer.current);
        pollTimer.current = null;
      }
      return;
    }

    if (pollTimer.current) {
      return;
    }

    pollTimer.current = window.setInterval(async () => {
      const nextJobs = await Promise.all(
        activeJobs.map(async (job) => {
          const response = await fetch(`/api/jobs/${job.id}`, { cache: "no-store" });

          if (!response.ok) {
            return job;
          }

          return (await response.json()) as JobSummary;
        })
      );

      startTransition(() => {
        setJobs((current) =>
          current.map((job) => nextJobs.find((candidate) => candidate.id === job.id) ?? job)
        );
      });
    }, 2_000);

    return () => {
      if (pollTimer.current) {
        window.clearInterval(pollTimer.current);
        pollTimer.current = null;
      }
    };
  }, [jobs]);

  async function handleUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);

    if (!files.length) {
      return;
    }

    setUploadPending(true);

    try {
      const uploadedAssets: AssetSummary[] = [];

      for (const file of files) {
        const formData = new FormData();
        formData.append("file", file);

        const response = await fetch("/api/assets", {
          method: "POST",
          body: formData
        });

        const payload = (await response.json()) as AssetSummary & { error?: string };

        if (!response.ok) {
          throw new Error(payload.error ?? `Failed to upload ${file.name}.`);
        }

        uploadedAssets.push({
          id: payload.id,
          name: payload.name,
          markdownUrl: payload.markdownUrl
        });
      }

      setAssets((current) => [...uploadedAssets, ...current]);
      setMarkdownValue((current) =>
        `${current}\n${uploadedAssets.map((asset) => `![${asset.name}](${asset.markdownUrl})`).join("\n")}\n`
      );
      setToast(`${uploadedAssets.length} asset${uploadedAssets.length > 1 ? "s" : ""} uploaded.`);
      event.target.value = "";
    } catch (error) {
      setToast(error instanceof Error ? error.message : "Upload failed.");
    } finally {
      setUploadPending(false);
    }
  }

  async function handleExport() {
    setExportPending(true);

    const response = await fetch("/api/jobs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        markdown: markdownValue,
        assetIds,
        filename: "document.pdf"
      })
    });

    const payload = (await response.json()) as
      | ({ issues?: Array<{ message: string }>; error?: string } & Partial<JobSummary>)
      | {
          jobId: string;
          status: string;
          filename: string;
          createdAt: string;
        };

    if (!response.ok) {
      if ("issues" in payload && payload.issues?.length) {
        setValidationIssues(payload.issues.map((issue) => issue.message));
      } else {
        const message = "error" in payload ? payload.error : undefined;
        setToast(message ?? "Failed to queue export.");
      }

      setExportPending(false);
      return;
    }

    const successPayload = payload as {
      jobId: string;
      status: string;
      filename: string;
      createdAt: string;
    };

    setJobs((current) => [
      {
        id: successPayload.jobId,
        status: successPayload.status,
        filename: successPayload.filename,
        createdAt: successPayload.createdAt,
        completedAt: null,
        downloadUrl: null,
        errorMessage: null
      },
      ...current
    ]);
    setToast("Export queued.");
    setExportPending(false);
  }

  return (
    <div className="grid min-h-screen grid-cols-1 gap-6 px-4 py-6 lg:grid-cols-[1.05fr_0.95fr] lg:px-6">
      <section className="panel rounded-[30px] p-5 lg:p-6">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#12677c]">
              Workspace
            </p>
            <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-[#102431]">
              {userName}&apos;s renderer bench
            </h1>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <label className="rounded-2xl border border-[#d9e2ec] bg-white px-4 py-3 text-sm font-semibold text-[#24394d] transition hover:border-[#12677c]">
              <input type="file" multiple className="hidden" onChange={handleUpload} />
              {uploadPending ? "Uploading..." : "Upload assets"}
            </label>
            <button
              type="button"
              onClick={handleExport}
              disabled={exportPending}
              className="rounded-2xl bg-[#12677c] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#0f5161] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {exportPending ? "Queueing..." : "Export PDF"}
            </button>
          </div>
        </div>

        {toast ? (
          <div className="mb-4 rounded-2xl border border-[#d7eef1] bg-[#f3fbfc] px-4 py-3 text-sm text-[#0f5161]">
            {toast}
          </div>
        ) : null}

        <div className="grid gap-4 xl:grid-cols-[1fr_20rem]">
          <div className="overflow-hidden rounded-[24px] border border-[#d9e2ec] bg-white">
            <CodeMirror
              value={markdownValue}
              height="70vh"
              extensions={[markdown()]}
              onChange={(value: string) => setMarkdownValue(value)}
              basicSetup={{
                lineNumbers: true,
                highlightActiveLine: false,
                foldGutter: false
              }}
            />
          </div>

          <div className="space-y-4">
            <div className="rounded-[24px] border border-[#d9e2ec] bg-[#f8fbfd] p-4">
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#12677c]">
                Asset tokens
              </p>
              <div className="mt-3 space-y-3">
                {assets.length ? (
                  assets.map((asset) => (
                    <div key={asset.id} className="rounded-2xl border border-[#d9e2ec] bg-white p-3">
                      <p className="text-sm font-semibold text-[#102431]">{asset.name}</p>
                      <p className="mt-1 break-all font-mono text-xs text-[#5b6b7f]">
                        {asset.markdownUrl}
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm leading-6 text-[#5b6b7f]">
                    Upload images and they will be inserted as <code>asset://id</code> references.
                  </p>
                )}
              </div>
            </div>

            <div className="rounded-[24px] border border-[#d9e2ec] bg-[#fffdf6] p-4">
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#7a5c12]">
                Validation
              </p>
              <div className="mt-3 space-y-2">
                {validationIssues.length ? (
                  validationIssues.map((issue) => (
                    <div
                      key={issue}
                      className="rounded-2xl border border-[#fed7aa] bg-white px-3 py-2 text-sm text-[#9a3412]"
                    >
                      {issue}
                    </div>
                  ))
                ) : (
                  <p className="text-sm leading-6 text-[#5b6b7f]">
                    {previewPending ? "Refreshing preview..." : "Markdown is ready for rendering."}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-6">
        <div className="panel overflow-hidden rounded-[30px]">
          <div className="flex items-center justify-between border-b border-[#d9e2ec] px-5 py-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#12677c]">
                Live preview
              </p>
              <p className="mt-1 text-sm text-[#5b6b7f]">
                Server-rendered preview using the same renderer package.
              </p>
            </div>
            <span className="rounded-full bg-[#e4f3f6] px-3 py-1 text-xs font-semibold text-[#0f5161]">
              {previewPending ? "Updating" : "In sync"}
            </span>
          </div>
          <div className="h-[56vh] bg-[#edf2f7] p-4">
            {previewHtml ? (
              <iframe
                title="Markdown preview"
                srcDoc={previewHtml}
                className="h-full w-full rounded-[22px] border border-[#d9e2ec] bg-white"
              />
            ) : (
              <div className="flex h-full items-center justify-center rounded-[22px] border border-dashed border-[#d9e2ec] bg-white text-sm text-[#5b6b7f]">
                Fix validation issues to see the live preview.
              </div>
            )}
          </div>
        </div>

        <div className="panel rounded-[30px] p-5">
          <div className="mb-4">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#12677c]">
              Job queue
            </p>
            <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-[#102431]">
              Recent exports
            </h2>
          </div>

          <div className="space-y-3">
            {jobs.length ? (
              jobs.map((job) => (
                <div key={job.id} className="rounded-[22px] border border-[#d9e2ec] bg-white p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-[#102431]">{job.filename}</p>
                      <p className="mt-1 text-xs uppercase tracking-[0.12em] text-[#5b6b7f]">
                        {job.status}
                      </p>
                    </div>
                    {job.downloadUrl ? (
                      <a
                        href={job.downloadUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-xl bg-[#12677c] px-3 py-2 text-xs font-semibold text-white"
                      >
                        Download
                      </a>
                    ) : null}
                  </div>

                  {job.errorMessage ? (
                    <p className="mt-3 rounded-2xl border border-[#fecaca] bg-[#fff5f5] px-3 py-2 text-sm text-[#991b1b]">
                      {job.errorMessage}
                    </p>
                  ) : null}

                  <p className="mt-3 text-sm text-[#5b6b7f]">
                    Created {new Date(job.createdAt).toLocaleString()}
                    {job.completedAt ? ` • Finished ${new Date(job.completedAt).toLocaleString()}` : ""}
                  </p>
                </div>
              ))
            ) : (
              <div className="rounded-[22px] border border-dashed border-[#d9e2ec] bg-white p-6 text-sm text-[#5b6b7f]">
                No exports yet. Queue your first PDF from the editor.
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
