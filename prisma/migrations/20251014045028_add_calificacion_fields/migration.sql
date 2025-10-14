-- AlterTable
ALTER TABLE "public"."LugarTuristico" ADD COLUMN     "calificacionTotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "numeroCalificaciones" INTEGER NOT NULL DEFAULT 0;
