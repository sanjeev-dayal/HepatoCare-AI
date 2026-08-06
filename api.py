from functools import lru_cache
from pathlib import Path
from typing import Any

import numpy as np
import pandas as pd
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import classification_report, confusion_matrix
from sklearn.model_selection import train_test_split

BASE_DIR = Path(__file__).resolve().parent

LABEL_MAP = {
    0: "Normal",
    1: "Fatty Liver",
    2: "Alcoholic Liver Disease",
    3: "Cirrhosis",
    4: "Hepatitis B",
    5: "Hepatitis C",
}

NUMERIC_DIST_COLS = [
    "Age", "BMI", "Sleep_Hours", "ALT", "AST",
    "Bilirubin", "Albumin", "Platelets", "Alk_Phosphatase",
]

CATEGORICAL_COLS = [
    "Gender", "Occupation", "Diet_Quality", "Physical_Activity",
    "Smoking_Status", "Alcohol_Consumption", "Liver_Disease_Type",
]

app = FastAPI(title="Liver Disease Analysis API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@lru_cache
def load_raw_data() -> pd.DataFrame:
    return pd.read_csv(BASE_DIR / "train.csv")


@lru_cache
def load_cleaned_data() -> pd.DataFrame:
    return pd.read_csv(BASE_DIR / "cleaned_liver_dataset.csv")


@lru_cache
def load_boruta_ranking() -> pd.DataFrame:
    return pd.read_csv(BASE_DIR / "Boruta_Feature_Ranking.csv")


@lru_cache
def load_final_selected() -> pd.DataFrame:
    return pd.read_csv(BASE_DIR / "Final_Selected_Features.csv")


@lru_cache
def build_classifier() -> RandomForestClassifier:
    df = load_final_selected()
    X = df.drop("Liver_Disease_Type", axis=1)
    y = df["Liver_Disease_Type"]
    clf = RandomForestClassifier(
        n_estimators=200,
        random_state=42,
        class_weight="balanced",
        n_jobs=-1,
    )
    clf.fit(X, y)
    return clf


@lru_cache
def get_model_metrics() -> dict[str, Any]:
    df = load_final_selected()
    X = df.drop("Liver_Disease_Type", axis=1)
    y = df["Liver_Disease_Type"]
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.25, random_state=42, stratify=y
    )
    model = RandomForestClassifier(
        n_estimators=200,
        random_state=42,
        class_weight="balanced",
        n_jobs=-1,
    )
    model.fit(X_train, y_train)
    y_pred = model.predict(X_test)
    report = classification_report(y_test, y_pred, output_dict=True)
    cm = confusion_matrix(y_test, y_pred)
    return {
        "classification_report": report,
        "confusion_matrix": cm.tolist(),
        "labels": list(LABEL_MAP.values()),
    }


class PredictRequest(BaseModel):
    features: dict[str, float]


@app.get("/api/health")
def health():
    return {"status": "ok"}


@app.get("/api/overview")
def overview():
    raw = load_raw_data()
    cleaned = load_cleaned_data()
    missing = raw.isnull().sum()
    missing_filtered = missing[missing > 0]
    target_counts = raw["Liver_Disease_Type"].value_counts().to_dict()

    return {
        "raw_shape": list(raw.shape),
        "cleaned_shape": list(cleaned.shape),
        "sample": raw.head(10).fillna("").to_dict(orient="records"),
        "dtypes": {col: str(dtype) for col, dtype in raw.dtypes.items()},
        "missing_values": missing_filtered.to_dict(),
        "target_distribution": target_counts,
    }


@app.get("/api/eda/correlation")
def correlation():
    df = load_raw_data()
    numeric = df.select_dtypes(include=[np.number])
    corr = numeric.corr().fillna(0)
    return {
        "columns": corr.columns.tolist(),
        "matrix": corr.values.tolist(),
    }


@app.get("/api/eda/distributions")
def distributions():
    df = load_raw_data()
    result = {}
    for col in NUMERIC_DIST_COLS:
        if col not in df.columns:
            continue
        values = df[col].dropna().values
        counts, bin_edges = np.histogram(values, bins=30)
        result[col] = {
            "bins": [float(b) for b in bin_edges[:-1]],
            "counts": [int(c) for c in counts],
        }
    return result


@app.get("/api/eda/categorical")
def categorical():
    df = load_raw_data()
    result = {}
    for col in CATEGORICAL_COLS:
        if col not in df.columns:
            continue
        counts = df[col].value_counts()
        result[col] = {str(k): int(v) for k, v in counts.items()}
    return result


@app.get("/api/features/ranking")
def feature_ranking():
    ranking = load_boruta_ranking()
    selected = ranking[ranking["Selected"] == True]["Feature"].tolist()
    rejected = ranking[ranking["Selected"] == False]["Feature"].tolist()
    return {
        "ranking": ranking.to_dict(orient="records"),
        "selected": selected,
        "rejected": rejected,
    }


@app.get("/api/features/stats")
def feature_stats():
    selected_data = load_final_selected()
    stats = selected_data.describe().T.reset_index()
    stats.columns = ["feature", *selected_data.describe().columns.tolist()]
    return stats.to_dict(orient="records")


@app.get("/api/predict/schema")
def predict_schema():
    selected_data = load_final_selected()
    features = []
    for feature in selected_data.drop("Liver_Disease_Type", axis=1).columns:
        col = selected_data[feature]
        is_binary = feature.startswith("Sym_") or feature.startswith("Comorb_")
        features.append({
            "name": feature,
            "label": feature.replace("_", " "),
            "type": "binary" if is_binary else "numeric",
            "min": float(col.min()) if not is_binary else 0,
            "max": float(col.max()) if not is_binary else 1,
            "default": float(col.median()) if not is_binary else 0,
        })
    return {"features": features, "labels": LABEL_MAP}


@app.post("/api/predict")
def predict(body: PredictRequest):
    model = build_classifier()
    selected_data = load_final_selected()
    expected_cols = selected_data.drop("Liver_Disease_Type", axis=1).columns.tolist()
    sample = pd.DataFrame([{col: body.features.get(col, 0) for col in expected_cols}])
    prediction = int(model.predict(sample)[0])
    return {
        "prediction": prediction,
        "label": LABEL_MAP[prediction],
        "features": body.features,
    }


@app.get("/api/model/metrics")
def model_metrics():
    return get_model_metrics()
