import { useEffect, useRef, useState } from "react";
import { FaSearch, FaTrash } from "react-icons/fa";
import { FaCube } from "react-icons/fa6";

import HeaderPage from "../assets/componets/HeaderPage";
import {
  listarProdutos,
  listarClientes,
  registarVenda,
} from "../lib/lojixApi";

import "./StyleVendas.css";

// ============================================================
// 1. FUNÇÕES AUXILIARES
// ============================================================

// Obtém o nome do cliente, considerando os formatos recebidos pela API.
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

// Obtém um identificador estável para cada cliente.
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

// Formata valores monetários segundo a convenção de Moçambique.
function formatarNumero(valor) {
  return (Number(valor) || 0).toLocaleString("pt-MZ", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

// ============================================================
// 2. COMPONENTE PRINCIPAL — VENDAS
// ============================================================

function Vendas() {
  // 2.1. Estados da página.
  const [produtos, setProdutos] = useState([]);
  const [listaCarrinho, setListaCarrinho] = useState([]);
  const [listaClientes, setListaClientes] = useState([]);

  const [processando, setProcessando] = useState(false);
  const [modalAberto, setModalAberto] = useState(false);
  const [tipoOperacao, setTipoOperacao] = useState("");
  const [clienteSelecionado, setClienteSelecionado] = useState("");
  const [desconto, setDesconto] = useState("0");

  // Impede o envio duplicado da mesma operação.
  const processoPendente = useRef(false);

  // 2.2. Produtos que podem ser vendidos (stock superior a zero).
  const produtosFiltrados = produtos.filter(
    (produto) => Number(produto.stock) > 0
  );

  // 2.3. Carregamento inicial de produtos e clientes.
  useEffect(() => {
    let activo = true;

    const carregarDados = async () => {
      try {
        const [produtosAPI, clientesAPI] = await Promise.all([
          listarProdutos(),
          listarClientes(),
        ]);

        if (activo) {
          setProdutos(produtosAPI);
          setListaClientes(clientesAPI);
        }
      } catch (erro) {
        alert(`Erro ao carregar vendas: ${erro.message}`);
      }
    };

    carregarDados();

    return () => {
      activo = false;
    };
  }, []);

  // ==========================================================
  // 3. CÁLCULO DO CARRINHO E DO DESCONTO
  // ==========================================================

  const total = listaCarrinho.reduce(
    (soma, produto) => soma + Number(produto.vendaTotal || 0),
    0
  );

  // O desconto não pode ser negativo nem superior ao subtotal.
  const descontoNumerico = Math.max(0, Number(desconto) || 0);
  const descontoAplicado = Math.min(descontoNumerico, total);
  const totalFinal = Math.max(0, total - descontoAplicado);

  // ==========================================================
  // 4. GESTÃO DOS PRODUTOS NO CARRINHO
  // ==========================================================

  // Adiciona uma unidade do produto, respeitando o stock disponível.
  function adicionarCarrinho(id) {
    const produtoAdicionado = produtosFiltrados.find(
      (produto) => produto.id === id
    );

    if (!produtoAdicionado) {
      return;
    }

    setListaCarrinho((carrinho) => {
      const produtoExistente = carrinho.find(
        (produto) => produto.id === id
      );

      if (produtoExistente) {
        const quantidadeActual = Number(produtoExistente.quantidade) || 0;
        const stockDisponivel = Number(produtoAdicionado.stock) || 0;

        if (quantidadeActual >= stockDisponivel) {
          return carrinho;
        }

        return carrinho.map((produto) =>
          produto.id === id
            ? {
                ...produto,
                quantidade: quantidadeActual + 1,
                vendaTotal:
                  (quantidadeActual + 1) * Number(produto.venda),
              }
            : produto
        );
      }

      return [
        ...carrinho,
        {
          ...produtoAdicionado,
          quantidade: 1,
          vendaTotal: Number(produtoAdicionado.venda) || 0,
        },
      ];
    });
  }

  // Retira uma unidade do produto. Remove-o quando a quantidade chega a zero.
  function removerCarrinho(id) {
    setListaCarrinho((carrinho) =>
      carrinho
        .map((produto) => {
          if (produto.id !== id) {
            return produto;
          }

          const novaQuantidade = Number(produto.quantidade) - 1;

          return {
            ...produto,
            quantidade: novaQuantidade,
            vendaTotal: novaQuantidade * Number(produto.venda),
          };
        })
        .filter((produto) => produto.quantidade > 0)
    );
  }

  // Remove completamente um produto do carrinho.
  function eliminarDoCarrinho(id) {
    setListaCarrinho((carrinho) =>
      carrinho.filter((produto) => produto.id !== id)
    );
  }

  // ==========================================================
  // 5. ABERTURA E FECHO DO MODAL
  // ==========================================================

  function abrirModal(tipo) {
    if (listaCarrinho.length === 0) {
      alert("Adicione produtos ao carrinho primeiro!");
      return;
    }

    setTipoOperacao(tipo);

    // Nas vendas normais, a opção inicial é Caixa.
    setClienteSelecionado(tipo === "venda" ? "__CAIXA__" : "");
    setModalAberto(true);
  }

  function fecharModal() {
    setModalAberto(false);
  }

  // ==========================================================
  // 6. CONFIRMAÇÃO DA VENDA OU DO FIADO
  // ==========================================================

  async function confirmarOperacao(evento) {
    evento.preventDefault();

    if (processoPendente.current) {
      return;
    }

    const cliente = listaClientes.find(
      (item, index) =>
        obterIdCliente(item, index) === clienteSelecionado
    );

    // Uma operação a crédito exige um cliente válido.
    if (
      (tipoOperacao === "fiado" && !cliente) ||
      !clienteSelecionado
    ) {
      alert("Seleccione um cliente válido para a venda.");
      return;
    }

    processoPendente.current = true;
    setProcessando(true);

    try {
      await registarVenda({
        itens: listaCarrinho,
        clienteId: clienteSelecionado,
        tipo: tipoOperacao,
        desconto: descontoAplicado,
      });

      // Actualiza o stock depois de concluir a operação.
      const produtosActualizados = await listarProdutos();
      setProdutos(produtosActualizados);

      // Limpa os dados da operação concluída.
      setListaCarrinho([]);
      setDesconto("0");
      setModalAberto(false);
      setClienteSelecionado("");

      alert(
        tipoOperacao === "fiado"
          ? "Fiado registado com sucesso!"
          : "Venda realizada com sucesso!"
      );
    } catch (erro) {
      alert(`Erro ao concluir a operação: ${erro.message}`);
    } finally {
      processoPendente.current = false;
      setProcessando(false);
    }
  }

  // ==========================================================
  // 7. ESTRUTURA VISUAL DA PÁGINA DE VENDAS
  // ==========================================================

  return (
    <div className="contentVenda">
      <HeaderPage page="Vendas" />

      <main className="ContainerVendas">
        {/* 7.1. Catálogo de produtos. */}
        <section className="Vendas">
          <div className="inputSearch ContainerInputserch">
            <FaSearch />
            <input
              type="text"
              placeholder="Pesquisar..."
              className="search"
            />
          </div>

          <div className="ContainerStore">
            <h2 className="Cardtitulos">Produtos</h2>

            {produtosFiltrados.length === 0 ? (
              <div className="semProdutos">
                <p>Sem produtos disponíveis.</p>
              </div>
            ) : (
              <div className="comProdutos styleScrollBar">
                {produtosFiltrados.map((produto) => (
                  <button
                    type="button"
                    key={produto.id}
                    className="VendasProdutosCards"
                    onClick={() => adicionarCarrinho(produto.id)}
                  >
                    <div className="pIcon">
                      <FaCube />
                      <p className="pStock">{produto.stock} uni.</p>
                    </div>

                    <p className="pName">{produto.produto}</p>

                    <p className="pInfo">
                      <span>{produto.marca}</span>
                      {" · "}
                      <span>{produto.categoria}</span>
                    </p>

                    <div className="containerPrice">
                      <p className="pPrice">
                        {formatarNumero(produto.venda)} MT
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* 7.2. Carrinho e resumo financeiro da operação. */}
        <aside className="ContainerCarrinho">
          <h2 className="Cardtitulos">Carrinho</h2>

          {listaCarrinho.length === 0 ? (
            <div className="CarrinhoBody semProdutos">
              <p>Nenhum produto no carrinho.</p>
            </div>
          ) : (
            <div className="CarrinhoBody comProduto styleScrollBar">
              {listaCarrinho.map((produto) => (
                <div key={produto.id} className="cItem">
                  <div className="cHead">
                    <p className="ctitle">
                      {produto.produto} ({produto.quantidade})
                    </p>

                    <button
                      type="button"
                      onClick={() => eliminarDoCarrinho(produto.id)}
                      className="btnD"
                      aria-label={`Remover ${produto.produto} do carrinho`}
                    >
                      <FaTrash />
                    </button>
                  </div>

                  <div className="cBody">
                    <p className="price">
                      {produto.categoria}
                      {" · "}
                      {formatarNumero(produto.venda)} MT
                    </p>

                    <span>
                      <button
                        type="button"
                        onClick={() => adicionarCarrinho(produto.id)}
                        className="btnAR"
                        aria-label={`Adicionar uma unidade de ${produto.produto}`}
                      >
                        +
                      </button>

                      <button
                        type="button"
                        onClick={() => removerCarrinho(produto.id)}
                        className="btnAR"
                        aria-label={`Retirar uma unidade de ${produto.produto}`}
                      >
                        -
                      </button>

                      <p className="totalPrice">
                        {formatarNumero(produto.vendaTotal)}
                      </p>
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* 7.3. Subtotal, desconto e total. */}
          <div className="containerTotal">
            <div className="subtotal resumo">
              <p>Subtotal</p>
              <p>{formatarNumero(total)} MT</p>
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
                onChange={(evento) => setDesconto(evento.target.value)}
                disabled={listaCarrinho.length === 0}
              />
            </div>

            <div className="total resumo">
              <p>Total</p>
              <p>{formatarNumero(totalFinal)} MT</p>
            </div>
          </div>

          {/* 7.4. Acções disponíveis. */}
          <div className="acoes">
            <button
              type="button"
              className="btnResumo btnVenda"
              onClick={() => abrirModal("venda")}
            >
              Venda
            </button>

            <button
              type="button"
              className="btnResumo btnFiado"
              onClick={() => abrirModal("fiado")}
            >
              Fiado
            </button>
          </div>
        </aside>
      </main>

      {/* ======================================================
          8. MODAL DE CONFIRMAÇÃO DA VENDA OU DO FIADO
         ====================================================== */}

      {modalAberto && (
        <div className="modalOverlay" onClick={fecharModal}>
          <div
            className="modalVenda"
            onClick={(evento) => evento.stopPropagation()}
          >
            <div className="modalVendaHeader">
              <h2>
                {tipoOperacao === "fiado"
                  ? "Registar fiado"
                  : "Finalizar venda"}
              </h2>

              <button
                type="button"
                onClick={fecharModal}
                aria-label="Fechar janela"
              >
                ×
              </button>
            </div>

            <form onSubmit={confirmarOperacao}>
              {/* 8.1. Selecção do cliente. */}
              <label htmlFor="clienteVenda">Cliente</label>

              <select
                id="clienteVenda"
                value={clienteSelecionado}
                onChange={(evento) =>
                  setClienteSelecionado(evento.target.value)
                }
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
                  Não existem clientes registados. Cadastre um cliente antes
                  de registar um fiado.
                </p>
              )}

              {/* 8.2. Resumo dos valores da operação. */}
              <div className="modalResumo">
                <span>Subtotal</span>
                <strong>{formatarNumero(total)} MT</strong>
              </div>

              <div className="modalResumo">
                <span>Desconto</span>
                <strong>{formatarNumero(descontoAplicado)} MT</strong>
              </div>

              <div className="modalResumo">
                <span>Total da operação</span>
                <strong>{formatarNumero(totalFinal)} MT</strong>
              </div>

              {tipoOperacao === "fiado" && (
                <p className="avisoFiado">
                  Esta operação será registada como uma dívida do cliente.
                </p>
              )}

              {/* 8.3. Botões de confirmação. */}
              <div className="modalAcoes">
                <button
                  type="button"
                  className="btnModalCancelar"
                  onClick={fecharModal}
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={processando}
                  className="btnModalConfirmar"
                >
                  {processando
                    ? "A processar..."
                    : tipoOperacao === "fiado"
                      ? "Confirmar fiado"
                      : "Confirmar venda"}
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
