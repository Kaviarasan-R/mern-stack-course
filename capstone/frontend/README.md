# AI Research Assistant (Frontend)

React (Vite) + axios + react-router-dom + plain CSS

Hooks used: `useState`, `useEffect`, `useContext`, `useRef` only (`useRef` for the hidden file input and auto scroll).

## Setup

1. Start the backend first (`../backend`, runs on `http://localhost:8080`)
2. Copy `.env.example` to `.env` (`VITE_API_URL=http://localhost:8080/api`)
3. `npm install`
4. `npm run dev` → open `http://localhost:5173` (must match `CLIENT_URL` in backend `.env`)

## Folder structure

```
src/
├── api/axios.js              one axios instance (baseURL + withCredentials for the cookie)
├── context/authContext.jsx   createContext()
├── provider/authProvider.jsx user + accessToken state, login/register/logout, token refresh
├── pages/AuthPage.jsx        login + register form
├── pages/ChatPage.jsx        chats (localStorage), RAG / AI Agent switch, send message
├── components/Sidebar.jsx    chat list, documents list, upload PDF, logout
└── components/Message.jsx    one chat bubble (sources for RAG, tools used for Agent)
```

## How auth works

1. **Login** → backend returns `accessToken` (kept in context state) + sets the refresh token as an `httpOnly` cookie
2. **Every protected call** → pass `authHeader` from context: `api.get("/documents", authHeader)` adds `Authorization: Bearer <accessToken>`
3. **Before the access token expires** (15m) → a `setInterval` calls `GET /auth/refresh` every 14 minutes (cookie is sent automatically) and saves the new token
4. **Page reload** → access token is gone from state, so `/auth/refresh` is called on start to restore the user
5. **Logout** → backend deletes the refresh token, frontend clears the user → redirected to `/login`

> If you change `ACCESS_TOKEN_EXPIRES_IN` in the backend, change `REFRESH_EVERY` in `authProvider.jsx` too.

No `useNavigate` needed: `App.jsx` shows `<Navigate to="/chat" />` or `<Navigate to="/login" />` based on `user` from context.

## Chats in localStorage

Saved under `chats_<userId>` (for example `chats_1`), so every user on the same browser sees only their own chats.

```js
[{ id: "1729880000000", title: "What is in my notes?", messages: [{ role: "user", content: "..." }, { role: "assistant", mode: "rag", content: "...", sources: [...] }] }]
```

- `RAG` → `POST /api/chat` (always search documents → answer)
- `AI Agent` → `POST /api/agent` (AI decides which tool to use)

> Chats are only in this browser. Uploaded documents are in the database (per user).
