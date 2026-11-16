import { useState } from "react";
import "./StyleModalProduto.css";

function ModalProduto({ fecharModal, adicionarProduto }) {
  const [form, setForm] = useState({
    produto: "",
    categoria: "",
    marca: "",
    compra: "",
    venda: "",
    stock: "",
  });

  function handleChange(e) {
    const { name, value } = e.target;

    setForm({
      ...form,
      [name]: value,
    });
  }

  function handleSubmit(e) {
    e.preventDefault();

    adicionarProduto({
      ...form,
      compra: Number(form.compra),
      venda: Number(form.venda),
      stock: Number(form.stock),
    });

    fecharModal();
  }

  return (
    <div className="ModalOverlay" onClick={fecharModal}>
      <div className="ModalProduto" onClick={(e) => e.stopPropagation()}>
        <div className="ModalProdutoHeader">
          <div>
            <h2>Adicionar produto</h2>
            <p>Preencha os dados do novo produto.</p>
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
              <label htmlFor="produto">Nome do produto</label>
              <input
                id="produto"
                name="produto"
                value={form.produto}
                onChange={handleChange}
                placeholder="Ex.: Motala 40ml"
                required
              />
            </div>

            <div className="CampoProduto">
              <label htmlFor="categoria">Categoria</label>
              <input
                id="categoria"
                name="categoria"
                value={form.categoria}
                onChange={handleChange}
                placeholder="Ex.: Perfume"
                required
              />
            </div>

            <div className="CampoProduto">
              <label htmlFor="marca">Marca</label>
              <input
                id="marca"
                name="marca"
                value={form.marca}
                onChange={handleChange}
                placeholder="Nome da marca"
                required
              />
            </div>

            <div className="CampoProduto">
              <label htmlFor="compra">Preço de compra (MT)</label>
              <input
                id="compra"
                name="compra"
                type="number"
                min="0"
                step="0.01"
                value={form.compra}
                onChange={handleChange}
                placeholder="0.00"
                required
              />
            </div>

            <div className="CampoProduto">
              <label htmlFor="venda">Preço de venda (MT)</label>
              <input
                id="venda"
                name="venda"
                type="number"
                min="0"
                step="0.01"
                value={form.venda}
                onChange={handleChange}
                placeholder="0.00"
                required
              />
            </div>

            <div className="CampoProduto">
              <label htmlFor="stock">Stock inicial</label>
              <input
                id="stock"
                name="stock"
                type="number"
                min="0"
                step="1"
                value={form.stock}
                onChange={handleChange}
                placeholder="0"
                required
              />
            </div>
          </div>

          <div className="ModalProdutoFooter">
            <button type="button" className="BtnCancelar" onClick={fecharModal}>
              Cancelar
            </button>

            <button type="submit" className="BtnGuardar">
              Adicionar produto
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ModalProduto;
