"use client";

import { useState } from "react";

export default function Dashboard() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Barra superior */}
      <header className="flex items-center justify-between bg-blue-600 text-white p-4">
        <h1 className="text-xl font-bold">Dashboard</h1>
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="flex flex-col justify-between w-6 h-6"
        >
          <span className="block h-0.5 w-full bg-white"></span>
          <span className="block h-0.5 w-full bg-white"></span>
          <span className="block h-0.5 w-full bg-white"></span>
        </button>
      </header>

      {/* Menú desplegable */}
      {menuOpen && (
        <nav className="bg-white shadow-md p-4">
          <ul className="flex flex-col space-y-2">
            <li className="hover:bg-gray-100 p-2 rounded cursor-pointer">Emprendedor</li>
            <li className="hover:bg-gray-100 p-2 rounded cursor-pointer">Favoritos</li>
            <li className="hover:bg-gray-100 p-2 rounded cursor-pointer">Reseñas</li>
          </ul>
        </nav>
      )}

      {/* Contenido principal */}
      <main className="p-4">
        <p>Selecciona un módulo del menú para ver su contenido.</p>
      </main>
    </div>
  );
}