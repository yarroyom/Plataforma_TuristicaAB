-- CreateEnum
CREATE TYPE "public"."TipoLugar" AS ENUM ('TURISTICO', 'CULTURAL');

-- AlterTable
ALTER TABLE "public"."LugarTuristico" ADD COLUMN     "tipo" "public"."TipoLugar" NOT NULL DEFAULT 'TURISTICO';
