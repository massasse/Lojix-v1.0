-- LOJIX: modo loja única com dados partilhados entre todos os utilizadores autenticados.
-- Executar depois de lojix_schema.sql num projecto que ainda use owner_id por utilizador.

CREATE TABLE IF NOT EXISTS public.perfis (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.perfis ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS perfis_select ON public.perfis;
CREATE POLICY perfis_select ON public.perfis FOR SELECT TO authenticated USING (true);
REVOKE ALL ON public.perfis FROM anon, authenticated;
GRANT SELECT ON public.perfis TO authenticated;

-- O username é preenchido pelo administrador ao criar o utilizador no Supabase Auth.
CREATE OR REPLACE FUNCTION public.handle_new_lojix_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  INSERT INTO public.perfis(id, username)
  VALUES (new.id, nullif(btrim(coalesce(new.raw_user_meta_data->>'username', new.raw_user_meta_data->>'full_name', '')), ''))
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$;
DROP TRIGGER IF EXISTS on_auth_user_created_lojix ON auth.users;
CREATE TRIGGER on_auth_user_created_lojix AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_lojix_user();

-- Todas as linhas passam a pertencer ao identificador comum da loja.
ALTER TABLE public.venda_itens DROP CONSTRAINT IF EXISTS venda_itens_owner_id_venda_id_fkey;
ALTER TABLE public.pagamentos DROP CONSTRAINT IF EXISTS pagamentos_owner_id_venda_id_fkey;
ALTER TABLE public.produtos DROP CONSTRAINT IF EXISTS produtos_owner_id_fkey;
ALTER TABLE public.clientes DROP CONSTRAINT IF EXISTS clientes_owner_id_fkey;
ALTER TABLE public.vendas DROP CONSTRAINT IF EXISTS vendas_owner_id_fkey;
ALTER TABLE public.movimentos_caixa DROP CONSTRAINT IF EXISTS movimentos_caixa_owner_id_fkey;
ALTER TABLE public.venda_contadores DROP CONSTRAINT IF EXISTS venda_contadores_owner_id_fkey;
UPDATE public.produtos SET owner_id='00000000-0000-0000-0000-000000000001';
UPDATE public.clientes SET owner_id='00000000-0000-0000-0000-000000000001';
UPDATE public.vendas SET owner_id='00000000-0000-0000-0000-000000000001';
UPDATE public.venda_itens SET owner_id='00000000-0000-0000-0000-000000000001';
UPDATE public.pagamentos SET owner_id='00000000-0000-0000-0000-000000000001';
UPDATE public.movimentos_caixa SET owner_id='00000000-0000-0000-0000-000000000001';
UPDATE public.venda_contadores SET owner_id='00000000-0000-0000-0000-000000000001';
ALTER TABLE public.venda_itens ADD CONSTRAINT venda_itens_owner_id_venda_id_fkey
  FOREIGN KEY(owner_id, venda_id) REFERENCES public.vendas(owner_id, id) ON DELETE CASCADE;
ALTER TABLE public.pagamentos ADD CONSTRAINT pagamentos_owner_id_venda_id_fkey
  FOREIGN KEY(owner_id, venda_id) REFERENCES public.vendas(owner_id, id);

-- Autenticação continua obrigatória; todos os utilizadores autenticados da loja
-- consultam e operam sobre o mesmo conjunto de dados.
DO $$
DECLARE t text; pol record;
BEGIN
  FOREACH t IN ARRAY ARRAY['produtos','clientes','vendas','venda_itens','pagamentos','movimentos_caixa','venda_contadores'] LOOP
    FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename=t LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, t);
    END LOOP;
  END LOOP;
END $$;
CREATE POLICY produtos_shared ON public.produtos FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY clientes_shared ON public.clientes FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY vendas_shared ON public.vendas FOR SELECT TO authenticated USING (true);
CREATE POLICY itens_shared ON public.venda_itens FOR SELECT TO authenticated USING (true);
CREATE POLICY pagamentos_shared ON public.pagamentos FOR SELECT TO authenticated USING (true);
CREATE POLICY caixa_shared ON public.movimentos_caixa FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY contador_privado ON public.venda_contadores FOR ALL TO authenticated USING (false) WITH CHECK (false);

-- As RPCs usam o ID comum da loja e exigem utilizador autenticado via grants.
DO $$
DECLARE f record; d text;
BEGIN
  FOR f IN SELECT p.oid FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
           WHERE n.nspname='public' AND p.proname IN ('registar_venda','registar_pagamento_fiado') LOOP
    d := pg_get_functiondef(f.oid);
    d := replace(d, 'u uuid := auth.uid();', 'u uuid := ''00000000-0000-0000-0000-000000000001''::uuid;');
    d := replace(d, 'u uuid:=auth.uid();', 'u uuid:=''00000000-0000-0000-0000-000000000001''::uuid;');
    d := replace(d,
      'SELECT coalesce(nullif(raw_user_meta_data->>''username'',),nullif(raw_user_meta_data->>full_name,),split_part(email,''@'',1)) INTO vvendedor',
      'SELECT coalesce(p.username,''Utilizador'') INTO vvendedor');
    d := replace(d, ' FROM auth.users WHERE id=u;', ' FROM public.perfis p WHERE p.id=auth.uid();');
    EXECUTE d;
  END LOOP;
END $$;
DROP FUNCTION IF EXISTS public.importar_backup_lojix(jsonb);
