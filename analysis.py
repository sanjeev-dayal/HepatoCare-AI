import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns

df = pd.read_csv("train.csv")      

print("="*80)
print("DATASET SHAPE")
print("="*80)
print(df.shape)

print("\n\nCOLUMN NAMES")
print("="*80)
print(df.columns.tolist())

print("\n\nDATA TYPES")
print("="*80)
print(df.dtypes)

print("\n\nDATASET INFO")
print("="*80)
print(df.info())

print("\nFIRST 5 ROWS")
print(df.head())

print("\nLAST 5 ROWS")
print(df.tail())
print("\nMISSING VALUES")
print("="*80)

missing = df.isnull().sum()

missing = missing[missing > 0]

if len(missing) == 0:
    print("No Missing Values Found")
else:
    print(missing)
print("\nDUPLICATE ROWS")
print("="*80)
print(df.duplicated().sum())

print("\nSTATISTICAL SUMMARY")
print("="*80)
print(df.describe().T)

print("\nUNIQUE VALUES OF CATEGORICAL COLUMNS")
print("="*80)

categorical = df.select_dtypes(include=['object']).columns

for col in categorical:
    print("\n",col)
    print("-"*40)
    print(df[col].value_counts())


print("\nNUMBER OF UNIQUE VALUES")
print("="*80)

for col in df.columns:
    print(f"{col:30} : {df[col].nunique()}")

print("\nTARGET DISTRIBUTION")
print("="*80)

print(df["Liver_Disease_Type"].value_counts())

print("\nTARGET PERCENTAGE")
print("="*80)

print(round(df["Liver_Disease_Type"].value_counts(normalize=True)*100,2))

numeric = df.select_dtypes(include=np.number)

plt.figure(figsize=(16,12))
sns.heatmap(numeric.corr(),
            cmap='coolwarm',
            annot=False)

plt.title("Correlation Heatmap")
plt.show()

num_cols = numeric.columns

for col in num_cols:

    plt.figure(figsize=(6,2))
    sns.boxplot(x=df[col])
    plt.title(col)
    plt.show()

numeric.hist(figsize=(18,15), bins=30)
plt.tight_layout()
plt.show()

plt.figure(figsize=(8,5))

sns.countplot(data=df,
              x="Liver_Disease_Type")

plt.xticks(rotation=45)
plt.title("Target Distribution")
plt.show()


for col in categorical:

    plt.figure(figsize=(8,4))

    sns.countplot(data=df,
                  x=col)

    plt.xticks(rotation=45)

    plt.title(col)

    plt.show()

print("\nEDA COMPLETED SUCCESSFULLY")