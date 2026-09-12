from fastapi import FastAPI
from prediction import router as prediction_router
from recommendation import recommend_classroom

app = FastAPI(
    title="SmartClassAI API",
    description="AI-Powered Classroom Utilization & Energy Optimizer",
    version="1.0.0"
)

app.include_router(prediction_router)


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
