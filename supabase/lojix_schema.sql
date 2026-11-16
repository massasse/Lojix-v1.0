-- LOJIX: base de dados isolada por utilizador (MVP, sem partilha entre contas).
-- Aplicar apenas num projecto novo. Identificadores comerciais históricos mantidos como texto.
create table public.produtos (
 owner_id uuid not null references auth.users(id) on delete cascade,
 id text not null,
 produto text not null,
 categoria text not null default '',
 marca text not null default '',
 compra numeric(14,2) not null default 0 check (compra >= 0),
 venda numeric(14,2) not null default 0 check (venda >= 0),
 stock integer not null default 0 check (stock >= 0),
 extra jsonb not null default '{}'::jsonb,
 created_at timestamptz not null default now(),
 primary key(owner_id,id)
);
create table public.clientes (
 owner_id uuid not null references auth.users(id) on delete cascade,
 id text not null,
 nome text not null,
 telefone text not null default '',
 data_cadastro text,
 extra jsonb not null default '{}'::jsonb,
 created_at timestamptz not null default now(),
 primary key(owner_id,id)
);
create table public.vendas (
 owner_id uuid not null references auth.users(id) on delete cascade,
 id text not null,
 cliente_id text,
 cliente text not null,
 vendedor text not null default '',
 tipo text not null check (tipo in ('venda','fiado')),
 data text not null,
 subtotal numeric(14,2) not null default 0 check (subtotal >= 0),
 desconto numeric(14,2) not null default 0 check (desconto >= 0),
 total numeric(14,2) not null default 0 check (total >= 0),
 estado text not null default 'Pago',
 valor_pago numeric(14,2) not null default 0 check (valor_pago >= 0),
 valor_em_divida numeric(14,2) not null default 0 check (valor_em_divida >= 0),
 extra jsonb not null default '{}'::jsonb,
 created_at timestamptz not null default now(),
 primary key(owner_id,id)
);
create table public.venda_itens (
 owner_id uuid not null,
 venda_id text not null,
 linha integer not null,
 produto_id text,
 produto text not null,
 quantidade integer not null check (quantidade > 0),
 preco_unitario numeric(14,2) not null check (preco_unitario >= 0),
 valor_total numeric(14,2) not null check (valor_total >= 0),
 extra jsonb not null default '{}'::jsonb,
 primary key(owner_id,venda_id,linha),
 foreign key(owner_id,venda_id) references public.vendas(owner_id,id) on delete cascade
);
create table public.pagamentos (
 owner_id uuid not null,
 id text not null,
 venda_id text not null,
 valor numeric(14,2) not null check (valor > 0),
 data text not null,
 primary key(owner_id,id),
 foreign key(owner_id,venda_id) references public.vendas(owner_id,id) on delete restrict
);
create table public.movimentos_caixa (
 owner_id uuid not null references auth.users(id) on delete cascade,
 id text not null,
 tipo text not null,
 descricao text not null default '',
 valor numeric(14,2) not null default 0 check (valor >= 0),
 data text not null,
 venda_id text,
 extra jsonb not null default '{}'::jsonb,
 created_at timestamptz not null default now(),
 primary key(owner_id,id)
);
create table public.venda_contadores (
 owner_id uuid primary key references auth.users(id) on delete cascade,
 proximo bigint not null check (proximo > 0)
);
create index idx_vendas_cliente on public.vendas(owner_id,cliente_id);
create index idx_vendas_created on public.vendas(owner_id,created_at desc);
create index idx_movimentos_created on public.movimentos_caixa(owner_id,created_at desc);
create index idx_pagamentos_venda on public.pagamentos(owner_id,venda_id);

alter table public.produtos enable row level security;
alter table public.clientes enable row level security;
alter table public.vendas enable row level security;
alter table public.venda_itens enable row level security;
alter table public.pagamentos enable row level security;
alter table public.movimentos_caixa enable row level security;
alter table public.venda_contadores enable row level security;
create policy contador_privado on public.venda_contadores for all to authenticated using (false) with check (false);

