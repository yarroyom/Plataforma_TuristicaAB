import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';

export async function POST(req: NextRequest) {
  // Ruta deshabilitada: restablecimiento de contraseña no disponible por solicitud del equipo.
  return NextResponse.json({ error: 'Función deshabilitada' }, { status: 404 });
}
