export interface Product {
  id: string;
  sku: string;
  name: string;
  description?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Warehouse {
  id: string;
  name: string;
  location?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProductInventoryItem {
  warehouseId: string;
  warehouseName: string;
  quantity: number;
}

export interface ProductInventoryResponse {
  product: {
    id: string;
    sku: string;
    name: string;
  };
  inventory: ProductInventoryItem[];
}

