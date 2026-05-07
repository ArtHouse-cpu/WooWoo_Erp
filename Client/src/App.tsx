import { useEffect, useState } from "react";
import { RouterProvider } from "react-router-dom";
import FullPageLoader from "@/components/FullPageLoader";
import { router } from "@/routes/router";

export default function App() {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false);
    }, 800);

    return () => clearTimeout(timer);
  }, []);

  if (loading) {
    return <FullPageLoader />;
  }

  return <RouterProvider router={router} />;
}
