import React from "react";
import img from "@/assets/images/404.png";

import { Link } from "react-router-dom";
import ButtonComponent from "@/components/ButtonComponent";
export default function NotfoundScreen() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4">
      <div className="flex items-center justify-center">
        <div>
          <img src={img} className="h-96 w-96" />
        </div>
      </div>
      <h1 className="text-2xl md:text-3xl font-semibold mb-4 text-black text-center">
        Oops! Page Not Found
      </h1>
      <p className="text-center text-gray-500 max-w-md mb-6">
        It looks like you've taken a wrong turn. Don’t worry, it happens to the
        best of us. The page you’re looking for might have been moved, deleted,
        or possibly never existed.
      </p>
      <Link
        className="w-sm bg-black text-white py-4 px-1 rounded-xl text-base font-bold transition text-center"
        to="/"
      >
        Go To Home
      </Link>
    </div>
  );
}
