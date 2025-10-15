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
  const [perfilFacebook, setPerfilFacebook] = useState(null);
  const [redes, setRedes] = useState([]);

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
    // Obtener el perfil de Facebook del usuario logueado
    fetch("/api/me", { credentials: "include" })
      .then(res => res.json())
      .then(data => {
        if (data && data.id) {
          fetch(`/api/redes-sociales?usuarioId=${data.id}`)
            .then(res => res.json())
            .then(rs => {
              const fb = rs.find(r => r.nombre.toLowerCase() === "facebook");
              setPerfilFacebook(fb);
            });
        }
      });
    // Obtener redes sociales del usuario logueado
    fetch("/api/me", { credentials: "include" })
      .then(res => res.json())
      .then(data => {
        if (data && data.id) {
          fetch(`/api/redes-sociales?usuarioId=${data.id}`)
            .then(res => res.json())
            .then(rs => setRedes(rs));
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
  const handleGuardarEdicion = async (id) => {
    try {
      const res = await fetch("/api/resenas", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          resenaId: id,
          nuevoComentario: editResenaTexto,
        }),
      });
      const data = await res.json();
      if (res.ok && data.resena) {
        setResenas(resenas.map(r =>
          r.id === id ? { ...r, comentario: data.resena.comentario } : r
        ));
        setEditResenaId(null);
        setEditResenaTexto("");
        await fetch("/api/indicadores/actualizaciones", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ usuarioId: usuarioLogueado.id }),
        });
      } else if (res.ok) {
        // Si el backend no retorna la reseña, fuerza el cambio localmente
        setResenas(resenas.map(r =>
          r.id === id ? { ...r, comentario: editResenaTexto } : r
        ));
        setEditResenaId(null);
        setEditResenaTexto("");
      } else if (data.error) {
        alert(data.error);
      }
    } catch (err) {
      alert("Error de conexión");
    }
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

  const registrarUsoComoLlegar = async () => {
    await fetch("/api/indicadores/como-llegar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        lugarId: Number(id),
        usuarioId: usuarioLogueado.id,
      }),
    });
  };

  const compartirEnFacebook = async () => {
    await fetch("/api/indicadores/compartir-facebook", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        usuarioId: usuarioLogueado.id,
        lugarId: lugar.id,
        nombre: lugar.nombre,
        descripcion: lugar.descripcion,
        imagen_url: lugar.imagen_url,
        url: window.location.href,
      }),
    });
    // Texto personalizado para la publicación
    const texto = `${lugar.nombre}\n${lugar.descripcion || ""}\nReferencia: Plataforma Agua Blanca\n${window.location.href}`;
    window.open(
      `https://www.facebook.com/sharer/sharer.php?u=${window.location.href}&quote=${encodeURIComponent(texto)}`,
      "_blank"
    );
  };

  const compartirEnRedSocial = async (red) => {
    await fetch("/api/indicadores/compartir-red-social", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        usuarioId: usuarioLogueado.id,
        lugarId: lugar.id,
        redSocial: red.nombre,
        linkPerfil: red.link,
        urlLugar: window.location.href,
      }),
    });
    if (red.nombre.toLowerCase() === "facebook") {
      const texto = `${lugar.nombre}\n${lugar.descripcion || ""}\nReferencia: Plataforma Agua Blanca\n${window.location.href}`;
      window.open(
        `https://www.facebook.com/sharer/sharer.php?u=${window.location.href}&quote=${encodeURIComponent(texto)}`,
        "_blank"
      );
    }
    // Puedes agregar lógica para otras redes sociales aquí
  };

  const urlLugar = typeof window !== "undefined" ? window.location.href : "";

  const copiarEnlace = () => {
    navigator.clipboard.writeText(urlLugar);
    alert("Enlace copiado al portapapeles");
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
            {/* Botón para compartir solo en Facebook usando el perfil guardado */}
            <div className="mb-4 flex gap-2 flex-wrap">
              {redes
                .filter(red => red.nombre.toLowerCase() === "facebook")
                .map(red => (
                  <button
                    key={red.id}
                    className="bg-blue-600 text-white px-3 py-1 rounded"
                    onClick={() => compartirEnRedSocial(red)}
                  >
                    Compartir en Facebook
                  </button>
                ))}
            </div>
            {/* Mostrar y copiar enlace del lugar */}
            <div className="mb-4 flex items-center gap-2">
              <span className="text-gray-600 break-all">{urlLugar}</span>
              <button
                className="bg-blue-500 text-white px-2 py-1 rounded"
                onClick={copiarEnlace}
              >
                Copiar enlace
              </button>
            </div>
            {/* Botón para compartir en Facebook */}
            <div className="mb-4">
              <button
                className="bg-blue-600 text-white px-3 py-1 rounded"
                onClick={compartirEnFacebook}
              >
                Compartir en mi Facebook
              </button>
            </div>
            {/* Promedio de calificaciones */}
            <div className="mb-2">
              <span className="font-semibold">Promedio de calificación: </span>
              {lugar.numeroCalificaciones > 0
                ? (lugar.calificacionTotal / lugar.numeroCalificaciones).toFixed(2)
                : "Sin calificaciones"}
            </div>
            {/* Botón de ubicación y navegación */}
            {lugar.latitud && lugar.longitud && (
              <div className="mb-4 flex flex-col gap-2">
                <button
                  className="bg-blue-500 text-white px-4 py-2 rounded"
                  onClick={() => {
                    registrarUsoComoLlegar();
                    window.open(
                      `https://www.google.com/maps/dir/?api=1&destination=${lugar.latitud},${lugar.longitud}`,
                      "_blank"
                    );
                  }}
                >
                  Cómo llegar (Google Maps)
                </button>
                <div className="mt-2 text-gray-700">
                  <span className="font-semibold">Ubicación: </span>
                  {lugar.direccion
                    ? (
                        <a
                          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(lugar.direccion)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 underline"
                        >
                          {lugar.direccion}
                        </a>
                      )
                    : `${lugar.latitud}, ${lugar.longitud}`}
                </div>
              </div>
            )}
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
                    <>
                      <div className="text-gray-700">{r.comentario}</div>
                      {(usuarioLogueado.id === r.usuarioId || usuarioLogueado.rol === "ADMIN") && (
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
                    </>
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
      {/* Botones para compartir en redes sociales del usuario */}
      <div className="mb-4 flex gap-2 flex-wrap">
        {redes.map(red => (
          <button
            key={red.id}
            className="bg-blue-600 text-white px-3 py-1 rounded"
            onClick={() => compartirEnRedSocial(red)}
          >
            Compartir en {red.nombre}
          </button>
        ))}
      </div>
    </div>
  );
}