-- Só cada utilizador vê e altera os seus próprios produtos/clientes/movimentos.
create policy produtos_select on public.produtos for select to authenticated using ((select auth.uid()) = owner_id);
create policy produtos_insert on public.produtos for insert to authenticated with check ((select auth.uid()) = owner_id);
create policy produtos_update on public.produtos for update to authenticated using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);
create policy produtos_delete on public.produtos for delete to authenticated using ((select auth.uid()) = owner_id);
create policy clientes_select on public.clientes for select to authenticated using ((select auth.uid()) = owner_id);
create policy clientes_insert on public.clientes for insert to authenticated with check ((select auth.uid()) = owner_id);
create policy clientes_update on public.clientes for update to authenticated using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);
create policy clientes_delete on public.clientes for delete to authenticated using ((select auth.uid()) = owner_id);
create policy movimentos_select on public.movimentos_caixa for select to authenticated using ((select auth.uid()) = owner_id);
create policy movimentos_insert on public.movimentos_caixa for insert to authenticated with check ((select auth.uid()) = owner_id);
create policy movimentos_update on public.movimentos_caixa for update to authenticated using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);
create policy movimentos_delete on public.movimentos_caixa for delete to authenticated using ((select auth.uid()) = owner_id);
-- Vendas, itens e pagamentos só são modificados em operações transaccionais autenticadas.
create policy vendas_select on public.vendas for select to authenticated using ((select auth.uid()) = owner_id);
create policy itens_select on public.venda_itens for select to authenticated using ((select auth.uid()) = owner_id);
create policy pagamentos_select on public.pagamentos for select to authenticated using ((select auth.uid()) = owner_id);

revoke all on public.produtos,public.clientes,public.vendas,public.venda_itens,public.pagamentos,public.movimentos_caixa,public.venda_contadores from anon,authenticated;
grant select,insert,update,delete on public.produtos,public.clientes,public.movimentos_caixa to authenticated;
grant select on public.vendas,public.venda_itens,public.pagamentos to authenticated;

-- O bloqueio por utilizador impede códigos duplicados e corrida de actualização de stock.
create or replace function public.registar_venda(p_itens jsonb,p_cliente_id text,p_tipo text,p_desconto numeric default 0)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
 u uuid := auth.uid(); n bigint; vid text; vcliente text := 'Caixa'; vvendedor text;
 item jsonb; prod public.produtos%rowtype; quantidade integer; linha integer := 0;
 sub numeric(14,2) := 0; desconto_aplicado numeric(14,2); total_aplicado numeric(14,2);
 itens_json jsonb := '[]'::jsonb; snapshot jsonb; data_venda text; encontrado integer;
begin
 if u is null then raise exception 'Sessão expirada.'; end if;
 if p_tipo not in ('venda','fiado') then raise exception 'Tipo de venda inválido.'; end if;
 if p_itens is null or jsonb_typeof(p_itens) <> 'array' or jsonb_array_length(p_itens) < 1 or jsonb_array_length(p_itens) > 200 then
  raise exception 'Carrinho inválido.'; end if;
 if p_desconto is null or p_desconto < 0 then raise exception 'Desconto inválido.'; end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(u::text, 123456));
 if p_cliente_id is not null and p_cliente_id <> '__CAIXA__' then
  select nome into vcliente from public.clientes where owner_id=u and id=p_cliente_id;
  if not found then raise exception 'Cliente não encontrado.'; end if;
 elsif p_tipo='fiado' then raise exception 'O fiado exige um cliente registado.'; end if;
 select coalesce(nullif(raw_user_meta_data->>'username',''),nullif(raw_user_meta_data->>'full_name',''),split_part(email,'@',1))
 into vvendedor from auth.users where id=u;
 for item in select value from jsonb_array_elements(p_itens) loop
  if nullif(item->>'id','') is null or (item->>'quantidade') !~ '^[0-9]+$' then
   raise exception 'Produto ou quantidade inválidos.'; end if;
  quantidade := (item->>'quantidade')::integer;
  if quantidade < 1 then raise exception 'Quantidade inválida.'; end if;
  update public.produtos set stock=stock-quantidade
  where owner_id=u and id=(item->>'id') and stock >= quantidade returning * into prod;
  if not found then raise exception 'Produto não encontrado ou stock insuficiente: %',item->>'id'; end if;
  sub := sub + prod.venda*quantidade;
  linha := linha+1;
  snapshot := pg_catalog.jsonb_build_object('id',prod.id,'produto',prod.produto,'categoria',prod.categoria,'marca',prod.marca,'compra',prod.compra,'venda',prod.venda,'stock',prod.stock+quantidade,'quantidade',quantidade,'vendaTotal',prod.venda*quantidade);
  itens_json := itens_json || pg_catalog.jsonb_build_array(snapshot);
 end loop;
 desconto_aplicado := least(p_desconto,sub);
 total_aplicado := sub-desconto_aplicado;
 insert into public.venda_contadores(owner_id,proximo) values(u,2)
 on conflict(owner_id) do update set proximo=public.venda_contadores.proximo+1
 returning proximo-1 into n;
 vid := '#' || lpad(n::text,6,'0');
 data_venda := to_char(clock_timestamp() at time zone 'Africa/Maputo','DD/FMMM/YYYY');
 insert into public.vendas(owner_id,id,cliente_id,cliente,vendedor,tipo,data,subtotal,desconto,total,estado,valor_pago,valor_em_divida)
 values(u,vid,case when p_cliente_id='__CAIXA__' then null else p_cliente_id end,vcliente,vvendedor,p_tipo,data_venda,sub,desconto_aplicado,total_aplicado,
 case when p_tipo='fiado' and total_aplicado>0 then 'Pendente' else 'Pago' end,
 case when p_tipo='fiado' then 0 else total_aplicado end,
 case when p_tipo='fiado' then total_aplicado else 0 end);
 for item in select value from jsonb_array_elements(itens_json) loop
  insert into public.venda_itens(owner_id,venda_id,linha,produto_id,produto,quantidade,preco_unitario,valor_total,extra)
  values(u,vid,(select count(*)+1 from public.venda_itens where owner_id=u and venda_id=vid),item->>'id',item->>'produto',(item->>'quantidade')::integer,(item->>'venda')::numeric,(item->>'vendaTotal')::numeric,item);
 end loop;
 return pg_catalog.jsonb_build_object('id',vid,'cliente',vcliente,'clienteId',case when p_cliente_id='__CAIXA__' then null else p_cliente_id end,
  'tipo',p_tipo,'data',data_venda,'produtos',itens_json,'subtotal',sub,'desconto',desconto_aplicado,'total',total_aplicado,
  'estado',case when p_tipo='fiado' and total_aplicado>0 then 'Pendente' else 'Pago' end,
  'valorPago',case when p_tipo='fiado' then 0 else total_aplicado end,
  'valorEmDivida',case when p_tipo='fiado' then total_aplicado else 0 end,'vendedor',vvendedor,'pagamentos','[]'::jsonb);
