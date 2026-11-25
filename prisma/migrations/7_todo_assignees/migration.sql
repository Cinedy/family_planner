-- CreateTable
CREATE TABLE "TodoAssignee" (
    "todoId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "TodoAssignee_pkey" PRIMARY KEY ("todoId","userId")
);

-- CreateIndex
CREATE INDEX "TodoAssignee_userId_idx" ON "TodoAssignee"("userId");

-- AddForeignKey
ALTER TABLE "TodoAssignee" ADD CONSTRAINT "TodoAssignee_todoId_fkey" FOREIGN KEY ("todoId") REFERENCES "TodoItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TodoAssignee" ADD CONSTRAINT "TodoAssignee_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Copy existing single assignees into the new table
INSERT INTO "TodoAssignee" ("todoId", "userId")
SELECT "id", "assignedToId" FROM "TodoItem" WHERE "assignedToId" IS NOT NULL
ON CONFLICT DO NOTHING;
