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

const API_URL = "https://smartclassai-backend-kj72.onrender.com";


function DashboardPageWrapper({ render }) {
  return render();
}

function ClassroomsPageWrapper({ render }) {
  return render();
}

function PredictionsPageWrapper({ render }) {
  return render();
}

function AnalyticsPageWrapper({ render }) {
  return render();
}

function DataManagementPageWrapper({ render }) {
  return render();
}

function ReportsPageWrapper({ render }) {
  return render();
}

function SettingsPageWrapper({ render }) {
  return render();
}

function HelpPageWrapper({ render }) {
  return render();
}

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authMode, setAuthMode] = useState("login");

  const [activePage, setActivePage] = useState("Dashboard");
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("smartclassai_user")) || null;
    } catch {
      return null;
    }
  });
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
    if (isAuthenticated) {
      loadClassrooms();
    }
  }, [isAuthenticated]);

  if (!isAuthenticated) {
  return (
    <AuthPage
      mode={authMode}
      onModeChange={setAuthMode}
      onAuthenticated={() => {
        try {
          const savedUser = JSON.parse(
            localStorage.getItem("smartclassai_user")
          );

          setCurrentUser(savedUser);
        } catch {
          setCurrentUser(null);
        }

        setIsAuthenticated(true);
      }}
    />
  );
}

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
                fontSize: "10px",
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
              padding: "15px 16px",
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
            bottom: "18px",
            left: "16px",
            right: "16px",
            color: "#ede9fe",
          }}
        >
          <div
            style={{
              padding: "0 12px 12px",
              fontSize: "10px",
              lineHeight: "1.45",
              color: "#ede9fe",
            }}
          >
            <div>AI-Powered Classroom</div>
            <div style={{ marginTop: "3px" }}>
              Utilization & Energy Optimizer
            </div>
          </div>

          <div
            style={{
              borderTop: "1px solid rgba(255,255,255,0.25)",
              paddingTop: "12px",
            }}
          >
            <button
              onClick={() => setActivePage("Profile")}
              style={{
                width: "100%",
                border: "none",
                borderRadius: "10px",
                padding: "11px 14px",
                background:
                  activePage === "Profile"
                    ? "rgba(255,255,255,0.22)"
                    : "transparent",
                color: "#ffffff",
                display: "flex",
                alignItems: "center",
                gap: "13px",
                cursor: "pointer",
                fontSize: "14px",
                textAlign: "left",
                fontWeight: activePage === "Profile" ? "700" : "500",
                boxShadow:
                  activePage === "Profile"
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
                ◉
              </span>
              Profile
            </button>
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
            padding: "6px 11px",
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
    position: "absolute",
    inset: 0,
    width: "100%",
    height: "100%",
    zIndex: 0,
    overflow: "hidden",
    borderRadius: "18px",
  }}
>
  <img
    src="/smartclassai_classroom_ai_poster.png"
    alt="Smart Classroom Operations"
    style={{
      width: "100%",
      height: "100%",
      objectFit: "cover",
      objectPosition: "center",
      display: "block",
    }}
  />
</div>

<div
  style={{
    position: "absolute",
    inset: 0,
    zIndex: 1,
    background: "rgba(45, 15, 90, 0.35)",
    borderRadius: "18px",
  }}
/>
  <div
  style={{
    position: "relative",
    zIndex: 2,
    maxWidth: "700px",
  }}
>
  {/* AI-POWERED CLASSROOM INTELLIGENCE */}
  <div
    style={{
      display: "inline-block",
      padding: "6px 13px",
      marginBottom: "13px",
      borderRadius: "20px",
      background: "rgba(196, 181, 253, 0.28)",
      backdropFilter: "blur(6px)",
      WebkitBackdropFilter: "blur(6px)",
      border: "1px solid rgba(255,255,255,0.20)",
    }}
  >
    <div
      style={{
        fontSize: "10px",
        fontWeight: "700",
        color: "#ffffff",
        textShadow: "0 1px 5px rgba(45, 15, 90, 0.45)",
      }}
    >
      ✦ AI-POWERED CLASSROOM INTELLIGENCE
    </div>
  </div>

  {/* SMART CLASSROOM OPERATIONS */}
  <div
  style={{
    display: "inline-block",
    padding: "7px 15px",
    marginBottom: "9px",
    borderRadius: "11px",
    background: "rgba(196, 181, 253, 0.30)",
    backdropFilter: "blur(7px)",
    WebkitBackdropFilter: "blur(7px)",
    border: "1px solid rgba(255,255,255,0.16)",
  }}
  >
   <h1
  style={{
    margin: 0,
    fontSize: "32px",
    lineHeight: "1.1",
    fontWeight: "900",
    color: "#ffffff",
    letterSpacing: "-0.5px",
    textShadow: "0 2px 6px rgba(35, 10, 75, 0.35)",
    WebkitTextFillColor: "#ffffff",
  }}
>
  Smart Classroom Operations
</h1>
  </div>

  {/* DESCRIPTION */}
  <div
    style={{
      display: "inline-block",
      maxWidth: "650px",
      padding: "8px 14px",
      borderRadius: "11px",
      background: "rgba(196, 181, 253, 0.20)",
      backdropFilter: "blur(7px)",
      WebkitBackdropFilter: "blur(7px)",
      border: "1px solid rgba(255,255,255,0.14)",
    }}
  >
    <p
      style={{
        margin: 0,
        color: "#ffffff",
        lineHeight: "1.6",
        fontSize: "14px",
        textShadow: "0 1px 6px rgba(35, 10, 75, 0.40)",
      }}
    >
      Monitor classroom utilization, predict occupancy and energy
      consumption, and make smarter room allocation decisions using
      machine learning.
    </p>
  </div>
  </div>
