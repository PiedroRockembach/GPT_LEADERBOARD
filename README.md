# E-Sports Leaderboard (Next.js)

Aplicação fullstack com **Next.js (App Router)** para gerenciar uma leaderboard com os campos:

- nome
- vitórias
- kills
- deaths
- KD calculado automaticamente
- partidas

## Funcionalidades

- Adicionar registros
- Editar registros
- Remover registros
- Persistência no servidor via **Neon**
- Ordenação automática por:
  1. vitórias (desc)
  2. KD calculado por `kills / deaths` (desc)
  3. partidas (desc)

## Rodando localmente

```bash
npm install
npm run dev
```

Abra: `http://localhost:3000`

## Banco de dados

Este projeto agora usa **Neon** diretamente. Crie um banco no Neon e copie a string de conexão para `DATABASE_URL`.

Para rodar localmente, crie um arquivo `.env.local` com:

```bash
DATABASE_URL="postgresql://USER:PASSWORD@HOST/DB?sslmode=require"
```

No deploy na Vercel, adicione a mesma variável em Environment Variables.

## API

- `GET /api/players` → lista jogadores/time
- `POST /api/players` → cria registro
- `PUT /api/players` → atualiza registro (enviar `id`)
- `DELETE /api/players` → remove registro (enviar `id`)

## Deploy na Vercel

Depois de configurar `DATABASE_URL`, o endpoint `/api/players` passa a persistir os dados no Neon e funciona normalmente em ambiente serverless.

Se o banco estiver vazio na primeira execução, o projeto cria a tabela `leaderboard_players` e insere alguns jogadores iniciais automaticamente.
