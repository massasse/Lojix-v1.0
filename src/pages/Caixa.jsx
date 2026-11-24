
import { useMemo, useState, useEffect } from "react";
import { listarMovimentos,listarVendas,guardarMovimento } from "../lib/lojixApi";
import HeaderPage from "../assets/componets/HeaderPage";

import {
  FaPlusCircle,
  FaMinusCircle,
  FaWallet,
  FaMoneyBillWave,
  FaSearch,
  FaTimes,
  FaHistory,
  FaBalanceScale,
  FaHandHoldingUsd,
} from "react-icons/fa";

import "./StyleCaixa.css";

function gerarId(prefixo) {
  return `${prefixo}-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 7)}`;
}

function formatarMT(valor) {
  return (
    Number(valor || 0).toLocaleString("pt-MZ", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }) + " MT"
  );
}

function obterTimestamp(data) {
  if (!data) return 0;

  const texto = String(data);

  const correspondencia = texto.match(
    /^(\d{2})\/(\d{1,2})\/(\d{4})$/
  );

  if (correspondencia) {
    return new Date(
      Number(correspondencia[3]),
      Number(correspondencia[2]) - 1,
      Number(correspondencia[1])
    ).getTime();
  }

  const resultado = new Date(data).getTime();

  return Number.isNaN(resultado) ? 0 : resultado;
}

function formatarData(data) {
  if (!data) return "—";

  const texto = String(data);

  if (/^\d{2}\/\d{1,2}\/\d{4}$/.test(texto)) {
    return texto;
  }

  const dataConvertida = new Date(data);

  if (Number.isNaN(dataConvertida.getTime())) {
    return texto;
  }

  return dataConvertida.toLocaleString("pt-MZ");
}

function calcularDevolvido(emprestimo, movimentos) {
  return movimentos
    .filter(
      (movimento) =>
        movimento.tipo === "devolucao_emprestimo" &&
        String(movimento.emprestimoId) === String(emprestimo.id)
    )
    .reduce(
      (total, movimento) =>
        total + Number(movimento.valor || 0),
      0
    );
}

function calcularPendente(emprestimo, movimentos) {
  return Math.max(
    0,
    Number(emprestimo.valor || 0) -
      calcularDevolvido(emprestimo, movimentos)
  );
}

function nomeTipo(tipo) {
  const nomes = {
    saldo_inicial: "Saldo inicial",
    venda: "Venda paga",
    recebimento_fiado: "Recebimento de fiado",
    entrada: "Outra entrada",
    despesa: "Despesa",
    levantamento: "Levantamento",
    emprestimo: "Empréstimo",
    devolucao_emprestimo: "Devolução de empréstimo",
    contagem_caixa: "Contagem de caixa",
    historico_saldo_inicial: "Saldo inicial (histórico)",
    historico_recebimento_venda: "Recebimento de venda (histórico)",
    historico_compra: "Compra de stock (histórico)",
    historico_despesa: "Despesa (histórico)",
    historico_emprestimo: "Empréstimo concedido (histórico)",
    historico_devolucao_emprestimo: "Pagamento de empréstimo (histórico)",
  };

  return nomes[tipo] || tipo;
}

// =====================================
// COMPONENTE PRINCIPAL
// =====================================