</div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(4, 1fr)",
          gap: "14px",
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
          gap: "24px",
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
          gap: "24px",
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
                        fontSize: "10px",
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
                          fontSize: "10px",
                          color: "#8b5cf6",
                        }}
                      >
                        Usage
                      </span>

                      <span
                        style={{
                          fontSize: "10px",
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
  type="text"
  inputMode="numeric"
  placeholder="Enter number of students"
  value={
    students === undefined ||
    students === null ||
    students === ""
      ? "0"
      : String(students)
  }
  onFocus={(e) => {
    e.target.select();
  }}
  onKeyDown={(e) => {
    const currentValue = String(
      students ?? 0
    );

    if (
      (e.key === "Backspace" ||
        e.key === "Delete") &&
      currentValue === "0"
    ) {
      e.preventDefault();
    }

    if (
      e.key === "." ||
      e.key === "," ||
      e.key === "e" ||
      e.key === "E" ||
      e.key === "+" ||
      e.key === "-"
    ) {
      e.preventDefault();
    }
  }}
  onChange={(e) => {
    const rawValue =
      e.target.value.replace(/\D/g, "");

    if (rawValue === "") {
      setStudents(0);
      return;
    }

    const normalized =
      rawValue.replace(
        /^0+(?=\d)/,
        ""
      );

    setStudents(
      normalized === ""
        ? 0
        : Number(normalized)
    );
  }}
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
          gap: "14px",
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
            gap: "14px",
            marginBottom: "26px",
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
              position:
                "relative",
            }}
          >
            <div
              style={{
                paddingTop:
                  "32px",
              }}
            >
              <h2
                style={{
                  margin: 0,
                  fontSize:
                    "19px",
                  color:
                    "#4c1d95",
                  position:
                    "absolute",
                  top: 0,
                  left:
                    "50%",
                  transform:
                    "translateX(-50%)",
                  whiteSpace:
                    "nowrap",
                      textAlign: "center",
                }}
              >
                AI Energy Optimization
              </h2>

             <p
  style={{
    margin: 0,
    color: "#8b5cf6",
    fontSize: "12px",
    lineHeight: "1.6",
    position: "absolute",
    top: "32px",
    left: "50%",
    transform: "translateX(-50%)",
    width: "calc(100% - 180px)",
    textAlign: "center",
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
                "repeat(4, minmax(0, 1fr))",
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
            gap: "24px",
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
          marginBottom: "26px",
          position: "relative",
          overflow: "hidden",
        }}
      >
<div
  style={{
    position: "relative",
    zIndex: 1,
    width: "100%",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    textAlign: "center",
  }}
