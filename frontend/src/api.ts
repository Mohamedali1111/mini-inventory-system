import type { Product, Warehouse, ProductInventoryResponse } from "./types";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4000";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(options?.headers ?? {}),
    },
    ...options,
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const message =
      (data && data.error && typeof data.error.message === "string" && data.error.message) ||
      `Request failed with status ${response.status}`;
    throw new Error(message);
  }

  return data.data as T;
}

export function listProducts() {
  return request<Product[]>("/api/products");
}

export function createProduct(payload: { sku: string; name: string; description?: string }) {
  return request<Product>("/api/products", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function listWarehouses() {
  return request<Warehouse[]>("/api/warehouses");
}

export function createWarehouse(payload: { name: string; location?: string }) {
  return request<Warehouse>("/api/warehouses", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function getProductInventory(productId: string) {
  return request<ProductInventoryResponse>(`/api/products/${productId}/inventory`);
}

export function addStock(payload: { productId: string; warehouseId: string; quantity: number }) {
  return request("/api/stock/add", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function removeStock(payload: { productId: string; warehouseId: string; quantity: number }) {
  return request("/api/stock/remove", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function transferStock(payload: {
  productId: string;
  fromWarehouseId: string;
  toWarehouseId: string;
  quantity: number;
}) {
  return request("/api/stock/transfer", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

