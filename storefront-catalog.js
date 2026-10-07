import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
  grid.replaceChildren();
  grid.classList.add("product-grid-live");
  notice.hidden = products.length > 0;
  notice.textContent = products.length ? "" : "لا توجد منتجات متاحة للشراء في الوقت الحالي.";

  products.forEach((product) => {
    const card = createElement("article", "product-card");
    const visual = createElement("div", "product-image product-image-live");
    if (product.image_url) {
      const photo = createElement("img", "live-product-photo");
      photo.src = product.image_url;
      photo.alt = product.name;
      photo.loading = "lazy";
      photo.onerror = () => photo.remove();
      visual.append(photo);
    }

    const artwork = createElement("div", "live-product-art");
    artwork.append(
      createElement("span", "", "ZAIN COSMETICS"),
      createElement("strong", "", product.name),
    );
    if (product.category) artwork.append(createElement("small", "", product.category));
    visual.append(artwork);

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
    info.append(details, createElement("span", "", `$${Number(product.price).toFixed(2)}`));
    card.append(visual, info);
    grid.append(card);
  });
}

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
