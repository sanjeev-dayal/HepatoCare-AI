
from pathlib import Path
import json
import joblib
import numpy as np
import pandas as pd

from boruta import BorutaPy
from sklearn.ensemble import RandomForestClassifier
from sklearn.impute import SimpleImputer
from sklearn.model_selection import train_test_split
from sklearn.metrics import (
    accuracy_score,
    balanced_accuracy_score,
    classification_report,
    confusion_matrix,
    f1_score
)

BASE_DIR = Path(__file__).resolve().parent
RESULTS_DIR = BASE_DIR / "results"
RESULTS_DIR.mkdir(exist_ok=True)

RANDOM_STATE = 42

TARGET = "Liver_Disease_Type"

TARGET_MAP = {
    "Normal": 0,
    "Fatty_Liver": 1,
    "Alcoholic_Liver_Disease": 2,
    "Cirrhosis": 3,
    "Hepatitis_B": 4,
    "Hepatitis_C": 5
}

LABEL_NAMES = [
    "Normal",
    "Fatty Liver",
    "Alcoholic Liver Disease",
    "Cirrhosis",
    "Hepatitis B",
    "Hepatitis C"
]


def preprocess_data(df):
    df = df.copy()

    df.drop(columns=["Patient_ID"], errors="ignore", inplace=True)

    df[TARGET] = df[TARGET].map(TARGET_MAP)

    if df[TARGET].isna().any():
        raise ValueError(
            "Unknown or missing target labels found. "
            "Check the Liver_Disease_Type values in train.csv."
        )

    y = df[TARGET].astype(int)
    X = df.drop(columns=[TARGET])

    categorical_columns = X.select_dtypes(
        include=["object", "category", "bool"]
    ).columns.tolist()

    numerical_columns = X.select_dtypes(
        include=np.number
    ).columns.tolist()

    for col in categorical_columns:
        X[col] = X[col].fillna("Unknown").astype(str)

    X = pd.get_dummies(
        X,
        columns=categorical_columns,
        dtype=int
    )

    X = X.replace([np.inf, -np.inf], np.nan)

    return X, y


