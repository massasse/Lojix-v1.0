import { useState } from "react";
import "./StyleModalProduto.css";

function ModalEditarProduto({ produto, fecharModal, atualizarProduto }) {
  const [form, setForm] = useState({
    produto: produto.produto ?? "",
    categria: produto.categria ?? produto.categoria ?? "",
    marca: produto.marca ?? "",
    compra: produto.compra ?? "",
    venda: produto.venda ?? "",
    stock: produto.stock ?? "",
  });

  function handleChange(e) {
    const { name, value } = e.target;

    setForm((formAtual) => ({
      ...formAtual,
      [name]: value,
    }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    try {

    await atualizarProduto({
      ...produto,
      ...form,
      compra: Number(form.compra),
      venda: Number(form.venda),
      stock: Number(form.stock),
    });

    fecharModal();
    } catch (erro) { alert("Não foi possível guardar: " + erro.message); }
  }

  return (
    <div className="ModalOverlay" onClick={fecharModal}>
      <div className="ModalProduto" onClick={(e) => e.stopPropagation()}>
        <div className="ModalProdutoHeader">
          <div>
            <h2>Editar produto</h2>
            <p>Altere os dados do produto.</p>
          </div>

          <button
            type="button"
            className="ModalFechar"
            onClick={fecharModal}
            aria-label="Fechar modal"
          >
            &times;
          </button>
        </div>

        <form onSubmit={handleSubmit} className="addPromodalform">
          <div className="FormProdutoGrid">
            <div className="CampoProduto">
              <label htmlFor="editar-produto">Nome do produto</label>
              <input
                id="editar-produto"
                name="produto"
                value={form.produto}
                onChange={handleChange}
                required
              />
            </div>

            <div className="CampoProduto">
              <label htmlFor="editar-categoria">Categoria</label>
              <input
                id="editar-categoria"
                name="categria"
                value={form.categria}
                onChange={handleChange}
                required
              />
            </div>

            <div className="CampoProduto">
              <label htmlFor="editar-marca">Marca</label>
              <input
                id="editar-marca"
                name="marca"
                value={form.marca}
                onChange={handleChange}
                required
              />
            </div>

            <div className="CampoProduto">
              <label htmlFor="editar-compra">Preço de compra (MT)</label>
              <input
                id="editar-compra"
                name="compra"
                type="number"
                min="0"
                step="0.01"
                value={form.compra}
                onChange={handleChange}
                required
              />
            </div>

            <div className="CampoProduto">
              <label htmlFor="editar-venda">Preço de venda (MT)</label>
              <input
                id="editar-venda"
                name="venda"
                type="number"
                min="0"
                step="0.01"
                value={form.venda}
                onChange={handleChange}
                required
              />
            </div>

            <div className="CampoProduto">
              <label htmlFor="editar-stock">Stock</label>
              <input
                id="editar-stock"
                name="stock"
                type="number"
                min="0"
                step="1"
                value={form.stock}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          <div className="ModalProdutoFooter">
            <button type="button" className="BtnCancelar" onClick={fecharModal}>
              Cancelar
            </button>

            <button type="submit" className="BtnGuardar">
              Guardar alterações
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ModalEditarProduto;
