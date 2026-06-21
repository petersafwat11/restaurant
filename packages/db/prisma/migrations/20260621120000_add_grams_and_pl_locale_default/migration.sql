-- AlterTable
ALTER TABLE "MenuItem" ADD COLUMN     "grams" INTEGER;

-- AlterTable
ALTER TABLE "User" ALTER COLUMN "locale" SET DEFAULT 'pl';
