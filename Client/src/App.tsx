import { useEffect, useState } from "react";
import { RouterProvider } from "react-router-dom";
import FullPageLoader from "@/components/FullPageLoader";
import { router } from "@/routes/router";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useColorMode } from "@/theme/theme";

export default function App() {
  const [loading, setLoading] = useState(true);
  const colorMode = useColorMode();

  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false);
    }, 800);

    return () => clearTimeout(timer);
  }, []);

  if (loading) {
    return <FullPageLoader />;
  }

  return (
    <>
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        pauseOnHover
        theme={colorMode}
      />
      <RouterProvider router={router} />
    </>
  );
}
