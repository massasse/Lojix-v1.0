import NavBar from "../assets/componets/Navbar";
import { Outlet } from "react-router-dom";
import "./StylePrincipal.css";
export default function Principal() {
  return (
    <div className="containerPrincipal">
      <div className="navbar">
        <NavBar />
      </div>
      <main className="ContainerContent">
        <Outlet />
      </main>
    </div>
  );
}
