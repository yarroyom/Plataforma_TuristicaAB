"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface Lugar {
  id: number;
  nombre: string;
  imagen_url?: string;
}

export default function FavoritosPage() {
  const router = useRouter();
  const [favoritos, setFavoritos] = useState<Lugar[]>([]);
  const [error, setError] = useState("");
  const [deletingIds, setDeletingIds] = useState<number[]>([]);

  const normalizeImageUrl = (raw?: string | null) => {
    if (!raw) return null;
    // Si el campo contiene varias URLs separadas por comas o saltos de línea,
    // tomar la primera válida.
    const first = String(raw)
      .split(/\r?\n|\s*,\s*/)
      .map(s => s.trim())
      .filter(Boolean)[0];
    if (!first) return null;
    if (/^https?:\/\//i.test(first)) return first;
    if (first.startsWith("/")) return first;
    return `/${first}`;
  };

  useEffect(() => {
    fetch("/api/favoritos", { credentials: "include" })
      .then(async res => {
        const contentType = res.headers.get("content-type");
        if (!res.ok) {
          if (contentType && contentType.includes("application/json")) {
            const data = await res.json();
            setError(data.error || "No se pudo obtener favoritos");
            throw new Error(data.error || "No se pudo obtener favoritos");
          } else {
            setError("Error: El endpoint /api/favoritos no existe o no responde correctamente.");
            throw new Error("Endpoint /api/favoritos no existe o no responde correctamente.");
          }
        }
        if (contentType && contentType.includes("application/json")) {
          return res.json();
        } else {
          setError("Error: El endpoint /api/favoritos no existe o no responde correctamente.");
          throw new Error("Endpoint /api/favoritos no existe o no responde correctamente.");
        }
      })
      .then(data => setFavoritos(data))
      .catch(err => {
        console.error("Error favoritos:", err);
      });
  }, []);

  const handleEliminar = async (lugarId: number) => {
    // confirmación antes de eliminar
    if (!confirm("¿Eliminar este lugar de tus favoritos?")) return;
    if (deletingIds.includes(lugarId)) return;
    setError("");
    setDeletingIds(prev => [...prev, lugarId]);
    try {
      // 1) intentar DELETE por ruta /api/favoritos/{id}
      let res = await fetch(`/api/favoritos/${encodeURIComponent(lugarId)}`, {
        method: "DELETE",
        credentials: "include",
      }).catch(() => null);

      // 2) si no existe esa ruta o falló, intentar DELETE con body como fallback
      if (!res || !res.ok) {
        res = await fetch("/api/favoritos", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ lugarId }),
        }).catch(() => null);
      }

      // parseo robusto de respuesta
      let data: any = {};
      if (res) {
        const text = await res.text().catch(() => "");
        try { data = text ? JSON.parse(text) : {}; } catch { data = { raw: text }; }
      }

      if (res && res.ok) {
        setFavoritos(prev => prev.filter(l => l.id !== lugarId));
        try { alert('Lugar eliminado de favoritos'); } catch {}
      } else {
        const msg = data?.error || data?.message || "No se pudo eliminar favorito";
        setError(String(msg));
      }
    } catch (err) {
      console.error("Network error quitando favorito:", err);
      setError("Error de conexión al eliminar favorito");
    } finally {
      setDeletingIds(prev => prev.filter(id => id !== lugarId));
    }
  };

  return (
    <div className="favoritos-page py-8 p-4">
      <div className="favoritos-bg">
        <div className="container max-w-4xl mx-auto">
        {/* Botón regresar a la página anterior */}
        <div className="mb-4">
          <button
            type="button"
            onClick={() => {
              if (typeof window !== "undefined" && window.history.length > 1) router.back();
              else router.push("/principal");
            }}
            className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 text-sm"
          >
            ← Volver
          </button>
        </div>
        <h1 className="text-2xl font-bold mb-6">Mis Favoritos</h1>
        {error && <div className="text-red-500 mb-4">{error}</div>}
        <div className="flex flex-wrap gap-4">
          {favoritos.length === 0 && !error && (
            <div className="text-gray-500">No tienes lugares favoritos.</div>
          )}
          {favoritos.map(l => (
            <div
              key={l.id}
              className="favorito-card glass w-48 text-center cursor-pointer hover:shadow-lg relative"
              onClick={() => router.push(`/lugares/${l.id}`)}
            >
              {(() => {
                const src = normalizeImageUrl(l.imagen_url) || '/images/lugares/iglesia.jpg';
                return (
                  <img
                    src={src}
                    alt={l.nombre}
                    data-testid={`fav-img-${l.id}`}
                    className="w-full rounded"
                    onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/images/lugares/iglesia.jpg'; }}
                  />
                );
              })()}
              <div className="block mt-2 font-bold text-blue-600 hover:underline">
                {l.nombre}
              </div>
              <button
                className={`btn-delete absolute top-2 right-2 ${deletingIds.includes(l.id) ? 'opacity-60 cursor-not-allowed' : ''}`}
                onClick={e => {
                  e.stopPropagation();
                  handleEliminar(l.id);
                }}
                disabled={deletingIds.includes(l.id)}
              >
                {deletingIds.includes(l.id) ? "..." : "Quitar"}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  </div>
  );
}
