import "./StyleCardDashbord.css";

function CardDashbord(props) {
  return (
    <>
      <div className="containerCard">
        <p className="titulo">{props.titulo}</p>
        <p className="valor">{props.valor}</p>
      </div>
    </>
  );
}

export default CardDashbord;
