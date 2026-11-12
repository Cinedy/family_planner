-- AlterTable
ALTER TABLE "Family" ADD COLUMN     "pantryStaples" TEXT[] DEFAULT ARRAY['salt', 'pepper', 'olje', 'olivenolje', 'smør', 'sukker', 'hvetemel']::TEXT[];

-- AlterTable
ALTER TABLE "MealPlanEntry" ADD COLUMN     "ingredients" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- AlterTable
ALTER TABLE "Recipe" ADD COLUMN     "ingredients" TEXT[] DEFAULT ARRAY[]::TEXT[];
