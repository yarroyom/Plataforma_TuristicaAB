"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [form, setForm] = useState({ correo: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
        credentials: "include",
      });

      if (res.ok) {
        // extraer id del usuario desde la respuesta y registrar acceso
        try {
          const data = await res.json();
          const usuarioId = data?.id ?? null;
          // intentar notificar el indicador en background; si falla, no bloqueamos el login
          try {
            await fetch("/api/indicadores/accesos", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ usuarioId, fuente: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown' }),
            });
            // registrar clic en la página de login (fire-and-forget)
            try {
              fetch("/api/indicadores/clics", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ pagina: "login", usuarioId }),
              }).catch(() => null);
            } catch {}
          } catch (e) {
            // log en cliente para depuración; no interrumpe el flujo de login
            console.warn("No se pudo registrar indicador de accesos:", e);
          }
        } catch (e) {
          // Si no podemos parsear el body, continuar con redirección
          console.warn("Login: no se pudo parsear respuesta para indicador", e);
        }

        router.push("/principal"); // redirige si login exitoso
      } else {
        const data = await res.json();
        setError(data.error || "Correo o contraseña incorrectos");
      }
    } catch (err) {
      console.error(err);
      setError("Ocurrió un error al conectar con el servidor");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page flex items-center justify-center min-h-screen">
      <div className="w-full max-w-md p-8 space-y-6 bg-white shadow-lg rounded-2xl">
        {/* Imagen arriba del formulario */}
        <img
          src="/images/lugares/AB.jpeg"
          alt="Logo Agua Blanca"
          className="mx-auto w-24 h-24 object-cover rounded-md mb-3"
        />
        <h2 className="text-2xl font-bold text-center text-gray-800">
          Iniciar Sesión
        </h2>

        {error && <p className="text-red-500 text-center">{error}</p>}

        <form className="space-y-4" onSubmit={handleSubmit}>
          <input
            type="email"
            placeholder="Correo"
            value={form.correo}
            onChange={(e) => setForm({ ...form, correo: e.target.value })}
            required
            className="w-full px-4 py-2 border rounded-lg"
          />
          <input
            type="password"
            placeholder="Contraseña"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            required
            className="w-full px-4 py-2 border rounded-lg"
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            {loading ? "Ingresando..." : "Entrar"}
          </button>

          {/* Opción de registro debajo del botón */}
          <div className="text-center mt-3">
            <span className="text-sm text-gray-600">¿No tienes cuenta?</span>{" "}
            <a
              href="/register"
              className="text-sm text-green-600 hover:underline"
            >
              Regístrate
            </a>
            {/* Recuperación de contraseña removida */}
          </div>
        </form>
      </div>
      
    </div>
  );
}
