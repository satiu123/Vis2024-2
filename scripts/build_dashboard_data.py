from __future__ import annotations

import json
from pathlib import Path
from typing import Dict, List

import numpy as np
import pandas as pd

ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = ROOT / "JobWantedAnalysis-ChinaVis2024" / "data"
OUTPUT_DIR = ROOT / "assets" / "data"


def load_dataset(filename: str, work_mode: str) -> pd.DataFrame:
    """Load a CSV dataset and tag its work mode."""
    path = DATA_DIR / "final" / filename
    df = pd.read_csv(path)
    df["work_mode"] = work_mode
    return df


def build_histogram(series: pd.Series, bins: np.ndarray) -> List[int]:
    counts, _ = np.histogram(series, bins=bins)
    return counts.tolist()


def as_records(df: pd.DataFrame) -> List[Dict]:
    return json.loads(df.to_json(orient="records"))


def main() -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    fixed = load_dataset("FixedSalaryFinal.csv", "fixed")
    flex = load_dataset("FlexSalaryFinal.csv", "flex")

    for frame in (fixed, flex):
        frame["salary_mid"] = (frame["salary_min"] + frame["salary_max"]) / 2
        frame["salary_span"] = frame["salary_max"] - frame["salary_min"]
        frame["salary_k"] = frame["salary_mid"] / 1000

    df = pd.concat([fixed, flex], ignore_index=True)

    summary = {
        "jobs": int(df.shape[0]),
        "provinces": int(df["province"].nunique()),
        "cities": int(df["city"].nunique()),
        "companies": int(df["company"].nunique()),
        "company_types": int(df["companyType"].nunique()),
        "salary_min": float(df["salary_mid"].min()),
        "salary_max": float(df["salary_mid"].max()),
        "salary_mean": float(df["salary_mid"].mean()),
        "salary_median": float(df["salary_mid"].median()),
        "flex_share": float((df["work_mode"] == "flex").mean()),
    }

    province_summary = (
        df.groupby("province")
        .agg(
            job_count=("_id", "count"),
            salary_mean=("salary_mid", "mean"),
            salary_p90=("salary_mid", lambda s: s.quantile(0.9)),
            flex_share=("work_mode", lambda s: (s == "flex").mean()),
        )
        .reset_index()
        .sort_values(by="job_count", ascending=False)
    )

    experience_summary = (
        df.groupby("experience")
        .agg(job_count=("_id", "count"), salary_mean=("salary_mid", "mean"))
        .reset_index()
        .sort_values(by="job_count", ascending=False)
    )

    education_summary = (
        df.groupby("education")
        .agg(job_count=("_id", "count"), salary_mean=("salary_mid", "mean"))
        .reset_index()
        .sort_values(by="job_count", ascending=False)
    )

    salary_type_summary = (
        df.groupby(["salary_type", "work_mode"])
        .agg(job_count=("_id", "count"), salary_mean=("salary_mid", "mean"))
        .reset_index()
        .sort_values(by="job_count", ascending=False)
    )

    company_type_summary = (
        df.groupby("companyType")
        .agg(job_count=("_id", "count"), salary_mean=("salary_mid", "mean"))
        .reset_index()
        .sort_values(by="job_count", ascending=False)
        .head(30)
    )

    bins = np.linspace(df["salary_mid"].min(), df["salary_mid"].max(), 31)
    hist = {
        "bins": bins.tolist(),
        "fixed": build_histogram(fixed["salary_mid"], bins),
        "flex": build_histogram(flex["salary_mid"], bins),
    }

    cube = (
        df.groupby(["province", "experience", "education", "work_mode", "salary_type"])
        .agg(
            job_count=("salary_mid", "size"),
            salary_mid_mean=("salary_mid", "mean"),
            salary_mid_p50=("salary_mid", lambda s: s.quantile(0.5)),
            salary_mid_p90=("salary_mid", lambda s: s.quantile(0.9)),
            salary_span_mean=("salary_span", "mean"),
        )
        .reset_index()
    )

    cube["salary_mid_mean"] = cube["salary_mid_mean"].round(2)
    cube["salary_mid_p50"] = cube["salary_mid_p50"].round(2)
    cube["salary_mid_p90"] = cube["salary_mid_p90"].round(2)
    cube["salary_span_mean"] = cube["salary_span_mean"].round(2)

    records_lite = (
        df[["province", "experience", "education", "salary_mid", "work_mode", "salary_type", "companyType"]]
        .rename(
            columns={
                "province": "p",
                "experience": "e",
                "education": "ed",
                "salary_mid": "s",
                "work_mode": "wm",
                "salary_type": "st",
                "companyType": "ct",
            }
        )
    )

    dashboard = {
        "summary": summary,
        "province": as_records(province_summary),
        "experience": as_records(experience_summary),
        "education": as_records(education_summary),
        "salary_type": as_records(salary_type_summary),
        "company_type": as_records(company_type_summary),
        "histogram": hist,
        "cube": as_records(cube),
    }

    with open(OUTPUT_DIR / "dashboard-data.json", "w", encoding="utf-8") as f:
        json.dump(dashboard, f, ensure_ascii=True, indent=2)

    records_payload = json.loads(records_lite.to_json(orient="records"))
    with open(OUTPUT_DIR / "records-lite.json", "w", encoding="utf-8") as f:
        json.dump(records_payload, f, ensure_ascii=True)

    print(f"Saved {len(records_payload)} rows to records-lite.json")


if __name__ == "__main__":
    main()
