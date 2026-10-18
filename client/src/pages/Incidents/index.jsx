import React, { useState, useEffect } from "react";
import { Box, useTheme, Toolbar, Typography, Button, Modal, IconButton } from "@mui/material";
import {
  DataGrid,
  GridToolbarQuickFilter,
  GridToolbarContainer,
  GridToolbarFilterButton,
} from "@mui/x-data-grid";
import { tokens } from "../../theme";
import { AiFillFire } from "react-icons/ai";
import { FaGun } from "react-icons/fa6";
import { FaRegEye } from "react-icons/fa";
import CloseIcon from '@mui/icons-material/Close';

const modalStyle = {
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: '80%',
  bgcolor: 'background.paper',
  border: '2px solid #000',
  boxShadow: 24,
  p: 4,
  maxHeight: '90vh',
  overflowY: 'auto'
};

// Custom toolbar for the data grid
function CustomToolbar({ setFilterButtonEl }) {
  return (
    <Box sx={{ flexGrow: 1, borderRadius: "8px 8px 0 0" }} backgroundColor={"#fefffe"}>
      <Toolbar variant="dense" disableGutters>
        <Box p={2} display={"flex"} alignItems={"center"}>
          <FaRegEye style={{ fontSize: "2rem" }} />
          <Typography variant="h6" p={2} fontWeight={"bold"}>
            Todos los Incidentes
          </Typography>
        </Box>
        <Box sx={{ flexGrow: 1 }} />
        <GridToolbarContainer sx={{ p: 1, display: "flex", alignItems: "center" }}>
          <Box p={2}>
            <GridToolbarQuickFilter
              variant="outlined"
              size={"small"}
              sx={{ padding: "4", borderColor: "#DCDDDD", color: "#202020" }}
            />
          </Box>
          <Box p={2}>
            <GridToolbarFilterButton
              variant="outlined"
              sx={{ padding: "4", height: "3.125em", borderColor: "#bcbdbd", color: "#202020", "&:hover": { borderColor: "black" } }}
              ref={setFilterButtonEl}
            />
          </Box>
        </GridToolbarContainer>
      </Toolbar>
    </Box>
  );
}

const Incidents = () => {
  const [incidents, setIncidents] = useState([]);
  const [filterButtonEl, setFilterButtonEl] = useState(null);
  const theme = useTheme();
  const colors = tokens;

  // Modal State
  const [openModal, setOpenModal] = useState(false);
  const [selectedNotifId, setSelectedNotifId] = useState(null);

  const fetchIncidents = async () => {
    try {
      const response = await fetch("http://127.0.0.1:5000/user/incidents");
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      if (data.success) {
        const incidentsWithId = data.incidents.map((incident) => ({
          ...incident,
          id: incident.incidents_id,
        }));
        setIncidents(incidentsWithId);
      } else {
        throw new Error("Fetching incidents failed");
      }
    } catch (error) {
      console.error("Error fetching incidents:", error);
    }
  };

  useEffect(() => {
    fetchIncidents();
  }, []);

  const handleOpenEvidence = (notifId) => {
    setSelectedNotifId(notifId);
    setOpenModal(true);
  };

  const handleCloseEvidence = () => {
    setOpenModal(false);
    setSelectedNotifId(null);
  };

  const columns = [
    { field: "id", headerName: "ID", disableColumnMenu: true, cellClassName: "name-column--cell" },
    { field: "date", headerName: "Fecha/Hora", flex: 1, disableColumnMenu: true, cellClassName: "name-column--cell" },
    { field: "type", headerName: "Tipo", flex: 1, headerAlign: "left", align: "left", disableColumnMenu: true, cellClassName: "name-column--cell" },
    { field: "module", headerName: "Módulo", flex: 1, disableColumnMenu: true, cellClassName: "name-column--cell" },
    { field: "camera", headerName: "Cámara", flex: 1, disableColumnMenu: true, cellClassName: "name-column--cell" },
    {
      field: "actions",
      headerName: "Evidencia",
      flex: 1,
      renderCell: (params) => (
        <Button 
          variant="contained" 
          color="secondary" 
          onClick={() => handleOpenEvidence(params.row.notification_id)}
          disabled={!params.row.notification_id}
        >
          Ver Evidencia
        </Button>
      ),
      disableColumnMenu: true,
    },
  ];

  return (
    <Box backgroundColor={colors.primary[500]} p={3} minHeight={"100vh"}>
      <Box p={1} m="8px 0 0 0" width="100%" height="80vh" sx={{ /* ...existing styles... */ }}>
        <DataGrid
          disableColumnSelector
          disableDensitySelector
          rows={incidents}
          columns={columns}
          components={{ Toolbar: CustomToolbar }}
          componentsProps={{
            panel: { anchorEl: filterButtonEl, placement: "bottom-end" },
            toolbar: { setFilterButtonEl },
          }}
        />
      </Box>

      <Modal open={openModal} onClose={handleCloseEvidence}>
        <Box sx={modalStyle}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h6" component="h2">
              Evidencia del Incidente
            </Typography>
            <IconButton onClick={handleCloseEvidence}>
              <CloseIcon />
            </IconButton>
          </Box>
          
          {selectedNotifId && (
            <Box display="flex" flexDirection="column" gap={3} alignItems="center">
              <Box width="100%">
                <Typography variant="subtitle1" mb={1}>Captura de Pantalla:</Typography>
                <img 
                  src={`http://127.0.0.1:5000/user/notifications/get_image/${selectedNotifId}`} 
                  alt="Evidencia" 
                  style={{ width: "100%", maxHeight: "400px", objectFit: "contain", border: "1px solid #ccc" }} 
                />
              </Box>
              
              <Box width="100%">
                <Typography variant="subtitle1" mb={1}>Clip de Video (Últimos 10s):</Typography>
                <video 
                  controls 
                  src={`http://127.0.0.1:5000/user/notifications/videos/${selectedNotifId}`} 
                  style={{ width: "100%", maxHeight: "400px", border: "1px solid #ccc" }} 
                />
              </Box>
            </Box>
          )}
        </Box>
      </Modal>
    </Box>
  );
};

export default Incidents;
