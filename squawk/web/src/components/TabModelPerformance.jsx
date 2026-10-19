import React from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid
} from "recharts";

export default function TabModelPerformance({ metrics, featureImportance }) {
  if (!metrics) return null;

  const fareModel = metrics.fare_model || {};
  const anomModel = metrics.individual_anomaly_detection || {};
  const cm = anomModel.confusion_matrix || { true_negative: 0, false_positive: 0, false_negative: 0, true_positive: 0 };
  const coordModel = metrics.coordination_detection || {};

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">A) Fare Regressor (XGBoost)</p>
          <div className="mt-4 space-y-2 font-mono text-sm">
            <div className="flex justify-between border-b border-slate-800/80 pb-1">
              <span className="text-slate-400 font-sans text-xs">Model Type</span>
              <span className="text-slate-200">{fareModel.model_type}</span>
            </div>
            <div className="flex justify-between border-b border-slate-800/80 pb-1">
              <span className="text-slate-400 font-sans text-xs">Test MAE</span>
              <span className="text-sky-400 font-bold">?{fareModel.test_mae_inr}</span>
            </div>
            <div className="flex justify-between border-b border-slate-800/80 pb-1">
              <span className="text-slate-400 font-sans text-xs">Test MAPE</span>
              <span className="text-sky-400 font-bold">{fareModel.test_mape_pct}%</span>
            </div>
            <div className="flex justify-between text-xs text-slate-400 pt-1 font-sans">
              <span>Split Method</span>
              <span>70% Time-Based (No Leak)</span>
            </div>
          </div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">B) Outlier Model (Isolation Forest)</p>
          <div className="mt-4 space-y-2 font-mono text-sm">
            <div className="flex justify-between border-b border-slate-800/80 pb-1">
              <span className="text-slate-400 font-sans text-xs">Precision</span>
              <span className="text-emerald-400 font-bold">{(anomModel.precision * 100).toFixed(1)}%</span>
            </div>
            <div className="flex justify-between border-b border-slate-800/80 pb-1">
              <span className="text-slate-400 font-sans text-xs">Recall</span>
              <span className="text-emerald-400 font-bold">{(anomModel.recall * 100).toFixed(1)}%</span>
            </div>
            <div className="flex justify-between border-b border-slate-800/80 pb-1">
              <span className="text-slate-400 font-sans text-xs">F1 Score</span>
              <span className="text-emerald-400 font-bold">{(anomModel.f1_score * 100).toFixed(1)}%</span>
            </div>
            <div className="flex justify-between text-xs text-slate-400 pt-1 font-sans">
              <span>Contamination Param</span>
              <span>{(anomModel.contamination_parameter * 100).toFixed(0)}%</span>
            </div>
          </div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">C) Coordination Rule Engine</p>
          <div className="mt-4 space-y-2 font-mono text-sm">
            <div className="flex justify-between border-b border-slate-800/80 pb-1">
              <span className="text-slate-400 font-sans text-xs">Event Precision</span>
              <span className="text-amber-400 font-bold">{(coordModel.event_precision * 100).toFixed(1)}%</span>
            </div>
            <div className="flex justify-between border-b border-slate-800/80 pb-1">
              <span className="text-slate-400 font-sans text-xs">Event Recall</span>
              <span className="text-amber-400 font-bold">{(coordModel.event_recall * 100).toFixed(1)}%</span>
            </div>
            <div className="flex justify-between border-b border-slate-800/80 pb-1">
              <span className="text-slate-400 font-sans text-xs">Ground Truth Overlap</span>
              <span className="text-slate-200">{coordModel.true_positive_events} / {coordModel.ground_truth_events}</span>
            </div>
            <div className="flex justify-between text-xs text-slate-400 pt-1 font-sans">
              <span>Rule Type</span>
              <span>Deterministic Multi-Carrier</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-5 bg-slate-900/80 border border-slate-800 rounded-lg p-5">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-300 mb-4">
            Anomaly Detection Confusion Matrix
          </h3>
          <div className="grid grid-cols-2 gap-3 text-center font-mono">
            <div className="bg-slate-950 p-4 rounded border border-slate-800">
              <p className="text-[10px] text-slate-400 font-sans uppercase">True Negative (Normal)</p>
              <p className="text-2xl font-bold text-slate-300 mt-1">{cm.true_negative.toLocaleString("en-IN")}</p>
            </div>
            <div className="bg-slate-950 p-4 rounded border border-slate-800">
              <p className="text-[10px] text-slate-400 font-sans uppercase">False Positive (Type I)</p>
              <p className="text-2xl font-bold text-rose-400 mt-1">{cm.false_positive.toLocaleString("en-IN")}</p>
            </div>
            <div className="bg-slate-950 p-4 rounded border border-slate-800">
              <p className="text-[10px] text-slate-400 font-sans uppercase">False Negative (Type II)</p>
              <p className="text-2xl font-bold text-amber-400 mt-1">{cm.false_negative.toLocaleString("en-IN")}</p>
            </div>
            <div className="bg-slate-950 p-4 rounded border border-slate-800">
              <p className="text-[10px] text-slate-400 font-sans uppercase">True Positive (Flagged)</p>
              <p className="text-2xl font-bold text-emerald-400 mt-1">{cm.true_positive.toLocaleString("en-IN")}</p>
            </div>
          </div>
        </div>

        <div className="lg:col-span-7 bg-slate-900/80 border border-slate-800 rounded-lg p-5">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-300 mb-4">
            XGBoost Expected Fare Feature Importance (Gain)
          </h3>
          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                layout="vertical"
                data={featureImportance ? featureImportance.slice(0, 7) : []}
                margin={{ top: 5, right: 30, left: 70, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
                <XAxis type="number" stroke="#64748b" tick={{ fontSize: 10 }} />
                <YAxis dataKey="feature" type="category" stroke="#64748b" tick={{ fontSize: 10 }} />
                <Tooltip
                  cursor={{ fill: "rgba(56, 189, 248, 0.08)" }}
                  contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155", color: "#f8fafc", fontSize: "11px" }}
                />
                <Bar dataKey="importance" fill="#38bdf8" radius={[0, 4, 4, 0]} name="Gain" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-5">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-sky-400 mb-2">Detection Methodology</h4>
        <p className="text-xs text-slate-300 leading-relaxed">
          1. <strong>XGBoost Expected Fare:</strong> Learns legit pricing based on route, lead time curve, holiday windows, and day of week without temporal leakage.<br />
          2. <strong>Isolation Forest Outliers:</strong> Evaluates deviations via robust MAD residual Z-scores and 7-day velocity change to detect fat-finger spikes and flash-sale drops.<br />
          3. <strong>Antitrust Rule Engine:</strong> Coordination detection intentionally bypasses black-box ML in favour of an auditable rule: flagging when = 3 competing carriers hike unexplained residuals by &gt; 8% within 24 hours.
        </p>
      </div>
    </div>
  );
}
