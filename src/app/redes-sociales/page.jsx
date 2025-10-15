"use client";

import { useState, useEffect } from "react";

export default function RedesSocialesPage() {
  const [nombre, setNombre] = useState("");
  const [link, setLink] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [usuarioId, setUsuarioId] = useState(null);
  const [redes, setRedes] = useState([]);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [enlaceLugar, setEnlaceLugar] = useState("");
  const [compartido, setCompartido] = useState(false);

  useEffect(() => {
    fetch("/api/me", { credentials: "include" })
      .then(res => res.json())
      .then(data => {
        if (data && data.id) setUsuarioId(data.id);
        if (data && data.id) {
          fetch(`/api/redes-sociales?usuarioId=${data.id}`)
            .then(res => res.json())
            .then(rs => setRedes(rs));
        }
      });
  }, []);

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
      fetch(`/api/redes-sociales?usuarioId=${usuarioId}`)
        .then(res => res.json())
        .then(rs => setRedes(rs));
    } else {
      setMensaje("Error al guardar la red social.");
    }
  };

  const handleCompartirFacebook = async (red) => {
    if (!enlaceLugar.trim()) {
      setMensaje("Pega el enlace del lugar turístico.");
      return;
    }
    if (compartido) {
      setMensaje("Ya compartiste este enlace en Facebook.");
      return;
    }
    // Registra el evento en el backend
    await fetch("/api/indicadores/compartir-red-social", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        usuarioId,
        redSocial: red.nombre,
        linkPerfil: red.link,
        urlLugar: enlaceLugar,
      }),
    });
    // Abre el diálogo de compartir en Facebook
    window.open(
      `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(enlaceLugar)}&quote=${encodeURIComponent("Referencia: Plataforma Agua Blanca")}`,
      "_blank"
    );
    setCompartido(true);
    setMensaje("¡Compartido en Facebook!");
  };

  return (
    <div className="min-h-screen bg-gray-100 px-2 py-4 sm:p-8">
      <div className="flex flex-col items-center mb-6">
        <h2 className="text-2xl font-bold text-blue-700 mb-4">Perfiles sociales</h2>
        <button
          className="bg-blue-600 text-white px-4 py-2 rounded shadow mb-4"
          onClick={() => setMostrarFormulario(!mostrarFormulario)}
        >
          Crear nuevo perfil social
        </button>
      </div>
      {/* Campo para pegar el enlace del lugar turístico */}
      <div className="mb-6 flex flex-col items-center">
        <label className="font-semibold mb-2">Pega el enlace del lugar turístico que quieres compartir:</label>
        <input
          type="url"
          value={enlaceLugar}
          onChange={e => {
            setEnlaceLugar(e.target.value);
            setCompartido(false); // Permite compartir si el enlace cambia
          }}
          className="border rounded p-2 w-full max-w-md"
          placeholder="https://tusitio.com/lugares/123"
        />
      </div>
      {/* Botón para compartir solo en Facebook */}
      <div className="flex flex-wrap gap-4 justify-center mb-8">
        {redes
          .filter(red => red.nombre.toLowerCase() === "facebook")
          .map(red => (
            <button
              key={red.id}
              className="bg-blue-600 text-white px-3 py-1 rounded"
              onClick={() => handleCompartirFacebook(red)}
              disabled={compartido}
            >
              Compartir en Facebook
            </button>
          ))}
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
            className="w-full sm:w-64 bg-white rounded shadow p-4 flex flex-col items-center"
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
          </div>
        ))}
      </div>
    </div>
  );
}
