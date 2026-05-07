
import loaderImg from "../assets/images/svg/loader.svg";

interface ButtonProps {
  title: string;
  loading?: boolean; // new prop to indicate loading state
  onClick?: () => void;
  type?: "button" | "submit";
}

export default function ButtonComponent({
  title,
  loading = false,
  onClick,
  type = "button",
}: ButtonProps) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={loading}
      className={`w-full bg-black text-white py-4 px-1 rounded-xl text-base font-semibold transition cursor-pointer flex items-center justify-center ${
        loading ? "opacity-70 cursor-not-allowed" : ""
      }`}
    >
      {loading ? <img src={loaderImg} className="h-7 w-7" /> : title}
    </button>
  );
}
