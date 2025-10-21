import { NextRequest } from "next/server";
// Delegar al handler central para mantener la lógica en un solo sitio
import * as ResenasRoute from "@/app/api/resenas/route";

export async function DELETE(req: NextRequest, context: any) {
  // Llamar al DELETE exportado en el archivo principal y pasar el context
  return await (ResenasRoute.DELETE as any)(req, context);
}
