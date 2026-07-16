-- AlterTable: Add invitationEmailSent column to CompanyMember
ALTER TABLE "CompanyMember" ADD COLUMN "invitationEmailSent" BOOLEAN NOT NULL DEFAULT false;
