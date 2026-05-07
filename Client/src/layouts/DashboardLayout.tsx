import { Outlet } from "react-router-dom";
import Header from "./Header";
import LeftSideBar from "./LeftSideBar";

export default function DashboardLayout() {
  return (
    <div className="w-full h-screen flex flex-col overflow-hidden">
      <div className="fixed top-0 left-0 w-full z-50 bg-red-500 shadow">
        <Header />
      </div>
      <div className="flex h-full overflow-hidden border-black">
        <div className=" bg-white overflow-y-auto">
          <LeftSideBar />
        </div>
        <div className="flex-1 overflow-y-auto p-4 bg-white mt-16">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
