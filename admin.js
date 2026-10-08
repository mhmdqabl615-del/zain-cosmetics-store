const connectionScreen = document.querySelector("#connection-screen");
const loginScreen = document.querySelector("#login-screen");
const passwordScreen = document.querySelector("#password-screen");
const dashboardScreen = document.querySelector("#dashboard-screen");
const loginMessage = document.querySelector("#login-message");
const connectionMessage = document.querySelector("#connection-message");
const passwordMessage = document.querySelector("#password-message");
const dashboardMessage = document.querySelector("#dashboard-message");
const toast = document.querySelector("#admin-toast");
const productDialog = document.querySelector("#product-dialog");
const orderDialog = document.querySelector("#order-dialog");
const productForm = document.querySelector("#product-form");
const orderForm = document.querySelector("#order-form");
const editorStorageKey = "zain-admin-supabase-config";
const moneyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});
const statusLabels = {
  pending: "بانتظار التأكيد",
  confirmed: "مؤكد",
  fulfilled: "مكتمل",
  cancelled: "ملغى",
};
const statusClasses = {
  pending: "",
  confirmed: "status-confirmed",
  fulfilled: "status-fulfilled",
  cancelled: "status-cancelled",
};

let supabase = null;
let signedInUser = null;
let products = [];
let orders = [];
let toastTimer = 0;

function getConfiguredCredentials() {
  let saved = {};
  try {
    saved = JSON.parse(localStorage.getItem(editorStorageKey) || "{}");
  } catch (error) {
    console.error("Unable to read this browser's saved Supabase settings.", error);
  }
  const source = saved && typeof saved === "object" ? saved : {};
  const published = window.ZAIN_SUPABASE_CONFIG || {};
  return {
    url: String(source.url || published.url || "").trim(),
    anonKey: String(source.anonKey || published.anonKey || "").trim(),
  };
}

function isValidProjectUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname.endsWith(".supabase.co");
  } catch {
    return false;
  }
}

function showScreen(screen) {
  connectionScreen.hidden = screen !== "connection";
  loginScreen.hidden = screen !== "login";
  passwordScreen.hidden = screen !== "password";
  dashboardScreen.hidden = screen !== "dashboard";
}

function showLoginMessage(message) {
  loginMessage.textContent = message;
}

function showDashboardMessage(message) {
  dashboardMessage.textContent = message;
  window.clearTimeout(showDashboardMessage.timer);
  showDashboardMessage.timer = window.setTimeout(() => {
    dashboardMessage.textContent = "";
  }, 6000);
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => toast.classList.remove("show"), 2400);
}

function formatMoney(value) {
  return moneyFormatter.format(Number(value) || 0);
}

function formatDate(value) {
  return new Intl.DateTimeFormat("ar", { dateStyle: "medium" }).format(new Date(value));
}

function addTextCell(row, text) {
  const cell = document.createElement("td");
  cell.textContent = String(text ?? "");
  row.append(cell);
  return cell;
}

function makeButton(label, action, id, className = "row-action") {
  const button = document.createElement("button");
  button.type = "button";
  button.textContent = label;
  button.dataset.action = action;
  button.dataset.id = id;
  button.className = className;
  return button;
}

async function initialize() {
  const credentials = getConfiguredCredentials();
  if (!isValidProjectUrl(credentials.url) || !credentials.anonKey) {
    showScreen("connection");
    return;
  }

  try {
    const recoveryParams = new URLSearchParams(window.location.hash.slice(1));
    const recoveryRequested =
      recoveryParams.get("type") === "recovery" ||
      (recoveryParams.has("access_token") && recoveryParams.has("refresh_token")) ||
      new URLSearchParams(window.location.search).get("type") === "recovery" ||
      new URLSearchParams(window.location.search).get("recovery") === "1";
    const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
    supabase = createClient(credentials.url, credentials.anonKey, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    });
    supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || (recoveryRequested && session)) {
        showScreen("password");
      }
      if (event === "SIGNED_OUT") {
        signedInUser = null;
        showScreen("login");
      }
    });
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    if (recoveryRequested && data.session) {
      showScreen("password");
    } else if (data.session) {
      await startDashboard(data.session.user);
    } else {
      showScreen("login");
    }

  } catch (error) {
    console.error("Unable to connect to the store's Supabase project.", error);
    showScreen("connection");
    connectionMessage.textContent = `تعذّر الاتصال: ${error.message}`;
  }
}

