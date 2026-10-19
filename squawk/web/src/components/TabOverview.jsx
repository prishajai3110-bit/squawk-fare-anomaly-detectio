import React from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell
} from "recharts";
import { formatINR } from "../hooks/useData";

export default function TabOverview({ metrics, routeSummary }) {
  if (!metrics || !routeSummary) return null;

  const totalFares = metrics.total_observations || 7200;
  const anomaliesFlagged = metrics.individual_anomaly_detection?.confusion_matrix
    ? (metrics.individual_anomaly_detection.confusion_matrix.true_positive + metrics.individual_anomaly_detection.confusion_matrix.false_positive)
    : 0;
  const coordEvents = metrics.coordination_detection?.detected_events || 0;
  const anomalyF1 = (metrics.individual_anomaly_detection?.f1_score * 100 || 0).toFixed(1);

  const kpis = [
    { label: "Total Fares Analysed", value: totalFares.toLocaleString("en-IN"), detail: "180 days across 8 routes" },
    { label: "Anomalies Flagged", value: anomaliesFlagged.toLocaleString("en-IN"), detail: "Isolation Forest flags" },
    { label: "Coordination Events", value: coordEvents, detail: "Multi-airline price spikes" },
    { label: "Anomaly Model F1", value: `${anomalyF1}%`, detail: "Outlier precision/recall harmonic" }
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi, idx) => (
          <div key={idx} className="bg-slate-900/80 border border-slate-800 rounded-lg p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{kpi.label}</p>
            <p className="text-3xl font-bold text-sky-400 mt-2 font-mono">{kpi.value}</p>
            <p className="text-xs text-slate-400 mt-1">{kpi.detail}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-6 bg-slate-900/80 border border-slate-800 rounded-lg p-5">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-300 mb-4">
            Anomalies Flagged Per Route
          </h3>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={routeSummary} margin={{ top: 10, right: 10, left: -10, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="route" stroke="#64748b" tick={{ fontSize: 11 }} angle={-25} textAnchor="end" />
                <YAxis stroke="#64748b" tick={{ fontSize: 11 }} />
                <Tooltip
                  cursor={{ fill: "rgba(56, 189, 248, 0.08)" }}
                  contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155", color: "#f8fafc", fontSize: "12px" }}
                />
                <Bar dataKey="anomaly_count" name="Anomalies" radius={[4, 4, 0, 0]}>
                  {routeSummary.map((_, i) => (
                    <Cell key={`cell-${i}`} fill={i % 2 === 0 ? "#38bdf8" : "#0284c7"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="lg:col-span-6 bg-slate-900/80 border border-slate-800 rounded-lg p-5">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-300 mb-4">
            Route Operational Summary
          </h3>
          <div className="overflow-x-auto max-h-72">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400">
                  <th className="py-2.5 px-3 font-semibold">Route</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Avg Fare (INR)</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Anomalies</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Coordination</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {routeSummary.map((r) => (
                  <tr key={r.route} className="hover:bg-slate-800/40">
                    <td className="py-2.5 px-3 font-sans font-medium text-slate-200">{r.route}</td>
                    <td className="py-2.5 px-3 text-right text-slate-300">{formatINR(r.avg_fare_inr)}</td>
                    <td className="py-2.5 px-3 text-right text-sky-400">{r.anomaly_count}</td>
                    <td className="py-2.5 px-3 text-right text-amber-400">{r.coordination_events_detected}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
