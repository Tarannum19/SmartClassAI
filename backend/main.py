import os

import pandas as pd

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware

from backend.prediction import router as prediction_router
from backend.recommendation import recommend_classroom
from backend.classrooms import router as classrooms_router
from backend.upload import router as upload_router


# ============================================================
# SMARTCLASSAI BACKEND
# ============================================================

app = FastAPI(
    title="SmartClassAI Backend",
    description="AI-Powered Classroom Utilization & Energy Optimizer",
    version="1.0.0"
)


# ============================================================
# CORS
# ============================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
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

    if os.path.exists(
        ACTIVE_DATASET_PATH
    ):
        return ACTIVE_DATASET_PATH

    if os.path.exists(
        DEFAULT_DATASET_PATH
    ):
        return DEFAULT_DATASET_PATH

    return None


# ============================================================
# HOME
# ============================================================

@app.get("/")
def root():

    return {
        "message": "SmartClassAI Backend is Running!"
    }


# ============================================================
# HEALTH CHECK
# ============================================================

@app.get("/health")
def health_check():

    dataset_path = get_dataset_path()

    return {
        "status": "healthy",
        "dataset_available": dataset_path is not None,
        "dataset_path": dataset_path
    }


# ============================================================
# INCLUDE ML PREDICTION ROUTER
# ============================================================

app.include_router(
    prediction_router
)


# ============================================================
# INCLUDE CLASSROOM ROUTER
# ============================================================

app.include_router(
    classrooms_router
)


# ============================================================
# INCLUDE DATASET UPLOAD ROUTER
# ============================================================

app.include_router(
    upload_router
)


# ============================================================
# CLASSROOM RECOMMENDATION
# ============================================================

@app.post("/recommend/classroom")
def classroom_recommendation(
    required_students: int = Query(
        ...,
        gt=0,
        description="Number of students who need a classroom"
    )
):

    try:

        # ----------------------------------------------------
        # Find active dataset
        # ----------------------------------------------------

        dataset_path = get_dataset_path()

        if dataset_path is None:

            raise HTTPException(
                status_code=500,
                detail="No classroom dataset found."
            )


        # ----------------------------------------------------
        # Load dataset
        # ----------------------------------------------------

        df = pd.read_csv(
            dataset_path
        )


        # ----------------------------------------------------
        # Check required columns
        # ----------------------------------------------------

        required_columns = [
            "Room_ID",
            "Room_Capacity"
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
                    "message":
                        "Dataset is missing required columns.",
                    "missing_columns":
                        missing_columns
                }
            )


        # ----------------------------------------------------
        # Prepare classroom list
        # ----------------------------------------------------

        classroom_columns = [
            "Room_ID",
            "Room_Capacity"
        ]

        if "Building" in df.columns:

            classroom_columns.insert(
                1,
                "Building"
            )


        classrooms_df = (
            df[classroom_columns]
            .drop_duplicates(
                "Room_ID"
            )
            .sort_values(
                "Room_ID"
            )
        )


        classrooms = (
            classrooms_df
            .to_dict(
                orient="records"
            )
        )


        # ----------------------------------------------------
        # Get recommendation
        # ----------------------------------------------------

        result = recommend_classroom(
            required_students,
            classrooms
        )


        # ----------------------------------------------------
        # Return result
        # ----------------------------------------------------

        return result


    except HTTPException:

        raise


    except Exception as e:

        raise HTTPException(
            status_code=500,
            detail=f"Unable to get classroom recommendation: {str(e)}"
        )