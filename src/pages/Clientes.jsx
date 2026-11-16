
import { useMemo, useState } from "react";
import HeaderPage from "../assets/componets/HeaderPage";
import HeadPage from "../assets/componets/Headpage";

import {
  FaEye,
  FaPen,
  FaTrash,
  FaTimes,
  FaMoneyBillWave,
} from "react-icons/fa";

import "./StyleClientes.css";

// Ler dados do LocalStorage
function carregarLista(chave) {
  try {
    const dados = JSON.parse(localStorage.getItem(chave) || "[]");

    if (Array.isArray(dados)) return dados;

    if (Array.isArray(dados?.clientes)) {
      return dados.clientes;
    }

    if (dados && typeof dados === "object") {
      return Object.values(dados).filter(
        (item) => item && typeof item === "object"
      );
    }

    return [];
  } catch {
    return [];
  }
}

// Normalizar texto para pesquisa
function normalizarTexto(texto) {
  return String(texto || "").trim().toLowerCase();
}

// Calcular dívida de uma venda
function calcularDivida(venda) {
  if (
    venda.valorEmDivida !== undefined &&
    venda.valorEmDivida !== null
  ) {
    return Math.max(0, Number(venda.valorEmDivida) || 0);
  }

  if (venda.tipo !== "fiado") return 0;

  return Math.max(
    0,
    Number(venda.total || 0) - Number(venda.valorPago || 0)
  );
}

// Formatar valores monetários
function formatarMT(valor) {
  return (
    Number(valor || 0).toLocaleString("pt-MZ", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }) + " MT"
  );
}

// Formatar datas
function formatarData(data) {
  if (!data) return "—";

  if (
    typeof data === "string" &&
    /^\d{2}\/\d{1,2}\/\d{4}$/.test(data)
  ) {
    return data;
  }

  const dataConvertida = new Date(data);

  if (Number.isNaN(dataConvertida.getTime())) {
    return String(data);
  }

  return dataConvertida.toLocaleString("pt-MZ");
}

// Encontrar compras de determinado cliente
function obterVendasCliente(vendas, cliente) {
  return vendas.filter((venda) => {
    const mesmoId =
      venda.clienteId !== null &&
      venda.clienteId !== undefined &&
      String(venda.clienteId) === String(cliente.id);

    const mesmoNome =
      normalizarTexto(venda.cliente) ===
      normalizarTexto(cliente.nome);

    return mesmoId || mesmoNome;
  });
}

