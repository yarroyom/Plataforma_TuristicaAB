"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    nombre: "",
    correo: "",
    password: "",
    rol: "TURISTA",
  });
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);

    // Validación básica
    if (!form.nombre || !form.correo || !form.password || !form.rol) {
      setMsg("Todos los campos son obligatorios");
      return;
    }
    setLoading(true);

    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json().catch(() => ({}));

      if (res.ok) {
        setMsg("Registro exitoso ✅. Redirigiendo al login...");
        setForm({
          nombre: "",
          correo: "",
          password: "",
          rol: "TURISTA",
        });

        setTimeout(() => {
          router.push("/login");
        }, 1500);
      } else {
        setMsg(data.error || "Error al registrar usuario");
      }
    } catch (err) {
      console.error(err);
      setMsg("Error del servidor");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Botón fijo en esquina superior izquierda del viewport (fuera del contenedor centrado) */}
      <button
        onClick={() => router.push("/login")}
        className="fixed top-4 left-4 z-50 px-3 py-1 bg-gray-100 text-gray-800 rounded shadow hover:bg-gray-200"
        aria-label="Volver al login"
      >
        ← Login
      </button>

      <div className="login-page flex items-center justify-center min-h-screen">
        <div className="w-full max-w-md p-8 space-y-6 bg-white shadow-lg rounded-2xl">
          {/* Imagen arriba del formulario (mismo logo que en login) */}
          <img
            src="/images/lugares/AB.jpeg"
            alt="Logo Agua Blanca"
            className="mx-auto w-24 h-24 object-cover rounded-md mb-3"
          />

          <h2 className="text-2xl font-bold text-center text-gray-800">
            Crear cuenta
          </h2>

          {/* === FORM: envuelve campos y botón para que onSubmit funcione === */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <input
              type="text"
              placeholder="Nombre"
              value={form.nombre}
              onChange={(e) => setForm({ ...form, nombre: e.target.value })}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-400 focus:outline-none"
              required
            />

            <input
              type="email"
              placeholder="Correo"
              value={form.correo}
              onChange={(e) => setForm({ ...form, correo: e.target.value })}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-400 focus:outline-none"
              required
            />

            <input
              type="password"
              placeholder="Contraseña"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-400 focus:outline-none"
              required
            />

            <select
              value={form.rol}
              onChange={(e) => setForm({ ...form, rol: e.target.value })}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-400 focus:outline-none"
              required
            >
              <option value="TURISTA">Turista</option>
              <option value="EMPRENDEDOR">Emprendedor</option>
            </select>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              {loading ? "Registrando..." : "Registrarse"}
            </button>
          </form>

          {msg && <p className="text-center text-sm text-red-600">{msg}</p>}
        </div>
      </div>
    </>
  );
}