import { useState, useEffect } from "react";

export function useData() {
  const [data, setData] = useState({
    metrics: null,
    routeSummary: null,
    faresSample: null,
    anomalies: null,
    coordinationEvents: null,
    correlation: null,
    featureImportance: null
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchAll() {
      setLoading(true);
      setError(null);
      try {
        const endpoints = [
          { key: "metrics", url: "/data/metrics.json" },
          { key: "routeSummary", url: "/data/route_summary.json" },
          { key: "faresSample", url: "/data/fares_sample.json" },
          { key: "anomalies", url: "/data/anomalies.json" },
          { key: "coordinationEvents", url: "/data/coordination_events.json" },
          { key: "correlation", url: "/data/correlation.json" },
          { key: "featureImportance", url: "/data/feature_importance.json" }
        ];

        const results = await Promise.all(
          endpoints.map(async ({ key, url }) => {
            const res = await fetch(url);
            if (!res.ok) {
              throw new Error(`Failed to load ${url} (HTTP ${res.status})`);
            }
            const json = await res.json();
            return { key, json };
          })
        );

        const loaded = {};
        results.forEach(({ key, json }) => {
          loaded[key] = json;
        });

        setData(loaded);
      } catch (err) {
        console.error("SQUAWK Data Fetch Error:", err);
        setError(err.message || "Error loading dashboard data files.");
      } finally {
        setLoading(false);
      }
    }

    fetchAll();
  }, []);

  return { data, loading, error };
}

export function formatINR(val) {
  if (val === undefined || val === null || isNaN(val)) return "?0";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0
  }).format(val);
}
