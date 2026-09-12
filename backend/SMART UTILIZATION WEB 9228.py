from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from prediction import router as prediction_router
from recommendation import recommend_classroom


app = FastAPI(
    title="SmartClassAI API",
    description="AI-Powered Classroom Utilization & Energy Optimizer",
    version="1.0.0"
)


# Allow React frontend to communicate with FastAPI
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


# Include ML prediction routes
app.include_router(prediction_router)
app.include_router(classrooms_router)


@app.get("/")
def home():
    return {
        "message": "SmartClassAI Backend is Running!"
    }


@app.get("/health")
def health_check():
    return {
        "status": "healthy"
    }


@app.post("/recommend/classroom")
def classroom_recommendation(required_students: int):

    classrooms = [
        {"Room_ID": "R101", "Room_Capacity": 30},
        {"Room_ID": "R102", "Room_Capacity": 40},
        {"Room_ID": "R103", "Room_Capacity": 50},
        {"Room_ID": "R104", "Room_Capacity": 60},
        {"Room_ID": "R105", "Room_Capacity": 80},
        {"Room_ID": "R106", "Room_Capacity": 100}
    ]

    result = recommend_classroom(
        required_students,
        classrooms
    )

    return result