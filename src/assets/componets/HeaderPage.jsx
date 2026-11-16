import { useState, useEffect } from "react";
import "./StyleHeaderPage.css";

function HeaderPage(props) {
  const [userLogado, setUserLogado] = useState("user");
  const [emailLogado, setEmailLogado] = useState("exemplo@exemplo.com");

  useEffect(() => {
    let logado = localStorage.getItem("userLogado");
    if (logado) {
      const usuario = JSON.parse(logado);
      const email = usuario.email;
      setUserLogado(usuario.username);
      setEmailLogado(email);
    }
  }, []);

  return (
    <>
      <header>
        <h1>{props.page}</h1>
        <div className="containerUser">
          <div className="containerusericon">
            <img className="usericon" src="/User_Icon.png" alt="usericon" />
          </div>
          <div>
            <p className="userLogado">{userLogado}</p>
            <p className="emailLogado">{emailLogado}</p>
          </div>
        </div>
      </header>
    </>
  );
}
export default HeaderPage;
