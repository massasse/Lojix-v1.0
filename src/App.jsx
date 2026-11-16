import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import {AuthProvider,useAuth} from './lib/AuthContext';
import Login from "./assets/componets/Login";
import Principal from "./pages/Principal";
import Dashbord from "./pages/Dashbord";
import Vendas from "./pages/Vendas";
import Produtos from "./pages/Produtos";
import Clientes from "./pages/Clientes";
import Caixa from "./pages/Caixa";
import "./App.css";

function AreaProtegida({children}){
  const {user,ready}=useAuth();
  if(!ready) return <div style={{padding:40}}>A verificar sessão...</div>;
  return user ? children : <Navigate to="/" replace/>;
}
function Rotas(){
  return <BrowserRouter><Routes>
    <Route path="/" element={<Login/>}/>
    <Route path="/principal" element={<AreaProtegida><Principal/></AreaProtegida>}>
      <Route index element={<Navigate to="dashbord" replace/>}/>
      <Route path="dashbord" element={<Dashbord/>}/>
      <Route path="vendas" element={<Vendas/>}/>
      <Route path="produtos" element={<Produtos/>}/>
      <Route path="clientes" element={<Clientes/>}/>
      <Route path="caixa" element={<Caixa/>}/>
    </Route>
  </Routes></BrowserRouter>;
}
export default function App(){return <AuthProvider><Rotas/></AuthProvider>}
