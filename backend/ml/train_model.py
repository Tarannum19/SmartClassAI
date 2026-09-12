import os
import joblib
import pandas as pd

from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.linear_model import LinearRegression
from sklearn.ensemble import RandomForestRegressor
from xgboost import XGBRegressor

from preprocessing import prepare_data
from features import prepare_features

# Load dataset
DATA_PATH = "../../data/classroom_data.csv"

df = prepare_data(DATA_PATH)
df = prepare_features(df)

print("Dataset loaded successfully!")
print("Shape:", df.shape)
print(df.head())

# Select features for occupancy prediction
features = [
    "Room_Capacity",

    "Class_Duration",
    "Attendance_Percentage",
    "Previous_Occupancy",
    "Computer_Count",
    "AC_Hours",
    "Light_Hours",
    "Fan_Hours",
    "Day_of_Week",
    "Month"
]

# Target variable
target = "Total_Students"

X = df[features]
y = df[target]

print("\nFeatures selected successfully!")
print("Input features:", features)
print("Target:", target)

# Split data into training and testing sets
X_train, X_test, y_train, y_test = train_test_split(
    X,
    y,
    test_size=0.2,
    random_state=42
)

print("\nData split successfully!")
print("Training records:", len(X_train))
print("Testing records:", len(X_test))

# Train Linear Regression model
linear_model = LinearRegression()

linear_model.fit(X_train, y_train)

# Make predictions
linear_predictions = linear_model.predict(X_test)

# Evaluate model
linear_mae = mean_absolute_error(y_test, linear_predictions)
linear_rmse = mean_squared_error(y_test, linear_predictions) ** 0.5
linear_r2 = r2_score(y_test, linear_predictions)

print("\n--- Linear Regression Results ---")
print("MAE:", linear_mae)
print("RMSE:", linear_rmse)
print("R2 Score:", linear_r2)

# Train Random Forest model
random_forest_model = RandomForestRegressor(
    n_estimators=100,
    random_state=42
)

random_forest_model.fit(X_train, y_train)

# Make predictions
rf_predictions = random_forest_model.predict(X_test)

# Evaluate model
rf_mae = mean_absolute_error(y_test, rf_predictions)
rf_rmse = mean_squared_error(y_test, rf_predictions) ** 0.5
rf_r2 = r2_score(y_test, rf_predictions)

print("\n--- Random Forest Results ---")
print("MAE:", rf_mae)
print("RMSE:", rf_rmse)
print("R2 Score:", rf_r2)


# Train XGBoost model
xgb_model = XGBRegressor(
    n_estimators=100,
    learning_rate=0.1,
    max_depth=5,
    random_state=42
)

xgb_model.fit(X_train, y_train)

# Make predictions
xgb_predictions = xgb_model.predict(X_test)

# Evaluate model
xgb_mae = mean_absolute_error(y_test, xgb_predictions)
xgb_rmse = mean_squared_error(y_test, xgb_predictions) ** 0.5
xgb_r2 = r2_score(y_test, xgb_predictions)

print("\n--- XGBoost Results ---")
print("MAE:", xgb_mae)
print("RMSE:", xgb_rmse)
print("R2 Score:", xgb_r2)


# Compare model performance
results = pd.DataFrame({
    "Model": [
        "Linear Regression",
        "Random Forest",
        "XGBoost"
    ],
    "MAE": [
        linear_mae,
        rf_mae,
        xgb_mae
    ],
    "RMSE": [
        linear_rmse,
        rf_rmse,
        xgb_rmse
    ],
    "R2 Score": [
        linear_r2,
        rf_r2,
        xgb_r2
    ]
})

print("\n=== MODEL COMPARISON ===")
print(results)

# Select the model with the highest R2 Score
best_model_name = results.loc[
    results["R2 Score"].idxmax(), "Model"
]

print("\nBest Model:", best_model_name)


# Select the best trained model
if best_model_name == "Linear Regression":
    best_model = linear_model
elif best_model_name == "Random Forest":
    best_model = random_forest_model
else:
    best_model = xgb_model


# Create models folder if it doesn't exist
os.makedirs("../../models", exist_ok=True)

# Save the best model
model_path = "../../models/occupancy_model.pkl"
joblib.dump(best_model, model_path)

# Save the feature names
feature_path = "../../models/occupancy_features.pkl"
joblib.dump(features, feature_path)

print("\nBest model saved successfully!")
print("Model:", best_model_name)
print("Model path:", model_path)
print("Features saved at:", feature_path)