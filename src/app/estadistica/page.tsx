"use client";

import { useEffect, useState } from "react";
import { Chart, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from "chart.js";
import { Bar, Line } from "react-chartjs-2";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";

// Registra las escalas y elementos necesarios para Chart.js
Chart.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

export default function EstadisticaPage() {
  const [indicadores, setIndicadores] = useState<any[]>([]);
  const [categoria, setCategoria] = useState("");
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");

  useEffect(() => {
    let url = "/api/estadistica";
    const params = [];
    if (categoria) params.push(`categoria=${categoria}`);
    if (fechaInicio && fechaFin) params.push(`fechaInicio=${fechaInicio}&fechaFin=${fechaFin}`);
    if (params.length) url += "?" + params.join("&");
    fetch(url)
      .then(async res => {
        if (!res.ok) {
          setIndicadores([]);
          return;
        }
        try {
          const data = await res.json();
          setIndicadores(data);
        } catch {
          setIndicadores([]);
        }
      });
  }, [categoria, fechaInicio, fechaFin]);

  // Función para exportar a Excel
  const exportExcel = () => {
    const ws = XLSX.utils.json_to_sheet(indicadores.map(i => ({
      Indicador: i.nombre,
      Categoría: i.categoria,
      Meta: i.meta,
      ValorActual: i.valores[0]?.valorActual ?? "",
      Unidad: i.unidad,
      Fecha: i.valores[0]?.fecha ?? "",
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Indicadores");
    XLSX.writeFile(wb, "estadisticas.xlsx");
  };

  // Función para exportar a PDF
  const exportPDF = () => {
    const doc = new jsPDF();
    doc.text("Reporte de Indicadores", 10, 10);
    indicadores.forEach((i, idx) => {
      doc.text(
        `${i.nombre} (${i.categoria}): ${i.valores[0]?.valorActual ?? ""} / Meta: ${i.meta}`,
        10,
        20 + idx * 10
      );
    });
    doc.save("estadisticas.pdf");
  };

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">Estadística de Indicadores</h1>
      {/* Filtros */}
      <div className="flex gap-4 mb-6">
        <select value={categoria} onChange={e => setCategoria(e.target.value)} className="border p-2 rounded">
          <option value="">Todas las categorías</option>
          <option value="Dependiente">Dependiente</option>
          <option value="Independiente 1">Independiente 1</option>
          <option value="Independiente 2">Independiente 2</option>
        </select>
        <input type="date" value={fechaInicio} onChange={e => setFechaInicio(e.target.value)} className="border p-2 rounded" />
        <input type="date" value={fechaFin} onChange={e => setFechaFin(e.target.value)} className="border p-2 rounded" />
        <button onClick={exportExcel} className="bg-green-600 text-white px-3 py-1 rounded">Descargar Excel</button>
        <button onClick={exportPDF} className="bg-blue-600 text-white px-3 py-1 rounded">Descargar PDF</button>
      </div>
      {/* Tarjetas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {indicadores.map(i => (
          <div key={i.id} className="bg-white p-4 rounded shadow flex flex-col items-center">
            <div className="font-bold text-lg">{i.nombre}</div>
            <div className="text-gray-600">{i.categoria}</div>
            <div className="text-2xl font-bold">{i.valores[0]?.valorActual ?? "—"} {i.unidad}</div>
            <div className="text-sm text-gray-500">Meta: {i.meta}</div>
            <div className="text-sm text-gray-500">
              Cumplimiento: {i.valores[0] ? Math.round((i.valores[0].valorActual / i.meta) * 100) : 0}%
            </div>
          </div>
        ))}
      </div>
      {/* Gráfica de barras */}
      <div className="bg-white p-6 rounded shadow mb-8">
        <Bar
          data={{
            labels: indicadores.map(i => i.nombre),
            datasets: [
              {
                label: "Valor Actual",
                data: indicadores.map(i => i.valores[0]?.valorActual ?? 0),
                backgroundColor: "rgba(59,130,246,0.6)",
              },
              {
                label: "Meta",
                data: indicadores.map(i => i.meta),
                backgroundColor: "rgba(34,197,94,0.4)",
              },
            ],
          }}
        />
      </div>
      {/* Tabla de indicadores */}
      <div className="bg-white p-6 rounded shadow">
        <table className="w-full">
          <thead>
            <tr>
              <th className="text-left">Indicador</th>
              <th className="text-left">Categoría</th>
              <th className="text-left">Valor Actual</th>
              <th className="text-left">Meta</th>
              <th className="text-left">Unidad</th>
              <th className="text-left">Fecha</th>
              <th className="text-left">Cumplimiento</th>
            </tr>
          </thead>
          <tbody>
            {indicadores.map(i => (
              <tr key={i.id}>
                <td>{i.nombre}</td>
                <td>{i.categoria}</td>
                <td>{i.valores[0]?.valorActual ?? "—"}</td>
                <td>{i.meta}</td>
                <td>{i.unidad}</td>
                <td>{i.valores[0]?.fecha ? new Date(i.valores[0].fecha).toLocaleDateString() : "—"}</td>
                <td>
                  {i.valores[0] ? Math.round((i.valores[0].valorActual / i.meta) * 100) : 0}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
