"use client";

import { useState, useEffect } from "react";
import { useRouter } from 'next/navigation';

export default function RedesSocialesPage() {
  const [nombre, setNombre] = useState("");
  const [link, setLink] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [usuarioId, setUsuarioId] = useState(null);
  const [redes, setRedes] = useState([]);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  // enlaceLugar y compartido removidos: campo y acciones de compartir eliminadas

  useEffect(() => {
    fetch("/api/me", { credentials: "include" })
      .then(res => res.json())
      .then(data => {
        if (data && data.id) setUsuarioId(data.id);
        // Al cargar, solicitamos todas las redes sociales (visibles para todos)
        fetch(`/api/redes-sociales`)
          .then(res => res.json())
          .then(rs => setRedes(rs));
      });
  }, []);

  const router = useRouter();

  const handleBack = () => {
    // Si hay historial, usar history.back(); sino redirigir a la página principal
    if (typeof window !== 'undefined' && window.history.length > 1) {
      window.history.back();
    } else {
      router.push('/principal');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!nombre.trim() || !link.trim() || !usuarioId) {
      setMensaje("Completa todos los campos.");
      return;
    }
    const res = await fetch("/api/redes-sociales", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ usuarioId, nombre, link }),
    });
    if (res.ok) {
      setMensaje("¡Red social guardada correctamente!");
      setNombre("");
      setLink("");
      setMostrarFormulario(false);
      // Actualiza la lista
      fetch(`/api/redes-sociales`)
        .then(res => res.json())
        .then(rs => setRedes(rs));
    } else {
      setMensaje("Error al guardar la red social.");
    }
  };

  const handleDelete = async (r) => {
    if (!usuarioId) return setMensaje('No autorizado');
    // Confirmación simple
    if (!confirm(`Eliminar perfil '${r.nombre}'? Esta acción no se puede deshacer.`)) return;

    const res = await fetch('/api/redes-sociales', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ id: r.id, usuarioId }),
    });
    if (res.ok) {
      setMensaje('Perfil eliminado');
      // Refrescar lista
      fetch(`/api/redes-sociales`).then(res => res.json()).then(rs => setRedes(rs));
    } else {
      const d = await res.json().catch(() => ({}));
      setMensaje(d?.error || 'Error al eliminar');
    }
  };

  // Función de compartir en Facebook removida

  return (
    <div className="relative min-h-screen bg-gray-100 px-2 py-4 sm:p-8">
      <div className="flex flex-col items-center mb-6">
        <button
          onClick={handleBack}
          className="absolute top-4 left-4 bg-green-600 text-white px-3 py-2 rounded shadow"
        >
          Volver
        </button>
        <h2 className="text-2xl font-bold text-blue-700 mb-4">Perfiles sociales</h2>
        <button
          className="bg-blue-600 text-white px-4 py-2 rounded shadow mb-4"
          onClick={() => setMostrarFormulario(!mostrarFormulario)}
        >
          Crear nuevo perfil social
        </button>
      </div>
      {mensaje && <div className="text-green-600 text-center mb-4">{mensaje}</div>}
      {mostrarFormulario && (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 mb-8 bg-white p-4 sm:p-6 rounded shadow">
          <label>
            Nombre de la red social:
            <input
              type="text"
              value={nombre}
              onChange={e => setNombre(e.target.value)}
              className="border rounded p-2 w-full mt-1"
              placeholder="Ejemplo: Facebook, Instagram"
            />
          </label>
          <label>
            Link de tu perfil:
            <input
              type="url"
              value={link}
              onChange={e => setLink(e.target.value)}
              className="border rounded p-2 w-full mt-1"
              placeholder="https://..."
            />
          </label>
          <button
            type="submit"
            className="bg-green-600 text-white px-3 py-1 rounded w-auto self-end"
          >
            Guardar
          </button>
        </form>
      )}
      <div className="flex flex-wrap gap-4 justify-center">
        {redes.length === 0 && (
          <div className="text-gray-500">
            No tienes redes sociales registradas.
          </div>
        )}
        {redes.map(r => (
          <div
            key={r.id}
            className="w-full sm:w-64 bg-white rounded shadow p-4 flex flex-col items-center relative"
          >
            <div className="font-bold text-blue-600 mb-2">{r.nombre}</div>
            <a
              href={r.link}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-500 underline break-all"
            >
              {r.link}
            </a>
            {/* Mostrar botón eliminar sólo si el usuario actual es el creador */}
            {usuarioId && r.usuarioId === usuarioId && (
              <button
                onClick={() => handleDelete(r)}
                className="btn-delete mt-3"
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
