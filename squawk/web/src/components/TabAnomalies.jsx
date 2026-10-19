import React, { useState, useMemo } from "react";
import { formatINR } from "../hooks/useData";

export default function TabAnomalies({ anomalies }) {
  const [filterRoute, setFilterRoute] = useState("ALL");
  const [filterAirline, setFilterAirline] = useState("ALL");
  const [filterSeverity, setFilterSeverity] = useState("ALL");
  const [sortField, setSortField] = useState("date");
  const [sortAsc, setSortAsc] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 20;

  const routes = useMemo(() => {
    if (!anomalies) return [];
    return ["ALL", ...Array.from(new Set(anomalies.map((a) => a.route)))].sort();
  }, [anomalies]);

  const airlines = useMemo(() => {
    if (!anomalies) return [];
    return ["ALL", ...Array.from(new Set(anomalies.map((a) => a.airline)))].sort();
  }, [anomalies]);

  const filtered = useMemo(() => {
    if (!anomalies) return [];
    return anomalies.filter((a) => {
      if (filterRoute !== "ALL" && a.route !== filterRoute) return false;
      if (filterAirline !== "ALL" && a.airline !== filterAirline) return false;
      if (filterSeverity !== "ALL" && a.severity !== filterSeverity) return false;
      return true;
    }).sort((a, b) => {
      let valA = a[sortField];
      let valB = b[sortField];
      if (typeof valA === "string") {
        return sortAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      return sortAsc ? valA - valB : valB - valA;
    });
  }, [anomalies, filterRoute, filterAirline, filterSeverity, sortField, sortAsc]);

  const totalPages = Math.ceil(filtered.length / pageSize) || 1;
  const paginated = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, currentPage]);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  const getSeverityBadge = (sev) => {
    switch (sev) {
      case "High":
        return <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-rose-500/20 text-rose-400 border border-rose-500/30">High</span>;
      case "Medium":
        return <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-500/20 text-amber-400 border border-amber-500/30">Medium</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-yellow-500/20 text-yellow-300 border border-yellow-500/30">Low</span>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-4 text-xs">
          <div>
            <label className="block uppercase font-semibold text-slate-400 mb-1">Route</label>
            <select
              value={filterRoute}
              onChange={(e) => { setFilterRoute(e.target.value); setCurrentPage(1); }}
              className="bg-slate-950 border border-slate-700 text-slate-200 rounded px-2.5 py-1.5 focus:border-sky-500"
            >
              {routes.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>

          <div>
            <label className="block uppercase font-semibold text-slate-400 mb-1">Airline</label>
            <select
              value={filterAirline}
              onChange={(e) => { setFilterAirline(e.target.value); setCurrentPage(1); }}
              className="bg-slate-950 border border-slate-700 text-slate-200 rounded px-2.5 py-1.5 focus:border-sky-500"
            >
              {airlines.map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>

          <div>
            <label className="block uppercase font-semibold text-slate-400 mb-1">Severity</label>
            <select
              value={filterSeverity}
              onChange={(e) => { setFilterSeverity(e.target.value); setCurrentPage(1); }}
              className="bg-slate-950 border border-slate-700 text-slate-200 rounded px-2.5 py-1.5 focus:border-sky-500"
            >
              <option value="ALL">ALL</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
          </div>
        </div>

        <div className="text-xs text-slate-400">
          Showing <span className="font-mono text-sky-400 font-semibold">{filtered.length}</span> anomaly records
        </div>
      </div>

      <div className="bg-slate-900/80 border border-slate-800 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-950/70 border-b border-slate-800 text-slate-400">
                <th onClick={() => handleSort("date")} className="py-3 px-4 font-semibold cursor-pointer hover:text-slate-200">Date ?</th>
                <th onClick={() => handleSort("route")} className="py-3 px-4 font-semibold cursor-pointer hover:text-slate-200">Route ?</th>
                <th onClick={() => handleSort("airline")} className="py-3 px-4 font-semibold cursor-pointer hover:text-slate-200">Airline ?</th>
                <th onClick={() => handleSort("fare")} className="py-3 px-4 font-semibold text-right cursor-pointer hover:text-slate-200">Observed ?</th>
                <th onClick={() => handleSort("expected_fare")} className="py-3 px-4 font-semibold text-right cursor-pointer hover:text-slate-200">Expected ?</th>
                <th onClick={() => handleSort("deviation_pct")} className="py-3 px-4 font-semibold text-right cursor-pointer hover:text-slate-200">Dev % ?</th>
                <th className="py-3 px-4 font-semibold text-center">Severity</th>
                <th className="py-3 px-4 font-semibold text-center">Injected Ground Truth</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {paginated.map((row, idx) => (
                <tr key={idx} className="hover:bg-slate-800/40">
                  <td className="py-2.5 px-4 text-slate-300">{row.date}</td>
                  <td className="py-2.5 px-4 font-sans font-medium text-slate-200">{row.route}</td>
                  <td className="py-2.5 px-4 font-sans text-slate-300">{row.airline}</td>
                  <td className="py-2.5 px-4 text-right text-slate-100">{formatINR(row.fare)}</td>
                  <td className="py-2.5 px-4 text-right text-slate-400">{formatINR(row.expected_fare)}</td>
                  <td className={`py-2.5 px-4 text-right font-semibold ${row.deviation_pct >= 0 ? "text-rose-400" : "text-emerald-400"}`}>
                    {row.deviation_pct >= 0 ? `+${row.deviation_pct}%` : `${row.deviation_pct}%`}
                  </td>
                  <td className="py-2.5 px-4 text-center font-sans">{getSeverityBadge(row.severity)}</td>
                  <td className="py-2.5 px-4 text-center font-sans">
                    {row.is_true_anomaly ? (
                      <span className="inline-flex items-center text-emerald-400 font-bold" title="True Injected Outlier">?</span>
                    ) : (
                      <span className="text-slate-600 font-bold" title="Model false-positive">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="bg-slate-950/70 border-t border-slate-800 px-4 py-3 flex items-center justify-between text-xs text-slate-400">
          <div>
            Page <span className="font-mono text-slate-200">{currentPage}</span> of <span className="font-mono text-slate-200">{totalPages}</span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 bg-slate-900 border border-slate-700 rounded text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-800"
            >
              Previous
            </button>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1 bg-slate-900 border border-slate-700 rounded text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-800"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
