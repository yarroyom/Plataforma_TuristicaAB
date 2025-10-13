"use client";

import { useEffect, useState } from "react";

interface Notificacion {
  id: number;
  mensaje: string;
  tipo: string;
  fecha: string;
}

export default function NotificacionesPage() {
  const [notificaciones, setNotificaciones] = useState<Notificacion[]>([]);

  useEffect(() => {
    fetch("/api/notificaciones")
      .then(res => res.json())
      .then(data => setNotificaciones(data));
  }, []);

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">Notificaciones</h1>
      <div className="space-y-4">
        {notificaciones.length === 0 && (
          <div className="text-gray-500">No hay notificaciones.</div>
        )}
        {notificaciones.map(n => (
          <div key={n.id} className="border rounded p-4 bg-white shadow">
            <div className="font-semibold text-blue-700">{n.tipo === "negocio" ? "Nuevo negocio" : "Evento"}</div>
            <div className="text-gray-700">{n.mensaje}</div>
            <div className="text-xs text-gray-400 mt-2">{new Date(n.fecha).toLocaleDateString()}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