async function startDashboard(user) {
  signedInUser = user;
  const { data, error } = await supabase
    .from("store_admins")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error || !data) {
    showScreen("login");
    showLoginMessage(
      error
        ? `تعذّر التحقق من الصلاحية: ${error.message}`
        : "هذا الحساب ليس لديه صلاحية إدارة المتجر. تحققي من الإعداد الأول في Supabase.",
    );
    await supabase.auth.signOut();
    return;
  }

  document.querySelector("#account-email").textContent = user.email || "";
  showScreen("dashboard");
  await refreshData();
}

async function refreshData() {
  dashboardMessage.textContent = "";
  try {
    const [productResponse, orderResponse, summaryResponse] = await Promise.all([
      supabase.from("products").select("*").order("updated_at", { ascending: false }).limit(500),
      supabase.from("store_orders").select("*").order("created_at", { ascending: false }).limit(500),
      supabase.rpc("get_store_summary"),
    ]);
    if (productResponse.error) throw productResponse.error;
    if (orderResponse.error) throw orderResponse.error;
    if (summaryResponse.error) throw summaryResponse.error;

    products = productResponse.data || [];
    orders = orderResponse.data || [];
    renderProducts();
    renderOrders();
    renderOverview(summaryResponse.data);
  } catch (error) {
    console.error("Unable to load store products and orders.", error);
    showDashboardMessage(`تعذّر تحميل البيانات: ${error.message}`);
  }
}

function renderProducts() {
  const table = document.querySelector("#products-table");
  table.replaceChildren();
  document.querySelector("#products-empty").hidden = products.length > 0;

  products.forEach((product) => {
    const row = document.createElement("tr");
    const productCell = document.createElement("td");
    const productDetails = document.createElement("div");
    productDetails.className = "product-cell";
    const thumbnail = document.createElement("span");
    thumbnail.className = "product-thumb";
    if (product.image_url) {
      const image = document.createElement("img");
      image.src = product.image_url;
      image.alt = "";
      image.loading = "lazy";
      thumbnail.append(image);
    } else {
      thumbnail.textContent = "Z";
    }
    const name = document.createElement("span");
    name.className = "product-name";
    const strong = document.createElement("strong");
    strong.textContent = product.name;
    const description = document.createElement("small");
    description.textContent = product.description || "من دون وصف";
    name.append(strong, description);
    productDetails.append(thumbnail, name);
    productCell.append(productDetails);
    row.append(productCell);

    addTextCell(row, product.category);
    addTextCell(row, formatMoney(product.price));
    const stockCell = addTextCell(row, Number(product.stock));
    if (Number(product.stock) < 5) stockCell.classList.add("stock-low");

    const visibilityCell = document.createElement("td");
    const badge = document.createElement("span");
    badge.className = `status-badge ${product.is_active ? "status-active" : "status-inactive"}`;
    badge.textContent = product.is_active ? "ظاهر في المتجر" : "مخفي";
    visibilityCell.append(badge);
    row.append(visibilityCell);

    const actionsCell = document.createElement("td");
    const actions = document.createElement("div");
    actions.className = "row-actions";
    actions.append(makeButton("تعديل", "edit-product", product.id));
    actions.append(
      makeButton(
        product.is_active ? "إخفاء" : "نشر",
        "toggle-product",
        product.id,
      ),
    );
    actions.append(makeButton("حذف", "delete-product", product.id, "row-action row-action-danger"));
    actionsCell.append(actions);
    row.append(actionsCell);
    table.append(row);
  });
}

