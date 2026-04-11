import { useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { REDIRECT_ROUTES } from "@/constants/routeConst";

const NotFoundPage = () => {
  const location = useLocation();

  useEffect(() => {
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted">
      <div className="text-center">
        <h1 className="mb-4 text-4xl font-bold">404</h1>
        <p className="mb-4 text-xl text-muted-foreground">Page not found</p>
        <Link to={REDIRECT_ROUTES.HOME} className="text-primary underline hover:text-primary/90">
          Return home
        </Link>
      </div>
    </div>
  );
};

export default NotFoundPage;
