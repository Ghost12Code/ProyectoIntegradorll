import PropTypes from "prop-types";
import React from "react";
import { useSelector } from "react-redux";
import { Redirect } from "react-router-dom";

const RoleGuard = ({ children, requiredRole, requiredRoles }) => {
  const { isLoggedIn, Role } = useSelector((state) => state.account);

  const rolesToCheck = requiredRole || requiredRoles || [];
  const validRequiredRoles = Array.isArray(rolesToCheck) ? rolesToCheck : [rolesToCheck];

  // Si es Super Administrator o Administrator, siempre permitir
  const isSuper = Role === "Super Administrator" || Role === "Administrator" || Role === "Admin";
  const hasRequiredRole = isSuper || validRequiredRoles.includes(Role);

  if (!isLoggedIn || !hasRequiredRole) {
    return <Redirect to="/401" />;
  }

  return children;
};

RoleGuard.propTypes = {
  children: PropTypes.node,
  requiredRole: PropTypes.arrayOf(PropTypes.string),
  requiredRoles: PropTypes.arrayOf(PropTypes.string),
};

export default RoleGuard;
