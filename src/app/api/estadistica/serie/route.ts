import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json(
    { error: "Endpoint desactivado. Use /api/estadistica con fechaInicio/fechaFin." },
    { status: 404 }
  );
}
