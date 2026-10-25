-- AlterTable
ALTER TABLE "Employee" ADD COLUMN     "linkedinUrl" TEXT,
ADD COLUMN     "professionalProfile" JSONB;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "avatarUrl" TEXT,
ADD COLUMN     "linkedinSub" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "User_linkedinSub_key" ON "User"("linkedinSub");