>          <div
            style={{
              display: "inline-block",
              padding: "5px 10px",
              background:
                "rgba(255,255,255,0.16)",
              borderRadius: "20px",
              fontSize: "10px",
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
              textAlign: "center",
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
              textAlign: "center",
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
          gap: "24px",
          marginBottom: "26px",
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
                fontSize: "10px",
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
                  fontSize: "10px",
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
                    fontSize: "10px",
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
                fontSize: "10px",
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
              width: "100%",
boxSizing: "border-box",
textAlign: "center",
          }}
        >
          <div
            style={{
              fontSize:
                "20px",
              color:
                "#f3e8ff",
              fontWeight:
                "900",
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
              fontSize: "23px"
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
                 margin: "0 auto",
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
            gap: "14px",
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
            gap: "24px",
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
            value="http://https://smartclassai-backend-kj72.onrender.com"
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
   PROFILE PAGE
========================= */

const ProfilePage = () => {
  const [editing, setEditing] = useState(false);

  const [profileForm, setProfileForm] = useState({
    collegeName: currentUser?.college_name || "",
    collegeId: currentUser?.college_id || "",
    email: currentUser?.email || "",
    role: currentUser?.role || "College User",
  });

  const updateProfileField = (field, value) => {
    setProfileForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  };

  const saveProfile = () => {
    const updatedUser = {
      ...(currentUser || {}),
      college_name: profileForm.collegeName.trim(),
      college_id: profileForm.collegeId.trim(),
      email: profileForm.email.trim(),
      role: profileForm.role.trim() || "College User",
    };

    setCurrentUser(updatedUser);

    localStorage.setItem(
      "smartclassai_user",
      JSON.stringify(updatedUser)
    );

    setEditing(false);
  };

  const logout = () => {
    localStorage.removeItem(
      "smartclassai_access_token"
    );

    localStorage.removeItem(
      "smartclassai_user"
    );

    setCurrentUser(null);
    setIsAuthenticated(false);
    setAuthMode("login");
    setActivePage("Dashboard");
  };

  const labelStyle = {
    display: "block",
    marginBottom: "6px",
    color: "#6d28d9",
    fontSize: "11px",
    fontWeight: "700",
  };

  const fieldStyle = {
    width: "100%",
    boxSizing: "border-box",
    padding: "10px 13px",
    border: "1px solid #e9d5ff",
    borderRadius: "10px",
    fontSize: "13px",
    color: "#4c1d95",
    background: editing
      ? "#ffffff"
      : "#faf7ff",
    outline: "none",
  };

  const collegeName =
    profileForm.collegeName ||
    "Asmita College BSc.IT & Computer Science";

  const displayRole =
    profileForm.role ||
    "College User";

  return (
    <div
      style={{
        padding: "18px 28px 34px",
      }}
    >
      {/* Profile Heading */}
      <div
        style={{
          marginBottom: "20px",
        }}
      >
        <h1
          style={{
            margin: 0,
            color: "#32127a",
            fontSize: "28px",
            lineHeight: 1.15,
            fontWeight: "800",
          }}
        >
          Profile
        </h1>

        <p
          style={{
            margin: "5px 0 0",
            color: "#8b6fd8",
            fontSize: "12px",
          }}
        >
          Manage your SmartClassAI account and organization details.
        </p>
      </div>

      {/* Account Information */}
      <div
        style={{
          background: "#ffffff",
          border: "1px solid #e9d5ff",
          borderRadius: "18px",
          padding: "22px 26px 26px",
          boxShadow:
            "0 8px 25px rgba(109,40,217,0.04)",
          marginBottom: "18px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "15px",
            marginBottom: "20px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
            }}
          >
            {/* AC - Asmita College */}
            <div
              style={{
                width: "46px",
                height: "46px",
                borderRadius: "12px",
                background:
                  "linear-gradient(135deg, #ede9fe, #ddd6fe)",
                color: "#6d28d9",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "16px",
                fontWeight: "800",
                border: "1px solid #ddd6fe",
                flexShrink: 0,
              }}
            >
              AC
            </div>

            <div>
              <h2
                style={{
                  margin: 0,
                  color: "#4c1d95",
                  fontSize: "18px",
                }}
              >
                Account Information
              </h2>

              <p
                style={{
                  margin: "4px 0 0",
                  color: "#a78bfa",
                  fontSize: "11px",
                }}
              >
                Asmita College BSc.IT & Computer Science
              </p>
            </div>
          </div>

          {!editing && (
            <button
              onClick={() =>
                setEditing(true)
              }
              style={{
                border: "none",
                background: "#6d28d9",
                color: "#ffffff",
                borderRadius: "9px",
                padding: "10px 17px",
                cursor: "pointer",
                fontWeight: "700",
                fontSize: "12px",
              }}
            >
              Edit Profile
            </button>
          )}
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(2, minmax(0, 1fr))",
            gap: "18px",
          }}
        >
          {[
            ["College Name", "collegeName"],
            ["College ID", "collegeId"],
            ["Email Address", "email"],
            ["Role", "role"],
          ].map(
            ([label, field]) => (
              <div key={field}>
                <label
                  style={labelStyle}
                >
                  {label}
                </label>

                <input
                  style={fieldStyle}
                  value={
                    profileForm[field]
                  }
                  onChange={(e) =>
                    updateProfileField(
                      field,
                      e.target.value
                    )
                  }
                  disabled={!editing}
                />
              </div>
            )
          )}
        </div>

        {editing && (
          <div
            style={{
              display: "flex",
              justifyContent:
                "flex-end",
              gap: "10px",
              marginTop: "20px",
            }}
          >
            <button
              onClick={() =>
                setEditing(false)
              }
              style={{
                border:
                  "1px solid #ddd6fe",
                background:
                  "#ffffff",
                color: "#6d28d9",
                borderRadius: "9px",
                padding:
                  "10px 17px",
                cursor:
                  "pointer",
                fontWeight:
                  "700",
                fontSize:
                  "12px",
              }}
            >
              Cancel
            </button>

            <button
              onClick={saveProfile}
              style={{
                border: "none",
                background:
                  "#6d28d9",
                color:
                  "#ffffff",
                borderRadius:
                  "9px",
                padding:
                  "10px 17px",
                cursor:
                  "pointer",
                fontWeight:
                  "700",
                fontSize:
                  "12px",
              }}
            >
              Save Profile
            </button>
          </div>
        )}
      </div>

      {/* Organization + Security */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(2, minmax(0, 1fr))",
          gap: "18px",
        }}
      >
        {/* Organization */}
        <div
          style={{
            background: "#ffffff",
            border:
              "1px solid #e9d5ff",
            borderRadius: "18px",
            padding: "22px 26px",
            boxShadow:
              "0 8px 25px rgba(109,40,217,0.04)",
          }}
        >
          <h2
            style={{
              margin: 0,
              color: "#4c1d95",
              fontSize: "17px",
            }}
          >
            Organization
          </h2>

          <p
            style={{
              margin:
                "5px 0 16px",
              color: "#a78bfa",
              fontSize: "11px",
            }}
          >
            Institution associated with this account
          </p>

          <div
            style={{
              padding: "17px",
              borderRadius: "12px",
              background: "#faf7ff",
              border:
                "1px solid #f3e8ff",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
              }}
            >
              <div
                style={{
                  width: "42px",
                  height: "42px",
                  borderRadius: "11px",
                  background:
                    "#ede9fe",
                  color: "#6d28d9",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: "800",
                  fontSize: "14px",
                }}
              >
                AC
              </div>

              <div>
                <div
                  style={{
                    color: "#a78bfa",
                    fontSize: "9px",
                    fontWeight: "700",
                  }}
                >
                  COLLEGE / INSTITUTION
                </div>

                <div
                  style={{
                    marginTop: "5px",
                    color: "#4c1d95",
                    fontSize: "12px",
                    fontWeight: "700",
                  }}
                >
                  {collegeName}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Account Security */}
        <div
          style={{
            background: "#ffffff",
            border:
              "1px solid #e9d5ff",
            borderRadius: "18px",
            padding: "22px 26px",
            boxShadow:
              "0 8px 25px rgba(109,40,217,0.04)",
          }}
        >
          <h2
            style={{
              margin: 0,
              color: "#4c1d95",
              fontSize: "17px",
            }}
          >
            Account Security
          </h2>

          <p
            style={{
              margin:
                "5px 0 16px",
              color: "#a78bfa",
              fontSize: "11px",
            }}
          >
            Security and account status
          </p>

          <div
            style={{
              padding:
                "13px 15px",
              borderRadius:
                "11px",
              background:
                "#ecfdf5",
              marginBottom:
                "10px",
              color:
                "#047857",
            }}
          >
            <div
              style={{
                fontSize: "11px",
                fontWeight: "700",
              }}
            >
              ✓ Email Verification
            </div>

            <div
              style={{
                marginTop: "4px",
                fontSize: "10px",
              }}
            >
              Email address verified
            </div>
          </div>

          <div
            style={{
              padding:
                "13px 15px",
              borderRadius:
                "11px",
              background:
                "#faf7ff",
              color:
                "#6d28d9",
            }}
          >
            <div
              style={{
                fontSize: "11px",
                fontWeight: "700",
              }}
            >
              ● Account Status
            </div>

            <div
              style={{
                marginTop: "4px",
                fontSize: "10px",
              }}
            >
              Active and ready to use
            </div>
          </div>
        </div>
      </div>

      {/* Logout */}
      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          marginTop: "16px",
        }}
      >
        <button
          onClick={logout}
          style={{
            border:
              "1px solid #fecaca",
            background:
              "#fff1f2",
            color:
              "#be123c",
            borderRadius: "9px",
            padding:
              "10px 17px",
            cursor:
              "pointer",
            fontWeight:
              "700",
            fontSize:
              "12px",
          }}
        >
          Logout
        </button>
      </div>
    </div>
  );
};

  /* =========================
     PAGE ROUTING
  ========================= */

  const renderPage = () => {
    switch (activePage) {
      case "Dashboard":
        return <DashboardPageWrapper render={DashboardPage} />;

      case "Classrooms":
        return <ClassroomsPageWrapper render={ClassroomsPage} />;

      case "Predictions":
        return <PredictionsPageWrapper render={PredictionsPage} />;

      case "Analytics":
        return <AnalyticsPageWrapper render={AnalyticsPage} />;

      case "Data Management":
        return <DataManagementPageWrapper render={DataManagementPage} />;

      case "Reports":
        return <ReportsPageWrapper render={ReportsPage} />;

      case "Settings":
        return <SettingsPageWrapper render={SettingsPage} />;

      case "Help":
        return <HelpPageWrapper render={HelpPage} />;

      case "Profile":
        return <ProfilePage />;

      default:
        return <DashboardPageWrapper render={DashboardPage} />;
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
   AUTHENTICATION PAGE
========================= */

function AuthPage({
  mode,
  onModeChange,
  onAuthenticated,
}) {
  const [form, setForm] = useState({
    collegeName: "",
    collegeId: "",
    email: "",
    password: "",
    confirmPassword: "",
    otp: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [otpSent, setOtpSent] = useState(false);

  const updateField = (field, value) => {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  };

  const switchMode = (nextMode) => {
    setOtpSent(false);
    setForm({
      collegeName: "",
      collegeId: "",
      email: "",
      password: "",
      confirmPassword: "",
      otp: "",
    });
    onModeChange(nextMode);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (mode === "register") {
      if (otpSent) {
        if (!form.otp.trim()) {
          alert("Please enter the 6-digit OTP.");
          return;
        }

        try {
          const response = await fetch(
            "https://smartclassai-backend-kj72.onrender.com/auth/verify-registration",
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                college_id: form.collegeId.trim(),
                email: form.email.trim(),
                otp: form.otp.trim(),
              }),
            }
          );

          const data = await response.json();

          if (!response.ok) {
            throw new Error(
              data.detail ||
                data.message ||
                "OTP verification failed."
            );
          }

          alert(
            data.message ||
              "Email verified successfully. Your college account has been created."
          );
          switchMode("login");
        } catch (error) {
          alert(
            error.message ||
              "Unable to verify the OTP."
          );
        }

        return;
      }

      if (
        !form.collegeName.trim() ||
        !form.collegeId.trim() ||
        !form.email.trim() ||
        !form.password ||
        !form.confirmPassword
      ) {
        alert("Please fill in all required fields.");
        return;
      }

      if (form.password !== form.confirmPassword) {
        alert("Password and confirm password do not match.");
        return;
      }

      try {
        const response = await fetch(
          "https://smartclassai-backend-kj72.onrender.com/auth/register",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              college_name: form.collegeName.trim(),
              college_id: form.collegeId.trim(),
              email: form.email.trim(),
              password: form.password,
              confirm_password: form.confirmPassword,
            }),
          }
        );

        const data = await response.json();
if (!response.ok) {
  const detail = Array.isArray(data.detail)
    ? data.detail
        .map((item) => item.msg || item.message || JSON.stringify(item))
        .join("\n")
    : data.detail;

  throw new Error(
    detail ||
      data.message ||
      "Registration failed."
  );
}

        setOtpSent(true);
        alert(
          data.message ||
            "Registration successful. An OTP has been sent to your registered email."
        );
      } catch (error) {
        alert(
          error.message ||
            "Unable to connect to the backend."
        );
      }

      return;
    }

    if (mode === "forgot") {
  // ==========================================
  // STEP 1: SEND PASSWORD RESET OTP
  // ==========================================
  if (!otpSent) {
    if (!form.email.trim() && !form.collegeId.trim()) {
      alert("Enter your registered College ID or email.");
      return;
    }

    try {
      const response = await fetch(
       "https://smartclassai-backend-kj72.onrender.com/auth/forgot-password/request",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            college_id: form.collegeId.trim() || null,
            email: form.email.trim() || null,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail ||
            data.message ||
            "Unable to send OTP."
        );
      }

      setOtpSent(true);

      alert(
        data.message ||
          "Password reset OTP has been sent to your registered email."
      );
    } catch (error) {
      alert(
        error.message ||
          "Unable to connect to the backend."
      );
    }

    return;
  }

  // ==========================================
  // STEP 2: VERIFY PASSWORD RESET OTP
  // ==========================================
  if (!form.otp.trim()) {
    alert("Please enter the 6-digit OTP.");
    return;
  }

  try {
    const response = await fetch(
      "https://smartclassai-backend-kj72.onrender.com/auth/forgot-password/verify",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          college_id: form.collegeId.trim() || null,
          email: form.email.trim() || null,
          otp: form.otp.trim(),
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.detail ||
          data.message ||
          "OTP verification failed."
      );
    }

    alert(
      data.message ||
        "OTP verified successfully."
    );

    // OTP is verified.
    // Password reset endpoint will be used
    // when the new password fields are added.
  } catch (error) {
    alert(
      error.message ||
        "Unable to verify the OTP."
    );
  }

  return;
}

    if (!form.collegeId.trim()) {
      alert("Enter your College ID or registered email.");
      return;
    }

    if (!form.password) {
      alert("Please enter your password.");
      return;
    }

    try {
      const response = await fetch(
        "https://smartclassai-backend-kj72.onrender.com/auth/login",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            college_id: form.collegeId.trim().includes('@')
              ? null
              : form.collegeId.trim(),
            email: form.collegeId.trim().includes('@')
              ? form.collegeId.trim()
              : null,
            password: form.password,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail ||
            data.message ||
            "Login failed."
        );
      }

      if (data.access_token) {
        localStorage.setItem(
          "smartclassai_access_token",
          data.access_token
        );
      }

      if (data.user) {
        localStorage.setItem(
          "smartclassai_user",
          JSON.stringify(data.user)
        );
      }
