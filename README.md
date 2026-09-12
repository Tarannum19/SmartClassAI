# SmartClassAI
## AI-Powered Classroom Utilization & Energy Optimizer

SmartClassAI is a web-based Data Science and Machine Learning project designed to help educational institutions analyze classroom utilization, predict classroom occupancy, estimate energy consumption, recommend suitable classrooms, and identify opportunities for energy optimization.

The system uses historical classroom data and trained Machine Learning models to provide intelligent, capacity-aware recommendations and energy-saving insights.

---

## Project Objectives

- Analyze classroom utilization patterns.
- Predict classroom occupancy using Machine Learning.
- Predict classroom energy consumption.
- Recommend suitable classrooms based on student requirements and room capacity.
- Optimize equipment operating hours to reduce unnecessary energy consumption.
- Provide useful analytics and AI-generated insights through a web dashboard.
- Allow classroom datasets to be uploaded and validated.

---

## Main Features

### 1. Dashboard
Provides an overall view of classroom utilization.

It displays:
- Total classrooms
- Average utilization
- Highly utilized classrooms
- Underutilized classrooms
- Top utilized rooms
- AI classroom recommendations

### 2. Classroom Management
Allows users to:
- View classroom information
- Search classrooms
- Filter classrooms by building
- View room capacity and utilization
- Get AI-based classroom recommendations

### 3. Occupancy Prediction
The system predicts expected classroom occupancy using the trained XGBoost Machine Learning model.

### 4. Energy Prediction
The system estimates classroom energy consumption using the trained Linear Regression model.

### 5. AI Energy Optimization
The optimizer compares estimated current energy consumption with an optimized configuration.

It provides:
- Current energy consumption
- Optimized energy consumption
- Estimated energy saving
- Saving percentage
- Recommended AC operating hours
- Recommended lighting hours
- Recommended fan hours

### 6. Analytics
Provides:
- ML model performance
- Occupancy model comparison
- Energy model comparison
- Dataset overview
- AI insights

### 7. Data Management
Allows users to:
- Upload classroom CSV datasets
- Validate dataset structure
- Check record and column counts
- Activate a valid classroom dataset

### 8. Reports
Provides a summary of:
- Classroom utilization
- Number of classrooms
- ML model performance
- Occupancy prediction performance
- Energy prediction performance
- AI insights

### 9. Settings
Displays system information including:
- Backend API status
- Frontend status
- Occupancy model
- Energy model
- Dataset/database status

### 10. Help
Provides information about using the SmartClassAI system.

---

## Machine Learning Models

### Occupancy Prediction

**Model:** XGBoost Regressor

Performance:

- MAE: approximately 7.257
- RMSE: approximately 10.169
- R² Score: approximately 0.803

The model predicts classroom occupancy/utilization based on classroom and scheduling-related features.

### Energy Prediction

**Model:** Linear Regression

Performance:

- MAE: approximately 0.407
- RMSE: approximately 0.511
- R² Score: approximately 0.936

The model estimates classroom energy consumption based on classroom usage and equipment-related features.

---

## Dataset

SmartClassAI uses classroom-related historical data.

The generated dataset contains **5,000 records and 22 columns**.

Important fields include:

- Date
- Time_Slot
- Room_ID
- Building
- Room_Capacity
- Class_ID
- Subject
- Faculty_ID
- Day
- Total_Students
- Class_Duration
- Holiday
- College_Event
- Attendance_Percentage
- Attendance_Count
- Previous_Occupancy
- Computer_Count
- AC_Hours
- Light_Hours
- Fan_Hours
- Energy_Consumption_kWh
- Utilization_Percentage

Dataset validation ensures that:

- Total students do not exceed room capacity.
- Attendance count does not exceed total students.
- Utilization percentage remains between 0% and 100%.

---

## Classroom Recommendation

The classroom recommendation system selects a suitable classroom according to the number of students entered.

The system considers:

- Required number of students
- Classroom capacity
- Expected utilization

The expected utilization is calculated as:

`Expected Utilization = (Required Students / Room Capacity) × 100`

The system avoids recommending a classroom when the required number of students exceeds its capacity.

Example:

For **36 students**, the system recommends:

- Room: CR-03
- Capacity: 40
- Expected Utilization: 90%

---

## Energy Optimization

SmartClassAI uses occupancy information to identify opportunities for reducing unnecessary equipment operating time.

When classroom occupancy is lower, the system can recommend reduced:

- AC hours
- Lighting hours
- Fan hours

Example tested result:

- Occupancy: 75%
- Current Energy: 18.80 kWh
- Optimized Energy: 15.22 kWh
- Estimated Saving: 3.58 kWh
- Saving Percentage: 19%

For very high occupancy, the system avoids aggressive reduction because classroom requirements are higher.

---

## Technology Stack

### Frontend

- React
- Vite
- JavaScript
- HTML
- CSS

### Backend

- Python
- FastAPI
- Uvicorn

### Data Science & Machine Learning

- Python
- Pandas
- NumPy
- Scikit-learn
- XGBoost
- Joblib

### Dataset

- CSV

---

## Project Structure

```text
SMARTCLASSAI
│
├── backend
│   ├── main.py
│   ├── prediction.py
│   ├── recommendation.py
│   ├── classrooms.py
│   └── upload.py
│
├── data
│   └── classroom_data.csv
│
├── frontend
│   └── React + Vite application
│
├── models
│   └── trained Machine Learning models
│
├── notebooks
│   └── dataset generation and ML-related files
│
├── reports
│   └── project reports and outputs
│
├── venv
│   └── Python virtual environment
│
├── check_libraries.py
├── requirements.txt
└── README.md

## Conclusion

SmartClassAI is an AI-powered classroom management system designed to improve classroom utilization and energy efficiency. It uses Machine Learning models to predict classroom occupancy and energy consumption, recommend suitable classrooms, and provide intelligent energy optimization suggestions.

The system combines Data Science, Machine Learning, and Web Development to provide a practical solution for better classroom planning and resource management. It can help colleges reduce classroom underutilization and unnecessary energy consumption while making better use of available classrooms.