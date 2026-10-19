"""
train_and_detect.py
Runs:
  1. XGBoost baseline fare regression with time-based train/test split.
  2. Isolation Forest individual anomaly detection on residual and velocity features.
  3. Rule-based, multi-airline residual surge correlation for coordination detection.
  4. Exports structured JSON payloads for web visualization.
"""

from datetime import datetime
import json
import os
import numpy as np
import pandas as pd
from sklearn.ensemble import IsolationForest
from sklearn.metrics import confusion_matrix, f1_score, precision_score, recall_score
import xgboost as xgb

def run_pipeline():
    script_dir = os.path.dirname(os.path.abspath(__file__))
    data_csv = os.path.join(script_dir, "..", "data", "fares.csv")
    web_data_dir = os.path.join(script_dir, "..", "web", "public", "data")
    os.makedirs(web_data_dir, exist_ok=True)

    if not os.path.exists(data_csv):
        raise FileNotFoundError(f"Input file not found: {data_csv}. Run generate_data.py first.")

    df = pd.read_csv(data_csv)
    df["obs_date_dt"] = pd.to_datetime(df["obs_date"])
    df = df.sort_values(by=["obs_date_dt", "route", "airline"]).reset_index(drop=True)

    # ---------------------------------------------------------
    # PART A: Fare Baseline Model (XGBoost)
    # ---------------------------------------------------------
    df["month"] = df["obs_date_dt"].dt.month
    df["is_festival_window"] = df["obs_date_dt"].apply(
        lambda d: 1 if (
            (datetime(2025, 10, 20) <= d <= datetime(2025, 11, 5))
            or (datetime(2025, 12, 25) <= d <= datetime(2026, 1, 2))
        ) else 0
    )

    feature_cols = [
        "days_to_departure", "dep_dow", "dep_hour", "stops", "month", "is_festival_window"
    ]
    categorical_cols = ["route", "airline"]
    df_encoded = pd.get_dummies(df[categorical_cols + feature_cols], columns=categorical_cols, drop_first=False)
    encoded_features = df_encoded.columns.tolist()

    y_log = np.log(df["fare_inr"].values)

    # Time-based 70/30 split: prevents temporal leakage from future demand patterns into past observations
    unique_dates = sorted(df["obs_date"].unique())
    split_idx = int(len(unique_dates) * 0.70)
    split_date = unique_dates[split_idx]

    train_mask = df["obs_date"] < split_date
    test_mask = df["obs_date"] >= split_date

    # Clean training set: omit anomalies and collusion events to let model learn legitimate pricing
    clean_train_mask = train_mask & (df["is_injected_anomaly"] == 0) & (df["coordination_event_id"].isna() | (df["coordination_event_id"] == ""))

    X_train = df_encoded.loc[clean_train_mask]
    y_train = y_log[clean_train_mask]

    X_test = df_encoded.loc[test_mask]
    y_test_fare = df.loc[test_mask, "fare_inr"].values

    model = xgb.XGBRegressor(
        n_estimators=180,
        max_depth=5,
        learning_rate=0.08,
        subsample=0.85,
        colsample_bytree=0.85,
        random_state=42,
        n_jobs=-1
    )
    model.fit(X_train, y_train)

    y_pred_log_test = model.predict(X_test)
    y_pred_fare_test = np.exp(y_pred_log_test)
    test_mae = float(np.mean(np.abs(y_test_fare - y_pred_fare_test)))
    test_mape = float(np.mean(np.abs((y_test_fare - y_pred_fare_test) / y_test_fare)) * 100.0)

    df["predicted_fare"] = np.exp(model.predict(df_encoded)).round(2)
    df["log_residual"] = np.log(df["fare_inr"]) - np.log(df["predicted_fare"])

    def calc_robust_z(group):
        med = group.median()
        mad = (group - med).abs().median()
        if mad == 0 or np.isnan(mad):
            mad = 1e-4
        return 0.6745 * (group - med) / mad

    df["residual_zscore"] = df.groupby("route")["log_residual"].transform(calc_robust_z)

    importance_dict = {
        col: float(imp) for col, imp in zip(encoded_features, model.feature_importances_)
    }
    importance_sorted = sorted(importance_dict.items(), key=lambda x: x[1], reverse=True)

    # ---------------------------------------------------------
    # PART B: Individual Anomaly Detection (Isolation Forest)
    # ---------------------------------------------------------
    route_day_median = df.groupby(["obs_date", "route"])["fare_inr"].transform("median")
    df["route_day_rel_fare"] = df["fare_inr"] / route_day_median

    daily_airline_fare = df.groupby(["obs_date", "route", "airline"])["fare_inr"].mean().reset_index()
    daily_airline_fare = daily_airline_fare.sort_values(by="obs_date")
    daily_airline_fare["fare_rolling_7d_mean"] = daily_airline_fare.groupby(["route", "airline"])["fare_inr"].transform(
        lambda s: s.rolling(window=7, min_periods=1).mean()
    )
    daily_airline_fare["fare_7d_rel_change"] = (
        (daily_airline_fare["fare_inr"] - daily_airline_fare["fare_rolling_7d_mean"])
        / daily_airline_fare["fare_rolling_7d_mean"]
    )
    df = df.merge(
        daily_airline_fare[["obs_date", "route", "airline", "fare_7d_rel_change"]],
        on=["obs_date", "route", "airline"],
        how="left"
    )
    df["fare_7d_rel_change"] = df["fare_7d_rel_change"].fillna(0.0)

    if_features = ["residual_zscore", "log_residual", "route_day_rel_fare", "fare_7d_rel_change"]
    iso_forest = IsolationForest(
        n_estimators=200,
        contamination=0.02,
        random_state=42,
        n_jobs=-1
    )
    iso_preds = iso_forest.fit_predict(df[if_features])
    df["is_anomaly_detected"] = (iso_preds == -1).astype(int)

    score_vals = iso_forest.decision_function(df[if_features])
    df["anomaly_score"] = score_vals
    detected_scores = df.loc[df["is_anomaly_detected"] == 1, "anomaly_score"]

    t33, t66 = detected_scores.quantile(0.33), detected_scores.quantile(0.66)
    def assign_severity(row):
        if row["is_anomaly_detected"] == 0:
            return "None"
        if row["anomaly_score"] <= t33:
            return "High"
        elif row["anomaly_score"] <= t66:
            return "Medium"
        return "Low"

    df["severity"] = df.apply(assign_severity, axis=1)

    y_true_anom = df["is_injected_anomaly"].values
    y_pred_anom = df["is_anomaly_detected"].values
    if_prec = float(precision_score(y_true_anom, y_pred_anom, zero_division=0))
    if_rec = float(recall_score(y_true_anom, y_pred_anom, zero_division=0))
    if_f1 = float(f1_score(y_true_anom, y_pred_anom, zero_division=0))
    cm = confusion_matrix(y_true_anom, y_pred_anom).tolist()

    # ---------------------------------------------------------
    # PART C: Coordination Detection (Deterministic Rule + Stats Engine)
    # Deliberately non-ML: antitrust scrutiny requires transparent, auditable evidentiary rules
    # ---------------------------------------------------------
    daily_res = df.groupby(["obs_date", "route", "airline"])["log_residual"].mean().reset_index()
    daily_res = daily_res.sort_values(by=["route", "airline", "obs_date"]).reset_index(drop=True)
    daily_res["dod_residual_change"] = daily_res.groupby(["route", "airline"])["log_residual"].diff().fillna(0.0)

    daily_res["is_surging"] = (daily_res["dod_residual_change"] >= 0.08).astype(int)

    route_daily = daily_res.groupby(["obs_date", "route"]).agg(
        surging_airlines=("airline", lambda s: daily_res.loc[s.index[daily_res.loc[s.index, "is_surging"] == 1], "airline"].tolist()),
        mean_uplift=("dod_residual_change", lambda s: float(s[s > 0].mean()) if (s > 0).any() else 0.0),
        total_airlines=("airline", "nunique")
    ).reset_index()

    route_daily["n_surging"] = route_daily["surging_airlines"].apply(len)
    route_daily = route_daily.sort_values(by=["route", "obs_date"]).reset_index(drop=True)

    detected_events = []
    routes_all = df["route"].unique()

    for r in routes_all:
        r_df = route_daily[route_daily["route"] == r].reset_index(drop=True)
        flagged_indices = set()

        for idx in range(len(r_df)):
            curr_surging = set(r_df.loc[idx, "surging_airlines"])
            next_surging = set(r_df.loc[idx + 1, "surging_airlines"]) if idx + 1 < len(r_df) else set()
            combined = curr_surging.union(next_surging)

            if len(curr_surging) >= 3 or len(combined) >= 3:
                flagged_indices.add(idx)
                if len(combined) >= 3 and idx + 1 < len(r_df):
                    flagged_indices.add(idx + 1)

        sorted_indices = sorted(list(flagged_indices))
        if not sorted_indices:
            continue

        groups = []
        current_group = [sorted_indices[0]]
        for cur_idx in sorted_indices[1:]:
            if cur_idx == current_group[-1] + 1:
                current_group.append(cur_idx)
            else:
                groups.append(current_group)
                current_group = [cur_idx]
        groups.append(current_group)

        for grp in groups:
            sub = r_df.iloc[grp]
            all_involved = set()
            for alist in sub["surging_airlines"]:
                all_involved.update(alist)

            start_d = sub["obs_date"].iloc[0]
            end_d = sub["obs_date"].iloc[-1]
            dur = len(grp)
            mean_up = float(sub["mean_uplift"].mean())
            total_al = int(sub["total_airlines"].iloc[0])
            score = round((len(all_involved) / max(total_al, 1)) * mean_up * dur * 10.0, 2)

            detected_events.append({
                "route": r,
                "start_date": start_d,
                "end_date": end_d,
                "duration_days": dur,
                "airlines_involved": sorted(list(all_involved)),
                "mean_uplift_pct": round(mean_up * 100.0, 2),
                "coordination_score": score,
            })

    pivoted_changes = daily_res.pivot(index="obs_date", columns=["route", "airline"], values="dod_residual_change").fillna(0.0)
    correlation_export = {}

    for r in routes_all:
        try:
            sub_pivot = pivoted_changes[r]
            latest_14 = sub_pivot.iloc[-14:].corr().fillna(0.0).round(3)
            correlation_export[r] = {
                "latest_window": {
                    "start": sub_pivot.index[-14],
                    "end": sub_pivot.index[-1],
                    "matrix": latest_14.to_dict()
                }
            }
        except KeyError:
            continue

    ground_truth_events = []
    grouped_gt = df[df["coordination_event_id"] != ""].groupby("coordination_event_id")
    for ev_id, g in grouped_gt:
        ground_truth_events.append({
            "event_id": str(ev_id),
            "route": g["route"].iloc[0],
            "start_date": g["obs_date"].min(),
            "end_date": g["obs_date"].max(),
        })

    gt_matched = set()
    for det in detected_events:
        d_route = det["route"]
        d_start = datetime.strptime(det["start_date"], "%Y-%m-%d")
        d_end = datetime.strptime(det["end_date"], "%Y-%m-%d")
        matched = False

        for gt in ground_truth_events:
            if gt["route"] != d_route:
                continue
            g_start = datetime.strptime(gt["start_date"], "%Y-%m-%d")
            g_end = datetime.strptime(gt["end_date"], "%Y-%m-%d")

            overlap_days = (min(d_end, g_end) - max(d_start, g_start)).days + 1
            if overlap_days >= 1:
                matched = True
                gt_matched.add(gt["event_id"])

        det["true_event"] = matched

    tp = len(gt_matched)
    total_gt = len(ground_truth_events)
    total_det = len(detected_events)
    fp = sum(1 for det in detected_events if not det.get("true_event", False))

    coord_recall = round(tp / total_gt, 4) if total_gt > 0 else 0.0
    coord_prec = round(tp / total_det, 4) if total_det > 0 else 0.0

    # ---------------------------------------------------------
    # PART D: Export JSON Files for Frontend Consumption
    # ---------------------------------------------------------
    fares_summary = df.fillna({'coordination_event_id': ''}).groupby(['obs_date', 'route', 'airline']).agg(
        fare_inr=("fare_inr", "mean"),
        predicted_fare=("predicted_fare", "mean"),
        is_anomaly=("is_anomaly_detected", "max"),
        is_injected_anomaly=("is_injected_anomaly", "max"),
        coordination_event_id=("coordination_event_id", "first")
    ).reset_index()

    fares_sample_payload = {}
    for r in routes_all:
        sub_r = fares_summary[fares_summary["route"] == r]
        fares_sample_payload[r] = sub_r.to_dict(orient="records")

    with open(os.path.join(web_data_dir, "fares_sample.json"), "w") as f:
        json.dump(fares_sample_payload, f, separators=(",", ":"))

    flagged_rows = df[df["is_anomaly_detected"] == 1]
    anomalies_list = []
    for _, row in flagged_rows.iterrows():
        exp_fare = float(row["predicted_fare"])
        act_fare = float(row["fare_inr"])
        dev_pct = round(((act_fare - exp_fare) / exp_fare) * 100.0, 2)
        anomalies_list.append({
            "date": row["obs_date"],
            "route": row["route"],
            "airline": row["airline"],
            "fare": act_fare,
            "expected_fare": exp_fare,
            "deviation_pct": dev_pct,
            "severity": row["severity"],
            "is_true_anomaly": bool(row["is_injected_anomaly"] == 1)
        })

    with open(os.path.join(web_data_dir, "anomalies.json"), "w") as f:
        json.dump(anomalies_list, f, indent=2)

    with open(os.path.join(web_data_dir, "coordination_events.json"), "w") as f:
        json.dump(detected_events, f, indent=2)

    with open(os.path.join(web_data_dir, "correlation.json"), "w") as f:
        json.dump(correlation_export, f, indent=2)

    route_meta = []
    for r in routes_all:
        sub_df = df[df["route"] == r]
        c_events = sum(1 for e in detected_events if e["route"] == r)
        route_meta.append({
            "route": r,
            "avg_fare_inr": round(float(sub_df["fare_inr"].mean()), 2),
            "anomaly_count": int(sub_df["is_anomaly_detected"].sum()),
            "coordination_events_detected": c_events
        })

    with open(os.path.join(web_data_dir, "route_summary.json"), "w") as f:
        json.dump(route_meta, f, indent=2)

    with open(os.path.join(web_data_dir, "feature_importance.json"), "w") as f:
        json.dump([{"feature": k, "importance": round(v, 4)} for k, v in importance_sorted], f, indent=2)

    metrics_payload = {
        "data_is_synthetic": True,
        "total_observations": int(len(df)),
        "fare_model": {
            "model_type": "XGBRegressor",
            "test_split_ratio": 0.30,
            "split_date": split_date,
            "test_mae_inr": round(test_mae, 2),
            "test_mape_pct": round(test_mape, 2)
        },
        "individual_anomaly_detection": {
            "algorithm": "IsolationForest",
            "contamination_parameter": 0.02,
            "precision": round(if_prec, 4),
            "recall": round(if_rec, 4),
            "f1_score": round(if_f1, 4),
            "confusion_matrix": {
                "true_negative": cm[0][0],
                "false_positive": cm[0][1],
                "false_negative": cm[1][0],
                "true_positive": cm[1][1]
            }
        },
        "coordination_detection": {
            "methodology": "Multi-Airline Residual Shift Co-occurrence",
            "ground_truth_events": total_gt,
            "detected_events": total_det,
            "true_positive_events": tp,
            "false_positive_events": fp,
            "event_precision": coord_prec,
            "event_recall": coord_recall
        }
    }

    with open(os.path.join(web_data_dir, "metrics.json"), "w") as f:
        json.dump(metrics_payload, f, indent=2)

    print("\n" + "=" * 60)
    print("SQUAWK: Pipeline Execution & Evaluation Report")
    print("=" * 60)
    print(f"Fare Baseline XGBoost Test MAE:   INR {test_mae:.2f}")
    print(f"Fare Baseline XGBoost Test MAPE:  {test_mape:.2f}%")
    print("-" * 60)
    print(f"Isolation Forest Precision:       {if_prec:.4f}")
    print(f"Isolation Forest Recall:          {if_rec:.4f}")
    print(f"Isolation Forest F1:              {if_f1:.4f}")
    print(f"Confusion Matrix [TN, FP, FN, TP]:{cm}")
    print("-" * 60)
    print("Coordination Detection (Honest Rule-Based Results):")
    print(f"  Ground Truth Events:            {total_gt}")
    print(f"  Detected Events:                {total_det}")
    print(f"  Matched True Positives:         {tp}")
    print(f"  False Positives:                {fp}")
    print(f"  Event-Level Precision:          {coord_prec:.4f}")
    print(f"  Event-Level Recall:             {coord_recall:.4f}")
    print("=" * 60)
    print(f"All 7 JSON artifacts exported successfully to:\n{os.path.abspath(web_data_dir)}")

if __name__ == "__main__":
    run_pipeline()

