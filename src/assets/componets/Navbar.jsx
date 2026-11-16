
import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";

import {
  FaShoppingCart,
  FaBoxes,
  FaUsers,
  FaCashRegister,
  FaBars,
  FaTimes,
} from "react-icons/fa";

import { TbLayoutDashboardFilled } from "react-icons/tb";

import "./StyleNavbar.css";

function NavBar() {
  const [menuAberto, setMenuAberto] = useState(false);
  const navigate=useNavigate();

  const fecharMenu = () => setMenuAberto(false);

  const links = [
    {
      to: "/principal/dashbord",
      icon: <TbLayoutDashboardFilled />,
      label: "Dashboard",
    },
    {
      to: "/principal/vendas",
      icon: <FaShoppingCart />,
      label: "Vendas",
    },
    {
      to: "/principal/produtos",
      icon: <FaBoxes />,
      label: "Produtos",
    },
    {
      to: "/principal/clientes",
      icon: <FaUsers />,
      label: "Clientes",
    },
    {
      to: "/principal/caixa",
      icon: <FaCashRegister />,
      label: "Caixa",
    },
  ];

  return (
    <>
      {/* Cabeçalho mobile */}
      <header className="mobileHeader">
        <button
          className="menuToggle"
          onClick={() => setMenuAberto(!menuAberto)}
          aria-label={menuAberto ? "Fechar menu" : "Abrir menu"}
          aria-expanded={menuAberto}
        >
          {menuAberto ? <FaTimes /> : <FaBars />}
        </button>

        <img
          src="/lojix_logo.png"
          alt="LOJIX"
          className="logoMobile"
        />

        <div className="mobileUserIcon">
          <FaUsers />
        </div>
      </header>

      {/* Fundo escuro ao abrir o menu */}
      {menuAberto && (
        <div
          className="menuOverlay"
          onClick={fecharMenu}
        />
      )}

      {/* Menu lateral */}
      <div
        className={`containernavbar ${
          menuAberto ? "menuAberto" : ""
        }`}
      >
        <img
          src="/lojix_logo.png"
          alt="LOJIX"
          className="logodashbord"
        />

        <nav className="menuLinks">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end
              onClick={fecharMenu}
              className={({ isActive }) =>
                isActive ? "linkMenu ativo" : "linkMenu"
              }
            >
              {link.icon}
              <span className="linkText">{link.label}</span>
            </NavLink>
          ))}
        </nav>

        <button type="button" onClick={async()=>{await supabase.auth.signOut(); navigate("/");}} style={{border:0,background:"transparent",color:"#fff",padding:12,cursor:"pointer"}}>Terminar sessão</button>
        <div className="sidebarFooter">
          <span>LOJIX · Gestão de Vendas</span>
        </div>
      </div>
    </>
  );
}

export default NavBar;
