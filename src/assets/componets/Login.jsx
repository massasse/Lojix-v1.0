import { FaRegUser, FaLock } from 'react-icons/fa';
import { useNavigate, Navigate } from 'react-router-dom';
import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/AuthContext';
import './StyleLogin.css';

function Login() {
  const [inputemail, setInputEmail] = useState('');
  const [inputpass, setInputPass] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { user, ready } = useAuth();

  if (ready && user) return <Navigate to="/principal/dashbord" replace />;

  async function entrar(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: inputemail.trim(),
        password: inputpass,
      });
      if (authError) throw authError;
      navigate('/principal/dashbord');
    } catch (err) {
      setError(err.message || 'Não foi possível iniciar sessão.');
    } finally {
      setBusy(false);
    }
  }

  return <div id="containerapp">
    <img src="/lojix_logo.png" alt="LOJIX" className="logo" />
    <form onSubmit={entrar}>
      <div className="ContainerInput"><FaRegUser /><input type="email" placeholder="Digite o seu email..." required className="input email" value={inputemail} onChange={e => setInputEmail(e.target.value)} autoComplete="email" /></div>
      <div className="ContainerInput"><FaLock /><input type="password" placeholder="Digite a sua palavra-passe..." required className="input pass" value={inputpass} onChange={e => setInputPass(e.target.value)} autoComplete="current-password" /></div>
      <p className="error" role="alert">{error}</p>
      <button className="bntlogin" disabled={busy} type="submit">{busy ? 'A iniciar sessão...' : 'Iniciar sessão'}</button>
    </form>
  </div>;
}
export default Login;
