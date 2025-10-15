import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const { tiempo } = await req.json();

  console.log("Tiempo recibido:", tiempo); // <-- log para depuración

  if (typeof tiempo !== "number" || tiempo <= 0) {
    return new Response(JSON.stringify({ error: "Tiempo inválido" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const registro = await prisma.valorIndicador.create({
    data: {
      indicadorId: 54, // <-- usa el id correcto
      valorActual: tiempo,
      fecha: new Date(),
    },
  });

  console.log("Registro guardado:", registro); // <-- log para confirmar

  return new Response(JSON.stringify({ ok: true }), {
    status: 201,
    headers: { "Content-Type": "application/json" },
  });
}