onAuthenticated();
} catch (error) {
  alert(
    Array.isArray(error.message)
      ? error.message
          .map((err) => err.msg || JSON.stringify(err))
          .join("\n")
      : error.message || "Unable to connect to the backend."
  );
}
  }


  const title =
    mode === "register"
      ? "Create your college account"
      : mode === "forgot"
        ? "Reset your password"
        : "Welcome back";

  const description =
    mode === "register"
      ? "Register your institution to use SmartClassAI."
      : mode === "forgot"
        ? "Verify your registered account and create a new password."
        : "Sign in to manage classrooms, predictions and energy optimization.";

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #faf7ff 0%, #f3e8ff 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "30px",
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: mode === "register" ? "560px" : "505px",
          background: "#ffffff",
          border: "1px solid #e9d5ff",
          borderRadius: "22px",
          boxShadow: "0 20px 60px rgba(109, 40, 217, 0.14)",
          overflow: "hidden",
          animation: "scaCardFloat 6s ease-in-out infinite",
        }}
      >
        <div
  className="sca-login-hero"
  style={{
    position: "relative",
    minHeight: "220px",
    boxSizing: "border-box",
    overflow: "hidden",
    background:
  "radial-gradient(circle at 15% 85%, rgba(255,255,255,0.10), transparent 32%), radial-gradient(circle at 82% 18%, rgba(255,255,255,0.13), transparent 30%), linear-gradient(135deg, #4c1d95 0%, #6d28d9 48%, #8b5cf6 100%)",
    color: "#ffffff",
  }}
