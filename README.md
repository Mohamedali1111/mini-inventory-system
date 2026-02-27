## Mini Inventory System

A small full-stack inventory management system with multiple warehouses and transactional stock operations.

### Tech stack

- **Backend**: Node.js, TypeScript, Express, Prisma, PostgreSQL
- **Database**: PostgreSQL (via `docker-compose`)
- **Frontend**: Vite + TypeScript with **vanilla DOM rendering** (no framework needed for this assignment)

The frontend is intentionally implemented without React runtime to keep the bundle small and focus on the inventory flows.

---

### Quick start

From the repository root:

1. **Start PostgreSQL (Docker)**

   ```bash
   docker compose up -d db
   ```

2. **Backend**

   ```bash
   cd backend
   cp .env.example .env
   npm install
   npm run prisma:migrate -- --name init
   npm run dev
   ```

   API will start on `http://localhost:4000`.

3. **Frontend**

   In a separate terminal:

   ```bash
   cd frontend
   cp .env.example .env
   npm install
   npm run dev
   ```

   Then open the URL printed by Vite (typically `http://localhost:5173`).

---

### Environment variables

**Backend (`backend/.env`):**

- `PORT` – API port (default `4000`)
- `DATABASE_URL` – PostgreSQL connection string (matches `docker-compose.yml` by default)
- `LOG_LEVEL` – pino log level (default `info`)

**Frontend (`frontend/.env`):**

- `VITE_API_BASE_URL` – base URL for the backend API (default `http://localhost:4000`)

---

### API overview

**Health**

- `GET /health`  
  Returns `{ status: "ok", service: "mini-inventory-backend", timestamp: ISO_STRING }`.

**Products**

- `GET /api/products` → list products.
- `POST /api/products`

  ```json
  {
    "sku": "SKU-001",
    "name": "Example product",
    "description": "Optional"
  }
  ```

**Warehouses**

- `GET /api/warehouses` → list warehouses.
- `POST /api/warehouses`

  ```json
  {
    "name": "Main Warehouse",
    "location": "Optional location"
  }
  ```

**Inventory**

- `GET /api/products/:productId/inventory`

  ```json
  {
    "product": {
      "id": "prod_id",
      "sku": "SKU-001",
      "name": "Example product"
    },
    "inventory": [
      {
        "warehouseId": "wh_id",
        "warehouseName": "Main Warehouse",
        "quantity": 10
      }
    ]
  }
  ```

**Stock operations** (all executed inside a single database transaction and logged via `StockMovement`):

- `POST /api/stock/add`

  ```json
  {
    "productId": "prod_id",
    "warehouseId": "wh_id",
    "quantity": 5
  }
  ```

- `POST /api/stock/remove`

  ```json
  {
    "productId": "prod_id",
    "warehouseId": "wh_id",
    "quantity": 3
  }
  ```

- `POST /api/stock/transfer`

  ```json
  {
    "productId": "prod_id",
    "fromWarehouseId": "wh_a",
    "toWarehouseId": "wh_b",
    "quantity": 5
  }
  ```

Error responses are normalized:

```json
{
  "success": false,
  "error": {
    "code": "INSUFFICIENT_STOCK",
    "message": "Not enough stock to transfer"
  }
}
```

---

### Design decisions / assumptions

- The schema uses Prisma models for `Product`, `Warehouse`, `Inventory`, and `StockMovement` (for logging stock changes).
- `Inventory` enforces a unique `(productId, warehouseId)` pair per row.
- Products include a unique `sku` field as a human-readable identifier in addition to the internal ID.
- `GET /api/products/:id/inventory` returns **only warehouses that have an `Inventory` row**; warehouses with zero stock are omitted to keep payloads small. This can be extended easily if a “show all with 0” view is required.
- Stock operations (`add`, `remove`, `transfer`) are wrapped in Prisma **transactions** to guarantee consistency.
- To avoid race conditions, `remove` and `transfer` use atomic `updateMany` with a `quantity >= requested` condition; if the update affects `0` rows, the API returns `400 INSUFFICIENT_STOCK`.
- Every stock change creates a `StockMovement` row with `type` = `ADD | REMOVE | TRANSFER` for auditing/history.

---

### Bonus features implemented

- **Stock movement logging** via the `StockMovement` table.
- **Database migrations** checked in via Prisma.
- **Dockerized Postgres** for easy local setup.

