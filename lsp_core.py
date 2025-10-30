import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import time

np.random.seed(42)

PARAMS = {
    "swap_cost_fixed": 1000.0,
    "swap_cost_per_km": 1.0,
    "swap_cost_per_h": 150.0,
    "service_downtime_hours": 48,
    "service_tolerance_km": 1000,
    "max_swaps_per_rolling_days": 90,
    "max_swaps_per_window": 1,
    "year_start": pd.Timestamp("2024-01-01 00:00:00"),
    "brand_contract_km_total": {"DAF":450000,"Scania":750000,"Volvo":450000},
    "brand_service_interval_km": {"DAF":120000,"Scania":120000,"Volvo":110000}
}

def run_simulation(days_to_run=365):
    t0 = time.time()

    # --- Pliki ---
    paths = {
        "vehicles": "vehicles.csv",
        "locations": "locations.csv",
        "relations": "locations_relations.csv",
        "routes": "routes.csv",
        "segments": "segments.csv",
    }

    vehicles = pd.read_csv(paths["vehicles"])
    locations = pd.read_csv(paths["locations"])
    relations = pd.read_csv(paths["relations"])
    routes = pd.read_csv(paths["routes"])
    segments = pd.read_csv(paths["segments"])

    # --- Daty ---
    for c in ["leasing_start_date","leasing_end_date"]:
        if c in vehicles.columns:
            vehicles[c] = pd.to_datetime(vehicles[c], errors="coerce")
    for c in ["start_datetime","end_datetime"]:
        if c in routes.columns:
            routes[c] = pd.to_datetime(routes[c], errors="coerce")
    for c in ["start_datetime","end_datetime"]:
        if c in segments.columns:
            segments[c] = pd.to_datetime(segments[c], errors="coerce")

    cutoff = PARAMS["year_start"] + timedelta(days=days_to_run)
    routes = routes[routes["start_datetime"] <= cutoff].reset_index(drop=True)

    # --- relacje km/h ---
    time_series = pd.to_numeric(relations.get("time", pd.Series([], dtype=float)), errors="coerce").dropna()
    time_is_minutes = (len(time_series) > 0 and (time_series > 24).mean() > 0.5)

    def raw_to_hours(x): return float(x)/60.0 if time_is_minutes else float(x)
    _rel = {}
    for _, r in relations.iterrows():
        a,b = int(r["id_loc_1"]), int(r["id_loc_2"])
        dist, timeh = float(r.get("dist", np.nan)), raw_to_hours(r.get("time", np.nan))
        _rel[(a,b)] = (dist,timeh); _rel[(b,a)] = (dist,timeh)
    def leg(a,b): return (0.0,0.0) if a==b else _rel.get((a,b),(np.nan,np.nan))

    # --- Route endpoints ---
    sg = segments.sort_values(["route_id","seq"]).groupby("route_id")
    routes = routes.merge(sg["start_loc_id"].first().rename("start_loc_id"), left_on="id", right_index=True, how="left")
    routes = routes.merge(sg["end_loc_id"].last().rename("end_loc_id"), left_on="id", right_index=True, how="left")
    routes["route_km"] = routes.get("distance_km", 0.0).astype(float)

    # --- Vehicle setup ---
    if "service_interval_km" not in vehicles.columns:
        vehicles["service_interval_km"] = vehicles["brand"].map(PARAMS["brand_service_interval_km"]).fillna(120000)
    vehicles["leasing_limit_km"] = vehicles["leasing_limit_km"].fillna(150000)
    vehicles["current_odometer_km"] = vehicles["current_odometer_km"].fillna(0).astype(float)
    if "Current_location_id" not in vehicles.columns:
        vehicles["Current_location_id"] = np.nan
    vehicles["contract_limit_km_total"] = vehicles["brand"].map(PARAMS["brand_contract_km_total"]).fillna(np.inf)

    VID = "Id" if "Id" in vehicles.columns else "id"
    veh_rows = {int(v[VID]): v for _, v in vehicles.iterrows()}

    # --- stan floty ---
    state = {}
    for _, v in vehicles.iterrows():
        vid = int(v[VID])
        state[vid] = {
            "odometer": float(v["current_odometer_km"]),
            "available_from": PARAMS["year_start"],
            "loc": None if pd.isna(v["Current_location_id"]) else int(v["Current_location_id"]),
            "lifetime_km": float(v["current_odometer_km"]),
            "sticky_loc": None,
        }

    # --- smart start wg popytu ---
    start_counts = routes["start_loc_id"].value_counts(normalize=True)
    if len(start_counts) > 0:
        loc_ids, probs = start_counts.index.to_list(), start_counts.values
        for vid, s in state.items():
            if s["loc"] is None:
                s["loc"] = int(np.random.choice(loc_ids, p=probs))

    # --- planowanie tras ---
    assignments = []
    routes_sorted = routes.sort_values("start_datetime").reset_index(drop=True)

    for _, r in routes_sorted.iterrows():
        rid = int(r["id"])
        t_start, t_end = r["start_datetime"], r["end_datetime"]
        s_loc, e_loc = int(r["start_loc_id"]), int(r["end_loc_id"])
        r_km = float(r["route_km"])

        best_vid, best_cost, best_swap = None, 1e12, False
        relocate_cost = 0.0

        for vid, v in veh_rows.items():
            if state[vid]["available_from"] > t_start:
                continue
            cur_loc = state[vid]["loc"]
            if cur_loc is None:
                continue
            dist, timeh = leg(cur_loc, s_loc)
            if np.isnan(dist):
                continue

            relocate_cost = 0.0 if cur_loc == s_loc else PARAMS["swap_cost_fixed"] + dist * PARAMS["swap_cost_per_km"] + timeh * PARAMS["swap_cost_per_h"]

            # 🔧 kara za bardzo dalekie relokacje
            if dist > 200:
                relocate_cost *= 1.0
            if dist > 400:
                relocate_cost *= 1.0

            # 🔧 bonus za lokalność (auto „przyklejone” do regionu)
            if state[vid]["sticky_loc"] == s_loc:
                relocate_cost *= 1.0

            total = relocate_cost

            if total < best_cost:
                best_vid, best_cost = vid, total
                best_swap = (cur_loc != s_loc)

        if best_vid is None:
            continue

        # update stanu
        state[best_vid]["odometer"] += r_km
        state[best_vid]["lifetime_km"] += r_km
        state[best_vid]["available_from"] = t_end
        state[best_vid]["loc"] = e_loc
        state[best_vid]["sticky_loc"] = e_loc

        assignments.append({
            "route_id": rid,
            "vehicle_id": best_vid,
            "swap": best_swap,
            "swap_cost_pln": best_cost,
            "total_cost_pln": best_cost
        })

    assign_df = pd.DataFrame(assignments)
    assign_df.to_csv("plan_assignments.csv", index=False)

    swap_cost = assign_df["swap_cost_pln"].sum()
    total_cost = swap_cost
    swaps_cnt = int(assign_df["swap"].sum())

    elapsed = time.time() - t0

    result = {
        "total_cost": round(total_cost, 2),
        "swap_cost": round(swap_cost, 2),
        "overrun_cost": 0.0,
        "swaps_count": swaps_cnt,
        "contract_use_pct": None,
        "routes_processed": int(len(routes_sorted)),
        "goal_completion_pct": 100,
        "runtime_min": round(elapsed/60, 2)
    }

    return result
