"use client";
import React from "react";
import { useRouter } from "next/navigation";

export default function CuentaPage() {
  const router = useRouter();

  return (
    <div className="p-4">
      {/* Botón volver */}
      <button
        onClick={() => router.back()}
        className="text-blue-600 underline mb-4"
        aria-label="Regresar"
      >
        ← Regresar
      </button>

      {/* Botón volver a la página principal */}
      <button
        onClick={() => router.push("/")}
        className="ml-4 text-blue-600 underline mb-4"
        aria-label="Ir a inicio"
      >
        ← Inicio
      </button>

      {/* ...existing JSX (resto de la página) ... */}
    </div>
  );
}