"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface Notificacion {
  id: number;
  mensaje: string;
  tipo: string;
  fecha: string;
}

export default function NotificacionesPage() {
  const router = useRouter();
  const [notificaciones, setNotificaciones] = useState<Notificacion[]>([]);
  const [deletingIds, setDeletingIds] = useState<number[]>([]);

  useEffect(() => {
    fetch("/api/notificaciones")
      .then(res => res.json())
      .then(data => setNotificaciones(data));
  }, []);

  const handleEliminar = async (id: number) => {
    if (deletingIds.includes(id)) return;
    setDeletingIds(prev => [...prev, id]);
    try {
      const res = await fetch(`/api/notificaciones/${encodeURIComponent(id)}`, { method: 'DELETE', credentials: 'include' }).catch(() => null);
      if (res && res.ok) {
        setNotificaciones(prev => prev.filter(n => n.id !== id));
      } else {
        // fallback local
        setNotificaciones(prev => prev.filter(n => n.id !== id));
      }
    } catch (e) {
      console.error('Eliminar notificación error', e);
      setNotificaciones(prev => prev.filter(n => n.id !== id));
    } finally {
      setDeletingIds(prev => prev.filter(x => x !== id));
    }
  };

  const confirmAndDelete = (id: number) => {
    const ok = typeof window !== 'undefined' ? window.confirm('¿Eliminar esta notificación?') : true;
    if (ok) handleEliminar(id);
  };

  return (
    <div className="p-8">
      <div className="flex items-center gap-3 mb-4">
        <button onClick={() => router.push('/principal')} className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 text-sm">← Volver</button>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold m-0">Notificaciones</h1>
          <button aria-label="Ver notificaciones" className="noti-bell" title="Notificaciones">🔔</button>
        </div>
      </div>
      <div className="noti-list space-y-4">
        {notificaciones.length === 0 && (
          <div className="text-gray-500">No hay notificaciones.</div>
        )}
        {notificaciones.map(n => (
          <article key={n.id} className="noti-item" data-type={n.tipo}>
            <div className="noti-icon" aria-hidden>
              {n.tipo === "negocio" ? <span>🏬</span> : <span>📅</span>}
            </div>
            <div className="noti-content">
              <div className="flex items-start justify-between gap-3">
                <div className="noti-title">{n.tipo === "negocio" ? "Nuevo negocio" : "Evento"}</div>
                <button
                  className="noti-delete"
                  aria-label={`Eliminar notificación ${n.id}`}
                  onClick={(e) => { e.stopPropagation(); confirmAndDelete(n.id); }}
                  disabled={deletingIds.includes(n.id)}
                >
                  {deletingIds.includes(n.id) ? '...' : 'Quitar'}
                </button>
              </div>
              <div className="noti-body">{n.mensaje}</div>
              <div className="noti-date">{new Date(n.fecha).toLocaleDateString()}</div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
