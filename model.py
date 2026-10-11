
from pathlib import Path
import copy
import json
import random

import numpy as np
import pandas as pd
import torch
import torch.nn as nn

from torch.utils.data import DataLoader, TensorDataset
from sklearn.model_selection import train_test_split
from sklearn.impute import SimpleImputer
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import (
    accuracy_score,
    balanced_accuracy_score,
    f1_score,
    classification_report,
    confusion_matrix
)
from sklearn.utils.class_weight import compute_class_weight


BASE_DIR = Path(__file__).resolve().parent
RESULTS_DIR = BASE_DIR / "results"
RESULTS_DIR.mkdir(exist_ok=True)

SEED = 42
BATCH_SIZE = 256
EPOCHS = 100
PATIENCE = 12
LEARNING_RATE = 3e-4
D_MODEL = 64
NUM_HEADS = 4
NUM_LAYERS = 3
DROPOUT = 0.2

TARGET = "Liver_Disease_Type"

TARGET_MAP = {
    "Normal": 0,
    "Fatty_Liver": 1,
    "Alcoholic_Liver_Disease": 2,
    "Cirrhosis": 3,
    "Hepatitis_B": 4,
    "Hepatitis_C": 5
}

CLASS_NAMES = [
    "Normal",
    "Fatty Liver",
    "Alcoholic Liver Disease",
    "Cirrhosis",
    "Hepatitis B",
    "Hepatitis C"
]

random.seed(SEED)
np.random.seed(SEED)
torch.manual_seed(SEED)

if torch.cuda.is_available():
    torch.cuda.manual_seed_all(SEED)

DEVICE = torch.device(
    "cuda" if torch.cuda.is_available() else "cpu"
)

print("Device:", DEVICE)

if DEVICE.type == "cuda":
    print("GPU:", torch.cuda.get_device_name(0))
    torch.backends.cudnn.benchmark = True


