// app/api/me/route.ts
import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";

export async function GET(req: NextRequest) {
  const token = req.cookies.get("token")?.value;
  if (!token) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  try {
    const payload: any = jwt.verify(token, process.env.JWT_SECRET!);
    return NextResponse.json({ id: payload.id, rol: payload.rol, correo: payload.correo });
  } catch (err) {
    return NextResponse.json({ error: "Token inválido" }, { status: 401 });
  }
}
