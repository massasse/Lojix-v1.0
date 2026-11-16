import { FaRegUser, FaLock } from "react-icons/fa";
import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import users from "../Data/Users.json";
import "./StyleLogin.css";

function Login() {
  const [inputemail, setInputEmail] = useState("");
  const [inputpass, setInputPass] = useState("");
  const navigate = useNavigate();
  const [error, setError] = useState("");

function entrar(e) {
  e.preventDefault();

  const email = inputemail.trim();
  const pass = inputpass;

  const userEncontrado = users.find(
    (user) =>
      user.email === email &&
      user.password === pass
  );

  if (userEncontrado) {
    try {
      const usuarioSeguro = { ...userEncontrado };

// Remover a palavra-passe
delete usuarioSeguro.password;

// Guardar apenas os dados necessários
localStorage.setItem(
  "userLogado",
  JSON.stringify(usuarioSeguro)
);;

      setError("");

      navigate("/principal/dashbord");

    } catch (erro) {
      setError(
        "Não foi possível guardar a sessão. Tente novamente."
      );

      console.error("Erro ao guardar sessão:", erro);
    }

  } else {
    setError("Email ou senha incorretos.");

    setTimeout(() => {
      setError("");
    }, 3000);
  }
}
  
  return (
    <>
      <div id="containerapp">
        <img src="/lojix_logo.png" alt="logo" className="logo" />
        <form onSubmit={entrar}>
          <div className="ContainerInput">
            <FaRegUser />
            <input
              type="email"
              placeholder="Digite seu email..."
              required
              className="input email"
              onChange={(envent) => setInputEmail(envent.target.value)}
              autoComplete="off "
            />
          </div>
          <div className="ContainerInput">
            <FaLock />
            <input
              type="text"
              placeholder="Digite sua senha..."
              required
              className="input  pass"
              onChange={(envent) => setInputPass(envent.target.value)}
            />
          </div>
          <p className="error">{error}</p>
          <button type="submit" className="bntlogin">
            Entrar
          </button>
        </form>
      </div>
    </>
  );
}

export default Login;
