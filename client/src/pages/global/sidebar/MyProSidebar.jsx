import React, { useState } from "react";
import { Menu, Sidebar, MenuItem, SubMenu } from "react-pro-sidebar";
import { useProSidebar } from "react-pro-sidebar";
import { useSidebarContext } from "./sidebarContext";
import { Link } from "react-router-dom";
import { tokens } from "../../../theme";
import { Box, Typography } from "@mui/material";

//MAIN MENUE ICONS
import { FaChartPie } from "react-icons/fa";
import { MdOutlineNotificationAdd } from "react-icons/md";
import { FaRegEye } from "react-icons/fa";
import { LuUsers } from "react-icons/lu";
import { TbReport } from "react-icons/tb";
import { BiChip } from "react-icons/bi";
import { LuSettings } from "react-icons/lu";
import { AiOutlineQuestionCircle } from "react-icons/ai";
import { FiHeadphones } from "react-icons/fi";

// SUB SETTINGS ICONS
import { AiOutlineCamera } from "react-icons/ai";
import { BiUserVoice } from "react-icons/bi";
import { FiInfo } from "react-icons/fi";
import { BsShieldLock } from "react-icons/bs";
import { useSelector } from "react-redux";

const Item = ({ title, to, icon, selected, setSelected }) => {
  const colors = tokens;

  return (
    <MenuItem
      active={selected === title}
      style={{ color: colors.secondary[100], position: "relative" }}
      onClick={() => setSelected(title)}
      icon={icon}
      routerLink={<Link to={to} />}
    >
      <Typography>{title}</Typography>
    </MenuItem>
  );
};

