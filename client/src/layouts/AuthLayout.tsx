import { Outlet, useLocation } from "react-router";

export const Authlayout = () => {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-surface font-narrative overflow-x-hidden transition-colors duration-700">
      <div 
        key={location.pathname}
        className="animate-reveal"
      >
        <Outlet />
      </div>
    </div>
  );
};
