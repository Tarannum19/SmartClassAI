import os
import pandas as pd
from fastapi import APIRouter, HTTPException


# ============================================================
# CLASSROOM ROUTER
# ============================================================

router = APIRouter(
    prefix="/classrooms",
    tags=["Classrooms"]
)


# ============================================================
# PROJECT PATH
# ============================================================

BASE_DIR = os.path.dirname(
    os.path.dirname(
        os.path.abspath(__file__)
    )
)


# ============================================================
# DATASET PATHS
# ============================================================

ACTIVE_DATASET_PATH = os.path.join(
    BASE_DIR,
    "data",
    "uploads",
    "active_classroom_data.csv"
)

DEFAULT_DATASET_PATH = os.path.join(
    BASE_DIR,
    "data",
    "classroom_data.csv"
)


# ============================================================
# GET ACTIVE DATASET
# ============================================================

def get_dataset_path():

    # Use uploaded dataset first
    if os.path.exists(
        ACTIVE_DATASET_PATH
    ):
        return ACTIVE_DATASET_PATH

    # Otherwise use default dataset
    if os.path.exists(
        DEFAULT_DATASET_PATH
    ):
        return DEFAULT_DATASET_PATH

    return None


# ============================================================
# GET CLASSROOM DATA
# ============================================================

@router.get("/")
def get_classrooms():

    try:

        dataset_path = get_dataset_path()

        if dataset_path is None:

            raise HTTPException(
                status_code=500,
                detail="No classroom dataset found."
            )


        # ----------------------------------------------------
        # Read dataset
        # ----------------------------------------------------

        df = pd.read_csv(
            dataset_path
        )


        # ----------------------------------------------------
        # Check required columns
        # ----------------------------------------------------

        required_columns = [
            "Room_ID",
            "Building",
            "Room_Capacity",
            "Utilization_Percentage"
        ]


        missing_columns = [
            column
            for column in required_columns
            if column not in df.columns
        ]


        if missing_columns:

            raise HTTPException(
                status_code=500,
                detail={
                    "message": "Dataset is missing required columns.",
                    "missing_columns": missing_columns
                }
            )


        # ----------------------------------------------------
        # Prepare classroom information
        # ----------------------------------------------------

        classrooms = (
            df[
                [
                    "Room_ID",
                    "Building",
                    "Room_Capacity",
                    "Utilization_Percentage"
                ]
            ]
            .drop_duplicates(
                "Room_ID"
            )
            .sort_values(
                "Room_ID"
            )
        )


        # ----------------------------------------------------
        # Return data
        # ----------------------------------------------------

        return classrooms.to_dict(
            orient="records"
        )


    except HTTPException:

        raise


    except Exception as e:

        raise HTTPException(
            status_code=500,
            detail=f"Unable to load classroom data: {str(e)}"
        )