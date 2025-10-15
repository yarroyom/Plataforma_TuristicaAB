"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Lugar {
  id: number;
  nombre: string;
  imagen_url?: string;
  // Puedes agregar otros campos si los usas
}

export default function Principal() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [usuarioLogueado, setUsuarioLogueado] = useState({ rol: "" });
  const [lugares, setLugares] = useState<Lugar[]>([]);
  const [toast, setToast] = useState<{ mensaje: string; visible: boolean }>({
    mensaje: "",
    visible: false,
  });
  const toastTimeout = useRef<NodeJS.Timeout | null>(null);
  const router = useRouter();

  useEffect(() => {
    fetch("/api/me", { credentials: "include" })
      .then((res) => res.json())
      .then((data) => {
        if (data && data.rol) setUsuarioLogueado({ rol: data.rol });
        else setUsuarioLogueado({ rol: "" });
      });
  }, []);

  useEffect(() => {
    fetch("/api/lugares")
      .then((res) => res.json())
      .then((data) => {
        console.log("Lugares recibidos:", data); // <-- log para depuración
        setLugares(data);
      });
  }, []);

  useEffect(() => {
    // Consulta notificaciones recientes cada vez que se carga la página
    fetch("/api/notificaciones")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          // Solo muestra la última notificación si es reciente (menos de 1 minuto)
          const ultima = data[0];
          const ahora = Date.now();
          const fechaNoti = new Date(ultima.fecha).getTime();
          if (ahora - fechaNoti < 60000) {
            setToast({ mensaje: ultima.mensaje, visible: true });
            if (toastTimeout.current) clearTimeout(toastTimeout.current);
            toastTimeout.current = setTimeout(
              () => setToast({ mensaje: "", visible: false }),
              5000
            );
          }
        }
      });
  }, []);

  const handleLogout = async () => {
    // Elimina la cookie del token (puedes hacerlo con una petición al backend)
    await fetch("/api/logout", { method: "POST", credentials: "include" });
    router.push("/login");
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Toast de notificación */}
      {toast.visible && (
        <div className="fixed top-6 right-6 z-50 bg-blue-600 text-white px-6 py-3 rounded shadow-lg animate-fade">
          {toast.mensaje}
        </div>
      )}

      {/* Barra superior */}
      <header className="flex items-center justify-between bg-blue-600 text-white p-4">
        <h1 className="text-xl font-bold">Agua Blanca</h1>
        <div className="flex items-center gap-4">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="flex flex-col justify-between w-6 h-6"
          >
            <span className="block h-0.5 w-full bg-white"></span>
            <span className="block h-0.5 w-full bg-white"></span>
            <span className="block h-0.5 w-full bg-white"></span>
          </button>
          <button
            onClick={() => router.push("/perfil")}
            className="bg-gray-200 text-blue-700 px-3 py-1 rounded"
          >
            Cuenta
          </button>
          <button
            onClick={handleLogout}
            className="bg-red-600 text-white px-3 py-1 rounded"
          >
            Cerrar sesión
          </button>
        </div>
      </header>

      {/* Menú desplegable */}
      {menuOpen && (
        <nav className="bg-white shadow-md p-4">
          <ul className="flex flex-col space-y-2">
            <li
              onClick={() => router.push("/emprendedores")}
              className="hover:bg-gray-100 p-2 rounded cursor-pointer"
            >
              Emprendedor
            </li>
            <li
              onClick={() => router.push("/favoritos")}
              className="hover:bg-gray-100 p-2 rounded cursor-pointer"
            >
              Favoritos
            </li>
            <li
              onClick={() => router.push("/notificaciones")}
              className="hover:bg-gray-100 p-2 rounded cursor-pointer"
            >
              Notificaciones
            </li>
            <li
              onClick={() => router.push("/comentarios/nuevo")}
              className="hover:bg-gray-100 p-2 rounded cursor-pointer"
            >
              Dejar Comentario
            </li>
            {usuarioLogueado.rol === "ADMIN" && (
              <li
                onClick={() => router.push("/estadistica")}
                className="hover:bg-gray-100 p-2 rounded cursor-pointer"
              >
                Estadística
              </li>
            )}
            <li
              onClick={() => window.open("/redes-sociales", "_blank")}
              className="hover:bg-gray-100 p-2 rounded cursor-pointer"
            >
              Redes sociales
            </li>
          </ul>
        </nav>
      )}

      {/* Contenido principal: pantalla de lugares */}
      <main className="p-4">
        <h2 className="text-2xl font-bold mb-4">Lugares Turísticos</h2>
        {/* Botón solo para administrador */}
        {usuarioLogueado.rol === "ADMIN" && (
          <button
            className="bg-green-600 text-white px-4 py-2 rounded mb-4"
            onClick={() => router.push("/lugares/nuevo")}
          >
            Registrar lugar
          </button>
        )}
        <div className="flex flex-wrap gap-4">
          {lugares.length === 0 && (
            <div className="text-gray-500">
              No hay lugares registrados o hubo un error al obtenerlos.
            </div>
          )}
          {lugares
            .filter((l) => {
              if (!l || !l.id) {
                console.warn("Lugar sin id:", l);
                return false;
              }
              return true;
            })
            .map((l) => (
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
              </div>
            ))}
        </div>
      </main>
    </div>
  );
}
