import React, { useState, useEffect } from "react";
import {
  Box,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  TextField,
  CircularProgress,
  Typography,
  Chip,
  Alert,
} from "@mui/material";
import { BsFillCameraFill } from "react-icons/bs";
import { FaLaptop, FaMobileAlt, FaWifi } from "react-icons/fa";

const CameraSelector = ({ onSourceChanged }) => {
  const [selectedOption, setSelectedOption] = useState("0");
  const [customUrl, setCustomUrl] = useState("");
  const [currentActive, setCurrentActive] = useState("0");
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null);
  const [statusType, setStatusType] = useState("info"); // success, error, info
  const [abandonmentTime, setAbandonmentTime] = useState(10);
  const [isUpdatingTime, setIsUpdatingTime] = useState(false);

  const API_BASE = "http://127.0.0.1:5000";

  // Consultar fuente de cámara actual y tiempo de abandono al cargar
  useEffect(() => {
    const fetchCurrentSource = async () => {
      try {
        const res = await fetch(`${API_BASE}/local-camera/source`);
        if (res.ok) {
          const data = await res.json();
          const curr = String(data.current);
          setCurrentActive(curr);
          if (curr === "0" || curr === "1" || curr === "2") {
            setSelectedOption(curr);
          } else {
            setSelectedOption("url");
            setCustomUrl(curr);
          }
        }
      } catch (err) {
        console.warn("No se pudo obtener la fuente inicial de cámara:", err);
      }
    };

    const fetchAbandonmentTime = async () => {
      try {
        const res = await fetch(`${API_BASE}/local-camera/abandonment-time`);
        if (res.ok) {
          const data = await res.json();
          if (data.time) setAbandonmentTime(data.time);
        }
      } catch (err) {
        console.warn("No se pudo obtener el tiempo de abandono:", err);
      }
    };

    fetchCurrentSource();
    fetchAbandonmentTime();
  }, []);

  const handleSwitchCamera = async () => {
    let targetSource = selectedOption;
    if (selectedOption === "url") {
      if (!customUrl.trim()) {
        setStatusMessage("Por favor ingrese la URL IP de la cámara del celular.");
        setStatusType("error");
        return;
      }
      targetSource = customUrl.trim();
    } else {
      targetSource = parseInt(selectedOption, 10);
    }

    setLoading(true);
    setStatusMessage(null);

    try {
      const res = await fetch(`${API_BASE}/local-camera/source`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source: targetSource }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setCurrentActive(String(data.current));
        setStatusType("success");
        setStatusMessage(`Cámara cambiada exitosamente.`);
        if (onSourceChanged) {
          onSourceChanged(data.current);
        }
      } else {
        setStatusType("error");
        setStatusMessage(data.msg || "Error al conectar con la cámara solicitada.");
      }
    } catch (err) {
      console.error("Error al cambiar fuente de cámara:", err);
      setStatusType("error");
      setStatusMessage("Error de conexión con el servidor Flask.");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateTime = async () => {
    setIsUpdatingTime(true);
    try {
      const res = await fetch(`${API_BASE}/local-camera/abandonment-time`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ time: parseFloat(abandonmentTime) }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setStatusType("success");
        setStatusMessage(`Tiempo de abandono actualizado a ${data.time} segundos.`);
      } else {
        setStatusType("error");
        setStatusMessage(data.msg || "Error al actualizar tiempo de abandono.");
      }
    } catch (err) {
      setStatusType("error");
      setStatusMessage("Error de conexión al actualizar tiempo.");
    } finally {
      setIsUpdatingTime(false);
    }
  };

  const getSourceLabel = (val) => {
    if (val === "0") return "Laptop (Cámara 0)";
    if (val === "1") return "Celular USB (Cámara 1)";
    if (val === "2") return "Cámara 2";
    if (val.startsWith("http")) return "Celular WiFi (IP Web)";
    return `Fuente: ${val}`;
  };

  return (
    <Box
      sx={{
        p: 1.5,
        mb: 2,
        borderRadius: "8px",
        backgroundColor: "#f8f9fa",
        border: "1px solid #e0e0e0",
      }}
    >
      <Box
        display="flex"
        flexWrap="wrap"
        alignItems="center"
        justifyContent="space-between"
        gap={1.5}
      >
        {/* Selector y controles */}
        <Box display="flex" alignItems="center" gap={1.5} flexWrap="wrap">
          <Box display="flex" alignItems="center" gap={1}>
            <BsFillCameraFill style={{ color: "#1F497D", fontSize: "20px" }} />
            <Typography variant="body2" fontWeight="bold" sx={{ color: "#333" }}>
              Cambiar Cámara:
            </Typography>
          </Box>

          <FormControl size="small" sx={{ minWidth: 210 }}>
            <InputLabel id="camera-select-label">Dispositivo de Video</InputLabel>
            <Select
              labelId="camera-select-label"
              value={selectedOption}
              label="Dispositivo de Video"
              onChange={(e) => setSelectedOption(e.target.value)}
              disabled={loading}
              sx={{ backgroundColor: "#ffffff" }}
            >
              <MenuItem value="0">
                <Box display="flex" alignItems="center" gap={1}>
                  <FaLaptop style={{ color: "#555" }} />
                  <span>Cámara Laptop (0)</span>
                </Box>
              </MenuItem>
              <MenuItem value="1">
                <Box display="flex" alignItems="center" gap={1}>
                  <FaMobileAlt style={{ color: "#2e7d32" }} />
                  <span>Cámara Celular USB (1)</span>
                </Box>
              </MenuItem>
              <MenuItem value="2">
                <Box display="flex" alignItems="center" gap={1}>
                  <BsFillCameraFill style={{ color: "#777" }} />
                  <span>Cámara Secundaria (2)</span>
                </Box>
              </MenuItem>
              <MenuItem value="url">
                <Box display="flex" alignItems="center" gap={1}>
                  <FaWifi style={{ color: "#1976d2" }} />
                  <span>Celular WiFi (IP Webcam URL)</span>
                </Box>
              </MenuItem>
            </Select>
          </FormControl>

          {selectedOption === "url" && (
            <TextField
              size="small"
              placeholder="http://192.168.1.X:8080/video"
              value={customUrl}
              onChange={(e) => setCustomUrl(e.target.value)}
              disabled={loading}
              sx={{ minWidth: 250, backgroundColor: "#ffffff" }}
            />
          )}

          <Button
            variant="contained"
            color="primary"
            size="medium"
            onClick={handleSwitchCamera}
            disabled={loading}
            startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <BsFillCameraFill />}
            sx={{
              textTransform: "none",
              fontWeight: "bold",
              backgroundColor: "#1F497D",
              "&:hover": { backgroundColor: "#153356" },
            }}
          >
            {loading ? "Conectando..." : "Aplicar Cámara"}
          </Button>
        </Box>

        {/* Separador visual para configuración de tiempo */}
        <Box display="flex" alignItems="center" gap={1.5} flexWrap="wrap" mt={{ xs: 1.5, sm: 0 }}>
          <TextField
            size="small"
            type="number"
            label="Tiempo Abandono (seg)"
            value={abandonmentTime}
            onChange={(e) => setAbandonmentTime(e.target.value)}
            disabled={isUpdatingTime}
            sx={{ width: '160px', backgroundColor: "#ffffff" }}
            InputProps={{ inputProps: { min: 1, max: 120 } }}
          />
          <Button
            variant="outlined"
            size="medium"
            onClick={handleUpdateTime}
            disabled={isUpdatingTime}
            sx={{ textTransform: "none", fontWeight: "bold" }}
          >
            {isUpdatingTime ? "Guardando..." : "Actualizar Tiempo"}
          </Button>
        </Box>

        {/* Estado actual */}
        <Box display="flex" alignItems="center" gap={1} mt={{ xs: 1.5, md: 0 }}>
          <Typography variant="caption" sx={{ color: "#666" }}>
            En transmisión:
          </Typography>
          <Chip
            label={getSourceLabel(currentActive)}
            color={currentActive === "1" ? "success" : "primary"}
            size="small"
            sx={{ fontWeight: "bold" }}
          />
        </Box>
      </Box>

      {/* Alertas informativas / de error */}
      {statusMessage && (
        <Box mt={1.5}>
          <Alert
            severity={statusType}
            onClose={() => setStatusMessage(null)}
            sx={{ py: 0.2, px: 1.5, fontSize: "13px" }}
          >
            {statusMessage}
          </Alert>
        </Box>
      )}
    </Box>
  );
};

export default CameraSelector;
