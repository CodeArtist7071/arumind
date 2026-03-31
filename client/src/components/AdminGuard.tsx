import React from "react";
import { useSelector } from "react-redux";
import { Navigate, Outlet } from "react-router-dom";
import type { RootState } from "../store";
import { SplashScreen } from "./ui/SplashScreen";

export const AdminGuard: React.FC = () => {
  const { profile, loading } = useSelector((state: RootState) => state.user);

  // While initializing or fetching profile, show a subtle loading state
  if (loading) {
    return <SplashScreen isVisible={true} />;
  }

  // Strictly check for admin role manifest
  if (!profile || profile.role !== "admin") {
    console.warn("[AUTH] Access denied to admin manifestation. Missing required 'admin' role.");
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
};