>
  <style>{`
    @keyframes scaHeroGrid {
      from {
        transform: translate3d(0, 0, 0);
      }
      to {
        transform: translate3d(30px, 0, 0);
      }
    }

    @keyframes scaBubbleOne {
  0%, 100% {
    transform: translate(0, 0) scale(1);
    opacity: 0.55;
  }

  50% {
    transform: translate(-18px, 18px) scale(1.08);
    opacity: 0.82;
  }
}

@keyframes scaBubbleTwo {
  0%, 100% {
    transform: translate(0, 0) scale(1);
    opacity: 0.45;
  }

  50% {
    transform: translate(20px, -15px) scale(1.10);
    opacity: 0.72;
  }
}

@keyframes scaBubbleThree {
  0%, 100% {
    transform: translate(0, 0) scale(1);
    opacity: 0.35;
  }

  50% {
    transform: translate(15px, 12px) scale(1.08);
    opacity: 0.60;
  }
}

    @keyframes scaRobotFloat {
      0%, 100% {
        transform: translateY(0px);
      }
      50% {
        transform: translateY(-9px);
      }
    }

    @keyframes scaRobotTilt {
      0%, 100% {
        transform: rotate(0deg);
      }
      50% {
        transform: rotate(2deg);
      }
    }

    @keyframes scaRobotGlow {
      0%, 100% {
        transform: scale(.92);
        opacity: .55;
      }
      50% {
        transform: scale(1.08);
        opacity: .85;
      }
    }

    @keyframes scaSparkle {
      0%, 100% {
        opacity: .35;
        transform: scale(.85);
      }
      50% {
        opacity: 1;
        transform: scale(1.15);
      }
    }

    .sca-login-hero::before {
      content: "";
      position: absolute;
      inset: 0;

      background-image:
        linear-gradient(
          rgba(255,255,255,.055) 1px,
          transparent 1px
        ),
        linear-gradient(
          90deg,
          rgba(255,255,255,.055) 1px,
          transparent 1px
        );

      background-size: 30px 30px;
      opacity: .62;

      animation: scaHeroGrid 9s linear infinite;

      pointer-events: none;
      z-index: 0;
    }

    /* TOP-RIGHT BUBBLE */
.sca-login-orb-one {
  position: absolute;
  width: 210px;
  height: 210px;
  right: -55px;
  top: -95px;
  border-radius: 50%;

  background:
    radial-gradient(
      circle at 30% 28%,
      rgba(255,255,255,0.32) 0%,
      rgba(255,255,255,0.16) 22%,
      rgba(255,255,255,0.07) 48%,
      rgba(255,255,255,0.02) 68%,
      transparent 76%
    );

  border: 1px solid rgba(255,255,255,0.13);

  box-shadow:
    inset -18px -20px 35px rgba(74,20,140,0.12),
    inset 12px 10px 25px rgba(255,255,255,0.08),
    0 0 35px rgba(255,255,255,0.07);

  filter: blur(0.5px);
  animation: scaBubbleOne 7s ease-in-out infinite;

  pointer-events: none;
  z-index: 1;
}


/* BOTTOM-LEFT/MIDDLE BUBBLE */
.sca-login-orb-two {
  position: absolute;
  width: 190px;
  height: 190px;
  left: 75px;
  bottom: -125px;
  border-radius: 50%;

  background:
    radial-gradient(
      circle at 38% 25%,
      rgba(255,255,255,0.26) 0%,
      rgba(255,255,255,0.12) 25%,
      rgba(255,255,255,0.055) 52%,
      rgba(255,255,255,0.015) 70%,
      transparent 78%
    );

  border: 1px solid rgba(255,255,255,0.10);

  box-shadow:
    inset 15px 12px 25px rgba(255,255,255,0.06),
    inset -20px -20px 35px rgba(70,20,130,0.12),
    0 0 30px rgba(255,255,255,0.05);

  filter: blur(1px);
  animation: scaBubbleTwo 8s ease-in-out infinite;

  pointer-events: none;
  z-index: 1;
}


/* SMALLER BUBBLE */
.sca-login-orb-three {
  position: absolute;
  width: 105px;
  height: 105px;
  left: 205px;
  top: 5px;
  border-radius: 50%;

  background:
    radial-gradient(
      circle at 32% 28%,
      rgba(255,255,255,0.24) 0%,
      rgba(255,255,255,0.10) 30%,
      rgba(255,255,255,0.035) 58%,
      transparent 76%
    );

  border: 1px solid rgba(255,255,255,0.09);

  box-shadow:
    inset 10px 8px 18px rgba(255,255,255,0.07),
    0 0 25px rgba(255,255,255,0.05);

  filter: blur(1px);
  animation: scaBubbleThree 6s ease-in-out infinite;

  pointer-events: none;
  z-index: 1;
}

    /* ROBOT */
    .sca-login-robot {
  position: absolute;
  left: 25px;
  bottom: 5px;

  width: 190px;
  height: 190px;

  z-index: 4;

  display: flex;
  align-items: center;
  justify-content: center;

  animation: scaRobotFloat 4s ease-in-out infinite;

  filter: drop-shadow(
    0 12px 18px rgba(28, 7, 58, .28)
  );
}

    .sca-login-robot-glow {
      position: absolute;

      width: 125px;
      height: 125px;

      border-radius: 50%;

      background:
        rgba(255,255,255,.18);

      filter: blur(14px);

      animation:
        scaRobotGlow 3s ease-in-out infinite;

      z-index: 0;
    }

    .sca-login-robot img {
  position: relative;
  z-index: 2;

  width: 180px;
  height: 180px;

  object-fit: contain;

  animation: scaRobotTilt 4.5s ease-in-out infinite;
}

    /* SPARKLES */
    .sca-login-spark {
      position: absolute;

      z-index: 5;

      color: #ddd6fe;

      font-size: 14px;

      animation:
        scaSparkle 2.2s ease-in-out infinite;

      pointer-events: none;
    }

    .sca-login-spark-one {
      left: 145px;
      top: 58px;
    }

    .sca-login-spark-two {
      left: 76px;
      top: 35px;

      animation-delay: .8s;
    }

    .sca-login-spark-three {
      left: 170px;
      bottom: 38px;

      animation-delay: 1.3s;
    }

    /* BRAND */
    .sca-login-brand {
  position: absolute;

  left: 258px;
  right: 22px;
  top: 28px;

  z-index: 6;

  text-align: center;
}

    .sca-login-brand-name {
      font-size: 21px;
      line-height: 1.1;
      font-weight: 800;
    }

    .sca-login-brand-subtitle {
      margin-top: 5px;

      font-size: 11px;

      opacity: .9;
    }

    /* WELCOME TEXT */
    .sca-login-copy {
  position: absolute;

  left: 258px;
  right: 22px;
  top: 101px;

  z-index: 6;

  text-align: center;
}

    .sca-login-copy h1 {
      margin: 0;

      font-size: 29px;

      line-height: 1.15;

      font-weight: 850;
    }

    .sca-login-copy p {
      margin: 8px 0 0;

      font-size: 12px;

      line-height: 1.5;

      opacity: .92;
    }

    @media (max-width: 560px) {
      .sca-login-hero {
        min-height: 205px !important;
      }

      .sca-login-robot {
        left: 10px;
        bottom: 22px;

        width: 125px;
        height: 125px;
      }

      .sca-login-robot img {
        width: 115px;
        height: 115px;
      }

      .sca-login-brand,
      .sca-login-copy {
        left: 175px;
      }

      .sca-login-copy {
        right: 14px;
      }

      .sca-login-copy h1 {
        font-size: 24px;
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .sca-login-hero *,
      .sca-login-hero::before {
        animation: none !important;
      }
    }
  `}</style>

  {/* Animated bubbles */}
  <div className="sca-login-orb-one" />
  <div className="sca-login-orb-two" />
  <div className="sca-login-orb-three" />

  {/* Sparkles */}
  <span className="sca-login-spark sca-login-spark-one">
    ✦
  </span>

  <span className="sca-login-spark sca-login-spark-two">
    ✦
  </span>

  <span className="sca-login-spark sca-login-spark-three">
    ✦
  </span>

  {/* Robot */}
  <div className="sca-login-robot" aria-hidden="true">
    <div className="sca-login-robot-glow" />

    <img
      src="/profile-robot.png"
      alt="SmartClassAI AI Assistant"
    />
  </div>

  {/* Brand */}
  <div className="sca-login-brand">
    <div className="sca-login-brand-name">
      SmartClassAI
    </div>

    <div className="sca-login-brand-subtitle">
      Classroom Intelligence Platform
    </div>
  </div>

  {/* Welcome */}
  <div className="sca-login-copy">
    <h1>{title}</h1>

    <p>{description}</p>
  </div>