def prepare_features(df):
    df = df.copy()
    df.drop(columns=["Patient_ID"], errors="ignore", inplace=True)

    y = df[TARGET].map(TARGET_MAP)

    if y.isna().any():
        invalid = df.loc[y.isna(), TARGET].unique()
        raise ValueError(f"Unknown target labels: {invalid}")

    y = y.astype(int)
    X = df.drop(columns=[TARGET])

    categorical_columns = X.select_dtypes(
        include=["object", "category", "bool"]
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


class FTTransformer(nn.Module):
    def __init__(
        self,
        n_features,
        d_model=64,
        num_heads=4,
        num_layers=3,
        dropout=0.15,
        num_classes=6
    ):
        super().__init__()

        self.feature_weight = nn.Parameter(
            torch.randn(n_features, d_model) * 0.02
        )

        self.feature_bias = nn.Parameter(
            torch.zeros(n_features, d_model)
        )

        self.cls_token = nn.Parameter(
            torch.zeros(1, 1, d_model)
        )

        encoder_layer = nn.TransformerEncoderLayer(
            d_model=d_model,
            nhead=num_heads,
            dim_feedforward=d_model * 4,
            dropout=dropout,
            activation="gelu",
            batch_first=True,
            norm_first=True
        )

        self.transformer = nn.TransformerEncoder(
            encoder_layer,
            num_layers=num_layers,
            enable_nested_tensor=False
        )

        self.norm = nn.LayerNorm(d_model)

        self.head = nn.Sequential(
            nn.Linear(d_model, d_model),
            nn.GELU(),
            nn.Dropout(dropout),
            nn.Linear(d_model, num_classes)
        )

    def forward(self, x):
        # Each numeric feature becomes a learned token.
        tokens = (
            x.unsqueeze(-1) * self.feature_weight.unsqueeze(0)
            + self.feature_bias.unsqueeze(0)
        )

        cls = self.cls_token.expand(x.size(0), -1, -1)

        tokens = torch.cat([cls, tokens], dim=1)

        encoded = self.transformer(tokens)

        representation = self.norm(encoded[:, 0])

        return self.head(representation)


def make_loader(X, y, shuffle=False):
    dataset = TensorDataset(
        torch.tensor(X, dtype=torch.float32),
        torch.tensor(y, dtype=torch.long)
    )

    return DataLoader(
        dataset,
        batch_size=BATCH_SIZE,
        shuffle=shuffle,
        num_workers=0,
        pin_memory=(DEVICE.type == "cuda")
    )


def predict(model, loader):
    model.eval()

    all_predictions = []
    all_targets = []

    with torch.no_grad():
        for xb, yb in loader:
            xb = xb.to(DEVICE, non_blocking=True)
            logits = model(xb)

            all_predictions.extend(
                logits.argmax(dim=1).cpu().numpy()
            )
            all_targets.extend(yb.numpy())

    return np.asarray(all_targets), np.asarray(all_predictions)

def main():
    data_path = BASE_DIR / "train.csv"

    if not data_path.exists():
        raise FileNotFoundError(f"Missing dataset: {data_path}")

    df = pd.read_csv(data_path)
    X, y = prepare_features(df)

    USE_ALL_FEATURES = True

    if USE_ALL_FEATURES:
        selected_features = X.columns.tolist()
        print("\nEXPERIMENT: Using ALL available features")
    else:
        selected_path = (
            RESULTS_DIR / "selected_features_train_only.csv"
        )

        if not selected_path.exists():
            raise FileNotFoundError(
                "Missing selected_features_train_only.csv. "
                "Run evaluation_pipeline.py first."
            )

        selected_features = pd.read_csv(
            selected_path
        )["Feature"].tolist()

        missing = [
            col for col in selected_features if col not in X.columns
        ]

        if missing:
            raise ValueError(
                f"Selected features missing after preprocessing: {missing}"
            )

        print("\nEXPERIMENT: Using Boruta-selected features")

    X = X[selected_features]

    print("Number of input features:", len(selected_features))
    print("Features:", selected_features)

    # 70% train, 15% validation, 15% test.
    X_train, X_temp, y_train, y_temp = train_test_split(
        X,
        y,
        test_size=0.30,
        random_state=SEED,
        stratify=y
    )

    X_val, X_test, y_val, y_test = train_test_split(
        X_temp,
        y_temp,
        test_size=0.50,
        random_state=SEED,
        stratify=y_temp
    )
    print("Train/validation overlap:",
      len(set(X_train.index) & set(X_val.index)))

    print("Train/test overlap:",
      len(set(X_train.index) & set(X_test.index)))

    print("Validation/test overlap:",
      len(set(X_val.index) & set(X_test.index)))

    print("Validation size:", len(y_val))
    print("Test size:", len(y_test))
    
    # Learn imputation values from training data only.
    imputer = SimpleImputer(strategy="median")

    X_train = imputer.fit_transform(X_train)
    X_val = imputer.transform(X_val)
    X_test = imputer.transform(X_test)

    scaler = StandardScaler()

    X_train = scaler.fit_transform(X_train).astype(np.float32)
    X_val = scaler.transform(X_val).astype(np.float32)
    X_test = scaler.transform(X_test).astype(np.float32)

    train_loader = make_loader(
        X_train, y_train.to_numpy(), shuffle=True
    )

    val_loader = make_loader(
        X_val, y_val.to_numpy()
    )

    test_loader = make_loader(
        X_test, y_test.to_numpy()
    )

    classes = np.unique(y_train)

    weights = compute_class_weight(
        class_weight="balanced",
        classes=classes,
        y=y_train.to_numpy()
    )

    class_multipliers = np.array(
    [1.0, 1.0, 1.0, 1.0, 1.15, 1.1],
    dtype=np.float32
    )

    weights = weights * class_multipliers

    class_weights = torch.tensor(
        weights, dtype=torch.float32, device=DEVICE
    )

    print("Class weights:", class_weights.cpu().numpy())

    model = FTTransformer(
        n_features=len(selected_features),
        d_model=D_MODEL,
        num_heads=NUM_HEADS,
        num_layers=NUM_LAYERS,
        dropout=DROPOUT,
        num_classes=len(CLASS_NAMES)
    ).to(DEVICE)

    criterion = nn.CrossEntropyLoss(
        weight=class_weights
    )

    optimizer = torch.optim.AdamW(
        model.parameters(),
        lr=LEARNING_RATE,
        weight_decay=1e-4
    )

    scheduler = torch.optim.lr_scheduler.ReduceLROnPlateau(
        optimizer,
        mode="min",
        factor=0.5,
        patience=3
    )

    best_val_loss = float("inf")
    best_state = None
    epochs_without_improvement = 0

    history = []

    print("\nTraining FT-Transformer...")
    print("Training rows:", len(X_train))
    print("Validation rows:", len(X_val))
    print("Test rows:", len(X_test))
    print("Features:", selected_features)

    for epoch in range(1, EPOCHS + 1):
        model.train()
        running_loss = 0.0
        total = 0

        for xb, yb in train_loader:
            xb = xb.to(DEVICE, non_blocking=True)
            yb = yb.to(DEVICE, non_blocking=True)

            optimizer.zero_grad(set_to_none=True)

            logits = model(xb)
            loss = criterion(logits, yb)

            loss.backward()

            nn.utils.clip_grad_norm_(
                model.parameters(), max_norm=1.0
            )

            optimizer.step()

            running_loss += loss.item() * xb.size(0)
            total += xb.size(0)

        train_loss = running_loss / total

        model.eval()
        val_loss_total = 0.0
        val_count = 0

        with torch.no_grad():
            for xb, yb in val_loader:
                xb = xb.to(DEVICE, non_blocking=True)
                yb = yb.to(DEVICE, non_blocking=True)

                logits = model(xb)
                loss = criterion(logits, yb)

                val_loss_total += loss.item() * xb.size(0)
                val_count += xb.size(0)

        val_loss = val_loss_total / val_count
        scheduler.step(val_loss)

        history.append({
            "epoch": epoch,
            "train_loss": train_loss,
            "validation_loss": val_loss,
            "learning_rate": optimizer.param_groups[0]["lr"]
        })

        print(
            f"Epoch {epoch:03d}/{EPOCHS} | "
            f"Train loss: {train_loss:.4f} | "
            f"Val loss: {val_loss:.4f}"
        )

        if val_loss < best_val_loss:
            best_val_loss = val_loss
            best_state = copy.deepcopy(model.state_dict())
            epochs_without_improvement = 0
        else:
            epochs_without_improvement += 1

        if epochs_without_improvement >= PATIENCE:
            print("Early stopping.")
            break

    if best_state is None:
        raise RuntimeError("Training did not produce a model.")

    model.load_state_dict(best_state)
    
    from sklearn.metrics import (
        classification_report,
        confusion_matrix,
        accuracy_score,
        balanced_accuracy_score,
        f1_score
    )

    val_true, val_pred = predict(model, val_loader)

    val_report = classification_report(
        val_true,
        val_pred,
        labels=list(range(6)),
        target_names=CLASS_NAMES,
        output_dict=True,
        zero_division=0
    )

    pd.DataFrame(val_report).transpose().to_csv(
        RESULTS_DIR / "ft_transformer_validation_report.csv"
    )

    val_cm = confusion_matrix(
        val_true,
        val_pred,
        labels=list(range(6))
    )

    pd.DataFrame(
        val_cm,
        index=CLASS_NAMES,
        columns=CLASS_NAMES
    ).to_csv(
        RESULTS_DIR / "ft_transformer_validation_confusion_matrix.csv"
    )

    validation_summary = {
        "accuracy": float(accuracy_score(val_true, val_pred)),
        "balanced_accuracy": float(
            balanced_accuracy_score(val_true, val_pred)
        ),
        "macro_f1": float(
            f1_score(val_true, val_pred, average="macro")
        ),
        "weighted_f1": float(
            f1_score(val_true, val_pred, average="weighted")
        )
    }

    print("\nFT-Transformer Validation Results")
    print(classification_report(
        val_true,
        val_pred,
        labels=list(range(6)),
        target_names=CLASS_NAMES,
        zero_division=0
    ))

    print("\nValidation summary:")
    print(json.dumps(validation_summary, indent=4))

    pd.DataFrame(history).to_csv(
        RESULTS_DIR / "ft_transformer_training_history.csv",
        index=False
    )

    # Evaluate the test set only after model selection.
    y_true, y_pred = predict(model, test_loader)

    report = classification_report(
        y_true,
        y_pred,
        labels=list(range(6)),
        target_names=CLASS_NAMES,
        output_dict=True,
        zero_division=0
    )

    pd.DataFrame(report).transpose().to_csv(
        RESULTS_DIR / "ft_transformer_test_report.csv"
    )

    pd.DataFrame(
        confusion_matrix(
            y_true, y_pred, labels=list(range(6))
        ),
        index=CLASS_NAMES,
        columns=CLASS_NAMES
    ).to_csv(
        RESULTS_DIR / "ft_transformer_confusion_matrix.csv"
    )

    summary = {
        "model": "FT-Transformer",
        "device": str(DEVICE),
        "gpu": (
            torch.cuda.get_device_name(0)
            if DEVICE.type == "cuda"
            else None
        ),
        "selected_features": selected_features,
        "best_validation_loss": float(best_val_loss),
        "epochs_trained": len(history),
        "test_accuracy": float(
            accuracy_score(y_true, y_pred)
        ),
        "test_balanced_accuracy": float(
            balanced_accuracy_score(y_true, y_pred)
        ),
        "test_macro_f1": float(
            f1_score(y_true, y_pred, average="macro")
        ),
        "test_weighted_f1": float(
            f1_score(y_true, y_pred, average="weighted")
        )
    }

    torch.save(
        {
            "model_state_dict": model.state_dict(),
            "n_features": len(selected_features),
            "selected_features": selected_features,
            "d_model": D_MODEL,
            "num_heads": NUM_HEADS,
            "num_layers": NUM_LAYERS,
            "dropout": DROPOUT,
            "num_classes": len(CLASS_NAMES),
            "class_names": CLASS_NAMES,
            "imputer_statistics": imputer.statistics_.tolist(),
            "scaler_mean": scaler.mean_.tolist(),
            "scaler_scale": scaler.scale_.tolist(),
        },
        RESULTS_DIR / "ft_transformer_model.pth"
    )

    with open(
        RESULTS_DIR / "ft_transformer_summary.json",
        "w",
        encoding="utf-8"
    ) as file:
        json.dump(summary, file, indent=4)

    print("\nFinal test report:")
    print(classification_report(
        y_true,
        y_pred,
        labels=list(range(6)),
        target_names=CLASS_NAMES,
        zero_division=0
    ))

    print("\nSummary:")
    print(json.dumps(summary, indent=4))

    print("\nSaved results to:", RESULTS_DIR)


if __name__ == "__main__":
    main()