export const cartStorageKey = "zain-store-cart";

export function loadCart() {
  try {
    const storedItems = JSON.parse(localStorage.getItem(cartStorageKey) || "[]");
    if (!Array.isArray(storedItems)) {
      throw new TypeError("Saved cart data is not a list.");
    }

    const items = new Map();
    storedItems.forEach((item) => {
      if (
        !item ||
        typeof item.id !== "string" ||
        !item.id ||
        typeof item.name !== "string" ||
        !Number.isFinite(item.price) ||
        item.price < 0 ||
        !Number.isSafeInteger(item.maxStock) ||
        item.maxStock < 0 ||
        !Number.isSafeInteger(item.quantity) ||
        item.quantity < 1 ||
        item.quantity > item.maxStock
      ) {
        console.warn("Ignoring invalid saved cart item.", item);
        return;
      }

      items.set(item.id, item);
    });
    return items;
  } catch (error) {
    console.error("Unable to restore the saved shopping bag.", error);
    return new Map();
  }
}

export function saveCart(cart) {
  try {
    localStorage.setItem(cartStorageKey, JSON.stringify(Array.from(cart.values())));
  } catch (error) {
    console.error("Unable to save the shopping bag.", error);
  }
}

export function addCartItem(cart, product) {
  const stock = Number(product.stock);
  const item = cart.get(product.id);
  if (!Number.isSafeInteger(stock) || stock < 1 || (item && item.quantity >= stock)) {
    return false;
  }

  cart.set(product.id, {
    id: product.id,
    name: product.name,
    price: Number(product.price),
    maxStock: stock,
    quantity: (item?.quantity ?? 0) + 1,
  });
  return true;
}