</div>

<div style={{ padding: "30px" }}>          {mode !== "forgot" && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "8px",
                padding: "5px",
                background: "#faf7ff",
                border: "1px solid #ede9fe",
                borderRadius: "12px",
                marginBottom: "24px",
              }}
            >
              <button
                type="button"
                onClick={() => switchMode("login")}
                style={{
                  border: "none",
                  borderRadius: "9px",
                  padding: "11px",
                  background: mode === "login" ? "#7c3aed" : "transparent",
                  color: mode === "login" ? "#ffffff" : "#6d28d9",
                  fontWeight: "700",
                  cursor: "pointer",
                }}
              >
                Login
              </button>

              <button
                type="button"
                onClick={() => switchMode("register")}
                style={{
                  border: "none",
                  borderRadius: "9px",
                  padding: "11px",
                  background: mode === "register" ? "#7c3aed" : "transparent",
                  color: mode === "register" ? "#ffffff" : "#6d28d9",
                  fontWeight: "700",
                  cursor: "pointer",
                }}
              >
                Create Account
              </button>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {mode === "register" && (
              <AuthField
                label="College Name"
                placeholder="Enter college name"
                value={form.collegeName}
                onChange={(value) => updateField("collegeName", value)}
              />
            )}

            <AuthField
              label={
                mode === "login"
                  ? "College ID or Email"
                  : "College ID"
              }
              placeholder={
                mode === "login"
                  ? "Enter College ID or Email"
                  : "Enter College ID"
              }
              value={form.collegeId}
              onChange={(value) =>
                updateField("collegeId", value)
              }
            />

            {mode !== "login" && (
              <AuthField
                label="Email"
                type="email"
                placeholder="college@example.com"
                value={form.email}
                onChange={(value) =>
                  updateField("email", value)
                }
              />
            )}

            {mode !== "forgot" && (
              <AuthPasswordField
                label="Password"
                placeholder="Enter password"
                value={form.password}
                visible={showPassword}
                onToggle={() => setShowPassword((value) => !value)}
                onChange={(value) => updateField("password", value)}
              />
            )}

            {mode === "register" && (
              <AuthPasswordField
                label="Confirm Password"
                placeholder="Re-enter password"
                value={form.confirmPassword}
                visible={showConfirmPassword}
                onToggle={() => setShowConfirmPassword((value) => !value)}
                onChange={(value) => updateField("confirmPassword", value)}
              />
            )}

            {otpSent && (
              <AuthField
                label="Email OTP"
                placeholder="Enter 6-digit OTP"
                value={form.otp}
                onChange={(value) => updateField("otp", value)}
                inputMode="numeric"
                maxLength={6}
              />
            )}

            {mode === "login" && (
              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  marginTop: "-4px",
                  marginBottom: "18px",
                }}
              >
                <button
                  type="button"
                  onClick={() => switchMode("forgot")}
                  style={{
                    border: "none",
                    background: "transparent",
                    color: "#7c3aed",
                    fontWeight: "700",
                    cursor: "pointer",
                    padding: 0,
                  }}
                >
                  Forgot Password?
                </button>
              </div>
            )}

            <button
              type="submit"
              style={{
                width: "100%",
                border: "none",
                borderRadius: "12px",
                padding: "14px",
                background: "linear-gradient(135deg, #6d28d9, #7c3aed)",
                color: "#ffffff",
                fontSize: "19px",
                fontWeight: "800",
                cursor: "pointer",
                boxShadow: "0 8px 20px rgba(124,58,237,0.22)",
              }}
            >
              {mode === "register"
                ? otpSent
                  ? "Verify Email OTP"
                  : "Create Account"
                : mode === "forgot"
                  ? otpSent
                    ? "Verify OTP"
                    : "Send OTP"
                  : "Login"}
            </button>
          </form>

          {mode === "forgot" && (
            <button
              type="button"
              onClick={() => switchMode("login")}
              style={{
                width: "100%",
                marginTop: "16px",
                border: "none",
                background: "transparent",
                color: "#7c3aed",
                fontWeight: "700",
                cursor: "pointer",
              }}
            >
              ← Back to Login
            </button>
          )}

          <div
            style={{
              marginTop: "24px",
              paddingTop: "18px",
              borderTop: "1px solid #f3e8ff",
              textAlign: "center",
              color: "#8b5cf6",
              fontSize: "12px",
              lineHeight: "1.5",
            }}
          >
            Secure college-based access for SmartClassAI
          </div>
        </div>
      </div>
    </div>
  );
}

