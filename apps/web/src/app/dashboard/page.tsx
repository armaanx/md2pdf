import { listRecentJobsForUser } from "@md2pdf/db";
import { redirect } from "next/navigation";
import { EditorShell } from "@/components/editor-shell";
import { getCurrentUser } from "@/lib/auth";

export default async function DashboardPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const jobs = await listRecentJobsForUser(user.id, 10);

  return (
    <EditorShell
      userName={user.name}
      initialJobs={jobs.map((job) => ({
        id: job.id,
        status: job.status,
        filename: job.filename,
        createdAt: job.createdAt.toISOString(),
        completedAt: job.completedAt?.toISOString() ?? null,
        downloadUrl: null,
        errorMessage: job.errorMessage
      }))}
    />
  );
}
