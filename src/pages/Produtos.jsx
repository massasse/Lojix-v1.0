
import HeaderPage from "../assets/componets/HeaderPage";
import HeadPage from "../assets/componets/Headpage";
import ModalProduto from "../assets/componets/ModalProdutos";
import ModalEditarProduto from "../assets/componets/ModalEditarProduto";
import { FaPen, FaTrash } from "react-icons/fa";
import { useEffect, useState } from "react";
import "./StyleProdutos.css";
import {listarProdutos,criarProduto,editarProduto,apagarProduto} from "../lib/lojixApi";

function Produtos() {

  const [produtos,setProdutos]=useState([]);
  useEffect(()=>{let active=true;listarProdutos().then(data=>{if(active)setProdutos(data)}).catch(e=>alert("Erro ao carregar produtos: "+e.message));return()=>{active=false}},[]);

  const [produtoEditar, setProdutoEditar] = useState(null);
  const [inputserch, setInputserch] = useState("");
  const [modalAberto, setModalAberto] = useState(false);

  // Formatação dos valores
  function formatarMT(valor) {
    return `${Number(valor || 0).toLocaleString("pt-MZ", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })} MT`;
  }

  // Pesquisa de produtos
  const filtrado = produtos.filter((produto) => {
    const pesquisa = inputserch.toLowerCase();

    const nome = String(produto.produto ?? "").toLowerCase();
    const categoria = String(
      produto.categria ?? produto.categoria ?? ""
    ).toLowerCase();
    const marca = String(produto.marca ?? "").toLowerCase();

    return (
      nome.includes(pesquisa) ||
      categoria.includes(pesquisa) ||
      marca.includes(pesquisa)
    );
  });

  async function adicionarProduto(novoProduto){
    const criado=await criarProduto(novoProduto);
    setProdutos(lista=>[...lista,criado]);
  }
  async function atualizarProduto(produtoAtualizado){
    const editado=await editarProduto(produtoAtualizado);
    setProdutos(lista=>lista.map(p=>String(p.id)===String(editado.id)?editado:p));
  }
  async function remover(id){
    if(!window.confirm("Eliminar este produto?"))return;
    try{await apagarProduto(id);setProdutos(lista=>lista.filter(p=>String(p.id)!==String(id)))}
    catch(e){alert("Não foi possível eliminar: "+e.message)}
  }

  return (
    <div className="ContentProduto">

      <HeaderPage page="Produtos" />

      <main className="ContentProdutoPage">

        <HeadPage
          namebtn="Novo Produto"
          serch={inputserch}
          setInputserch={setInputserch}
          onAdicionar={() => setModalAberto(true)}
        />

        <div className="TableProdutoPage">

          <div className="TableProdutoHeader">
            <div>
              <h2>Lista de produtos</h2>
              <p>Consulte e gira os produtos do seu negócio.</p>
            </div>

            <span className="ProdutoCount">
              {filtrado.length} produtos
            </span>
          </div>

          <table className="TableProduto">

            <thead>
              <tr>
                <th>ID</th>
                <th>Produto</th>
                <th>Categoria</th>
                <th>Marca</th>
                <th>Custo</th>
                <th>Venda</th>
                <th>Qnt</th>
                <th>Estado</th>
                <th>Acções</th>
              </tr>
            </thead>

            <tbody>

              {filtrado.length === 0 ? (

                <tr>
                  <td className="ProdutoVazio" colSpan={9}>
                    <div>
                      <p>Nenhum produto encontrado.</p>
                      <span>
                        Experimente pesquisar por outro nome,
                        marca ou categoria.
                      </span>
                    </div>
                  </td>
                </tr>

              ) : (

                filtrado.map((produto) => {

                  const temStock = Number(produto.stock) > 0;

                  return (
                    <tr key={produto.id}>

                      <td className="ProdutoID">
                        #{String(produto.id).padStart(3, "0")}
                      </td>

                      <td className="ProdutoNome">
                        <strong>{produto.produto}</strong>
                      </td>

                      <td>
                        {produto.categria ?? produto.categoria ?? "—"}
                      </td>

                      <td className="ProdutoMarca">
                        {produto.marca || "—"}
                      </td>

                      <td className="ProdutoPreco">
                        {formatarMT(produto.compra)}
                      </td>

                      <td className="ProdutoPreco VendaPreco">
                        {formatarMT(produto.venda)}
                      </td>

                      <td>
                        <span className="StockQuantidade">
                          {Number(produto.stock) || 0}
                        </span>
                      </td>

                      <td>
                        <span
                          className={`EstadoProduto ${
                            temStock ? "emStock" : "semStock"
                          }`}
                        >
                          <span className="EstadoPonto"></span>
                          {temStock ? "Em stock" : "Sem stock"}
                        </span>
                      </td>

                      <td className="acoesbtn">

                        <button
                          className="editBtn"
                          onClick={() => setProdutoEditar(produto)}
                          aria-label={`Editar ${produto.produto}`}
                          title="Editar produto"
                        >
                          <FaPen />
                        </button>

                        <button
                          className="deleteBtn"
                          onClick={() => remover(produto.id)}
                          aria-label={`Eliminar ${produto.produto}`}
                          title="Eliminar produto"
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

      {modalAberto && (
        <ModalProduto
          fecharModal={() => setModalAberto(false)}
          adicionarProduto={adicionarProduto}
        />
      )}

      {produtoEditar && (
        <ModalEditarProduto
          produto={produtoEditar}
          fecharModal={() => setProdutoEditar(null)}
          atualizarProduto={atualizarProduto}
        />
      )}

    </div>
  );
}

export default Produtos;