end $$;

create or replace function public.registar_pagamento_fiado(p_venda_id text,p_valor numeric)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
 u uuid := auth.uid(); v public.vendas%rowtype; mov_id text; pag_id text; agora text;
 pago numeric(14,2); divida numeric(14,2); estado_novo text;
begin
 if u is null then raise exception 'Sessão expirada.'; end if;
 if p_valor is null or p_valor <= 0 then raise exception 'Valor inválido.'; end if;
 select * into v from public.vendas where owner_id=u and id=p_venda_id for update;
 if not found then raise exception 'Venda não encontrada.'; end if;
 if v.tipo <> 'fiado' or v.valor_em_divida <= 0 or p_valor > v.valor_em_divida then raise exception 'Pagamento superior à dívida ou dívida liquidada.'; end if;
 pago:=v.valor_pago+p_valor; divida:=v.valor_em_divida-p_valor;
 estado_novo:=case when divida=0 then 'Pago' else 'Parcial' end;
 update public.vendas set valor_pago=pago,valor_em_divida=divida,estado=estado_novo where owner_id=u and id=p_venda_id;
 agora:=clock_timestamp()::text;
 pag_id:='PG-'||gen_random_uuid()::text;
 mov_id:='CX-'||gen_random_uuid()::text;
 insert into public.pagamentos(owner_id,id,venda_id,valor,data) values(u,pag_id,p_venda_id,p_valor,agora);
 insert into public.movimentos_caixa(owner_id,id,tipo,descricao,valor,data,venda_id,extra)
 values(u,mov_id,'recebimento_fiado','Pagamento de fiado '||p_venda_id,p_valor,agora,p_venda_id,
 pg_catalog.jsonb_build_object('clienteId',v.cliente_id,'cliente',v.cliente,'origem','fiado','pagamentoId',pag_id,'vendaId',p_venda_id));
 return pg_catalog.jsonb_build_object('id',p_venda_id,'valorPago',pago,'valorEmDivida',divida,'estado',estado_novo,
 'pagamento',pg_catalog.jsonb_build_object('id',pag_id,'valor',p_valor,'data',agora),'movimentoId',mov_id);
end $$;

