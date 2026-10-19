"""
generate_data.py
Synthesizes 180 days of flight fare observations across 8 routes and 5 airlines,
injecting individual anomalies and coordinated multi-airline price spikes.
"""

from datetime import datetime, timedelta
import os
import numpy as np
import pandas as pd

def is_festival_date(date_obj: datetime) -> float:
    # Diwali peak window: late Oct to early Nov 2025 (+20% demand)
    if datetime(2025, 10, 20) <= date_obj <= datetime(2025, 11, 5):
        return 1.20
    # Year-end window: 25 Dec 2025 to 2 Jan 2026 (+15% demand)
    if datetime(2025, 12, 25) <= date_obj <= datetime(2026, 1, 2):
        return 1.15
    return 1.00

def generate_dataset() -> pd.DataFrame:
    np.random.seed(42)  # Deterministic generation for reproducible benchmarks

    routes = {
        "HYD-DEL": 5200,
        "HYD-BOM": 4100,
        "HYD-BLR": 3200,
        "DEL-BOM": 5500,
        "BLR-DEL": 5800,
        "MAA-HYD": 3100,
        "CCU-DEL": 6200,
        "BOM-GOI": 3400,
    }

    airlines = {
        "IndiGo": 1.00,
        "Air India": 1.12,
        "SpiceJet": 0.94,
        "Akasa Air": 0.92,
        "Air India Express": 0.90,
    }

    start_date = datetime(2025, 10, 1)
    n_days = 180
    records = []

    # 1. Generate base observations (1 fare per date-route-airline combo)
    for day_idx in range(n_days):
        obs_date = start_date + timedelta(days=day_idx)
        seasonal_factor = is_festival_date(obs_date)

        for route, base_fare in routes.items():
            for airline, airline_factor in airlines.items():
                days_to_departure = int(np.random.randint(1, 61))
                dep_date = obs_date + timedelta(days=days_to_departure)
                dep_dow = dep_date.weekday()
                dep_hour = int(np.random.choice([0, 1, 2, 3]))  # Morning/Afternoon/Evening/Night
                stops = int(np.random.choice([0, 1], p=[0.85, 0.15]))

                # Dynamic pricing: hockey-stick curve as departure nears (< 14 days)
                demand_curve = 1.0 + 0.90 * np.exp(-days_to_departure / 10.0)
                # Weekend surge on Friday (4) or Sunday (6) departure
                weekend_factor = 1.12 if dep_dow in [4, 6] else 1.0
                # Stop penalty: indirect flights are slightly cheaper
                stop_discount = 0.92 if stops == 1 else 1.0
                # Normal pricing noise: standard deviation 6%
                lognormal_noise = np.random.lognormal(mean=0.0, sigma=0.06)

                fare = (
                    base_fare
                    * airline_factor
                    * demand_curve
                    * weekend_factor
                    * seasonal_factor
                    * stop_discount
                    * lognormal_noise
                )

                records.append({
                    "obs_date": obs_date.strftime("%Y-%m-%d"),
                    "route": route,
                    "airline": airline,
                    "days_to_departure": days_to_departure,
                    "dep_dow": dep_dow,
                    "dep_hour": dep_hour,
                    "stops": stops,
                    "fare_inr": round(float(fare), 2),
                    "is_injected_anomaly": 0,
                    "coordination_event_id": "",
                })

    df = pd.DataFrame(records)

    # 2. Inject individual anomalies (~2% of rows: half spikes, half drops)
    n_rows = len(df)
    n_anomalies = int(n_rows * 0.02)
    anomaly_indices = np.random.choice(df.index, size=n_anomalies, replace=False)

    for i, idx in enumerate(anomaly_indices):
        df.loc[idx, "is_injected_anomaly"] = 1
        if i % 2 == 0:
            # Fat-finger or sudden surge spike (x1.6 to x2.5)
            df.loc[idx, "fare_inr"] = round(df.loc[idx, "fare_inr"] * np.random.uniform(1.6, 2.5), 2)
        else:
            # Flash-sale or pricing bug drop (x0.4 to x0.6)
            df.loc[idx, "fare_inr"] = round(df.loc[idx, "fare_inr"] * np.random.uniform(0.4, 0.6), 2)

    # 3. Inject 12 coordinated events across routes
    route_list = list(routes.keys())
    airline_list = list(airlines.keys())

    for event_id in range(1, 13):
        target_route = str(np.random.choice(route_list))
        # Keep window start between day 10 and 165 so full duration falls inside dataset
        start_offset = int(np.random.randint(10, 166))
        duration = int(np.random.randint(3, 8))
        ev_start = start_date + timedelta(days=start_offset)
        ev_end = ev_start + timedelta(days=duration)

        # Select at least 3 colluding airlines
        num_colluding = int(np.random.choice([3, 4, 5], p=[0.5, 0.3, 0.2]))
        colluding_airlines = np.random.choice(airline_list, size=num_colluding, replace=False)

        for coll_airline in colluding_airlines:
            # Synchronized entry within 24 hours (0 or 1 day lag)
            lag = int(np.random.choice([0, 1]))
            airline_start = ev_start + timedelta(days=lag)
            uplift = np.random.uniform(1.12, 1.25)

            mask = (
                (df["route"] == target_route)
                & (df["airline"] == coll_airline)
                & (pd.to_datetime(df["obs_date"]) >= airline_start)
                & (pd.to_datetime(df["obs_date"]) <= ev_end)
                & (df["is_injected_anomaly"] == 0)  # Avoid clashing with individual outliers
            )

            df.loc[mask, "fare_inr"] = (df.loc[mask, "fare_inr"] * uplift).round(2)
            df.loc[mask, "coordination_event_id"] = str(event_id)

    return df

def main():
    script_dir = os.path.dirname(os.path.abspath(__file__))
    output_dir = os.path.join(script_dir, "..", "data")
    os.makedirs(output_dir, exist_ok=True)
    output_csv = os.path.join(output_dir, "fares.csv")

    df = generate_dataset()
    df.to_csv(output_csv, index=False)

    total_rows = len(df)
    anomaly_count = int(df["is_injected_anomaly"].sum())
    coord_rows = int((df["coordination_event_id"] != "").sum())
    unique_events = df[df["coordination_event_id"] != ""]["coordination_event_id"].nunique()

    print("=" * 60)
    print("SQUAWK: Synthetic Dataset Generation Complete")
    print(f"Destination:          {os.path.abspath(output_csv)}")
    print(f"Total Observations:   {total_rows:,}")
    print(f"Individual Anomalies: {anomaly_count:,} ({anomaly_count/total_rows*100:.2f}%)")
    print(f"Coordinated Rows:     {coord_rows:,} across {unique_events} distinct events")
    print("=" * 60)

if __name__ == "__main__":
    main()