function Clientes() {
const [clientes, setClientes] = useState(() =>
  carregarLista("lojix_clientes").map((cliente) => ({
    ...cliente,
    nome:
      cliente.nome ??
      cliente.nomeCliente ??
      cliente.nome_completo ??
      cliente.name ??
      cliente.cliente ??
      "",
    telefone: cliente.telefone ?? cliente.phone ?? "",
  }))
);

  const [vendas, setVendas] = useState(() =>
    carregarLista("lojix_vendas")
  );

  const [pesquisa, setPesquisa] = useState("");

  const [modal, setModal] = useState("");

  const [clienteAtivo, setClienteAtivo] = useState(null);

  const [form, setForm] = useState({
    nome: "",
    telefone: "",
  });

  const [vendaPagamento, setVendaPagamento] = useState(null);

  const [valorPagamento, setValorPagamento] = useState("");

  // Guardar clientes preservando o formato antigo,
  // caso esteja organizado dentro de { clientes: [] }.
  function guardarClientes(novaLista) {
    let dadosParaGuardar = novaLista;

    try {
      const dadosAntigos = JSON.parse(
        localStorage.getItem("lojix_clientes") || "[]"
      );

      if (
        !Array.isArray(dadosAntigos) &&
        dadosAntigos &&
        Array.isArray(dadosAntigos.clientes)
      ) {
        dadosParaGuardar = {
          ...dadosAntigos,
          clientes: novaLista,
        };
      }
    }  catch (erro) {
  console.error("Erro ao ler clientes existentes:", erro);

  throw new Error(
    "Não foi possível validar os dados existentes. Nenhuma alteração foi feita."
  );
}

    localStorage.setItem(
      "lojix_clientes",
      JSON.stringify(dadosParaGuardar)
    );

    setClientes(novaLista);
  }

  // Vendas filtradas para cada cliente
  const clientesFiltrados = useMemo(() => {
    return clientes.filter((cliente) => {
      const nome = normalizarTexto(cliente.nome);
      const telefone = normalizarTexto(cliente.telefone);
      const termo = normalizarTexto(pesquisa);

      return (
        nome.includes(termo) ||
        telefone.includes(termo)
      );
    });
  }, [clientes, pesquisa]);

  // Total de clientes com dívidas
  const clientesComDivida = useMemo(() => {
    return clientes.filter((cliente) => {
      const compras = obterVendasCliente(vendas, cliente);

      return compras.some(
        (venda) => calcularDivida(venda) > 0
      );
    }).length;
  }, [clientes, vendas]);

  // Total geral de dívidas
  const totalDividas = useMemo(() => {
    return vendas.reduce((total, venda) => {
      if (venda.tipo !== "fiado") return total;

      return total + calcularDivida(venda);
    }, 0);
  }, [vendas]);

  // Abrir cadastro
  function abrirNovoCliente() {
    setClienteAtivo(null);

    setForm({
      nome: "",
      telefone: "",
    });

    setModal("novo");
  }

  // Abrir edição
  function editarCliente(cliente) {
    setClienteAtivo(cliente);

    setForm({
      nome: cliente.nome || "",
      telefone: cliente.telefone || "",
    });

    setModal("editar");
  }

  // Guardar cliente
  function guardarCliente(e) {
    e.preventDefault();

    const nome = form.nome.trim();
    const telefone = form.telefone.trim();

    if (!nome || !telefone) {
      alert("Preencha o nome e o telefone do cliente.");
      return;
    }

    try {
      let novaLista;

      if (modal === "editar") {
        novaLista = clientes.map((cliente) =>
          String(cliente.id) === String(clienteAtivo.id)
            ? {
                ...cliente,
                nome,
                telefone,
              }
            : cliente
        );
      } else {
        const maiorId = clientes.reduce(
          (maior, cliente) =>
            Math.max(maior, Number(cliente.id) || 0),
          0
        );

        const novoCliente = {
          id: maiorId + 1,
          nome,
          telefone,
          dataCadastro: new Date().toISOString(),
        };

        novaLista = [...clientes, novoCliente];
      }

      guardarClientes(novaLista);

      setModal("");
      setClienteAtivo(null);

    } catch (erro) {
      console.error("Erro ao guardar cliente:", erro);

      alert(
        "Não foi possível guardar o cliente. Verifique o LocalStorage."
      );
    }
  }

  // Eliminar cliente
  function eliminarCliente(cliente) {
    const compras = obterVendasCliente(vendas, cliente);

    const possuiDivida = compras.some(
      (venda) => calcularDivida(venda) > 0
    );

    if (compras.length > 0 || possuiDivida) {
      alert(
        "Não é possível eliminar este cliente porque existem vendas ou dívidas associadas. O histórico deve ser preservado."
      );

      return;
    }

    const confirmar = window.confirm(
      `Deseja realmente eliminar o cliente ${cliente.nome}?`
    );

    if (!confirmar) return;

    try {
      const novaLista = clientes.filter(
        (item) => String(item.id) !== String(cliente.id)
      );

      guardarClientes(novaLista);

    } catch (erro) {
      console.error("Erro ao eliminar cliente:", erro);

      alert("Não foi possível eliminar o cliente.");
    }
  }

  // Abrir histórico
  function abrirHistorico(cliente) {
    setClienteAtivo(cliente);
    setModal("historico");
  }

  function fecharModal() {
    setModal("");
    setClienteAtivo(null);
    setVendaPagamento(null);
    setValorPagamento("");
  }

  // Abrir pagamento de dívida
  function abrirPagamento(venda) {
    setVendaPagamento(venda);
    setValorPagamento("");
  }

  // Registar pagamento parcial ou total
  function confirmarPagamento(e) {
    e.preventDefault();

    const valor = Number(valorPagamento);

    if (!Number.isFinite(valor) || valor <= 0) {
      alert("Introduza um valor de pagamento válido.");
      return;
    }

    const vendasAtuais = carregarLista("lojix_vendas");

    const vendaAtual = vendasAtuais.find(
      (venda) =>
        String(venda.id) === String(vendaPagamento.id)
    );

    if (!vendaAtual) {
      alert("Não foi possível localizar esta venda.");
      return;
    }

    const dividaAtual = calcularDivida(vendaAtual);

    if (dividaAtual <= 0) {
      alert("Esta dívida já foi totalmente liquidada.");
      return;
    }

    if (valor > dividaAtual) {
      alert(
        `O pagamento não pode ultrapassar ${formatarMT(dividaAtual)}.`
      );

      return;
    }

    const agora = new Date();

    const pagamentoId =
      `PG-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

    const pagamento = {
      id: pagamentoId,
      valor,
      data: agora.toISOString(),
    };

    const novoValorPago =
      Number(vendaAtual.valorPago || 0) + valor;

    const novaDivida = Math.max(0, dividaAtual - valor);

    const vendaAtualizada = {
      ...vendaAtual,

      valorPago: novoValorPago,

      valorEmDivida: novaDivida,

      estado: novaDivida <= 0.001 ? "Pago" : "Parcial",

      pagamentos: [
        ...(Array.isArray(vendaAtual.pagamentos)
          ? vendaAtual.pagamentos
          : []),
        pagamento,
      ],
    };

    const novasVendas = vendasAtuais.map((venda) =>
      String(venda.id) === String(vendaAtual.id)
        ? vendaAtualizada
        : venda
    );

    // Registar o recebimento no Caixa
    const movimentosAtuais = carregarLista(
      "lojix_caixa_movimentos"
    );

    const novoMovimento = {
      id: `CX-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 7)}`,

      tipo: "recebimento_fiado",

      descricao: `Pagamento de fiado ${vendaAtual.id}`,

      valor,

      data: agora.toISOString(),

      vendaId: vendaAtual.id,

      clienteId:
        vendaAtual.clienteId ?? clienteAtivo?.id ?? null,

      cliente:
        vendaAtual.cliente || clienteAtivo?.nome || "",

      origem: "fiado",

      pagamentoId,
    };

    const novosMovimentos = [
      ...movimentosAtuais,
      novoMovimento,
    ];

    // Guardar os dados com possibilidade de recuperação
    const vendasAnteriores = localStorage.getItem("lojix_vendas");

    const movimentosAnteriores = localStorage.getItem(
      "lojix_caixa_movimentos"
    );

    try {
      localStorage.setItem(
        "lojix_vendas",
        JSON.stringify(novasVendas)
      );

      localStorage.setItem(
        "lojix_caixa_movimentos",
        JSON.stringify(novosMovimentos)
      );

      setVendas(novasVendas);

      setVendaPagamento(null);
      setValorPagamento("");

      alert(
        novaDivida <= 0.001
          ? "Dívida totalmente liquidada!"
          : `Pagamento registado! Dívida restante: ${formatarMT(novaDivida)}`
      );

    } catch (erro) {
      console.error("Erro ao registar pagamento:", erro);

      // Tentar restaurar os dados anteriores
      try {
        if (vendasAnteriores === null) {
          localStorage.removeItem("lojix_vendas");
        } else {
          localStorage.setItem(
            "lojix_vendas",
            vendasAnteriores
          );
        }

        if (movimentosAnteriores === null) {
          localStorage.removeItem("lojix_caixa_movimentos");
        } else {
          localStorage.setItem(
            "lojix_caixa_movimentos",
            movimentosAnteriores
          );
        }
      } catch (erroRestauro) {
        console.error(
          "Erro ao restaurar os dados:",
          erroRestauro
        );
      }

      alert(
        "Ocorreu um erro ao guardar o pagamento. Os dados anteriores foram preservados sempre que possível."
      );
    }
  }

  // Histórico do cliente seleccionado
  const historicoAtual = clienteAtivo
    ? obterVendasCliente(vendas, clienteAtivo)
    : [];

  const dividaClienteAtivo = historicoAtual.reduce(
    (total, venda) => total + calcularDivida(venda),
    0
  );

  return (
    <div className="contentClientes">

      <HeaderPage page="Clientes" />

      <main className="ContentClientesPage">

        {/* RESUMO DOS CLIENTES */}

        <div className="ResumoClientes">

          <div className="CardResumoCliente">
            <p>Total de clientes</p>
            <strong>{clientes.length}</strong>
          </div>

          <div className="CardResumoCliente">
            <p>Clientes com dívidas</p>
            <strong>{clientesComDivida}</strong>
          </div>

          <div className="CardResumoCliente">
            <p>Total por receber</p>
            <strong>{formatarMT(totalDividas)}</strong>
          </div>

        </div>

        {/* PESQUISA E CADASTRO */}

        <HeadPage
          namebtn="Novo Cliente"
          serch={pesquisa}
          setInputserch={setPesquisa}
          onAdicionar={abrirNovoCliente}
        />

        {/* TABELA DE CLIENTES */}

        <div className="TabelaClientesPage styleScrollBar">

          <table className="TabelaClientes">

            <thead>
              <tr>
                <th>Cliente</th>
                <th>Telefone</th>
                <th>Compras</th>
                <th>Dívida</th>
                <th>Ações</th>
              </tr>
            </thead>

            <tbody>

              {clientesFiltrados.length === 0 ? (

                <tr>
                  <td colSpan={5} className="info">
                    {pesquisa
                      ? "Nenhum cliente encontrado."
                      : "Ainda não existem clientes registados."}
                  </td>
                </tr>

              ) : (

                clientesFiltrados.map((cliente) => {

                  const compras = obterVendasCliente(
                    vendas,
                    cliente
                  );

                  const divida = compras.reduce(
                    (total, venda) =>
                      total + calcularDivida(venda),
                    0
                  );

                  return (
                    <tr key={cliente.id}>

                      <td>
                        <strong>{cliente.nome}</strong>
                      </td>

                      <td>{cliente.telefone}</td>

                      <td>{compras.length}</td>

                      <td>
                        <span
                          className={
                            divida > 0
                              ? "DividaPendente"
                              : "DividaLiquidada"
                          }
                        >
                          {formatarMT(divida)}
                        </span>
                      </td>

                      <td className="AcoesCliente">

                        <button
                          type="button"
                          className="ClienteBtnHistorico"
                          title="Histórico e dívidas"
                          onClick={() =>
                            abrirHistorico(cliente)
                          }
                        >
                          <FaEye />
                        </button>

                        <button
                          type="button"
                          className="ClienteBtnEditar"
                          title="Editar cliente"
                          onClick={() =>
                            editarCliente(cliente)
                          }
                        >
                          <FaPen />
                        </button>

                        <button
                          type="button"
                          className="ClienteBtnEliminar"
                          title="Eliminar cliente"
                          onClick={() =>
                            eliminarCliente(cliente)
                          }
                        >
                          <FaTrash />
                        </button>

                      </td>

                    </tr>
                  );
                })
              )}

            </tbody>

          </table>

        </div>

      </main>

      {/* MODAL DE CADASTRO E EDIÇÃO */}

      {(modal === "novo" || modal === "editar") && (

        <div
          className="modalClienteOverlay"
          onClick={fecharModal}
        >

          <div
            className="modalCliente"
            onClick={(e) => e.stopPropagation()}
          >

            <div className="modalClienteHeader">

              <div>
                <h2>
                  {modal === "novo"
                    ? "Novo Cliente"
                    : "Editar Cliente"}
                </h2>

                <p>
                  Preencha os dados do cliente.
                </p>
              </div>

              <button
                type="button"
                onClick={fecharModal}
                className="ClienteFecharModal"
              >
                <FaTimes />
              </button>

            </div>

            <form
              className="formCliente"
              onSubmit={guardarCliente}
            >

              <div className="FormClienteGrid">

                <div className="CampoCliente">

                  <label htmlFor="clienteNome">
                    Nome completo
                  </label>

                  <input
                    id="clienteNome"
                    type="text"
                    placeholder="Digite o nome completo"
                    value={form.nome}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        nome: e.target.value,
                      })
                    }
                    required
                  />

                </div>

                <div className="CampoCliente">

                  <label htmlFor="clienteTelefone">
                    Telefone
                  </label>

                  <input
                    id="clienteTelefone"
                    type="tel"
                    placeholder="Ex.: 84 123 4567"
                    value={form.telefone}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        telefone: e.target.value,
                      })
                    }
                    required
                  />

                </div>

              </div>

              <div className="modalClienteFooter">

                <button
                  type="button"
                  className="ClienteCancelar"
                  onClick={fecharModal}
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  className="ClienteGuardar"
                >
                  {modal === "novo"
                    ? "Adicionar cliente"
                    : "Guardar alterações"}
                </button>

              </div>

            </form>

          </div>

        </div>
      )}

      {/* MODAL DE HISTÓRICO */}

      {modal === "historico" && clienteAtivo && (

        <div
          className="modalClienteOverlay"
          onClick={fecharModal}
        >

          <div
            className="modalCliente modalClienteHistorico"
            onClick={(e) => e.stopPropagation()}
          >

            <div className="modalClienteHeader">

              <div>
                <h2>Histórico do cliente</h2>

                <p>
                  {clienteAtivo.nome} · {clienteAtivo.telefone}
                </p>
              </div>

              <button
                type="button"
                onClick={fecharModal}
                className="ClienteFecharModal"
              >
                <FaTimes />
              </button>

            </div>

            <div className="ResumoHistoricoCliente">

              <div>
                <span>Total de compras</span>
                <strong>{historicoAtual.length}</strong>
              </div>

              <div>
                <span>Dívida pendente</span>
                <strong className="ValorDividaHistorico">
                  {formatarMT(dividaClienteAtivo)}
                </strong>
              </div>

            </div>

            <div className="TabelaHistoricoCliente">

              <table>

                <thead>
                  <tr>
                    <th>Código</th>
                    <th>Data</th>
                    <th>Total</th>
                    <th>Pago</th>
                    <th>Em dívida</th>
                    <th>Estado</th>
                    <th>Ação</th>
                  </tr>
                </thead>

                <tbody>

                  {historicoAtual.length === 0 ? (

                    <tr>
                      <td colSpan={7} className="info">
                        Este cliente ainda não possui compras.
                      </td>
                    </tr>

                  ) : (

                    historicoAtual.map((venda) => {

                      const divida = calcularDivida(venda);

                      const estado =
                        divida <= 0
                          ? "Pago"
                          : Number(venda.valorPago || 0) > 0
                            ? "Parcial"
                            : "Pendente";

                      return (
                        <tr key={venda.id}>

                          <td>{venda.id}</td>

                          <td>{formatarData(venda.data)}</td>

                          <td>
                            {formatarMT(venda.total)}
                          </td>

                          <td>
                            {formatarMT(venda.valorPago)}
                          </td>

                          <td>
                            {formatarMT(divida)}
                          </td>

                          <td>
                            <span
                              className={`EstadoVenda ${estado.toLowerCase()}`}
                            >
                              {estado}
                            </span>
                          </td>

                          <td>

                            {venda.tipo === "fiado" &&
                              divida > 0 && (

                                <button
                                  type="button"
                                  className="BtnReceberCliente"
                                  title="Registar pagamento"
                                  onClick={() =>
                                    abrirPagamento(venda)
                                  }
                                >
                                  <FaMoneyBillWave />
                                  Receber
                                </button>

                              )}

                          </td>

                        </tr>
                      );
                    })
                  )}

                </tbody>

              </table>

            </div>

            <div className="modalClienteFooter">

              <button
                type="button"
                className="ClienteCancelar"
                onClick={fecharModal}
              >
                Fechar
              </button>

            </div>

          </div>

        </div>
      )}

      {/* MODAL DE PAGAMENTO */}

      {vendaPagamento && (

        <div
          className="modalClienteOverlay modalPagamentoOverlay"
          onClick={() => setVendaPagamento(null)}
        >

          <div
            className="modalCliente modalPagamento"
            onClick={(e) => e.stopPropagation()}
          >

            <div className="modalClienteHeader">

              <div>
                <h2>Registar pagamento</h2>

                <p>
                  Venda {vendaPagamento.id}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setVendaPagamento(null)}
                className="ClienteFecharModal"
              >
                <FaTimes />
              </button>

            </div>

            <form
              className="formCliente"
              onSubmit={confirmarPagamento}
            >

              <div className="ResumoPagamentoCliente">

                <div>
                  <span>Cliente</span>
                  <strong>
                    {clienteAtivo?.nome}
                  </strong>
                </div>

                <div>
                  <span>Dívida actual</span>
                  <strong>
                    {formatarMT(
                      calcularDivida(vendaPagamento)
                    )}
                  </strong>
                </div>

              </div>

              <div className="CampoCliente">

                <label htmlFor="valorPagamento">
                  Valor a receber (MT)
                </label>

                <input
                  id="valorPagamento"
                  type="number"
                  min="0.01"
                  max={calcularDivida(vendaPagamento)}
                  step="0.01"
                  placeholder="0.00"
                  value={valorPagamento}
                  onChange={(e) =>
                    setValorPagamento(e.target.value)
                  }
                  required
                />

              </div>

              <p className="AvisoPagamentoCliente">
                O pagamento será registado automaticamente
                no histórico de recebimentos do Caixa.
              </p>

              <div className="modalClienteFooter">

                <button
                  type="button"
                  className="ClienteCancelar"
                  onClick={() => setVendaPagamento(null)}
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  className="ClienteGuardar"
                >
                  Confirmar pagamento
                </button>

              </div>

            </form>

          </div>

        </div>
      )}

    </div>
  );
}

export default Clientes;
