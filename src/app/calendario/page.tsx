"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Evento = { id: string; title: string; date: string };

function startOfMonth(year: number, month: number) {
  return new Date(year, month, 1);
}
function daysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}
function pad(n: number) { return n < 10 ? `0${n}` : `${n}`; }
function toKey(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export default function CalendarioPage() {
  const today = new Date();
  const router = useRouter();
  const todayKey = toKey(today);
  // estado para rol de usuario
  const [usuarioRol, setUsuarioRol] = useState<string>("");
  const [userLoaded, setUserLoaded] = useState<boolean>(false);
  const [viewYear, setViewYear] = useState<number>(today.getFullYear());
  const [viewMonth, setViewMonth] = useState<number>(today.getMonth()); // 0-index
  const [events, setEvents] = useState<Record<string, Evento[]>>({});
  const [showForm, setShowForm] = useState(false);
  const [formDate, setFormDate] = useState<string>(toKey(today));
  const [formTitle, setFormTitle] = useState("");
  const [loadingEvents, setLoadingEvents] = useState(false);

  // Cargar eventos del servidor para el mes visible
  const fetchEventsForMonth = async (year: number, monthZeroBased: number) => {
    setLoadingEvents(true);
    try {
      const monthParam = `${year}-${pad(monthZeroBased + 1)}`; // YYYY-MM
      const res = await fetch(`/api/eventos?month=${monthParam}`, { credentials: "include" });
      if (!res.ok) {
        setEvents({});
        setLoadingEvents(false);
        return;
      }
      const lista: Evento[] = await res.json();
      // convertir a map dateKey -> Evento[]
      const map: Record<string, Evento[]> = {};
      for (const ev of lista) {
        const d = new Date(ev.date);
        // Usar UTC para evitar desfases por zona horaria
        const key = `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`; // YYYY-MM-DD (UTC)
        map[key] = map[key] ? [...map[key], ev] : [ev];
      }
      setEvents(map);
    } catch (err) {
      setEvents({});
    } finally {
      setLoadingEvents(false);
    }
  };

  useEffect(() => {
    fetchEventsForMonth(viewYear, viewMonth);
  }, [viewYear, viewMonth]);

  // Obtener rol del usuario (para controlar permisos en el calendario)
  useEffect(() => {
    fetch("/api/me", { credentials: "include" })
      .then(res => {
        if (!res.ok) return null;
        return res.json();
      })
      .then((data) => {
        if (data && data.rol) setUsuarioRol(data.rol);
        else setUsuarioRol("");
        setUserLoaded(true);
      })
      .catch(() => setUserLoaded(true));
  }, []);

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  };

  const addEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (usuarioRol !== "ADMIN") {
      alert("No autorizado: solo administradoras pueden agregar eventos.");
      setShowForm(false);
      return;
    }
    if (!formTitle.trim() || !formDate) return;

    // Llamada a API para crear evento (optimista + refresco)
    try {
      const res = await fetch("/api/eventos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ title: formTitle.trim(), date: formDate }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Error" }));
        alert(err.error || "No se pudo crear el evento");
        setShowForm(false);
        return;
      }
      const created: Evento = await res.json();
      // insertar optimistamente en el map local (usar fecha UTC para la clave)
      const d = new Date(created.date);
      const key = `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
      setEvents(prev => {
        const next = { ...prev };
        next[key] = next[key] ? [...next[key], created] : [created];
        return next;
      });
      // mantener consistencia: refrescar desde servidor en segundo plano
      fetchEventsForMonth(viewYear, viewMonth).catch(() => {});
      setFormTitle("");
      setShowForm(false);
    } catch {
      alert("Error de conexión");
      setShowForm(false);
    }
  };

  const removeEvent = async (dateKey: string, id: string) => {
    if (usuarioRol !== "ADMIN") {
      alert("No autorizado: solo administradoras pueden eliminar eventos.");
      return;
    }
    try {
      const res = await fetch(`/api/eventos/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Error" }));
        alert(err.error || "No se pudo eliminar");
        return;
      }
      // refrescar lista del mes
      await fetchEventsForMonth(viewYear, viewMonth);
    } catch {
      alert("Error de conexión");
    }
  };

  // build matrix of weeks (Sunday-first)
  const firstDay = new Date(viewYear, viewMonth, 1).getDay(); // 0-6
  const totalDays = daysInMonth(viewYear, viewMonth);
  const weeks: (number | null)[][] = [];
  let week: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) week.push(null);
  for (let d = 1; d <= totalDays; d++) {
    week.push(d);
    if (week.length === 7) { weeks.push(week); week = []; }
  }
  if (week.length) {
    while (week.length < 7) week.push(null);
    weeks.push(week);
  }

  const monthName = new Date(viewYear, viewMonth, 1).toLocaleString("es-ES", { month: "long" });

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* aviso si no es admin */}
      {userLoaded && usuarioRol !== "ADMIN" && (
        <div className="mb-3 text-sm text-gray-700">
          Nota: Solo las administradoras pueden agregar o editar eventos.
        </div>
      )}
      {/* Botón para volver al menú principal */}
      <div className="mb-3">
        <button
          onClick={() => router.push("/principal")}
          className="text-sm text-white bg-green-600 px-3 py-1 rounded shadow hover:bg-green-700"
        >
          ← Menú principal
        </button>
      </div>
      <div className="mb-4 bg-gradient-to-r from-green-100 to-green-200 rounded-lg p-4 shadow-sm flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Calendario</h1>
          <div className="text-sm text-gray-700 capitalize">{monthName} {viewYear}</div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={prevMonth} className="px-3 py-1 bg-white border rounded shadow-sm hover:bg-gray-50">◀</button>
          <button onClick={nextMonth} className="px-3 py-1 bg-white border rounded shadow-sm hover:bg-gray-50">▶</button>
          {/* Mostrar botón Nuevo evento solo para ADMIN */}
          {userLoaded && usuarioRol === "ADMIN" && (
            <button onClick={() => { setShowForm(true); setFormDate(toKey(new Date(viewYear, viewMonth, 1))); }} className="ml-2 bg-green-600 text-white px-3 py-1 rounded shadow">
              Nuevo evento
            </button>
          )}
        </div>
      </div>

      <div className="calendar-wrapper">
        <div className="grid calendar-grid grid-cols-7 gap-2 text-sm">
        {["Dom","Lun","Mar","Mié","Jue","Vie","Sáb"].map(d => (
          <div key={d} className="calendar-weekday text-center font-medium text-gray-600">{d}</div>
        ))}
        {weeks.map((w, wi) => (
          w.map((day, di) => {
            const dateKey = day ? `${viewYear}-${pad(viewMonth+1)}-${pad(day)}` : "";
            const dayEvents = day ? (events[dateKey] ?? []) : [];
            const isToday = dateKey && dateKey === todayKey;
            return (
              <div
                key={`${wi}-${di}`}
                className={`calendar-cell min-h-[96px] border rounded p-2 bg-white shadow-sm hover:shadow-md transition relative ${isToday ? "ring-2 ring-green-300" : ""}`}
              >
                {day ? (
                  <div className="flex items-center justify-between mb-1">
                    <div className="font-semibold">{day}</div>
                    {dayEvents.length > 0 && <div className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded">{dayEvents.length}</div>}
                  </div>
                ) : <div className="text-gray-300">&nbsp;</div>}
                <div className="flex flex-col gap-1">
                  {dayEvents.map(ev => (
                    <div key={ev.id} className="flex items-center justify-between bg-yellow-50 rounded px-2 py-0.5 text-xs">
                      <span className="truncate">{ev.title}</span>
                      {/* mostrar botón eliminar solo para ADMIN */}
                      {userLoaded && usuarioRol === "ADMIN" && (
                        <button onClick={() => removeEvent(dateKey, ev.id)} className="ml-2 text-red-600 text-xs">x</button>
                      )}
                    </div>
                  ))}
                </div>
                {day && (
                  // Mostrar enlace Agregar solo para ADMIN
                  userLoaded && usuarioRol === "ADMIN" ? (
                    <button
                      onClick={() => { setShowForm(true); setFormDate(dateKey); }}
                      className="mt-2 text-xs text-blue-600 hover:underline"
                    >
                      Agregar
                    </button>
                  ) : null
                )}
              </div>
            );
          })
        ))}
        </div>
      </div>

      {/* Modal / form */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-lg">
            <h3 className="font-semibold mb-3 text-lg">Agregar evento</h3>
            <form onSubmit={addEvent} className="flex flex-col gap-3">
              <label className="text-sm font-medium">Fecha</label>
              <input type="date" value={formDate} onChange={e => setFormDate(e.target.value)} className="border p-2 rounded" />
              <label className="text-sm font-medium">Título</label>
              <input type="text" value={formTitle} onChange={e => setFormTitle(e.target.value)} placeholder="Ej. Visita guiada" className="border p-2 rounded" />
              <div className="flex justify-end gap-2 mt-2">
                <button type="button" onClick={() => setShowForm(false)} className="px-3 py-1 rounded border">Cancelar</button>
                <button type="submit" className="px-3 py-1 rounded bg-green-600 text-white shadow">Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
