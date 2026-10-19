import React, { useState } from "react";
import { formatINR } from "../hooks/useData";

export default function TabPlayground({ faresSample, setFaresSample }) {
  const routes = ["HYD-DEL", "HYD-BOM", "HYD-BLR", "DEL-BOM", "BLR-DEL", "MAA-HYD", "CCU-DEL", "BOM-GOI"];
  const airlines = ["IndiGo", "Air India", "SpiceJet", "Akasa Air", "Air India Express"];

  const routeBases = {
    "HYD-DEL": 5200, "HYD-BOM": 4100, "HYD-BLR": 3200, "DEL-BOM": 5500,
    "BLR-DEL": 5800, "MAA-HYD": 3100, "CCU-DEL": 6200, "BOM-GOI": 3400
  };
  const airlineFactors = {
    "IndiGo": 1.0, "Air India": 1.12, "SpiceJet": 0.94, "Akasa Air": 0.92, "Air India Express": 0.90
  };

  // Tool 1: Single Flight Live Audit
  const [auditRoute, setAuditRoute] = useState("HYD-DEL");
  const [auditAirline, setAuditAirline] = useState("IndiGo");
  const [auditDays, setAuditDays] = useState(10);
  const [auditFare, setAuditFare] = useState(6200);
  const [auditResult, setAuditResult] = useState(null);

  const handleAudit = (e) => {
    e.preventDefault();
    const base = routeBases[auditRoute] || 4500;
    const factor = airlineFactors[auditAirline] || 1.0;
    const demandMultiplier = 1.0 + 0.90 * Math.exp(-auditDays / 10.0);
    const expected = Math.round(base * factor * demandMultiplier);

    const logResidual = Math.log(auditFare) - Math.log(expected);
    const zScore = (logResidual / 0.08).toFixed(2);
    const deviationPct = Math.round(((auditFare - expected) / expected) * 100);
    const isAnomaly = Math.abs(zScore) >= 2.0;

    let severity = "Normal";
    if (isAnomaly) {
      if (Math.abs(zScore) >= 3.5) severity = "High";
      else if (Math.abs(zScore) >= 2.5) severity = "Medium";
      else severity = "Low";
    }

    setAuditResult({
      expected,
      deviationPct,
      zScore,
      isAnomaly,
      severity
    });
  };

  // Tool 2: Coordinated Spike Simulator
  const [coordRoute, setCoordRoute] = useState("DEL-BOM");
  const [selectedAirlines, setSelectedAirlines] = useState(["IndiGo", "Air India", "SpiceJet"]);
  const [surgePct, setSurgePct] = useState(18);
  const [coordResult, setCoordResult] = useState(null);

  const toggleAirline = (al) => {
    if (selectedAirlines.includes(al)) {
      setSelectedAirlines(selectedAirlines.filter((a) => a !== al));
    } else {
      setSelectedAirlines([...selectedAirlines, al]);
    }
  };

  const handleSimulateCoordination = () => {
    const isCoordinated = selectedAirlines.length >= 3 && surgePct >= 8;
    const totalAirlines = airlines.length;
    const coordScore = isCoordinated
      ? ((selectedAirlines.length / totalAirlines) * (surgePct / 100) * 4 * 10).toFixed(2)
      : 0;

    setCoordResult({
      isCoordinated,
      participatingCount: selectedAirlines.length,
      surgePct,
      coordScore,
      message: isCoordinated
        ? `ALERT: Coordinated Surge Detected on ${coordRoute}! >=3 competing carriers synchronized price shifts exceeding the +8% residual threshold.`
        : `NO COLLUSION FLAG: Move does not meet the multi-carrier statutory threshold (requires >=3 carriers with >=8% surge).`
    });
  };

  // Tool 3: Dynamic CSV Batch Ingest
  const [csvStats, setCsvStats] = useState(null);

  const handleCsvUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target.result;
      const lines = text.trim().split("\n");
      if (lines.length <= 1) return;

      const headers = lines[0].split(",").map((h) => h.trim());
      const routeIdx = headers.indexOf("route");
      const airlineIdx = headers.indexOf("airline");
      const fareIdx = headers.indexOf("fare_inr");
      const daysIdx = headers.indexOf("days_to_departure");

      let processed = 0;
      let anomaliesCount = 0;

      for (let i = 1; i < lines.length; i++) {
        const parts = lines[i].split(",").map((p) => p.trim());
        if (parts.length < headers.length) continue;

        const r = parts[routeIdx] || "HYD-DEL";
        const al = parts[airlineIdx] || "IndiGo";
        const fare = parseFloat(parts[fareIdx]);
        const days = parseFloat(parts[daysIdx]) || 15;

        if (isNaN(fare)) continue;

        const base = routeBases[r] || 4500;
        const factor = airlineFactors[al] || 1.0;
        const expected = Math.round(base * factor * (1.0 + 0.90 * Math.exp(-days / 10.0)));
        const z = (Math.log(fare) - Math.log(expected)) / 0.08;

        processed++;
        if (Math.abs(z) >= 2.0) anomaliesCount++;
      }

      setCsvStats({
        fileName: file.name,
        totalRows: processed,
        flaggedAnomalies: anomaliesCount,
        anomalyRate: ((anomaliesCount / Math.max(1, processed)) * 100).toFixed(1)
      });
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-8">
      {/* Tool 1: Realtime Single Flight Audit */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-6 shadow-md">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-sky-400">
              1. Live Single Fare Evaluator
            </h3>
            <p className="text-xs text-slate-400">
              Test dynamic pricing, residual deviations, and MAD Z-scores on custom inputs.
            </p>
          </div>
          <span className="text-[10px] bg-sky-500/10 text-sky-300 border border-sky-500/20 px-2 py-0.5 rounded font-mono">
            INSTANT INFERENCE
          </span>
        </div>

        <form onSubmit={handleAudit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
          <div>
            <label className="block text-[11px] uppercase font-semibold text-slate-400 mb-1">Route</label>
            <select
              value={auditRoute}
              onChange={(e) => setAuditRoute(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 text-slate-200 text-xs rounded px-3 py-2 font-mono"
            >
              {routes.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-[11px] uppercase font-semibold text-slate-400 mb-1">Airline</label>
            <select
              value={auditAirline}
              onChange={(e) => setAuditAirline(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 text-slate-200 text-xs rounded px-3 py-2"
            >
              {airlines.map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-[11px] uppercase font-semibold text-slate-400 mb-1">Days to Departure</label>
            <input
              type="number"
              min="1"
              max="60"
              value={auditDays}
              onChange={(e) => setAuditDays(Number(e.target.value))}
              className="w-full bg-slate-950 border border-slate-700 text-slate-200 text-xs rounded px-3 py-2 font-mono"
            />
          </div>

          <div>
            <label className="block text-[11px] uppercase font-semibold text-slate-400 mb-1">Observed Fare (INR)</label>
            <input
              type="number"
              step="50"
              value={auditFare}
              onChange={(e) => setAuditFare(Number(e.target.value))}
              className="w-full bg-slate-950 border border-slate-700 text-slate-200 text-xs rounded px-3 py-2 font-mono"
            />
          </div>

          <div>
            <button
              type="submit"
              className="w-full bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-bold py-2 rounded transition-colors shadow"
            >
              Audit Fare
            </button>
          </div>
        </form>

        {auditResult && (
          <div className={`mt-5 p-4 rounded-md border flex flex-col md:flex-row items-center justify-between gap-4 ${
            auditResult.isAnomaly ? "bg-rose-950/30 border-rose-600/40" : "bg-emerald-950/20 border-emerald-600/30"
          }`}>
            <div className="flex items-center gap-3">
              <span className={`w-3 h-3 rounded-full ${auditResult.isAnomaly ? "bg-rose-500 animate-pulse" : "bg-emerald-400"}`}></span>
              <div>
                <p className="text-xs font-bold text-slate-200">
                  {auditResult.isAnomaly ? "ANOMALY FLAGGED" : "NORMAL MARKET FARE"}
                </p>
                <p className="text-[11px] text-slate-400">
                  Expected Baseline: <span className="font-mono text-slate-300">{formatINR(auditResult.expected)}</span> | Deviation:{" "}
                  <span className={`font-mono font-semibold ${auditResult.deviationPct >= 0 ? "text-rose-400" : "text-emerald-400"}`}>
                    {auditResult.deviationPct >= 0 ? `+${auditResult.deviationPct}%` : `${auditResult.deviationPct}%`}
                  </span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-6 font-mono text-xs">
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-sans">Residual Z-Score</span>
                <span className="text-slate-200">{auditResult.zScore}s</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-sans">Severity</span>
                <span className={`font-bold ${
                  auditResult.severity === "High" ? "text-rose-400" :
                  auditResult.severity === "Medium" ? "text-amber-400" :
                  auditResult.severity === "Low" ? "text-yellow-300" : "text-slate-400"
                }`}>
                  {auditResult.severity}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Tool 2: Coordinated Spike Simulator */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-6 shadow-md">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-amber-400">
              2. Collusion & Coordination Stress-Tester
            </h3>
            <p className="text-xs text-slate-400">
              Test the antitrust detection engine: simulate coordinated multi-carrier price hikes.
            </p>
          </div>
          <span className="text-[10px] bg-amber-500/10 text-amber-300 border border-amber-500/20 px-2 py-0.5 rounded font-mono">
            ANTITRUST ENGINE
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-5">
          <div>
            <label className="block text-[11px] uppercase font-semibold text-slate-400 mb-1">Route</label>
            <select
              value={coordRoute}
              onChange={(e) => setCoordRoute(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 text-slate-200 text-xs rounded px-3 py-2 font-mono"
            >
              {routes.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-[11px] uppercase font-semibold text-slate-400 mb-1">
              Coordinated Uplift: <span className="text-amber-400 font-mono">+{surgePct}%</span>
            </label>
            <input
              type="range"
              min="0"
              max="40"
              value={surgePct}
              onChange={(e) => setSurgePct(Number(e.target.value))}
              className="w-full accent-amber-500 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-500 font-mono">
              <span>0%</span>
              <span className="text-amber-500/70 font-semibold">Threshold (8%)</span>
              <span>40%</span>
            </div>
          </div>

          <div>
            <label className="block text-[11px] uppercase font-semibold text-slate-400 mb-1">Involved Carriers</label>
            <div className="flex flex-wrap gap-1.5">
              {airlines.map((al) => {
                const active = selectedAirlines.includes(al);
                return (
                  <button
                    key={al}
                    type="button"
                    onClick={() => toggleAirline(al)}
                    className={`px-2 py-1 rounded text-[11px] font-sans border transition-all ${
                      active
                        ? "bg-amber-500/20 border-amber-500 text-amber-300 font-semibold"
                        : "bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-300"
                    }`}
                  >
                    {al}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <button
          onClick={handleSimulateCoordination}
          className="bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold px-5 py-2 rounded transition-colors shadow"
        >
          Evaluate Antitrust Signal
        </button>

        {coordResult && (
          <div className={`mt-5 p-4 rounded-md border ${
            coordResult.isCoordinated ? "bg-amber-950/30 border-amber-500/50" : "bg-slate-950 border-slate-800"
          }`}>
            <p className={`text-xs font-semibold ${coordResult.isCoordinated ? "text-amber-300" : "text-slate-400"}`}>
              {coordResult.message}
            </p>
            {coordResult.isCoordinated && (
              <div className="mt-2 flex gap-4 text-xs font-mono text-slate-300">
                <span>Carriers: {coordResult.participatingCount} / 5</span>
                <span>Uplift: +{coordResult.surgePct}%</span>
                <span>Coordination Score: <strong className="text-amber-400">{coordResult.coordScore}</strong></span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Tool 3: Dynamic CSV Batch Ingest */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-6 shadow-md">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-emerald-400">
              3. Custom CSV Batch Scanner
            </h3>
            <p className="text-xs text-slate-400">
              Upload any CSV with columns <code className="text-slate-300">route, airline, fare_inr, days_to_departure</code> to run detection instantly.
            </p>
          </div>
          <span className="text-[10px] bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 px-2 py-0.5 rounded font-mono">
            BATCH SCANNER
          </span>
        </div>

        <div className="border-2 border-dashed border-slate-700 rounded-lg p-6 text-center hover:border-slate-500 transition-colors">
          <input
            type="file"
            accept=".csv"
            onChange={handleCsvUpload}
            className="block w-full text-xs text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-slate-800 file:text-sky-400 hover:file:bg-slate-700 cursor-pointer"
          />
        </div>

        {csvStats && (
          <div className="mt-4 p-4 rounded bg-slate-950 border border-slate-800 flex items-center justify-between text-xs font-mono">
            <div>
              <p className="text-slate-300 font-bold">{csvStats.fileName}</p>
              <p className="text-slate-500 text-[11px]">Processed {csvStats.totalRows} observations</p>
            </div>
            <div className="flex gap-6">
              <div>
                <span className="text-slate-500 block text-[10px] uppercase font-sans">Anomalies</span>
                <span className="text-rose-400 font-bold text-sm">{csvStats.flaggedAnomalies}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px] uppercase font-sans">Anomaly Rate</span>
                <span className="text-sky-400 font-bold text-sm">{csvStats.anomalyRate}%</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
