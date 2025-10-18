-- CreateTable
CREATE TABLE "public"."Evento" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "creadoPor" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Evento_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "public"."Evento" ADD CONSTRAINT "Evento_creadoPor_fkey" FOREIGN KEY ("creadoPor") REFERENCES "public"."Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;
