import { useEffect, useState } from "react";
import axios from "axios";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import "./App.css";

const API_URL = "http://127.0.0.1:8000";

function App() {
  const [activePage, setActivePage] = useState("Dashboard");
  const [classrooms, setClassrooms] = useState([]);

  const [students, setStudents] = useState("");
  const [recommendation, setRecommendation] = useState(null);

  const [occupancy, setOccupancy] = useState(null);
  const [energy, setEnergy] = useState(null);

  const [loadingRoom, setLoadingRoom] = useState(false);
  const [loadingOccupancy, setLoadingOccupancy] = useState(false);
  const [loadingEnergy, setLoadingEnergy] = useState(false);
  const [optimizationLoading, setOptimizationLoading] =
    useState(false);

  const [dashboardLoading, setDashboardLoading] = useState(true);
  const [optimization, setOptimization] = useState(null);

  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadingDataset, setUploadingDataset] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);
  const [uploadError, setUploadError] = useState("");

  const [energyInput, setEnergyInput] = useState({
    Room_Capacity: 60,
    Total_Students: 40,
    Class_Duration: 1,
    Computer_Count: 20,
    AC_Hours: 1,
    Light_Hours: 1,
    Fan_Hours: 1,
    Day_of_Week: 1,
    Month: 9,
  });

  const [occupancyInput, setOccupancyInput] = useState({
    Room_Capacity: 60,
    Class_Duration: 1,
    Attendance_Percentage: 80,
    Previous_Occupancy: 60,
    Computer_Count: 20,
    AC_Hours: 1,
    Light_Hours: 1,
    Fan_Hours: 1,
    Day_of_Week: 1,
    Month: 9,
  });

  useEffect(() => {
    loadClassrooms();
  }, []);

  const loadClassrooms = async () => {
    try {
      setDashboardLoading(true);

      const response = await axios.get(
        `${API_URL}/classrooms/`
      );

      setClassrooms(response.data);
    } catch (error) {
      console.error("Error loading classrooms:", error);
    } finally {
      setDashboardLoading(false);
    }
  };

  const getRecommendation = async () => {
    if (!students || Number(students) <= 0) {
      alert("Please enter the number of students.");
      return;
    }

    try {
      setLoadingRoom(true);

      const response = await axios.post(
        `${API_URL}/recommend/classroom`,
        null,
        {
          params: {
            required_students: Number(students),
          },
        }
      );

      setRecommendation(response.data);
    } catch (error) {
      console.error(error);
      alert("Unable to get classroom recommendation.");
    } finally {
      setLoadingRoom(false);
    }
  };

  const predictOccupancy = async () => {
    try {
      setLoadingOccupancy(true);

      const response = await axios.post(
        `${API_URL}/predict/occupancy`,
        occupancyInput
      );

      setOccupancy(response.data.predicted_occupancy);
    } catch (error) {
      console.error(error);
      alert("Unable to predict occupancy.");
    } finally {
      setLoadingOccupancy(false);
    }
  };

  const predictEnergy = async () => {
    try {
      setLoadingEnergy(true);

      const response = await axios.post(
        `${API_URL}/predict/energy`,
        energyInput
      );

      setEnergy(response.data.predicted_energy_kWh);
    } catch (error) {
      console.error(error);
      alert("Unable to predict energy.");
    } finally {
      setLoadingEnergy(false);
    }
  };

  /* =========================
     DATASET UPLOAD
  ========================= */

  const removeSelectedFile = () => {
    setSelectedFile(null);
    setUploadResult(null);
    setUploadError("");
  };

  const uploadDataset = async () => {
    if (!selectedFile) {
      alert("Please select a CSV dataset first.");
      return;
    }

    if (!selectedFile.name.toLowerCase().endsWith(".csv")) {
      alert("Only CSV files are allowed.");
      return;
    }

    try {
      setUploadingDataset(true);
      setUploadResult(null);
      setUploadError("");

      const formData = new FormData();
      formData.append("file", selectedFile);

      const response = await axios.post(
        `${API_URL}/upload/dataset`,
        formData
      );

      setUploadResult(response.data);
    } catch (error) {
      console.error("Dataset upload error:", error);

      const message =
        error.response?.data?.detail ||
        "Unable to upload dataset.";

      setUploadError(message);
    } finally {
      setUploadingDataset(false);
    }
  };

  /* =========================
     ENERGY OPTIMIZATION
  ========================= */

  const optimizeEnergy = async () => {
    try {
      setOptimizationLoading(true);
      setOptimization(null);

      const roomCapacity = Number(
        energyInput.Room_Capacity
      );

      const totalStudents = Number(
        energyInput.Total_Students
      );

      const classDuration = Number(
        energyInput.Class_Duration
      );

      if (
        roomCapacity <= 0 ||
        totalStudents < 0 ||
        totalStudents > roomCapacity ||
        classDuration <= 0
      ) {
        alert(
          "Please enter valid students, room capacity and class duration."
        );
        setOptimizationLoading(false);
        return;
      }

      const occupancyRatio =
        totalStudents / roomCapacity;

      /*
       * AI optimization strategy:
       * Lower occupancy allows greater equipment-hour reduction.
       * Higher occupancy keeps more operating time for comfort.
       */
      let optimizationFactor = 1;

      if (occupancyRatio <= 0.5) {
        optimizationFactor = 0.5;
      } else if (occupancyRatio <= 0.75) {
        optimizationFactor = 0.75;
      } else if (occupancyRatio <= 0.9) {
        optimizationFactor = 0.9;
      } else {
        optimizationFactor = 1;
      }

      const currentAC = Math.max(
        0,
        Number(energyInput.AC_Hours)
      );

      const currentLight = Math.max(
        0,
        Number(energyInput.Light_Hours)
      );

      const currentFan = Math.max(
        0,
        Number(energyInput.Fan_Hours)
      );

      const minimumOperatingHours =
        occupancyRatio > 0.9 ? 1 : 0.5;

      const suggestedAC = Math.min(
        currentAC,
        Math.max(
          minimumOperatingHours,
          currentAC * optimizationFactor
        )
      );

      const suggestedLight = Math.min(
        currentLight,
        Math.max(
          minimumOperatingHours,
          currentLight * optimizationFactor
        )
      );

      const suggestedFan = Math.min(
        currentFan,
        Math.max(
          minimumOperatingHours,
          currentFan * optimizationFactor
        )
      );

      const baselineInput = {
        ...energyInput,
        Room_Capacity: roomCapacity,
        Total_Students: totalStudents,
        Class_Duration: classDuration,
      };

      const optimizedInput = {
        ...baselineInput,
        AC_Hours: Number(
          suggestedAC.toFixed(2)
        ),
        Light_Hours: Number(
          suggestedLight.toFixed(2)
        ),
        Fan_Hours: Number(
          suggestedFan.toFixed(2)
        ),
      };

      const baselineResponse = await axios.post(
        `${API_URL}/predict/energy`,
        baselineInput
      );

      const optimizedResponse = await axios.post(
        `${API_URL}/predict/energy`,
        optimizedInput
      );

      const baselineEnergy = Math.max(
        0,
        Number(
          baselineResponse.data.predicted_energy_kWh
        )
      );

      const optimizedEnergy = Math.max(
        0,
        Number(
          optimizedResponse.data.predicted_energy_kWh
        )
      );

      const saving = Math.max(
        0,
        baselineEnergy - optimizedEnergy
      );

      const savingPercentage =
        baselineEnergy > 0
          ? (saving / baselineEnergy) * 100
          : 0;

      setOptimization({
        baselineEnergy: Number(
          baselineEnergy.toFixed(2)
        ),
        optimizedEnergy: Number(
          optimizedEnergy.toFixed(2)
        ),
        saving: Number(
          saving.toFixed(2)
        ),
        savingPercentage: Number(
          savingPercentage.toFixed(1)
        ),
        suggestedAC: Number(
          suggestedAC.toFixed(2)
        ),
        suggestedLight: Number(
          suggestedLight.toFixed(2)
        ),
        suggestedFan: Number(
          suggestedFan.toFixed(2)
        ),
        occupancyPercentage: Number(
          (occupancyRatio * 100).toFixed(1)
        ),
      });
    } catch (error) {
      console.error(error);
      alert(
        "Unable to perform energy optimization."
      );
    } finally {
      setOptimizationLoading(false);
    }
  };

  /* =========================
     LIVE CLASSROOM STATISTICS
  ========================= */

  const averageUtilization =
    classrooms.length > 0
      ? classrooms.reduce(
          (sum, room) =>
            sum +
            Number(
              room.Utilization_Percentage || 0
            ),
          0
        ) / classrooms.length
      : 0;

  const highlyUtilized = classrooms.filter(
    (room) =>
      Number(
        room.Utilization_Percentage || 0
      ) >= 70
  ).length;

  const moderatelyUtilized = classrooms.filter(
    (room) => {
      const utilization = Number(
        room.Utilization_Percentage || 0
      );

      return (
        utilization >= 50 &&
        utilization < 70
      );
    }
  ).length;

  const underutilized = classrooms.filter(
    (room) =>
      Number(
        room.Utilization_Percentage || 0
      ) < 60
  ).length;

  const topRooms = [...classrooms]
    .sort(
      (a, b) =>
        Number(
          b.Utilization_Percentage || 0
        ) -
        Number(
          a.Utilization_Percentage || 0
        )
    )
    .slice(0, 5);

  const utilizationData = [
    {
      name: "Highly Utilized",
      value: highlyUtilized,
    },
    {
      name: "Moderately Utilized",
      value: moderatelyUtilized,
    },
    {
      name: "Underutilized",
      value: underutilized,
    },
  ];

  /* PURPLE + LAVENDER THEME */
  const COLORS = [
    "#8b5cf6",
    "#a78bfa",
    "#c4b5fd",
  ];

  /* =========================
     ML MODEL DATA
  ========================= */

  const occupancyModelData = [
    {
      model: "Linear Regression",
      r2: 0.660,
      mae: 10.444,
      rmse: 13.378,
    },
    {
      model: "Random Forest",
      r2: 0.798,
      mae: 7.211,
      rmse: 10.298,
    },
    {
      model: "XGBoost",
      r2: 0.803,
      mae: 7.257,
      rmse: 10.169,
    },
  ];

  const energyModelData = [
    {
      model: "Linear Regression",
      r2: 0.936,
      mae: 0.407,
      rmse: 0.511,
    },
    {
      model: "Random Forest",
      r2: 0.921,
      mae: 0.452,
      rmse: 0.570,
    },
    {
      model: "XGBoost",
      r2: 0.926,
      mae: 0.435,
      rmse: 0.549,
    },
  ];

  const modelR2Data = [
    {
      model: "Occupancy",
      r2: 0.803,
    },
    {
      model: "Energy",
      r2: 0.936,
    },
  ];

  /* =========================
     SIDEBAR
  ========================= */

  const Sidebar = () => {
    const menuItems = [
      { name: "Dashboard", icon: "▦" },
      { name: "Classrooms", icon: "▤" },
      { name: "Predictions", icon: "◈" },
      { name: "Analytics", icon: "◒" },
      { name: "Data Management", icon: "⇧" },
      { name: "Reports", icon: "▧" },
      { name: "Settings", icon: "⚙" },
      { name: "Help", icon: "?" },
    ];

    return (
      <aside
        style={{
          width: "250px",
          minHeight: "100vh",
          background:
            "linear-gradient(180deg, #6d28d9 0%, #7c3aed 45%, #a78bfa 100%)",
          color: "white",
          padding: "24px 16px",
          position: "fixed",
          left: 0,
          top: 0,
          bottom: 0,
          zIndex: 10,
          boxSizing: "border-box",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            padding: "4px 10px 30px",
          }}
        >
          <div
            style={{
              width: "42px",
              height: "42px",
              borderRadius: "12px",
              background:
                "linear-gradient(135deg, #ede9fe, #ddd6fe)",
              color: "#6d28d9",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "21px",
              fontWeight: "bold",
              boxShadow:
                "0 5px 15px rgba(0,0,0,0.12)",
            }}
          >
            AI
          </div>

          <div>
            <div
              style={{
                fontWeight: "800",
                fontSize: "18px",
                letterSpacing: "0.3px",
              }}
            >
              SmartClassAI
            </div>

            <div
              style={{
                color: "#ede9fe",
                fontSize: "11px",
                marginTop: "2px",
              }}
            >
              Classroom Intelligence
            </div>
          </div>
        </div>

        <div
          style={{
            fontSize: "10px",
            color: "#ede9fe",
            fontWeight: "700",
            padding: "0 12px 10px",
            letterSpacing: "1px",
          }}
        >
          MAIN MENU
        </div>

        {menuItems.map((item) => (
          <button
            key={item.name}
            onClick={() =>
              setActivePage(item.name)
            }
            style={{
              width: "100%",
              border: "none",
              borderRadius: "10px",
              padding: "12px 14px",
              marginBottom: "5px",
              background:
                activePage === item.name
                  ? "rgba(255,255,255,0.22)"
                  : "transparent",
              color:
                activePage === item.name
                  ? "#ffffff"
                  : "#f5f3ff",
              display: "flex",
              alignItems: "center",
              gap: "13px",
              cursor: "pointer",
              fontSize: "14px",
              textAlign: "left",
              fontWeight:
                activePage === item.name
                  ? "700"
                  : "400",
              boxShadow:
                activePage === item.name
                  ? "inset 3px 0 0 #ffffff"
                  : "none",
            }}
          >
            <span
              style={{
                width: "20px",
                textAlign: "center",
                fontSize: "16px",
              }}
            >
              {item.icon}
            </span>

            {item.name}
          </button>
        ))}

        <div
          style={{
            position: "absolute",
            bottom: "24px",
            left: "25px",
            right: "25px",
            borderTop:
              "1px solid rgba(255,255,255,0.25)",
            paddingTop: "18px",
            color: "#ede9fe",
            fontSize: "11px",
          }}
        >
          <div>AI-Powered Classroom</div>

          <div style={{ marginTop: "4px" }}>
            Utilization & Energy Optimizer
          </div>
        </div>
      </aside>
    );
  };

  /* =========================
     HEADER
  ========================= */

  const Header = () => (
    <header
      style={{
        height: "72px",
        background: "#ffffff",
        borderBottom:
          "1px solid #e9d5ff",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 32px",
        position: "sticky",
        top: 0,
        zIndex: 5,
      }}
    >
      <div>
        <div
          style={{
            fontSize: "12px",
            color: "#a78bfa",
            marginBottom: "3px",
          }}
        >
          SmartClassAI
        </div>

        <h2
          style={{
            margin: 0,
            fontSize: "21px",
            color: "#4c1d95",
            fontWeight: "700",
          }}
        >
          {activePage}
        </h2>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "12px",
        }}
      >
        <div
          style={{
            padding: "7px 12px",
            background: "#f3e8ff",
            color: "#7e22ce",
            borderRadius: "20px",
            fontSize: "12px",
            fontWeight: "600",
          }}
        >
          ● System Online
        </div>

        <div
          style={{
            width: "38px",
            height: "38px",
            borderRadius: "50%",
            background: "#ede9fe",
            color: "#6d28d9",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: "700",
          }}
        >
          T
        </div>
      </div>
    </header>
  );

  /* =========================
     DASHBOARD
  ========================= */

  const DashboardPage = () => (
    <div
      style={{
        padding: "30px",
      }}
    >
      <div
        style={{
          background:
            "linear-gradient(135deg, #6d28d9 0%, #8b5cf6 50%, #c084fc 100%)",
          borderRadius: "18px",
          padding: "30px",
          color: "white",
          marginBottom: "25px",
          position: "relative",
          overflow: "hidden",
          boxShadow:
            "0 8px 25px rgba(124,58,237,0.15)",
        }}
      >
        <div
          style={{
            position: "absolute",
            right: "-50px",
            top: "-80px",
            width: "230px",
            height: "230px",
            borderRadius: "50%",
            background:
              "rgba(255,255,255,0.10)",
          }}
        />

        <div
          style={{
            position: "relative",
            zIndex: 1,
            maxWidth: "700px",
          }}
        >
          <div
            style={{
              display: "inline-block",
              padding: "5px 10px",
              background:
                "rgba(255,255,255,0.16)",
              borderRadius: "20px",
              fontSize: "11px",
              marginBottom: "13px",
            }}
          >
            ✦ AI-POWERED CLASSROOM INTELLIGENCE
          </div>

          <h1
            style={{
              margin: "0 0 9px",
              fontSize: "29px",
              fontWeight: "800",
            }}
          >
            Smart Classroom Operations
          </h1>

          <p
            style={{
              margin: 0,
              color: "#f3e8ff",
              lineHeight: "1.6",
              fontSize: "14px",
            }}
          >
            Monitor classroom utilization, predict
            occupancy and energy consumption, and make
            smarter room allocation decisions using
            machine learning.
          </p>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(4, 1fr)",
          gap: "18px",
          marginBottom: "25px",
        }}
      >
        <MetricCard
          title="Total Classrooms"
          value={
            dashboardLoading
              ? "..."
              : classrooms.length
          }
          subtitle="Active rooms"
          icon="▤"
          iconBg="#f3e8ff"
          iconColor="#7c3aed"
        />

        <MetricCard
          title="Avg. Utilization"
          value={
            dashboardLoading
              ? "..."
              : `${averageUtilization.toFixed(
                  1
                )}%`
          }
          subtitle="Across all classrooms"
          icon="◒"
          iconBg="#ede9fe"
          iconColor="#8b5cf6"
        />

        <MetricCard
          title="Highly Utilized"
          value={
            dashboardLoading
              ? "..."
              : highlyUtilized
          }
          subtitle="≥ 70% utilization"
          icon="↑"
          iconBg="#f3e8ff"
          iconColor="#9333ea"
        />

        <MetricCard
          title="Underutilized"
          value={
            dashboardLoading
              ? "..."
              : underutilized
          }
          subtitle="< 50% utilization"
          icon="↓"
          iconBg="#f5f3ff"
          iconColor="#a78bfa"
        />
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "20px",
          marginBottom: "25px",
        }}
      >
        <PredictionCard
          title="Occupancy Prediction"
          subtitle="XGBoost Machine Learning Model"
          value={occupancy}
          unit="%"
          description="Predict classroom occupancy using attendance, capacity and historical utilization."
          buttonText="Run Occupancy Prediction"
          loading={loadingOccupancy}
          onClick={predictOccupancy}
          color="#7c3aed"
        />

        <PredictionCard
          title="Energy Prediction"
          subtitle="Linear Regression Model"
          value={energy}
          unit=" kWh"
          description="Estimate classroom energy consumption from students, equipment and operating hours."
          buttonText="Run Energy Prediction"
          loading={loadingEnergy}
          onClick={predictEnergy}
          color="#8b5cf6"
        />
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "1.1fr 0.9fr",
          gap: "20px",
          marginBottom: "25px",
        }}
      >
        <div
          style={{
            background: "#ffffff",
            border:
              "1px solid #e9d5ff",
            borderRadius: "16px",
            padding: "22px",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent:
                "space-between",
              alignItems: "center",
              marginBottom: "15px",
            }}
          >
            <div>
              <h3
                style={{
                  margin: 0,
                  color: "#4c1d95",
                  fontSize: "17px",
                }}
              >
                Classroom Utilization
              </h3>

              <p
                style={{
                  margin:
                    "5px 0 0",
                  color: "#a78bfa",
                  fontSize: "12px",
                }}
              >
                Live distribution of classroom usage
              </p>
            </div>

            <div
              style={{
                fontSize: "24px",
                fontWeight: "800",
                color: "#6d28d9",
              }}
            >
              {dashboardLoading
                ? "..."
                : `${averageUtilization.toFixed(
                    1
                  )}%`}
            </div>
          </div>

          <div
            style={{
              width: "100%",
              height: "245px",
            }}
          >
            <ResponsiveContainer
              width="100%"
              height="100%"
            >
              <PieChart>
                <Pie
                  data={utilizationData}
                  cx="50%"
                  cy="50%"
                  innerRadius={65}
                  outerRadius={92}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {utilizationData.map(
                    (entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={
                          COLORS[
                            index %
                              COLORS.length
                          ]
                        }
                      />
                    )
                  )}
                </Pie>

                <Tooltip />

                <Legend
                  verticalAlign="bottom"
                  height={35}
                  formatter={(value) => (
                    <span
                      style={{
                        fontSize: "12px",
                      }}
                    >
                      {value}
                    </span>
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(3, 1fr)",
              gap: "10px",
              marginTop: "8px",
            }}
          >
            <StatusBox
              label="Highly"
              value={highlyUtilized}
              color="#7c3aed"
            />

            <StatusBox
              label="Moderate"
              value={moderatelyUtilized}
              color="#8b5cf6"
            />

            <StatusBox
              label="Under"
              value={underutilized}
              color="#a78bfa"
            />
          </div>
        </div>

        <div
          style={{
            background: "#ffffff",
            border:
              "1px solid #e9d5ff",
            borderRadius: "16px",
            padding: "22px",
          }}
        >
          <div
            style={{
              marginBottom: "17px",
            }}
          >
            <h3
              style={{
                margin: 0,
                color: "#4c1d95",
                fontSize: "17px",
              }}
            >
              Top Utilized Rooms
            </h3>

            <p
              style={{
                margin:
                  "5px 0 0",
                color: "#a78bfa",
                fontSize: "12px",
              }}
            >
              Classrooms with highest utilization
            </p>
          </div>

          {dashboardLoading ? (
            <div
              style={{
                textAlign: "center",
                color: "#a78bfa",
                padding:
                  "45px 10px",
                fontSize: "13px",
              }}
            >
              Loading classroom data...
            </div>
          ) : topRooms.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                color: "#a78bfa",
                padding:
                  "45px 10px",
                fontSize: "13px",
              }}
            >
              No classroom data available.
            </div>
          ) : (
            topRooms.map(
              (room, index) => (
                <div
                  key={room.Room_ID}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    padding: "12px 0",
                    borderBottom:
                      index <
                      topRooms.length - 1
                        ? "1px solid #f3e8ff"
                        : "none",
                  }}
                >
                  <div
                    style={{
                      width: "30px",
                      height: "30px",
                      borderRadius: "8px",
                      background: "#f3e8ff",
                      color: "#7c3aed",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "12px",
                      fontWeight: "800",
                    }}
                  >
                    {index + 1}
                  </div>

                  <div
                    style={{
                      flex: 1,
                    }}
                  >
                    <div
                      style={{
                        fontWeight: "700",
                        fontSize: "13px",
                        color: "#4c1d95",
                      }}
                    >
                      {room.Room_ID}
                    </div>

                    <div
                      style={{
                        color: "#a78bfa",
                        fontSize: "11px",
                        marginTop: "3px",
                      }}
                    >
                      {room.Building ||
                        "Classroom"}{" "}
                      • Capacity{" "}
                      {room.Room_Capacity}
                    </div>
                  </div>

                  <div
                    style={{
                      width: "95px",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent:
                          "space-between",
                        marginBottom: "5px",
                      }}
                    >
                      <span
                        style={{
                          fontSize: "11px",
                          color: "#8b5cf6",
                        }}
                      >
                        Usage
                      </span>

                      <span
                        style={{
                          fontSize: "11px",
                          fontWeight: "700",
                          color: "#7c3aed",
                        }}
                      >
                        {Number(
                          room.Utilization_Percentage ||
                            0
                        ).toFixed(1)}
                        %
                      </span>
                    </div>

                    <div
                      style={{
                        height: "5px",
                        background: "#ede9fe",
                        borderRadius: "5px",
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          width: `${Math.min(
                            Number(
                              room.Utilization_Percentage ||
                                0
                            ),
                            100
                          )}%`,
                          height: "100%",
                          background:
                            "linear-gradient(90deg,#7c3aed,#c084fc)",
                          borderRadius: "5px",
                        }}
                      />
                    </div>
                  </div>
                </div>
              )
            )
          )}
        </div>
      </div>

      <div
        style={{
          background: "#ffffff",
          border:
            "1px solid #e9d5ff",
          borderRadius: "16px",
          padding: "23px",
          marginBottom: "25px",
        }}
      >
        <div
          style={{
            marginBottom: "17px",
          }}
        >
          <h3
            style={{
              margin: 0,
              fontSize: "17px",
              color: "#4c1d95",
            }}
          >
            AI Classroom Recommendation
          </h3>

          <p
            style={{
              margin:
                "5px 0 0",
              color: "#a78bfa",
              fontSize: "12px",
            }}
          >
            Find the most suitable classroom based on
            student strength and room capacity.
          </p>
        </div>

        <div
          style={{
            display: "flex",
            gap: "12px",
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <input
            type="number"
            min="1"
            placeholder="Enter number of students"
            value={students}
            onChange={(e) =>
              setStudents(
                e.target.value
              )
            }
            style={{
              width: "260px",
              padding:
                "12px 14px",
              border:
                "1px solid #d8b4fe",
              borderRadius: "9px",
              outline: "none",
              fontSize: "13px",
            }}
          />

          <button
            onClick={
              getRecommendation
            }
            disabled={
              loadingRoom
            }
            style={{
              padding:
                "12px 20px",
              border: "none",
              borderRadius: "9px",
              background:
                "#7c3aed",
              color: "white",
              fontWeight: "600",
              cursor:
                loadingRoom
                  ? "not-allowed"
                  : "pointer",
            }}
          >
            {loadingRoom
              ? "Finding..."
              : "Recommend Classroom"}
          </button>
        </div>

        {recommendation && (
          <div
            style={{
              marginTop: "18px",
              padding: "17px",
              background:
                "#faf5ff",
              border:
                "1px solid #e9d5ff",
              borderRadius: "12px",
            }}
          >
            {recommendation.message ? (
              <div
                style={{
                  color: "#b91c1c",
                  fontSize: "13px",
                  fontWeight: "600",
                }}
              >
                {recommendation.message}
              </div>
            ) : (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "repeat(3, 1fr)",
                  gap: "15px",
                }}
              >
                <MiniResult
                  label="Recommended Room"
                  value={
                    recommendation.Room_ID
                  }
                />

                <MiniResult
                  label="Room Capacity"
                  value={
                    recommendation.Room_Capacity
                  }
                />

                <MiniResult
                  label="Expected Utilization"
                  value={`${recommendation.Utilization_Percentage}%`}
                />
              </div>
            )}
          </div>
        )}
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "1fr 1fr 1fr",
          gap: "18px",
        }}
      >
        <ModelCard
          title="Occupancy Model"
          model="XGBoost"
          metric="R² 0.803"
          description="Best performing occupancy model"
        />

        <ModelCard
          title="Energy Model"
          model="Linear Regression"
          metric="R² 0.936"
          description="Best performing energy model"
        />

        <ModelCard
          title="Smart Recommendation"
          model="AI Optimization"
          metric="Ready"
          description="Capacity-aware room allocation"
        />
      </div>
    </div>
  );

  /* =========================
     CLASSROOMS PAGE
  ========================= */

  const ClassroomsPage = () => {
    const [search, setSearch] =
      useState("");

    const [building, setBuilding] =
      useState("All");

    const filteredRooms =
      classrooms.filter(
        (room) => {
          const searchValue =
            search.trim().toLowerCase();

          const roomId =
            String(room.Room_ID || "")
              .trim()
              .toLowerCase();

          const roomNumber =
            roomId.replace(/^cr-/, "");

          const isRoomNumberSearch =
            /^\d+$/.test(searchValue);

          const matchesRoom =
            isRoomNumberSearch
              ? Number(roomNumber) ===
                Number(searchValue)
              : roomId === searchValue ||
                roomId.includes(searchValue);

          const matchesBuildingSearch =
            String(room.Building || "")
              .toLowerCase()
              .includes(searchValue);

          const matchesSearch =
            searchValue === "" ||
            matchesRoom ||
            matchesBuildingSearch;

          const matchesBuildingFilter =
            building === "All" ||
            room.Building ===
              building;

          return (
            matchesSearch &&
            matchesBuildingFilter
          );
        }
      );

    const buildings = [
      "All",
      ...new Set(
        classrooms
          .map(
            (room) =>
              room.Building
          )
          .filter(Boolean)
      ),
    ];

    return (
      <div
        style={{
          padding: "30px",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(3,1fr)",
            gap: "18px",
            marginBottom: "22px",
          }}
        >
          <MetricCard
            title="Total Rooms"
            value={
              classrooms.length
            }
            subtitle="Available classrooms"
            icon="▤"
            iconBg="#f3e8ff"
            iconColor="#7c3aed"
          />

          <MetricCard
            title="Highly Utilized"
            value={
              highlyUtilized
            }
            subtitle="90% and above"
            icon="↑"
            iconBg="#ede9fe"
            iconColor="#8b5cf6"
          />

          <MetricCard
            title="Underutilized"
            value={
              underutilized
            }
            subtitle="Below 60%"
            icon="↓"
            iconBg="#f5f3ff"
            iconColor="#a78bfa"
          />
        </div>

        <div
          style={{
            background:
              "#ffffff",
            border:
              "1px solid #e9d5ff",
            borderRadius:
              "16px",
            padding: "20px",
          }}
        >
          <div
            style={{
              display: "flex",
              gap: "12px",
              marginBottom:
                "20px",
              flexWrap: "wrap",
            }}
          >
            <input
              value={search}
              onChange={(e) =>
                setSearch(
                  e.target.value
                )
              }
              placeholder="Search room..."
              style={{
                flex: 1,
                minWidth:
                  "220px",
                padding:
                  "11px 14px",
                border:
                  "1px solid #d8b4fe",
                borderRadius:
                  "9px",
              }}
            />

            <select
              value={building}
              onChange={(e) =>
                setBuilding(
                  e.target.value
                )
              }
              style={{
                padding:
                  "11px 14px",
                border:
                  "1px solid #d8b4fe",
                borderRadius:
                  "9px",
                minWidth:
                  "150px",
              }}
            >
              {buildings.map(
                (item) => (
                  <option
                    key={item}
                  >
                    {item}
                  </option>
                )
              )}
            </select>
          </div>

          <div
            style={{
              overflowX:
                "auto",
            }}
          >
            <table
              style={{
                width: "100%",
                borderCollapse:
                  "collapse",
                fontSize: "13px",
              }}
            >
              <thead>
                <tr
                  style={{
                    background:
                      "#faf5ff",
                  }}
                >
                  <th style={tableHead}>
                    Room
                  </th>

                  <th style={tableHead}>
                    Building
                  </th>

                  <th style={tableHead}>
                    Capacity
                  </th>

                  <th style={tableHead}>
                    Utilization
                  </th>

                  <th style={tableHead}>
                    Status
                  </th>
                </tr>
              </thead>

              <tbody>
                {filteredRooms.map(
                  (room) => {
                    const utilization =
                      Number(
                        room.Utilization_Percentage ||
                          0
                      );

                    const status =
                      utilization >=
                      70
                        ? "Highly Utilized"
                        : utilization >=
                          50
                        ? "Moderate"
                        : "Underutilized";

                    return (
                      <tr
                        key={
                          room.Room_ID
                        }
                      >
                        <td
                          style={
                            tableCell
                          }
                        >
                          <strong>
                            {
                              room.Room_ID
                            }
                          </strong>
                        </td>

                        <td
                          style={
                            tableCell
                          }
                        >
                          {room.Building ||
                            "-"}
                        </td>

                        <td
                          style={
                            tableCell
                          }
                        >
                          {
                            room.Room_Capacity
                          }
                        </td>

                        <td
                          style={
                            tableCell
                          }
                        >
                          {utilization.toFixed(
                            1
                          )}
                          %
                        </td>

                        <td
                          style={
                            tableCell
                          }
                        >
                          <span
                            style={{
                              padding:
                                "5px 9px",
                              borderRadius:
                                "15px",
                              fontSize:
                                "11px",
                              background:
                                status ===
                                "Highly Utilized"
                                  ? "#f3e8ff"
                                  : status ===
                                    "Moderate"
                                  ? "#ede9fe"
                                  : "#f5f3ff",
                              color:
                                status ===
                                "Highly Utilized"
                                  ? "#7c3aed"
                                  : status ===
                                    "Moderate"
                                  ? "#8b5cf6"
                                  : "#a78bfa",
                              fontWeight:
                                "600",
                            }}
                          >
                            {
                              status
                            }
                          </span>
                        </td>
                      </tr>
                    );
                  }
                )}
              </tbody>
            </table>
          </div>

          {filteredRooms.length ===
            0 && (
            <div
              style={{
                textAlign:
                  "center",
                padding:
                  "35px",
                color:
                  "#a78bfa",
              }}
            >
              No classrooms found.
            </div>
          )}
        </div>
      </div>
    );
  };

  /* =========================
     PREDICTIONS PAGE
  ========================= */

  const PredictionsPage =
    () => (
      <div
        style={{
          padding: "30px",
        }}
      >
        <div
          style={{
            display:
              "grid",
            gridTemplateColumns:
              "1fr 1fr",
            gap: "22px",
          }}
        >
          <PredictionForm
            title="Occupancy Prediction"
            subtitle="XGBoost Model"
            input={
              occupancyInput
            }
            setInput={
              setOccupancyInput
            }
            type="occupancy"
            onPredict={
              predictOccupancy
            }
            loading={
              loadingOccupancy
            }
            result={
              occupancy
            }
          />

          <PredictionForm
            title="Energy Prediction"
            subtitle="Linear Regression Model"
            input={
              energyInput
            }
            setInput={
              setEnergyInput
            }
            type="energy"
            onPredict={
              predictEnergy
            }
            loading={
              loadingEnergy
            }
            result={energy}
          />
        </div>

        <div
          style={{
            background:
              "#ffffff",
            border:
              "1px solid #e9d5ff",
            borderRadius:
              "16px",
            padding: "24px",
            marginTop:
              "22px",
          }}
        >
          <div
            style={{
              display:
                "flex",
              justifyContent:
                "space-between",
              alignItems:
                "flex-start",
              marginBottom:
                "20px",
            }}
          >
            <div>
              <h2
                style={{
                  margin: 0,
                  fontSize:
                    "19px",
                  color:
                    "#4c1d95",
                }}
              >
                AI Energy Optimization
              </h2>

              <p
                style={{
                  margin:
                    "6px 0 0",
                  color:
                    "#8b5cf6",
                  fontSize:
                    "12px",
                  lineHeight:
                    "1.6",
                }}
              >
                Use the trained energy model to estimate
                current consumption and identify smarter
                equipment operating hours.
              </p>
            </div>

            <div
              style={{
                padding:
                  "7px 12px",
                background:
                  "#f3e8ff",
                color:
                  "#7c3aed",
                borderRadius:
                  "20px",
                fontSize:
                  "11px",
                fontWeight:
                  "700",
              }}
            >
              AI OPTIMIZER
            </div>
          </div>

          <div
            style={{
              display:
                "grid",
              gridTemplateColumns:
                "repeat(4, 1fr)",
              gap: "13px",
              marginBottom:
                "18px",
            }}
          >
            <OptimizationInput
              label="Room Capacity"
              value={
                energyInput.Room_Capacity
              }
              onChange={(value) =>
                setEnergyInput({
                  ...energyInput,
                  Room_Capacity:
                    value,
                })
              }
            />

            <OptimizationInput
              label="Total Students"
              value={
                energyInput.Total_Students
              }
              onChange={(value) =>
                setEnergyInput({
                  ...energyInput,
                  Total_Students:
                    value,
                })
              }
            />

            <OptimizationInput
              label="Class Duration"
              value={
                energyInput.Class_Duration
              }
              onChange={(value) =>
                setEnergyInput({
                  ...energyInput,
                  Class_Duration:
                    value,
                })
              }
            />

            <OptimizationInput
              label="Computer Count"
              value={
                energyInput.Computer_Count
              }
              onChange={(value) =>
                setEnergyInput({
                  ...energyInput,
                  Computer_Count:
                    value,
                })
              }
            />

            <OptimizationInput
              label="AC Hours"
              value={
                energyInput.AC_Hours
              }
              onChange={(value) =>
                setEnergyInput({
                  ...energyInput,
                  AC_Hours:
                    value,
                })
              }
            />

            <OptimizationInput
              label="Light Hours"
              value={
                energyInput.Light_Hours
              }
              onChange={(value) =>
                setEnergyInput({
                  ...energyInput,
                  Light_Hours:
                    value,
                })
              }
            />

            <OptimizationInput
              label="Fan Hours"
              value={
                energyInput.Fan_Hours
              }
              onChange={(value) =>
                setEnergyInput({
                  ...energyInput,
                  Fan_Hours:
                    value,
                })
              }
            />

            <OptimizationInput
              label="Month"
              value={
                energyInput.Month
              }
              onChange={(value) =>
                setEnergyInput({
                  ...energyInput,
                  Month: value,
                })
              }
            />
          </div>

          <button
            onClick={
              optimizeEnergy
            }
            disabled={
              optimizationLoading
            }
            style={{
              width: "100%",
              padding:
                "13px",
              border: "none",
              borderRadius:
                "9px",
              background:
                "#7c3aed",
              color: "white",
              fontWeight:
                "700",
              fontSize:
                "13px",
              cursor:
                optimizationLoading
                  ? "not-allowed"
                  : "pointer",
              boxShadow:
                "0 5px 15px rgba(124,58,237,0.18)",
            }}
          >
            {optimizationLoading
              ? "Analyzing Energy Usage..."
              : "Optimize Energy Usage"}
          </button>

          {optimization && (
            <div
              style={{
                marginTop:
                  "20px",
              }}
            >
              <div
                style={{
                  padding:
                    "14px 16px",
                  background:
                    "#faf5ff",
                  border:
                    "1px solid #e9d5ff",
                  borderRadius:
                    "10px",
                  marginBottom:
                    "15px",
                  color:
                    "#6d28d9",
                  fontSize:
                    "12px",
                }}
              >
                Current occupancy level:{" "}
                <strong>
                  {
                    optimization.occupancyPercentage
                  }
                  %
                </strong>
                . The AI optimizer has compared the
                current operating hours with a more
                efficient configuration.
              </div>

              <div
                style={{
                  display:
                    "grid",
                  gridTemplateColumns:
                    "repeat(4, 1fr)",
                  gap: "13px",
                  marginBottom:
                    "15px",
                }}
              >
                <OptimizationResult
                  label="Current Energy"
                  value={`${optimization.baselineEnergy} kWh`}
                  bg="#faf5ff"
                  color="#4c1d95"
                />

                <OptimizationResult
                  label="Optimized Energy"
                  value={`${optimization.optimizedEnergy} kWh`}
                  bg="#f3e8ff"
                  color="#7c3aed"
                />

                <OptimizationResult
                  label="Estimated Saving"
                  value={`${optimization.saving} kWh`}
                  bg="#f5f3ff"
                  color="#7e22ce"
                />

                <OptimizationResult
                  label="Saving Percentage"
                  value={`${optimization.savingPercentage}%`}
                  bg="#ede9fe"
                  color="#6d28d9"
                />
              </div>

              <div
                style={{
                  background:
                    "#faf5ff",
                  border:
                    "1px solid #f3e8ff",
                  borderRadius:
                    "12px",
                  padding:
                    "18px",
                }}
              >
                <h3
                  style={{
                    margin:
                      "0 0 13px",
                    fontSize:
                      "14px",
                    color:
                      "#4c1d95",
                  }}
                >
                  AI Recommended Operating Hours
                </h3>

                <div
                  style={{
                    display:
                      "grid",
                    gridTemplateColumns:
                      "repeat(3, 1fr)",
                    gap: "12px",
                  }}
                >
                  <RecommendationBox
                    title="AC"
                    value={`${optimization.suggestedAC} hrs`}
                    description="Recommended AC operating time"
                    color="#7c3aed"
                  />

                  <RecommendationBox
                    title="Lights"
                    value={`${optimization.suggestedLight} hrs`}
                    description="Recommended lighting time"
                    color="#8b5cf6"
                  />

                  <RecommendationBox
                    title="Fans"
                    value={`${optimization.suggestedFan} hrs`}
                    description="Recommended fan operating time"
                    color="#a855f7"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );

  /* =========================
     ANALYTICS PAGE
  ========================= */

  const AnalyticsPage =
    () => (
      <div
        style={{
          padding:
            "30px",
        }}
      >
        <div
          style={{
            background:
              "#ffffff",
            border:
              "1px solid #e9d5ff",
            borderRadius:
              "16px",
            padding:
              "22px",
            marginBottom:
              "22px",
          }}
        >
          <div
            style={{
              display:
                "flex",
              justifyContent:
                "space-between",
              alignItems:
                "flex-start",
              marginBottom:
                "18px",
            }}
          >
            <div>
              <h3
                style={{
                  margin: 0,
                  color:
                    "#4c1d95",
                }}
              >
                ML Model Performance
              </h3>

              <p
                style={{
                  color:
                    "#a78bfa",
                  fontSize:
                    "12px",
                  margin:
                    "5px 0 0",
                }}
              >
                R² score of the selected machine learning models
              </p>
            </div>

            <div
              style={{
                padding:
                  "7px 12px",
                background:
                  "#f3e8ff",
                color:
                  "#7c3aed",
                borderRadius:
                  "20px",
                fontSize:
                  "11px",
                fontWeight:
                  "700",
              }}
            >
              MODEL ACCURACY
            </div>
          </div>

          <div
            style={{
              height:
                "260px",
            }}
          >
            <ResponsiveContainer
              width="100%"
              height="100%"
            >
              <BarChart
                data={
                  modelR2Data
                }
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                />

                <XAxis
                  dataKey="model"
                />

                <YAxis
                  domain={[
                    0,
                    1,
                  ]}
                />

                <Tooltip
                  formatter={(
                    value
                  ) => [
                    Number(
                      value
                    ).toFixed(
                      3
                    ),
                    "R² Score",
                  ]}
                />

                <Bar
                  dataKey="r2"
                  fill="#7c3aed"
                  radius={[
                    6,
                    6,
                    0,
                    0,
                  ]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div
          style={{
            display:
              "grid",
            gridTemplateColumns:
              "1fr 1fr",
            gap: "20px",
            marginBottom:
              "22px",
          }}
        >
          <div
            style={{
              background:
                "#ffffff",
              border:
                "1px solid #e9d5ff",
              borderRadius:
                "16px",
              padding:
                "22px",
            }}
          >
            <h3
              style={{
                margin: 0,
                color:
                  "#4c1d95",
              }}
            >
              Occupancy Model Comparison
            </h3>

            <p
              style={{
                color:
                  "#a78bfa",
                fontSize:
                  "12px",
                margin:
                  "5px 0 18px",
              }}
            >
              Comparison of tested occupancy models
            </p>

            <div
              style={{
                height:
                  "250px",
              }}
            >
              <ResponsiveContainer
                width="100%"
                height="100%"
              >
                <BarChart
                  data={
                    occupancyModelData
                  }
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                  />

                  <XAxis
                    dataKey="model"
                    tick={{
                      fontSize:
                        10,
                    }}
                  />

                  <YAxis
                    domain={[
                      0,
                      1,
                    ]}
                    tick={{
                      fontSize:
                        10,
                    }}
                  />

                  <Tooltip
                    formatter={(
                      value
                    ) => [
                      Number(
                        value
                      ).toFixed(
                        3
                      ),
                      "R²",
                    ]}
                  />

                  <Bar
                    dataKey="r2"
                    fill="#8b5cf6"
                    radius={[
                      5,
                      5,
                      0,
                      0,
                    ]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div
              style={{
                marginTop:
                  "15px",
                display:
                  "grid",
                gridTemplateColumns:
                  "repeat(3,1fr)",
                gap: "8px",
              }}
            >
              {occupancyModelData.map(
                (item) => (
                  <div
                    key={
                      item.model
                    }
                    style={{
                      background:
                        item.model ===
                        "XGBoost"
                          ? "#f3e8ff"
                          : "#faf5ff",
                      border:
                        item.model ===
                        "XGBoost"
                          ? "1px solid #ddd6fe"
                          : "1px solid #f3e8ff",
                      borderRadius:
                        "9px",
                      padding:
                        "10px",
                      textAlign:
                        "center",
                    }}
                  >
                    <div
                      style={{
                        fontSize:
                          "10px",
                        color:
                          "#8b5cf6",
                      }}
                    >
                      {
                        item.model
                      }
                    </div>

                    <div
                      style={{
                        fontSize:
                          "16px",
                        fontWeight:
                          "800",
                        color:
                          item.model ===
                          "XGBoost"
                            ? "#7c3aed"
                            : "#4c1d95",
                        marginTop:
                          "4px",
                      }}
                    >
                      {item.r2.toFixed(
                        3
                      )}
                    </div>
                  </div>
                )
              )}
            </div>
          </div>

          <div
            style={{
              background:
                "#ffffff",
              border:
                "1px solid #e9d5ff",
              borderRadius:
                "16px",
              padding:
                "22px",
            }}
          >
            <h3
              style={{
                margin: 0,
                color:
                  "#4c1d95",
              }}
            >
              Energy Model Comparison
            </h3>

            <p
              style={{
                color:
                  "#a78bfa",
                fontSize:
                  "12px",
                margin:
                  "5px 0 18px",
              }}
            >
              Comparison of tested energy models
            </p>

            <div
              style={{
                height:
                  "250px",
              }}
            >
              <ResponsiveContainer
                width="100%"
                height="100%"
              >
                <BarChart
                  data={
                    energyModelData
                  }
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                  />

                  <XAxis
                    dataKey="model"
                    tick={{
                      fontSize:
                        10,
                    }}
                  />

                  <YAxis
                    domain={[
                      0,
                      1,
                    ]}
                    tick={{
                      fontSize:
                        10,
                    }}
                  />

                  <Tooltip
                    formatter={(
                      value
                    ) => [
                      Number(
                        value
                      ).toFixed(
                        3
                      ),
                      "R²",
                    ]}
                  />

                  <Bar
                    dataKey="r2"
                    fill="#a78bfa"
                    radius={[
                      5,
                      5,
                      0,
                      0,
                    ]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div
              style={{
                marginTop:
                  "15px",
                display:
                  "grid",
                gridTemplateColumns:
                  "repeat(3,1fr)",
                gap: "8px",
              }}
            >
              {energyModelData.map(
                (item) => (
                  <div
                    key={
                      item.model
                    }
                    style={{
                      background:
                        item.model ===
                        "Linear Regression"
                          ? "#f3e8ff"
                          : "#faf5ff",
                      border:
                        item.model ===
                        "Linear Regression"
                          ? "1px solid #ddd6fe"
                          : "1px solid #f3e8ff",
                      borderRadius:
                        "9px",
                      padding:
                        "10px",
                      textAlign:
                        "center",
                    }}
                  >
                    <div
                      style={{
                        fontSize:
                          "10px",
                        color:
                          "#8b5cf6",
                      }}
                    >
                      {
                        item.model
                      }
                    </div>

                    <div
                      style={{
                        fontSize:
                          "16px",
                        fontWeight:
                          "800",
                        color:
                          item.model ===
                          "Linear Regression"
                            ? "#7c3aed"
                            : "#4c1d95",
                        marginTop:
                          "4px",
                      }}
                    >
                      {item.r2.toFixed(
                        3
                      )}
                    </div>
                  </div>
                )
              )}
            </div>
          </div>
        </div>

        <div
          style={{
            background:
              "#ffffff",
            border:
              "1px solid #e9d5ff",
            borderRadius:
              "16px",
            padding:
              "22px",
            marginBottom:
              "22px",
          }}
        >
          <h3
            style={{
              margin: 0,
              color:
                "#4c1d95",
            }}
          >
            Dataset Overview
          </h3>

          <p
            style={{
              color:
                "#a78bfa",
              fontSize:
                "12px",
              margin:
                "5px 0 0",
            }}
          >
            SmartClassAI classroom dataset summary
          </p>

          <div
            style={{
              display:
                "grid",
              gridTemplateColumns:
                "repeat(4,1fr)",
              gap: "15px",
              marginTop:
                "18px",
            }}
          >
            <MiniResult
              label="Dataset Records"
              value="5,000"
            />

            <MiniResult
              label="Features"
              value="22"
            />

            <MiniResult
              label="Classrooms"
              value={
                classrooms.length
              }
            />

            <MiniResult
              label="Average Utilization"
              value={`${averageUtilization.toFixed(
                1
              )}%`}
            />
          </div>
        </div>

        <div
          style={{
            background:
              "#ffffff",
            border:
              "1px solid #e9d5ff",
            borderRadius:
              "16px",
            padding:
              "22px",
          }}
        >
          <h3
            style={{
              margin: 0,
              color:
                "#4c1d95",
            }}
          >
            AI Insights
          </h3>

          <p
            style={{
              color:
                "#a78bfa",
              fontSize:
                "12px",
              margin:
                "5px 0 18px",
            }}
          >
            Key findings from classroom utilization and ML analysis
          </p>

          <div
            style={{
              display:
                "grid",
              gridTemplateColumns:
                "repeat(3,1fr)",
              gap: "15px",
            }}
          >
            <Insight
              title="Occupancy Prediction"
              text="XGBoost achieved the strongest overall occupancy performance with an R² score of 0.803."
            />

            <Insight
              title="Energy Prediction"
              text="Linear Regression achieved the highest energy prediction performance with an R² score of 0.936."
            />

            <Insight
              title="Classroom Utilization"
              text={`The current dataset shows an average classroom utilization of ${averageUtilization.toFixed(
                1
              )}%, helping identify highly utilized and underutilized rooms.`}
            />
          </div>
        </div>
      </div>
    );

  /* =========================
     DATA MANAGEMENT PAGE
  ========================= */

  const DataManagementPage = () => (
    <div
      style={{
        padding: "30px",
      }}
    >
      <div
        style={{
          background:
            "linear-gradient(135deg,#6d28d9,#8b5cf6,#c084fc)",
          borderRadius: "18px",
          padding: "30px",
          color: "white",
          marginBottom: "22px",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "relative",
            zIndex: 1,
          }}
        >
          <div
            style={{
              display: "inline-block",
              padding: "5px 10px",
              background:
                "rgba(255,255,255,0.16)",
              borderRadius: "20px",
              fontSize: "11px",
              marginBottom: "13px",
            }}
          >
            ✦ DATA MANAGEMENT
          </div>

          <h1
            style={{
              margin: "0 0 9px",
              fontSize: "28px",
              fontWeight: "800",
            }}
          >
            Upload Classroom Dataset
          </h1>

          <p
            style={{
              margin: 0,
              color: "#f3e8ff",
              lineHeight: "1.6",
              fontSize: "13px",
              maxWidth: "720px",
            }}
          >
            Upload a CSV file provided by your school or college.
            SmartClassAI will validate the file and prepare it
            for classroom utilization and energy analysis.
          </p>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1.1fr 0.9fr",
          gap: "20px",
          marginBottom: "22px",
        }}
      >
        <div
          style={{
            background: "#ffffff",
            border: "1px solid #e9d5ff",
            borderRadius: "16px",
            padding: "24px",
          }}
        >
          <h2
            style={{
              margin: "0 0 7px",
              fontSize: "19px",
              color: "#4c1d95",
            }}
          >
            Select Dataset
          </h2>

          <p
            style={{
              margin: "0 0 20px",
              color: "#8b5cf6",
              fontSize: "12px",
              lineHeight: "1.6",
            }}
          >
            Choose the classroom CSV file you want to upload.
            Only CSV files are accepted.
          </p>

          <label
            style={{
              display: "block",
              border: "2px dashed #c4b5fd",
              borderRadius: "12px",
              padding: "28px 20px",
              textAlign: "center",
              background: "#faf5ff",
              cursor: "pointer",
            }}
          >
            <div
              style={{
                fontSize: "30px",
                color: "#7c3aed",
                marginBottom: "8px",
              }}
            >
              ⇧
            </div>

            <div
              style={{
                color: "#4c1d95",
                fontWeight: "700",
                fontSize: "14px",
              }}
            >
              Choose CSV Dataset
            </div>

            <div
              style={{
                color: "#a78bfa",
                fontSize: "11px",
                marginTop: "5px",
              }}
            >
              Click here to browse your computer
            </div>

            <input
              type="file"
              accept=".csv,text/csv"
              onChange={(e) => {
                setSelectedFile(
                  e.target.files?.[0] || null
                );
                setUploadResult(null);
                setUploadError("");
              }}
              style={{
                display: "none",
              }}
            />
          </label>

          {selectedFile && (
            <div
              style={{
                marginTop: "16px",
                padding: "13px 15px",
                background: "#f3e8ff",
                border: "1px solid #ddd6fe",
                borderRadius: "10px",
              }}
            >
              <div
                style={{
                  fontSize: "10px",
                  color: "#8b5cf6",
                  fontWeight: "700",
                }}
              >
                SELECTED FILE
              </div>

              <div
                style={{
                  marginTop: "4px",
                  color: "#4c1d95",
                  fontSize: "13px",
                  fontWeight: "700",
                  wordBreak: "break-word",
                }}
              >
                {selectedFile.name}
              </div>

              <div
                style={{
                  marginTop: "3px",
                  color: "#a78bfa",
                  fontSize: "10px",
                }}
              >
                {(selectedFile.size / 1024).toFixed(1)} KB
              </div>

              <button
                onClick={removeSelectedFile}
                disabled={uploadingDataset}
                style={{
                  marginTop: "10px",
                  padding: "7px 11px",
                  border: "1px solid #ddd6fe",
                  borderRadius: "7px",
                  background: "#ffffff",
                  color: "#7c3aed",
                  fontSize: "11px",
                  fontWeight: "700",
                  cursor: uploadingDataset
                    ? "not-allowed"
                    : "pointer",
                }}
              >
                Remove File
              </button>
            </div>
          )}

          <button
            onClick={uploadDataset}
            disabled={
              uploadingDataset || !selectedFile
            }
            style={{
              width: "100%",
              marginTop: "18px",
              padding: "12px",
              border: "none",
              borderRadius: "9px",
              background:
                uploadingDataset || !selectedFile
                  ? "#c4b5fd"
                  : "#7c3aed",
              color: "white",
              fontWeight: "700",
              fontSize: "12px",
              cursor:
                uploadingDataset || !selectedFile
                  ? "not-allowed"
                  : "pointer",
            }}
          >
            {uploadingDataset
              ? "Uploading Dataset..."
              : "Upload & Validate Dataset"}
          </button>

          {uploadError && (
            <div
              style={{
                marginTop: "15px",
                padding: "13px",
                background: "#fef2f2",
                border: "1px solid #fecaca",
                borderRadius: "10px",
                color: "#b91c1c",
                fontSize: "12px",
                lineHeight: "1.5",
              }}
            >
              {uploadError}
            </div>
          )}

          {uploadResult && (
            <div
              style={{
                marginTop: "15px",
                padding: "16px",
                background: "#faf5ff",
                border: "1px solid #e9d5ff",
                borderRadius: "11px",
              }}
            >
              <div
                style={{
                  color: "#7c3aed",
                  fontWeight: "800",
                  fontSize: "13px",
                  marginBottom: "12px",
                }}
              >
                ✓ Dataset Uploaded Successfully
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "repeat(3, 1fr)",
                  gap: "9px",
                }}
              >
                <MiniResult
                  label="Records"
                  value={uploadResult.records}
                />

                <MiniResult
                  label="Columns"
                  value={uploadResult.columns}
                />

                <MiniResult
                  label="File"
                  value={uploadResult.filename}
                />
              </div>
            </div>
          )}
        </div>

        <div
          style={{
            background: "#ffffff",
            border: "1px solid #e9d5ff",
            borderRadius: "16px",
            padding: "24px",
          }}
        >
          <h2
            style={{
              margin: "0 0 7px",
              fontSize: "19px",
              color: "#4c1d95",
            }}
          >
            Dataset Workflow
          </h2>

          <p
            style={{
              margin: "0 0 20px",
              color: "#8b5cf6",
              fontSize: "12px",
            }}
          >
            How uploaded data moves through SmartClassAI.
          </p>

          {[
            [
              "01",
              "Upload",
              "School or college provides the CSV dataset.",
            ],
            [
              "02",
              "Validate",
              "File type and CSV structure are checked.",
            ],
            [
              "03",
              "Prepare",
              "Data can be cleaned and prepared for ML.",
            ],
            [
              "04",
              "Analyze",
              "Utilization and energy insights are generated.",
            ],
            [
              "05",
              "Optimize",
              "AI models support smarter classroom decisions.",
            ],
          ].map(([number, title, description]) => (
            <div
              key={number}
              style={{
                display: "flex",
                gap: "12px",
                alignItems: "flex-start",
                marginBottom: "15px",
              }}
            >
              <div
                style={{
                  width: "30px",
                  height: "30px",
                  borderRadius: "8px",
                  background: "#f3e8ff",
                  color: "#7c3aed",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "10px",
                  fontWeight: "800",
                  flexShrink: 0,
                }}
              >
                {number}
              </div>

              <div>
                <div
                  style={{
                    color: "#4c1d95",
                    fontSize: "13px",
                    fontWeight: "700",
                  }}
                >
                  {title}
                </div>

                <div
                  style={{
                    color: "#a78bfa",
                    fontSize: "11px",
                    lineHeight: "1.5",
                    marginTop: "2px",
                  }}
                >
                  {description}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div
        style={{
          background: "#ffffff",
          border: "1px solid #e9d5ff",
          borderRadius: "16px",
          padding: "22px",
        }}
      >
        <h3
          style={{
            margin: 0,
            color: "#4c1d95",
            fontSize: "17px",
          }}
        >
          Expected Classroom Dataset
        </h3>

        <p
          style={{
            margin: "5px 0 18px",
            color: "#a78bfa",
            fontSize: "12px",
          }}
        >
          Typical information that can be supplied by an institution.
        </p>

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(4, 1fr)",
            gap: "10px",
          }}
        >
          {[
            "Room_ID",
            "Building",
            "Room_Capacity",
            "Total_Students",
            "Class_Duration",
            "Attendance_Percentage",
            "Computer_Count",
            "AC_Hours",
            "Light_Hours",
            "Fan_Hours",
            "Utilization_Percentage",
            "Energy_Consumption_kWh",
          ].map((column) => (
            <div
              key={column}
              style={{
                padding: "11px",
                background: "#faf5ff",
                borderRadius: "9px",
                color: "#6d28d9",
                fontSize: "11px",
                fontWeight: "600",
                wordBreak: "break-word",
              }}
            >
              {column}
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  /* =========================
     REPORTS PAGE
  ========================= */

  const ReportsPage =
    () => (
      <div
        style={{
          padding: "30px",
        }}
      >
        <div
          style={{
            background:
              "linear-gradient(135deg,#6d28d9,#8b5cf6,#c084fc)",
            borderRadius:
              "18px",
            padding:
              "30px",
            color: "white",
            marginBottom:
              "22px",
          }}
        >
          <div
            style={{
              fontSize:
                "11px",
              color:
                "#f3e8ff",
              fontWeight:
                "700",
              letterSpacing:
                "1px",
              marginBottom:
                "10px",
            }}
          >
            SMARTCLASSAI ANALYTICS REPORT
          </div>

          <h1
            style={{
              margin: 0,
              fontSize:
                "28px",
            }}
          >
            ML Performance & Classroom Insights
          </h1>

          <p
            style={{
              color:
                "#f3e8ff",
              fontSize:
                "13px",
              maxWidth:
                "700px",
              lineHeight:
                "1.6",
            }}
          >
            Summary of model performance, classroom utilization
            and AI-driven optimization capabilities.
          </p>
        </div>

        <div
          style={{
            display:
              "grid",
            gridTemplateColumns:
              "repeat(4,1fr)",
            gap: "18px",
            marginBottom:
              "22px",
          }}
        >
          <MetricCard
            title="Avg. Utilization"
            value={`${averageUtilization.toFixed(
              1
            )}%`}
            subtitle="Current classrooms"
            icon="◒"
            iconBg="#f3e8ff"
            iconColor="#7c3aed"
          />

          <MetricCard
            title="Rooms Analyzed"
            value={
              classrooms.length
            }
            subtitle="Live classroom data"
            icon="▤"
            iconBg="#ede9fe"
            iconColor="#8b5cf6"
          />

          <MetricCard
            title="Occupancy R²"
            value="0.803"
            subtitle="XGBoost"
            icon="AI"
            iconBg="#f3e8ff"
            iconColor="#9333ea"
          />

          <MetricCard
            title="Energy R²"
            value="0.936"
            subtitle="Linear Regression"
            icon="⚡"
            iconBg="#faf5ff"
            iconColor="#a855f7"
          />
        </div>

        <div
          style={{
            display:
              "grid",
            gridTemplateColumns:
              "1fr 1fr",
            gap: "20px",
            marginBottom:
              "22px",
          }}
        >
          <ReportModelCard
            title="Selected Occupancy Model"
            model="XGBoost"
            mae="7.257"
            rmse="10.169"
            r2="0.803"
          />

          <ReportModelCard
            title="Selected Energy Model"
            model="Linear Regression"
            mae="0.407"
            rmse="0.511"
            r2="0.936"
          />
        </div>

        <div
          style={{
            background:
              "#ffffff",
            border:
              "1px solid #e9d5ff",
            borderRadius:
              "16px",
            padding:
              "22px",
          }}
        >
          <h3
            style={{
              margin: 0,
              color: "#4c1d95",
            }}
          >
            AI Insights
          </h3>

          <div
            style={{
              display:
                "grid",
              gridTemplateColumns:
                "repeat(3,1fr)",
              gap: "15px",
              marginTop:
                "18px",
            }}
          >
            <Insight
              title="Occupancy"
              text="XGBoost provides the strongest overall occupancy prediction performance."
            />

            <Insight
              title="Energy"
              text="Linear Regression achieves the highest energy prediction R² among tested models."
            />

            <Insight
              title="Optimization"
              text="Classrooms can be allocated based on student strength and available room capacity."
            />
          </div>
        </div>
      </div>
    );

  /* =========================
     SETTINGS PAGE
  ========================= */

  const SettingsPage =
    () => (
      <div
        style={{
          padding: "30px",
        }}
      >
        <div
          style={{
            background:
              "#ffffff",
            border:
              "1px solid #e9d5ff",
            borderRadius:
              "16px",
            padding:
              "25px",
          }}
        >
          <h2
            style={{
              marginTop: 0,
              color: "#4c1d95",
            }}
          >
            System Settings
          </h2>

          <SettingRow
            title="Backend API"
            value="http://127.0.0.1:8000"
          />

          <SettingRow
            title="Frontend"
            value="React + Vite"
          />

          <SettingRow
            title="Occupancy Model"
            value="XGBoost"
          />

          <SettingRow
            title="Energy Model"
            value="Linear Regression"
          />

          <SettingRow
            title="Database"
            value="MySQL Ready"
          />
        </div>
      </div>
    );

  /* =========================
     HELP PAGE
  ========================= */

  const HelpPage =
    () => (
      <div
        style={{
          padding: "30px",
        }}
      >
        <div
          style={{
            background:
              "#ffffff",
            border:
              "1px solid #e9d5ff",
            borderRadius:
              "16px",
            padding:
              "28px",
          }}
        >
          <h2
            style={{
              marginTop: 0,
              color: "#4c1d95",
            }}
          >
            SmartClassAI Help
          </h2>

          <p
            style={{
              color:
                "#8b5cf6",
              lineHeight:
                "1.7",
            }}
          >
            SmartClassAI is an AI-powered classroom
            utilization and energy optimization system. Use
            the Dashboard for an overall view, Classrooms
            for room-level analysis, Predictions for ML
            predictions, Analytics for visual insights, and
            Reports for model performance.
          </p>

          <div
            style={{
              display:
                "grid",
              gridTemplateColumns:
                "repeat(2,1fr)",
              gap: "15px",
              marginTop:
                "22px",
            }}
          >
            <HelpCard
              title="Dashboard"
              text="View live classroom statistics, utilization and AI predictions."
            />

            <HelpCard
              title="Classrooms"
              text="Search and analyze individual classroom utilization."
            />

            <HelpCard
              title="Predictions"
              text="Run occupancy and energy predictions using trained ML models."
            />

            <HelpCard
              title="Analytics"
              text="Understand classroom utilization through charts and visual analysis."
            />
          </div>
        </div>
      </div>
    );

  /* =========================
     PAGE ROUTING
  ========================= */

  const renderPage = () => {
    switch (activePage) {
      case "Dashboard":
        return (
          <DashboardPage />
        );

      case "Classrooms":
        return (
          <ClassroomsPage />
        );

      case "Predictions":
        return (
          <PredictionsPage />
        );

      case "Analytics":
        return (
          <AnalyticsPage />
        );

      case "Data Management":
        return (
          <DataManagementPage />
        );

      case "Reports":
        return (
          <ReportsPage />
        );

      case "Settings":
        return (
          <SettingsPage />
        );

      case "Help":
        return (
          <HelpPage />
        );

      default:
        return (
          <DashboardPage />
        );
    }
  };

  return (
    <div
      style={{
        minHeight:
          "100vh",
        background:
          "#faf7ff",
      }}
    >
      <Sidebar />

      <div
        style={{
          marginLeft:
            "250px",
          minHeight:
            "100vh",
        }}
      >
        <Header />

        <main>
          {renderPage()}
        </main>
      </div>
    </div>
  );
}

/* =========================
   REUSABLE COMPONENTS
========================= */

function MetricCard({
  title,
  value,
  subtitle,
  icon,
  iconBg,
  iconColor,
}) {
  return (
    <div
      style={{
        background:
          "#ffffff",
        border:
          "1px solid #e9d5ff",
        borderRadius:
          "15px",
        padding:
          "20px",
        display:
          "flex",
        alignItems:
          "center",
        gap: "14px",
      }}
    >
      <div
        style={{
          width: "44px",
          height: "44px",
          borderRadius:
            "12px",
          background:
            iconBg,
          color:
            iconColor,
          display:
            "flex",
          alignItems:
            "center",
          justifyContent:
            "center",
          fontWeight:
            "800",
          fontSize:
            "16px",
          flexShrink: 0,
        }}
      >
        {icon}
      </div>

      <div>
        <div
          style={{
            fontSize:
              "12px",
            color:
              "#8b5cf6",
            marginBottom:
              "4px",
          }}
        >
          {title}
        </div>

        <div
          style={{
            fontSize:
              "23px",
            fontWeight:
              "800",
            color:
              "#4c1d95",
          }}
        >
          {value}
        </div>

        <div
          style={{
            fontSize:
              "10px",
            color:
              "#a78bfa",
            marginTop:
              "2px",
          }}
        >
          {subtitle}
        </div>
      </div>
    </div>
  );
}

function PredictionCard({
  title,
  subtitle,
  value,
  unit,
  description,
  buttonText,
  loading,
  onClick,
  color,
}) {
  return (
    <div
      style={{
        background:
          "#ffffff",
        border:
          "1px solid #e9d5ff",
        borderRadius:
          "16px",
        padding:
          "22px",
      }}
    >
      <div
        style={{
          display:
            "flex",
          justifyContent:
            "space-between",
          alignItems:
            "flex-start",
        }}
      >
        <div>
          <h3
            style={{
              margin: 0,
              fontSize:
                "17px",
              color:
                "#4c1d95",
            }}
          >
            {title}
          </h3>

          <div
            style={{
              fontSize:
                "11px",
              color,
              marginTop:
                "5px",
              fontWeight:
                "600",
            }}
          >
            {subtitle}
          </div>
        </div>

        <div
          style={{
            width: "42px",
            height: "42px",
            borderRadius:
              "11px",
            background:
              "#f3e8ff",
            color,
            display:
              "flex",
            alignItems:
              "center",
            justifyContent:
              "center",
            fontWeight:
              "800",
          }}
        >
          AI
        </div>
      </div>

      <p
        style={{
          color:
            "#8b5cf6",
          fontSize:
            "12px",
          lineHeight:
            "1.6",
          margin:
            "15px 0",
        }}
      >
        {description}
      </p>

      <div
        style={{
          background:
            "#faf5ff",
          borderRadius:
            "11px",
          padding:
            "14px",
          marginBottom:
            "13px",
        }}
      >
        <div
          style={{
            fontSize:
              "10px",
            color:
              "#a78bfa",
            marginBottom:
              "4px",
          }}
        >
          LATEST PREDICTION
        </div>

        <div
          style={{
            fontSize:
              "25px",
            fontWeight:
              "800",
            color:
              "#4c1d95",
          }}
        >
          {value !==
            null &&
          value !==
            undefined
            ? `${value}${unit}`
            : "--"}
        </div>
      </div>

      <button
        onClick={
          onClick
        }
        disabled={
          loading
        }
        style={{
          width: "100%",
          border: "none",
          borderRadius:
            "9px",
          padding:
            "11px",
          background:
            color,
          color: "white",
          cursor:
            loading
              ? "not-allowed"
              : "pointer",
          fontWeight:
            "600",
          fontSize:
            "12px",
        }}
      >
        {loading
          ? "Running model..."
          : buttonText}
      </button>
    </div>
  );
}

function PredictionForm({
  title,
  subtitle,
  input,
  setInput,
  type,
  onPredict,
  loading,
  result,
}) {
  const fields =
    type === "occupancy"
      ? [
          [
            "Room_Capacity",
            "Room Capacity",
          ],
          [
            "Class_Duration",
            "Class Duration",
          ],
          [
            "Attendance_Percentage",
            "Attendance %",
          ],
          [
            "Previous_Occupancy",
            "Previous Occupancy",
          ],
          [
            "Computer_Count",
            "Computer Count",
          ],
          [
            "AC_Hours",
            "AC Hours",
          ],
          [
            "Light_Hours",
            "Light Hours",
          ],
          [
            "Fan_Hours",
            "Fan Hours",
          ],
          [
            "Day_of_Week",
            "Day of Week",
          ],
          [
            "Month",
            "Month",
          ],
        ]
      : [
          [
            "Room_Capacity",
            "Room Capacity",
          ],
          [
            "Total_Students",
            "Total Students",
          ],
          [
            "Class_Duration",
            "Class Duration",
          ],
          [
            "Computer_Count",
            "Computer Count",
          ],
          [
            "AC_Hours",
            "AC Hours",
          ],
          [
            "Light_Hours",
            "Light Hours",
          ],
          [
            "Fan_Hours",
            "Fan Hours",
          ],
          [
            "Day_of_Week",
            "Day of Week",
          ],
          [
            "Month",
            "Month",
          ],
        ];

  return (
    <div
      style={{
        background:
          "#ffffff",
        border:
          "1px solid #e9d5ff",
        borderRadius:
          "16px",
        padding:
          "24px",
      }}
    >
      <h2
        style={{
          margin: 0,
          fontSize:
            "19px",
          color: "#4c1d95",
        }}
      >
        {title}
      </h2>

      <p
        style={{
          margin:
            "5px 0 22px",
          color:
            "#7c3aed",
          fontSize:
            "12px",
          fontWeight:
            "600",
        }}
      >
        {subtitle}
      </p>

      <div
        style={{
          display:
            "grid",
          gridTemplateColumns:
            "1fr 1fr",
          gap: "13px",
        }}
      >
        {fields.map(
          ([key, label]) => (
            <label
              key={key}
            >
              <div
                style={{
                  fontSize:
                    "11px",
                  color:
                    "#6d28d9",
                  marginBottom:
                    "5px",
                }}
              >
                {label}
              </div>

              <input
                type="number"
                value={
                  input[key]
                }
                onChange={(
                  e
                ) =>
                  setInput({
                    ...input,
                    [key]:
                      Number(
                        e.target
                          .value
                      ),
                  })
                }
                style={{
                  width:
                    "100%",
                  boxSizing:
                    "border-box",
                  padding:
                    "10px 11px",
                  border:
                    "1px solid #d8b4fe",
                  borderRadius:
                    "8px",
                  outline:
                    "none",
                }}
              />
            </label>
          )
        )}
      </div>

      <button
        onClick={
          onPredict
        }
        disabled={
          loading
        }
        style={{
          width: "100%",
          marginTop:
            "20px",
          padding:
            "12px",
          border: "none",
          borderRadius:
            "9px",
          background:
            "#7c3aed",
          color: "white",
          fontWeight:
            "600",
          cursor:
            loading
              ? "not-allowed"
              : "pointer",
        }}
      >
        {loading
          ? "Running ML Model..."
          : "Run Prediction"}
      </button>

      <div
        style={{
          marginTop:
            "18px",
          padding:
            "18px",
          borderRadius:
            "11px",
          background:
            "#faf5ff",
          textAlign:
            "center",
        }}
      >
        <div
          style={{
            fontSize:
              "10px",
            color:
              "#7c3aed",
            fontWeight:
              "700",
          }}
        >
          PREDICTED RESULT
        </div>

        <div
          style={{
            fontSize:
              "28px",
            fontWeight:
              "800",
            marginTop:
              "5px",
            color:
              "#4c1d95",
          }}
        >
          {result !==
          null
            ? `${result}${
                type ===
                "occupancy"
                  ? "%"
                  : " kWh"
              }`
            : "--"}
        </div>
      </div>
    </div>
  );
}

function OptimizationInput({
  label,
  value,
  onChange,
}) {
  return (
    <label>
      <div
        style={{
          fontSize:
            "11px",
          color:
            "#6d28d9",
          marginBottom:
            "5px",
        }}
      >
        {label}
      </div>

      <input
        type="number"
        min="0"
        value={value}
        onChange={(e) =>
          onChange(
            Number(
              e.target.value
            )
          )
        }
        style={{
          width:
            "100%",
          boxSizing:
            "border-box",
          padding:
            "10px 11px",
          border:
            "1px solid #d8b4fe",
          borderRadius:
            "8px",
          outline:
            "none",
          fontSize:
            "13px",
        }}
      />
    </label>
  );
}

function OptimizationResult({
  label,
  value,
  bg,
  color,
}) {
  return (
    <div
      style={{
        padding:
          "15px",
        background:
          bg,
        borderRadius:
          "11px",
        textAlign:
          "center",
      }}
    >
      <div
        style={{
          fontSize:
            "10px",
          color:
            "#8b5cf6",
          marginBottom:
            "5px",
        }}
      >
        {label}
      </div>

      <div
        style={{
          fontSize:
            "20px",
          fontWeight:
            "800",
          color,
        }}
      >
        {value}
      </div>
    </div>
  );
}

function RecommendationBox({
  title,
  value,
  description,
  color,
}) {
  return (
    <div
      style={{
        background:
          "#ffffff",
        border:
          "1px solid #e9d5ff",
        borderRadius:
          "10px",
        padding:
          "14px",
      }}
    >
      <div
        style={{
          display:
            "flex",
          alignItems:
            "center",
          justifyContent:
            "space-between",
          marginBottom:
            "6px",
        }}
      >
        <span
          style={{
            fontWeight:
              "700",
            fontSize:
              "12px",
            color:
              "#6d28d9",
          }}
        >
          {title}
        </span>

        <span
          style={{
            color,
            fontWeight:
              "800",
            fontSize:
              "15px",
          }}
        >
          {value}
        </span>
      </div>

      <div
        style={{
          color:
            "#a78bfa",
          fontSize:
            "10px",
        }}
      >
        {description}
      </div>
    </div>
  );
}

function StatusBox({
  label,
  value,
  color,
}) {
  return (
    <div
      style={{
        padding:
          "10px",
        borderRadius:
          "9px",
        background:
          "#faf5ff",
        textAlign:
          "center",
      }}
    >
      <div
        style={{
          fontSize:
            "20px",
          fontWeight:
            "800",
          color,
        }}
      >
        {value}
      </div>

      <div
        style={{
          fontSize:
            "10px",
          color:
            "#8b5cf6",
          marginTop:
            "2px",
        }}
      >
        {label}
      </div>
    </div>
  );
}

function MiniResult({
  label,
  value,
}) {
  return (
    <div
      style={{
        padding:
          "13px",
        background:
          "#faf5ff",
        borderRadius:
          "10px",
      }}
    >
      <div
        style={{
          fontSize:
            "10px",
          color:
            "#a78bfa",
          marginBottom:
            "5px",
        }}
      >
        {label}
      </div>

      <div
        style={{
          fontWeight:
            "800",
          fontSize:
            "16px",
          color:
            "#4c1d95",
        }}
      >
        {value}
      </div>
    </div>
  );
}

function ModelCard({
  title,
  model,
  metric,
  description,
}) {
  return (
    <div
      style={{
        background:
          "#ffffff",
        border:
          "1px solid #e9d5ff",
        borderRadius:
          "14px",
        padding:
          "18px",
      }}
    >
      <div
        style={{
          fontSize:
            "11px",
          color:
            "#8b5cf6",
        }}
      >
        {title}
      </div>

      <div
        style={{
          display:
            "flex",
          justifyContent:
            "space-between",
          alignItems:
            "center",
          marginTop:
            "9px",
        }}
      >
        <strong
          style={{
            fontSize:
              "16px",
            color:
              "#4c1d95",
          }}
        >
          {model}
        </strong>

        <span
          style={{
            background:
              "#f3e8ff",
            color:
              "#7c3aed",
            padding:
              "5px 9px",
            borderRadius:
              "15px",
            fontSize:
              "11px",
            fontWeight:
              "700",
          }}
        >
          {metric}
        </span>
      </div>

      <div
        style={{
          marginTop:
            "7px",
          color:
            "#a78bfa",
          fontSize:
            "11px",
        }}
      >
        {description}
      </div>
    </div>
  );
}

function ReportModelCard({
  title,
  model,
  mae,
  rmse,
  r2,
}) {
  return (
    <div
      style={{
        background:
          "#ffffff",
        border:
          "1px solid #e9d5ff",
        borderRadius:
          "16px",
        padding:
          "23px",
      }}
    >
      <div
        style={{
          fontSize:
            "11px",
          color:
            "#7c3aed",
          fontWeight:
            "700",
        }}
      >
        {title}
      </div>

      <h2
        style={{
          margin:
            "7px 0 18px",
          color:
            "#4c1d95",
        }}
      >
        {model}
      </h2>

      <div
        style={{
          display:
            "grid",
          gridTemplateColumns:
            "repeat(3,1fr)",
          gap: "10px",
        }}
      >
        <MiniResult
          label="MAE"
          value={mae}
        />

        <MiniResult
          label="RMSE"
          value={rmse}
        />

        <MiniResult
          label="R²"
          value={r2}
        />
      </div>
    </div>
  );
}

function Insight({
  title,
  text,
}) {
  return (
    <div
      style={{
        padding:
          "17px",
        borderRadius:
          "12px",
        background:
          "#faf5ff",
        border:
          "1px solid #f3e8ff",
      }}
    >
      <div
        style={{
          fontWeight:
            "700",
          color:
            "#4c1d95",
          marginBottom:
            "7px",
        }}
      >
        {title}
      </div>

      <div
        style={{
          color:
            "#8b5cf6",
          fontSize:
            "12px",
          lineHeight:
            "1.6",
        }}
      >
        {text}
      </div>
    </div>
  );
}

function SettingRow({
  title,
  value,
}) {
  return (
    <div
      style={{
        display:
          "flex",
        justifyContent:
          "space-between",
        alignItems:
          "center",
        padding:
          "16px 0",
        borderBottom:
          "1px solid #f3e8ff",
      }}
    >
      <span
        style={{
          fontWeight:
            "600",
          color:
            "#6d28d9",
        }}
      >
        {title}
      </span>

      <span
        style={{
          color:
            "#8b5cf6",
          fontSize:
            "13px",
        }}
      >
        {value}
      </span>
    </div>
  );
}

function HelpCard({
  title,
  text,
}) {
  return (
    <div
      style={{
        padding:
          "18px",
        border:
          "1px solid #e9d5ff",
        borderRadius:
          "12px",
        background:
          "#ffffff",
      }}
    >
      <h3
        style={{
          margin:
            "0 0 7px",
          fontSize:
            "15px",
          color:
            "#4c1d95",
        }}
      >
        {title}
      </h3>

      <p
        style={{
          margin: 0,
          color:
            "#8b5cf6",
          fontSize:
            "12px",
          lineHeight:
            "1.6",
        }}
      >
        {text}
      </p>
    </div>
  );
}

const tableHead = {
  padding: "12px",
  textAlign: "left",
  color: "#7c3aed",
  fontWeight: "600",
  fontSize: "11px",
  borderBottom:
    "1px solid #e9d5ff",
};

const tableCell = {
  padding:
    "13px 12px",
  borderBottom:
    "1px solid #f3e8ff",
  color:
    "#6d28d9",
};

export default App;