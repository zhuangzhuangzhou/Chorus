-- CreateTable
CREATE TABLE "TaskDependency" (
    "id" SERIAL NOT NULL,
    "taskUuid" TEXT NOT NULL,
    "dependsOnUuid" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TaskDependency_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TaskDependency_taskUuid_idx" ON "TaskDependency"("taskUuid");

-- CreateIndex
CREATE INDEX "TaskDependency_dependsOnUuid_idx" ON "TaskDependency"("dependsOnUuid");

-- CreateIndex
CREATE UNIQUE INDEX "TaskDependency_taskUuid_dependsOnUuid_key" ON "TaskDependency"("taskUuid", "dependsOnUuid");
