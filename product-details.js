import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const moneyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "EGP",
});
const message = document.querySelector(".product-detail-message");
const details = document.querySelector(".product-detail");

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
    const { data: product, error } = await supabase
      .from("products")
      .select("id,name,description,price,category,image_url,stock")
      .eq("id", productId)
      .eq("is_active", true)
      .maybeSingle();

    if (error) throw error;
    if (!product) {
      showMessage("This product is no longer available.");
      return;
    }

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
    document.title = `${product.name} — ZAIN COSMETICS`;
    message.hidden = true;
    details.hidden = false;
  } catch (error) {
    console.error("Unable to retrieve product details.", error);
    showMessage("Product details are temporarily unavailable. Please try again later.");
  }
}

loadProduct();
