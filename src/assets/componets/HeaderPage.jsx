import {useAuth} from '../../lib/AuthContext';
import './StyleHeaderPage.css';
function HeaderPage(props){
 const {user,profile}=useAuth();
 const username=profile?.username || 'Utilizador';
 return <header><h1>{props.page}</h1><div className="containerUser">
  <div className="containerusericon"><img className="usericon" src="/User_Icon.png" alt="Utilizador"/></div>
  <div><p className="userLogado">{username}</p><p className="emailLogado">{user?.email||''}</p></div>
 </div></header>;
}
export default HeaderPage;
