-- AlterTable: Add ON DELETE CASCADE to Project.companyId foreign key
-- This allows deleting a Company to automatically cascade-delete all its Projects

-- Drop the existing foreign key constraint
ALTER TABLE "Project" DROP CONSTRAINT "Project_companyId_fkey";

-- Re-add it with ON DELETE CASCADE
ALTER TABLE "Project" ADD CONSTRAINT "Project_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
