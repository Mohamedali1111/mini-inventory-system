import "./style.css";
import {
  addStock,
  createProduct,
  createWarehouse,
  getProductInventory,
  listProducts,
  listWarehouses,
  removeStock,
  transferStock,
} from "./api";
import type { Product, Warehouse, ProductInventoryItem } from "./types";

interface State {
  products: Product[];
  warehouses: Warehouse[];
  selectedProductId: string | null;
  productInventory: ProductInventoryItem[];
}

const initialState: State = {
  products: [],
  warehouses: [],
  selectedProductId: null,
  productInventory: [],
};

export function renderApp(root: HTMLDivElement) {
  let state: State = { ...initialState };
  let isLoading = false;
  let error: string | null = null;
  let success: string | null = null;

  async function loadInitialData() {
    try {
      isLoading = true;
      error = null;
      success = null;
      render();

      const [products, warehouses] = await Promise.all([listProducts(), listWarehouses()]);
      state = { ...state, products, warehouses };
      if (!state.selectedProductId && products.length > 0) {
        await selectProduct(products[0].id);
      } else {
        render();
      }
    } catch (e) {
      error = e instanceof Error ? e.message : "Failed to load data";
      render();
    } finally {
      isLoading = false;
      render();
    }
  }

  async function selectProduct(productId: string) {
    try {
      isLoading = true;
      error = null;
      success = null;
      render();

      const inventoryResponse = await getProductInventory(productId);
      state = {
        ...state,
        selectedProductId: productId,
        productInventory: inventoryResponse.inventory,
      };
      render();
    } catch (e) {
      error = e instanceof Error ? e.message : "Failed to load inventory";
      render();
    } finally {
      isLoading = false;
      render();
    }
  }

  async function handleCreateProduct(form: HTMLFormElement) {
    const skuInput = form.elements.namedItem("sku") as HTMLInputElement;
    const nameInput = form.elements.namedItem("name") as HTMLInputElement;
    const descriptionInput = form.elements.namedItem("description") as HTMLInputElement;

    try {
      isLoading = true;
      error = null;
      success = null;
      render();

      const product = await createProduct({
        sku: skuInput.value.trim(),
        name: nameInput.value.trim(),
        description: descriptionInput.value.trim() || undefined,
      });

      state = {
        ...state,
        products: [product, ...state.products],
      };

      skuInput.value = "";
      nameInput.value = "";
      descriptionInput.value = "";

      if (!state.selectedProductId) {
        await selectProduct(product.id);
      } else {
        render();
      }
      success = "Product created";
    } catch (e) {
      error = e instanceof Error ? e.message : "Failed to create product";
      render();
    } finally {
      isLoading = false;
      render();
    }
  }

  async function handleCreateWarehouse(form: HTMLFormElement) {
    const nameInput = form.elements.namedItem("wh-name") as HTMLInputElement;
    const locationInput = form.elements.namedItem("wh-location") as HTMLInputElement;

    try {
      isLoading = true;
      error = null;
      success = null;
      render();

      const warehouse = await createWarehouse({
        name: nameInput.value.trim(),
        location: locationInput.value.trim() || undefined,
      });

      state = {
        ...state,
        warehouses: [warehouse, ...state.warehouses],
      };

      nameInput.value = "";
      locationInput.value = "";
      render();
      success = "Warehouse created";
    } catch (e) {
      error = e instanceof Error ? e.message : "Failed to create warehouse";
      render();
    } finally {
      isLoading = false;
      render();
    }
  }

  async function handleStockAction(
    form: HTMLFormElement,
    type: "add" | "remove" | "transfer",
    context: { productId: string },
  ) {
    const qtyInput = form.elements.namedItem("quantity") as HTMLInputElement;
    const fromWarehouseInput = form.elements.namedItem("fromWarehouseId") as HTMLSelectElement | null;
    const toWarehouseInput = form.elements.namedItem("toWarehouseId") as HTMLSelectElement | null;
    const warehouseInput = form.elements.namedItem("warehouseId") as HTMLSelectElement | null;

    const quantity = Number(qtyInput.value);
    if (!Number.isFinite(quantity) || quantity <= 0) {
      error = "Quantity must be a positive number";
      render();
      return;
    }

    try {
      isLoading = true;
      error = null;
      success = null;
      render();

      if (type === "add" && warehouseInput) {
        await addStock({
          productId: context.productId,
          warehouseId: warehouseInput.value,
          quantity,
        });
      } else if (type === "remove" && warehouseInput) {
        await removeStock({
          productId: context.productId,
          warehouseId: warehouseInput.value,
          quantity,
        });
      } else if (type === "transfer" && fromWarehouseInput && toWarehouseInput) {
        await transferStock({
          productId: context.productId,
          fromWarehouseId: fromWarehouseInput.value,
          toWarehouseId: toWarehouseInput.value,
          quantity,
        });
      }

      qtyInput.value = "";

      if (state.selectedProductId) {
        await selectProduct(state.selectedProductId);
      } else {
        render();
      }
      if (type === "add") {
        success = "Stock added";
      } else if (type === "remove") {
        success = "Stock removed";
      } else {
        success = "Stock transferred";
      }
    } catch (e) {
      error = e instanceof Error ? e.message : "Stock operation failed";
      render();
    } finally {
      isLoading = false;
      render();
    }
  }

  function render() {
    const selectedProduct = state.products.find((p) => p.id === state.selectedProductId) ?? null;

    root.innerHTML = `
      <div class="app">
        <header class="app-header">
          <h1>Mini Inventory System</h1>
          <p class="subtitle">Products, warehouses, and stock operations</p>
        </header>

        <main class="layout">
          <section class="panel">
            <h2>Products</h2>
            <form id="create-product-form" class="form">
              <div class="form-row">
                <label>SKU</label>
                <input name="sku" type="text" required placeholder="e.g. SKU-001" />
              </div>
              <div class="form-row">
                <label>Name</label>
                <input name="name" type="text" required placeholder="Product name" />
              </div>
              <div class="form-row">
                <label>Description</label>
                <input name="description" type="text" placeholder="Optional description" />
              </div>
              <button type="submit">Create product</button>
            </form>

            <ul class="list">
              ${state.products
                .map(
                  (p) => `
                <li class="list-item ${p.id === state.selectedProductId ? "selected" : ""}" data-product-id="${p.id}">
                  <div class="list-item-main">
                    <span class="primary">${p.name}</span>
                    <span class="secondary">SKU: ${p.sku}</span>
                  </div>
                </li>
              `,
                )
                .join("") || "<li class='empty'>No products yet.</li>"}
            </ul>
          </section>

          <section class="panel">
            <h2>Warehouses</h2>
            <form id="create-warehouse-form" class="form">
              <div class="form-row">
                <label>Name</label>
                <input name="wh-name" type="text" required placeholder="e.g. Main Warehouse" />
              </div>
              <div class="form-row">
                <label>Location</label>
                <input name="wh-location" type="text" placeholder="Optional location" />
              </div>
              <button type="submit">Create warehouse</button>
            </form>

            <ul class="list">
              ${state.warehouses
                .map(
                  (w) => `
                <li class="list-item">
                  <div class="list-item-main">
                    <span class="primary">${w.name}</span>
                    <span class="secondary">${w.location ?? ""}</span>
                  </div>
                </li>
              `,
                )
                .join("") || "<li class='empty'>No warehouses yet.</li>"}
            </ul>
          </section>

          <section class="panel">
            <h2>Inventory & Stock</h2>
            ${error ? `<p class="status error inline-error">${error}</p>` : ""}
            ${
              selectedProduct
                ? `
              <div class="inventory-header">
                <h3>${selectedProduct.name}</h3>
                <p class="secondary">SKU: ${selectedProduct.sku}</p>
              </div>
              <div class="inventory-table">
                <div class="inventory-row header">
                  <div>Warehouse</div>
                  <div>Quantity</div>
                </div>
                ${
                  state.productInventory.length > 0
                    ? state.productInventory
                        .map(
                          (inv) => `
                      <div class="inventory-row">
                        <div>${inv.warehouseName}</div>
                        <div>${inv.quantity}</div>
                      </div>
                    `,
                        )
                        .join("")
                    : "<p class='empty'>No stock for this product yet.</p>"
                }
              </div>

              <div class="stock-forms">
                <h3>Add / Remove Stock</h3>
                <form id="stock-change-form" class="form-inline">
                  <select name="warehouseId" required>
                    <option value="">Select warehouse</option>
                    ${state.warehouses
                      .map((w) => `<option value="${w.id}">${w.name}</option>`)
                      .join("")}
                  </select>
                  <input name="quantity" type="number" min="1" placeholder="Quantity" required />
                  <button type="submit" data-action="add">Add</button>
                  <button type="submit" data-action="remove">Remove</button>
                </form>

                <h3>Transfer Stock</h3>
                <form id="stock-transfer-form" class="form-inline">
                  <select name="fromWarehouseId" required>
                    <option value="">From warehouse</option>
                    ${state.warehouses
                      .map((w) => `<option value="${w.id}">${w.name}</option>`)
                      .join("")}
                  </select>
                  <select name="toWarehouseId" required>
                    <option value="">To warehouse</option>
                    ${state.warehouses
                      .map((w) => `<option value="${w.id}">${w.name}</option>`)
                      .join("")}
                  </select>
                  <input name="quantity" type="number" min="1" placeholder="Quantity" required />
                  <button type="submit">Transfer</button>
                </form>
              </div>
            `
                : "<p class='empty'>Select a product to view and manage its inventory.</p>"
            }
          </section>
        </main>

        <footer class="app-footer">
          ${isLoading ? "<span class='status'>Loading...</span>" : ""}
          ${success ? `<span class='status'>${success}</span>` : ""}
        </footer>
      </div>
    `;

    attachEventHandlers();
  }

  function attachEventHandlers() {
    const productForm = document.querySelector<HTMLFormElement>("#create-product-form");
    if (productForm) {
      productForm.onsubmit = (e) => {
        e.preventDefault();
        void handleCreateProduct(productForm);
      };
    }

    const warehouseForm = document.querySelector<HTMLFormElement>("#create-warehouse-form");
    if (warehouseForm) {
      warehouseForm.onsubmit = (e) => {
        e.preventDefault();
        void handleCreateWarehouse(warehouseForm);
      };
    }

    const productItems = Array.from(document.querySelectorAll<HTMLLIElement>(".list-item[data-product-id]"));
    productItems.forEach((item) => {
      item.onclick = () => {
        const productId = item.getAttribute("data-product-id");
        if (productId) {
          void selectProduct(productId);
        }
      };
    });

    const stockChangeForm = document.querySelector<HTMLFormElement>("#stock-change-form");
    if (stockChangeForm && state.selectedProductId) {
      stockChangeForm.onsubmit = (e) => {
        e.preventDefault();
        const submitter = (e as SubmitEvent).submitter as HTMLButtonElement | null;
        const action = submitter?.dataset.action === "remove" ? "remove" : "add";
        void handleStockAction(stockChangeForm, action, { productId: state.selectedProductId! });
      };
    }

    const stockTransferForm = document.querySelector<HTMLFormElement>("#stock-transfer-form");
    if (stockTransferForm && state.selectedProductId) {
      stockTransferForm.onsubmit = (e) => {
        e.preventDefault();
        void handleStockAction(stockTransferForm, "transfer", { productId: state.selectedProductId! });
      };
    }

    const buttons = Array.from(document.querySelectorAll<HTMLButtonElement>("button"));
    buttons.forEach((btn) => {
      btn.disabled = isLoading;
    });
  }

  void loadInitialData();
}

