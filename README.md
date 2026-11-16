# LOJIX — React + Supabase

Aplicação de gestão de loja com React, Vite e Supabase.

## Configuração

1. Copie `.env.example` para `.env.local`.
2. Preencha `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` com a URL e a publishable key do projecto Supabase.
3. Execute `npm install` e `npm run dev`.

## Utilizadores

A aplicação disponibiliza apenas **Iniciar sessão**. Não existe registo público. O administrador cria os utilizadores em Supabase Dashboard → Authentication → Users. O username é guardado na coluna `public.perfis.username`; ao criar o utilizador, informe `username` nos metadados do utilizador. Não se utiliza a parte do email antes de `@` como nome.

## Dados partilhados

O LOJIX está configurado para uma única loja: todos os utilizadores autenticados acedem ao mesmo catálogo, clientes, vendas, fiados e caixa. A autenticação continua obrigatória e as tabelas têm RLS.

Para um projecto Supabase novo, aplique primeiro `supabase/lojix_schema.sql` e depois `supabase/20261116_shared_store.sql`. O projecto actualmente ligado já recebeu as alterações de modo partilhado.
