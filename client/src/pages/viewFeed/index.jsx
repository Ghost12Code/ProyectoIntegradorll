import React, { useState } from "react";
import { Box, Typography, Paper } from "@mui/material";
import CameraSelector from "../../components/CameraSelector";

const CameraList = () => {
  const [feedKey, setFeedKey] = useState(Date.now());
  const aiStreamUrl = `http://127.0.0.1:5000/local-camera/feed?t=${feedKey}`;

  return (
    <Box m="20px">
      <Typography variant="h4" fontWeight="bold" mb="20px">
        Monitor de Videovigilancia Inteligente
      </Typography>

      <Paper
        elevation={3}
        sx={{
          p: 2,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          backgroundColor: "#ffffff",
        }}
      >
        <Typography variant="h6" color="textSecondary" mb="10px">
          Cámara: Puente Santa Isabel (Análisis YOLOv8 Activo)
        </Typography>

        <Box width="100%" maxWidth="850px" mb={1}>
          <CameraSelector onSourceChanged={() => setFeedKey(Date.now())} />
        </Box>

        <img
          key={feedKey}
          src={aiStreamUrl}
          alt="Stream de Cámara con IA"
          style={{
            width: "100%",
            maxWidth: "850px",
            borderRadius: "8px",
            border: "2px solid #1F497D",
          }}
        />
      </Paper>
    </Box>
  );
};

export default CameraList;
