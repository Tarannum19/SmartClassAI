import pandas as pd


def create_features(df):
    """Create useful ML features from classroom data."""

    df = df.copy()

    # Extract date-based features
    df["Year"] = df["Date"].dt.year
    df["Month"] = df["Date"].dt.month
    df["Day_Number"] = df["Date"].dt.day
    df["Day_of_Week"] = df["Date"].dt.dayofweek

    # Calculate occupancy ratio
    df["Occupancy_Ratio"] = (
        df["Total_Students"] / df["Room_Capacity"]
    )

    # Calculate total equipment usage hours
    df["Total_Equipment_Hours"] = (
        df["AC_Hours"]
        + df["Light_Hours"]
        + df["Fan_Hours"]
    )

    return df


def prepare_features(df):
    """Prepare final feature dataset."""
    df = create_features(df)

    return df