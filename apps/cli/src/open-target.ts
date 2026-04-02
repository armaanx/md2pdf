import { spawn } from "node:child_process";
import open from "open";

type OpenTargetResult =
  | {
      ok: true;
    }
  | {
      ok: false;
      message: string;
    };

function spawnDetached(command: string, args: string[]) {
  return new Promise<void>((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: "ignore",
      detached: true,
      windowsHide: true
    });

    child.once("error", reject);
    child.once("spawn", () => {
      child.unref();
      resolve();
    });
  });
}

async function fallbackOpen(target: string) {
  if (process.platform === "win32") {
    await spawnDetached("cmd.exe", ["/c", "start", "", target]);
    return;
  }

  if (process.platform === "darwin") {
    await spawnDetached("open", [target]);
    return;
  }

  await spawnDetached("xdg-open", [target]);
}

export async function openTarget(target: string): Promise<OpenTargetResult> {
  try {
    await open(target);
    return { ok: true };
  } catch (primaryError) {
    try {
      await fallbackOpen(target);
      return { ok: true };
    } catch (fallbackError) {
      const primaryMessage =
        primaryError instanceof Error ? primaryError.message : "Unknown launcher failure.";
      const fallbackMessage =
        fallbackError instanceof Error ? fallbackError.message : "Unknown fallback failure.";

      return {
        ok: false,
        message: `Unable to open "${target}". Primary launcher failed: ${primaryMessage} Fallback failed: ${fallbackMessage}`
      };
    }
  }
}
