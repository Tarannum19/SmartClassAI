import os
import random
import numpy as np
import pandas as pd


# ============================================================
# SMARTCLASSAI - CLASSROOM DATASET GENERATOR
# ============================================================

# Reproducibility
random.seed(42)
np.random.seed(42)


# ============================================================
# PROJECT PATH
# ============================================================

# notebooks/create_dataset.py
# Project root = one folder above notebooks

PROJECT_ROOT = os.path.dirname(
    os.path.dirname(
        os.path.abspath(__file__)
    )
)

DATA_DIR = os.path.join(
    PROJECT_ROOT,
    "data"
)

os.makedirs(DATA_DIR, exist_ok=True)

OUTPUT_PATH = os.path.join(
    DATA_DIR,
    "classroom_data.csv"
)


# ============================================================
# DATASET SETTINGS
# ============================================================

TOTAL_RECORDS = 5000

ROOMS = [
    "CR-01", "CR-02", "CR-03", "CR-04", "CR-05",
    "CR-06", "CR-07", "CR-08", "CR-09", "CR-10",
    "CR-11", "CR-12", "CR-13", "CR-14", "CR-15",
    "CR-16", "CR-17", "CR-18", "CR-19", "CR-20"
]

BUILDINGS = [
    "Main Building",
    "IT Building",
    "Science Building"
]

SUBJECTS = [
    "Python",
    "Machine Learning",
    "Data Science",
    "DBMS",
    "Web Development",
    "Artificial Intelligence",
    "Computer Networks",
    "Operating Systems",
    "Software Engineering",
    "Statistics"
]

FACULTY_IDS = [
    f"FAC-{i:02d}"
    for i in range(1, 31)
]

CLASS_IDS = [
    f"CLS-{i:02d}"
    for i in range(1, 51)
]

TIME_SLOTS = [
    "08-09",
    "09-10",
    "10-11",
    "11-12",
    "12-13",
    "13-14",
    "14-15",
    "15-16",
    "16-17"
]

ROOM_CAPACITIES = [
    30,
    40,
    50,
    60,
    80
]


# ============================================================
# ROOM INFORMATION
# ============================================================

room_information = {}

for room in ROOMS:

    capacity = random.choice(
        ROOM_CAPACITIES
    )

    building = random.choice(
        BUILDINGS
    )

    room_information[room] = {
        "Room_Capacity": capacity,
        "Building": building
    }


# ============================================================
# DATE RANGE
# ============================================================

dates = pd.date_range(
    start="2025-06-01",
    end="2025-12-31",
    freq="D"
)


# ============================================================
# GENERATE DATA
# ============================================================

records = []


