import NavBar from "../assets/componets/Navbar";
import { Outlet, Navigate } from "react-router-dom";
import { useState } from "react";

import "./StylePrincipal.css";

// Chaves utilizadas pelo LOJIX
const CHAVES = [
  {
    chave: "lojix_produtos",
    nome: "Produtos",
  },
  {
    chave: "lojix_vendas",
    nome: "Vendas",
  },
  {
    chave: "lojix_clientes",
    nome: "Clientes",
    permiteObjeto: true,
  },
  {
    chave: "lojix_carrinho",
    nome: "Carrinho",
  },
  {
  chave: "lojix_caixa_movimentos",
  nome: "Movimentos de caixa",
},
];

// Verificar utilizador autenticado
function obterUsuarioLogado() {
  try {
    const guardado = localStorage.getItem("userLogado");

    if (!guardado) return null;

    const usuario = JSON.parse(guardado);

    if (
      !usuario ||
      typeof usuario !== "object" ||
      typeof usuario.username !== "string" ||
      !usuario.username.trim() ||
      typeof usuario.email !== "string" ||
      !usuario.email.trim()
    ) {
      return null;
    }

    return usuario;

  } catch {
    return null;
  }
}

// Inicializar e validar o LocalStorage
function inicializarLocalStorage() {
  try {
    const chavesEmFalta = [];
    const erros = [];

    // PRIMEIRA FASE: verificar os dados existentes
    CHAVES.forEach((item) => {
      const valor = localStorage.getItem(item.chave);

      if (valor === null) {
        chavesEmFalta.push(item);
        return;
      }

      let dados;

      try {
        dados = JSON.parse(valor);
      } catch {
        erros.push(
          `${item.nome}: os dados guardados estão corrompidos.`
        );
        return;
      }

      const formatoValido = item.permiteObjeto
        ? dados !== null && typeof dados === "object"
        : Array.isArray(dados);

      if (!formatoValido) {
        erros.push(
          `${item.nome}: formato de dados inválido.`
        );
      }
    });

    // Se existirem erros, não alterar os dados
    if (erros.length > 0) {
      return {
        sucesso: false,
        erros,
      };
    }

    // SEGUNDA FASE: criar apenas as chaves inexistentes
    chavesEmFalta.forEach((item) => {
      localStorage.setItem(
        item.chave,
        JSON.stringify([])
      );
    });

    return {
      sucesso: true,
      erros: [],
    };

  } catch (erro) {
    return {
      sucesso: false,
      erros: [
        `Não foi possível inicializar o LocalStorage: ${erro.message}`,
      ],
    };
  }
}

function Principal() {

  const usuarioLogado = obterUsuarioLogado();

  // Executar a inicialização antes de apresentar o Outlet
  const [estadoInicializacao] = useState(() => {
    if (!usuarioLogado) {
      return {
        sucesso: false,
        erros: [],
      };
    }

    return inicializarLocalStorage();
  });

  // Sem utilizador autenticado, voltar ao Login
  if (!usuarioLogado) {
    return <Navigate to="/" replace />;
  }

  // Apresentar erro sem destruir os dados existentes
  if (!estadoInicializacao.sucesso) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          padding: "25px",
          background: "#f1f5f9",
        }}
      >
        <div
          style={{
            maxWidth: "550px",
            width: "100%",
            background: "#fff",
            padding: "25px",
            borderRadius: "12px",
          }}
        >
          <h2 style={{ color: "#dc2626" }}>
            Erro na inicialização do LOJIX
          </h2>

          <p style={{ margin: "15px 0" }}>
            Foram encontrados problemas nos dados do sistema.
            Nenhum dado existente foi sobrescrito.
          </p>

          <ul style={{ paddingLeft: "20px" }}>
            {estadoInicializacao.erros.map((erro, index) => (
              <li key={index} style={{ marginBottom: "8px" }}>
                {erro}
              </li>
            ))}
          </ul>

          <p style={{ marginTop: "15px", color: "#64748b" }}>
            Corrige o problema identificado antes de continuar.
          </p>
        </div>
      </div>
    );
  }

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

export default Principal;