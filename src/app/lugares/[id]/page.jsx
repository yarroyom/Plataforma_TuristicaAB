"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function LugarDetalle() {
  const { id } = useParams();
  const router = useRouter();

  const [lugar, setLugar] = useState(null);
  const [descripcionEdit, setDescripcionEdit] = useState("");
  const [editMode, setEditMode] = useState(false);
  const [usuarioLogueado, setUsuarioLogueado] = useState({ id: null, rol: "", nombre: "" });
  const [nuevaResena, setNuevaResena] = useState("");
  const [editResenaId, setEditResenaId] = useState(null);
  const [editResenaTexto, setEditResenaTexto] = useState("");
  const [esFavorito, setEsFavorito] = useState(false);
  const [calificacionUsuario, setCalificacionUsuario] = useState(0);
  const [loadingCalificacion, setLoadingCalificacion] = useState(false);

  // Obtener usuario logueado real
  useEffect(() => {
    fetch("/api/me", { credentials: "include" })
      .then(res => res.json())
      .then(data => {
        if (data && data.rol && data.id) {
          setUsuarioLogueado({ id: data.id, rol: data.rol, nombre: data.nombre || "" });
        } else {
          setUsuarioLogueado({ id: null, rol: "", nombre: "" });
        }
      });
  }, []);

  useEffect(() => {
    if (!id || isNaN(Number(id))) {
      setLugar(null);
      return;
    }
    fetch(`/api/lugares/${id}`)
      .then(res => res.json())
      .then(data => {
        console.log("Lugar recibido:", data); // <-- log para depuración
        setLugar(data);
        setDescripcionEdit(data.descripcion || "");
      });
    // Obtener reseñas reales desde el backend
    fetch(`/api/resenas?lugarId=${id}`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setResenas(data);
      });
    // Verifica si el lugar es favorito en la base de datos
    fetch(`/api/favoritos`, { credentials: "include" })
      .then(res => res.json())
      .then(data => {
        setEsFavorito(data.some(l => l.id === Number(id)));
      });
    // Obtener la calificación del usuario logueado para este lugar
    fetch(`/api/resenas?lugarId=${id}&usuarioId=${usuarioLogueado.id}`, { credentials: "include" })
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data) && data.length > 0 && typeof data[0].calificacion === "number") {
          setCalificacionUsuario(data[0].calificacion);
        } else {
          setCalificacionUsuario(0);
        }
      });
  }, [id, usuarioLogueado.id]);

  const handleGuardar = async () => {
    try {
      // Envía la nueva descripción al backend
      const res = await fetch(`/api/lugares/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ descripcion: descripcionEdit }),
      });
      if (res.ok) {
        setLugar({ ...lugar, descripcion: descripcionEdit });
        setEditMode(false);
        alert("Historia actualizada correctamente");
      } else {
        alert("Error al guardar la historia");
      }
    } catch (err) {
      alert("Error de conexión");
    }
  };

  // Simula reseñas (puedes conectar a tu backend después)
  const [resenas, setResenas] = useState([]);

  // Agregar reseña
  const handleAgregarResena = async (e) => {
    e.preventDefault();
    if (!nuevaResena.trim()) return;
    try {
      const res = await fetch("/api/resenas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          lugarId: Number(id),
          comentario: nuevaResena,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setResenas([data.resena, ...resenas]);
        setNuevaResena("");
      } else {
        alert(data.error || "Error al guardar la reseña");
      }
    } catch (err) {
      alert("Error de conexión");
    }
  };

  // Editar reseña
  const handleEditarResena = (id, texto) => {
    setEditResenaId(id);
    setEditResenaTexto(texto);
  };

  // Guardar edición
  const handleGuardarEdicion = (id) => {
    setResenas(resenas.map(r =>
      r.id === id ? { ...r, comentario: editResenaTexto } : r
    ));
    setEditResenaId(null);
    setEditResenaTexto("");
  };

  // Cancelar edición
  const handleCancelarEdicion = () => {
    setEditResenaId(null);
    setEditResenaTexto("");
  };

  const handleEliminarResena = async (id) => {
    try {
      const res = await fetch(`/api/resenas/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      const data = await res.json();
      if (res.ok) {
        setResenas(resenas.filter(r => r.id !== id));
      } else {
        alert(data.error || "Error al eliminar la reseña");
      }
    } catch (err) {
      alert("Error de conexión");
    }
  };

  const handleFavorito = async () => {
    if (esFavorito) {
      await fetch("/api/favoritos", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ lugarId: Number(id) }),
      });
      setEsFavorito(false);
    } else {
      await fetch("/api/favoritos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ lugarId: Number(id) }),
      });
      setEsFavorito(true);
    }
  };

  const handleCalificar = async (valor) => {
    setLoadingCalificacion(true);
    setCalificacionUsuario(valor);
    await fetch("/api/lugares/calificar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        lugarId: Number(id),
        calificacion: valor,
        usuarioId: usuarioLogueado.id, // <-- envía el id del usuario logueado
      }),
    });
    setLoadingCalificacion(false);
    alert(`Calificaste con ${valor} estrella(s)`);
  };

  if (!lugar) return <p className="p-4">Lugar no encontrado...</p>;

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <button
        onClick={() => router.back()}
        className="text-blue-600 underline mb-4"
      >
        ← Regresar
      </button>

      <div className="bg-white shadow-lg rounded-lg overflow-hidden flex flex-col md:flex-row">
        {/* Panel principal */}
        <div className="md:w-2/3 w-full">
          {lugar.imagen_url && (
            <img
              src={lugar.imagen_url}
              alt={lugar.nombre}
              className="w-full h-64 object-contain bg-gray-100"
            />
          )}
          <div className="p-6">
            <h1 className="text-3xl font-bold mb-2 text-blue-700">{lugar.nombre}</h1>
            {/* Promedio de calificaciones */}
            <div className="mb-2">
              <span className="font-semibold">Promedio de calificación: </span>
              {lugar.numeroCalificaciones > 0
                ? (lugar.calificacionTotal / lugar.numeroCalificaciones).toFixed(2)
                : "Sin calificaciones"}
            </div>
            {/* Sección de calificación de estrellas */}
            <div className="mb-4">
              <h3 className="font-semibold mb-2">Califica este lugar:</h3>
              <div className="flex gap-1">
                {[1,2,3,4,5].map(valor => (
                  <span
                    key={valor}
                    className={`cursor-pointer text-3xl ${calificacionUsuario >= valor ? "text-yellow-400" : "text-gray-300"}`}
                    onClick={() => handleCalificar(valor)}
                  >★</span>
                ))}
              </div>
              {loadingCalificacion && <div className="text-blue-600">Guardando calificación...</div>}
            </div>
            <h2 className="text-xl font-semibold mb-2">Historia</h2>
            {usuarioLogueado.rol === "ADMIN" ? (
              <>
                {editMode ? (
                  <>
                    <textarea
                      className="border rounded w-full p-2 mb-2"
                      value={descripcionEdit}
                      onChange={e => setDescripcionEdit(e.target.value)}
                      rows={4}
                    />
                    <button
                      className="bg-green-600 text-white px-3 py-1 rounded mr-2"
                      onClick={handleGuardar}
                    >
                      Guardar
                    </button>
                    <button
                      className="bg-gray-400 text-white px-3 py-1 rounded"
                      onClick={() => { setEditMode(false); setDescripcionEdit(lugar.descripcion); }}
                    >
                      Cancelar
                    </button>
                  </>
                ) : (
                  <>
                    <p className="text-gray-700 mb-4">{lugar.descripcion}</p>
                    <button
                      className="bg-yellow-500 text-white px-3 py-1 rounded mb-4"
                      onClick={() => setEditMode(true)}
                    >
                      Editar historia
                    </button>
                  </>
                )}
              </>
            ) : (
              <p className="text-gray-700 mb-4">{lugar.descripcion}</p>
            )}
          </div>
        </div>
        {/* Panel lateral de reseñas */}
        <div className="md:w-1/3 w-full border-l md:border-l-gray-200 md:border-l p-6 bg-gray-50">
          <h2 className="text-xl font-semibold mb-2">Reseñas</h2>
          {/* Formulario para agregar reseña */}
          {usuarioLogueado.id && (
            <form onSubmit={handleAgregarResena} className="mb-4 flex gap-2">
              <input
                type="text"
                value={nuevaResena}
                onChange={e => setNuevaResena(e.target.value)}
                placeholder="Escribe tu experiencia..."
                className="border rounded p-2 flex-1"
              />
              <button type="submit" className="bg-blue-600 text-white px-3 py-1 rounded">
                Publicar
              </button>
            </form>
          )}
          <div className="space-y-2">
            {resenas.map(r => (
              <div key={r.id} className="border rounded p-2 bg-white flex items-center gap-3">
                {r.foto && (
                  <img
                    src={r.foto}
                    alt={r.usuario}
                    className="w-10 h-10 rounded-full object-cover border"
                  />
                )}
                <div className="flex-1">
                  <div className="font-bold">{r.usuario}</div>
                  <div className="text-xs text-gray-400">{r.fecha}</div>
                  {editResenaId === r.id ? (
                    <>
                      <textarea
                        className="border rounded w-full p-2 mb-2"
                        value={editResenaTexto}
                        onChange={e => setEditResenaTexto(e.target.value)}
                        rows={2}
                      />
                      <button
                        className="bg-green-600 text-white px-2 py-1 rounded mr-2"
                        onClick={() => handleGuardarEdicion(r.id)}
                      >
                        Guardar
                      </button>
                      <button
                        className="bg-gray-400 text-white px-2 py-1 rounded"
                        onClick={handleCancelarEdicion}
                      >
                        Cancelar
                      </button>
                    </>
                  ) : (
                    <div className="text-gray-700">{r.comentario}</div>
                  )}
                  {/* Solo el dueño de la reseña o el ADMIN puede editar/eliminar */}
                  {(usuarioLogueado.id === r.usuarioId || usuarioLogueado.rol === "ADMIN") && editResenaId !== r.id && (
                    <div className="flex gap-2 mt-2">
                      <button
                        className="bg-yellow-500 text-white px-2 py-1 rounded"
                        onClick={() => handleEditarResena(r.id, r.comentario)}
                      >
                        Editar
                      </button>
                      <button
                        className="bg-red-600 text-white px-2 py-1 rounded"
                        onClick={() => handleEliminarResena(r.id)}
                      >
                        Eliminar
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <button
        className={`mb-4 px-4 py-2 rounded ${esFavorito ? "bg-yellow-400 text-white" : "bg-gray-300 text-gray-700"}`}
        onClick={handleFavorito}
      >
        {esFavorito ? "Quitar de favoritos" : "Agregar a favoritos"}
      </button>
    </div>
  );
}

