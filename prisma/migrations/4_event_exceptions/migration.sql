-- AlterTable
ALTER TABLE "CalendarEvent" ADD COLUMN     "recurrenceExceptions" TEXT[] DEFAULT ARRAY[]::TEXT[];
