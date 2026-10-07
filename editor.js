const editor = document.querySelector(".site-editor");
const editorToggle = document.querySelector(".editor-toggle");
const editorControls = document.querySelector(".site-editor-controls");
const editorStatus = document.querySelector(".editor-save-status");
const editorLogoUpload = document.querySelector(".logo-upload");
const colorVariables = {
  paper: "--paper",
  ink: "--ink",
  "brand-purple": "--brand-purple",
  "brand-lime": "--brand-lime",
};
const editableSelectors = [
  ".announcement",
  ".main-nav a",
  ".hero-copy .eyebrow",
  ".hero-copy h1",
  ".hero-description",
  ".button-dark",
  ".hero-note",
  ".hero-stamp span",
  ".hero-stamp strong",
  ".trust-strip span",
  ".section-heading .eyebrow",
  ".section-heading h2",
  ".section-heading .text-link",
  ".product-tag",
  ".bottle > span",
  ".bottle > strong",
  ".bottle > small",
  ".compact > span",
  ".compact > strong",
  ".compact > small",
  ".lip-tube > span",
  ".lip-tube > strong",
  ".jar-body > span",
  ".jar-body > strong",
  ".jar-body > small",
  ".product-info h3",
  ".product-info p",
  ".product-info > span",
  ".ritual-copy .eyebrow",
  ".ritual-copy h2",
  ".ritual-copy > p:not(.eyebrow)",
  ".ritual-copy .text-link",
  ".newsletter > .eyebrow",
  ".newsletter h2",
  ".newsletter > p:not(.eyebrow):not(.form-message)",
  ".newsletter-form button",
  ".site-footer > p",
  ".footer-links a",
  ".site-footer small",
];
const textStorageKey = "zain-site-editor-text";
const themeStorageKey = "zain-site-editor-theme";
const logoStorageKey = "zain-site-editor-logo";
const defaultBrandLogo = "assets/zain-cosmetics-logo.png";
let savedText = {};
let activeEditTarget = null;

try {
  savedText = JSON.parse(localStorage.getItem(textStorageKey) || "{}");
  if (!savedText || typeof savedText !== "object" || Array.isArray(savedText)) {
    throw new TypeError("Saved text must be an object.");
  }
} catch (error) {
  console.error("Unable to load your saved website text.", error);
  savedText = {};
}

function markEditableText() {
  let index = 0;
  document.querySelectorAll(editableSelectors.join(",")).forEach((element) => {
    const key = `item-${index}`;
    index += 1;
    element.dataset.editorTarget = "true";
    element.dataset.editorKey = key;
    element.setAttribute("contenteditable", "false");
    element.setAttribute("spellcheck", "true");
    if (Object.hasOwn(savedText, key) && typeof savedText[key] === "string") {
      element.textContent = savedText[key];
    }
  });
}

function setEditorStatus(message) {
  editorStatus.textContent = message;
}

function persistText(element) {
  savedText[element.dataset.editorKey] = element.innerText.replace(/\r\n/g, "\n");
  try {
    localStorage.setItem(textStorageKey, JSON.stringify(savedText));
    setEditorStatus("تم حفظ التغييرات تلقائيًا في هذا المتصفح.");
  } catch (error) {
    console.error("Unable to save your website text.", error);
    setEditorStatus("تعذّر الحفظ. تحققي من إعدادات التخزين في المتصفح.");
  }
}

function loadTheme() {
  let theme = {};
  try {
    theme = JSON.parse(localStorage.getItem(themeStorageKey) || "{}");
  } catch (error) {
    console.error("Unable to load your saved website colors.", error);
  }

  document.querySelectorAll("[data-theme-color]").forEach((input) => {
    const name = input.dataset.themeColor;
    const value = theme[name];
    if (typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value)) {
      document.documentElement.style.setProperty(colorVariables[name], value);
      input.value = value;
    }
  });
}

