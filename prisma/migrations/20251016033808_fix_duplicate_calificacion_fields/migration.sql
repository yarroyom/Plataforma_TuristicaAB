-- CreateTable
CREATE TABLE "public"."Rating" (
    "id" SERIAL NOT NULL,
    "lugarId" INTEGER NOT NULL,
    "usuarioId" INTEGER NOT NULL,
    "valor" INTEGER NOT NULL,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Rating_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Rating_lugarId_usuarioId_key" ON "public"."Rating"("lugarId", "usuarioId");
