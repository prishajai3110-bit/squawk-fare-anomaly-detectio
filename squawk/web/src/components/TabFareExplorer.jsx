import React, { useState, useMemo } from "react";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceArea, Legend
} from "recharts";
import { formatINR } from "../hooks/useData";

const AIRLINE_COLORS = {
  "IndiGo": "#38bdf8",
  "Air India": "#ef4444",
  "SpiceJet": "#f97316",
  "Akasa Air": "#a855f7",
  "Air India Express": "#10b981"
};

export default function TabFareExplorer({ faresSample, coordinationEvents }) {
  const routes = useMemo(() => Object.keys(faresSample || {}), [faresSample]);
  const [selectedRoute, setSelectedRoute] = useState(routes[0] || "HYD-DEL");

  const allAirlines = ["IndiGo", "Air India", "SpiceJet", "Akasa Air", "Air India Express"];
  const [activeAirlines, setActiveAirlines] = useState(allAirlines);

  const toggleAirline = (al) => {
    if (activeAirlines.includes(al)) {
      if (activeAirlines.length > 1) {
        setActiveAirlines(activeAirlines.filter((a) => a !== al));
      }
    } else {
      setActiveAirlines([...activeAirlines, al]);
    }
  };

  const chartData = useMemo(() => {
    if (!faresSample || !faresSample[selectedRoute]) return [];
    const dateMap = {};

    faresSample[selectedRoute].forEach((row) => {
      const d = row.obs_date;
      if (!dateMap[d]) {
        dateMap[d] = { date: d, anomalies: [] };
      }
      dateMap[d][row.airline] = row.fare_inr;
      if (row.is_anomaly === 1) {
        dateMap[d].anomalies.push({
          airline: row.airline,
          fare: row.fare_inr
        });
      }
    });

    return Object.values(dateMap).sort((a, b) => a.date.localeCompare(b.date));
  }, [faresSample, selectedRoute]);

  const routeEvents = useMemo(() => {
    if (!coordinationEvents) return [];
    return coordinationEvents.filter((ev) => ev.route === selectedRoute);
  }, [coordinationEvents, selectedRoute]);

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-900 border border-slate-700 p-3 rounded shadow-xl text-xs space-y-1">
          <p className="font-semibold text-slate-300 border-b border-slate-700 pb-1 mb-1 font-mono">{label}</p>
          {payload.map((entry, idx) => (
            <div key={idx} className="flex justify-between gap-4" style={{ color: entry.color }}>
              <span>{entry.name}:</span>
              <span className="font-mono font-medium">{formatINR(entry.value)}</span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <label className="text-xs uppercase font-semibold text-slate-400">Route:</label>
          <select
            value={selectedRoute}
            onChange={(e) => setSelectedRoute(e.target.value)}
            className="bg-slate-950 border border-slate-700 text-sky-400 font-mono text-sm rounded px-3 py-1.5 focus:outline-none focus:border-sky-500"
          >
            {routes.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <span className="text-xs uppercase font-semibold text-slate-400 mr-1">Airlines:</span>
          {allAirlines.map((al) => {
            const checked = activeAirlines.includes(al);
            return (
              <label
                key={al}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs cursor-pointer border transition-colors ${
                  checked
                    ? "border-slate-600 bg-slate-800/80 text-slate-200"
                    : "border-slate-800 bg-slate-950 text-slate-400 opacity-60"
                }`}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggleAirline(al)}
                  className="rounded text-sky-500 focus:ring-0 bg-slate-900 border-slate-700 cursor-pointer"
                />
                <span style={{ color: AIRLINE_COLORS[al] }}>{al}</span>
              </label>
            );
          })}
        </div>
      </div>

      <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-5">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-300">
            Observed Daily Fares & Coordination Windows ({selectedRoute})
          </h3>
          <div className="flex items-center gap-4 text-xs text-slate-400">
            <span className="inline-flex items-center gap-1.5">
              <span className="w-3 h-3 bg-amber-500/20 border border-amber-500/60 rounded"></span>
              Coordination Shaded Band
            </span>
          </div>
        </div>

        <div className="h-96 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 20, right: 30, left: 10, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
              <XAxis dataKey="date" stroke="#64748b" tick={{ fontSize: 11 }} minTickGap={30} />
              <YAxis
                stroke="#64748b"
                tick={{ fontSize: 11 }}
                domain={["auto", "auto"]}
                tickFormatter={(val) => `?${(val / 1000).toFixed(1)}k`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: "12px" }} />

              {routeEvents.map((ev, i) => (
                <ReferenceArea
                  key={`ref-${i}`}
                  x1={ev.start_date}
                  x2={ev.end_date}
                  fill="#f59e0b"
                  fillOpacity={0.12}
                  stroke="#d97706"
                  strokeDasharray="3 3"
                />
              ))}

              {activeAirlines.map((al) => (
                <Line
                  key={al}
                  type="monotone"
                  dataKey={al}
                  name={al}
                  stroke={AIRLINE_COLORS[al]}
                  strokeWidth={1.8}
                  dot={false}
                  activeDot={{ r: 5 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
        <p className="text-xs text-slate-400 mt-3 italic">
          Shaded amber zones represent multi-airline coordinated residual spikes detected on {selectedRoute}.
        </p>
      </div>
    </div>
  );
}
