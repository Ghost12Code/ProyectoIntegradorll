import { Box, IconButton, Typography, Button } from "@mui/material";
import Grid from "@mui/material/Unstable_Grid2";
import { tokens } from "../../theme";
import { AiOutlineArrowRight } from "react-icons/ai";
import { MdVerified, MdPendingActions } from "react-icons/md";
import { FaChartPie } from "react-icons/fa";
import { BsFillCameraFill } from "react-icons/bs";
import { Stack } from "@mui/material";
import LineChart from "../../components/LineChart";
import StatBox from "../../components/StatBox";
import PieChart from "../../components/PieChart";
import CameraSelector from "../../components/CameraSelector";
import { Link } from "react-router-dom";
import { useEffect, useState } from "react";

const Dashboard = () => {
  const colors = tokens;
  const [cameraFeedKey, setCameraFeedKey] = useState(Date.now());
  const API_URL = "http://127.0.0.1:5000/user";

  const fetchWasteAlertsCount = async () => {
    try {
      const response = await fetch(`${API_URL}/incidents/count/fire`);
      if (!response.ok) throw new Error("Network response was not ok");
      const data = await response.json();
      return data.fire_incident_count;
    } catch (error) {
      console.error("Error fetching waste alerts count:", error);
      return 0;
    }
  };

  const fetchPendingAlertsCount = async () => {
    try {
      const response = await fetch(`${API_URL}/incidents/count/weapon`);
      if (!response.ok) throw new Error("Network response was not ok");
      const data = await response.json();
      return data.weapon_incident_count;
    } catch (error) {
      console.error("Error fetching pending alerts count:", error);
      return 0;
    }
  };

  const fetchVerifiedIncidentsCount = async () => {
    try {
      const response = await fetch(`${API_URL}/incidents/count/verified`);
      if (!response.ok) throw new Error("Network response was not ok");
      const data = await response.json();
      return data.verified_incident_count;
    } catch (error) {
      console.error("Error fetching verified incident count:", error);
      return 0;
    }
  };

  const fetchDispatchData = async () => {
    try {
      const response = await fetch(`${API_URL}/dispatch/count`);
      if (!response.ok) throw new Error("Network response was not ok");
      const jsonData = await response.json();
      
      // Sanitizar: Mapear 'fire', 'weapon' o 'others' inmediatamente a residuos
      if (Array.isArray(jsonData)) {
        return jsonData.map(item => {
          const lower = (item.id || item.label || "").toLowerCase();
          if (lower.includes("fire")) {
            return { ...item, id: "Bolsas de Basura", label: "Bolsas de Basura", color: "#2e7d32" };
          }
          if (lower.includes("weapon")) {
            return { ...item, id: "Desmonte / Escombros", label: "Desmonte / Escombros", color: "#ff5722" };
          }
          if (lower.includes("other")) {
            return { ...item, id: "Costales y Bultos", label: "Costales y Bultos", color: "#3f51b5" };
          }
          return item;
        });
      }
      return defaultWasteData;
    } catch (error) {
      console.error("Error fetching dispatch data:", error);
      return defaultWasteData;
    }
  };

  const fetchIncidentData = async () => {
    try {
      const response = await fetch(`${API_URL}/incidents/monthly-count`);
      if (!response.ok) throw new Error("Network response was not ok");
      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Error fetching monthly incident data:", error);
      return [];
    }
  };

  const [wasteAlertsCount, setWasteAlertsCount] = useState(0);
  const [pendingAlertsCount, setPendingAlertsCount] = useState(0);
  const [verifiedIncidentCount, setVerifiedIncidentCount] = useState(0);
  const defaultWasteData = [
    { id: "Bolsas de Basura", label: "Bolsas de Basura", value: 0, color: "#2e7d32" },
    { id: "Desmonte / Escombros", label: "Desmonte / Escombros", value: 0, color: "#ff5722" },
    { id: "Costales y Bultos", label: "Costales y Bultos", value: 0, color: "#3f51b5" },
    { id: "Otros Desechos", label: "Otros Desechos", value: 0, color: "#607d8b" },
  ];
  const [DispatchData, setDispatchData] = useState(defaultWasteData);
  const [incidentData, setIncidentData] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      const wasteCount = await fetchWasteAlertsCount();
      const pendingCount = await fetchPendingAlertsCount();
      const verifiedCount = await fetchVerifiedIncidentsCount();
      const dispatchCount = await fetchDispatchData();
      const incidentDataCount = await fetchIncidentData();

      setWasteAlertsCount(wasteCount);
      setPendingAlertsCount(pendingCount);
      setVerifiedIncidentCount(verifiedCount);
      setDispatchData(Array.isArray(dispatchCount) ? dispatchCount : []);
      setIncidentData(Array.isArray(incidentDataCount) ? incidentDataCount : []);
    };

    fetchData();
  }, []);

  const totalValue = (DispatchData || []).reduce(
    (total, item) => total + (item.value || 0),
    0
  );
  const progressPercent = (DispatchData || []).map(
    (item) => (totalValue > 0 ? (item.value / totalValue) * 100 : 0)
  );
  const progressValues = (DispatchData || []).map((item) => item.value);

  return (
    <Box backgroundColor={colors.primary[500]} p={3} minHeight={"100vh"}>
      <Box mb={2}>
        <Typography variant="h4" fontWeight="bold" color={colors.blackAccents[100]}>
          PANEL DE CONTROL - SIMRA
        </Typography>
        <Typography variant="subtitle1" color="#FF5722" fontWeight="600">
          Monitoreo y Detección de Arrojo de Residuos Sólidos en el Puente Santa Isabel
        </Typography>
      </Box>

      <Grid container spacing={2}>
        <Grid container xs={12} sm={12} lg={9}>
          <Stack
            spacing={2}
            flex="1 1 0"
            direction={{
              xs: "column",
              sm: "column",
              md: "row",
              lg: "row",
              xl: "row",
            }}
            p={1}
            width="100%"
          >
            {/* STATBOX 1: Detecciones de Residuos */}
            <Grid item xs={12} sm={12} md={4} lg={4} xl={4}>
              <Box
                backgroundColor={colors.secondary[400]}
                display="flex"
                alignItems="center"
                justifyContent="center"
                borderRadius="8px"
              >
                <StatBox
                  title={wasteAlertsCount.toString()}
                  subtitle="Detecciones de Residuos"
                  icon={
                    <BsFillCameraFill
                      style={{
                        color: colors.orangeAccents[500],
                        fontSize: "26px",
                      }}
                    />
                  }
                />
              </Box>
            </Grid>

            {/* STATBOX 2: Alertas Pendientes */}
            <Grid item xs={12} sm={12} md={4} lg={4} xl={4}>
              <Box
                backgroundColor={colors.secondary[400]}
                display="flex"
                alignItems="center"
                justifyContent="center"
                borderRadius="8px"
              >
                <StatBox
                  title={pendingAlertsCount.toString()}
                  subtitle="Alertas Pendientes"
                  icon={
                    <MdPendingActions
                      style={{
                        color: colors.orangeAccents[500],
                        fontSize: "26px",
                      }}
                    />
                  }
                />
              </Box>
            </Grid>

            {/* STATBOX 3: Incidentes Verificados */}
            <Grid item xs={12} sm={12} md={4} lg={4} xl={4}>
              <Box
                backgroundColor={colors.secondary[400]}
                display="flex"
                alignItems="center"
                justifyContent="center"
                borderRadius="8px"
              >
                <StatBox
                  title={verifiedIncidentCount.toString()}
                  subtitle="Incidentes Verificados"
                  progress="1.0"
                  increase="+100%"
                  icon={
                    <MdVerified
                      style={{
                        color: colors.orangeAccents[500],
                        fontSize: "26px",
                      }}
                    />
                  }
                />
              </Box>
            </Grid>
          </Stack>

          {/* VISOR EN VIVO DE CÁMARA */}
          <Stack spacing={1} p={1} width="100%">
            <Box backgroundColor={colors.secondary[500]} borderRadius="8px" p={2}>
              <Box
                display="flex"
                justifyContent="space-between"
                alignItems="center"
                mb={2}
              >
                <Box display="flex" alignItems="center">
                  <BsFillCameraFill
                    style={{
                      color: colors.orangeAccents[500],
                      fontSize: "24px",
                    }}
                  />
                  <Typography
                    variant="h6"
                    fontWeight="bold"
                    paddingLeft={1}
                    sx={{ color: colors.blackAccents[500] }}
                  >
                    Cámara en Vivo - Puente Santa Isabel (YOLOv8)
                  </Typography>
                </Box>

                <Box>
                  <Link to="/view_feed">
                    <Button
                      variant="outlined"
                      color="secondary"
                      size="small"
                      endIcon={<AiOutlineArrowRight />}
                    >
                      Pantalla Completa
                    </Button>
                  </Link>
                </Box>
              </Box>

              <CameraSelector onSourceChanged={() => setCameraFeedKey(Date.now())} />

              <Box display="flex" justifyContent="center" alignItems="center" p={1}>
                <img
                  key={cameraFeedKey}
                  src={`http://127.0.0.1:5000/local-camera/feed?t=${cameraFeedKey}`}
                  alt="Transmisión Puente Santa Isabel"
                  style={{
                    width: "100%",
                    maxHeight: "380px",
                    objectFit: "contain",
                    borderRadius: "6px",
                    backgroundColor: "#000",
                  }}
                />
              </Box>
            </Box>
          </Stack>
        </Grid>

        {/* ANALÍTICAS LATERALES */}
        <Grid container item xs={12} sm={12} lg={3} p={1}>
          <Box
            backgroundColor={colors.secondary[500]}
            width={"100%"}
            borderRadius="8px"
            p={2}
          >
            <Box
              display="flex"
              alignItems="center"
              mb={2}
            >
              <FaChartPie
                style={{
                  color: colors.orangeAccents[500],
                  fontSize: "22px",
                }}
              />
              <Typography
                variant="h6"
                fontWeight="bold"
                paddingLeft={1}
                sx={{ color: colors.blackAccents[500] }}
              >
                Tipos de Residuos Sólidos
              </Typography>
            </Box>

            <Box height="25vh">
              <PieChart isDashboard={true} data={DispatchData} />
            </Box>

            <Box mt={2}>
              {DispatchData.map((item, index) => (
                <Box
                  key={item.id || index}
                  display="flex"
                  flexDirection="column"
                  mb={1.5}
                >
                  <Box display="flex" justifyContent="space-between">
                    <Typography fontSize="13px" fontWeight="medium">{item.label}</Typography>
                    <Typography fontSize="13px" fontWeight="medium">
                      {progressValues[index]}
                    </Typography>
                  </Box>
                  <progress
                    value={progressPercent[index] || 0}
                    max={100}
                    style={{
                      width: "100%",
                      height: "8px",
                      borderRadius: "4px",
                    }}
                  />
                </Box>
              ))}
            </Box>
          </Box>
        </Grid>

        {/* GRÁFICO HISTÓRICO INFERIOR */}
        <Grid container item xs={12} sm={12} lg={12} p={1}>
          <Box
            backgroundColor={colors.secondary[400]}
            borderRadius="8px"
            width={"100%"}
            p={2}
          >
            <Box display="flex" alignItems="center" mb={1}>
              <FaChartPie
                style={{
                  color: colors.orangeAccents[500],
                  fontSize: "22px",
                }}
              />
              <Typography
                variant="h6"
                fontWeight="bold"
                paddingLeft={1}
                sx={{ color: colors.blackAccents[500] }}
              >
                Tendencia Mensual de Detección de Infracciones
              </Typography>
            </Box>
            <Box height="240px" m="0">
              <LineChart isDashboard={true} data={incidentData} />
            </Box>
          </Box>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Dashboard;
