-- AlterTable
ALTER TABLE "Family" ADD COLUMN     "groceryCategoryHints" JSONB NOT NULL DEFAULT '{}',
ADD COLUMN     "groceryCategoryOrder" TEXT[] DEFAULT ARRAY['frukt-gront', 'brod', 'kjott-fisk', 'palegg', 'meieri', 'torrvarer', 'krydder-saus', 'frys', 'drikke', 'snacks', 'hus-hygiene', 'annet']::TEXT[];