for _ in range(TOTAL_RECORDS):

    # --------------------------------------------------------
    # Basic classroom information
    # --------------------------------------------------------

    date = random.choice(dates)

    time_slot = random.choice(
        TIME_SLOTS
    )

    room_id = random.choice(
        ROOMS
    )

    building = room_information[
        room_id
    ]["Building"]

    room_capacity = room_information[
        room_id
    ]["Room_Capacity"]


    # --------------------------------------------------------
    # Class information
    # --------------------------------------------------------

    class_id = random.choice(
        CLASS_IDS
    )

    subject = random.choice(
        SUBJECTS
    )

    faculty_id = random.choice(
        FACULTY_IDS
    )


    # --------------------------------------------------------
    # Day information
    # --------------------------------------------------------

    day = date.strftime("%A")


    # --------------------------------------------------------
    # Students
    # IMPORTANT:
    # Total_Students can NEVER exceed Room_Capacity
    # --------------------------------------------------------

    minimum_students = max(
        5,
        int(room_capacity * 0.20)
    )

    maximum_students = max(
        minimum_students,
        int(room_capacity * 0.95)
    )

    total_students = random.randint(
        minimum_students,
        maximum_students
    )


    # --------------------------------------------------------
    # Class duration
    # --------------------------------------------------------

    class_duration = random.choice(
        [1, 1, 1, 1.5, 2, 2, 3]
    )


    # --------------------------------------------------------
    # Holiday
    # --------------------------------------------------------

    holiday = random.choice(
        [0, 0, 0, 0, 0, 1]
    )


    # --------------------------------------------------------
    # College event
    # --------------------------------------------------------

    college_event = random.choice(
        [0, 0, 0, 0, 1]
    )


    # --------------------------------------------------------
    # Attendance percentage
    # --------------------------------------------------------

    attendance_percentage = round(
        np.random.uniform(
            65,
            98
        ),
        2
    )


    # --------------------------------------------------------
    # Attendance count
    # Must never exceed Total_Students
    # --------------------------------------------------------

    attendance_count = int(
        round(
            total_students
            * attendance_percentage
            / 100
        )
    )

    attendance_count = min(
        attendance_count,
        total_students
    )


    # --------------------------------------------------------
    # Previous occupancy
    # --------------------------------------------------------

    previous_occupancy = random.randint(
        max(
            0,
            int(room_capacity * 0.15)
        ),
        max(
            1,
            int(room_capacity * 0.95)
        )
    )


    # --------------------------------------------------------
    # Computer count
    # --------------------------------------------------------

    computer_count = random.randint(
        0,
        min(
            40,
            room_capacity
        )
    )


    # --------------------------------------------------------
    # AC hours
    # --------------------------------------------------------

    if holiday == 1:

        ac_hours = round(
            np.random.uniform(
                0,
                1
            ),
            2
        )

    else:

        ac_hours = round(
            np.random.uniform(
                0.25,
                min(
                    3.0,
                    class_duration + 0.5
                )
            ),
            2
        )


    # --------------------------------------------------------
    # Light hours
    # --------------------------------------------------------

    if holiday == 1:

        light_hours = round(
            np.random.uniform(
                0,
                0.5
            ),
            2
        )

    else:

        light_hours = round(
            np.random.uniform(
                0.5,
                min(
                    4.0,
                    class_duration + 1
                )
            ),
            2
        )


    # --------------------------------------------------------
    # Fan hours
    # --------------------------------------------------------

    if holiday == 1:

        fan_hours = round(
            np.random.uniform(
                0,
                0.5
            ),
            2
        )

    else:

        fan_hours = round(
            np.random.uniform(
                0.25,
                min(
                    3.0,
                    class_duration + 0.5
                )
            ),
            2
        )


    # ========================================================
    # UTILIZATION
    # ========================================================

    # Classroom utilization is based on students present
    # compared with room capacity.

    attendance_based_students = (
        attendance_count
    )

    utilization_percentage = (
        attendance_based_students
        / room_capacity
    ) * 100


    # Add a small effect from previous occupancy
    utilization_percentage = (
        utilization_percentage * 0.75
        + (
            previous_occupancy
            / room_capacity
            * 100
        ) * 0.25
    )


    # Event/holiday effect

    if college_event == 1:
        utilization_percentage += random.uniform(
            2,
            8
        )

    if holiday == 1:
        utilization_percentage *= random.uniform(
            0.1,
            0.4
        )


    # Keep utilization realistic
    utilization_percentage = max(
        0,
        min(
            utilization_percentage,
            100
        )
    )

    utilization_percentage = round(
        utilization_percentage,
        2
    )


    # ========================================================
    # ENERGY CONSUMPTION
    # ========================================================

    # Base energy

    energy = (
        1.2
        + (room_capacity * 0.025)
        + (total_students * 0.018)
        + (computer_count * 0.035)
        + (ac_hours * 2.2)
        + (light_hours * 0.8)
        + (fan_hours * 0.6)
    )


    # Class duration effect

    energy *= (
        0.75
        + (class_duration * 0.25)
    )


    # Holiday reduces energy

    if holiday == 1:
        energy *= 0.25


    # College event slightly increases energy

    if college_event == 1:
        energy *= 1.08


    # Small natural variation

    energy += np.random.normal(
        0,
        0.25
    )


    # Energy should never be negative

    energy = max(
        0.5,
        energy
    )

    energy = round(
        energy,
        2
    )


    # ========================================================
    # STORE RECORD
    # ========================================================

    records.append({

        "Date": date.strftime(
            "%Y-%m-%d"
        ),

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

        "Energy_Consumption_kWh": energy,

        "Utilization_Percentage": utilization_percentage
    })


# ============================================================
# CREATE DATAFRAME
# ============================================================

df = pd.DataFrame(
    records
)


# ============================================================
# FINAL VALIDATION
# ============================================================

# Make sure students never exceed capacity.

invalid_students = (
    df["Total_Students"]
    > df["Room_Capacity"]
).sum()

if invalid_students > 0:

    print(
        "ERROR: Some records have students greater than capacity."
    )

    raise ValueError(
        "Dataset validation failed."
    )


# Attendance count cannot exceed total students.

invalid_attendance = (
    df["Attendance_Count"]
    > df["Total_Students"]
).sum()

if invalid_attendance > 0:

    print(
        "ERROR: Attendance count is greater than total students."
    )

    raise ValueError(
        "Dataset validation failed."
    )


# Utilization must stay between 0 and 100.

invalid_utilization = (
    (df["Utilization_Percentage"] < 0)
    |
    (df["Utilization_Percentage"] > 100)
).sum()

if invalid_utilization > 0:

    print(
        "ERROR: Invalid utilization percentage."
    )

    raise ValueError(
        "Dataset validation failed."
    )


# ============================================================
# SAVE DATASET
# ============================================================

df.to_csv(
    OUTPUT_PATH,
    index=False
)


# ============================================================
# DISPLAY RESULTS
# ============================================================

print()
print("=" * 60)
print("SMARTCLASSAI DATASET CREATED SUCCESSFULLY!")
print("=" * 60)

print(
    f"Total Records: {len(df)}"
)

print(
    f"Total Columns: {len(df.columns)}"
)

print()
print("Dataset Columns:")

for index, column in enumerate(
    df.columns,
    start=1
):

    print(
        f"{index}. {column}"
    )

print()
print(
    "Dataset saved at:"
)

print(
    OUTPUT_PATH
)

print()
print(
    "Validation:"
)

print(
    "✓ Total Students <= Room Capacity"
)

print(
    "✓ Attendance Count <= Total Students"
)

print(
    "✓ Utilization Percentage between 0 and 100"
)

print(
    "✓ 22 columns generated"
)

print(
    "✓ 5,000 records generated"
)

print("=" * 60)