def main():
    data_path = BASE_DIR / "train.csv"

    if not data_path.exists():
        raise FileNotFoundError(
            f"train.csv was not found in {BASE_DIR}"
        )

    df = pd.read_csv(data_path)

    X, y = preprocess_data(df)

    print("Dataset shape:", df.shape)
    print("\nTarget distribution:")
    print(y.value_counts().sort_index())

    # Split before feature selection.
    X_train, X_temp, y_train, y_temp = train_test_split(
        X,
        y,
        test_size=0.30,
        random_state=RANDOM_STATE,
        stratify=y
    )

    X_val, X_test, y_val, y_test = train_test_split(
        X_temp,
        y_temp,
        test_size=0.50,
        random_state=RANDOM_STATE,
        stratify=y_temp
    )

    # Fit imputation using training data only.
    imputer = SimpleImputer(strategy="median")

    X_train = pd.DataFrame(
        imputer.fit_transform(X_train),
        columns=X_train.columns,
        index=X_train.index
    )

    X_val = pd.DataFrame(
        imputer.transform(X_val),
        columns=X_val.columns,
        index=X_val.index
    )

    X_test = pd.DataFrame(
        imputer.transform(X_test),
        columns=X_test.columns,
        index=X_test.index
    )

    print("\nSplit sizes:")
    print("Training:", X_train.shape)
    print("Validation:", X_val.shape)
    print("Test:", X_test.shape)

    # Boruta sees only the training set.
    selector_model = RandomForestClassifier(
        n_estimators=300,
        class_weight="balanced",
        random_state=RANDOM_STATE,
        n_jobs=-1
    )

    boruta = BorutaPy(
        estimator=selector_model,
        n_estimators="auto",
        max_iter=50,
        random_state=RANDOM_STATE,
        verbose=2
    )

    boruta.fit(
        X_train.to_numpy(),
        y_train.to_numpy()
    )

    selected_features = X_train.columns[
        boruta.support_
    ].tolist()

    if not selected_features:
        raise RuntimeError(
            "Boruta selected no features. "
            "Inspect the data and feature-selection settings."
        )

    print("\nSelected features:")
    print(selected_features)

    ranking = pd.DataFrame({
        "Feature": X_train.columns,
        "Rank": boruta.ranking_,
        "Selected": boruta.support_
    }).sort_values("Rank")

    ranking.to_csv(
        RESULTS_DIR / "boruta_feature_ranking_train_only.csv",
        index=False
    )

    pd.DataFrame({
        "Feature": selected_features
    }).to_csv(
        RESULTS_DIR / "selected_features_train_only.csv",
        index=False
    )

    X_train_sel = X_train[selected_features]
    X_val_sel = X_val[selected_features]
    X_test_sel = X_test[selected_features]

    # Train baseline model.
    model = RandomForestClassifier(
        n_estimators=300,
        class_weight="balanced",
        random_state=RANDOM_STATE,
        n_jobs=-1
    )

    model.fit(X_train_sel, y_train)

    # Evaluate on validation data.
    val_pred = model.predict(X_val_sel)

    val_report = classification_report(
        y_val,
        val_pred,
        labels=list(range(6)),
        target_names=LABEL_NAMES,
        output_dict=True,
        zero_division=0
    )

    pd.DataFrame(val_report).transpose().to_csv(
        RESULTS_DIR / "validation_classification_report.csv"
    )

    pd.DataFrame(
        confusion_matrix(
            y_val,
            val_pred,
            labels=list(range(6))
        ),
        index=LABEL_NAMES,
        columns=LABEL_NAMES
    ).to_csv(
        RESULTS_DIR / "validation_confusion_matrix.csv"
    )

    # Final held-out test evaluation.
    test_pred = model.predict(X_test_sel)

    test_report = classification_report(
        y_test,
        test_pred,
        labels=list(range(6)),
        target_names=LABEL_NAMES,
        output_dict=True,
        zero_division=0
    )

    pd.DataFrame(test_report).transpose().to_csv(
        RESULTS_DIR / "test_classification_report.csv"
    )

    pd.DataFrame(
        confusion_matrix(
            y_test,
            test_pred,
            labels=list(range(6))
        ),
        index=LABEL_NAMES,
        columns=LABEL_NAMES
    ).to_csv(
        RESULTS_DIR / "test_confusion_matrix.csv"
    )

    summary = {
        "model": "RandomForestClassifier",
        "train_rows": len(X_train),
        "validation_rows": len(X_val),
        "test_rows": len(X_test),
        "selected_features": selected_features,
        "validation": {
            "accuracy": float(accuracy_score(y_val, val_pred)),
            "balanced_accuracy": float(
                balanced_accuracy_score(y_val, val_pred)
            ),
            "macro_f1": float(
                f1_score(y_val, val_pred, average="macro")
            )
        },
        "test": {
            "accuracy": float(accuracy_score(y_test, test_pred)),
            "balanced_accuracy": float(
                balanced_accuracy_score(y_test, test_pred)
            ),
            "macro_f1": float(
                f1_score(y_test, test_pred, average="macro")
            )
        }
    }

    with open(
        RESULTS_DIR / "evaluation_summary.json",
        "w",
        encoding="utf-8"
    ) as file:
        json.dump(summary, file, indent=4)

    # Save everything required for later inference.
    joblib.dump(
        {
            "model": model,
            "imputer": imputer,
            "selected_features": selected_features,
            "input_columns": X.columns.tolist(),
            "label_names": LABEL_NAMES
        },
        RESULTS_DIR / "random_forest_baseline.joblib"
    )

    print("\nValidation results:")
    print(classification_report(
        y_val,
        val_pred,
        labels=list(range(6)),
        target_names=LABEL_NAMES,
        zero_division=0
    ))

    print("\nFinal test results:")
    print(classification_report(
        y_test,
        test_pred,
        labels=list(range(6)),
        target_names=LABEL_NAMES,
        zero_division=0
    ))

    print("\nEvaluation summary:")
    print(json.dumps(summary, indent=4))

    print("\nResults saved to:", RESULTS_DIR)


if __name__ == "__main__":
    main()