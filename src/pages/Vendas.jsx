import HeaderPage from "../assets/componets/HeaderPage";
import { FaSearch } from "react-icons/fa";
import { FaCube } from "react-icons/fa6";
import "./StyleVendas.css";
import { useState } from "react";
import { useEffect } from "react";
import { FaTrash } from "react-icons/fa";

function Vendas() {
  let produtos = localStorage.getItem("lojix_produtos") || "[]";

  let produtosFiltrados = JSON.parse(produtos).filter((p) => {
    return p.stock > 0;
  });

  let vendedor = JSON.parse(localStorage.getItem("userLogado"))
 

  const [listaCarrinho, setListaCarrinho] = useState(() => {
    return JSON.parse(localStorage.getItem("lojix_carrinho") || "[]");
  });

  const [listaVendas, setListaVendas] = useState(() => {
    return JSON.parse(localStorage.getItem("lojix_vendas") || "[]");
  });

  const [listaClientes] = useState(() => {
    try {
      const clientesGuardados = JSON.parse(
        localStorage.getItem("lojix_clientes") || "[]",
      );

      if (Array.isArray(clientesGuardados)) {
        return clientesGuardados;
      }

      if (Array.isArray(clientesGuardados?.clientes)) {
        return clientesGuardados.clientes;
      }

      return clientesGuardados && typeof clientesGuardados === "object"
        ? Object.values(clientesGuardados)
        : [];
    } catch {
      return [];
    }
  });
  const [modalAberto, setModalAberto] = useState(false);
  const [tipoOperacao, setTipoOperacao] = useState("");
  const [clienteSelecionado, setClienteSelecionado] = useState("");
  const [desconto, setDesconto] = useState("0");
  useEffect(() => {
    localStorage.setItem("lojix_carrinho", JSON.stringify(listaCarrinho));
  }, [listaCarrinho]);
  const total = listaCarrinho.reduce((soma, p) => {
    return soma + Number(p.vendaTotal || 0);
  }, 0);

  // O desconto é sempre limitado ao valor do subtotal.
  const descontoNumerico = Math.max(0, Number(desconto) || 0);
  const descontoAplicado = Math.min(descontoNumerico, total);
  const totalFinal = Math.max(0, total - descontoAplicado);
  useEffect(() => {
    localStorage.setItem("lojix_vendas", JSON.stringify(listaVendas));
  }, [listaVendas]);

  function obterNomeCliente(cliente) {
    if (typeof cliente === "string") {
      return cliente;
    }

    return (
      cliente?.nome ??
      cliente?.nomeCliente ??
      cliente?.nome_completo ??
      cliente?.name ??
      cliente?.cliente ??
      ""
    );
  }

  function obterIdCliente(cliente, index) {
    if (typeof cliente === "string") {
      return cliente;
    }

    const identificador =
      cliente?.id ??
      cliente?.codigo ??
      cliente?.clienteId ??
      obterNomeCliente(cliente);

    return String(identificador || `cliente-${index}`);
  }

  function adicionarCarrinho(id) {
    const produtoAdicionado = produtosFiltrados.find((p) => p.id === id);
    if (!produtoAdicionado) return;
    setListaCarrinho((carrinho) => {
      const produtoExistente = carrinho.find((p) => p.id === id);
      if (produtoExistente) {
        if (produtoExistente.quantidade >= produtoAdicionado.stock) {
          return carrinho;
        }
        return carrinho.map((p) =>
          p.id === id
            ? {
                ...p,
                quantidade: p.quantidade + 1,
                vendaTotal: (p.quantidade + 1) * p.venda,
              }
            : p,
        );
      }
      return [
        ...carrinho,
        {
          ...produtoAdicionado,
          quantidade: 1,
          vendaTotal: produtoAdicionado.venda,
        },
      ];
    });
  }

  function removerCarrinho(key) {
    let produtoAdicionado = produtosFiltrados.find((p) => p.id === key);
    //console.log(produtoAdicionado)
    if (!produtoAdicionado) return;
    const novoCarrinho = (carrinho) => {
      let produtoExistente = carrinho.find((p) => p.id === key);
      if (produtoExistente) {
        if (produtoExistente.quantidade === 0) {
          return carrinho;
        }
        return carrinho
          .map((p) =>
            p.id === key
              ? {
                  ...p,
                  quantidade: p.quantidade - 1,
                  vendaTotal: (p.quantidade - 1) * p.venda,
                }
              : p,
          )
          .filter((p) => p.quantidade > 0);
      }
      return [...carrinho, { ...produtoAdicionado, quantidade: 1 }];
    };
    setListaCarrinho(novoCarrinho);
  }

  function deleteCarrinho(key) {
    const novoCarrinho = (carrinho) => {
      let produtoExistente = carrinho.find((p) => p.id === key);
      return carrinho.filter((p) => p.id != key);
    };
    setListaCarrinho(novoCarrinho);
  }

  function abrirModal(tipo) {
    if (listaCarrinho.length === 0) {
      alert("Adicione produtos ao carrinho primeiro!");
      return;
    }
    setTipoOperacao(tipo);
    setClienteSelecionado(tipo === "venda" ? "__CAIXA__" : "");
    setModalAberto(true);
  }

  function vender() {
    abrirModal("venda");
  }

  function fiado() {
    abrirModal("fiado");
  }

  function fecharModal() {
    setModalAberto(false);
  }

  function confirmarOperacao(e) {
    e.preventDefault();

    const clienteEncontrado = listaClientes.find(
      (cliente, index) => obterIdCliente(cliente, index) === clienteSelecionado,
    );

    const nomeClienteOperacao =
      tipoOperacao === "venda" && clienteSelecionado === "__CAIXA__"
        ? "Caixa"
        : obterNomeCliente(clienteEncontrado);

    if (
      !clienteSelecionado ||
      !nomeClienteOperacao.trim() ||
      (tipoOperacao === "fiado" && clienteSelecionado === "__CAIXA__")
    ) {
      alert(
        tipoOperacao === "fiado"
          ? "Seleccione um cliente para registar o fiado."
          : "Seleccione um cliente para concluir a venda.",
      );
      return;
    }

    // Obter os produtos actuais
    const produtosActuais = JSON.parse(
      localStorage.getItem("lojix_produtos") || "[]",
    );

    // Verificar se ainda existe stock suficiente
    const stockInsuficiente = listaCarrinho.find((item) => {
      const produto = produtosActuais.find((p) => p.id === item.id);
      return !produto || Number(produto.stock) < Number(item.quantidade);
    });

    if (stockInsuficiente) {
      alert(`Stock insuficiente para ${stockInsuficiente.produto}.`);
      return;
    }

    // Calcular o total da operação
    const subtotalVenda = total;
    const descontoVenda = descontoAplicado;
    const totalVenda = totalFinal;

    // Gerar o próximo código no formato #000001
    const maiorNumeroVenda = listaVendas.reduce((maior, venda) => {
      const correspondencia = String(venda.id ?? "").match(/^#(\d+)$/);

      if (!correspondencia) {
        return maior;
      }

      return Math.max(maior, Number(correspondencia[1]));
    }, 0);

    const novoIdVenda = `#${String(maiorNumeroVenda + 1).padStart(6, "0")}`;

    // Criar o registo da venda
    const novaVenda = {
      id: novoIdVenda,
      cliente: nomeClienteOperacao.trim(),
      clienteId:
        clienteSelecionado === "__CAIXA__"
          ? null
          : (clienteEncontrado?.id ?? clienteSelecionado),
      tipo: tipoOperacao,
      data: new Date().toLocaleDateString("pt-PT", {
        day: "2-digit",
        month: "numeric",
        year: "numeric",
      }),
      produtos: listaCarrinho.map((p) => ({
        ...p,
      })),
      subtotal: subtotalVenda,
      desconto: descontoVenda,
      total: totalVenda,
      estado: tipoOperacao === "fiado" ? "Pendente" : "Pago",
      valorPago: tipoOperacao === "fiado" ? 0 : totalVenda,
      valorEmDivida: tipoOperacao === "fiado" ? totalVenda : 0,
      vendedor: vendedor.username,
    };

    // Actualizar o stock dos produtos
    const produtosActualizados = produtosActuais.map((produto) => {
      const produtoVendido = listaCarrinho.find((p) => p.id === produto.id);

      if (!produtoVendido) {
        return produto;
      }

      return {
        ...produto,
        stock: Number(produto.stock) - Number(produtoVendido.quantidade),
      };
    });

    // Guardar os novos stocks
    localStorage.setItem(
      "lojix_produtos",
      JSON.stringify(produtosActualizados),
    );

    // Adicionar a operação ao histórico de vendas
    setListaVendas((vendas) => {
      return [...vendas, novaVenda];
    });

    // Limpar o carrinho
    setListaCarrinho([]);
    setDesconto("0");

    // Fechar o modal
    setModalAberto(false);

    // Limpar a selecção do cliente
    setClienteSelecionado("");

    alert(
      tipoOperacao === "fiado"
        ? "Fiado registado com sucesso!"
        : "Venda realizada com sucesso!",
    );
  }

  return (
    <div className="contentVenda">
      <HeaderPage page="Vendas" />
      <main className="ContainerVendas">
        <div className="Vendas">
          <div className="inputSearch ContainerInputserch">
            <FaSearch />
            <input type="text" placeholder="Pesquisar..." className="search" />
          </div>
          <div className="ContainerStore">
            <p className="Cardtitulos">Produtos</p>
            {produtosFiltrados.length === 0 ? (
              <div className="semProdutos">
                <p>Sem produtos</p>
              </div>
            ) : (
              <div className="comProdutos styleScrollBar">
                {produtosFiltrados.map((p) => (
                  <button
                    key={p.id}
                    className="VendasProdutosCards"
                    onClick={() => adicionarCarrinho(p.id)}
                  >
                    <div className="pIcon">
                      <FaCube />
                      <p className="pStock">{p.stock} uni.</p>
                    </div>
                    <p className="pName">{p.produto}</p>
                    <p className="pInfo">
                      <span>{p.marca} </span> · <span> {p.categoria}</span>
                    </p>
                    <div className="containerPrice">
                      <p className="pPrice">
                        {Number(p.venda).toLocaleString("pt-MZ", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}{" "}
                        MT
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="ContainerCarrinho">
          <h2 className="Cardtitulos">Carrinho</h2>
          {listaCarrinho.length === 0 ? (
            <div className="CarrinhoBody semProdutos">
              <p>Nenhum produto no carrinho</p>
            </div>
          ) : (
            <div className="CarrinhoBody comProduto styleScrollBar">
              {listaCarrinho.map((p) => (
                <div key={p.id} className="cItem">
                  <div className="cHead">
                    <p className="ctitle">
                      {p.produto} <span>({p.quantidade})</span>{" "}
                    </p>
                    <button
                      onClick={() => deleteCarrinho(p.id)}
                      className="btnD"
                    >
                      <FaTrash />
                    </button>
                  </div>
                  <div className="cBody">
                    <p className="price">
                      {p.categoria} <span> · </span>{" "}
                      {Number(p.venda).toLocaleString("pt-MZ", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}{" "}
                      MT
                    </p>
                    <span>
                      <button
                        onClick={() => adicionarCarrinho(p.id)}
                        className="btnAR"
                      >
                        +
                      </button>
                      <button
                        onClick={() => removerCarrinho(p.id)}
                        className="btnAR"
                      >
                        -
                      </button>
                      <p className="totalPrice">{p.vendaTotal}</p>
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="containerTotal">
            <div className="subtotal resumo">
              <p>Subtotal</p>
              <p>
                {" "}
                {Number(total).toLocaleString("pt-MZ", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}{" "}
                MT
              </p>
            </div>
            <div className="desconto resumo">
              <label htmlFor="descontoVenda">Desconto (MT)</label>
              <input
                id="descontoVenda"
                type="number"
                min="0"
                max={total}
                step="0.01"
                placeholder="0,00"
                value={desconto}
                onChange={(e) => setDesconto(e.target.value)}
                disabled={listaCarrinho.length === 0}
              />
            </div>
            <div className="total resumo">
              <p>Total</p>
              <p>
                {Number(totalFinal).toLocaleString("pt-MZ", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}{" "}
                MT
              </p>
            </div>
          </div>
          <div className="acoes">
            <button className="btnResumo btnVenda" onClick={vender}>
              Venda
            </button>
            <button className="btnResumo btnFiado" onClick={fiado}>
              Fiado
            </button>
          </div>
        </div>
      </main>
      {modalAberto && (
        <div className="modalOverlay" onClick={fecharModal}>
          <div className="modalVenda" onClick={(e) => e.stopPropagation()}>
            <div className="modalVendaHeader">
              <h2>
                {tipoOperacao === "fiado"
                  ? "Registar Fiado"
                  : "Finalizar Venda"}
              </h2>
              <button type="button" onClick={fecharModal}>
                ×
              </button>
            </div>
            <form onSubmit={confirmarOperacao} className="">
              <label htmlFor="clienteVenda">Cliente</label>
              <select
                id="clienteVenda"
                value={clienteSelecionado}
                onChange={(e) => setClienteSelecionado(e.target.value)}
                required
                autoFocus
              >
                <option value="" disabled>
                  Seleccione um cliente
                </option>

                {tipoOperacao === "venda" && (
                  <option value="__CAIXA__">Caixa</option>
                )}

                {listaClientes.map((cliente, index) => {
                  const idCliente = obterIdCliente(cliente, index);
                  const nome = obterNomeCliente(cliente);

                  if (!nome) {
                    return null;
                  }

                  return (
                    <option key={idCliente} value={idCliente}>
                      {nome}
                    </option>
                  );
                })}
              </select>

              {tipoOperacao === "fiado" && listaClientes.length === 0 && (
                <p className="avisoFiado">
                  Não existem clientes registados. Cadastre um cliente antes de
                  registar um fiado.
                </p>
              )}
              <div className="modalResumo">
                <span>Subtotal</span>
                <strong>
                  {Number(total).toLocaleString("pt-MZ", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })} MT
                </strong>
              </div>
              <div className="modalResumo">
                <span>Desconto</span>
                <strong>
                  {Number(descontoAplicado).toLocaleString("pt-MZ", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })} MT
                </strong>
              </div>
              <div className="modalResumo">
                <span>Total da operação</span>
                <strong>
                  {Number(totalFinal).toLocaleString("pt-MZ", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })} MT
                </strong>
              </div>
              {tipoOperacao === "fiado" && (
                <p className="avisoFiado">
                  Esta operação será registada como uma dívida do cliente.
                </p>
              )}
              <div className="modalAcoes">
                <button
                  type="button"
                  className="btnModalCancelar"
                  onClick={fecharModal}
                >
                  Cancelar
                </button>
                <button type="submit" className="btnModalConfirmar">
                  {tipoOperacao === "fiado"
                    ? "Confirmar Fiado"
                    : "Confirmar Venda"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
export default Vendas;
