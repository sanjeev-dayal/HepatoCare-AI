import json
import uuid
from datetime import datetime, timezone
from functools import lru_cache
from pathlib import Path
from typing import Any, Dict, List, Optional

import joblib
import numpy as np
import pandas as pd
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

BASE_DIR = Path(__file__).resolve().parent
RESULTS_DIR = BASE_DIR / "results"
LIGHTGBM_DIR = RESULTS_DIR / "lightgbm"
MODEL_PATH = LIGHTGBM_DIR / "lightgbm_tuned.pkl"

app = FastAPI(
    title="HepatoCare AI API",
    version="2.0.0",
    description="Liver Disease Clinical Decision Support & Prediction System"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount results directory to serve plots directly
if LIGHTGBM_DIR.exists():
    app.mount("/static/lightgbm", StaticFiles(directory=str(LIGHTGBM_DIR)), name="lightgbm_static")

CLASS_NAMES = [
    "Normal",
    "Fatty Liver",
    "Alcoholic Liver Disease",
    "Cirrhosis",
    "Hepatitis B",
    "Hepatitis C"
]

MODEL_CLASS_MAP = {
    0: "Normal",
    1: "Fatty Liver",
    2: "Alcoholic Liver Disease",
    3: "Cirrhosis",
    4: "Hepatitis B",
    5: "Hepatitis C"
}

BORUTA_FEATURES = [
    "AST",
    "ALT",
    "Bilirubin",
    "Albumin",
    "Platelets",
    "Sym_Jaundice",
    "Comorb_Diabetes",
    "Sym_Dark_Urine",
    "Sym_Fatigue",
    "Sym_Ascites"
]

FEATURE_MEDIANS = {
    "AST": 36.61,
    "ALT": 38.34,
    "Bilirubin": 1.01,
    "Albumin": 3.99,
    "Platelets": 257.0,
    "Sym_Jaundice": 0.0,
    "Comorb_Diabetes": 0.0,
    "Sym_Dark_Urine": 0.0,
    "Sym_Fatigue": 0.0,
    "Sym_Ascites": 0.0
}

FEATURE_METADATA = {
    "AST": {
        "name": "AST",
        "label": "Aspartate Aminotransferase",
        "category": "laboratory",
        "unit": "U/L",
        "ref_range": "10 – 40 U/L",
        "min": 5.0,
        "max": 600.0,
        "default": 36.61,
        "step": 0.001,
        "description": "Enzyme released with hepatocellular or myocardial necrosis."
    },
    "ALT": {
        "name": "ALT",
        "label": "Alanine Aminotransferase",
        "category": "laboratory",
        "unit": "U/L",
        "ref_range": "7 – 56 U/L",
        "min": 5.0,
        "max": 600.0,
        "default": 38.34,
        "step": 0.001,
        "description": "Specific biomarker for hepatocellular damage and liver inflammation."
    },
    "Bilirubin": {
        "name": "Bilirubin",
        "label": "Total Bilirubin",
        "category": "laboratory",
        "unit": "mg/dL",
        "ref_range": "0.2 – 1.2 mg/dL",
        "min": 0.1,
        "max": 35.0,
        "default": 1.01,
        "step": 0.001,
        "description": "Breakdown product of hemoglobin; elevated in cholestasis or hepatic failure."
    },
    "Albumin": {
        "name": "Albumin",
        "label": "Serum Albumin",
        "category": "laboratory",
        "unit": "g/dL",
        "ref_range": "3.5 – 5.5 g/dL",
        "min": 1.0,
        "max": 6.5,
        "default": 3.99,
        "step": 0.001,
        "description": "Key protein synthesized by the liver; decreases in chronic liver insufficiency."
    },
    "Platelets": {
        "name": "Platelets",
        "label": "Platelet Count",
        "category": "laboratory",
        "unit": "×10⁹/L",
        "ref_range": "150 – 450 ×10⁹/L",
        "min": 15.0,
        "max": 750.0,
        "default": 257.0,
        "step": 0.001,
        "description": "Thrombocyte count; thrombocytopenia often indicates portal hypertension."
    },
    "Sym_Jaundice": {
        "name": "Sym_Jaundice",
        "label": "Jaundice",
        "category": "symptoms",
        "unit": "binary",
        "ref_range": "Absent (0)",
        "min": 0,
        "max": 1,
        "default": 0,
        "description": "Yellow discoloration of sclera and skin due to hyperbilirubinemia."
    },
    "Sym_Dark_Urine": {
        "name": "Sym_Dark_Urine",
        "label": "Dark Urine",
        "category": "symptoms",
        "unit": "binary",
        "ref_range": "Absent (0)",
        "min": 0,
        "max": 1,
        "default": 0,
        "description": "Conjugated bilirubin excretion resulting in tea-colored urine."
    },
    "Sym_Fatigue": {
        "name": "Sym_Fatigue",
        "label": "Fatigue",
        "category": "symptoms",
        "unit": "binary",
        "ref_range": "Absent (0)",
        "min": 0,
        "max": 1,
        "default": 0,
        "description": "Persistent clinical lethargy commonly reported in hepatic disease."
    },
    "Sym_Ascites": {
        "name": "Sym_Ascites",
        "label": "Ascites",
        "category": "symptoms",
        "unit": "binary",
        "ref_range": "Absent (0)",
        "min": 0,
        "max": 1,
        "default": 0,
        "description": "Pathological accumulation of fluid in the peritoneal cavity."
    },
    "Comorb_Diabetes": {
        "name": "Comorb_Diabetes",
        "label": "Diabetes Mellitus",
        "category": "comorbidity",
        "unit": "binary",
        "ref_range": "Absent (0)",
        "min": 0,
        "max": 1,
        "default": 0,
        "description": "Metabolic comorbidity heavily predisposing to NAFLD and cirrhosis."
    }
}

# In-memory storage with synthetic patient demonstrations
ASSESSMENT_STORE: List[Dict[str, Any]] = []

def seed_synthetic_history():
    demo_cases = [
        {
            "id": "HC-8921",
            "timestamp": "2026-10-11T14:22:15Z",
            "patient_alias": "Synthetic Patient A (Demo)",
            "age": 58,
            "gender": "Female",
            "notes": "Referred from gastroenterology for progressive jaundice and abdominal distension.",
            "inputs": {
                "AST": 112.4,
                "ALT": 78.5,
                "Bilirubin": 4.6,
                "Albumin": 2.6,
                "Platelets": 84.0,
                "Sym_Jaundice": 1,
                "Comorb_Diabetes": 1,
                "Sym_Dark_Urine": 1,
                "Sym_Fatigue": 1,
                "Sym_Ascites": 1
            },
            "predicted_class_id": 3,
            "predicted_class_name": "Cirrhosis",
            "confidence": 0.9412,
            "probabilities": {
                "Normal": 0.0012,
                "Fatty Liver": 0.0084,
                "Alcoholic Liver Disease": 0.0215,
                "Cirrhosis": 0.9412,
                "Hepatitis B": 0.0143,
                "Hepatitis C": 0.0134
            },
            "top_drivers": [
                {"feature": "Sym_Ascites", "impact": "High positive", "shap": 0.38},
                {"feature": "Bilirubin", "impact": "High positive", "shap": 0.32},
                {"feature": "Platelets", "impact": "Positive (thrombocytopenia)", "shap": 0.29},
                {"feature": "Albumin", "impact": "Positive (hypoalbuminemia)", "shap": 0.21}
            ]
        },
        {
            "id": "HC-8894",
            "timestamp": "2026-10-10T11:45:00Z",
            "patient_alias": "Synthetic Patient B (Demo)",
            "age": 44,
            "gender": "Male",
            "notes": "Routine executive health screening, asymptomatic.",
            "inputs": {
                "AST": 24.5,
                "ALT": 22.0,
                "Bilirubin": 0.8,
                "Albumin": 4.5,
                "Platelets": 265.0,
                "Sym_Jaundice": 0,
                "Comorb_Diabetes": 0,
                "Sym_Dark_Urine": 0,
                "Sym_Fatigue": 0,
                "Sym_Ascites": 0
            },
            "predicted_class_id": 0,
            "predicted_class_name": "Normal",
            "confidence": 0.9785,
            "probabilities": {
                "Normal": 0.9785,
                "Fatty Liver": 0.0152,
                "Alcoholic Liver Disease": 0.0021,
                "Cirrhosis": 0.0004,
                "Hepatitis B": 0.0018,
                "Hepatitis C": 0.0020
            },
            "top_drivers": [
                {"feature": "Bilirubin", "impact": "Negative for disease", "shap": -0.42},
                {"feature": "Albumin", "impact": "Negative for disease", "shap": -0.38},
                {"feature": "AST", "impact": "Negative for disease", "shap": -0.31}
            ]
        },
        {
            "id": "HC-8850",
            "timestamp": "2026-10-09T16:10:30Z",
            "patient_alias": "Synthetic Patient C (Demo)",
            "age": 49,
            "gender": "Male",
            "notes": "History of chronic alcohol intake, mild right upper quadrant discomfort.",
            "inputs": {
                "AST": 185.0,
                "ALT": 68.0,
                "Bilirubin": 2.4,
                "Albumin": 3.7,
                "Platelets": 178.0,
                "Sym_Jaundice": 1,
                "Comorb_Diabetes": 0,
                "Sym_Dark_Urine": 1,
                "Sym_Fatigue": 1,
                "Sym_Ascites": 0
            },
            "predicted_class_id": 2,
            "predicted_class_name": "Alcoholic Liver Disease",
            "confidence": 0.8654,
            "probabilities": {
                "Normal": 0.0051,
                "Fatty Liver": 0.0432,
                "Alcoholic Liver Disease": 0.8654,
                "Cirrhosis": 0.0521,
                "Hepatitis B": 0.0182,
                "Hepatitis C": 0.0160
            },
            "top_drivers": [
                {"feature": "AST", "impact": "De Ritis AST>ALT predominance", "shap": 0.44},
                {"feature": "Sym_Jaundice", "impact": "Positive", "shap": 0.26},
                {"feature": "Bilirubin", "impact": "Positive", "shap": 0.22}
            ]
        },
        {
            "id": "HC-8812",
            "timestamp": "2026-10-08T09:30:00Z",
            "patient_alias": "Synthetic Patient D (Demo)",
            "age": 42,
            "gender": "Female",
            "notes": "Type 2 diabetic with BMI 31.4, elevated transaminases on annual review.",
            "inputs": {
                "AST": 52.0,
                "ALT": 74.0,
                "Bilirubin": 1.1,
                "Albumin": 4.2,
                "Platelets": 290.0,
                "Sym_Jaundice": 0,
                "Comorb_Diabetes": 1,
                "Sym_Dark_Urine": 0,
                "Sym_Fatigue": 1,
                "Sym_Ascites": 0
            },
            "predicted_class_id": 1,
            "predicted_class_name": "Fatty Liver",
            "confidence": 0.8920,
            "probabilities": {
                "Normal": 0.0380,
                "Fatty Liver": 0.8920,
                "Alcoholic Liver Disease": 0.0245,
                "Cirrhosis": 0.0112,
                "Hepatitis B": 0.0210,
                "Hepatitis C": 0.0133
            },
            "top_drivers": [
                {"feature": "ALT", "impact": "Mild ALT elevation", "shap": 0.36},
                {"feature": "Comorb_Diabetes", "impact": "Positive", "shap": 0.31},
                {"feature": "AST", "impact": "Positive", "shap": 0.18}
            ]
        },
        {
            "id": "HC-8789",
            "timestamp": "2026-10-06T15:20:10Z",
            "patient_alias": "Synthetic Patient E (Demo)",
            "age": 35,
            "gender": "Male",
            "notes": "Acute fatigue and dark urine following international travel.",
            "inputs": {
                "AST": 240.0,
                "ALT": 310.0,
                "Bilirubin": 3.8,
                "Albumin": 4.1,
                "Platelets": 220.0,
                "Sym_Jaundice": 1,
                "Comorb_Diabetes": 0,
                "Sym_Dark_Urine": 1,
                "Sym_Fatigue": 1,
                "Sym_Ascites": 0
            },
            "predicted_class_id": 4,
            "predicted_class_name": "Hepatitis B",
            "confidence": 0.8140,
            "probabilities": {
                "Normal": 0.0020,
                "Fatty Liver": 0.0125,
                "Alcoholic Liver Disease": 0.0450,
                "Cirrhosis": 0.0280,
                "Hepatitis B": 0.8140,
                "Hepatitis C": 0.0985
            },
            "top_drivers": [
                {"feature": "ALT", "impact": "Acute viral transaminitis", "shap": 0.48},
                {"feature": "AST", "impact": "Acute transaminitis", "shap": 0.35},
                {"feature": "Bilirubin", "impact": "Positive", "shap": 0.28}
            ]
        },
        {
            "id": "HC-8745",
            "timestamp": "2026-10-04T12:05:44Z",
            "patient_alias": "Synthetic Patient F (Demo)",
            "age": 53,
            "gender": "Female",
            "notes": "Evaluation for chronic HCV suspicion with elevated transaminases.",
            "inputs": {
                "AST": 95.0,
                "ALT": 115.0,
                "Bilirubin": 1.9,
                "Albumin": 3.8,
                "Platelets": 185.0,
                "Sym_Jaundice": 0,
                "Comorb_Diabetes": 0,
                "Sym_Dark_Urine": 1,
                "Sym_Fatigue": 1,
                "Sym_Ascites": 0
            },
            "predicted_class_id": 5,
            "predicted_class_name": "Hepatitis C",
            "confidence": 0.7480,
            "probabilities": {
                "Normal": 0.0110,
                "Fatty Liver": 0.0420,
                "Alcoholic Liver Disease": 0.0510,
                "Cirrhosis": 0.0380,
                "Hepatitis B": 0.1100,
                "Hepatitis C": 0.7480
            },
            "top_drivers": [
                {"feature": "ALT", "impact": "Moderate chronic ALT elevation", "shap": 0.33},
                {"feature": "Sym_Dark_Urine", "impact": "Positive", "shap": 0.24},
                {"feature": "Sym_Fatigue", "impact": "Positive", "shap": 0.21}
            ]
        }
    ]
    global ASSESSMENT_STORE
    ASSESSMENT_STORE = demo_cases

seed_synthetic_history()

# Cache LightGBM model and SHAP TreeExplainer
_MODEL_CACHE = {}

def get_model():
    if "model" not in _MODEL_CACHE:
        if not MODEL_PATH.exists():
            raise FileNotFoundError(f"Model artifact not found at {MODEL_PATH}")
        artifact = joblib.load(MODEL_PATH)
        model = artifact["model"] if isinstance(artifact, dict) else artifact
        import shap
        explainer = shap.TreeExplainer(model)
        _MODEL_CACHE["model"] = model
        _MODEL_CACHE["explainer"] = explainer
        _MODEL_CACHE["features"] = BORUTA_FEATURES
    return _MODEL_CACHE["model"], _MODEL_CACHE["explainer"], _MODEL_CACHE["features"]

# Pydantic Schemas
class AssessmentInput(BaseModel):
    patient_alias: Optional[str] = Field(default="Anonymous Patient")
    age: Optional[float] = Field(default=None)
    gender: Optional[str] = Field(default=None)
    notes: Optional[str] = Field(default=None)
    features: Dict[str, Optional[float]] = Field(
        description="Dictionary of 10 Boruta features. Missing values will be imputed with median."
    )

class AssessmentResponse(BaseModel):
    assessment_id: str
    timestamp: str
    patient_alias: str
    predicted_class_id: int
    predicted_class_name: str
    confidence: float
    probabilities: Dict[str, float]
    imputed_features: List[str]
    inputs: Dict[str, float]
    shap_contributions: List[Dict[str, Any]]
    clinical_disclaimer: str

@app.get("/api/health")
def health():
    return {
        "status": "online",
        "service": "HepatoCare AI Backend",
        "model": "LightGBM Tuned Classifier (Boruta Selected Features)",
        "features_count": len(BORUTA_FEATURES),
        "classes": CLASS_NAMES,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }

@app.get("/api/features/schema")
def features_schema():
    categories = {
        "laboratory": ["AST", "ALT", "Bilirubin", "Albumin", "Platelets"],
        "symptoms": ["Sym_Jaundice", "Sym_Dark_Urine", "Sym_Fatigue", "Sym_Ascites"],
        "comorbidity": ["Comorb_Diabetes"]
    }
    
    return {
        "features": FEATURE_METADATA,
        "categories": categories,
        "medians": FEATURE_MEDIANS,
        "boruta_order": BORUTA_FEATURES,
        "class_names": CLASS_NAMES,
        "presets": [
            {
                "name": "Normal Screening Case",
                "badge": "Healthy / Normal",
                "color": "emerald",
                "values": {
                    "AST": 24.0, "ALT": 20.0, "Bilirubin": 0.7, "Albumin": 4.6, "Platelets": 275.0,
                    "Sym_Jaundice": 0, "Sym_Dark_Urine": 0, "Sym_Fatigue": 0, "Sym_Ascites": 0,
                    "Comorb_Diabetes": 0
                }
            },
            {
                "name": "Suspected NAFLD / Fatty Liver",
                "badge": "Fatty Liver",
                "color": "amber",
                "values": {
                    "AST": 54.0, "ALT": 76.0, "Bilirubin": 1.1, "Albumin": 4.2, "Platelets": 310.0,
                    "Sym_Jaundice": 0, "Sym_Dark_Urine": 0, "Sym_Fatigue": 1, "Sym_Ascites": 0,
                    "Comorb_Diabetes": 1
                }
            },
            {
                "name": "Suspected Alcoholic Liver Disease",
                "badge": "ALD",
                "color": "orange",
                "values": {
                    "AST": 178.0, "ALT": 64.0, "Bilirubin": 2.6, "Albumin": 3.6, "Platelets": 185.0,
                    "Sym_Jaundice": 1, "Sym_Dark_Urine": 1, "Sym_Fatigue": 1, "Sym_Ascites": 0,
                    "Comorb_Diabetes": 0
                }
            },
            {
                "name": "Advanced Decompensated Cirrhosis",
                "badge": "Cirrhosis",
                "color": "rose",
                "values": {
                    "AST": 118.0, "ALT": 82.0, "Bilirubin": 4.8, "Albumin": 2.4, "Platelets": 76.0,
                    "Sym_Jaundice": 1, "Sym_Dark_Urine": 1, "Sym_Fatigue": 1, "Sym_Ascites": 1,
                    "Comorb_Diabetes": 1
                }
            },
            {
                "name": "Acute Viral Hepatitis B",
                "badge": "Hepatitis B",
                "color": "blue",
                "values": {
                    "AST": 255.0, "ALT": 340.0, "Bilirubin": 3.9, "Albumin": 4.0, "Platelets": 215.0,
                    "Sym_Jaundice": 1, "Sym_Dark_Urine": 1, "Sym_Fatigue": 1, "Sym_Ascites": 0,
                    "Comorb_Diabetes": 0
                }
            },
            {
                "name": "Chronic Hepatitis C Pattern",
                "badge": "Hepatitis C",
                "color": "purple",
                "values": {
                    "AST": 88.0, "ALT": 112.0, "Bilirubin": 1.8, "Albumin": 3.7, "Platelets": 190.0,
                    "Sym_Jaundice": 0, "Sym_Dark_Urine": 1, "Sym_Fatigue": 1, "Sym_Ascites": 0,
                    "Comorb_Diabetes": 0
                }
            }
        ]
    }

@app.post("/api/predict", response_model=AssessmentResponse)
def predict(payload: AssessmentInput):
    model, explainer, features_order = get_model()

    input_vector = []
    cleaned_inputs = {}
    imputed_features = []

    for feat in features_order:
        raw_val = payload.features.get(feat)
        if raw_val is None or (isinstance(raw_val, float) and (np.isnan(raw_val) or np.isinf(raw_val))):
            imputed_val = round(float(FEATURE_MEDIANS[feat]), 3)
            input_vector.append(imputed_val)
            cleaned_inputs[feat] = imputed_val
            imputed_features.append(feat)
        else:
            val = round(float(raw_val), 3)
            input_vector.append(val)
            cleaned_inputs[feat] = val

    sample_df = pd.DataFrame([input_vector], columns=features_order)

    # LightGBM Prediction
    pred_class_id = int(model.predict(sample_df)[0])
    probabilities_raw = model.predict_proba(sample_df)[0]
    
    probabilities = {
        CLASS_NAMES[i]: round(float(probabilities_raw[i]), 4)
        for i in range(len(CLASS_NAMES))
    }
    
    predicted_class_name = CLASS_NAMES[pred_class_id]
    confidence = probabilities[predicted_class_name]

    # Compute individual SHAP values
    shap_contributions = []
    try:
        raw_shap = explainer.shap_values(sample_df)
        # raw_shap shape is (1, 10, 6) or list of length 6
        if isinstance(raw_shap, list):
            class_shap = raw_shap[pred_class_id][0]
        elif hasattr(raw_shap, "shape") and len(raw_shap.shape) == 3:
            class_shap = raw_shap[0, :, pred_class_id]
        else:
            class_shap = np.zeros(len(features_order))

        for feat, sv in zip(features_order, class_shap):
            val = cleaned_inputs[feat]
            direction = "positive" if sv > 0 else "negative"
            shap_contributions.append({
                "feature": feat,
                "label": FEATURE_METADATA.get(feat, {}).get("label", feat),
                "value": val,
                "unit": FEATURE_METADATA.get(feat, {}).get("unit", ""),
                "shap_value": round(float(sv), 4),
                "direction": direction,
                "abs_importance": round(abs(float(sv)), 4)
            })
        # Sort by absolute SHAP impact
        shap_contributions.sort(key=lambda x: x["abs_importance"], reverse=True)
    except Exception as e:
        print(f"SHAP explanation computation error: {e}")
        # fallback feature importance
        for feat in features_order:
            shap_contributions.append({
                "feature": feat,
                "label": FEATURE_METADATA.get(feat, {}).get("label", feat),
                "value": cleaned_inputs[feat],
                "unit": FEATURE_METADATA.get(feat, {}).get("unit", ""),
                "shap_value": 0.0,
                "direction": "neutral",
                "abs_importance": 0.0
            })

    assessment_id = f"HC-{str(uuid.uuid4())[:6].upper()}"
    timestamp = datetime.now(timezone.utc).isoformat()

    record = {
        "id": assessment_id,
        "timestamp": timestamp,
        "patient_alias": payload.patient_alias or "Anonymous Patient",
        "age": payload.age,
        "gender": payload.gender,
        "notes": payload.notes,
        "inputs": cleaned_inputs,
        "imputed_features": imputed_features,
        "predicted_class_id": pred_class_id,
        "predicted_class_name": predicted_class_name,
        "confidence": confidence,
        "probabilities": probabilities,
        "shap_contributions": shap_contributions,
        "clinical_disclaimer": (
            "Model Estimate Notice: This assessment is an AI-generated statistical risk calculation "
            "based on LightGBM trained on Boruta-selected biomarkers. It does not replace clinical judgment, "
            "imaging, or confirmatory histology. Review with a certified hepatologist."
        )
    }

    # Prepend to history store
    ASSESSMENT_STORE.insert(0, record)

    return AssessmentResponse(
        assessment_id=assessment_id,
        timestamp=timestamp,
        patient_alias=record["patient_alias"],
        predicted_class_id=pred_class_id,
        predicted_class_name=predicted_class_name,
        confidence=confidence,
        probabilities=probabilities,
        imputed_features=imputed_features,
        inputs=cleaned_inputs,
        shap_contributions=shap_contributions,
        clinical_disclaimer=record["clinical_disclaimer"]
    )

@app.get("/api/dashboard/stats")
def dashboard_stats():
    total_assessments = len(ASSESSMENT_STORE)
    
    # Disease distribution across stored assessments
    distribution = {cls: 0 for cls in CLASS_NAMES}
    for item in ASSESSMENT_STORE:
        cls_name = item.get("predicted_class_name", "Normal")
        if cls_name in distribution:
            distribution[cls_name] += 1

    # Verified metrics from load.py
    model_metrics = {
        "model_name": "LightGBM Tuned (Boruta 10)",
        "validation_accuracy": 0.8840,
        "validation_macro_f1": 0.8550,
        "validation_balanced_accuracy": 0.8547,
        "validation_weighted_f1": 0.8842,
        "test_accuracy": 0.8743,
        "test_macro_f1": 0.8333,
        "test_balanced_accuracy": 0.8328,
        "baseline_model": "FT-Transformer (Deep Tabular)",
        "baseline_accuracy": 0.8383,
        "baseline_macro_f1": 0.7823,
        "baseline_balanced_accuracy": 0.7903,
        "total_training_samples": 47600,
        "total_validation_samples": 10200,
        "total_test_samples": 10200
    }

    recent_history = [
        {
            "id": a["id"],
            "timestamp": a["timestamp"],
            "patient_alias": a["patient_alias"],
            "predicted_class_name": a["predicted_class_name"],
            "confidence": a["confidence"],
            "probabilities": a["probabilities"]
        }
        for a in ASSESSMENT_STORE[:6]
    ]

    return {
        "total_assessments": total_assessments,
        "disease_distribution": distribution,
        "model_metrics": model_metrics,
        "recent_history": recent_history
    }

@app.get("/api/explain/global")
def explain_global():
    # Load LightGBM feature importance from results
    fi_path = LIGHTGBM_DIR / "feature_importance.csv"
    importance_data = []
    if fi_path.exists():
        fi_df = pd.read_csv(fi_path)
        for _, row in fi_df.iterrows():
            feat = row["Feature"]
            importance_data.append({
                "feature": feat,
                "label": FEATURE_METADATA.get(feat, {}).get("label", feat),
                "category": FEATURE_METADATA.get(feat, {}).get("category", "laboratory"),
                "importance": int(row["Importance"])
            })
    else:
        # Fallback to model feature importances
        model, _, features = get_model()
        for feat, imp in zip(features, model.feature_importances_):
            importance_data.append({
                "feature": feat,
                "label": FEATURE_METADATA.get(feat, {}).get("label", feat),
                "category": FEATURE_METADATA.get(feat, {}).get("category", "laboratory"),
                "importance": int(imp)
            })

    importance_data.sort(key=lambda x: x["importance"], reverse=True)

    # Boruta ranking data
    boruta_path = BASE_DIR / "Boruta_Feature_Ranking.csv"
    ranking_data = []
    if boruta_path.exists():
        b_df = pd.read_csv(boruta_path)
        ranking_data = b_df.to_dict(orient="records")

    return {
        "feature_importance": importance_data,
        "boruta_ranking": ranking_data,
        "shap_summary_url": "/shap_summary.png",
        "shap_bar_url": "/shap_bar.png",
        "feature_importance_plot_url": "/feature_importance.png",
        "features_count": len(BORUTA_FEATURES),
        "explanation": (
            "LightGBM utilizes gradient boosted decision trees over the 10 Boruta-selected features. "
            "Biochemical laboratory markers (Bilirubin, ALT, Platelets, AST, Albumin) carry over 92% of the cumulative "
            "split gain, while clinical symptoms (Ascites, Jaundice, Dark Urine) provide critical non-linear inflection "
            "for viral and decompensated cirrhosis differentiation."
        )
    }

@app.get("/api/model/metrics")
def model_metrics():
    # LightGBM metrics from load.py & results/lightgbm
    lightgbm_report_path = LIGHTGBM_DIR / "lightgbm_validation_report.csv"
    lightgbm_cm_path = LIGHTGBM_DIR / "lightgbm_validation_confusion_matrix.csv"
    
    lightgbm_per_class = {}
    if lightgbm_report_path.exists():
        rep_df = pd.read_csv(lightgbm_report_path, index_col=0)
        for cls_name in CLASS_NAMES:
            norm_name = cls_name.replace(" ", "_")
            row = None
            if norm_name in rep_df.index:
                row = rep_df.loc[norm_name]
            elif cls_name in rep_df.index:
                row = rep_df.loc[cls_name]
            if row is not None:
                lightgbm_per_class[cls_name] = {
                    "precision": round(float(row["precision"]), 4),
                    "recall": round(float(row["recall"]), 4),
                    "f1": round(float(row["f1-score"]), 4),
                    "support": int(row["support"])
                }

    lightgbm_cm = []
    if lightgbm_cm_path.exists():
        cm_df = pd.read_csv(lightgbm_cm_path, index_col=0)
        lightgbm_cm = cm_df.values.tolist()

    # FT-Transformer metrics from results
    ft_summary_path = RESULTS_DIR / "ft_transformer_summary.json"
    ft_report_path = RESULTS_DIR / "ft_transformer_test_report.csv"
    ft_cm_path = RESULTS_DIR / "ft_transformer_confusion_matrix.csv"

    ft_summary = {}
    if ft_summary_path.exists():
        with open(ft_summary_path, "r") as f:
            ft_summary = json.load(f)

    ft_per_class = {}
    if ft_report_path.exists():
        rep_df = pd.read_csv(ft_report_path, index_col=0)
        for cls_name in CLASS_NAMES:
            norm_name = cls_name.replace(" ", "_")
            row = None
            if cls_name in rep_df.index:
                row = rep_df.loc[cls_name]
            elif norm_name in rep_df.index:
                row = rep_df.loc[norm_name]
            if row is not None:
                ft_per_class[cls_name] = {
                    "precision": round(float(row["precision"]), 4),
                    "recall": round(float(row["recall"]), 4),
                    "f1": round(float(row["f1-score"]), 4),
                    "support": int(row["support"])
                }

    ft_cm = []
    if ft_cm_path.exists():
        cm_df = pd.read_csv(ft_cm_path, index_col=0)
        ft_cm = cm_df.values.tolist()

    return {
        "classes": CLASS_NAMES,
        "lightgbm": {
            "name": "LightGBM (model_2 — Tuned Boruta)",
            "accuracy": 0.8840,
            "macro_f1": 0.8550,
            "balanced_accuracy": 0.8547,
            "weighted_f1": 0.8842,
            "test_accuracy": 0.8743,
            "test_macro_f1": 0.8333,
            "test_balanced_accuracy": 0.8328,
            "features_used": 10,
            "features_list": BORUTA_FEATURES,
            "per_class": lightgbm_per_class,
            "confusion_matrix": lightgbm_cm
        },
        "ft_transformer": {
            "name": "FT-Transformer (model.py — Deep Attention)",
            "accuracy": ft_summary.get("test_accuracy", 0.8383),
            "macro_f1": ft_summary.get("test_macro_f1", 0.7823),
            "balanced_accuracy": ft_summary.get("test_balanced_accuracy", 0.7903),
            "weighted_f1": ft_summary.get("test_weighted_f1", 0.8405),
            "features_used": len(ft_summary.get("selected_features", [])),
            "epochs_trained": ft_summary.get("epochs_trained", 64),
            "per_class": ft_per_class,
            "confusion_matrix": ft_cm
        },
        "comparison_highlights": [
            {
                "metric": "Overall Accuracy",
                "lightgbm": "88.40%",
                "ft_transformer": "83.83%",
                "delta": "+4.57%",
                "winner": "LightGBM"
            },
            {
                "metric": "Macro F1-Score",
                "lightgbm": "85.50%",
                "ft_transformer": "78.23%",
                "delta": "+7.27%",
                "winner": "LightGBM"
            },
            {
                "metric": "Balanced Accuracy",
                "lightgbm": "85.47%",
                "ft_transformer": "79.03%",
                "delta": "+6.44%",
                "winner": "LightGBM"
            },
            {
                "metric": "Hepatitis C Recall",
                "lightgbm": "75.00%",
                "ft_transformer": "69.44%",
                "delta": "+5.56%",
                "winner": "LightGBM"
            },
            {
                "metric": "Hepatitis B F1-Score",
                "lightgbm": "80.66%",
                "ft_transformer": "64.41%",
                "delta": "+16.25%",
                "winner": "LightGBM"
            }
        ],
        "key_takeaway": (
            "LightGBM with Boruta feature selection (10 features) outperformed FT-Transformer (54 features) across all "
            "macro metrics. Decision tree partitioning handled non-linear biochemical thresholds (e.g. AST/ALT ratios "
            "and hyperbilirubinemia) with sharper decision boundaries than deep multi-head self-attention on tabular clinical data."
        )
    }

@app.get("/api/assessments")
def list_assessments():
    return {
        "count": len(ASSESSMENT_STORE),
        "assessments": ASSESSMENT_STORE
    }

@app.get("/api/assessments/{assessment_id}")
def get_assessment(assessment_id: str):
    for item in ASSESSMENT_STORE:
        if item["id"].lower() == assessment_id.lower():
            return item
    raise HTTPException(status_code=404, detail="Assessment not found")

@app.get("/api/assessments/{assessment_id}/report")
def export_assessment_report(assessment_id: str):
    item = None
    for a in ASSESSMENT_STORE:
        if a["id"].lower() == assessment_id.lower():
            item = a
            break
    if not item:
        raise HTTPException(status_code=404, detail="Assessment not found")

    report_md = f"""# HepatoCare AI — Clinical Assessment Report
**Assessment ID:** {item['id']}
**Generated Timestamp:** {item['timestamp']}
**Subject Alias:** {item.get('patient_alias', 'Anonymous Patient')}
**Evaluation Model:** LightGBM Tuned Multi-Class Classifier (Boruta 10 Feature Pipeline)

---

## 1. Predictive Summary
- **Predicted Condition:** {item['predicted_class_name']}
- **Model Confidence:** {item['confidence'] * 100:.1f}%
- **Clinical Priority Tier:** {'CRITICAL / URGENT' if item['predicted_class_name'] in ['Cirrhosis', 'Hepatitis B', 'Hepatitis C'] else 'EVALUATE / MONITOR'}

### Differential Class Probabilities:
"""
    for cls, prob in item["probabilities"].items():
        report_md += f"- **{cls}:** {prob * 100:.2f}%\n"

    report_md += """
---

## 2. Quantitative Biomarkers (Boruta Selected)
| Feature | Clinical Parameter | Patient Value | Reference Range | Status |
|---|---|---|---|---|
"""
    for feat, meta in FEATURE_METADATA.items():
        val = item["inputs"].get(feat, "N/A")
        cat = meta["category"].capitalize()
        unit = meta["unit"]
        ref = meta["ref_range"]
        status = "Within Normal"
        if feat == "AST" and isinstance(val, (int, float)) and val > 40:
            status = "ELEVATED"
        elif feat == "ALT" and isinstance(val, (int, float)) and val > 56:
            status = "ELEVATED"
        elif feat == "Bilirubin" and isinstance(val, (int, float)) and val > 1.2:
            status = "ELEVATED"
        elif feat == "Albumin" and isinstance(val, (int, float)) and val < 3.5:
            status = "LOW (HYPOALBUMINEMIA)"
        elif feat == "Platelets" and isinstance(val, (int, float)) and val < 150:
            status = "LOW (THROMBOCYTOPENIA)"
        elif feat.startswith("Sym_") and val == 1:
            status = "PRESENT"
        elif feat.startswith("Comorb_") and val == 1:
            status = "DIAGNOSED"

        report_md += f"| {feat} | {meta['label']} | {val} {unit} | {ref} | {status} |\n"

    report_md += f"""
---

## 3. Explainable AI & Key Decision Drivers
"""
    drivers = item.get("shap_contributions") or item.get("top_drivers") or []
    for d in drivers[:5]:
        feat = d.get("label") or d.get("feature")
        imp = d.get("impact") or f"SHAP: {d.get('shap_value')}"
        report_md += f"- **{feat}:** {imp}\n"

    report_md += f"""
---

## 4. Regulatory & Clinical Governance
> **Notice:** {item.get('clinical_disclaimer', 'This report is generated for clinical decision support. Physician confirmation is required.')}
> **Data Protection:** Synthetic / de-identified demonstration record compliant with HIPAA safe-harbor guidelines.
"""
    return {
        "assessment_id": item["id"],
        "markdown": report_md,
        "json": item
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("api:app", host="127.0.0.1", port=8000, reload=True)
