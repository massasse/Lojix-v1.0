import { useEffect, useState } from "react";
import { MdArrowOutward } from "react-icons/md";

import CardDashbord from "../assets/componets/CardDashbord";
import HeaderPage from "../assets/componets/HeaderPage";
import {
  listarProdutos,
  listarVendas,
  listarMovimentos,
} from "../lib/lojixApi";

import "./StyleDashbord.css";

// ============================================================
// 1. CARREGAMENTO E CÁLCULO DOS DADOS DO DASHBOARD
// ============================================================

async function carregarDadosDashboard() {
  const [produtos, vendas, movimentos] = await Promise.all([
    listarProdutos(),
    listarVendas(),
    listarMovimentos(),
  ]);

  // Soma os movimentos financeiros de um tipo específico.
  const somarMovimentos = (tipo) =>
    movimentos
      .filter((movimento) => movimento.tipo === tipo)
      .reduce(
        (soma, movimento) =>
          soma + Math.abs(Number(movimento.valor) || 0),
        0
      );

  // Total das vendas pagas.
  const vendasPagas = vendas.reduce((soma, venda) => {
    const tipo = String(venda.tipo || "").toLowerCase();
    const estado = String(venda.estado || "").toLowerCase();

    if (tipo === "venda" || (!tipo && estado === "pago")) {
      return soma + Number(venda.valorPago ?? venda.total ?? 0);
    }

    return soma;
  }, 0);

  // Recebimentos de vendas fiadas.
  // Se existirem movimentos próprios de recebimento, usa-os.
  // Caso contrário, consulta os pagamentos guardados nas vendas.
  const existeMovimentoFiado = movimentos.some(
    (movimento) => movimento.tipo === "recebimento_fiado"
  );

  const recebimentosFiados = existeMovimentoFiado
    ? somarMovimentos("recebimento_fiado")
    : vendas.reduce((soma, venda) => {
        if (
          venda.tipo !== "fiado" ||
          !Array.isArray(venda.pagamentos)
        ) {
          return soma;
        }

        const totalRecebido = venda.pagamentos.reduce(
          (total, pagamento) =>
            total + (Number(pagamento.valor) || 0),
          0
        );

        return soma + totalRecebido;
      }, 0);

  // Entradas de caixa.
  const saldoInicial = somarMovimentos("saldo_inicial");
  const outrasEntradas = somarMovimentos("entrada");
  const devolucoes = somarMovimentos("devolucao_emprestimo");

  // Saídas de caixa.
  const despesas = somarMovimentos("despesa");
  const levantamentos = somarMovimentos("levantamento");
  const emprestimos = somarMovimentos("emprestimo");

  // Saldo actualmente disponível na caixa.
  const saldo =
    saldoInicial +
    vendasPagas +
    recebimentosFiados +
    outrasEntradas +
    devolucoes -
    despesas -
    levantamentos -
    emprestimos;

  // Valor potencial do stock, calculado pelo preço de venda.
  const valorStockTotal = produtos.reduce((total, produto) => {
    const quantidade = Number(produto.stock) || 0;
    const precoVenda = Number(produto.venda) || 0;

    return total + quantidade * precoVenda;
  }, 0);

  // Dívidas que ainda estão por receber.
  const areceber = vendas.reduce((total, venda) => {
    const divida =
      venda.valorEmDivida != null
        ? Number(venda.valorEmDivida)
        : venda.tipo === "fiado"
          ? Number(venda.total || 0) - Number(venda.valorPago || 0)
          : 0;

    return total + Math.max(0, divida || 0);
  }, 0);

  // Volume total de vendas, incluindo vendas a crédito.
  const totalVendas = vendas.reduce(
    (total, venda) =>
      total + Number(venda.total ?? venda.valorPago ?? 0),
    0
  );

  return {
    produtos,
    vendas,
    saldo,
    valorStockTotal,
    areceber,
    totalVendas,
  };
}

// ============================================================
// 2. FUNÇÕES AUXILIARES DE FORMATAÇÃO
// ============================================================

function formatarMT(valor) {
  const numero = Number(valor) || 0;

  return `${numero.toLocaleString("pt-MZ", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} MT`;
}

// ============================================================
// 3. COMPONENTE PRINCIPAL DO DASHBOARD
// ============================================================

