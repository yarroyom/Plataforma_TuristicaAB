"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

export default function VerEmprendedor() {
  const { id } = useParams();
  const numericId = parseInt(id as string);
  const router = useRouter();
  const [perfil, setPerfil] = useState<any>(null);
  const [usuarioLogueado, setUsuarioLogueado] = useState<{ id: number; rol: string } | null>(null);

  // Obtener usuario logueado desde backend (cookie HttpOnly)
  useEffect(() => {
    fetch("/api/me")
      .then(res => res.json())
      .then(data => {
        if (data.error) {
          router.push("/login"); // Redirigir si no hay token válido
        } else {
          setUsuarioLogueado({ id: data.id, rol: data.rol.toUpperCase() });
        }
      })
      .catch(() => router.push("/login"));
  }, []);

  // Traer perfil del emprendedor
  useEffect(() => {
    fetch(`/api/emprendedores/${numericId}`)
      .then(res => {
        if (!res.ok) throw new Error("Perfil no encontrado");
        return res.json();
      })
      .then(setPerfil)
      .catch(err => console.error(err));
  }, [numericId]);

  if (!perfil) return <div>Cargando perfil...</div>;
  if (!usuarioLogueado) return <div>Verificando usuario...</div>;

  const esPropietario = usuarioLogueado.rol === "EMPRENDEDOR" && usuarioLogueado.id === perfil.usuario.id;

  const handleBack = () => {
    // intenta volver en el historial, si no hay historial, ir a la lista de emprendedores
    try {
      router.back();
    } catch {
      router.push('/emprendedores');
    }
  };

  return (
    <div className="p-8 relative">
      {/* Botón regresar fijo en la esquina superior izquierda */}
      <button
        onClick={handleBack}
        className="back-fixed"
        aria-label="Volver a lista de emprendedores"
      >
        ← Volver
      </button>

      <div className="max-w-4xl mx-auto emprendedor-hero">
  <div className="emprendedor-row flex gap-8 items-start">
          <aside className="flex-shrink-0">
            {perfil.foto ? (
              <img src={perfil.foto} alt={perfil.nombre} className="emprendedor-photo" />
            ) : (
              <div className="emprendedor-photo bg-gray-100 flex items-center justify-center text-gray-400">No foto</div>
            )}

            {/* Mini galería creativa: si perfil.galeria existe y tiene imágenes */}
            {perfil.galeria && perfil.galeria.length > 0 && (
              <div className="mini-gallery mt-3">
                {perfil.galeria.slice(0,4).map((src:any, i:number) => (
                  <img key={i} src={src} alt={`${perfil.nombre} galeria ${i+1}`} className="mini-thumb" />
                ))}
              </div>
            )}
          </aside>

          <main className="flex-1">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">{perfil.nombre}</h1>
                <div className="flex items-center gap-2 mt-2">
                  <div className="rating">{perfil.calificacion ? (Math.round(perfil.calificacion*10)/10) : '—'}</div>
                  <div className="badge">{perfil.categoria || 'Emprendimiento'}</div>
                </div>
                <p className="text-gray-600 mt-3">{perfil.descripcion || 'Sin descripción disponible.'}</p>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm text-gray-700">
              <div className="flex flex-col gap-2">
                <div><span className="font-semibold">Teléfono</span><div className="mt-1">{perfil.telefono || '—'}</div></div>
                <div className="mt-2"><span className="font-semibold">Horario</span><div className="mt-1">{perfil.horario || 'No especificado'}</div></div>
              </div>

              <div className="flex flex-col gap-2">
                <div><span className="font-semibold">Dirección</span><div className="mt-1">{perfil.direccion || '—'}</div></div>
                <div className="mt-2"><span className="font-semibold">Correo</span><div className="mt-1">{perfil.usuario?.correo || '—'}</div></div>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <a href={`tel:${perfil.telefono}`} className="contact-btn">Llamar</a>
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(perfil.direccion || '')}`}
                target="_blank"
                rel="noreferrer"
                className="contact-btn"
              >Cómo llegar</a>

              {esPropietario && (
                <div className="ml-auto flex gap-3">
                  <button className="btn-primary" onClick={() => router.push(`/emprendedores/${perfil.id}/editar`)}>Editar</button>
                  <button className="btn-delete" onClick={() => router.push(`/emprendedores/${perfil.id}/eliminar`)}>Eliminar</button>
                </div>
              )}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
