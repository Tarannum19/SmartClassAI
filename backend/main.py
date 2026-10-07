import os

import pandas as pd

from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware

from auth import router as auth_router
from prediction import router as prediction_router
from recommendation import recommend_classroom
from classrooms import router as classrooms_router
from upload import router as upload_router


# ============================================================
# SMARTCLASSAI - MAIN BACKEND
# ============================================================

app = FastAPI(
    title="SmartClassAI API",
    description="AI-Powered Classroom Utilization & Energy Optimizer",
    version="1.0.0",
)

# ============================================================
# CORS
# ============================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        # Local frontend
        "http://localhost:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174",

        # Live Vercel frontend
        "https://smart-class-ai.vercel.app",
        "https://smart-class-ai-69lb.vercel.app",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================
# PROJECT PATHS
# ============================================================

BASE_DIR = os.path.dirname(
    os.path.dirname(
        os.path.abspath(__file__)
    )
)

DATA_DIR = os.path.join(
    BASE_DIR,
    "data"
)

DEFAULT_DATASET_PATH = os.path.join(
    DATA_DIR,
    "classroom_data.csv"
)

UPLOAD_DIR = os.path.join(
    DATA_DIR,
    "uploads"
)

ACTIVE_DATASET_PATH = os.path.join(
    UPLOAD_DIR,
    "active_classroom_data.csv"
)


# ============================================================
# DATASET HELPER
# ============================================================

def get_active_dataset():
    """
    Return the currently active classroom dataset.

    Uploaded dataset is preferred.
    Default demo dataset is used as fallback.
    """

    if os.path.exists(ACTIVE_DATASET_PATH):
        return pd.read_csv(
            ACTIVE_DATASET_PATH
        )

    if os.path.exists(DEFAULT_DATASET_PATH):
        return pd.read_csv(
            DEFAULT_DATASET_PATH
        )

    return pd.DataFrame()


# ============================================================
# ROOT
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
def health():
    return {
        "status": "healthy",
        "service": "SmartClassAI Backend"
    }


# ============================================================
# AUTHENTICATION
# ============================================================

app.include_router(
    auth_router
)


# ============================================================
# ML PREDICTION ROUTES
# ============================================================

app.include_router(
    prediction_router
)


# ============================================================
# CLASSROOM ROUTES
# ============================================================

app.include_router(
    classrooms_router
)


# ============================================================
# DATASET UPLOAD ROUTES
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
    """
    Recommend the most suitable classroom
    according to the active dataset.

    The selected classroom must have enough
    capacity for the required number of students.
    """

    dataframe = get_active_dataset()

    if dataframe.empty:
        return {
            "message": "No classroom dataset available."
        }

    classrooms = []

    for _, row in dataframe.iterrows():

        try:
            room_id = str(
                row["Room_ID"]
            )

            building = str(
                row["Building"]
            )

            capacity = int(
                row["Room_Capacity"]
            )

            utilization = float(
                row.get(
                    "Utilization_Percentage",
                    0
                )
            )

            classrooms.append(
                {
                    "Room_ID": room_id,
                    "Building": building,
                    "Room_Capacity": capacity,
                    "Utilization_Percentage": utilization,
                }
            )

        except (
            KeyError,
            ValueError,
            TypeError
        ):
            continue

    # Remove duplicate classrooms.
    unique_classrooms = {}

    for room in classrooms:

        room_id = room["Room_ID"]

        unique_classrooms[
            room_id
        ] = room

    classrooms = list(
        unique_classrooms.values()
    )

    if not classrooms:
        return {
            "message": "No classroom data available."
        }

    return recommend_classroom(
        required_students,
        classrooms
    )


# ============================================================
# APPLICATION STARTUP
# ============================================================

@app.on_event("startup")
def startup_event():

    print()
    print("=" * 60)
    print("SMARTCLASSAI BACKEND")
    print("=" * 60)
    print("Backend API: http://127.0.0.1:8000")
    print("Frontend: http://localhost:5173")
    print("Frontend: http://localhost:5174")
    print("Authentication: Enabled")
    print("ML Prediction: Enabled")
    print("Classroom Recommendation: Enabled")
    print("Dataset Upload: Enabled")
    print("=" * 60)
    print()