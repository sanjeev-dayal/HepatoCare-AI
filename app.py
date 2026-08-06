# Legacy Streamlit UI — use the React frontend instead:
#   Backend:  uvicorn api:app --reload --port 8000
#   Frontend: cd frontend && npm install && npm run dev
import streamlit as st
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import LabelEncoder
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, confusion_matrix

st.set_page_config(page_title="Liver Disease Analysis", layout="wide")

@st.cache_data
def load_raw_data():
    return pd.read_csv("train.csv")

@st.cache_data
def load_cleaned_data():
    return pd.read_csv("cleaned_liver_dataset.csv")

@st.cache_data
def load_boruta_ranking():
    return pd.read_csv("Boruta_Feature_Ranking.csv")

@st.cache_data
def load_final_selected():
    return pd.read_csv("Final_Selected_Features.csv")

@st.cache_data
def build_classifier():
    df = load_final_selected()
    X = df.drop("Liver_Disease_Type", axis=1)
    y = df["Liver_Disease_Type"]
    clf = RandomForestClassifier(n_estimators=300, random_state=42, class_weight="balanced")
    clf.fit(X, y)
    return clf

@st.cache_data
def get_label_map():
    return {
        0: "Normal",
        1: "Fatty Liver",
        2: "Alcoholic Liver Disease",
        3: "Cirrhosis",
        4: "Hepatitis B",
        5: "Hepatitis C"
    }

st.title("Liver Disease Data Explorer")

tabs = st.tabs(["Overview", "EDA", "Feature Selection", "Model Demo"])

with tabs[0]:
    st.header("Dataset Overview")
    raw = load_raw_data()
    cleaned = load_cleaned_data()
    st.markdown("**Raw dataset shape:** {} rows, {} columns".format(*raw.shape))
    st.markdown("**Cleaned dataset shape:** {} rows, {} columns".format(*cleaned.shape))
    st.write("### Raw data sample")
    st.dataframe(raw.head(10))
    st.write("### Data types")
    st.dataframe(raw.dtypes.to_frame("dtype"))
    st.write("### Missing values in raw data")
    missing = raw.isnull().sum()
    st.dataframe(missing[missing > 0].to_frame("missing_count"))
    st.write("### Target distribution")
    target_counts = raw["Liver_Disease_Type"].value_counts()
    st.bar_chart(target_counts)

with tabs[1]:
    st.header("Exploratory Data Analysis")
    df = raw.copy()
    numeric = df.select_dtypes(include=[np.number])
    st.write("### Correlation matrix")
    corr = numeric.corr()
    fig, ax = plt.subplots(figsize=(12, 10))
    sns.heatmap(corr, cmap="coolwarm", center=0, ax=ax)
    st.pyplot(fig)

    st.write("### Numeric distributions")
    selected_numeric = ["Age", "BMI", "Sleep_Hours", "ALT", "AST", "Bilirubin", "Albumin", "Platelets", "Alk_Phosphatase"]
    fig, axes = plt.subplots(3, 3, figsize=(18, 12))
    axes = axes.flatten()
    for i, col in enumerate(selected_numeric):
        sns.histplot(df[col].dropna(), kde=True, ax=axes[i], color="#2c3e50")
        axes[i].set_title(col)
    st.pyplot(fig)

    st.write("### Categorical counts")
    cat_cols = ["Gender", "Occupation", "Diet_Quality", "Physical_Activity", "Smoking_Status", "Alcohol_Consumption", "Liver_Disease_Type"]
    for col in cat_cols:
        st.write(f"#### {col}")
        counts = df[col].value_counts()
        st.bar_chart(counts)

with tabs[2]:
    st.header("Feature Selection")
    ranking = load_boruta_ranking()
    st.write("### Boruta feature ranking")
    st.dataframe(ranking)
    st.write("### Selected vs rejected features")
    selected = ranking[ranking["Selected"] == True]["Feature"].tolist()
    rejected = ranking[ranking["Selected"] == False]["Feature"].tolist()
    st.write("**Selected features:**")
    st.write(selected)
    st.write("**Rejected features:**")
    st.write(rejected)

    st.write("### Selected feature statistics")
    selected_data = load_final_selected()
    st.dataframe(selected_data.describe().T)

with tabs[3]:
    st.header("Prediction Demo")
    st.write("Use the selected features to predict liver disease type.")
    selected_data = load_final_selected()
    input_data = {}
    for feature in selected_data.drop("Liver_Disease_Type", axis=1).columns:
        if feature.startswith("Sym_") or feature.startswith("Comorb_"):
            input_data[feature] = st.selectbox(feature.replace("_", " "), [0, 1])
        else:
            min_val = float(selected_data[feature].min())
            max_val = float(selected_data[feature].max())
            step = (max_val - min_val) / 100 if max_val > min_val else 1.0
            input_data[feature] = st.number_input(feature.replace("_", " "), min_value=min_val, max_value=max_val, value=float(selected_data[feature].median()), step=step)

    if st.button("Predict Disease Type"):
        model = build_classifier()
        sample = pd.DataFrame([input_data])
        prediction = model.predict(sample)[0]
        label = get_label_map()[prediction]
        st.success(f"Predicted disease type: {label}")
        st.write("Feature values used for prediction")
        st.json(input_data)

    st.write("### Example model quality")
    df = selected_data.copy()
    X = df.drop("Liver_Disease_Type", axis=1)
    y = df["Liver_Disease_Type"]
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.25, random_state=42, stratify=y)
    model = RandomForestClassifier(n_estimators=300, random_state=42, class_weight="balanced")
    model.fit(X_train, y_train)
    y_pred = model.predict(X_test)
    report = classification_report(y_test, y_pred, output_dict=True)
    report_df = pd.DataFrame(report).transpose()
    st.write(report_df)
    cm = confusion_matrix(y_test, y_pred)
    fig, ax = plt.subplots(figsize=(8, 6))
    sns.heatmap(cm, annot=True, fmt="d", cmap="Blues", ax=ax)
    ax.set_xlabel("Predicted")
    ax.set_ylabel("Actual")
    st.pyplot(fig)

st.write("---")
st.write("Built with Streamlit to explore the liver disease dataset, feature ranking, and a demo classifier.")