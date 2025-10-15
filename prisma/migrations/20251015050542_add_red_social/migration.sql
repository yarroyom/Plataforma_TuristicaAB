-- CreateTable
CREATE TABLE "public"."RedSocial" (
    "id" SERIAL NOT NULL,
    "usuarioId" INTEGER NOT NULL,
    "nombre" TEXT NOT NULL,
    "link" TEXT NOT NULL,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RedSocial_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "public"."RedSocial" ADD CONSTRAINT "RedSocial_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "public"."Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