function loadLogo() {
  let logo = null;
  try {
    logo = localStorage.getItem(logoStorageKey);
  } catch (error) {
    console.error("Unable to load your saved website logo.", error);
    return;
  }
  if (logo) {
    document.querySelectorAll(".brand-logo").forEach((image) => {
      image.src = logo;
    });
  }
}

markEditableText();
loadTheme();
loadLogo();

editorToggle.addEventListener("click", () => {
  const isOpen = editor.classList.toggle("is-open");
  document.body.classList.toggle("editor-mode", isOpen);
  editorControls.hidden = !isOpen;
  document.querySelectorAll("[data-editor-target]").forEach((element) => {
    element.setAttribute("contenteditable", isOpen ? "plaintext-only" : "false");
  });
  editorToggle.setAttribute("aria-expanded", String(isOpen));
  editorToggle.querySelector("span").textContent = isOpen ? "إنهاء التعديل" : "تعديل الموقع";
  if (isOpen) setEditorStatus("تُحفظ التغييرات تلقائيًا في هذا المتصفح.");
  if (!isOpen && activeEditTarget) {
    activeEditTarget.blur();
    activeEditTarget = null;
  }
});

document.addEventListener("focusin", (event) => {
  if (event.target.matches("[data-editor-target='true']")) {
    activeEditTarget = event.target;
  }
});

document.addEventListener("input", (event) => {
  if (event.target.matches("[data-editor-target='true']")) {
    persistText(event.target);
  }
});

document.addEventListener("click", (event) => {
  if (!document.body.classList.contains("editor-mode")) return;
  const link = event.target.closest("a");
  if (link && !link.closest(".site-editor")) event.preventDefault();
});

document.querySelectorAll("[data-theme-color]").forEach((input) => {
  input.addEventListener("input", () => {
    const theme = {};
    document.querySelectorAll("[data-theme-color]").forEach((colorInput) => {
      const name = colorInput.dataset.themeColor;
      const value = colorInput.value;
      document.documentElement.style.setProperty(colorVariables[name], value);
      theme[name] = value;
    });
    try {
      localStorage.setItem(themeStorageKey, JSON.stringify(theme));
      setEditorStatus("تم حفظ الألوان الجديدة.");
    } catch (error) {
      console.error("Unable to save your website colors.", error);
      setEditorStatus("تغيّر اللون، لكن تعذّر حفظه في المتصفح.");
    }
  });
});

editorLogoUpload.addEventListener("change", () => {
  const [file] = editorLogoUpload.files;
  if (!file) return;
  if (!file.type.startsWith("image/")) {
    setEditorStatus("اختاري ملف صورة صالحًا للشعار.");
    return;
  }

  const reader = new FileReader();
  reader.addEventListener("load", () => {
    if (typeof reader.result !== "string") {
      setEditorStatus("تعذّر قراءة الصورة. حاولي استخدام ملف صورة آخر.");
      return;
    }
    document.querySelectorAll(".brand-logo").forEach((image) => {
      image.src = reader.result;
    });
    try {
      localStorage.setItem(logoStorageKey, reader.result);
      setEditorStatus("تم تحديث الشعار وحفظه في هذا المتصفح.");
    } catch (error) {
      console.error("Unable to save your uploaded logo.", error);
      setEditorStatus("تم تغيير الشعار مؤقتًا، لكن تعذّر حفظه في المتصفح.");
    }
  });
  reader.addEventListener("error", () => {
    setEditorStatus("تعذّرت قراءة الصورة. حاولي استخدام ملف آخر.");
  });
  reader.readAsDataURL(file);
});

document.querySelector(".editor-reset").addEventListener("click", () => {
  try {
    localStorage.removeItem(textStorageKey);
    localStorage.removeItem(themeStorageKey);
    localStorage.removeItem(logoStorageKey);
  } catch (error) {
    console.error("Unable to clear saved website customizations.", error);
    setEditorStatus("تعذّرت استعادة الموقع. تحققي من إعدادات المتصفح.");
    return;
  }
  window.location.reload();
});
