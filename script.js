const bagCount = document.querySelector(".bag-count");
const bagButton = document.querySelector(".bag-button");
const toast = document.querySelector(".toast");
const cartDrawer = document.querySelector(".cart-drawer");
const cartBackdrop = document.querySelector(".cart-backdrop");
const cartItems = document.querySelector(".cart-items");
const cartEmpty = document.querySelector(".cart-empty");
const cartSubtotal = document.querySelector(".cart-subtotal");
const cartShipping = document.querySelector(".cart-shipping");
const cartShippingNote = document.querySelector(".cart-shipping-note");
const cartItemCount = document.querySelector(".cart-item-count");
const checkoutButton = document.querySelector(".checkout-button");
const cart = new Map();
const freeShippingThreshold = 50;
let toastTimer;

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => toast.classList.remove("show"), 2400);
}

function renderCart() {
  const items = Array.from(cart.values());
  const quantity = items.reduce((total, item) => total + item.quantity, 0);
  const subtotal = items.reduce((total, item) => total + item.price * item.quantity, 0);
  const shipping = subtotal >= freeShippingThreshold || subtotal === 0 ? 0 : 5;

  bagCount.textContent = String(quantity);
  bagButton.setAttribute("aria-label", `Shopping bag, ${quantity} ${quantity === 1 ? "item" : "items"}`);
  cartItemCount.textContent = `(${quantity})`;
  cartItems.replaceChildren();
  cartEmpty.hidden = items.length > 0;
  checkoutButton.disabled = items.length === 0;
  cartSubtotal.textContent = `$${subtotal.toFixed(2)}`;
  cartShipping.textContent = shipping === 0 ? "Free" : `$${shipping.toFixed(2)}`;
  cartShippingNote.textContent = subtotal >= freeShippingThreshold
    ? "Lovely — your order ships free!"
    : `You're $${(freeShippingThreshold - subtotal).toFixed(2)} away from free shipping.`;

  items.forEach((item) => {
    const row = document.createElement("li");
    row.className = "cart-item";

    const details = document.createElement("div");
    details.className = "cart-item-details";
    const name = document.createElement("strong");
    name.textContent = item.name;
    const price = document.createElement("span");
    price.textContent = `$${item.price.toFixed(2)}`;
    details.append(name, price);

    const controls = document.createElement("div");
    controls.className = "quantity-controls";
    const decrease = document.createElement("button");
    decrease.type = "button";
    decrease.dataset.action = "decrease";
    decrease.dataset.product = item.name;
    decrease.setAttribute("aria-label", `Remove one ${item.name}`);
    decrease.textContent = "−";
    const count = document.createElement("span");
    count.textContent = String(item.quantity);
    const increase = document.createElement("button");
    increase.type = "button";
    increase.dataset.action = "increase";
    increase.dataset.product = item.name;
    increase.setAttribute("aria-label", `Add one ${item.name}`);
    increase.textContent = "+";
    controls.append(decrease, count, increase);

    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "remove-item";
    remove.dataset.action = "remove";
    remove.dataset.product = item.name;
    remove.textContent = "Remove";
    row.append(details, controls, remove);
    cartItems.append(row);
  });
}

function openCart() {
  cartDrawer.hidden = false;
  cartBackdrop.hidden = false;
  bagButton.setAttribute("aria-expanded", "true");
  document.querySelector(".cart-close").focus();
}

function closeCart() {
  cartDrawer.hidden = true;
  cartBackdrop.hidden = true;
  bagButton.setAttribute("aria-expanded", "false");
  bagButton.focus();
}

document.querySelectorAll(".quick-add").forEach((button) => {
  button.addEventListener("click", () => {
    const name = button.dataset.product;
    const price = Number(button.dataset.price);
    const item = cart.get(name);
    cart.set(name, { name, price, quantity: (item?.quantity ?? 0) + 1 });
    renderCart();
    showToast(`${name} added to your bag`);
  });
});

bagButton.addEventListener("click", openCart);
document.querySelector(".cart-close").addEventListener("click", closeCart);
cartBackdrop.addEventListener("click", closeCart);
cartItems.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-action]");
  if (!button) return;

  const item = cart.get(button.dataset.product);
  if (!item) return;
  if (button.dataset.action === "remove" || (button.dataset.action === "decrease" && item.quantity === 1)) {
    cart.delete(item.name);
  } else if (button.dataset.action === "decrease") {
    item.quantity -= 1;
  } else if (button.dataset.action === "increase") {
    item.quantity += 1;
  }
  renderCart();
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !cartDrawer.hidden) closeCart();
});

checkoutButton.addEventListener("click", () => {
  showToast("Checkout isn't connected in this preview just yet.");
});

document.querySelector(".newsletter-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  if (!form.reportValidity()) return;
  document.querySelector(".form-message").textContent = "You're on the list — keep an eye on your inbox!";
  form.reset();
});

renderCart();
