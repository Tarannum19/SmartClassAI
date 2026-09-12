import os
import joblib
import pandas as pd
from fastapi import APIRouter

# Create API router
router = APIRouter(
    prefix="/predict",
    tags=["ML Predictions"]
)


# Define model paths
OCCUPANCY_MODEL_PATH = "models/occupancy_model.pkl"
ENERGY_MODEL_PATH = "models/energy_model.pkl"
OCCUPANCY_FEATURES_PATH = "models/occupancy_features.pkl"
ENERGY_FEATURES_PATH = "models/energy_features.pkl"


# Load trained models
occupancy_model = joblib.load(OCCUPANCY_MODEL_PATH)
energy_model = joblib.load(ENERGY_MODEL_PATH)

# Load feature names
occupancy_features = joblib.load(OCCUPANCY_FEATURES_PATH)
energy_features = joblib.load(ENERGY_FEATURES_PATH)


print("ML models loaded successfully!")
print("Occupancy model:", type(occupancy_model).__name__)
print("Energy model:", type(energy_model).__name__)

from pydantic import BaseModel


class OccupancyInput(BaseModel):
    Room_Capacity: int
    Class_Duration: float
    Attendance_Percentage: float
    Previous_Occupancy: float
    Computer_Count: int
    AC_Hours: float
    Light_Hours: float
    Fan_Hours: float
    Day_of_Week: int
    Month: int


class EnergyInput(BaseModel):
    Room_Capacity: int
    Total_Students: int
    Class_Duration: float
    Computer_Count: int
    AC_Hours: float
    Light_Hours: float
    Fan_Hours: float
    Day_of_Week: int
    Month: int



@router.post("/energy")
def predict_energy(data: EnergyInput):

    input_data = pd.DataFrame([{
        "Room_Capacity": data.Room_Capacity,
        "Total_Students": data.Total_Students,
        "Class_Duration": data.Class_Duration,
        "Computer_Count": data.Computer_Count,
        "AC_Hours": data.AC_Hours,
        "Light_Hours": data.Light_Hours,
        "Fan_Hours": data.Fan_Hours,
        "Day_of_Week": data.Day_of_Week,
        "Month": data.Month
    }])

    prediction = energy_model.predict(input_data)[0]

    return {
        "predicted_energy_kWh": round(float(prediction), 2)
    }


@router.post("/occupancy")
def predict_occupancy(data: OccupancyInput):

    input_data = pd.DataFrame([{
        "Room_Capacity": data.Room_Capacity,
        "Class_Duration": data.Class_Duration,
        "Attendance_Percentage": data.Attendance_Percentage,
        "Previous_Occupancy": data.Previous_Occupancy,
        "Computer_Count": data.Computer_Count,
        "AC_Hours": data.AC_Hours,
        "Light_Hours": data.Light_Hours,
        "Fan_Hours": data.Fan_Hours,
        "Day_of_Week": data.Day_of_Week,
        "Month": data.Month
    }])

    prediction = occupancy_model.predict(input_data)[0]

    return {
        "predicted_occupancy": round(float(prediction), 2)
    }