import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!url || !publishableKey) {
  throw new Error('Supabase não configurado: verifica VITE_SUPABASE_URL e VITE_SUPABASE_PUBLISHABLE_KEY.');
}

// Apenas a chave pública é usada pelo navegador. Nunca incluir service_role/secret.
export const supabase = createClient(url, publishableKey);