function renderOrderRows(target, entries, includeDetails) {
  target.replaceChildren();
  entries.forEach((order) => {
    const row = document.createElement("tr");
    addTextCell(row, `#${order.order_number}`);

    if (includeDetails) {
      const customerCell = document.createElement("td");
      const customer = document.createElement("span");
      customer.className = "order-customer";
      const name = document.createElement("span");
      name.textContent = order.customer_name;
      const phone = document.createElement("a");
      phone.dir = "ltr";
      phone.href = `tel:${String(order.customer_phone).replace(/[^\d+]/g, "")}`;
      phone.textContent = order.customer_phone;
      customer.append(name, phone);
      customerCell.append(customer);
      row.append(customerCell);
      addTextCell(row, Array.isArray(order.items) ? order.items.map((item) => item.name).join("، ") : "");
      addTextCell(row, formatMoney(order.total_amount));
    } else {
      addTextCell(row, order.customer_name);
      const itemCell = addTextCell(
        row,
        Array.isArray(order.items) ? order.items.map((item) => item.name).join("، ") : "",
      );
      itemCell.className = "order-item-cell";
      addTextCell(row, formatMoney(order.total_amount));
    }

    const statusCell = document.createElement("td");
    const status = document.createElement("select");
    status.className = "order-status";
    status.dataset.orderStatus = "true";
    status.dataset.id = order.id;
    Object.entries(statusLabels).forEach(([value, label]) => {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = label;
      option.selected = value === order.status;
      status.append(option);
    });
    statusCell.append(status);
    row.append(statusCell);
    addTextCell(row, formatDate(order.created_at));
    target.append(row);
  });
}

function renderOrders() {
  const table = document.querySelector("#orders-table");
  renderOrderRows(table, orders, true);
  document.querySelector("#orders-empty").hidden = orders.length > 0;
}

function renderOverview(summary) {
  document.querySelector("#stats-products").textContent = String(summary.products);
  document.querySelector("#stats-active").textContent = String(summary.active_products);
  document.querySelector("#stats-pending").textContent = String(summary.pending_orders);
  document.querySelector("#stats-revenue").textContent = formatMoney(summary.revenue);

  const recentOrders = orders.slice(0, 5);
  renderOrderRows(document.querySelector("#recent-orders"), recentOrders, false);
  document.querySelector("#recent-empty").hidden = recentOrders.length > 0;
}

function openProductDialog(product = null) {
  productForm.reset();
  productForm.elements.id.value = product?.id || "";
  productForm.elements.name.value = product?.name || "";
  productForm.elements.category.value = product?.category || "";
  productForm.elements.description.value = product?.description || "";
  productForm.elements.price.value = product?.price ?? "";
  productForm.elements.stock.value = product?.stock ?? 0;
  productForm.elements.image_url.value = product?.image_url || "";
  productForm.elements.featured.checked = Boolean(product?.featured);
  productForm.elements.is_active.checked = product ? Boolean(product.is_active) : true;
  document.querySelector("#product-dialog-title").textContent = product ? "تعديل بيانات المنتج" : "أضيفي منتجًا";
  document.querySelector("#product-error").textContent = "";
  productDialog.showModal();
  productForm.elements.name.focus();
}

function openOrderDialog() {
  orderForm.reset();
  orderForm.elements.quantity.value = "1";
  document.querySelector("#order-error").textContent = "";
  updateOrderPreview();
  orderDialog.showModal();
  orderForm.elements.customer_name.focus();
}

function updateOrderPreview() {
  const quantity = Number(orderForm.elements.quantity.value) || 0;
  const price = Number(orderForm.elements.unit_price.value) || 0;
  document.querySelector("#order-total-preview").textContent = formatMoney(quantity * price);
}

document.querySelector("#connection-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const url = form.elements.url.value.trim().replace(/\/+$/, "");
  const anonKey = form.elements.anonKey.value.trim();

  if (!isValidProjectUrl(url)) {
    connectionMessage.textContent = "أدخلي رابط مشروع Supabase الرسمي بصيغة https://اسم-المشروع.supabase.co.";
    return;
  }
  if (!anonKey) {
    connectionMessage.textContent = "أدخلي مفتاح النشر العام (anon / publishable). لا تضعي service_role هنا.";
    return;
  }

  try {
    localStorage.setItem(editorStorageKey, JSON.stringify({ url, anonKey }));
    window.location.reload();
  } catch (error) {
    console.error("Unable to save Supabase settings in this browser.", error);
    connectionMessage.textContent = "تعذّر حفظ الإعدادات في هذا المتصفح. تحققي من إعدادات التخزين وحاولي مجددًا.";
  }
});

document.querySelector("#login-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const button = form.querySelector("button[type='submit']");
  const originalLabel = button.textContent;
  button.disabled = true;
  button.textContent = "جارٍ التحقق...";
  showLoginMessage("");

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: form.elements.email.value.trim(),
      password: form.elements.password.value,
    });
    if (error) throw error;
    form.reset();
    await startDashboard(data.user);
  } catch (error) {
    console.error("The store administrator could not sign in.", error);
    showLoginMessage("لم ينجح تسجيل الدخول. تحققي من البريد وكلمة المرور، وتأكدي من إعداد حساب المالكة.");
  } finally {
    button.disabled = false;
    button.textContent = originalLabel;
  }
});

