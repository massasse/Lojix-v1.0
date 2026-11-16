/* eslint-disable react-refresh/only-export-components */
import {createContext,useContext,useEffect,useState} from 'react';
import {supabase} from './supabase';

const AuthContext=createContext(null);
export function AuthProvider({children}){
 const [user,setUser]=useState(null);
 const [profile,setProfile]=useState(null);
 const [ready,setReady]=useState(false);
 useEffect(()=>{
   let mounted=true;
   async function loadProfile(currentUser){
     if(!currentUser){if(mounted)setProfile(null);return;}
     const {data,error}=await supabase.from('perfis').select('username').eq('id',currentUser.id).maybeSingle();
     if(error) console.error('Perfil:',error.message);
     if(mounted)setProfile(data??null);
   }
   supabase.auth.getUser().then(async({data,error})=>{
     if(error)console.warn('Sessão:',error.message);
     if(mounted){setUser(data?.user??null);await loadProfile(data?.user??null);setReady(true);}
   }).catch(e=>{if(mounted){console.error(e);setReady(true)}});
   const {data:{subscription}}=supabase.auth.onAuthStateChange((_event,session)=>{
     if(mounted){setUser(session?.user??null);setProfile(null);setReady(true);}
     if(session?.user) setTimeout(()=>loadProfile(session.user),0);
   });
   return()=>{mounted=false;subscription.unsubscribe();};
 },[]);
 return <AuthContext.Provider value={{user,profile,ready}}>{children}</AuthContext.Provider>;
}
export function useAuth(){return useContext(AuthContext)}
