
import logo from "../assets/images/logo/woo_woo_art_house_logo.png";

export default function FullPageLoader() {
  return (
    <div className="w-full h-screen flex flex-col items-center justify-center bg-white">
      <img src={logo} alt="Logo" className="w-48 h-48 object-contain" />
    </div>
  );
}
