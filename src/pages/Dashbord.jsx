import { useState, useEffect } from "react";
import CardDashbord from "../assets/componets/carddashbord";
import HeaderPage from "../assets/componets/HeaderPage";
import "./StyleDashbord.css";




function lerListaLocalStorage(chave) {
  const guardado = localStorage.getItem(chave);

  if (guardado === null) return [];

  try {
    const dados = JSON.parse(guardado);

    if (!Array.isArray(dados)) {
      throw new Error(`A chave ${chave} não contém uma lista.`);
    }

    return dados;
  } catch (erro) {
    console.error(`Erro ao ler ${chave}:`, erro);
    return [];
  }
}

function carregarDadosDashboard() {
  const produtos = lerListaLocalStorage("lojix_produtos");
  const vendas = lerListaLocalStorage("lojix_vendas");
  const movimentos = lerListaLocalStorage("lojix_caixa_movimentos");

  // Somar movimentos de determinado tipo
  const somarMovimentos = (tipo) => {
    return movimentos
      .filter((m) => m.tipo === tipo)
      .reduce((soma, m) => soma + Math.abs(Number(m.valor) || 0), 0);
  };

  // Total de vendas pagas
  const vendasPagas = vendas.reduce((soma, venda) => {
    const tipo = String(venda.tipo || "").toLowerCase();
    const estado = String(venda.estado || "").toLowerCase();

    if (tipo === "venda" || (!tipo && estado === "pago")) {
      return soma + Number(venda.valorPago ?? venda.total ?? 0);
    }

    return soma;
  }, 0);

  // Recebimentos de fiados
  const existeMovimentoFiado = movimentos.some(
    (m) => m.tipo === "recebimento_fiado"
  );

  const recebimentosFiados = existeMovimentoFiado
    ? somarMovimentos("recebimento_fiado")
    : vendas.reduce((soma, venda) => {
        if (venda.tipo !== "fiado" || !Array.isArray(venda.pagamentos)) {
          return soma;
        }

        return soma + venda.pagamentos.reduce(
          (total, pagamento) =>
            total + (Number(pagamento.valor) || 0),
          0
        );
      }, 0);

  // Saldo inicial
  const saldoInicial = somarMovimentos("saldo_inicial");

  // Outras entradas
  const outrasEntradas = somarMovimentos("entrada");

  // Devoluções de empréstimos
  const devolucoes = somarMovimentos("devolucao_emprestimo");

  // Saídas
  const despesas = somarMovimentos("despesa");
  const levantamentos = somarMovimentos("levantamento");
  const emprestimos = somarMovimentos("emprestimo");

  // Saldo disponível na caixa
  const saldo =
    saldoInicial +
    vendasPagas +
    recebimentosFiados +
    outrasEntradas +
    devolucoes -
    despesas -
    levantamentos -
    emprestimos;

  // Valor total do stock
  const valorStockTotal = produtos.reduce((total, p) => {
    return total + (Number(p.stock) || 0) * (Number(p.venda) || 0);
  }, 0);

  // Dívidas ainda por receber
  const areceber = vendas.reduce((total, venda) => {
    const divida = venda.valorEmDivida != null
      ? Number(venda.valorEmDivida)
      : venda.tipo === "fiado"
        ? Number(venda.total || 0) - Number(venda.valorPago || 0)
        : 0;

    return total + Math.max(0, divida || 0);
  }, 0);

  // Total geral de vendas, incluindo fiados
  const totalVendas = vendas.reduce((total, venda) => {
    return total + Number(venda.total ?? venda.valorPago ?? 0);
  }, 0);

  return {
    produtos,
    vendas,
    saldo,
    valorStockTotal,
    areceber,
    totalVendas,
  };
}

function formatarMT(valor) {
  return `${Number(valor || 0).toLocaleString("pt-MZ", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} MT`;
}

