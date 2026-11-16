
import { useMemo, useState, useEffect, useRef } from "react";
import { listarClientes,criarCliente,editarCliente as atualizarClienteRemoto,apagarCliente,listarVendas,pagarFiado } from "../lib/lojixApi";
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
const [clientes,setClientes]=useState([]);
  const [vendas,setVendas]=useState([]);
  const [,setProcessando]=useState(false);
  const processoPendente=useRef(false);
  useEffect(()=>{
    let active=true;
    Promise.all([listarClientes(),listarVendas()]).then(([c,v])=>{
      if(active){setClientes(c);setVendas(v)}
    }).catch(e=>alert('Erro ao carregar clientes: '+e.message));
    return ()=>{active=false};
  },[]);

  const [pesquisa, setPesquisa] = useState("");

  const [modal, setModal] = useState("");

  const [clienteAtivo, setClienteAtivo] = useState(null);

  const [form, setForm] = useState({
    nome: "",
    telefone: "",
  });

  const [vendaPagamento, setVendaPagamento] = useState(null);

  const [valorPagamento, setValorPagamento] = useState("");

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

  // Guardar os dados directamente no Supabase.
  async function guardarCliente(e){
    e.preventDefault();if(processoPendente.current)return;
    const nome=form.nome.trim(),telefone=form.telefone.trim();
    if(!nome||!telefone){alert('Preencha o nome e o telefone do cliente.');return;}
    processoPendente.current=true;setProcessando(true);
    try{
      if(modal==='editar')await atualizarClienteRemoto({...clienteAtivo,nome,telefone});
      else await criarCliente({nome,telefone});
      setClientes(await listarClientes());
      setModal('');setClienteAtivo(null);
    }catch(erro){alert('Não foi possível guardar o cliente: '+erro.message)}
    finally{processoPendente.current=false;setProcessando(false)}
  }
  async function eliminarCliente(cliente){
    if(obterVendasCliente(vendas,cliente).length>0){
      alert('Não é possível eliminar este cliente porque tem vendas associadas.');return;
    }
    if(!window.confirm(`Eliminar o cliente ${cliente.nome}?`))return;
    try{await apagarCliente(cliente);setClientes(await listarClientes())}
    catch(e){alert('Não foi possível eliminar o cliente: '+e.message)}
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

  // Registo atómico: pagamento, dívida e caixa são actualizados numa só transacção.
  async function confirmarPagamento(e){
    e.preventDefault();if(processoPendente.current)return;
    const valor=Number(valorPagamento);
    if(!Number.isFinite(valor)||valor<=0){alert('Introduza um valor válido.');return;}
    processoPendente.current=true;setProcessando(true);
    try{
      const resultado=await pagarFiado(vendaPagamento.id,valor);
      setVendas(await listarVendas());setVendaPagamento(null);setValorPagamento('');
      alert(resultado.valorEmDivida===0?'Dívida totalmente liquidada!':`Pagamento registado! Dívida restante: ${formatarMT(resultado.valorEmDivida)}`);
    }catch(erro){alert('Não foi possível registar pagamento: '+erro.message)}
    finally{processoPendente.current=false;setProcessando(false)}
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