document.querySelector("#request-password-reset").addEventListener("click", async (event) => {
  const form = document.querySelector("#login-form");
  const emailInput = form.elements.email;
  const email = emailInput.value.trim();
  const button = event.currentTarget;
  showLoginMessage("");

  if (!email) {
    showLoginMessage("اكتبي بريد حساب المالك أولًا، ثم اضغطي هنا لإرسال رابط استعادة كلمة المرور.");
    emailInput.focus();
    return;
  }

  button.disabled = true;
  try {
    const redirectTo = new URL("./admin.html?recovery=1", window.location.href).href;
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
    if (error) throw error;
    loginMessage.style.color = "#47734a";
    showLoginMessage("أرسلنا رابط الاستعادة إن كان البريد مسجلًا. افحصي الوارد وSpam، واستخدمي أحدث رسالة فقط.");
  } catch (error) {
    console.error("Unable to send the store administrator's password recovery email.", error);
    loginMessage.style.color = "";
    showLoginMessage(
      error.status === 429
        ? "وصلنا لحد إرسال الرسائل مؤقتًا. انتظري قليلًا قبل طلب رابط جديد."
        : `تعذّر إرسال رابط الاستعادة: ${error.message}`,
    );
  } finally {
    button.disabled = false;
  }
});

document.querySelector("#password-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const password = form.elements.password.value;
  const confirmPassword = form.elements.confirmPassword.value;
  const button = form.querySelector("button[type='submit']");
  passwordMessage.textContent = "";

  if (password.length < 8) {
    passwordMessage.textContent = "اختاري كلمة مرور من 8 أحرف على الأقل.";
    return;
  }
  if (password !== confirmPassword) {
    passwordMessage.textContent = "كلمتا المرور غير متطابقتين.";
    return;
  }

  button.disabled = true;
  try {
    const { data, error } = await supabase.auth.updateUser({ password });
    if (error) throw error;
    window.history.replaceState({}, document.title, window.location.pathname);
    form.reset();
    await startDashboard(data.user);
    showToast("تم حفظ كلمة المرور الجديدة.");
  } catch (error) {
    console.error("Unable to update the store administrator's password.", error);
    passwordMessage.textContent = `تعذّر حفظ كلمة المرور: ${error.message}`;
  } finally {
    button.disabled = false;
  }
});

document.querySelector("#sign-out").addEventListener("click", async () => {
  const { error } = await supabase.auth.signOut();
  if (error) {
    console.error("Unable to sign out from the admin dashboard.", error);
    showDashboardMessage(`تعذّر تسجيل الخروج: ${error.message}`);
    return;
  }
  showScreen("login");
});

document.querySelectorAll("[data-view-target]").forEach((button) => {
  button.addEventListener("click", () => {
    const target = button.dataset.viewTarget;
    document.querySelectorAll("[data-view]").forEach((view) => {
      view.hidden = view.dataset.view !== target;
    });
    document.querySelectorAll("[data-view-target]").forEach((navItem) => {
      navItem.classList.toggle("is-active", navItem === button);
    });
  });
});

document.querySelector("[data-go-view='orders']").addEventListener("click", () => {
  document.querySelector("[data-view-target='orders']").click();
});
document.querySelector("#add-product").addEventListener("click", () => openProductDialog());
document.querySelector("#add-order").addEventListener("click", openOrderDialog);
document.querySelectorAll("[data-close-dialog]").forEach((button) => {
  button.addEventListener("click", () => button.closest("dialog").close());
});

productForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const errorText = document.querySelector("#product-error");
  errorText.textContent = "";
  const imageUrl = form.elements.image_url.value.trim();
  if (imageUrl) {
    try {
      if (new URL(imageUrl).protocol !== "https:") throw new Error("Invalid protocol");
    } catch {
      errorText.textContent = "رابط الصورة غير صالح؛ أدخلي رابطًا يبدأ بـ https://.";
      return;
    }
  }

  const id = form.elements.id.value;
  const record = {
    name: form.elements.name.value.trim(),
    category: form.elements.category.value.trim(),
    description: form.elements.description.value.trim(),
    price: Number(form.elements.price.value),
    stock: Number(form.elements.stock.value),
    image_url: imageUrl,
    featured: form.elements.featured.checked,
    is_active: form.elements.is_active.checked,
    updated_at: new Date().toISOString(),
  };
  const button = form.querySelector("button[type='submit']");
  button.disabled = true;

  try {
    const query = id
      ? supabase.from("products").update(record).eq("id", id)
      : supabase.from("products").insert(record);
    const { error } = await query;
    if (error) throw error;
    productDialog.close();
    await refreshData();
    showToast(id ? "تم تحديث المنتج وظهوره في المتجر." : "تمت إضافة المنتج إلى متجرك.");
  } catch (error) {
    console.error("Unable to save store product.", error);
    errorText.textContent = `تعذّر حفظ المنتج: ${error.message}`;
  } finally {
    button.disabled = false;
  }
});

document.querySelector("#products-table").addEventListener("click", async (event) => {
  const button = event.target.closest("button[data-action]");
  if (!button) return;
  const product = products.find((entry) => entry.id === button.dataset.id);
  if (!product) return;

  if (button.dataset.action === "edit-product") {
    openProductDialog(product);
    return;
  }
  if (button.dataset.action === "delete-product") {
    if (!window.confirm(`حذف المنتج «${product.name}» نهائيًا؟`)) return;
    const { error } = await supabase.from("products").delete().eq("id", product.id);
    if (error) {
      console.error("Unable to delete store product.", error);
      showDashboardMessage(`تعذّر حذف المنتج: ${error.message}`);
      return;
    }
    await refreshData();
    showToast("تم حذف المنتج.");
    return;
  }
  if (button.dataset.action === "toggle-product") {
    const { error } = await supabase
      .from("products")
      .update({ is_active: !product.is_active, updated_at: new Date().toISOString() })
      .eq("id", product.id);
    if (error) {
      console.error("Unable to change product visibility.", error);
      showDashboardMessage(`تعذّر تحديث ظهور المنتج: ${error.message}`);
      return;
    }
    await refreshData();
    showToast(product.is_active ? "تم إخفاء المنتج من المتجر." : "تم نشر المنتج في المتجر.");
  }
});

document.querySelectorAll("input[name='quantity'], input[name='unit_price']").forEach((input) => {
  input.addEventListener("input", updateOrderPreview);
});

orderForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const errorText = document.querySelector("#order-error");
  errorText.textContent = "";
  const quantity = Number(form.elements.quantity.value);
  const price = Number(form.elements.unit_price.value);
  if (!Number.isSafeInteger(quantity) || quantity < 1 || price < 0) {
    errorText.textContent = "تأكدي من إدخال كمية صحيحة وسعر غير سالب.";
    return;
  }

  const itemName = form.elements.item_name.value.trim();
  const record = {
    customer_name: form.elements.customer_name.value.trim(),
    customer_phone: form.elements.customer_phone.value.trim(),
    items: [{ name: itemName, quantity, unit_price: price }],
    total_amount: Number((quantity * price).toFixed(2)),
    notes: form.elements.notes.value.trim(),
    status: "pending",
  };
  const button = form.querySelector("button[type='submit']");
  button.disabled = true;

  try {
    const { error } = await supabase.from("store_orders").insert(record);
    if (error) throw error;
    orderDialog.close();
    await refreshData();
    showToast("تم تسجيل الطلب بنجاح.");
  } catch (error) {
    console.error("Unable to save store order.", error);
    errorText.textContent = `تعذّر تسجيل الطلب: ${error.message}`;
  } finally {
    button.disabled = false;
  }
});

document.querySelectorAll("tbody").forEach((tbody) => {
  tbody.addEventListener("change", async (event) => {
    const select = event.target.closest("select[data-order-status]");
    if (!select) return;
    const originalValue = select.value;
    select.disabled = true;
    const { error } = await supabase
      .from("store_orders")
      .update({ status: originalValue, updated_at: new Date().toISOString() })
      .eq("id", select.dataset.id);
    if (error) {
      console.error("Unable to update order status.", error);
      showDashboardMessage(`تعذّر تحديث حالة الطلب: ${error.message}`);
      await refreshData();
      return;
    }
    await refreshData();
    showToast("تم تحديث حالة الطلب.");
  });
});

await initialize();
