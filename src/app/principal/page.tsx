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
  // Nuevo estado para saber cuándo se cargó el usuario (evita flicker)
  const [userLoaded, setUserLoaded] = useState(false);
  const [lugares, setLugares] = useState<Lugar[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredLugares, setFilteredLugares] = useState<Lugar[]>([]);
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
        setUserLoaded(true); // marcamos que ya cargó el usuario
      })
      .catch(() => setUserLoaded(true)); // en error también marcamos cargado
  }, []);

  useEffect(() => {
    fetch("/api/lugares")
      .then((res) => res.json())
      .then((data) => {
        console.log("Lugares recibidos:", data); // <-- log para depuración
        setLugares(data);
        setFilteredLugares(data || []);
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

  // Eliminar lugar (solo ADMIN)
  const handleEliminar = async (id: number) => {
    if (!confirm("¿Confirma eliminar este lugar? Esta acción es irreversible."))
      return;
    try {
      const res = await fetch(`/api/lugares/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      const body = await (res.headers
        .get("content-type")
        ?.includes("application/json")
        ? res.json()
        : res.text().then((t) => ({ message: t })));
      if (res.ok) {
        setLugares((prev) => prev.filter((l) => l.id !== id));
        setToast({ mensaje: "Lugar eliminado", visible: true });
        if (toastTimeout.current) clearTimeout(toastTimeout.current);
        toastTimeout.current = setTimeout(
          () => setToast({ mensaje: "", visible: false }),
          3000
        );
      } else {
        // Mostrar mensaje del servidor si lo hay
        const errMsg = body?.error || body?.message || "No se pudo eliminar el lugar";
        alert(`Error: ${errMsg}`);
      }
    } catch (e) {
      alert("Error de conexión");
    }
  };

  // Preparar contenido de lugares fuera del JSX para evitar errores de parse
  const lugaresContent =
    filteredLugares.length === 0 ? (
      <div className="text-gray-500 col-span-full">
        {searchTerm
          ? `No se encontraron lugares para "${searchTerm}".`
          : "No hay lugares registrados o hubo un error al obtenerlos."}
      </div>
    ) : (
      filteredLugares
        .filter((l) => l && l.id)
        .map((l) => (
          <div
            key={l.id}
            className="card-lugar bg-white rounded shadow hover:shadow-lg overflow-hidden relative cursor-pointer"
            onClick={() => router.push(`/lugares/${l.id}`)}
          >
            {l.imagen_url ? (
              <img
                src={l.imagen_url}
                alt={l.nombre}
                className="card-lugar-img w-full h-36 object-cover"
              />
            ) : (
              <div className="card-lugar-img w-full h-36 bg-gray-100 flex items-center justify-center text-gray-400">
                Sin imagen
              </div>
            )}
            <div className="p-3">
              <div className="font-semibold text-sm text-blue-600 hover:underline">
                {l.nombre}
              </div>
            </div>

            {userLoaded && usuarioLogueado.rol === "ADMIN" && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleEliminar(l.id);
                }}
                className="absolute top-2 right-2 bg-red-600 text-white px-2 py-1 rounded text-xs"
                title="Eliminar lugar"
              >
                Eliminar
              </button>
            )}
          </div>
        )));

  // Buscar lugares en cliente por nombre
  const handleSearch = (e?: React.FormEvent) => {
    if (e && typeof e.preventDefault === "function") e.preventDefault();
    const q = (searchTerm || "").trim().toLowerCase();
    if (!q) {
      setFilteredLugares(lugares);
      return;
    }
    const results = (lugares || []).filter((l) => (l.nombre || "").toLowerCase().includes(q));
    setFilteredLugares(results);
    if (results.length === 0) {
      setToast({ mensaje: `No se encontraron resultados para "${searchTerm}"`, visible: true });
      setTimeout(() => setToast({ mensaje: "", visible: false }), 3000);
    }
  };

  const clearSearch = () => {
    setSearchTerm("");
    setFilteredLugares(lugares);
  };

  return (
    <div className="principal-page">
      <div className="principal-content w-full"> {/* sin padding-top; el espacio se aplica al grid abajo */}
        {/* Hero visual (solo diseño) */}
        <section className="principal-hero relative overflow-hidden rounded-lg mb-6">
          <div className="principal-hero-bg" aria-hidden />
          <div className="principal-hero-inner container p-6 md:p-10 flex flex-col md:flex-row items-center gap-6">
            <div className="flex-1">
              <h2 className="text-xl md:text-2xl lg:text-2xl font-medium leading-tight text-white">EXPLORA Y CONOCE LOS MEJORES LUGARES TURÍSTICOS Y CULTURA DE AGUA BLANCA, JUTIAPA</h2>
              <p className="mt-2 text-xs md:text-sm text-white/90 max-w-lg">Descubre sitios únicos, reseñas de la comunidad y actividades locales. Navega o busca por nombre.</p>
            </div>
            <div className="w-full md:w-96">
              {/* Búsqueda funcional en cliente */}
              <form onSubmit={(e) => handleSearch(e)} className="relative">
                <input
                  aria-label="Buscar lugares"
                  placeholder="Buscar lugar, actividad o localidad"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg shadow-sm border border-transparent"
                />
                <button type="submit" className="absolute right-1 top-1/2 -translate-y-1/2 bg-white text-green-700 px-3 py-2 rounded-lg font-semibold">Buscar</button>
                {searchTerm && (
                  <button type="button" onClick={clearSearch} className="absolute right-20 top-1/2 -translate-y-1/2 bg-transparent text-white/80 px-3 py-2 rounded">Limpiar</button>
                )}
              </form>
             
            </div>
          </div>
        </section>
        {/* Toast de notificación */}
        {toast.visible && (
          <div className="fixed top-6 right-6 z-50 bg-blue-600 text-white px-6 py-3 rounded shadow-lg animate-fade">
            {toast.mensaje}
          </div>
        )}

        {/* Barra superior */}
        <header className="relative flex items-center justify-between bg-blue-600 text-white p-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="hamburger text-green-800"
              aria-label={menuOpen ? "Cerrar menú" : "Abrir menú"}
              aria-expanded={menuOpen}
              aria-controls="main-side-drawer"
            >
              {/* Icono SVG: casita (home) - usa currentColor para heredar color del botón */}
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width="20" height="20" aria-hidden="true">
                <path d="M3 11.5L12 4l9 7.5" />
                <path d="M9 21V12h6v9" />
                <path d="M21 21H3" />
              </svg>
            </button>
            <h1 className="text-xl font-bold">MENU</h1>
          </div>

          <div className="flex items-center gap-4">
            {/* Logo posicionado respecto al header */}
            <img src="/images/lugares/AB.jpeg" alt="Logo Agua Blanca" className="site-logo" />
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
        {/* Side drawer menú lateral (abre desde la izquierda) */}
        <div>
          <div
            className={`side-backdrop ${menuOpen ? "open" : ""}`}
            onClick={() => setMenuOpen(false)}
            aria-hidden={!menuOpen}
          />
          <nav
            id="main-side-drawer"
            className={`side-drawer ${menuOpen ? "open" : ""}`}
            aria-hidden={!menuOpen}
          >
            <div className="drawer-header">
              <strong>Menú</strong>
              <button className="bg-transparent border-none text-gray-600" onClick={() => setMenuOpen(false)} aria-label="Cerrar menú">✕</button>
            </div>
            <div className="drawer-body">
              <ul className="flex flex-col space-y-2">
                <li
                  onClick={() => { router.push("/emprendedores"); setMenuOpen(false); }}
                  className="hover:bg-gray-100 p-2 rounded cursor-pointer"
                >
                  <span className="menu-emoji">🏪</span> Emprendedor
                </li>
                <li
                  onClick={() => { router.push("/favoritos"); setMenuOpen(false); }}
                  className="hover:bg-gray-100 p-2 rounded cursor-pointer"
                >
                  <span className="menu-emoji">⭐</span> Favoritos
                </li>
                <li
                  onClick={() => { router.push("/calendario"); setMenuOpen(false); }}
                  className="hover:bg-gray-100 p-2 rounded cursor-pointer"
                >
                  <span className="menu-emoji">📅</span> Calendario
                </li>
                <li
                  onClick={() => { router.push("/notificaciones"); setMenuOpen(false); }}
                  className="hover:bg-gray-100 p-2 rounded cursor-pointer"
                >
                  <span className="menu-emoji">🔔</span> Notificaciones
                </li>
                <li
                  onClick={() => { router.push("/comentarios/nuevo"); setMenuOpen(false); }}
                  className="hover:bg-gray-100 p-2 rounded cursor-pointer"
                >
                  <span className="menu-emoji">📝</span> Dejar Comentario
                </li>
                {userLoaded && usuarioLogueado.rol === "ADMIN" && (
                  <li
                    onClick={() => { router.push("/estadistica"); setMenuOpen(false); }}
                    className="hover:bg-gray-100 p-2 rounded cursor-pointer"
                  >
                    <span className="menu-emoji">📊</span> Estadística
                  </li>
                )}
                <li
                  onClick={() => { window.open("/redes-sociales", "_blank"); setMenuOpen(false); }}
                  className="hover:bg-gray-100 p-2 rounded cursor-pointer"
                >
                  <span className="menu-emoji">🌐</span> Redes sociales
                </li>
              </ul>
            </div>
          </nav>
        </div>

        {/* Contenido principal: pantalla de lugares */}
        <main className="p-4">
          <h2 className="page-title text-base md:text-lg">Lugares Turísticos</h2>
          {/* Botón solo para administrador */}
          {userLoaded && usuarioLogueado.rol === "ADMIN" && (
            <button
              className="btn-register"
              onClick={() => router.push("/lugares/nuevo")}
            >
              Registrar lugar
            </button>
          )}
          {/* Grid responsive: espacio añadido debajo del título para separar las imágenes del header */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 mt-8 md:mt-12 lg:mt-16">
            {lugaresContent}
          </div>
        </main>
      </div>
    </div>
  );
}
