import csv
import pandas as pd
from django.core.exceptions import ValidationError
import numpy as np
from typing import List, Dict, Any
from .constants import COLUMN_RENAME_MAPPINGS


import csv

def handle_uploaded_file(file):
    # Read the first 1024 bytes of the file
    file_content = file.read(1024)
    
    # Decode the bytes to a string
    text_content = file_content.decode('utf-8', errors='ignore')  # Decode with UTF-8
    
    # Initialize dialect in case sniffing fails
    dialect = None
    
    # Try to detect the dialect using Sniffer
    sniffer = csv.Sniffer()
    try:
        dialect = sniffer.sniff(text_content)
        print(f"Detected dialect: {dialect}")
    except csv.Error as e:
        print(f"Could not detect CSV format: {e}")
    
    # Check if dialect was detected, otherwise handle error
    if dialect is None:
        print("CSV dialect detection failed.")
    return dialect

def validate_csv_file(file):
    """Check if the uploaded file is a valid CSV."""
    if not file.name.endswith('.csv'):
        raise ValidationError("The file is not a CSV.")
    try:
        # Try to read the first row to ensure it's a CSV file
        file.seek(0)  # Reset file pointer
        pd.read_csv(file, nrows=4)
        #csv.Sniffer().sniff(file.read(1024))
        file.seek(0)  # Reset file pointer again for further processing
    except csv.Error:
        raise ValidationError("The file is not a valid CSV.")


def clean_csv(file):
    # Read the CSV file without specifying the header initially
    df = pd.read_csv(file, header=None)

    for index, row in df.iterrows():
        if  row.isnull().sum() == 0: 
            header_row_index = index
            break
    
    file.seek(0)
    df_cleaned = pd.read_csv(file, header=header_row_index)
    
    # Drop any rows that have missing values in more than one column (incomplete rows)
    df_cleaned.dropna(how='all', inplace=True)  # Drop rows where all columns are NaN
    
    # Optionally, reset the index after cleaning
    df_cleaned.reset_index(drop=True, inplace=True)
    
    return df_cleaned

def get_csv_columns(file):
    """Extract column names from the CSV file and store the data in session."""
    file.seek(0)
    cleaned_df = clean_csv(file)
    
    # Convert DataFrame to JSON for session storage
    json_data = cleaned_df.to_json()
    
    return cleaned_df.columns.tolist(), json_data

def process_csv_columns(file_data: str, selected_columns: List[str]) -> Dict[str, Any]:
    """Process selected columns from the CSV file and return analysis results."""
    # Convert the stored JSON string back to DataFrame
    rename_columns = COLUMN_RENAME_MAPPINGS
    new_columns =list(rename_columns.values())
    df = pd.read_json(file_data)
    
    # Ensure all selected columns exist in the DataFrame
    if not all(col in df.columns for col in selected_columns):
        raise ValueError("One or more selected columns not found in the CSV file")
    
    # Filter DataFrame to include only selected columns
    df_selected = df[selected_columns]
    # rename columns to english  characters
    df_selected = df_selected.rename(columns=rename_columns)
    spend_per_category = df_selected.groupby('category')['value'].sum()
    results = {}
    for column in new_columns:
        column_data = df_selected[column]
        column_type = str(column_data.dtype)
        
        # Initialize column results
        column_results = {
            "type": column_type,
            "missing_values": int(column_data.isna().sum()),
            "total_rows": len(column_data)
        }
        
        # Numeric column analysis
        if np.issubdtype(column_data.dtype, np.number):
            column_results.update({
                "min": float(column_data.min()) if not pd.isna(column_data.min()) else None,
                "max": float(column_data.max()) if not pd.isna(column_data.max()) else None,
                "mean": float(column_data.mean()) if not pd.isna(column_data.mean()) else None,
                "median": float(column_data.median()) if not pd.isna(column_data.median()) else None,
                "std_dev": float(column_data.std()) if not pd.isna(column_data.std()) else None
            })
        
        # Categorical/Text column analysis
        else:
            value_counts = column_data.value_counts().head(5).to_dict()
            column_results.update({
                "unique_values": int(column_data.nunique()),
                "top_5_values": {str(k): int(v) for k, v in value_counts.items()}
            })
        
        results[column] = column_results
    
    return spend_per_category.to_dict()
    return results