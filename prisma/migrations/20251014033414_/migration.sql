-- CreateTable
CREATE TABLE "public"."Indicador" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "categoria" TEXT NOT NULL,
    "meta" DOUBLE PRECISION NOT NULL,
    "unidad" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Indicador_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ValorIndicador" (
    "id" SERIAL NOT NULL,
    "indicadorId" INTEGER NOT NULL,
    "valorActual" DOUBLE PRECISION NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ValorIndicador_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "public"."ValorIndicador" ADD CONSTRAINT "ValorIndicador_indicadorId_fkey" FOREIGN KEY ("indicadorId") REFERENCES "public"."Indicador"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
