import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import nodemailer from "nodemailer";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';

export async function POST(req: NextRequest) {
  // Ruta deshabilitada: la funcionalidad 'Olvidé la contraseña' fue removida del login por solicitud del equipo.
  return NextResponse.json({ error: 'Función deshabilitada' }, { status: 404 });
}
