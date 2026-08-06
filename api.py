from functools import lru_cache
from pathlib import Path
from typing import Any

import numpy as np
import pandas as pd

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from sklearn.model_selection import train_test_split
from sklearn.metrics import (
    classification_report,
    confusion_matrix,
    accuracy_score,
    precision_score,
    recall_score,
    f1_score
)


BASE_DIR = Path(__file__).resolve().parent

app = FastAPI(
    title="HepatoCare AI API",
    version="1.0.0",
    description="Liver Disease Prediction and Clinical Decision Support System"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

LABEL_MAP = {
    0: "Normal",
    1: "Fatty Liver",
    2: "Alcoholic Liver Disease",
    3: "Cirrhosis",
    4: "Hepatitis B",
    5: "Hepatitis C"
}
@lru_cache
def load_raw_data():
    return pd.read_csv(BASE_DIR / "train.csv")


@lru_cache
def load_cleaned_data():
    return pd.read_csv(BASE_DIR / "cleaned_liver_dataset.csv")


@lru_cache
def load_selected_data():
    return pd.read_csv(BASE_DIR / "Final_Selected_Features.csv")


@lru_cache
def load_boruta():
    return pd.read_csv(BASE_DIR / "Boruta_Feature_Ranking.csv")


@app.get("/api/health")
def health():

    return {
        "status": "running",
        "stage": "Feature Selection",
        "pipeline": [
            "EDA",
            "Cleaning",
            "Encoding",
            "Correlation Analysis",
            "Boruta",
            "SHAP"
        ]
    }

@app.get("/api/overview")
def overview():

    raw = load_raw_data()

    cleaned = load_cleaned_data()

    missing = raw.isnull().sum()

    return {

        "raw_shape": list(raw.shape),

        "cleaned_shape": list(cleaned.shape),

        "columns": raw.columns.tolist(),

        "dtypes": {

            col: str(dtype)

            for col, dtype in raw.dtypes.items()

        },

        "missing_values": missing[missing > 0].to_dict(),

        "sample": raw.head(10).fillna("").to_dict(orient="records"),

        "target_distribution":

            raw["Liver_Disease_Type"]

            .value_counts()

            .to_dict()

    }
@app.get("/api/eda/correlation")
def correlation():

    df = load_cleaned_data()

    numeric = df.select_dtypes(include=np.number)

    corr = numeric.corr().fillna(0)

    return {

        "columns": corr.columns.tolist(),

        "matrix": corr.values.tolist()

    }
NUMERIC_COLUMNS = [

    "Age",

    "BMI",

    "Sleep_Hours",

    "ALT",

    "AST",

    "Bilirubin",

    "Albumin",

    "Platelets",

    "Alk_Phosphatase"

]


@app.get("/api/eda/distributions")
def distributions():

    df = load_cleaned_data()

    result = {}

    for col in NUMERIC_COLUMNS:

        if col not in df.columns:

            continue

        values = df[col].dropna()

        counts, bins = np.histogram(

            values,

            bins=30

        )

        result[col] = {

            "bins":

                bins[:-1].tolist(),

            "counts":

                counts.tolist()

        }

    return result
CATEGORICAL_COLUMNS = [

    "Gender",

    "Occupation",

    "Diet_Quality",

    "Physical_Activity",

    "Smoking_Status",

    "Alcohol_Consumption",

    "Liver_Disease_Type"

]


@app.get("/api/eda/categorical")
def categorical():

    df = load_raw_data()

    result = {}

    for col in CATEGORICAL_COLUMNS:

        if col not in df.columns:

            continue

        result[col] = (

            df[col]

            .fillna("Unknown")

            .value_counts()

            .to_dict()

        )

    return result
@app.get("/api/features/ranking")
def feature_ranking():

    ranking = load_boruta()

    selected = ranking[

        ranking["Selected"] == True

    ]["Feature"].tolist()

    rejected = ranking[

        ranking["Selected"] == False

    ]["Feature"].tolist()

    return {

        "ranking":

            ranking.to_dict(

                orient="records"

            ),

        "selected":

            selected,

        "rejected":

            rejected

    }
@app.get("/api/features/stats")
def feature_stats():

    df = load_selected_data()

    stats = (

        df.describe()

        .T

        .reset_index()

        .rename(

            columns={

                "index":"Feature"

            }

        )

    )

    return stats.to_dict(

        orient="records"

    )
@app.get("/api/shap")
def shap():

    return {
        "bar_plot": "results/shap_bar.png",
        "beeswarm_plot": "results/shap_beeswarm.png"
    }
@app.get("/")
def root():

    return {
        "project": "HepatoCare AI",
        "version": "1.0",
        "status": "Backend Running",
        "phase": "Data Preprocessing & Feature Selection"
    }