const MyProSidebar = () => {
  const colors = tokens;
  const [selected, setSelected] = useState("Dashboard");
  const { sidebarRTL, setSidebarRTL, sidebarImage } = useSidebarContext();
  const { collapseSidebar, toggleSidebar, collapsed, broken } = useProSidebar();

  const { Role } = useSelector((state) => state.account); // Get the user's role

  // Function to check if the current role is permitted to see an item
  const isPermitted = (permittedRoles) => {
    if (!Role) return true;
    if (Role === "Super Administrator" || Role === "Administrator" || Role === "Admin") return true;
    return permittedRoles.includes(Role) || permittedRoles.includes("Admin");
  };
  return (
    <Box
      sx={{
        // Styling for the outer sidebar container
        borderRight: "2px solid #DCDDDD !important",
        position: "sticky",
        display: "flex",
        height: "100vh",
        top: 0,
        bottom: 0,

        zIndex: 10000,
        "& .sidebar": {
          // Sidebar configuration
          border: "none",
        },

        "& .menu-icon": {
          backgroundColor: "transparent !important",
        },
        "& .menu-item": {
          backgroundColor: "transparent !important",
          padding: "5px 0",
        },
        "& .menu-anchor": {
          color: "inherit !important",
          backgroundColor: "transparent !important",
        },
        /* Exclude the "admin-box" from the background color rule */
        "& .menu-item:not(.admin-box):hover, & .menu-item:not(.sub-menu).active:not(.admin-box)":
          {
            backgroundColor: "rgba(255, 87, 34, 0.3) !important",
            //boxShadow: "0 8px 8px -4px !important"
            boxShadow:
              "rgba(0, 0, 0, 0.16) 0px 3px 6px, rgba(0, 0, 0, 0.23) 0px 3px 6px;!important",
          },

        "& .sub-menu-content": {
          backgroundColor: `${colors.primary[400]} !important`,
        },

        "& .menu-item.active::after": {
          content: '""',
          position: "absolute",
          right: 0,
          top: "50%",
          transform: "translateY(-50%)",
          width: "5px",
          height: "50px",
          backgroundColor: "#FF5722",
        },
      }}
    >
      <Sidebar
        breakPoint="md"
        rtl={sidebarRTL}
        backgroundColor={colors.secondary[500]}
        image={sidebarImage}
      >
        <Menu iconshape="square">
          {!collapsed && (
            <Box mb="20px" p="25px 10px 10px 10px" textAlign="center">
              <Typography
                variant="h5"
                fontWeight="bold"
                style={{ fontSize: "16px", letterSpacing: "1px", color: colors.secondary[100] }}
              >
                SIMRA
              </Typography>
              <Typography
                variant="subtitle2"
                style={{ fontSize: "12px", color: "#FF5722", fontWeight: 600, marginTop: "4px" }}
              >
                Puente Santa Isabel - Residuos
              </Typography>
            </Box>
          )}
          <Box paddingLeft={collapsed ? undefined : "0"}>
            {isPermitted(["Super Administrator", "Admin", "Normal User"]) && (
              <Item
                title={
                  <Typography
                    variant="h6"
                    style={{ fontWeight: 600, fontSize: 14 }}
                  >
  Panel Principal
</Typography>
                }
                to="/"
                icon={<FaChartPie style={{ fontSize: 20 }} />}
                selected={selected}
                setSelected={setSelected}
              />
            )}

            {isPermitted(["Super Administrator", "Admin", "Normal User"]) && (
              <Item
                title={
                  <Typography
                    variant="h6"
                    style={{ fontWeight: 600, fontSize: 14 }}
                  >
  Cámara en Vivo
</Typography>
                }
                to="/view_feed"
                icon={<AiOutlineCamera style={{ fontSize: 20 }} />}
                selected={selected}
                setSelected={setSelected}
              />
            )}

            {isPermitted(["Super Administrator", "Admin", "Normal User"]) && (
              <Item
                title={
                  <Typography
                    variant="h6"
                    style={{ fontWeight: 600, fontSize: 14 }}
                  >
  Notificaciones
</Typography>
                }
                to="/notifications"
                icon={<MdOutlineNotificationAdd style={{ fontSize: 20 }} />}
                selected={selected}
                setSelected={setSelected}
              />
            )}
            {isPermitted(["Super Administrator", "Admin", "Normal User"]) && (
              <Item
                title={
                  <Typography
                    variant="h6"
                    style={{ fontWeight: 600, fontSize: 14 }}
                  >
  Incidentes
</Typography>
                }
                to="/incidents"
                icon={<FaRegEye style={{ fontSize: 20 }} />}
                selected={selected}
                setSelected={setSelected}
              />
            )}

            {isPermitted(["Super Administrator"]) && (
              <Item
                title={
                  <Typography
                    variant="h6"
                    style={{ fontWeight: 600, fontSize: 14 }}
                  >
  Gestión de Usuarios
</Typography>
                }
                to="/usermgnt"
                icon={<LuUsers style={{ fontSize: 20 }} />}
                selected={selected}
                setSelected={setSelected}
              />
            )}
            {isPermitted(["Super Administrator", "Admin"]) && (
              <Item
                title={
                  <Typography
                    variant="h6"
                    style={{ fontWeight: 600, fontSize: 14 }}
                  >
  Reportes
</Typography>
                }
                to="/reports"
                icon={<TbReport style={{ fontSize: 20 }} />}
                selected={selected}
                setSelected={setSelected}
              />
            )}
          </Box>
          {/*SUB - MENU */}
          <Box paddingLeft={collapsed ? undefined : "0"} className="sub-menu">
            <SubMenu // Add SubMenu component for the "Settings" menu item
              label={
                <Typography
                  variant="h6"
                  style={{ fontWeight: 600, fontSize: 14 }}
                >
  Configuración
</Typography>
              }
              icon={<LuSettings style={{ fontSize: 20 }} />}
              selected={selected}
              setSelected={setSelected}
              className="sub-menu-header"
            >
              {/*SUB MENU ITEMS */}

              {isPermitted(["Super Administrator"]) && (
                <Item
                  title={
                    <Typography
                      variant="h6"
                      style={{
                        fontWeight: 600,
                        fontSize: 14,
                        marginLeft: "20px",
                      }}
                    >
  Cámaras
</Typography>
                  }
                  to="/settings/camsetting"
                  icon={
                    <AiOutlineCamera
                      style={{ fontSize: 20, marginLeft: "18px" }}
                    />
                  }
                  selected={selected}
                  setSelected={setSelected}
                />
              )}

              {isPermitted(["Super Administrator"]) && (
                <Item
                  title={
                    <Typography
                      variant="h6"
                      style={{
                        fontWeight: 600,
                        fontSize: 14,
                        marginLeft: "20px",
                      }}
                    >
  Alertas
</Typography>
                  }
                  to="/settings/dispatchsettings"
                  icon={
                    <BiUserVoice style={{ fontSize: 20, marginLeft: "18px" }} />
                  }
                  selected={selected}
                  setSelected={setSelected}
                />
              )}

              {isPermitted(["Super Administrator", "Admin", "Normal User"]) && (
                <Item
                  title={
                    <Typography
                      variant="h6"
                      style={{
                        fontWeight: 600,
                        fontSize: 14,
                        marginLeft: "20px",
                      }}
                    >
  Información del Sistema
</Typography>
                  }
                  to="/settings/versioninfo"
                  icon={<FiInfo style={{ fontSize: 20, marginLeft: "18px" }} />}
                  selected={selected}
                  setSelected={setSelected}
                />
              )}

              {isPermitted(["Super Administrator", "Admin", "Normal User"]) && (
                <Item
                  title={
                    <Typography
                      variant="h6"
                      style={{
                        fontWeight: 600,
                        fontSize: 14,
                        marginLeft: "20px",
                      }}
                    >
  Seguridad
</Typography>
                  }
                  to="/settings/security"
                  icon={
                    <BsShieldLock
                      style={{ fontSize: 20, marginLeft: "18px" }}
                    />
                  }
                  selected={selected}
                  setSelected={setSelected}
                />
              )}
            </SubMenu>
          </Box>


        </Menu>
        <Box paddingTop={20}>
          <Typography
            textAlign="center"
            padding="10px" // Add some padding for spacing
            backgroundColor={colors.secondary[500]} // Match the sidebar background
            color="#FF5722 !important" // Text color
            position="sticky"
            bottom="0"
            width="100%"
            fontWeight="bold"
          >
            SIMRA
          </Typography>
        </Box>
      </Sidebar>
    </Box>
  );
};

export default MyProSidebar;
