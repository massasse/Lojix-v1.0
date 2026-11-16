import "./StyleHeadpage.css";
import { FaSearch } from "react-icons/fa";

function HeadPage({ namebtn, serch, setInputserch, onAdicionar }) {
  return (
    <>
      <div className="HaedProdutoPage">
        <div className="ContainerInputserch">
          
           <FaSearch />
          <input
            type="text"
            placeholder="Pesquisar..."
            value={serch}
            onChange={(e) => setInputserch(e.target.value)}
          />
        </div>
        <button className="btn" onClick={onAdicionar}>
          {namebtn}
        </button>
      </div>
    </>
  );
}

export default HeadPage;
