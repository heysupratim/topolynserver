-- CreateTable
CREATE TABLE "_ItemLinks" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,
    CONSTRAINT "_ItemLinks_A_fkey" FOREIGN KEY ("A") REFERENCES "InventoryItem" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "_ItemLinks_B_fkey" FOREIGN KEY ("B") REFERENCES "InventoryItem" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "_ItemLinks_AB_unique" ON "_ItemLinks"("A", "B");

-- CreateIndex
CREATE INDEX "_ItemLinks_B_index" ON "_ItemLinks"("B");
