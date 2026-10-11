
import os
import json
import joblib
import numpy as np
import pandas as pd
import lightgbm as lgb
import matplotlib.pyplot as plt
import seaborn as sns

from sklearn.model_selection import train_test_split
from sklearn.metrics import (
    accuracy_score,
    balanced_accuracy_score,
    f1_score,
    classification_report,
    confusion_matrix
)

DATA_PATH = r"C:/Users/Sanjeev/HepatoCare-AI/Final_Selected_Features.csv"
TARGET = "Liver_Disease_Type"
RANDOM_STATE = 42

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

CLASS_NAMES = [
    "Normal",
    "Fatty_Liver",
    "Alcoholic_Liver_Disease",
    "Cirrhosis",
    "Hepatitis_B",
    "Hepatitis_C"
]

os.makedirs("results/lightgbm", exist_ok=True)

df = pd.read_csv(DATA_PATH)

df.columns = df.columns.str.strip()

if TARGET not in df.columns:
    raise ValueError(
        f"Target column '{TARGET}' not found. "
        f"Available columns: {df.columns.tolist()}"
    )

missing_features = [
    feature for feature in BORUTA_FEATURES
    if feature not in df.columns
]

if missing_features:
    raise ValueError(
        f"Boruta features missing from dataset: {missing_features}"
    )

df = df.dropna(subset=[TARGET]).copy()

X = df[BORUTA_FEATURES].copy()
y = df[TARGET].copy()

label_map = {
    "Normal": 0,
    "Fatty_Liver": 1,
    "Alcoholic_Liver_Disease": 2,
    "Cirrhosis": 3,
    "Hepatitis_B": 4,
    "Hepatitis_C": 5
}

if y.dtype == "object" or isinstance(y.dtype, pd.CategoricalDtype):
    y = y.astype(str).str.strip().map(label_map)

if y.isna().any():
    raise ValueError(
        "Some target labels could not be mapped. "
        "Check the values in Liver_Disease_Type."
    )

y = y.astype(int)

if not set(y.unique()).issubset(set(range(6))):
    raise ValueError("Target must contain class IDs from 0 to 5.")

X = X.replace([np.inf, -np.inf], np.nan)

for column in X.columns:
    X[column] = pd.to_numeric(X[column], errors="coerce")

# Split 70% train and 30% temporary
X_train, X_temp, y_train, y_temp = train_test_split(
    X,
    y,
    test_size=0.30,
    random_state=RANDOM_STATE,
    stratify=y
)

# Split remaining 30% equally into validation and test
X_val, X_test, y_val, y_test = train_test_split(
    X_temp,
    y_temp,
    test_size=0.50,
    random_state=RANDOM_STATE,
    stratify=y_temp
)

# Impute missing values using training data only
medians = X_train.median()

X_train = X_train.fillna(medians)
X_val = X_val.fillna(medians)
X_test = X_test.fillna(medians)

print("Dataset split:")
print("Training:", X_train.shape)
print("Validation:", X_val.shape)
print("Testing:", X_test.shape)
print("Boruta features:", X_train.columns.tolist())

# Train LightGBM

import json
import itertools
import numpy as np
import pandas as pd
import lightgbm as lgb

from sklearn.metrics import (
    accuracy_score,
    balanced_accuracy_score,
    f1_score,
    classification_report
)
from sklearn.utils.class_weight import compute_class_weight

classes = np.array([0, 1, 2, 3, 4, 5])

base_weights = compute_class_weight(
    class_weight="balanced",
    classes=classes,
    y=np.asarray(y_train)
)

base_weights = dict(zip(classes.tolist(), base_weights.tolist()))

results = []
best_model = None
best_score = -1
best_config = None

weight_multipliers = [1.0, 1.2, 1.4]
leaf_options = [15, 31, 63]
child_options = [20, 40, 60]
regularization_options = [
    (0.0, 1.0),
    (0.1, 2.0)
]

total = (
    len(weight_multipliers)
    * len(leaf_options)
    * len(child_options)
    * len(regularization_options)
)

run = 0

for c_weight, leaves, min_child, reg in itertools.product(
    weight_multipliers,
    leaf_options,
    child_options,
    regularization_options
):
    run += 1

    weights = base_weights.copy()
    weights[5] *= c_weight

    model = lgb.LGBMClassifier(
        objective="multiclass",
        num_class=6,
        boosting_type="gbdt",
        n_estimators=2000,
        learning_rate=0.03,
        num_leaves=leaves,
        max_depth=-1,
        min_child_samples=min_child,
        colsample_bytree=0.9,
        subsample=0.8,
        subsample_freq=1,
        reg_alpha=reg[0],
        reg_lambda=reg[1],
        class_weight=weights,
        random_state=42,
        n_jobs=-1,
        verbosity=-1
    )

    model.fit(
        X_train,
        y_train,
        eval_set=[(X_val, y_val)],
        eval_metric="multi_logloss",
        callbacks=[
            lgb.early_stopping(75, verbose=False)
        ]
    )

    val_pred = model.predict(X_val)

    macro_f1 = f1_score(
        y_val, val_pred, average="macro"
    )
    balanced_acc = balanced_accuracy_score(
        y_val, val_pred
    )
    accuracy = accuracy_score(y_val, val_pred)

    results.append({
        "run": run,
        "hepatitis_c_weight_multiplier": c_weight,
        "num_leaves": leaves,
        "min_child_samples": min_child,
        "reg_alpha": reg[0],
        "reg_lambda": reg[1],
        "best_iteration": model.best_iteration_,
        "validation_macro_f1": macro_f1,
        "validation_balanced_accuracy": balanced_acc,
        "validation_accuracy": accuracy
    })

    print(
        f"{run}/{total} | "
        f"Macro-F1={macro_f1:.4f} | "
        f"Balanced Acc={balanced_acc:.4f} | "
        f"C weight={c_weight} | "
        f"Leaves={leaves} | Child={min_child}"
    )

    if macro_f1 > best_score:
        best_score = macro_f1
        best_model = model
        best_config = results[-1].copy()

