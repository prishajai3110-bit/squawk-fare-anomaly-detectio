import React, { useState } from "react";
import { useData } from "./hooks/useData";
import TabOverview from "./components/TabOverview";
import TabFareExplorer from "./components/TabFareExplorer";
import TabAnomalies from "./components/TabAnomalies";
import TabCoordination from "./components/TabCoordination";
import TabModelPerformance from "./components/TabModelPerformance";
import TabPlayground from "./components/TabPlayground";

export default function App() {
  const [activeTab, setActiveTab] = useState("overview");
  const { data, loading, error } = useData();

  const tabs = [
    { id: "overview", label: "1. Overview" },
    { id: "explorer", label: "2. Fare Explorer" },
    { id: "anomalies", label: "3. Anomalies" },
    { id: "coordination", label: "4. Coordination" },
    { id: "performance", label: "5. Model Performance" },
    { id: "playground", label: "6. Live Playground" }
  ];

  return (
    <div className="min-h-screen bg-[#0b1329] text-slate-200 flex flex-col font-sans">
      <header className="border-b border-slate-800 bg-[#070c1b]/90 backdrop-blur sticky top-0 z-50 px-6 py-4">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-baseline gap-3">
            <span className="text-2xl font-black tracking-widest text-sky-400 font-mono">SQUAWK</span>
            <span className="text-xs text-slate-400 font-medium">Flight Fare Anomaly & Coordination Detection</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="text-[11px] font-mono text-slate-400">STATUS: ACTIVE PIPELINE</span>
          </div>
        </div>
      </header>

      <div className="bg-amber-950/40 border-b border-amber-600/30 px-6 py-2.5">
        <div className="max-w-7xl mx-auto flex items-center gap-2 text-xs text-amber-300">
          <span className="font-bold text-amber-400 uppercase tracking-wider text-[10px] bg-amber-500/20 px-1.5 py-0.5 rounded border border-amber-500/30">
            DEMO
          </span>
          <span>
            Demo built on synthetic data with injected anomalies. Flags are statistical signals, not proof of collusion.
          </span>
        </div>
      </div>

      <div className="border-b border-slate-800 bg-slate-950/60 px-6">
        <div className="max-w-7xl mx-auto flex gap-2 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-3 px-4 text-xs font-semibold whitespace-nowrap transition-colors border-b-2 ${
                activeTab === tab.id
                  ? "border-sky-400 text-sky-400 bg-sky-950/20"
                  : "border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <main className="flex-1 max-w-7xl w-full mx-auto p-6">
        {loading && (
          <div className="flex flex-col items-center justify-center py-24 space-y-4">
            <div className="w-8 h-8 border-2 border-sky-400 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-xs text-slate-400 font-mono tracking-wider">READING PIPELINE ARTIFACTS (/data/*.json)...</p>
          </div>
        )}

        {error && (
          <div className="bg-rose-950/40 border border-rose-500/40 p-6 rounded-lg text-rose-300 text-xs">
            <p className="font-bold mb-1">Failed to Load Pipeline Data:</p>
            <p className="font-mono">{error}</p>
            <p className="mt-3 text-slate-400">
              Ensure you ran <code className="text-slate-200 bg-slate-800 px-1 py-0.5 rounded">python run_all.py</code> first, and verify that the 7 JSON files exist in <code className="text-slate-200 bg-slate-800 px-1 py-0.5 rounded">squawk/web/public/data/</code>.
            </p>
          </div>
        )}

        {!loading && !error && (
          <>
            {activeTab === "overview" && (
              <TabOverview metrics={data.metrics} routeSummary={data.routeSummary} />
            )}
            {activeTab === "explorer" && (
              <TabFareExplorer faresSample={data.faresSample} coordinationEvents={data.coordinationEvents} />
            )}
            {activeTab === "anomalies" && (
              <TabAnomalies anomalies={data.anomalies} />
            )}
            {activeTab === "coordination" && (
              <TabCoordination coordinationEvents={data.coordinationEvents} correlation={data.correlation} />
            )}
            {activeTab === "performance" && (
              <TabModelPerformance metrics={data.metrics} featureImportance={data.featureImportance} />
            )}
            {activeTab === "playground" && (
              <TabPlayground faresSample={data.faresSample} />
            )}
          </>
        )}
      </main>

      <footer className="border-t border-slate-900 px-6 py-4 text-center text-[11px] text-slate-400 font-mono">
        SQUAWK · Synthetic Aviation Antitrust & Anomaly Detection Workbench
      </footer>
    </div>
  );
}
