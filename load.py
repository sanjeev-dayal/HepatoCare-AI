
from pathlib import Path
import joblib
import numpy as np
import pandas as pd

from sklearn.model_selection import train_test_split
from sklearn.metrics import (
    accuracy_score,
    balanced_accuracy_score,
    f1_score,
    classification_report,
    confusion_matrix
)

BASE_DIR = Path(__file__).resolve().parent
RESULTS_DIR = BASE_DIR / "results" / "lightgbm"
DATA_PATH = BASE_DIR / "Final_Selected_Features.csv"
MODEL_PATH = RESULTS_DIR / "lightgbm_tuned.pkl"

CLASS_NAMES = [
    "Normal",
    "Fatty_Liver",
    "Alcoholic_Liver_Disease",
    "Cirrhosis",
    "Hepatitis_B",
    "Hepatitis_C"
]

TARGET = "Liver_Disease_Type"
RANDOM_STATE = 42


def main():
    RESULTS_DIR.mkdir(parents=True, exist_ok=True)

    if not DATA_PATH.exists():
        raise FileNotFoundError(
            f"Dataset not found: {DATA_PATH}\n"
            "Update DATA_PATH to the CSV used to train LightGBM."
        )

    if not MODEL_PATH.exists():
        raise FileNotFoundError(
            f"Model not found: {MODEL_PATH}\n"
            "Train the tuned LightGBM model first."
        )

    artifact = joblib.load(MODEL_PATH)

    model = artifact["model"]
    features = artifact["features"]

    print("Loaded model:", MODEL_PATH.name)
    print("Model type:", type(model).__name__)
    print("Selected features:", features)

    df = pd.read_csv(DATA_PATH)
    df.columns = df.columns.str.strip()
    df = df.drop(columns=["Patient_ID"], errors="ignore")

    if TARGET not in df.columns:
        raise ValueError(
            f"Target column '{TARGET}' is missing from the dataset."
        )

    missing_features = [
        feature for feature in features
        if feature not in df.columns
    ]

    if missing_features:
        raise ValueError(
            f"Model features missing from dataset: {missing_features}"
        )

    target_map = {
        "Normal": 0,
        "Fatty_Liver": 1,
        "Alcoholic_Liver_Disease": 2,
        "Cirrhosis": 3,
        "Hepatitis_B": 4,
        "Hepatitis_C": 5
    }

    if (
        pd.api.types.is_object_dtype(df[TARGET])
        or isinstance(df[TARGET].dtype, pd.CategoricalDtype)
    ):
        df[TARGET] = (
            df[TARGET].astype(str).str.strip().map(target_map)
        )

    df = df.dropna(subset=[TARGET]).copy()

    X = df[features].copy()

    for column in X.columns:
        X[column] = pd.to_numeric(X[column], errors="coerce")

    X = X.replace([np.inf, -np.inf], np.nan)

    y = df[TARGET].astype(int)

    if not set(y.unique()).issubset(set(range(6))):
        raise ValueError("Unexpected target class IDs.")

    # Reproduce the original 70/15/15 stratified split.
    X_train, X_temp, y_train, y_temp = train_test_split(
        X,
        y,
        test_size=0.30,
        random_state=RANDOM_STATE,
        stratify=y
    )

    X_val, _, y_val, _ = train_test_split(
        X_temp,
        y_temp,
        test_size=0.50,
        random_state=RANDOM_STATE,
        stratify=y_temp
    )

    # Fit imputation on training data only.
    medians = X_train.median()

    X_val = X_val.fillna(medians)

    if X_val.isna().any().any():
        raise ValueError(
            "Some features contain only missing training values. "
            "Check the dataset and preprocessing."
        )

    # Match the feature order used by the trained model.
    X_val = X_val[features]

    predictions = model.predict(X_val).astype(int)
    probabilities = model.predict_proba(X_val)

    y_true = y_val.to_numpy()

    print("\n========== LIGHTGBM VALIDATION RESULTS ==========")
    print(f"Accuracy: {accuracy_score(y_true, predictions):.4f}")
    print(
        f"Balanced Accuracy: "
        f"{balanced_accuracy_score(y_true, predictions):.4f}"
    )
    print(
        f"Macro-F1: "
        f"{f1_score(y_true, predictions, average='macro'):.4f}"
    )
    print(
        f"Weighted F1: "
        f"{f1_score(y_true, predictions, average='weighted'):.4f}"
    )

    print("\nClassification Report:")

    report_text = classification_report(
        y_true,
        predictions,
        labels=list(range(6)),
        target_names=CLASS_NAMES,
        digits=4,
        zero_division=0
    )

    print(report_text)

    report_dict = classification_report(
        y_true,
        predictions,
        labels=list(range(6)),
        target_names=CLASS_NAMES,
        output_dict=True,
        zero_division=0
    )

    pd.DataFrame(report_dict).transpose().to_csv(
        RESULTS_DIR / "lightgbm_validation_report.csv"
    )

    cm = confusion_matrix(
        y_true,
        predictions,
        labels=list(range(6))
    )

    pd.DataFrame(
        cm,
        index=CLASS_NAMES,
        columns=CLASS_NAMES
    ).to_csv(
        RESULTS_DIR / "lightgbm_validation_confusion_matrix.csv"
    )

    # Save validation probabilities for further analysis.
    probability_df = pd.DataFrame(
        probabilities,
        columns=CLASS_NAMES
    )

    probability_df.insert(0, "Actual_Class", y_true)
    probability_df.insert(1, "Predicted_Class", predictions)

    probability_df.to_csv(
        RESULTS_DIR / "lightgbm_validation_probabilities.csv",
        index=False
    )

    print("\nBest iteration:", getattr(model, "best_iteration_", None))
    print("Validation report and confusion matrix saved in:")
    print(RESULTS_DIR)


if __name__ == "__main__":
    main()