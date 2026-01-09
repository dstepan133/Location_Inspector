import pandas as pd
import os

files = [f for f in os.listdir('.') if f.endswith('.xlsx')]
if not files:
    print("No Excel file found")
    exit(1)

file_path = files[0]
print(f"Reading {file_path}...")

try:
    df = pd.read_excel(file_path, nrows=5)
    print("\nColumns:")
    for col in df.columns:
        print(f"- {col}")
    
    print("\nFirst row sample:")
    print(df.iloc[0].to_dict())
except Exception as e:
    print(f"Error reading file: {e}")
