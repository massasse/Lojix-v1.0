import { supabase } from './supabase';

function assert(error) { if (error) throw error; }

async function uid() {
  const { data: { user }, error } = await supabase.auth.getUser();
  assert(error);
  if (!user) throw new Error('A sessão terminou. Inicie sessão novamente.');
  return '00000000-0000-0000-0000-000000000001';
}

// Legacy-compatible objects: the UI remains unchanged while the source is PostgreSQL.
function productFromRow(row) {
  return { ...row.extra, id: /^\d+$/.test(row.id) ? Number(row.id) : row.id,
    produto: row.produto, categoria: row.categoria, categria: row.categoria, marca: row.marca,
    compra: Number(row.compra), venda: Number(row.venda), stock: Number(row.stock) };
}
function customerFromRow(row) {
  return { ...row.extra, id: /^\d+$/.test(row.id) ? Number(row.id) : row.id,
    nome: row.nome, telefone: row.telefone, dataCadastro: row.data_cadastro };
}
function saleFromRow(row, items=[], payments=[]) {
  return { ...row.extra, id: row.id, clienteId: row.cliente_id, cliente: row.cliente,
    vendedor: row.vendedor, tipo: row.tipo, data: row.data, subtotal: Number(row.subtotal),
    desconto: Number(row.desconto), total: Number(row.total), estado: row.estado,
    valorPago: Number(row.valor_pago), valorEmDivida: Number(row.valor_em_divida),
    produtos: items.map(x => ({ ...x.extra, id: /^\d+$/.test(x.produto_id || '') ? Number(x.produto_id) : x.produto_id,
      produto: x.produto, quantidade: x.quantidade, venda: Number(x.preco_unitario), vendaTotal: Number(x.valor_total) })),
    pagamentos: payments.map(p => ({ id: p.id, valor: Number(p.valor), data: p.data })) };
}
function movementFromRow(row) {
  return { ...row.extra, id: row.id, tipo: row.tipo, descricao: row.descricao,
    valor: Number(row.valor), data: row.data, vendaId: row.venda_id ?? row.extra?.vendaId };
}

export async function listarProdutos() {
  const { data, error } = await supabase.from('produtos').select('*').order('produto');
  assert(error); return data.map(productFromRow);
}
export async function criarProduto(produto) {
  const owner_id = await uid();
  // ID de produto gerado para a conta, com repetição de tentativa em caso de concorrência.
  for (let attempt=0; attempt<4; attempt++) {
    const lista = await listarProdutos();
    const id = String(Math.max(0,...lista.map(x=>Number(x.id)||0))+1+attempt);
    const { data, error } = await supabase.from('produtos').insert({owner_id,id,produto:produto.produto,
      categoria:produto.categoria ?? produto.categria ?? '',marca:produto.marca ?? '',
      compra:Number(produto.compra),venda:Number(produto.venda),stock:Number(produto.stock),extra:{}}).select().single();
    if (!error) return productFromRow(data);
    if (error.code!=='23505') throw error;
  }
  throw new Error('Não foi possível atribuir um número ao produto. Tente novamente.');
}
export async function editarProduto(produto) {
  const owner_id=await uid();
  const { data,error }=await supabase.from('produtos').update({produto:produto.produto,
    categoria:produto.categria ?? produto.categoria ?? '',marca:produto.marca ?? '',
    compra:Number(produto.compra),venda:Number(produto.venda),stock:Number(produto.stock)})
    .eq('owner_id',owner_id).eq('id',String(produto.id)).select().single();
  assert(error);return productFromRow(data);
}
export async function apagarProduto(id) {
  const owner_id=await uid();
  const {error}=await supabase.from('produtos').delete().eq('owner_id',owner_id).eq('id',String(id));assert(error);
}
export async function listarClientes() {
  const {data,error}=await supabase.from('clientes').select('*').order('nome');assert(error);return data.map(customerFromRow);
}
export async function criarCliente(cliente) {
  const owner_id=await uid();
  for(let attempt=0;attempt<4;attempt++) {
    const lista=await listarClientes();
    const id=String(Math.max(0,...lista.map(x=>Number(x.id)||0))+1+attempt);
    const {data,error}=await supabase.from('clientes').insert({owner_id,id,nome:cliente.nome,telefone:cliente.telefone,
      data_cadastro:new Date().toISOString(),extra:{}}).select().single();
    if(!error)return customerFromRow(data);
    if(error.code!=='23505')throw error;
  }
  throw new Error('Não foi possível numerar o cliente.');
}
export async function editarCliente(cliente) {
  const owner_id=await uid();
  const {data,error}=await supabase.from('clientes').update({nome:cliente.nome,telefone:cliente.telefone})
    .eq('owner_id',owner_id).eq('id',String(cliente.id)).select().single();assert(error);return customerFromRow(data);
}
export async function apagarCliente(cliente) {
  const owner_id=await uid();
  const {error}=await supabase.from('clientes').delete().eq('owner_id',owner_id).eq('id',String(cliente.id));assert(error);
}
export async function listarVendas() {
  const [{data: rows,error},{data: items,error:itemError},{data: payments,error:payError}] = await Promise.all([
    supabase.from('vendas').select('*').order('created_at',{ascending:false}).limit(5000),
    supabase.from('venda_itens').select('*').limit(10000),
    supabase.from('pagamentos').select('*').limit(10000)
  ]);
  assert(error);assert(itemError);assert(payError);
  const itemsById=new Map(),paymentsById=new Map();
  for(const it of items){const a=itemsById.get(it.venda_id)||[];a.push(it);itemsById.set(it.venda_id,a)}
  for(const p of payments){const a=paymentsById.get(p.venda_id)||[];a.push(p);paymentsById.set(p.venda_id,a)}
  return rows.map(row=>saleFromRow(row,(itemsById.get(row.id)||[]).sort((a,b)=>a.linha-b.linha),paymentsById.get(row.id)||[]));
}
export async function registarVenda({itens,clienteId,tipo,desconto}) {
  const {data,error}=await supabase.rpc('registar_venda',{
    p_itens:itens.map(p=>({id:String(p.id),quantidade:Number(p.quantidade)})),
    p_cliente_id:clienteId,p_tipo:tipo,p_desconto:Number(desconto)||0
  });assert(error);return data;
}
export async function pagarFiado(vendaId,valor) {
  const {data,error}=await supabase.rpc('registar_pagamento_fiado',{
    p_venda_id:String(vendaId),p_valor:Number(valor)
  });assert(error);return data;
}
export async function listarMovimentos() {
  const {data,error}=await supabase.from('movimentos_caixa').select('*').limit(10000);assert(error);
  return data.map(movementFromRow);
}
export async function guardarMovimento(m) {
  const owner_id=await uid();
  const {data,error}=await supabase.from('movimentos_caixa').upsert({
    owner_id,id:String(m.id),tipo:m.tipo,descricao:m.descricao ?? '',valor:Number(m.valor),
    data:m.data ?? new Date().toISOString(),venda_id:m.vendaId ?? null,
    extra:Object.fromEntries(Object.entries(m).filter(([k])=>!['id','tipo','descricao','valor','data','vendaId'].includes(k)))
  },{onConflict:'owner_id,id'}).select().single();assert(error);return movementFromRow(data);
}
