import pandas as pd


def load_data(file_path):
    """Load classroom dataset."""
    df = pd.read_csv(file_path)
    return df


def clean_data(df):
    """Clean and prepare classroom data."""

    # Remove duplicate records
    df = df.drop_duplicates()

    # Convert Date column
    df["Date"] = pd.to_datetime(df["Date"])

    # Handle missing values
    numeric_columns = df.select_dtypes(include=["number"]).columns

    for column in numeric_columns:
        df[column] = df[column].fillna(df[column].median())

    # Remove unnecessary spaces from text columns
    text_columns = df.select_dtypes(include=["object"]).columns

    for column in text_columns:
        df[column] = df[column].str.strip()

    return df


def prepare_data(file_path):
    """Load and clean the dataset."""
    df = load_data(file_path)
    df = clean_data(df)

    return df