"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface Lugar {
  id: number;
  nombre: string;
  imagen_url?: string;
}

export default function LugaresPage() {
  const [lugares, setLugares] = useState<Lugar[]>([]);
  const [usuarioLogueado, setUsuarioLogueado] = useState<{ id?: number; rol?: string }>({
    rol: "",
  });
  const router = useRouter();

  useEffect(() => {
    // Carga lista de lugares
    fetch("/api/lugares")
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) setLugares(data);
      });

    // Obtiene usuario actual (una sola vez)
    fetch("/api/me", { credentials: "include" })
      .then(r => {
        if (!r.ok) return null;
        return r.json();
      })
      .then(u => {
        if (u && u.rol) setUsuarioLogueado({ id: u.id, rol: u.rol });
      });
  }, []);

  // Eliminar lugar (solo ADMIN)
  const handleEliminar = async (id: number) => {
    if (!confirm("¿Confirmas eliminar este lugar? Esta acción es irreversible.")) return;
    try {
      const res = await fetch(`/api/lugares/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (res.ok) {
        setLugares(prev => prev.filter(l => l.id !== id));
        alert("Lugar eliminado");
      } else {
        const err = await res.json().catch(() => ({ error: "Error" }));
        alert(err.error || "No se pudo eliminar");
      }
    } catch (e) {
      alert("Error de conexión");
    }
  };

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">Lugares Turísticos</h1>
      <div className="flex flex-wrap gap-4">
        {lugares.length === 0 && (
          <div className="text-gray-500">No hay lugares registrados.</div>
        )}
        {lugares.map(l => (
          <div
            key={l.id}
            className="w-48 text-center cursor-pointer hover:shadow-lg"
            onClick={() => router.push(`/lugares/${l.id}`)}
          >
            {l.imagen_url && (
              <img
                src={l.imagen_url}
                alt={l.nombre}
                className="w-full rounded"
              />
            )}
            <div className="block mt-2 font-bold text-blue-600 hover:underline">
              {l.nombre}
            </div>
            {/* Mostrar botón eliminar solo si es ADMIN */}
            {usuarioLogueado.rol === "ADMIN" && (
              <button
                className="btn-delete mt-3"
                onClick={() => handleEliminar(l.id)}
              >
                Eliminar
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
