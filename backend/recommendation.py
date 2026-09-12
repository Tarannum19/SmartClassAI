import pandas as pd


def recommend_classroom(
    required_students,
    classrooms
):
    """Recommend the most suitable classroom."""

    suitable_rooms = []

    for room in classrooms:

        capacity = room["Room_Capacity"]
        utilization = (required_students / capacity) * 100

        if capacity >= required_students and utilization <= 100:
            suitable_rooms.append({
                "Room_ID": room["Room_ID"],
                "Room_Capacity": capacity,
                "Utilization_Percentage": round(utilization, 2)
            })

    if not suitable_rooms:
        return {
            "message": "No suitable classroom found."
        }

    result = min(
        suitable_rooms,
        key=lambda x: x["Room_Capacity"]
    )

    return result