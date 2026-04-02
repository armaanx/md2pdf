import { appendFile, mkdir, readFile } from "node:fs/promises";
import type { RenderHistoryEntry, WorkspaceContext } from "./types";

export async function appendRenderHistory(
  workspace: WorkspaceContext,
  entry: RenderHistoryEntry
) {
  await mkdir(workspace.workspaceDir, { recursive: true });
  await appendFile(workspace.historyPath, `${JSON.stringify(entry)}\n`, "utf8");
}

export async function listRenderHistory(
  workspace: WorkspaceContext,
  take = 10
): Promise<RenderHistoryEntry[]> {
  try {
    const raw = await readFile(workspace.historyPath, "utf8");
    return raw
      .split(/\r?\n/)
      .filter(Boolean)
      .map((line) => JSON.parse(line) as RenderHistoryEntry)
      .slice(-take)
      .reverse();
  } catch {
    return [];
  }
}