function Dashbord() {
   const [dados, setDados] = useState(() => carregarDadosDashboard());

  // Actualizar os dados quando regressar ao Dashboard
  useEffect(() => {
    const actualizar = () => {
      setDados(carregarDadosDashboard());
    };

    window.addEventListener("focus", actualizar);
    window.addEventListener("storage", actualizar);

    return () => {
      window.removeEventListener("focus", actualizar);
      window.removeEventListener("storage", actualizar);
    };
  }, []);

  const {
    produtos,
    vendas: arrayVendas,
    saldo,
    valorStockTotal,
    areceber,
    totalVendas,
  } = dados;

  const produtosFiltrados = produtos.filter((p) => Number(p.stock) > 0);

  // Esta Variavel Reorganiza o historico de venda na ordem Decrescente dos IDs
  const historico = [...arrayVendas].sort((a, b) =>
  b.id.localeCompare(a.id, undefined, { numeric: true })
);

//--------------------------------------------------------------------------------
//--------------------------------------------------------------------------------

  return (
    <div className="content">
      <HeaderPage page="Dashbord" />
      <main className="contentDashbordPage">
        <div className="cards">

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

</div>
        <div className="contentDashbord">
          {
            // HISTORICO
          }
          <div className="containerTableHistorico styleScrollBar">
            <h2 className="Cardtitulos">Ultimas Vendas</h2>
            <table className="tableHistoricoVenda">
              <thead>
                <tr>
                  <th>CÓDIGO</th>
                  <th>CLIENTE</th>
                  <th>VENDEDOR</th>
                  <th>QTD.</th>
                  <th>TOTAL</th>
                  <th>ESTADO</th>
                </tr>
              </thead>

              <tbody>
                {historico.length === 0 ? (
                  <tr>
                    <td className="info" colSpan={6}>
                      Sem registo
                    </td>
                  </tr>
                ) : (
                  historico.map((p) => {
                    // Calcular quantidade total de unidades
                    const totalItens = Array.isArray(p.produtos)
                      ? p.produtos.reduce(
                          (total, item) => total + Number(item.quantidade || 0),
                          0,
                        )
                      : Number(p.quantidade || 0);

                    // Valor total da venda
                    const totalVenda = Number(
                      p.total ?? p.valorTotal ?? p.valorPago ?? 0,
                    );

                    // Valor já recebido
                    const valorPago = Number(
                      p.valorPago ?? (p.estado === "Pago" ? totalVenda : 0),
                    );

                    // Valor ainda em dívida
                    const valorDivida = Number(
                      p.valorEmDivida ?? Math.max(totalVenda - valorPago, 0),
                    );

                    // Determinar estado real da operação
                    let estado;

                    if (
                      p.estado === "Pago" ||
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
                      <tr key={p.id}>
                        <td className="tdstyleID">
                          <p>{p.id}</p>
                          <p className="tdstyleData">{p.data}</p>
                        </td>

                        <td>{p.cliente}</td>

                        <td>{p.vendedor}</td>

                        <td>
                          <span className="QuantidadeItens">{totalItens}</span>
                        </td>

                        <td className="ValorHistorico">
                          {totalVenda.toLocaleString("pt-MZ", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}{" "}
                          MT
                        </td>

                        <td>
                          <span className={`StatusVenda ${classeEstado}`}>
                            {estado}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          <div className="containerTableProdutoDisponivel styleScrollBar">
            <h2 className="Cardtitulos">Pordutos diponiveis</h2>
            <table className="tableProdutoDisponivel">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>PRODUTO</th>
                  <th>CATEGORIA</th>
                  <th>QNT</th>
                  <th>VALOR</th>
                </tr>
              </thead>
              <tbody>
                {produtosFiltrados.length === 0 ? (
                  <tr>
                    <td className="info" colSpan={5}>
                      Nenhum produto disponivel.
                    </td>
                  </tr>
                ) : (
                  produtosFiltrados.map((p) => (
                    <tr key={p.id}>
                      <td className="tdstyleID">{p.id}</td>
                      <td>
                        <strong>{p.produto}</strong>
                      </td>
                      <td>{p.categria}</td>
                      <td >{p.stock}</td>
                      <td>{p.venda}MT</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
export default Dashbord;
