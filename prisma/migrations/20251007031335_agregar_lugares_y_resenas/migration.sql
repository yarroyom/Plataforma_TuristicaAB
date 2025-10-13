-- CreateTable
CREATE TABLE "public"."LugarTuristico" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "imagen_url" TEXT,
    "latitud" DOUBLE PRECISION,
    "longitud" DOUBLE PRECISION,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LugarTuristico_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Reseña" (
    "id" SERIAL NOT NULL,
    "lugarId" INTEGER NOT NULL,
    "usuarioId" INTEGER NOT NULL,
    "comentario" TEXT NOT NULL,
    "imagen" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Reseña_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "public"."Reseña" ADD CONSTRAINT "Reseña_lugarId_fkey" FOREIGN KEY ("lugarId") REFERENCES "public"."LugarTuristico"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Reseña" ADD CONSTRAINT "Reseña_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "public"."Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