-- Importação completa e única de um backup local. Erros cancelam TUDO na mesma transacção.
create or replace function public.importar_backup_lojix(p_backup jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
 u uuid := auth.uid(); pp jsonb; cc jsonb; vv jsonb; mm jsonb; rowjson jsonb; item jsonb;
 cid text; vid text; seq bigint; maxseq bigint := 0; i integer;
begin
 if u is null then raise exception 'Sessão expirada.'; end if;
 if p_backup is null or jsonb_typeof(p_backup)<>'object' then raise exception 'Backup inválido.'; end if;
 pp:=coalesce(p_backup->'lojix_produtos','[]'::jsonb);
 cc:=coalesce(p_backup->'lojix_clientes','[]'::jsonb);
 vv:=coalesce(p_backup->'lojix_vendas','[]'::jsonb);
 mm:=coalesce(p_backup->'lojix_caixa_movimentos','[]'::jsonb);
 if jsonb_typeof(cc)='object' then cc:=cc->'clientes'; end if;
 if jsonb_typeof(pp)<>'array' or jsonb_typeof(cc)<>'array' or jsonb_typeof(vv)<>'array' or jsonb_typeof(mm)<>'array' then
  raise exception 'Listas do backup inválidas.'; end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(u::text, 123456));
 if exists(select 1 from public.produtos where owner_id=u) or exists(select 1 from public.clientes where owner_id=u)
 or exists(select 1 from public.vendas where owner_id=u) or exists(select 1 from public.movimentos_caixa where owner_id=u) then
  raise exception 'Importação permitida apenas numa conta vazia. Nenhum dado foi modificado.'; end if;
 for rowjson in select value from jsonb_array_elements(pp) loop
  insert into public.produtos(owner_id,id,produto,categoria,marca,compra,venda,stock,extra)
  values(u,rowjson->>'id',coalesce(rowjson->>'produto',''),coalesce(rowjson->>'categoria',rowjson->>'categria',''),coalesce(rowjson->>'marca',''),
  coalesce((rowjson->>'compra')::numeric,0),coalesce((rowjson->>'venda')::numeric,0),coalesce((rowjson->>'stock')::integer,0),rowjson);
 end loop;
 for rowjson in select value from jsonb_array_elements(cc) loop
  insert into public.clientes(owner_id,id,nome,telefone,data_cadastro,extra)
  values(u,rowjson->>'id',coalesce(rowjson->>'nome',rowjson->>'nomeCliente',rowjson->>'name',''),coalesce(rowjson->>'telefone',rowjson->>'phone',''),rowjson->>'dataCadastro',rowjson);
 end loop;
 for rowjson in select value from jsonb_array_elements(vv) loop
  vid:=rowjson->>'id';
  if vid ~ '^#[0-9]+$' then
   seq:=substring(vid from 2)::bigint;
   maxseq:=greatest(maxseq,seq);
  end if;
  insert into public.vendas(owner_id,id,cliente_id,cliente,vendedor,tipo,data,subtotal,desconto,total,estado,valor_pago,valor_em_divida,extra)
  values(u,vid, nullif(rowjson->>'clienteId',''),coalesce(rowjson->>'cliente','Caixa'),coalesce(rowjson->>'vendedor',''),
  case when rowjson->>'tipo'='fiado' then 'fiado' else 'venda' end,
  coalesce(rowjson->>'data',''),coalesce((rowjson->>'subtotal')::numeric,(rowjson->>'total')::numeric,0),coalesce((rowjson->>'desconto')::numeric,0),
  coalesce((rowjson->>'total')::numeric,0),coalesce(rowjson->>'estado','Pago'),coalesce((rowjson->>'valorPago')::numeric,0),
  coalesce((rowjson->>'valorEmDivida')::numeric,0),rowjson);
  i:=0;
  if jsonb_typeof(rowjson->'produtos')='array' then
   for item in select value from jsonb_array_elements(rowjson->'produtos') loop
    i:=i+1;
    insert into public.venda_itens(owner_id,venda_id,linha,produto_id,produto,quantidade,preco_unitario,valor_total,extra)
    values(u,vid,i,item->>'id',coalesce(item->>'produto',''),coalesce((item->>'quantidade')::int,1),
    coalesce((item->>'venda')::numeric,0),coalesce((item->>'vendaTotal')::numeric,0),item);
   end loop;
  end if;
  if jsonb_typeof(rowjson->'pagamentos')='array' then
   for item in select value from jsonb_array_elements(rowjson->'pagamentos') loop
    insert into public.pagamentos(owner_id,id,venda_id,valor,data)
    values(u,item->>'id',vid,coalesce((item->>'valor')::numeric,0),coalesce(item->>'data',''));
   end loop;
  end if;
 end loop;
 for rowjson in select value from jsonb_array_elements(mm) loop
  insert into public.movimentos_caixa(owner_id,id,tipo,descricao,valor,data,venda_id,extra)
  values(u,rowjson->>'id',coalesce(rowjson->>'tipo','entrada'),coalesce(rowjson->>'descricao',''),coalesce((rowjson->>'valor')::numeric,0),
  coalesce(rowjson->>'data',''),coalesce(rowjson->>'vendaId',rowjson->>'venda_id'),rowjson);
 end loop;
 insert into public.venda_contadores(owner_id,proximo) values(u,maxseq+1)
 on conflict(owner_id) do update set proximo=greatest(public.venda_contadores.proximo,excluded.proximo);
 return pg_catalog.jsonb_build_object('produtos',jsonb_array_length(pp),'clientes',jsonb_array_length(cc),
 'vendas',jsonb_array_length(vv),'movimentos',jsonb_array_length(mm));
end $$;

revoke all on function public.registar_venda(jsonb,text,text,numeric), public.registar_pagamento_fiado(text,numeric), public.importar_backup_lojix(jsonb) from public,anon;
grant execute on function public.registar_venda(jsonb,text,text,numeric), public.registar_pagamento_fiado(text,numeric), public.importar_backup_lojix(jsonb) to authenticated;
