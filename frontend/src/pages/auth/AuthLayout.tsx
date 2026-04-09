import { Outlet } from "react-router-dom";
import Starfield from "@/components/Starfield";

const AuthLayout = () => (
  <div className="relative min-h-screen">
    <Starfield />
    <div className="relative z-10">
      <Outlet />
    </div>
  </div>
);

export default AuthLayout;