function AuthField({
  label,
  type = "text",
  placeholder,
  value,
  onChange,
  inputMode,
  maxLength,
}) {
  return (
    <label
      style={{
        display: "block",
        marginBottom: "16px",
      }}
    >
      <span
        style={{
          display: "block",
          marginBottom: "7px",
          color: "#4c1d95",
          fontSize: "13px",
          fontWeight: "700",
          textAlign: "left",
        }}
      >
        {label}
      </span>

      <input
        type={type}
        placeholder={placeholder}
        value={value}
        inputMode={inputMode}
        maxLength={maxLength}
        onChange={(event) => onChange(event.target.value)}
        style={{
          width: "100%",
          boxSizing: "border-box",
          padding: "12px 13px",
          border: "1px solid #ddd6fe",
          borderRadius: "10px",
          outline: "none",
          color: "#4c1d95",
          background: "#ffffff",
          fontSize: "14px",
        }}
      />
    </label>
  );
}

function AuthPasswordField({
  label,
  placeholder,
  value,
  visible,
  onToggle,
  onChange,
}) {
  return (
    <label
      style={{
        display: "block",
        marginBottom: "16px",
      }}
    >
      <span
        style={{
          display: "block",
          marginBottom: "7px",
          color: "#4c1d95",
          fontSize: "13px",
          fontWeight: "700",
          textAlign: "left",
        }}
      >
        {label}
      </span>

      <div style={{ position: "relative" }}>
        <input
          type={visible ? "text" : "password"}
          placeholder={placeholder}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          style={{
            width: "100%",
            boxSizing: "border-box",
            padding: "12px 46px 12px 13px",
            border: "1px solid #ddd6fe",
            borderRadius: "10px",
            outline: "none",
            color: "#4c1d95",
            background: "#ffffff",
            fontSize: "14px",
          }}
        />

        <button
          type="button"
          onClick={onToggle}
          aria-label={visible ? "Hide password" : "Show password"}
          style={{
            position: "absolute",
            right: "10px",
            top: "50%",
            transform: "translateY(-50%)",
            border: "none",
            background: "transparent",
            color: "#8b5cf6",
            cursor: "pointer",
            fontWeight: "700",
          }}
        >
          {visible ? "Hide" : "Show"}
        </button>
      </div>
    </label>
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

function normalizeWholeNumberInput(value) {
  const digits = String(value ?? "").replace(/\D/g, "");

  if (digits === "") {
    return 0;
  }

  const normalized = digits.replace(/^0+(?=\d)/, "");

  return normalized === "" ? 0 : Number(normalized);
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
  type="text"
  inputMode="numeric"
  value={
    input[key] === undefined ||
    input[key] === null ||
    input[key] === ""
      ? "0"
      : String(input[key])
  }
  onFocus={(e) => {
    e.target.select();
  }}
  onKeyDown={(e) => {
    const currentValue = String(
      input[key] ?? 0
    );

    if (
      (e.key === "Backspace" ||
        e.key === "Delete") &&
      currentValue === "0"
    ) {
      e.preventDefault();
    }

    if (
      e.key === "." ||
      e.key === "," ||
      e.key === "e" ||
      e.key === "E" ||
      e.key === "+" ||
      e.key === "-"
    ) {
      e.preventDefault();
    }
  }}
  onChange={(e) => {
    const rawValue =
      e.target.value.replace(
        /\D/g,
        ""
      );

    if (rawValue === "") {
      setInput({
        ...input,
        [key]: 0,
      });
      return;
    }

    const normalized =
      rawValue.replace(
        /^0+(?=\d)/,
        ""
      );

    setInput({
      ...input,
      [key]:
        normalized === ""
          ? 0
          : Number(normalized),
    });
  }}
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
        type="text"
        inputMode="numeric"
        value={
          value === undefined ||
          value === null ||
          value === ""
            ? "0"
            : String(value)
        }
        onFocus={(e) => {
          e.target.select();
        }}
        onKeyDown={(e) => {
          const currentValue = String(
            value ?? 0
          );

          if (
            (e.key === "Backspace" ||
              e.key === "Delete") &&
            currentValue === "0"
          ) {
            e.preventDefault();
          }

          if (
            e.key === "." ||
            e.key === "," ||
            e.key === "e" ||
            e.key === "E" ||
            e.key === "+" ||
            e.key === "-"
          ) {
            e.preventDefault();
          }
        }}
        onChange={(e) => {
          const rawValue =
            e.target.value.replace(
              /\D/g,
              ""
            );

          if (rawValue === "") {
            onChange(0);
            return;
          }

          const normalized =
            rawValue.replace(
              /^0+(?=\d)/,
              ""
            );

          onChange(
            normalized === ""
              ? 0
              : Number(normalized)
          );
        }}
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
  fontSize: "10px",
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