## Mini Inventory System

A small full-stack inventory management system with multiple warehouses and transactional stock operations.

### Tech stack

- **Backend**: Node.js, TypeScript, Express, Prisma, PostgreSQL
- **Database**: PostgreSQL (via `docker-compose`)
- **Frontend**: (planned) React + TypeScript

### Backend – getting started

1. **Start PostgreSQL (Docker)**

   ```bash
   docker compose up -d db
   ```

2. **Configure environment**

   ```bash
   cd backend
   cp .env.example .env
   # adjust DATABASE_URL if needed
   ```

3. **Install dependencies**

   ```bash
   npm install
   ```

4. **Generate Prisma client and run migrations**

   ```bash
   npm run prisma:generate
   # npm run prisma:migrate -- --name init   # when ready to create the first migration
   ```

5. **Run the API**

   ```bash
   npm run dev
   ```

The API will start on the port from `PORT` (default `4000`).

### Health endpoint

- **Route**: `GET /health`
- **Response example**:

```json
{
  "status": "ok",
  "service": "mini-inventory-backend",
  "timestamp": "2026-02-27T12:00:00.000Z"
}
```

### Notes / assumptions

- The schema uses Prisma models for `Product`, `Warehouse`, `Inventory`, and `StockMovement` (for logging stock changes).
- `Inventory` enforces a unique `(productId, warehouseId)` pair per row.
- `StockMovement` tracks `ADD`, `REMOVE`, and `TRANSFER` operations for auditing.