function Caixa() {

  const [movimentos,setMovimentos]=useState([]);
  const [vendas,setVendas]=useState([]);
  const [erro,setErro]=useState('');
  useEffect(()=>{
    let ativo=true;
    const carregar=()=>Promise.all([listarMovimentos(),listarVendas()]).then(([m,v])=>{
      if(ativo){setMovimentos(m);setVendas(v);setErro('')}
    }).catch(e=>{if(ativo)setErro('Erro ao carregar Caixa: '+e.message)});
    carregar();window.addEventListener('focus',carregar);
    return ()=>{ativo=false;window.removeEventListener('focus',carregar)};
  },[]);

  const [modal, setModal] = useState("");

  const [form, setForm] = useState({
    valor: "",
    descricao: "",
    beneficiario: "",
  });

  const [emprestimoSelecionado, setEmprestimoSelecionado] =
    useState(null);

  const [pesquisa, setPesquisa] = useState("");

  const [filtro, setFiltro] = useState("todos");

  // =====================================
  // GUARDAR MOVIMENTOS
  // =====================================

  async function guardarMovimentos(novaLista){
    try{
      const anteriores=new Map(movimentos.map(m=>[String(m.id),m]));
      const alterados=novaLista.filter(m=>JSON.stringify(anteriores.get(String(m.id)))!==JSON.stringify(m));
      for(const m of alterados)await guardarMovimento(m);
      setMovimentos(await listarMovimentos());setErro('');return true;
    }catch(e){console.error(e);alert('Erro ao guardar no Supabase: '+e.message);return false}
  }

  // =====================================
  // CÁLCULOS FINANCEIROS
  // =====================================

  const saldoInicial = useMemo(() => {
    const movimento = movimentos.find(
      (item) => item.tipo === "saldo_inicial"
    );

    return Number(movimento?.valor || 0);
  }, [movimentos]);

  const totalVendas = useMemo(() => {
    return vendas
      .filter(
        (venda) =>
          venda.tipo === "venda" &&
          venda.estado !== "Cancelada" &&
          !venda.historicoImportacao
      )
      .reduce(
        (total, venda) =>
          total + Number(venda.valorPago ?? venda.total ?? 0),
        0
      );
  }, [vendas]);

  const totalFiadosRecebidos = useMemo(() => {
    return movimentos
      .filter(
        (movimento) =>
          movimento.tipo === "recebimento_fiado" &&
          !movimento.historicoImportacao
      )
      .reduce(
        (total, movimento) =>
          total + Number(movimento.valor || 0),
        0
      );
  }, [movimentos]);

  const outrasEntradas = useMemo(() => {
    return movimentos
      .filter((movimento) => movimento.tipo === "entrada" && !movimento.historicoImportacao)
      .reduce(
        (total, movimento) =>
          total + Number(movimento.valor || 0),
        0
      );
  }, [movimentos]);

  const totalDespesas = useMemo(() => {
    return movimentos
      .filter((movimento) => movimento.tipo === "despesa" && !movimento.historicoImportacao)
      .reduce(
        (total, movimento) =>
          total + Number(movimento.valor || 0),
        0
      );
  }, [movimentos]);

  const totalLevantamentos = useMemo(() => {
    return movimentos
      .filter(
        (movimento) => movimento.tipo === "levantamento" && !movimento.historicoImportacao
      )
      .reduce(
        (total, movimento) =>
          total + Number(movimento.valor || 0),
        0
      );
  }, [movimentos]);

  const totalEmprestimos = useMemo(() => {
    return movimentos
      .filter(
        (movimento) => movimento.tipo === "emprestimo" && !movimento.historicoImportacao
      )
      .reduce(
        (total, movimento) =>
          total + Number(movimento.valor || 0),
        0
      );
  }, [movimentos]);

  const totalDevolucoes = useMemo(() => {
    return movimentos
      .filter(
        (movimento) =>
          movimento.tipo === "devolucao_emprestimo" &&
          !movimento.historicoImportacao
      )
      .reduce(
        (total, movimento) =>
          total + Number(movimento.valor || 0),
        0
      );
  }, [movimentos]);

  // Saldo efectivo esperado na caixa
  const saldoEsperado =
    saldoInicial +
    totalVendas +
    totalFiadosRecebidos +
    outrasEntradas +
    totalDevolucoes -
    totalDespesas -
    totalLevantamentos -
    totalEmprestimos;

  // =====================================
  // VALOR CONTADO
  // =====================================

  const ultimaContagem = useMemo(() => {
    return movimentos
      .filter(
        (movimento) =>
          movimento.tipo === "contagem_caixa"
      )
      .sort(
        (a, b) =>
          obterTimestamp(b.data) - obterTimestamp(a.data)
      )[0] || null;
  }, [movimentos]);

  const valorContado = ultimaContagem
    ? Number(ultimaContagem.valor)
    : null;

  const diferenca =
    valorContado === null
      ? null
      : valorContado - saldoEsperado;

  // =====================================
  // EMPRÉSTIMOS
  // =====================================

  const emprestimos = useMemo(() => {
    return movimentos
      .filter(
        (movimento) => movimento.tipo === "emprestimo"
      )
      .map((emprestimo) => ({
        ...emprestimo,
        devolvido: calcularDevolvido(
          emprestimo,
          movimentos
        ),
        pendente: calcularPendente(
          emprestimo,
          movimentos
        ),
      }));
  }, [movimentos]);

  const totalPorRecuperar = emprestimos.reduce(
    (total, emprestimo) =>
      total + emprestimo.pendente,
    0
  );

  // =====================================
  // HISTÓRICO GERAL
  // =====================================

  const historico = useMemo(() => {

    // As vendas pagas vêm directamente do histórico de vendas.
    const vendasPagas = vendas
      .filter(
        (venda) =>
          venda.tipo === "venda" &&
          venda.estado !== "Cancelada" &&
          !venda.historicoImportacao
      )
      .map((venda) => ({
        id: `VENDA-${venda.id}`,
        tipo: "venda",
        descricao: `Venda ${venda.id}`,
        cliente: venda.cliente || "—",
        valor: Number(venda.valorPago ?? venda.total ?? 0),
        data: venda.data,
        origem: "venda",
      }));

    const movimentosCaixa = movimentos.map(
      (movimento) => ({
        ...movimento,
        cliente:
          movimento.beneficiario ||
          movimento.cliente ||
          "—",
        origem: "caixa",
      })
    );

    return [...vendasPagas, ...movimentosCaixa].sort(
      (a, b) =>
        obterTimestamp(b.data) - obterTimestamp(a.data)
    );

  }, [vendas, movimentos]);

  const historicoFiltrado = historico.filter((movimento) => {

    const correspondeTipo =
      filtro === "todos" || movimento.tipo === filtro;

    const termo = pesquisa.toLowerCase();

    const correspondePesquisa =
      String(movimento.descricao || "")
        .toLowerCase()
        .includes(termo) ||
      String(movimento.cliente || "")
        .toLowerCase()
        .includes(termo) ||
      String(movimento.id || "")
        .toLowerCase()
        .includes(termo);

    return correspondeTipo && correspondePesquisa;
  });

  // =====================================
  // MODAIS
  // =====================================

  function abrirModal(tipo) {
    setForm({
      valor: "",
      descricao: "",
      beneficiario: "",
    });

    setEmprestimoSelecionado(null);
    setModal(tipo);
  }

  function fecharModal() {
    setModal("");
    setEmprestimoSelecionado(null);

    setForm({
      valor: "",
      descricao: "",
      beneficiario: "",
    });
  }

  // =====================================
  // REGISTAR ENTRADAS, DESPESAS,
  // LEVANTAMENTOS E EMPRÉSTIMOS
  // =====================================

  async function guardarMovimentoHandler(e) {
    e.preventDefault();

    const valor = Number(form.valor);

    if (!Number.isFinite(valor) || valor <= 0) {
      alert("Introduza um valor válido.");
      return;
    }

    const descricao = form.descricao.trim();
    const beneficiario = form.beneficiario.trim();

    if (
      modal !== "saldo_inicial" &&
      modal !== "contagem_caixa" &&
      !descricao
    ) {
      alert("A descrição é obrigatória.");
      return;
    }

    if (modal === "emprestimo" && !beneficiario) {
      alert("Indique o beneficiário do empréstimo.");
      return;
    }

    const agora = new Date().toISOString();

    // DEFINIR OU ACTUALIZAR SALDO INICIAL
    if (modal === "saldo_inicial") {

      const existente = movimentos.find(
        (item) => item.tipo === "saldo_inicial"
      );

      if (
        existente &&
        !window.confirm(
          "Já existe um saldo inicial. Deseja actualizar o valor? Esta alteração recalculará o saldo esperado."
        )
      ) {
        return;
      }

      const novoSaldo = {
        id: existente?.id || gerarId("SI"),
        tipo: "saldo_inicial",
        descricao: "Saldo inicial do caixa",
        valor,
        data: existente?.data || agora,
        atualizadoEm: agora,
        historicoAlteracoes: existente
          ? [
              ...(existente.historicoAlteracoes || []),
              {
                valorAnterior: existente.valor,
                dataAlteracao: agora,
              },
            ]
          : [],
      };

      const novaLista = existente
        ? movimentos.map((item) =>
            item.id === existente.id ? novoSaldo : item
          )
        : [...movimentos, novoSaldo];

      if (await guardarMovimentos(novaLista)) {
        fecharModal();
        alert("Saldo inicial guardado com sucesso.");
      }

      return;
    }

    // CONTAGEM FÍSICA DA CAIXA
    if (modal === "contagem_caixa") {

      const movimento = {
        id: gerarId("CONT"),
        tipo: "contagem_caixa",
        descricao:
          descricao || "Contagem física do caixa",
        valor,
        data: agora,
      };

      if (await guardarMovimentos([...movimentos, movimento])) {
        fecharModal();
        alert("Contagem de caixa registada.");
      }

      return;
    }

    // OUTROS MOVIMENTOS
    const novoMovimento = {
      id: gerarId("CX"),
      tipo: modal,
      descricao,
      valor,
      data: agora,

      ...(modal === "emprestimo"
        ? { beneficiario }
        : {}),
    };

    if (
      await guardarMovimentos([
        ...movimentos,
        novoMovimento,
      ])
    ) {
      fecharModal();

      alert(
        modal === "emprestimo"
          ? "Empréstimo registado com sucesso."
          : "Movimento registado com sucesso."
      );
    }
  }

  // =====================================
  // ABRIR DEVOLUÇÃO DE EMPRÉSTIMO
  // =====================================

  function abrirDevolucao(emprestimo) {
    setEmprestimoSelecionado(emprestimo);

    setForm({
      valor: "",
      descricao: `Devolução do empréstimo de ${emprestimo.beneficiario}`,
      beneficiario: "",
    });

    setModal("devolucao");
  }

  // =====================================
  // CONFIRMAR DEVOLUÇÃO
  // =====================================

  async function confirmarDevolucao(e) {
    e.preventDefault();

    const valor = Number(form.valor);

    if (!Number.isFinite(valor) || valor <= 0) {
      alert("Introduza um valor válido.");
      return;
    }

    const emprestimoActual = emprestimos.find(
      (item) =>
        String(item.id) ===
        String(emprestimoSelecionado?.id)
    );

    if (!emprestimoActual) {
      alert("Empréstimo não encontrado.");
      return;
    }

    if (valor > emprestimoActual.pendente) {
      alert(
        `O valor não pode ultrapassar ${formatarMT(
          emprestimoActual.pendente
        )}.`
      );

      return;
    }

    const descricao = form.descricao.trim();

    if (!descricao) {
      alert("Introduza a descrição da devolução.");
      return;
    }

    const movimento = {
      id: gerarId("DEV"),
      tipo: "devolucao_emprestimo",
      descricao,
      valor,
      data: new Date().toISOString(),
      emprestimoId: emprestimoActual.id,
      beneficiario: emprestimoActual.beneficiario,
    };

    if (
      await guardarMovimentos([
        ...movimentos,
        movimento,
      ])
    ) {
      fecharModal();

      alert("Devolução registada com sucesso.");
    }
  }

  // =====================================
  // MENSAGENS DE ERRO
  // =====================================

  if (erro) {
    return (
      <div className="contentCaixa">
        <HeaderPage page="Caixa" />

        <div className="ErroCaixa">
          <h2>Erro ao carregar o Caixa</h2>

          <p>{erro}</p>

          <p>
            Os dados existentes não foram sobrescritos.
            Corrige o problema antes de continuar.
          </p>
        </div>
      </div>
    );
  }

  // =====================================
  // INTERFACE
  // =====================================

  return (
    <div className="contentCaixa">

      <HeaderPage page="Caixa" />

      <main className="ContentCaixaPage">

        {/* RESUMO FINANCEIRO */}

        <section className="ResumoCaixa">

          <div className="CardCaixa">
            <p>Saldo inicial</p>
            <strong>{formatarMT(saldoInicial)}</strong>
          </div>

          <div className="CardCaixa">
            <p>Total de vendas</p>
            <strong>{formatarMT(totalVendas)}</strong>
          </div>

          <div className="CardCaixa">
            <p>Por Receber</p>
            <strong>{formatarMT(totalFiadosRecebidos)}</strong>
          </div>

          <div className="CardCaixa">
            <p>Outras entradas</p>
            <strong>{formatarMT(outrasEntradas)}</strong>
          </div>

          <div className="CardCaixa">
            <p>Total de despesas</p>
            <strong className="ValorSaida">
              {formatarMT(totalDespesas)}
            </strong>
          </div>

          <div className="CardCaixa">
            <p>Levantamentos</p>
            <strong className="ValorSaida">
              {formatarMT(totalLevantamentos)}
            </strong>
          </div>

          <div className="CardCaixa">
            <p>Empréstimos concedidos</p>
            <strong className="ValorSaida">
              {formatarMT(totalEmprestimos)}
            </strong>
          </div>

          <div className="CardCaixa">
            <p>Por recuperar de empréstimos</p>
            <strong>{formatarMT(totalPorRecuperar)}</strong>
          </div>

        </section>

        {/* SALDO E CONTAGEM */}

        <section className="ResumoSaldoCaixa">

          <div className="CardSaldoEsperado">

            <div className="IconeCaixa">
              <FaWallet />
            </div>

            <div>
              <p>Saldo esperado</p>
              <strong>{formatarMT(saldoEsperado)}</strong>
            </div>

          </div>

          <div className="CardValorContado">

            <div className="IconeCaixa">
              <FaMoneyBillWave />
            </div>

            <div>
              <p>Valor contado</p>

              <strong>
                {valorContado === null
                  ? "Não registado"
                  : formatarMT(valorContado)}
              </strong>

              {ultimaContagem && (
                <small>
                  Última contagem: {formatarData(ultimaContagem.data)}
                </small>
              )}
            </div>

          </div>

          <div
            className={`CardDiferenca ${
              diferenca === null
                ? ""
                : diferenca > 0
                  ? "DiferencaPositiva"
                  : diferenca < 0
                    ? "DiferencaNegativa"
                    : "DiferencaZero"
            }`}
          >

            <div className="IconeCaixa">
              <FaBalanceScale />
            </div>

            <div>
              <p>Diferença de caixa</p>

              <strong>
                {diferenca === null
                  ? "—"
                  : formatarMT(Math.abs(diferenca))}
              </strong>

              <small>
                {diferenca === null
                  ? "Faça uma contagem"
                  : diferenca > 0
                    ? "Sobra de caixa"
                    : diferenca < 0
                      ? "Falta de caixa"
                      : "Caixa correcto"}
              </small>
            </div>

          </div>

        </section>

        {/* OPERAÇÕES */}

        <section className="OperacoesCaixa">

          <button
            className="BtnOperacao BtnEntrada"
            onClick={() => abrirModal("entrada")}
          >
            <FaPlusCircle />
            <span>Nova entrada</span>
          </button>

          <button
            className="BtnOperacao BtnDespesa"
            onClick={() => abrirModal("despesa")}
          >
            <FaMinusCircle />
            <span>Registar despesa</span>
          </button>

          <button
            className="BtnOperacao BtnLevantamento"
            onClick={() => abrirModal("levantamento")}
          >
            <FaWallet />
            <span>Levantamento</span>
          </button>

          <button
            className="BtnOperacao BtnEmprestimo"
            onClick={() => abrirModal("emprestimo")}
          >
            <FaHandHoldingUsd />
            <span>Empréstimo</span>
          </button>

          <button
            className="BtnOperacao BtnSaldoInicial"
            onClick={() => {
              const existente = movimentos.find(
                (item) => item.tipo === "saldo_inicial"
              );

              setForm({
                valor: existente ? String(existente.valor) : "",
                descricao: "",
                beneficiario: "",
              });

              setModal("saldo_inicial");
            }}
          >
            <FaBalanceScale />
            <span>Saldo inicial</span>
          </button>

          <button
            className="BtnOperacao BtnContagem"
            onClick={() => abrirModal("contagem_caixa")}
          >
            <FaMoneyBillWave />
            <span>Contar caixa</span>
          </button>

        </section>

        {/* EMPRÉSTIMOS PENDENTES */}

        {emprestimos.length > 0 && (

          <section className="TabelaEmprestimos">

            <div className="TituloSecaoCaixa">
              <h2>Empréstimos</h2>

              <span>
                {emprestimos.filter(
                  (item) => item.pendente > 0
                ).length}{" "}
                pendentes
              </span>
            </div>

            <div className="TabelaCaixaScroll">

              <table>

                <thead>
                  <tr>
                    <th>Beneficiário</th>
                    <th>Descrição</th>
                    <th>Valor emprestado</th>
                    <th>Devolvido</th>
                    <th>Por devolver</th>
                    <th>Ação</th>
                  </tr>
                </thead>

                <tbody>

                  {emprestimos.map((emprestimo) => (

                    <tr key={emprestimo.id}>

                      <td>
                        <strong>
                          {emprestimo.beneficiario}
                        </strong>
                      </td>

                      <td>{emprestimo.descricao}</td>

                      <td>
                        {formatarMT(emprestimo.valor)}
                      </td>

                      <td>
                        {formatarMT(emprestimo.devolvido)}
                      </td>

                      <td>
                        <strong className="ValorPendente">
                          {formatarMT(emprestimo.pendente)}
                        </strong>
                      </td>

                      <td>

                        {emprestimo.pendente > 0 ? (

                          <button
                            className="BtnDevolucao"
                            onClick={() =>
                              abrirDevolucao(emprestimo)
                            }
                          >
                            Registar devolução
                          </button>

                        ) : (
                          <span className="EmprestimoLiquidado">
                            Liquidado
                          </span>
                        )}

                      </td>

                    </tr>

                  ))}

                </tbody>

              </table>

            </div>

          </section>

        )}

        {/* HISTÓRICO */}

        <section className="HistoricoCaixa">

          <div className="TituloSecaoCaixa">

            <h2>
              <FaHistory /> Histórico de movimentos
            </h2>

            <span>{historicoFiltrado.length} registos</span>

          </div>

          <div className="FiltrosCaixa">

            <div className="PesquisaCaixa">
              <FaSearch />

              <input
                type="text"
                placeholder="Pesquisar movimento..."
                value={pesquisa}
                onChange={(e) =>
                  setPesquisa(e.target.value)
                }
              />
            </div>

            <select
              value={filtro}
              onChange={(e) => setFiltro(e.target.value)}
            >
              <option value="todos">Todos os movimentos</option>
              <option value="saldo_inicial">Saldo inicial</option>
              <option value="venda">Vendas pagas</option>
              <option value="recebimento_fiado">
                Recebimentos de fiados
              </option>
              <option value="entrada">Outras entradas</option>
              <option value="despesa">Despesas</option>
              <option value="levantamento">Levantamentos</option>
              <option value="emprestimo">Empréstimos</option>
              <option value="devolucao_emprestimo">
                Devoluções de empréstimos
              </option>
              <option value="contagem_caixa">
                Contagens de caixa
              </option>
            </select>

          </div>

          <div className="TabelaHistoricoCaixa TabelaCaixaScroll">

            <table>

              <thead>
                <tr>
                  <th>Movimento</th>
                  <th>Descrição</th>
                  <th>Cliente / Beneficiário</th>
                  <th>Data</th>
                  <th>Valor</th>
                </tr>
              </thead>

              <tbody>

                {historicoFiltrado.length === 0 ? (

                  <tr>
                    <td colSpan={5} className="info">
                      Nenhum movimento encontrado.
                    </td>
                  </tr>

                ) : (

                  historicoFiltrado.map((movimento) => {

                    const positivo = [
                      "saldo_inicial",
                      "venda",
                      "recebimento_fiado",
                      "entrada",
                      "devolucao_emprestimo",
                    ].includes(movimento.tipo);

                    const negativo = [
                      "despesa",
                      "levantamento",
                      "emprestimo",
                    ].includes(movimento.tipo);

                    return (
                      <tr key={movimento.id}>

                        <td>
                          <span
                            className={`EtiquetaMovimento ${movimento.tipo}`}
                          >
                            {nomeTipo(movimento.tipo)}
                          </span>
                        </td>

                        <td >{movimento.descricao || "—"}</td>

                        <td>{movimento.cliente || "—"}</td>

                        <td>{formatarData(movimento.data)}</td>

                        <td>
                          <strong
                            className={
                              positivo
                                ? "ValorEntrada"
                                : negativo
                                  ? "ValorSaida"
                                  : ""
                            }
                          >
                            {positivo ? "+" : negativo ? "−" : ""}
                            {formatarMT(movimento.valor)}
                          </strong>
                        </td>

                      </tr>
                    );
                  })
                )}

              </tbody>

            </table>

          </div>

        </section>

      </main>

      {/* =====================================
          MODAL DE OPERAÇÕES
      ===================================== */}

      {modal && modal !== "devolucao" && (

        <div
          className="OverlayCaixa"
          onClick={fecharModal}
        >

          <div
            className="ModalCaixa"
            onClick={(e) => e.stopPropagation()}
          >

            <div className="ModalCaixaHeader">

              <div>
                <h2>
                  {{
                    entrada: "Registar outra entrada",
                    despesa: "Registar despesa",
                    levantamento: "Registar levantamento",
                    emprestimo: "Conceder empréstimo",
                    saldo_inicial: "Definir saldo inicial",
                    contagem_caixa: "Contagem de caixa",
                  }[modal]}
                </h2>

                <p>
                  Preencha os dados da operação.
                </p>
              </div>

              <button
                type="button"
                onClick={fecharModal}
                className="FecharModalCaixa"
              >
                <FaTimes />
              </button>

            </div>

            <form
              className="FormCaixa"
              onSubmit={guardarMovimentoHandler}
            >

              <div className="CampoCaixa">

                <label htmlFor="valorCaixa">
                  {modal === "contagem_caixa"
                    ? "Dinheiro contado (MT)"
                    : modal === "saldo_inicial"
                      ? "Saldo inicial (MT)"
                      : "Valor (MT)"}
                </label>

                <input
                  id="valorCaixa"
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={form.valor}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      valor: e.target.value,
                    })
                  }
                  placeholder="0.00"
                  required
                  autoFocus
                />

              </div>

              {modal === "emprestimo" && (

                <div className="CampoCaixa">

                  <label htmlFor="beneficiarioCaixa">
                    Beneficiário
                  </label>

                  <input
                    id="beneficiarioCaixa"
                    type="text"
                    placeholder="Nome do beneficiário"
                    value={form.beneficiario}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        beneficiario: e.target.value,
                      })
                    }
                    required
                  />

                </div>

              )}

              {modal !== "saldo_inicial" && (

                <div className="CampoCaixa">

                  <label htmlFor="descricaoCaixa">
                    Descrição
                    {modal !== "contagem_caixa" && " *"}
                  </label>

                  <textarea
                    id="descricaoCaixa"
                    rows={3}
                    placeholder="Descreva a finalidade da operação..."
                    value={form.descricao}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        descricao: e.target.value,
                      })
                    }
                    required={modal !== "contagem_caixa"}
                  />

                </div>

              )}

              {modal === "emprestimo" && (
                <p className="AvisoEmprestimo">
                  Este valor será retirado da caixa e ficará
                  registado como empréstimo por recuperar.
                </p>
              )}

              {modal === "levantamento" && (
                <p className="AvisoLevantamento">
                  O levantamento será registado como saída
                  de caixa, sem criar uma dívida a receber.
                </p>
              )}

              <div className="BotoesModalCaixa">

                <button
                  type="button"
                  className="CancelarCaixa"
                  onClick={fecharModal}
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  className="ConfirmarCaixa"
                >
                  Guardar movimento
                </button>

              </div>

            </form>

          </div>

        </div>
      )}

      {/* =====================================
          MODAL DE DEVOLUÇÃO
      ===================================== */}

      {modal === "devolucao" && emprestimoSelecionado && (

        <div
          className="OverlayCaixa"
          onClick={fecharModal}
        >

          <div
            className="ModalCaixa"
            onClick={(e) => e.stopPropagation()}
          >

            <div className="ModalCaixaHeader">

              <div>
                <h2>Devolução de empréstimo</h2>

                <p>
                  {emprestimoSelecionado.beneficiario}
                </p>
              </div>

              <button
                type="button"
                onClick={fecharModal}
                className="FecharModalCaixa"
              >
                <FaTimes />
              </button>

            </div>

            <form
              className="FormCaixa"
              onSubmit={confirmarDevolucao}
            >

              <div className="ResumoDevolucao">

                <div>
                  <span>Valor emprestado</span>

                  <strong>
                    {formatarMT(
                      emprestimoSelecionado.valor
                    )}
                  </strong>
                </div>

                <div>
                  <span>Valor por devolver</span>

                  <strong className="ValorPendente">
                    {formatarMT(
                      calcularPendente(
                        emprestimoSelecionado,
                        movimentos
                      )
                    )}
                  </strong>
                </div>

              </div>

              <div className="CampoCaixa">

                <label htmlFor="valorDevolucao">
                  Valor devolvido (MT)
                </label>

                <input
                  id="valorDevolucao"
                  type="number"
                  min="0.01"
                  max={calcularPendente(
                    emprestimoSelecionado,
                    movimentos
                  )}
                  step="0.01"
                  value={form.valor}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      valor: e.target.value,
                    })
                  }
                  placeholder="0.00"
                  required
                  autoFocus
                />

              </div>

              <div className="CampoCaixa">

                <label htmlFor="descricaoDevolucao">
                  Descrição
                </label>

                <textarea
                  id="descricaoDevolucao"
                  rows={3}
                  value={form.descricao}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      descricao: e.target.value,
                    })
                  }
                  required
                />

              </div>

              <p className="AvisoEmprestimo">
                A devolução será adicionada automaticamente
                ao saldo da caixa.
              </p>

              <div className="BotoesModalCaixa">

                <button
                  type="button"
                  className="CancelarCaixa"
                  onClick={fecharModal}
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  className="ConfirmarCaixa"
                >
                  Confirmar devolução
                </button>

              </div>

            </form>

          </div>

        </div>
      )}

    </div>
  );
}

export default Caixa;
