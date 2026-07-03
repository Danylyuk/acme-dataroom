# Acme Corp. Data Room

Захищений файловий менеджер — take-home для Tailored Tech. Кілька ізольованих
«сейфів» (Data Rooms), у кожному — дерево папок і PDF-файлів з повним CRUD,
опційним шифруванням at-rest і справжнім auth-бекендом.

**🔗 Демо:** https://acmecorp.deepcloud.space

## Стек

- **Frontend:** Vite + React 19 + TypeScript, Tailwind + shadcn/ui (Radix),
  TanStack Query + Router.
- **Сховище (клієнт):** Dexie / IndexedDB — і метадані, і PDF-блоби.
- **Шифрування:** Web Crypto (SubtleCrypto) — AES-256-GCM, схема DEK/KEK.
- **Backend (auth):** Express + bcrypt + JWT + Zod, JSON-файл як сховище.
- **Сторонні сервіси:** Google Identity (логін), Resend (коди підтвердження),
  Cloudflare Turnstile (анти-бот).

## Ключові рішення

- **Плоске дерево.** Вузли зберігаються списком з `parentId`, а не вкладеним JSON —
  move/rename/delete = зміна одного поля; дерево збирається в памʼяті. Корінь
  позначено `parentId === dataroomId` (IndexedDB не індексує `null` як ключ).
- **Storage за API-шаром.** UI ходить лише через `hooks/queries.ts` → `db/api.ts`.
  Заміна Dexie на реальний бекенд не зачіпає жодного компонента.
- **Справжнє шифрування.** Пароль → PBKDF2(210k) → KEK, яким розгортається
  wrappedDEK; самим DEK шифрується вміст. Пароль і DEK ніде не зберігаються —
  DEK живе тільки в памʼяті сесії. Невірний пароль відсікається GCM-тегом, не рядком.
- **Два рівні** (ТЗ каже «Datarooms», множина): список сейфів → файловий менеджер
  усередині кожного.
- **Auth понад ТЗ.** Реєстрація email+пароль з підтвердженням коду, Turnstile
  валідується на сервері, паролі — bcrypt, сесія — JWT (7 днів).

Докладніше про модель даних, UX-рішення й AI-workflow — в історії комітів.

## Запуск

```bash
# Frontend
npm install
npm run dev            # http://localhost:3000

# Backend (auth)
cd server && npm install
npm run dev            # http://localhost:8787
```

Без ключів працює dev-режим: код підтвердження друкується в консоль сервера,
Turnstile пропускається. Прод-збірка фронта: `npm run build` → `dist/`.

## Тести

```bash
npm test               # web + server
npm run test:web       # crypto, api (конфлікти/піддерево/move), isStrongPassword
npm run test:server    # auth happy-path (register → verify → login)
```

Vitest, ~20 влучних тестів на ядро (не на 100% покриття).

## Env

**Frontend** (`.env`, усі опційні):

```
VITE_API_URL=http://localhost:8787        # бекенд auth
VITE_GOOGLE_CLIENT_ID=<OAuth Client ID>   # Google-логін
VITE_TURNSTILE_SITE_KEY=<Turnstile site key>
```

**Backend** — див. `server/.env.example`: `RESEND_API_KEY`, `TURNSTILE_SECRET`,
`JWT_SECRET`, `MAIL_FROM`, `CORS_ORIGIN`.
