# Furniture Frontend

React/Vite frontend wired to the Django backend in `D:\furniture`.

## What is connected

- Catalog list: `GET /api/catalog/products/`
- Categories: `GET /api/catalog/categories/`
- Product details and views tracking: `GET /api/catalog/products/{slug}/`
- Context-aware chat start: `POST /api/chat/start/`
- Chat WebSocket: `/ws/chat/{conversation_id}/`
- Guest checkout: `POST /api/orders/`
- Abandoned cart fallback: `POST /api/orders/abandoned/`
- Order tracking: `GET /api/orders/track/{order_number}/`

## Run backend

From `D:\furniture`, install the backend requirements in a virtual environment first:

```powershell
cd D:\furniture
py -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
py manage.py migrate
py manage.py runserver 127.0.0.1:8000
```

If PowerShell blocks activation, run:

```powershell
Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
```

## Run frontend

From `D:\furniture-frontend`:

```powershell
cd D:\furniture-frontend
$env:Path = "C:\Program Files\nodejs;$env:Path"
& "C:\Program Files\nodejs\npm.cmd" run dev -- --host 127.0.0.1 --port 5173
```

Open:

```text
http://127.0.0.1:5173/
```

In development, Vite proxies `/api` and `/ws` to `http://127.0.0.1:8000`.

## Environment

Copy `.env.example` if you need to change the backend URL:

```powershell
Copy-Item .env.example .env.local
```

Then edit:

```text
VITE_BACKEND_URL=http://127.0.0.1:8000
```

Leave `VITE_API_BASE_URL` empty during local development so requests go through the Vite proxy.
