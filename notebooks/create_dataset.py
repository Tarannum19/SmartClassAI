import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import random

# ============================================================
# SmartClassAI - Classroom Dataset Generator
# ============================================================

random.seed(42)
np.random.seed(42)

# ------------------------------------------------------------
# Dataset settings
# ------------------------------------------------------------

NUM_RECORDS = 5000

# Classroom capacities for our DEMO dataset.
# The website itself is NOT limited to 200.
ROOM_CAPACITIES = {
    "CR-01": 40,
    "CR-02": 50,
    "CR-03": 60,
    "CR-04": 70,
    "CR-05": 80,
    "CR-06": 90,
    "CR-07": 100,
    "CR-08": 110,
    "CR-09": 120,
    "CR-10": 130,
    "CR-11": 140,
    "CR-12": 150,
    "CR-13": 160,
    "CR-14": 170,
    "CR-15": 180,
    "CR-16": 190,
    "CR-17": 200,
    "CR-18": 75,
    "CR-19": 95,
    "CR-20": 125,
}

ROOM_BUILDINGS = {
    "CR-01": "Building A",
    "CR-02": "Building A",
    "CR-03": "Building A",
    "CR-04": "Building A",
    "CR-05": "Building B",
    "CR-06": "Building B",
    "CR-07": "Building B",
    "CR-08": "Building B",
    "CR-09": "Building B",
    "CR-10": "Building C",
    "CR-11": "Building C",
    "CR-12": "Building C",
    "CR-13": "Building C",
    "CR-14": "Building C",
    "CR-15": "Building D",
    "CR-16": "Building D",
    "CR-17": "Building D",
    "CR-18": "Building D",
    "CR-19": "Building D",
    "CR-20": "Building D",
}

SUBJECTS = [
    "Computer Science",
    "Data Science",
    "Artificial Intelligence",
    "Machine Learning",
    "Python",
    "Database Management",
    "Web Development",
    "Statistics",
]

FACULTY_IDS = [
    "FAC-01",
    "FAC-02",
    "FAC-03",
    "FAC-04",
    "FAC-05",
    "FAC-06",
    "FAC-07",
    "FAC-08",
    "FAC-09",
    "FAC-10",
]

TIME_SLOTS = [
    "09:00-10:00",
    "10:00-11:00",
    "11:00-12:00",
    "12:00-13:00",
    "13:00-14:00",
    "14:00-15:00",
    "15:00-16:00",
    "16:00-17:00",
]

DAYS = [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
]


# ------------------------------------------------------------
# Helper functions
# ------------------------------------------------------------

def calculate_utilization(total_students, room_capacity):
    """
    Calculate classroom utilization percentage.
    """
    if room_capacity <= 0:
        return 0

    utilization = (total_students / room_capacity) * 100
    return round(min(utilization, 100), 2)


def calculate_energy(
    computer_count,
    ac_hours,
    light_hours,
    fan_hours,
    class_duration
):
    """
    Estimate classroom energy consumption.
    """

    computer_energy = computer_count * 0.15 * class_duration
    ac_energy = ac_hours * 2.0
    light_energy = light_hours * 0.8
    fan_energy = fan_hours * 0.1

    total_energy = (
        computer_energy
        + ac_energy
        + light_energy
        + fan_energy
    )

    return round(max(total_energy, 0.1), 2)


# ------------------------------------------------------------
# Generate records
# ------------------------------------------------------------

records = []

start_date = datetime(2025, 1, 1)

room_ids = list(ROOM_CAPACITIES.keys())

