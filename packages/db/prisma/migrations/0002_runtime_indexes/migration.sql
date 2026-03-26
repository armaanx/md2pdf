-- CreateIndex
CREATE INDEX "Asset_ownerId_expiresAt_idx" ON "Asset"("ownerId", "expiresAt");

-- CreateIndex
CREATE INDEX "Job_ownerId_status_idx" ON "Job"("ownerId", "status");
