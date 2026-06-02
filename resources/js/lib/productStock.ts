type ProductRow = Record<string, unknown>;

export type ProductStockAlert = {
  productName: string;
  stockRemaining: number;
  minStock: number;
  atMinimum: boolean;
  belowMinimum: boolean;
};

export function evaluateProductStockAlert(product: ProductRow | null | undefined, quantity: number): ProductStockAlert | null {
  if (!product) return null;
  const minRaw = product.min_stock;
  if (minRaw === null || minRaw === undefined || minRaw === "") return null;
  const minStock = Number(minRaw);
  if (Number.isNaN(minStock) || minStock < 0) return null;
  const currentStock = Number(product.stock ?? 0);
  const qty = Number(quantity || 0);
  const stockRemaining = Math.round((currentStock - qty) * 1000) / 1000;
  if (stockRemaining > minStock) return null;
  return {
    productName: String(product.name ?? "Producto"),
    stockRemaining,
    minStock,
    atMinimum: stockRemaining === minStock,
    belowMinimum: stockRemaining < minStock,
  };
}

export function stockAlertMessage(alert: ProductStockAlert | Record<string, unknown>): string {
  const productName = String(alert.productName ?? "Producto");
  const stockRemaining = Number(alert.stockRemaining ?? 0);
  const minStock = Number(alert.minStock ?? 0);
  const belowMinimum = Boolean(alert.belowMinimum ?? stockRemaining < minStock);
  if (belowMinimum) {
    return `${productName}: quedarán ${stockRemaining} u. (mínimo ${minStock}). Reponer stock.`;
  }
  return `${productName} llegó al stock mínimo (${minStock} u.).`;
}

export function lowStockProductsMessage(products: ProductRow[]): string | null {
  if (products.length === 0) return null;
  const names = products.slice(0, 4).map((item) => String(item.name ?? item.product_name ?? "Producto"));
  const suffix = products.length > 4 ? ` y ${products.length - 4} más` : "";
  return `Stock mínimo: ${names.join(", ")}${suffix}.`;
}