for i in range(NUM_RECORDS):

    # -------------------------
    # Date and time
    # -------------------------

    date = start_date + timedelta(
        days=random.randint(0, 364)
    )

    time_slot = random.choice(TIME_SLOTS)

    # -------------------------
    # Classroom
    # -------------------------

    room_id = random.choice(room_ids)

    room_capacity = ROOM_CAPACITIES[room_id]

    building = ROOM_BUILDINGS[room_id]

    # -------------------------
    # Class information
    # -------------------------

    class_id = f"CLS-{random.randint(1, 100):03d}"

    subject = random.choice(SUBJECTS)

    faculty_id = random.choice(FACULTY_IDS)

    day = date.strftime("%A")

    # -------------------------
    # Students
    # -------------------------

    # Students are ALWAYS less than or equal
    # to the classroom capacity.

    minimum_students = max(
        10,
        int(room_capacity * 0.20)
    )

    maximum_students = room_capacity

    total_students = random.randint(
        minimum_students,
        maximum_students
    )

    # -------------------------
    # Class duration
    # -------------------------

    class_duration = random.choice(
        [1, 1, 1.5, 2, 2, 3]
    )

    # -------------------------
    # Holiday / college event
    # -------------------------

    holiday = random.choice(
        [0, 0, 0, 0, 1]
    )

    college_event = random.choice(
        [0, 0, 0, 1]
    )

    # -------------------------
    # Attendance
    # -------------------------

    attendance_percentage = round(
        random.uniform(55, 100),
        2
    )

    attendance_count = int(
        round(
            total_students
            * attendance_percentage
            / 100
        )
    )

    # Safety validation
    attendance_count = min(
        attendance_count,
        total_students
    )

    # -------------------------
    # Previous occupancy
    # -------------------------

    previous_occupancy = round(
        random.uniform(20, 100),
        2
    )

    # -------------------------
    # Equipment
    # -------------------------

    computer_count = random.randint(
        0,
        min(40, room_capacity)
    )

    ac_hours = round(
        random.uniform(1, class_duration + 3),
        1
    )

    light_hours = round(
        random.uniform(1, class_duration + 3),
        1
    )

    fan_hours = round(
        random.uniform(1, class_duration + 3),
        1
    )

    # -------------------------
    # Energy
    # -------------------------

    energy_consumption = calculate_energy(
        computer_count,
        ac_hours,
        light_hours,
        fan_hours,
        class_duration
    )

    # -------------------------
    # Utilization
    # -------------------------

    utilization_percentage = calculate_utilization(
        total_students,
        room_capacity
    )

    # -------------------------
    # Store record
    # -------------------------

    records.append({
        "Date": date.strftime("%Y-%m-%d"),
        "Time_Slot": time_slot,
        "Room_ID": room_id,
        "Building": building,
        "Room_Capacity": room_capacity,
        "Class_ID": class_id,
        "Subject": subject,
        "Faculty_ID": faculty_id,
        "Day": day,
        "Total_Students": total_students,
        "Class_Duration": class_duration,
        "Holiday": holiday,
        "College_Event": college_event,
        "Attendance_Percentage": attendance_percentage,
        "Attendance_Count": attendance_count,
        "Previous_Occupancy": previous_occupancy,
        "Computer_Count": computer_count,
        "AC_Hours": ac_hours,
        "Light_Hours": light_hours,
        "Fan_Hours": fan_hours,
        "Energy_Consumption_kWh": energy_consumption,
        "Utilization_Percentage": utilization_percentage,
    })


# ------------------------------------------------------------
# Create DataFrame
# ------------------------------------------------------------

df = pd.DataFrame(records)


# ------------------------------------------------------------
# Validation
# ------------------------------------------------------------

assert (
    df["Total_Students"]
    <= df["Room_Capacity"]
).all(), (
    "Error: Total students exceed room capacity."
)

assert (
    df["Attendance_Count"]
    <= df["Total_Students"]
).all(), (
    "Error: Attendance count exceeds total students."
)

assert (
    df["Utilization_Percentage"]
    >= 0
).all()

assert (
    df["Utilization_Percentage"]
    <= 100
).all()


# ------------------------------------------------------------
# Save dataset
# ------------------------------------------------------------

output_path = (
    "../data/classroom_data.csv"
)

df.to_csv(
    output_path,
    index=False
)


# ------------------------------------------------------------
# Display results
# ------------------------------------------------------------

print("=" * 60)
print("SmartClassAI Dataset Generated Successfully!")
print("=" * 60)

print(f"Total Records   : {len(df)}")
print(f"Total Columns   : {len(df.columns)}")

print("\nClassroom Capacities:")
for room_id, capacity in ROOM_CAPACITIES.items():
    print(
        f"{room_id}: {capacity} students"
    )

print("\nMaximum Classroom Capacity:")
print(
    f"{df['Room_Capacity'].max()} students"
)

print("\nValidation:")
print(
    "Students <= Capacity : PASS"
)
print(
    "Attendance <= Students : PASS"
)
print(
    "Utilization 0-100% : PASS"
)

print("\nDataset saved to:")
print(output_path)

print("=" * 60)