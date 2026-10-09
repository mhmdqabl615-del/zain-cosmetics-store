import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { addCartItem, loadCart, saveCart } from "./cart-storage.js";

const moneyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "EGP",
});
const message = document.querySelector(".product-detail-message");
const details = document.querySelector(".product-detail");
const bagCount = document.querySelector(".product-detail-bag .bag-count");
const bagButton = document.querySelector(".product-detail-bag");
const addButton = document.querySelector(".product-detail-add");
const cartStatus = document.querySelector(".product-detail-cart-status");
let cart = loadCart();
let product;

function updateBagCount() {
  const quantity = Array.from(cart.values()).reduce((total, item) => total + item.quantity, 0);
  bagCount.textContent = String(quantity);
  bagButton.setAttribute(
    "aria-label",
    `Shopping bag, ${quantity} ${quantity === 1 ? "item" : "items"}`,
  );
}

function showMessage(text) {
  message.textContent = text;
  message.hidden = false;
  details.hidden = true;
}

async function loadProduct() {
  const productId = new URLSearchParams(window.location.search).get("id");
  if (!productId) {
    showMessage("This product could not be found.");
    return;
  }

  const configuration = window.ZAIN_SUPABASE_CONFIG;
  if (!configuration?.url || !configuration?.anonKey) {
    showMessage("Product details are temporarily unavailable.");
    console.error("Supabase is not configured for the product details page.");
    return;
  }

  try {
    const endpoint = new URL(configuration.url);
    if (endpoint.protocol !== "https:" || !endpoint.hostname.endsWith(".supabase.co")) {
      throw new Error("The published Supabase URL is invalid.");
    }

    const supabase = createClient(configuration.url, configuration.anonKey);
    const { data, error } = await supabase
      .from("products")
      .select("id,name,description,price,category,image_url,stock")
      .eq("id", productId)
      .eq("is_active", true)
      .maybeSingle();

    if (error) throw error;
    if (!data) {
      showMessage("This product is no longer available.");
      return;
    }
    product = data;

    const visual = details.querySelector(".product-detail-visual");
    if (product.image_url) {
      const photo = document.createElement("img");
      photo.className = "live-product-photo";
      photo.src = product.image_url;
      photo.alt = product.name;
      photo.onerror = () => photo.remove();
      visual.append(photo);
    }

    details.querySelector(".product-detail-category").textContent = product.category || "";
    details.querySelector("h1").textContent = product.name;
    details.querySelector(".product-detail-price").textContent = moneyFormatter.format(
      Number(product.price) || 0,
    );
    details.querySelector(".product-detail-description").textContent = product.description || "";
    details.querySelector(".product-detail-stock").textContent = Number(product.stock) < 1
      ? "Currently out of stock"
      : "In stock";
    addButton.disabled = Number(product.stock) < 1;
    addButton.textContent = Number(product.stock) < 1 ? "Out of stock" : "Add to bag";
    document.title = `${product.name} — ZAIN COSMETICS`;
    message.hidden = true;
    details.hidden = false;
    updateBagCount();
  } catch (error) {
    console.error("Unable to retrieve product details.", error);
    showMessage("Product details are temporarily unavailable. Please try again later.");
  }
}

addButton.addEventListener("click", () => {
  if (!product || !addCartItem(cart, product)) {
    cartStatus.textContent = "This product is currently unavailable.";
    addButton.disabled = true;
    return;
  }

  saveCart(cart);
  updateBagCount();
  cartStatus.textContent = `${product.name} added to your bag.`;
});

window.addEventListener("pageshow", () => {
  cart = loadCart();
  updateBagCount();
});

loadProduct();
