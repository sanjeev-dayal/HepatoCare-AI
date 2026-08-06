import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
#Preprocessing

df = pd.read_csv("train.csv")  
df.drop(columns=["Patient_ID"], inplace=True)
print(df[df["Age"] < 0])

print(df[df["BMI"] < 0])

print(df[df["Albumin"] <= 0])
print(df["Alcohol_Consumption"].value_counts(dropna=False))
df["Alcohol_Consumption"] = df["Alcohol_Consumption"].fillna("Unknown") #Missing val is assumed as Unknown
#Hot Encoding

df = pd.get_dummies(
    df,
    columns=["Gender","Occupation"],
    drop_first=True
)
#Original Encoding
diet_map = {
    "Poor":0,
    "Average":1,
    "Healthy":2
}

df["Diet_Quality"] = df["Diet_Quality"].map(diet_map)

activity_map = {
    "Sedentary":0,
    "Low":1,
    "Moderate":2,
    "High":3
}

df["Physical_Activity"] = df["Physical_Activity"].map(activity_map)

obesity_map = {
    "Underweight":0,
    "Normal":1,
    "Overweight":2,
    "Obesity I":3,
    "Obesity II":4,
    "Obesity III":5
}

df["Obesity_Class"] = df["Obesity_Class"].map(obesity_map)

smoking_map = {
    "Never":0,
    "Former":1,
    "Current":2
}

df["Smoking_Status"] = df["Smoking_Status"].map(smoking_map)

alcohol_map = {
    "Unknown":0,
    "Low":1,
    "Moderate":2,
    "High":3
}

df["Alcohol_Consumption"] = df["Alcohol_Consumption"].map(alcohol_map)
#Target Encoding

target_map = {
    "Normal":0,
    "Fatty_Liver":1,
    "Alcoholic_Liver_Disease":2,
    "Cirrhosis":3,
    "Hepatitis_B":4,
    "Hepatitis_C":5
}

df["Liver_Disease_Type"] = df["Liver_Disease_Type"].map(target_map)

df.to_csv("cleaned_liver_dataset.csv", index=False)
print(df.isnull().sum()) #final Check
print(df.dtypes)
#Target Split

X = df.drop("Liver_Disease_Type", axis=1)
y = df["Liver_Disease_Type"]

#Feature Selections
plt.figure(figsize=(20,16))

sns.heatmap(
    X.corr(),
    cmap="coolwarm",
    center=0,
    square=True,
    linewidths=0.5,
    cbar_kws={"shrink": 0.8}
)

plt.title("Correlation Heatmap", fontsize=18)
plt.tight_layout()
plt.show()

corr = X.corr()

plt.figure(figsize=(18,15))
mask = np.abs(corr) < 0.5  # hide weak correlations

sns.heatmap(
    corr.mask(mask),
    cmap="coolwarm",
    annot=True,
    fmt=".2f"
)

plt.show()
corr_matrix = X.corr().abs()

upper = corr_matrix.where(np.triu(np.ones(corr_matrix.shape), k=1).astype(bool))

high_corr = []

for col in upper.columns:
    for row in upper.index:
        if upper.loc[row, col] > 0.90:
            high_corr.append((row, col, upper.loc[row, col]))

print(high_corr)

X = X.drop(columns=["Obesity_Class"])
#Boruta Feature Selection
from boruta import BorutaPy
from sklearn.ensemble import RandomForestClassifier

rf = RandomForestClassifier(
    n_estimators=500,
    random_state=42,
    class_weight="balanced",
    n_jobs=-1
)

boruta = BorutaPy(
    estimator=rf,
    n_estimators='auto',
    random_state=42,
    verbose=2
)

boruta.fit(X.values, y.values)
#Selcted Features 
selected_features = X.columns[boruta.support_]

print("Selected Features:\n")
print(selected_features)

#Rejected Features
rejected_features = X.columns[~boruta.support_]

print("\nRejected Features:\n")
print(rejected_features)

#Feature Ranking
import pandas as pd

ranking = pd.DataFrame({
    "Feature": X.columns,
    "Rank": boruta.ranking_,
    "Selected": boruta.support_
})

ranking = ranking.sort_values("Rank")

print(ranking)
ranking.to_csv("Boruta_Feature_Ranking.csv", index=False)
X_selected = X[selected_features]

print(X_selected.shape)

#SHAP
import shap
from xgboost import XGBClassifier

model = XGBClassifier(
    n_estimators=200,
    max_depth=6,
    random_state=42,
    tree_method="hist",
    eval_metric="mlogloss"
)

model.fit(X_selected, y)

X_sample = X_selected.sample(200, random_state=42)

explainer = shap.TreeExplainer(model)

shap_values = explainer.shap_values(X_sample)

shap.summary_plot(shap_values, X_sample)
print(type(shap_values))

if hasattr(shap_values, "shape"):
    print(shap_values.shape)
else:
    print(len(shap_values))
#Summary Plot
class_names = [
    "Normal",
    "Fatty Liver",
    "Alcoholic Liver Disease",
    "Cirrhosis",
    "Hepatitis B",
    "Hepatitis C"
]

for i, name in enumerate(class_names):
    print(f"\n{name}")

    shap.summary_plot(
        shap_values[:, :, i],
        X_sample,
        plot_type="dot",
        show=True
    )
#shap.plots.beeswarm(shap_values, max_display=10)
#BAR PLOT
shap.summary_plot(
    shap_values,
    X_sample,
    plot_type="bar"
)
#Final DS
final_df = X_selected.copy()
final_df["Liver_Disease_Type"] = y

final_df.to_csv("Final_Selected_Features.csv", index=False)