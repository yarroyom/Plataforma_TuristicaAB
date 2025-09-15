/*
  Warnings:

  - The `rol` column on the `Usuario` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "public"."Rol" AS ENUM ('TURISTA', 'EMPRENDEDOR');

-- AlterTable
ALTER TABLE "public"."Usuario" DROP COLUMN "rol",
ADD COLUMN     "rol" "public"."Rol" NOT NULL DEFAULT 'TURISTA';

-- CreateTable
CREATE TABLE "public"."EmprendedorPerfil" (
    "id" SERIAL NOT NULL,
    "usuarioId" INTEGER NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "telefono" TEXT,
    "direccion" TEXT,
    "foto" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmprendedorPerfil_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EmprendedorPerfil_usuarioId_key" ON "public"."EmprendedorPerfil"("usuarioId");

-- AddForeignKey
ALTER TABLE "public"."EmprendedorPerfil" ADD CONSTRAINT "EmprendedorPerfil_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "public"."Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
