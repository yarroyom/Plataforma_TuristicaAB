import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function POST(req: NextRequest) {
  // Endpoint de pruebas deshabilitado: dejar disponible en código causaba pruebas accidentales.
  return NextResponse.json({ error: 'Función deshabilitada' }, { status: 404 });
}