results_df = pd.DataFrame(results).sort_values(
    "validation_macro_f1",
    ascending=False
)

results_df.to_csv(
    "results/lightgbm/tuning_results.csv",
    index=False
)

print("\nTOP 10 CONFIGURATIONS")
print(results_df.head(10).to_string(index=False))

print("\nBEST CONFIGURATION")
print(json.dumps(best_config, indent=4))

# Save the selected model and its configuration.
import joblib

joblib.dump(
    {
        "model": best_model,
        "config": best_config,
        "features": list(X_train.columns)
    },
    "results/lightgbm/lightgbm_tuned.pkl"
)

# Validation report for the chosen configuration.
val_pred = best_model.predict(X_val)

print("\nBEST VALIDATION RESULTS")
print("Accuracy:", accuracy_score(y_val, val_pred))
print(
    "Balanced accuracy:",
    balanced_accuracy_score(y_val, val_pred)
)
print(
    "Macro-F1:",
    f1_score(y_val, val_pred, average="macro")
)
print(
    classification_report(
        y_val,
        val_pred,
        labels=[0, 1, 2, 3, 4, 5],
        target_names=[
            "Normal",
            "Fatty_Liver",
            "Alcoholic_Liver_Disease",
            "Cirrhosis",
            "Hepatitis_B",
            "Hepatitis_C"
        ],
        digits=4,
        zero_division=0
    )
)


# Save validation metrics
val_metrics = {
    "accuracy": accuracy_score(y_val, val_pred),
    "balanced_accuracy": balanced_accuracy_score(y_val, val_pred),
    "macro_f1": f1_score(y_val, val_pred, average="macro"),
    "weighted_f1": f1_score(y_val, val_pred, average="weighted")
}

with open("results/lightgbm/validation_metrics.json", "w") as file:
    json.dump(val_metrics, file, indent=4)

# Final test evaluation
# Run this after using validation results to assess the chosen model.
test_pred = model.predict(X_test)

print("\n========== TEST RESULTS ==========")
print("Accuracy:", round(accuracy_score(y_test, test_pred), 4))
print(
    "Balanced Accuracy:",
    round(balanced_accuracy_score(y_test, test_pred), 4)
)
print("Macro F1:", round(f1_score(y_test, test_pred, average="macro"), 4))
print("Weighted F1:", round(f1_score(y_test, test_pred, average="weighted"), 4))

print("\nTest classification report:")
report = classification_report(
    y_test,
    test_pred,
    labels=list(range(6)),
    target_names=CLASS_NAMES,
    digits=4,
    zero_division=0,
    output_dict=True
)

print(
    classification_report(
        y_test,
        test_pred,
        labels=list(range(6)),
        target_names=CLASS_NAMES,
        digits=4,
        zero_division=0
    )
)

pd.DataFrame(report).transpose().to_csv(
    "results/lightgbm/test_classification_report.csv"
)

# Confusion matrix
cm = confusion_matrix(y_test, test_pred, labels=list(range(6)))

plt.figure(figsize=(10, 7))
sns.heatmap(
    cm,
    annot=True,
    fmt="d",
    cmap="Blues",
    xticklabels=CLASS_NAMES,
    yticklabels=CLASS_NAMES
)
plt.xlabel("Predicted Class")
plt.ylabel("Actual Class")
plt.title("LightGBM - Test Confusion Matrix")
plt.xticks(rotation=35, ha="right")
plt.yticks(rotation=0)
plt.tight_layout()
plt.savefig(
    "results/lightgbm/test_confusion_matrix.png",
    dpi=300
)
plt.close()

# Feature importance
importance = pd.DataFrame({
    "Feature": X_train.columns,
    "Importance": model.feature_importances_
}).sort_values("Importance", ascending=False)

importance.to_csv(
    "results/lightgbm/feature_importance.csv",
    index=False
)

plt.figure(figsize=(9, 6))
sns.barplot(
    data=importance,
    x="Importance",
    y="Feature"
)
plt.title("LightGBM Feature Importance - Boruta Features")
plt.tight_layout()
plt.savefig(
    "results/lightgbm/feature_importance.png",
    dpi=300
)
plt.close()

# Save model and preprocessing information
joblib.dump(
    {
        "model": model,
        "features": BORUTA_FEATURES,
        "medians": medians,
        "class_names": CLASS_NAMES,
        "label_map": label_map
    },
    "results/lightgbm/lightgbm_boruta_model.pkl"
)

print("\nBest iteration:", model.best_iteration_)
print("Results saved in results/lightgbm/")