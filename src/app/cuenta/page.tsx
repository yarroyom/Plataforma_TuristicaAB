"use client";
import React from "react";
import { useRouter } from "next/navigation";

export default function CuentaPage() {
  const router = useRouter();

  return (
    <div className="p-4 cuenta-page">
      {/* Botón volver */}
      <div className="mb-4 flex gap-3 items-center">
        <button
          onClick={() => router.back()}
          className="text-blue-600 underline"
          aria-label="Regresar"
        >
          ← Regresar
        </button>

        {/* Botón volver a la página principal */}
        <button
          onClick={() => router.push("/")}
          className="text-blue-600 underline"
          aria-label="Ir a inicio"
        >
          ← Inicio
        </button>
      </div>

      {/* Perfil: hero con foto y sección inferior con fondo gris claro */}
      <section className="profile-hero mb-6">
        <div className="profile-hero-inner container">
          <div className="profile-photo-wrap">
            <img src="/images/lugares/AB.jpeg" alt="Foto de perfil" className="profile-photo" />
          </div>
        </div>
      </section>

      <section className="profile-details container">
        <div className="profile-card">
          <h2 className="text-2xl font-bold">Nombre de usuario</h2>
          <p className="text-sm text-gray-600 mt-1">Correo: usuario@ejemplo.com</p>
          {/* Aquí el resto del contenido del perfil (sin cambios funcionales) */}
        </div>
      </section>
    </div>
  );
}