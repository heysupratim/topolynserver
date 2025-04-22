/*
  Warnings:

  - You are about to drop the `_ItemLinks` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "_ItemLinks";
PRAGMA foreign_keys=on;

-- CreateTable
CREATE TABLE "ItemLink" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "linkType" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sourceItemId" TEXT NOT NULL,
    "targetItemId" TEXT NOT NULL,
    CONSTRAINT "ItemLink_sourceItemId_fkey" FOREIGN KEY ("sourceItemId") REFERENCES "InventoryItem" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ItemLink_targetItemId_fkey" FOREIGN KEY ("targetItemId") REFERENCES "InventoryItem" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "ItemLink_sourceItemId_targetItemId_key" ON "ItemLink"("sourceItemId", "targetItemId");
