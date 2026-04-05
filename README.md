# E-Sports Leaderboard (Next.js)

Aplicação fullstack com **Next.js (App Router)** para gerenciar uma leaderboard com os campos:

- nome
- vitórias
- KD
- score
- partidas

## Funcionalidades

- Adicionar registros
- Editar registros
- Remover registros
- Persistência no servidor via arquivo JSON (`data/leaderboard.json`)
- Ordenação automática por:
  1. vitórias (desc)
  2. KD (desc)
  3. score (desc)
  4. partidas (desc)

## Rodando localmente

```bash
npm install
npm run dev
```

Abra: `http://localhost:3000`

## API

- `GET /api/players` → lista jogadores/time
- `POST /api/players` → cria registro
- `PUT /api/players` → atualiza registro (enviar `id`)
- `DELETE /api/players` → remove registro (enviar `id`)

## Deploy na Vercel

A aplicação está pronta para deploy em Vercel. Contudo, como a persistência padrão está em arquivo local, em ambientes serverless essa escrita pode não ser durável entre reinícios/instâncias.

Para produção real na Vercel, troque a camada de persistência para um banco gerenciado (ex.: Vercel Postgres, Neon, Supabase, PlanetScale).
