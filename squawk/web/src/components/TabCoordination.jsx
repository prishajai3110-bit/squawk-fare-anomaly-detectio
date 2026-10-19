import React, { useState } from "react";

export default function TabCoordination({ coordinationEvents, correlation }) {
  const [selectedEventIndex, setSelectedEventIndex] = useState(0);

  if (!coordinationEvents || coordinationEvents.length === 0) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-8 text-center text-slate-400">
        No coordinated fare movements flagged.
      </div>
    );
  }

  const selectedEvent = coordinationEvents[selectedEventIndex] || coordinationEvents[0];
  const routeCorrData = correlation?.[selectedEvent.route]?.latest_window?.matrix || null;
  const airlines = ["IndiGo", "Air India", "SpiceJet", "Akasa Air", "Air India Express"];

  const getHeatmapColor = (val) => {
    if (val === undefined || isNaN(val)) return "bg-slate-800";
    if (val >= 0.7) return "bg-amber-500 text-slate-950 font-bold";
    if (val >= 0.4) return "bg-amber-600/70 text-slate-100";
    if (val >= 0.1) return "bg-slate-800 text-slate-300";
    if (val >= -0.1) return "bg-slate-900 text-slate-500";
    return "bg-sky-950 text-sky-400";
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 space-y-3">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-300 mb-2">
            Flagged Coordination Clusters ({coordinationEvents.length})
          </h3>
          <div className="space-y-3 max-h-[640px] overflow-y-auto pr-2">
            {coordinationEvents.map((ev, idx) => {
              const isSelected = idx === selectedEventIndex;
              return (
                <div
                  key={idx}
                  onClick={() => setSelectedEventIndex(idx)}
                  className={`p-4 rounded-lg border cursor-pointer transition-all ${
                    isSelected
                      ? "bg-slate-800/90 border-amber-500/80 shadow-md ring-1 ring-amber-500/30"
                      : "bg-slate-900/80 border-slate-800 hover:border-slate-700"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-base font-bold text-sky-400 font-mono">{ev.route}</span>
                    {ev.true_event ? (
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                        Matches Injected Event
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-800 text-slate-400 border border-slate-700">
                        Statistical Spike (FP)
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-xs mb-3 font-mono">
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-sans">Window</span>
                      <span className="text-slate-200">{ev.start_date} ? {ev.end_date}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-sans">Avg Shift</span>
                      <span className="text-amber-400 font-semibold">+{ev.mean_uplift_pct}%</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-sans">Coord Score</span>
                      <span className="text-sky-300 font-semibold">{ev.coordination_score}</span>
                    </div>
                  </div>

                  <div className="text-xs">
                    <span className="text-slate-400 text-[10px] uppercase block mb-1">Airlines Involved ({ev.airlines_involved.length}):</span>
                    <div className="flex flex-wrap gap-1.5">
                      {ev.airlines_involved.map((al) => (
                        <span key={al} className="px-2 py-0.5 bg-slate-950 border border-slate-700 text-slate-300 rounded text-[11px]">
                          {al}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="lg:col-span-5 bg-slate-900/80 border border-slate-800 rounded-lg p-5">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-300 mb-2">
            Airline Correlation Heatmap
          </h3>
          <p className="text-xs text-slate-400 mb-4">
            Rolling 14-day correlation matrix of day-over-day residual changes on route{" "}
            <span className="text-sky-400 font-mono font-semibold">{selectedEvent.route}</span>.
          </p>

          {routeCorrData ? (
            <div className="overflow-x-auto">
              <div className="min-w-[320px]">
                <div className="grid grid-cols-6 gap-1 text-[10px] font-mono mb-1">
                  <div></div>
                  {airlines.map((al) => (
                    <div key={al} className="truncate text-center text-slate-400" title={al}>
                      {al.split(" ")[0]}
                    </div>
                  ))}
                </div>

                {airlines.map((rowAl) => (
                  <div key={rowAl} className="grid grid-cols-6 gap-1 text-[11px] font-mono mb-1 items-center">
                    <div className="truncate text-right pr-1 text-slate-400 text-[10px]" title={rowAl}>
                      {rowAl.split(" ")[0]}
                    </div>
                    {airlines.map((colAl) => {
                      const val = routeCorrData[rowAl]?.[colAl] ?? 0;
                      return (
                        <div
                          key={colAl}
                          className={`h-9 flex items-center justify-center rounded border border-slate-900/40 ${getHeatmapColor(val)}`}
                          title={`${rowAl} × ${colAl}: ${val}`}
                        >
                          {Number(val).toFixed(2)}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-xs text-slate-400 italic py-8 text-center">
              Correlation window not available for this route.
            </div>
          )}

          <div className="mt-6 border-t border-slate-800 pt-3 text-[11px] text-slate-400 space-y-1">
            <p className="font-semibold text-slate-300">Interpretation:</p>
            <p>• High positive values (= 0.70) indicate that fare residuals surged on the exact same days.</p>
            <p>• Cross-airline synchronization without underlying fuel or holiday changes indicates co-movement.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
