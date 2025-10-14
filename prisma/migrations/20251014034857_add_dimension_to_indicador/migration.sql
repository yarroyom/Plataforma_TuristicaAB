/*
  Warnings:

  - Added the required column `dimension` to the `Indicador` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."Indicador" ADD COLUMN     "dimension" TEXT NOT NULL;
