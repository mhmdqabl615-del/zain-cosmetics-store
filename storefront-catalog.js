import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const moneyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "EGP",
});

function formatMoney(value) {
  return moneyFormatter.format(Number(value) || 0);
}

function showCatalogError(message) {
  const notice = document.querySelector(".catalog-feedback");
  notice.textContent = message;
  notice.hidden = false;
  document.querySelector(".product-grid").replaceChildren();
}

function createElement(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text) element.textContent = text;
  return element;
}

function renderProducts(products) {
  const grid = document.querySelector(".product-grid");
  const notice = document.querySelector(".catalog-feedback");
  const filters = document.querySelector(".store-category-filters");
  grid.replaceChildren();
  grid.classList.add("product-grid-live");
  notice.hidden = products.length > 0;
  notice.textContent = products.length ? "" : "لا توجد منتجات متاحة للشراء في الوقت الحالي.";
  filters.replaceChildren();
  filters.hidden = products.length === 0;

  if (products.length) {
    const categories = [
      "الكل",
      ...new Set(products.map((product) => product.category.trim()).filter(Boolean)),
    ];
    categories.forEach((category, index) => {
      const button = createElement("button", "category-filter", category);
      button.type = "button";
      button.dataset.category = index === 0 ? "" : category;
      button.setAttribute("aria-pressed", index === 0 ? "true" : "false");
      filters.append(button);
    });
  }

  products.forEach((product) => {
    const card = createElement("article", "product-card");
    card.dataset.category = product.category.trim();
    const visual = createElement("div", "product-image product-image-live");
    if (product.image_url) {
      const photo = createElement("img", "live-product-photo");
      photo.src = product.image_url;
      photo.alt = product.name;
      photo.loading = "lazy";
      photo.onerror = () => photo.remove();
      visual.append(photo);
    }

    if (Number(product.stock) < 1) {
      visual.append(createElement("span", "product-tag", "Sold out"));
    } else if (product.featured) {
      visual.append(createElement("span", "product-tag", "Featured"));
    }

    const add = createElement("button", "quick-add", "+");
    add.type = "button";
    add.dataset.productId = product.id;
    add.dataset.product = product.name;
    add.dataset.price = String(product.price);
    add.dataset.stock = String(product.stock);
    add.disabled = Number(product.stock) < 1;
    add.setAttribute(
      "aria-label",
      `${Number(product.stock) < 1 ? "Unavailable" : "Add"} ${product.name} to bag`,
    );
    visual.append(add);

    const info = createElement("div", "product-info");
    const details = document.createElement("div");
    details.append(
      createElement("h3", "", product.name),
      createElement("p", "", product.description || product.category),
    );
    info.append(details, createElement("span", "", formatMoney(product.price)));
    card.append(visual, info);
    grid.append(card);
  });
}

document.querySelector(".store-category-filters").addEventListener("click", (event) => {
  const button = event.target.closest("button[data-category]");
  if (!button) return;

  const category = button.dataset.category;
  document.querySelectorAll(".store-category-filters button").forEach((filter) => {
    filter.setAttribute("aria-pressed", String(filter === button));
  });
  document.querySelectorAll(".product-card[data-category]").forEach((card) => {
    card.hidden = Boolean(category) && card.dataset.category !== category;
  });
});

const configuration = window.ZAIN_SUPABASE_CONFIG;
if (configuration?.url && configuration?.anonKey) {
  try {
    const endpoint = new URL(configuration.url);
    if (endpoint.protocol !== "https:" || !endpoint.hostname.endsWith(".supabase.co")) {
      throw new Error("رابط Supabase المنشور غير صالح.");
    }

    const supabase = createClient(configuration.url, configuration.anonKey);
    const { data, error } = await supabase
      .from("products")
      .select("id,name,description,price,category,image_url,stock,featured")
      .eq("is_active", true)
      .order("featured", { ascending: false })
      .order("created_at", { ascending: false });

    if (error) throw error;
    renderProducts(data || []);
  } catch (error) {
    console.error("Unable to retrieve the live cosmetics catalog.", error);
    showCatalogError("تعذّر تحميل قائمة المنتجات. تحققي من اتصالك وحاولي مرة أخرى.");
  }
}
