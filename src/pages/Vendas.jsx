import HeaderPage from "../assets/componets/HeaderPage";
import { FaSearch } from "react-icons/fa";
import { FaCube } from "react-icons/fa6";
import "./StyleVendas.css";
import { useState, useRef } from "react";
import { useEffect } from "react";
import { FaTrash } from "react-icons/fa";
import { listarProdutos, listarClientes, registarVenda } from "../lib/lojixApi";

function Vendas() {
  const [produtos,setProdutos]=useState([]);
  const produtosFiltrados=produtos.filter(p=>Number(p.stock)>0);
  const [listaCarrinho,setListaCarrinho]=useState([]);
  const [listaClientes,setListaClientes]=useState([]);
  const [processando,setProcessando]=useState(false);
  const processoPendente=useRef(false);
  useEffect(()=>{
    let active=true;
    Promise.all([listarProdutos(),listarClientes()]).then(([p,c])=>{
      if(active){setProdutos(p);setListaClientes(c)}
    }).catch(e=>alert("Erro ao carregar vendas: "+e.message));
    return()=>{active=false};
  },[]);
  const [modalAberto, setModalAberto] = useState(false);
  const [tipoOperacao, setTipoOperacao] = useState("");
  const [clienteSelecionado, setClienteSelecionado] = useState("");
  const [desconto, setDesconto] = useState("0");

  const total = listaCarrinho.reduce((soma, p) => {
    return soma + Number(p.vendaTotal || 0);
  }, 0);

  // O desconto é sempre limitado ao valor do subtotal.
  const descontoNumerico = Math.max(0, Number(desconto) || 0);
  const descontoAplicado = Math.min(descontoNumerico, total);
  const totalFinal = Math.max(0, total - descontoAplicado);


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

  async function confirmarOperacao(e){
    e.preventDefault();
    if(processoPendente.current)return;
    const cliente=listaClientes.find((c,i)=>obterIdCliente(c,i)===clienteSelecionado);
    if((tipoOperacao==='fiado'&&!cliente)||(!clienteSelecionado)){
      alert('Seleccione um cliente válido para a venda.');return;
    }
    processoPendente.current=true;setProcessando(true);
    try{
      await registarVenda({itens:listaCarrinho,clienteId:clienteSelecionado,tipo:tipoOperacao,desconto:descontoAplicado});
      const lista=await listarProdutos();setProdutos(lista);
      setListaCarrinho([]);setDesconto('0');setModalAberto(false);setClienteSelecionado('');
      alert(tipoOperacao==='fiado'?'Fiado registado com sucesso!':'Venda realizada com sucesso!');
    }catch(erro){alert('Erro ao concluir venda: '+erro.message)}
    finally{processoPendente.current=false;setProcessando(false)}
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
                <button type="submit" disabled={processando} className="btnModalConfirmar">
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
