import os
import shutil
import pandas as pd

from fastapi import APIRouter, UploadFile, File, HTTPException


# ============================================================
# DATASET UPLOAD ROUTER
# ============================================================

router = APIRouter(
    prefix="/upload",
    tags=["Dataset Upload"]
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
# UPLOAD DIRECTORY
# ============================================================

UPLOAD_DIR = os.path.join(
    BASE_DIR,
    "data",
    "uploads"
)

os.makedirs(
    UPLOAD_DIR,
    exist_ok=True
)


# ============================================================
# ACTIVE DATASET
# ============================================================

ACTIVE_DATASET_PATH = os.path.join(
    UPLOAD_DIR,
    "active_classroom_data.csv"
)


# ============================================================
# REQUIRED COLUMNS
# ============================================================

REQUIRED_COLUMNS = [
    "Date",
    "Time_Slot",
    "Room_ID",
    "Building",
    "Room_Capacity",
    "Class_ID",
    "Subject",
    "Faculty_ID",
    "Day",
    "Total_Students",
    "Class_Duration",
    "Holiday",
    "College_Event",
    "Attendance_Percentage",
    "Attendance_Count",
    "Previous_Occupancy",
    "Computer_Count",
    "AC_Hours",
    "Light_Hours",
    "Fan_Hours",
    "Energy_Consumption_kWh",
    "Utilization_Percentage"
]


# ============================================================
# UPLOAD DATASET
# ============================================================

@router.post("/dataset")
async def upload_dataset(
    file: UploadFile = File(...)
):

    # --------------------------------------------------------
    # Check file name
    # --------------------------------------------------------

    if not file.filename:

        raise HTTPException(
            status_code=400,
            detail="No file selected."
        )


    # --------------------------------------------------------
    # Check CSV format
    # --------------------------------------------------------

    if not file.filename.lower().endswith(".csv"):

        raise HTTPException(
            status_code=400,
            detail="Only CSV files are allowed."
        )


    # --------------------------------------------------------
    # Temporary file path
    # --------------------------------------------------------

    temporary_path = os.path.join(
        UPLOAD_DIR,
        "uploaded_dataset_temp.csv"
    )


    try:

        # ----------------------------------------------------
        # Save uploaded file temporarily
        # ----------------------------------------------------

        contents = await file.read()

        with open(
            temporary_path,
            "wb"
        ) as f:

            f.write(contents)


        # ----------------------------------------------------
        # Read CSV
        # ----------------------------------------------------

        try:

            df = pd.read_csv(
                temporary_path
            )

        except Exception as e:

            if os.path.exists(
                temporary_path
            ):
                os.remove(
                    temporary_path
                )

            raise HTTPException(
                status_code=400,
                detail=f"Invalid CSV file: {str(e)}"
            )


        # ----------------------------------------------------
        # Check empty dataset
        # ----------------------------------------------------

        if df.empty:

            os.remove(
                temporary_path
            )

            raise HTTPException(
                status_code=400,
                detail="The uploaded dataset is empty."
            )


        # ----------------------------------------------------
        # Validate required columns
        # ----------------------------------------------------

        missing_columns = [
            column
            for column in REQUIRED_COLUMNS
            if column not in df.columns
        ]


        if missing_columns:

            os.remove(
                temporary_path
            )

            raise HTTPException(
                status_code=400,
                detail={
                    "message": "Dataset is missing required columns.",
                    "missing_columns": missing_columns
                }
            )


        # ----------------------------------------------------
        # Validate classroom capacity
        # ----------------------------------------------------

        invalid_students = (
            df["Total_Students"]
            > df["Room_Capacity"]
        ).sum()


        if invalid_students > 0:

            os.remove(
                temporary_path
            )

            raise HTTPException(
                status_code=400,
                detail=(
                    "Dataset contains records where "
                    "Total_Students is greater than Room_Capacity."
                )
            )


        # ----------------------------------------------------
        # Validate attendance count
        # ----------------------------------------------------

        invalid_attendance = (
            df["Attendance_Count"]
            > df["Total_Students"]
        ).sum()


        if invalid_attendance > 0:

            os.remove(
                temporary_path
            )

            raise HTTPException(
                status_code=400,
                detail=(
                    "Dataset contains records where "
                    "Attendance_Count is greater than Total_Students."
                )
            )


        # ----------------------------------------------------
        # Validate utilization percentage
        # ----------------------------------------------------

        invalid_utilization = (
            (df["Utilization_Percentage"] < 0)
            |
            (df["Utilization_Percentage"] > 100)
        ).sum()


        if invalid_utilization > 0:

            os.remove(
                temporary_path
            )

            raise HTTPException(
                status_code=400,
                detail=(
                    "Utilization_Percentage must be "
                    "between 0 and 100."
                )
            )


        # ----------------------------------------------------
        # Save as active dataset
        # ----------------------------------------------------

        shutil.copyfile(
            temporary_path,
            ACTIVE_DATASET_PATH
        )


        # ----------------------------------------------------
        # Remove temporary file
        # ----------------------------------------------------

        os.remove(
            temporary_path
        )


        # ----------------------------------------------------
        # Return upload result
        # ----------------------------------------------------

        return {

            "message":
                "Dataset uploaded and activated successfully!",

            "filename":
                file.filename,

            "records":
                int(len(df)),

            "columns":
                int(len(df.columns)),

            "column_names":
                df.columns.tolist(),

            "active_dataset":
                ACTIVE_DATASET_PATH
        }


    except HTTPException:

        raise


    except Exception as e:

        if os.path.exists(
            temporary_path
        ):

            os.remove(
                temporary_path
            )


        raise HTTPException(
            status_code=500,
            detail=f"Unable to process dataset: {str(e)}"
        )