function Dashbord() {
  // 3.1. Estado dos dados apresentados no Dashboard.
  const [dados, setDados] = useState({
    produtos: [],
    vendas: [],
    saldo: 0,
    valorStockTotal: 0,
    areceber: 0,
    totalVendas: 0,
  });

  // 3.2. Carrega e actualiza os dados ao abrir/regressar à página.
  useEffect(() => {
    let activo = true;

    const actualizar = async () => {
      try {
        const novosDados = await carregarDadosDashboard();

        if (activo) {
          setDados(novosDados);
        }
      } catch (erro) {
        console.error("Erro ao carregar o Dashboard:", erro);
      }
    };

    actualizar();

    window.addEventListener("focus", actualizar);
    window.addEventListener("storage", actualizar);

    return () => {
      activo = false;
      window.removeEventListener("focus", actualizar);
      window.removeEventListener("storage", actualizar);
    };
  }, []);

  // 3.3. Separa os dados recebidos da API.
  const {
    produtos,
    vendas: arrayVendas,
    saldo,
    valorStockTotal,
    areceber,
    totalVendas,
  } = dados;

  // 3.4. Apresenta apenas produtos com stock disponível.
  const produtosFiltrados = produtos.filter(
    (produto) => Number(produto.stock) > 0
  );

  // 3.5. Ordena o histórico pelas identificações mais recentes.
  const historico = [...arrayVendas].sort((a, b) =>
    String(b.id ?? "").localeCompare(String(a.id ?? ""), undefined, {
      numeric: true,
    })
  );

  // ==========================================================
  // 4. ESTRUTURA VISUAL DO DASHBOARD
  // ==========================================================

  return (
    <div className="content">
      <HeaderPage page="Dashboard" />

      <main className="contentDashbordPage">
        {/* 4.1. Cartões de indicadores financeiros. */}
        <section className="cards" aria-label="Resumo financeiro">
          <CardDashbord
            titulo="Saldo disponível"
            valor={formatarMT(saldo)}
          />

          <CardDashbord
            titulo="Saldo em Stock"
            valor={formatarMT(valorStockTotal)}
          />

          <CardDashbord
            titulo="A receber"
            valor={formatarMT(areceber)}
          />

          <CardDashbord
            titulo="Total de vendas"
            valor={formatarMT(totalVendas)}
          />
        </section>

        {/* 4.2. Histórico de vendas e produtos disponíveis. */}
        <section className="contentDashbord">
          {/* 4.2.1. Últimas vendas registadas. */}
          <div className="containerTableHistorico styleScrollBar">
            <div className="headerHistorico">
              <h2 className="Cardtitulos">Últimas vendas</h2>

              <a className="linkRapido" href="/principal/vendas">
                Nova venda <MdArrowOutward />
              </a>
            </div>

            {historico.length === 0 ? (
              <div className="info">Sem registo de vendas.</div>
            ) : (
              historico.map((venda) => {
                // Quantidade total de unidades vendidas.
                const totalItens = Array.isArray(venda.produtos)
                  ? venda.produtos.reduce(
                      (total, item) =>
                        total + Number(item.quantidade || 0),
                      0
                    )
                  : Number(venda.quantidade || 0);

                // Valor total da operação.
                const totalVenda = Number(
                  venda.total ??
                    venda.valorTotal ??
                    venda.valorPago ??
                    0
                );

                // Valor já recebido do cliente.
                const valorPago = Number(
                  venda.valorPago ??
                    (String(venda.estado || "").toLowerCase() === "pago"
                      ? totalVenda
                      : 0)
                );

                // Valor que continua em dívida.
                const valorDivida = Number(
                  venda.valorEmDivida ??
                    Math.max(totalVenda - valorPago, 0)
                );

                // Determina o estado financeiro da venda.
                let estado;

                if (
                  String(venda.estado || "").toLowerCase() === "pago" ||
                  (totalVenda > 0 &&
                    (valorDivida <= 0 || valorPago >= totalVenda))
                ) {
                  estado = "Pago";
                } else if (valorPago > 0) {
                  estado = "Pendente";
                } else {
                  estado = "Por pagar";
                }

                const classeEstado = estado
                  .toLowerCase()
                  .replace(/\s+/g, "-");

                return (
                  <article key={venda.id} className="central">
                    <div className="coluna1">
                      <div className="colCliente">{venda.cliente}</div>

                      <div className="tdstyleData">
                        <span>{venda.data}</span>
                        <span aria-hidden="true">|</span>
                        <span>{venda.id}</span>
                        <span aria-hidden="true">|</span>
                        <span>{totalItens} uni.</span>
                      </div>
                    </div>

                    <div className="coluna2">
                      <div className="colTotal">{formatarMT(totalVenda)}</div>

                      <span className={`StatusVenda ${classeEstado}`}>
                        {estado}
                      </span>
                    </div>
                  </article>
                );
              })
            )}
          </div>

          {/* 4.2.2. Produtos que ainda têm stock. */}
          <div className="containerTableProdutoDisponivel styleScrollBar">
            <div className="headerHistorico">
              <h2 className="Cardtitulos">Produtos disponíveis</h2>

              <a className="linkRapido" href="/principal/produtos">
                Ver todos <MdArrowOutward />
              </a>
            </div>

            {produtosFiltrados.length === 0 ? (
              <div className="info">Nenhum produto disponível.</div>
            ) : (
              produtosFiltrados.map((produto) => (
                <article key={produto.id} className="central">
                  <div className="colpro1">
                    <div className="colProduto">{produto.produto}</div>

                    <div className="tdstyleData">
                      <span>#{produto.id}</span>
                      <span aria-hidden="true">|</span>
                      <span>{produto.categoria}</span>
                      <span aria-hidden="true">|</span>
                      <span>{produto.marca}</span>
                    </div>
                  </div>

                  <div className="colpro2">
                    <div className="colvenda">
                      {formatarMT(produto.venda)}
                    </div>

                    <span className="StatusVenda QuantidadeItens">
                      Qnt: {produto.stock}
                    </span>
                  </div>
                </article>
              ))
            )}
          </div>
        </section>
      </main>
    </div>
  );
}

export default Dashbord;
