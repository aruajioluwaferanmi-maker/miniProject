const cartItems = new Map();

export function addToCart(productId, quantity = 1) {
  const safeQuantity = Number.isFinite(quantity) && quantity > 0 ? Math.floor(quantity) : 1;
  const currentQuantity = cartItems.get(productId) || 0;
  cartItems.set(productId, currentQuantity + safeQuantity);
}

export function removeFromCart(productId) {
  cartItems.delete(productId);
}

export function listCartItems() {
  return Array.from(cartItems.entries()).map(([productId, quantity]) => ({
    productId,
    quantity,
  }));
}

export function clearCart() {
  cartItems.clear();
}
