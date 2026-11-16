import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import Login from "./assets/componets/Login";
import Principal from "./pages/Principal";
import Dashbord from "./pages/Dashbord";
import Vendas from "./pages/Vendas";
import Produtos from "./pages/Produtos";
import Clientes from "./pages/Clientes";
import Caixa from "./pages/Caixa";

import "./App.css";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />

        <Route path="/principal" element={<Principal />}>
          <Route
            index
            element={<Navigate to="dashbord" replace />}
          />

          <Route path="dashbord" element={<Dashbord />} />
          <Route path="vendas" element={<Vendas />} />
          <Route path="produtos" element={<Produtos />} />
          <Route path="clientes" element={<Clientes />} />
          <Route path="caixa" element={<Caixa />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;