const API_URL = window.KAYS_HAVEN_API_URL;

/* -----------------------------
   STATE
----------------------------- */

let accessToken = null;
let currentUser = null;
let inventory = [];
let orders = [];
let lastOrdersRefreshAt = 0;
const inventoryCategories = ["Baby", "Toddler", "Kids", "Teens", "Toys", "Accessories", "Back to School", "Clearance"];
let bulkProductEntries = [];
let bulkSaveInProgress = false;

/* -----------------------------
   ELEMENTS
----------------------------- */

const loginScreen = document.querySelector("#login-screen");
const dashboardScreen = document.querySelector("#dashboard-screen");

const loginForm = document.querySelector("#login-form");
const loginError = document.querySelector("#login-error");
const loginInput = document.querySelector("#email");
const passwordInput = document.querySelector("#password");
const passwordToggle = document.querySelector("#password-toggle");

const logoutButton = document.querySelector("#logout-button");

const inventoryForm = document.querySelector("#inventory-form");
const inventoryRows = document.querySelector("#inventory-rows");
const inventoryFeedback = document.querySelector("#inventory-feedback");
const inventorySearch = document.querySelector("#inventory-search");
const inventoryCategoryFilter = document.querySelector("#inventory-category-filter");
const inventoryListFeedback = document.querySelector("#inventory-list-feedback");
const bulkImageInput = document.querySelector("#bulk-product-images");
const bulkProductList = document.querySelector("#bulk-product-list");
const bulkSaveButton = document.querySelector("#save-bulk-products");
const bulkFeedback = document.querySelector("#bulk-products-feedback");
const adminForm = document.querySelector("#admin-form");
const adminFeedback = document.querySelector("#admin-feedback");

const changePasswordForm =
  document.querySelector("#change-password-form");

const passwordFeedback =
  document.querySelector("#password-feedback");

/* -----------------------------
   SCREEN CONTROL
----------------------------- */

function showScreen(screenName) {
  if (loginScreen) {
    loginScreen.classList.toggle(
      "is-hidden",
      screenName !== "login"
    );
  }

  if (dashboardScreen) {
    dashboardScreen.classList.toggle(
      "is-hidden",
      screenName !== "dashboard"
    );
  }

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
}

/* -----------------------------
   PASSWORD TOGGLE
----------------------------- */

if (passwordToggle && passwordInput) {
  passwordToggle.addEventListener("click", () => {
    const hidden = passwordInput.type === "password";

    passwordInput.type = hidden ? "text" : "password";
    passwordToggle.textContent = hidden ? "HIDE" : "SHOW";
  });
}

/* -----------------------------
   STAFF LOGIN
----------------------------- */

if (loginForm) {
  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    loginError.textContent = "";

    const loginName =
      loginInput.value.trim().toLowerCase();

    const password =
      passwordInput.value;

    if (!loginName || !password) {
      loginError.textContent =
        "Please enter your login name and password.";
      return;
    }

    try {
      const response = await fetch(
        `${API_URL}/api/staff/login`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            login_name: loginName,
            password
          })
        }
      );

      const result = await response.json();

      if (!response.ok) {
        loginError.textContent =
          result.error ||
          "Invalid login name or password.";
        return;
      }

      accessToken =
        result.session.access_token;

      currentUser = result.staff;

      sessionStorage.setItem(
        "kayshaven-access-token",
        accessToken
      );

      sessionStorage.setItem(
        "kayshaven-staff",
        JSON.stringify(currentUser)
      );

      updateUserDisplay();

      loginForm.reset();

      showScreen("dashboard");

      await loadOrders();

    } catch (error) {
      console.error(error);

      loginError.textContent =
        "Could not connect to the backend.";
    }
  });
}

/* -----------------------------
   USER DISPLAY
----------------------------- */

function updateUserDisplay() {
  if (!currentUser) return;

  const fullName = String(currentUser.full_name || "Staff").trim() || "Staff";
  const name = document.querySelector("#profile-name");
  const role = document.querySelector("#profile-role");
  const avatar = document.querySelector("#profile-avatar");
  if (name) name.textContent = fullName;
  if (role && currentUser.role) role.textContent = String(currentUser.role);
  if (avatar) {
    avatar.textContent = fullName.split(/\s+/).map(part => part[0]).join("").toUpperCase();
  }
}

function clearStaffSession() {
  accessToken = null;
  currentUser = null;
  orders = [];
  inventory = [];
  sessionStorage.removeItem("kayshaven-access-token");
  sessionStorage.removeItem("kayshaven-staff");
  showScreen("login");
}

function restoreStaffSession() {
  const token = sessionStorage.getItem("kayshaven-access-token");
  const staff = sessionStorage.getItem("kayshaven-staff");
  if (!token || !staff) return;
  try {
    currentUser = JSON.parse(staff);
    if (!currentUser || typeof currentUser !== "object") throw new Error("Invalid saved staff session");
    accessToken = token;
    updateUserDisplay();
    showScreen("dashboard");
    loadOrders();
  } catch {
    clearStaffSession();
  }
}

/* -----------------------------
   AUTH HEADERS
----------------------------- */

function authHeaders() {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${accessToken}`
  };
}

function readImageDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Could not read the selected image."));
    reader.readAsDataURL(file);
  });
}

async function uploadProductImage(file) {
  const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
  if (!allowedTypes.includes(file.type)) throw new Error("Choose a JPEG, PNG or WebP image.");
  if (file.size > 5 * 1024 * 1024) throw new Error("Product images must be 5 MB or smaller.");
  const response = await fetch(`${API_URL}/api/products/images`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ data_url: await readImageDataUrl(file) })
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || "Could not upload the product image.");
  return result.image_url;
}

function renderBulkProductEntries() {
  if (!bulkProductList) return;
  bulkProductList.replaceChildren();
  const fragment = document.createDocumentFragment();
  bulkProductEntries.forEach(entry => {
    const row = document.createElement("article");
    row.className = `bulk-product-entry${entry.saved ? " is-saved" : ""}`;
    row.dataset.bulkProductId = entry.id;
    const image = document.createElement("img");
    image.className = "bulk-product-preview";
    image.src = entry.previewUrl;
    image.alt = `Preview of ${entry.file.name}`;
    const fields = document.createElement("div");
    fields.className = "bulk-product-fields";
    const nameLabel = document.createElement("label");
    nameLabel.textContent = "Product name";
    const nameInput = document.createElement("input");
    nameInput.type = "text";
    nameInput.required = true;
    nameInput.value = entry.name;
    nameInput.placeholder = "Enter product name";
    nameInput.dataset.bulkField = "name";
    nameLabel.appendChild(nameInput);
    const categoryLabel = document.createElement("label");
    categoryLabel.textContent = "Category";
    const categoryInput = document.createElement("select");
    categoryInput.required = true;
    categoryInput.dataset.bulkField = "category";
    const categoryPrompt = document.createElement("option");
    categoryPrompt.value = "";
    categoryPrompt.textContent = "Select category";
    categoryInput.appendChild(categoryPrompt);
    inventoryCategories.forEach(category => {
      const option = document.createElement("option");
      option.value = category;
      option.textContent = category;
      categoryInput.appendChild(option);
    });
    categoryInput.value = entry.category;
    categoryLabel.appendChild(categoryInput);
    const priceLabel = document.createElement("label");
    priceLabel.textContent = "Price (GHS)";
    const priceInput = document.createElement("input");
    priceInput.type = "number";
    priceInput.required = true;
    priceInput.min = "0.01";
    priceInput.step = "0.01";
    priceInput.value = entry.price;
    priceInput.placeholder = "0.00";
    priceInput.dataset.bulkField = "price";
    priceLabel.appendChild(priceInput);
    fields.append(nameLabel, categoryLabel, priceLabel);
    const actions = document.createElement("div");
    actions.className = "bulk-product-entry-actions";
    const status = document.createElement("p");
    status.className = `bulk-entry-status${entry.error ? " has-error" : entry.saved ? " is-success" : ""}`;
    status.setAttribute("role", "status");
    status.textContent = entry.status || entry.file.name;
    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "button bulk-remove-button";
    remove.dataset.removeBulkProduct = entry.id;
    remove.textContent = "Remove";
    remove.setAttribute("aria-label", `Remove ${entry.file.name} from the bulk list`);
    actions.append(status, remove);
    row.append(image, fields, actions);
    const isLocked = bulkSaveInProgress || entry.saved;
    nameInput.disabled = isLocked;
    categoryInput.disabled = isLocked;
    priceInput.disabled = isLocked;
    remove.disabled = isLocked;
    for (const input of [nameInput, categoryInput, priceInput]) {
      const updateEntry = () => {
        entry[input.dataset.bulkField] = input.value;
        if (entry.error) {
          entry.error = false;
          entry.status = entry.file.name;
          status.classList.remove("has-error");
          status.textContent = entry.status;
        }
        updateBulkSaveButton();
      };
      input.addEventListener(input.tagName === "SELECT" ? "change" : "input", updateEntry);
    }
    fragment.appendChild(row);
  });
  bulkProductList.appendChild(fragment);
  updateBulkSaveButton();
}

function updateBulkSaveButton() {
  if (bulkSaveButton) {
    bulkSaveButton.disabled = bulkSaveInProgress || !bulkProductEntries.some(entry => !entry.saved);
    bulkSaveButton.textContent = bulkSaveInProgress ? "Saving products…" : "Save All Products";
  }
}

function addBulkImages(files) {
  const rejected = [];
  for (const file of files) {
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size <= 0 || file.size > 5 * 1024 * 1024) {
      rejected.push(file.name);
      continue;
    }
    bulkProductEntries.push({
      id: globalThis.crypto?.randomUUID?.() || `bulk-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      file,
      previewUrl: URL.createObjectURL(file),
      name: "",
      category: "",
      price: "",
      status: file.name,
      error: false,
      saved: false
    });
  }
  if (bulkFeedback) bulkFeedback.textContent = rejected.length ? `${rejected.length} file(s) skipped. Use JPEG, PNG or WebP images up to 5 MB each.` : "";
  renderBulkProductEntries();
}

bulkImageInput?.addEventListener("change", () => {
  addBulkImages(Array.from(bulkImageInput.files || []));
  bulkImageInput.value = "";
});

bulkProductList?.addEventListener("click", event => {
  const remove = event.target.closest("[data-remove-bulk-product]");
  if (!remove || bulkSaveInProgress) return;
  const index = bulkProductEntries.findIndex(entry => entry.id === remove.dataset.removeBulkProduct);
  if (index < 0 || bulkProductEntries[index].saved) return;
  URL.revokeObjectURL(bulkProductEntries[index].previewUrl);
  bulkProductEntries.splice(index, 1);
  renderBulkProductEntries();
});

bulkSaveButton?.addEventListener("click", async () => {
  if (bulkSaveInProgress) return;
  if (!accessToken) {
    if (bulkFeedback) bulkFeedback.textContent = "Sign in with an authorized staff account to add products.";
    return;
  }
  const pending = bulkProductEntries.filter(entry => !entry.saved);
  if (!pending.length) return;
  let validationFailed = false;
  pending.forEach(entry => {
    const validPrice = Number.isFinite(Number(entry.price)) && Number(entry.price) > 0;
    if (!entry.name.trim() || !inventoryCategories.includes(entry.category) || !validPrice) {
      entry.error = true;
      entry.status = "Enter a name, category and positive price before saving.";
      validationFailed = true;
    }
  });
  if (validationFailed) {
    renderBulkProductEntries();
    if (bulkFeedback) bulkFeedback.textContent = "Complete the required fields for each image before saving.";
    return;
  }

  bulkSaveInProgress = true;
  if (bulkFeedback) bulkFeedback.textContent = "Saving products one at a time…";
  renderBulkProductEntries();
  let savedCount = 0;
  let failedCount = 0;
  try {
    for (const entry of pending) {
      entry.status = "Uploading image…";
      renderBulkProductEntries();
      try {
        const image = await uploadProductImage(entry.file);
        entry.status = "Creating product record…";
        renderBulkProductEntries();
        const response = await fetch(`${API_URL}/api/products`, {
          method: "POST",
          headers: authHeaders(),
          body: JSON.stringify({ name: entry.name.trim(), category: entry.category, price: Number(entry.price), image })
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Could not save this product.");
        entry.saved = true;
        entry.error = false;
        entry.status = "Saved and published";
        savedCount += 1;
      } catch (error) {
        entry.error = true;
        entry.status = error.message || "This product could not be saved.";
        failedCount += 1;
      }
      renderBulkProductEntries();
    }
  } finally {
    bulkSaveInProgress = false;
    renderBulkProductEntries();
    if (bulkFeedback) bulkFeedback.textContent = `${savedCount} product(s) saved${failedCount ? `; ${failedCount} failed. Correct the marked rows and retry.` : "."}`;
    if (savedCount) await loadInventory();
  }
});

/* -----------------------------
   LOAD INVENTORY
----------------------------- */

async function loadInventory() {
  if (!inventoryRows) return;

  try {
    const response =
      await fetch(`${API_URL}/api/products?include_inactive=true`, { headers: { Authorization: `Bearer ${accessToken}` } });

    const result =
      await response.json();

    if (!response.ok) {
      throw new Error(
        result.error ||
        "Failed to load products"
      );
    }

    inventory =
      Array.isArray(result.products)
        ? result.products
        : [];

    renderInventory();

  } catch (error) {
    console.error(
      "Inventory error:",
      error
    );

    inventoryRows.replaceChildren();
    const failed = document.createElement("p");
    failed.className = "inventory-empty-state inventory-load-error";
    failed.textContent = "Products could not be loaded. Refresh or try again shortly.";
    inventoryRows.appendChild(failed);
    if (inventoryListFeedback) inventoryListFeedback.textContent = error.message || "Inventory could not be loaded.";
  }
}

/* -----------------------------
   RENDER INVENTORY
----------------------------- */

function appendInventoryValue(container, label, value, className = "") {
  const fact = document.createElement("div");
  fact.className = `inventory-product-fact${className ? ` ${className}` : ""}`;
  const caption = document.createElement("span");
  caption.textContent = label;
  const text = document.createElement("strong");
  text.textContent = String(value ?? "—");
  fact.append(caption, text);
  container.appendChild(fact);
}

function makeInventoryCategorySelect(value, fieldName, labelText) {
  const label = document.createElement("label");
  label.className = "inventory-edit-field";
  label.textContent = labelText;
  const select = document.createElement("select");
  select.dataset.productField = fieldName;
  select.setAttribute("aria-label", labelText);
  const prompt = document.createElement("option");
  prompt.value = "";
  prompt.textContent = "Select category";
  select.appendChild(prompt);
  inventoryCategories.forEach(category => {
    const option = document.createElement("option");
    option.value = category;
    option.textContent = category;
    select.appendChild(option);
  });
  if (value && !inventoryCategories.includes(String(value))) {
    const current = document.createElement("option");
    current.value = String(value);
    current.textContent = String(value);
    select.appendChild(current);
  }
  select.value = String(value || "");
  label.appendChild(select);
  return label;
}

function renderInventory() {
  if (!inventoryRows) return;
  inventoryRows.querySelectorAll(".inventory-product-card").forEach(card => {
    if (card.dataset.selectedPreviewUrl) URL.revokeObjectURL(card.dataset.selectedPreviewUrl);
  });
  inventoryRows.replaceChildren();
  const query = String(inventorySearch?.value || "").trim().toLowerCase();
  const category = String(inventoryCategoryFilter?.value || "");
  const visibleInventory = inventory.filter(product => {
    const matchesQuery = !query || String(product.name || "").toLowerCase().includes(query);
    const matchesCategory = !category || String(product.category || "") === category;
    return matchesQuery && matchesCategory;
  });
  if (inventoryListFeedback) {
    inventoryListFeedback.textContent = query || category
      ? `Showing ${visibleInventory.length} of ${inventory.length} products.`
      : `${inventory.length} products from Supabase.`;
  }
  if (!visibleInventory.length) {
    const empty = document.createElement("p");
    empty.className = "inventory-empty-state";
    empty.textContent = query || category ? "No products match these filters." : "No products found.";
    inventoryRows.appendChild(empty);
  }

  visibleInventory.forEach(product => {
    const card = document.createElement("article");
    card.className = "inventory-product-card";
    card.dataset.inventoryProduct = String(product.id);
    card.setAttribute("role", "listitem");
    const imageUrl = productImageUrl(product, "../frontend/product-images/");
    card.dataset.originalImageUrl = imageUrl || "";

    const previewArea = document.createElement("div");
    previewArea.className = "inventory-product-preview-area";
    const preview = document.createElement("img");
    preview.className = "inventory-product-image";
    preview.alt = `Product image for ${product.name || "product"}`;
    preview.hidden = !imageUrl;
    const placeholder = document.createElement("span");
    placeholder.className = "inventory-image-placeholder";
    placeholder.textContent = "No image";
    placeholder.hidden = Boolean(imageUrl);
    const badge = document.createElement("span");
    badge.className = `order-status ${product.is_active === false ? "status-new" : "status-ready"} inventory-product-status`;
    const setStatus = imageLoaded => {
      if (product.is_active === false) {
        badge.textContent = "Hidden";
        badge.className = "order-status status-new inventory-product-status";
      } else if (!imageLoaded) {
        badge.textContent = "Missing Image";
        badge.className = "order-status status-new inventory-product-status";
      } else {
        badge.textContent = "Published";
        badge.className = "order-status status-ready inventory-product-status";
      }
    };
    badge.textContent = imageUrl ? "Checking image…" : product.is_active === false ? "Hidden" : "Missing Image";
    preview.addEventListener("load", () => setStatus(true));
    preview.addEventListener("error", () => {
      preview.hidden = true;
      placeholder.hidden = false;
      setStatus(false);
    });
    if (imageUrl) preview.src = imageUrl;
    previewArea.append(preview, placeholder);

    const summary = document.createElement("div");
    summary.className = "inventory-product-summary";
    const heading = document.createElement("div");
    heading.className = "inventory-product-heading";
    const name = document.createElement("h3");
    name.textContent = String(product.name || "Unnamed product");
    heading.append(name, badge);
    summary.appendChild(heading);
    const facts = document.createElement("div");
    facts.className = "inventory-product-facts";
    appendInventoryValue(facts, "Category", product.category || "—");
    const validPrice = Number.isFinite(Number(product.price)) && Number(product.price) > 0;
    appendInventoryValue(facts, "Price", validPrice ? `GHS ${Number(product.price).toLocaleString("en-GH", { maximumFractionDigits: 2 })}` : "Needs correction", "inventory-product-price");
    summary.appendChild(facts);
    if (!validPrice) {
      const priceWarning = document.createElement("p");
      priceWarning.className = "inventory-product-price-warning";
      priceWarning.textContent = "This active product cannot be purchased until its price is corrected.";
      summary.appendChild(priceWarning);
    }

    const actions = document.createElement("div");
    actions.className = "inventory-product-actions";
    const editButton = document.createElement("button");
    editButton.type = "button";
    editButton.className = "button button-secondary";
    editButton.textContent = "Edit";
    editButton.dataset.editProduct = String(product.id);
    actions.appendChild(editButton);
    const availabilityButton = document.createElement("button");
    availabilityButton.type = "button";
    availabilityButton.className = "button button-secondary inventory-availability-button";
    availabilityButton.textContent = product.is_active === false ? "Restore to Storefront" : "Remove from Storefront";
    availabilityButton.dataset.toggleProduct = String(product.id);
    availabilityButton.dataset.nextActive = String(product.is_active === false);
    actions.appendChild(availabilityButton);

    const editor = document.createElement("div");
    editor.className = "inventory-product-editor";
    editor.dataset.productEditor = String(product.id);
    editor.hidden = true;
    const editNameLabel = document.createElement("label");
    editNameLabel.className = "inventory-edit-field";
    editNameLabel.textContent = "Product name";
    const editName = document.createElement("input");
    editName.type = "text";
    editName.required = true;
    editName.value = String(product.name || "");
    editName.dataset.productField = "name";
    editNameLabel.appendChild(editName);
    const editCategory = makeInventoryCategorySelect(product.category, "category", "Category");
    const editPriceLabel = document.createElement("label");
    editPriceLabel.className = "inventory-edit-field";
    editPriceLabel.textContent = "Price (GHS)";
    const editPrice = document.createElement("input");
    editPrice.type = "number";
    editPrice.min = "0.01";
    editPrice.step = "0.01";
    editPrice.required = true;
    editPrice.value = String(Number(product.price || 0));
    editPrice.dataset.productField = "price";
    editPriceLabel.appendChild(editPrice);
    const editImageLabel = document.createElement("label");
    editImageLabel.className = "inventory-edit-field inventory-edit-image-field";
    editImageLabel.textContent = "Replace image (optional)";
    const editImage = document.createElement("input");
    editImage.type = "file";
    editImage.accept = "image/jpeg,image/png,image/webp";
    editImage.dataset.productImageFile = String(product.id);
    editImageLabel.appendChild(editImage);
    const editorFields = document.createElement("div");
    editorFields.className = "inventory-editor-fields";
    editorFields.append(editNameLabel, editCategory, editPriceLabel, editImageLabel);
    const editorActions = document.createElement("div");
    editorActions.className = "inventory-editor-actions";
    const saveButton = document.createElement("button");
    saveButton.type = "button";
    saveButton.className = "button button-primary";
    saveButton.textContent = "Save Changes";
    saveButton.dataset.saveProduct = String(product.id);
    const cancelButton = document.createElement("button");
    cancelButton.type = "button";
    cancelButton.className = "button button-secondary";
    cancelButton.textContent = "Cancel";
    cancelButton.dataset.cancelProductEdit = String(product.id);
    editorActions.append(saveButton, cancelButton);
    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.className = "button inventory-delete-button";
    deleteButton.dataset.deleteProduct = String(product.id);
    deleteButton.setAttribute("aria-label", `Delete ${product.name} permanently from catalogue`);
    deleteButton.title = `Delete ${product.name} from catalogue`;
    deleteButton.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7"/></svg>';
    actions.appendChild(deleteButton);
    const cardFeedback = document.createElement("p");
    cardFeedback.className = "inventory-card-feedback";
    cardFeedback.setAttribute("role", "status");
    cardFeedback.setAttribute("aria-live", "polite");
    editor.append(editorFields, editorActions, cardFeedback);

    card.append(previewArea, summary, actions, editor);
    inventoryRows.appendChild(card);
  });

  const productCount = document.querySelector("#product-count");
  const restockCount = document.querySelector("#restock-count");
  const lowStock = inventory.filter(product => Number(product.stock || 0) <= 10).length;
  if (productCount) productCount.textContent = `${inventory.length} ${inventory.length === 1 ? "product" : "products"}`;
  if (restockCount) restockCount.textContent = `${lowStock} NEED RESTOCK`;
}

inventorySearch?.addEventListener("input", renderInventory);
inventoryCategoryFilter?.addEventListener("change", renderInventory);

function activateInventoryTab(tabName, moveFocus = false) {
  document.querySelectorAll("[data-inventory-tab]").forEach(tab => {
    const selected = tab.dataset.inventoryTab === tabName;
    tab.setAttribute("aria-selected", String(selected));
    tab.tabIndex = selected ? 0 : -1;
    if (selected && moveFocus) tab.focus();
  });
  document.querySelectorAll("[data-inventory-panel]").forEach(panel => {
    panel.hidden = panel.dataset.inventoryPanel !== tabName;
  });
}

document.querySelector(".inventory-tabs")?.addEventListener("click", event => {
  const tab = event.target.closest("[data-inventory-tab]");
  if (tab) activateInventoryTab(tab.dataset.inventoryTab);
});

document.querySelector(".inventory-tabs")?.addEventListener("keydown", event => {
  const tabs = [...document.querySelectorAll("[data-inventory-tab]")];
  const currentIndex = tabs.indexOf(event.target.closest("[data-inventory-tab]"));
  if (currentIndex < 0) return;
  let nextIndex = currentIndex;
  if (event.key === "ArrowRight") nextIndex = (currentIndex + 1) % tabs.length;
  else if (event.key === "ArrowLeft") nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
  else if (event.key === "Home") nextIndex = 0;
  else if (event.key === "End") nextIndex = tabs.length - 1;
  else return;
  event.preventDefault();
  activateInventoryTab(tabs[nextIndex].dataset.inventoryTab, true);
});

inventoryRows?.addEventListener("change", event => {
  const input = event.target.closest("[data-product-image-file]");
  if (!input) return;
  const card = input.closest(".inventory-product-card");
  const preview = card?.querySelector(".inventory-product-image");
  const placeholder = card?.querySelector(".inventory-image-placeholder");
  const feedback = card?.querySelector(".inventory-card-feedback");
  const file = input.files?.[0];
  if (card?.dataset.selectedPreviewUrl) URL.revokeObjectURL(card.dataset.selectedPreviewUrl);
  if (card) card.dataset.selectedPreviewUrl = "";
  if (!file) return;
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 5 * 1024 * 1024) {
    input.value = "";
    if (feedback) feedback.textContent = "Choose a JPEG, PNG or WebP image up to 5 MB.";
    return;
  }
  const previewUrl = URL.createObjectURL(file);
  card.dataset.selectedPreviewUrl = previewUrl;
  preview.src = previewUrl;
  preview.hidden = false;
  placeholder.hidden = true;
  if (feedback) feedback.textContent = "Image preview updated. Save changes to upload it.";
});

inventoryRows?.addEventListener("click", async event => {
  const button = event.target.closest("button");
  if (!button) return;
  const card = button.closest(".inventory-product-card");

  if (button.matches("[data-edit-product]")) {
    const editor = card?.querySelector("[data-product-editor]");
    if (editor) {
      editor.hidden = false;
      button.hidden = true;
      editor.querySelector('[data-product-field="name"]')?.focus();
    }
    return;
  }

  if (button.matches("[data-cancel-product-edit]")) {
    const editor = card?.querySelector("[data-product-editor]");
    const editButton = card?.querySelector("[data-edit-product]");
    const preview = card?.querySelector(".inventory-product-image");
    const placeholder = card?.querySelector(".inventory-image-placeholder");
    const imageInput = card?.querySelector("[data-product-image-file]");
    if (card?.dataset.selectedPreviewUrl) URL.revokeObjectURL(card.dataset.selectedPreviewUrl);
    if (card) card.dataset.selectedPreviewUrl = "";
    if (imageInput) imageInput.value = "";
    if (card?.dataset.originalImageUrl) {
      preview.src = card.dataset.originalImageUrl;
      preview.hidden = false;
      placeholder.hidden = true;
    } else {
      preview.removeAttribute("src");
      preview.hidden = true;
      placeholder.hidden = false;
    }
    if (editor) editor.hidden = true;
    if (editButton) editButton.hidden = false;
    const feedback = card?.querySelector(".inventory-card-feedback");
    if (feedback) feedback.textContent = "";
    return;
  }

  if (button.matches("[data-save-product]")) {
    if (!accessToken || !card) return;
    const id = button.dataset.saveProduct;
    const value = field => card.querySelector(`[data-product-field="${field}"]`)?.value ?? "";
    const name = String(value("name")).trim();
    const category = String(value("category")).trim();
    const price = Number(value("price"));
    const feedback = card.querySelector(".inventory-card-feedback");
    if (!name || !category || !Number.isFinite(price) || price <= 0) {
      if (feedback) feedback.textContent = "Enter a product name, category and positive price.";
      return;
    }
    const imageFile = card.querySelector(`[data-product-image-file="${CSS.escape(id)}"]`)?.files?.[0];
    const originalProduct = inventory.find(product => String(product.id) === String(id));
    button.disabled = true;
    if (feedback) feedback.textContent = imageFile ? "Uploading image and saving product details…" : "Saving product details…";
    try {
      const updates = { name, category, price };
      if (imageFile) {
        const image = await uploadProductImage(imageFile);
        updates.image = image;
      }
      const response = await fetch(`${API_URL}/api/products/${encodeURIComponent(id)}`, {
        method: "PATCH", headers: authHeaders(), body: JSON.stringify(updates)
      });
      const result = await response.json();
      if (!response.ok || result.success === false) throw new Error(result.error || "Failed to save product details.");
      const message = imageFile ? "Product details and image saved." : "Product details saved.";
      await loadInventory();
      if (inventoryListFeedback) inventoryListFeedback.textContent = `${originalProduct?.name || name}: ${message}`;
    } catch (error) {
      if (feedback) feedback.textContent = error.message || "Failed to save product details.";
      button.disabled = false;
    }
    return;
  }

  if (button.matches("[data-toggle-product]")) {
    if (!accessToken) return;
    const id = button.dataset.toggleProduct;
    const product = inventory.find(item => String(item.id) === String(id));
    const isActive = button.dataset.nextActive === "true";
    if (!isActive && !window.confirm(`Hide ${product?.name || "this product"} from the storefront? The product record and order history will remain.`)) return;
    button.disabled = true;
    if (inventoryListFeedback) inventoryListFeedback.textContent = isActive ? "Restoring product to the storefront…" : "Hiding product from the storefront…";
    try {
      const response = await fetch(`${API_URL}/api/products/${encodeURIComponent(id)}`, {
        method: "PATCH", headers: authHeaders(), body: JSON.stringify({ is_active: isActive })
      });
      const result = await response.json();
      if (!response.ok || result.success === false) throw new Error(result.error || "Could not update storefront availability.");
      await loadInventory();
      if (inventoryListFeedback) inventoryListFeedback.textContent = isActive ? "Product restored. It will appear after its image loads." : "Product hidden from the storefront.";
    } catch (error) {
      button.disabled = false;
      if (inventoryListFeedback) inventoryListFeedback.textContent = error.message || "Could not update storefront availability.";
    }
    return;
  }

  if (button.matches("[data-delete-product]")) {
    if (!accessToken) return;
    const product = inventory.find(item => String(item.id) === button.dataset.deleteProduct);
    const name = product?.name || "this product";
    if (!window.confirm(`Permanently delete ${name}? This permanently removes the product from the active catalogue. Historical orders and receipts will be preserved.`)) return;
    button.disabled = true;
    if (inventoryListFeedback) inventoryListFeedback.textContent = `Removing ${name} from the catalogue…`;
    try {
      const response = await fetch(`${API_URL}/api/products/${encodeURIComponent(button.dataset.deleteProduct)}`, {
        method: "DELETE", headers: authHeaders()
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error || "Could not safely delete this product.");
      await loadInventory();
      if (inventoryListFeedback) inventoryListFeedback.textContent = `${name} was permanently deleted.`;
    } catch (error) {
      button.disabled = false;
      if (inventoryListFeedback) inventoryListFeedback.textContent = error.message || "Could not safely delete this product.";
    }
  }
});

/* -----------------------------
   ADD PRODUCT
----------------------------- */

if (inventoryForm) {
  let addProductPreviewUrl = "";
  const addImageInput = inventoryForm.querySelector('[name="image_file"]');
  inventoryForm.addEventListener("reset", () => {
    if (addProductPreviewUrl) URL.revokeObjectURL(addProductPreviewUrl);
    addProductPreviewUrl = "";
    const preview = document.querySelector("#inventory-upload-preview");
    const image = document.querySelector("#inventory-upload-preview-image");
    if (preview) preview.hidden = true;
    if (image) image.removeAttribute("src");
    if (inventoryFeedback) inventoryFeedback.textContent = "";
  });
  addImageInput?.addEventListener("change", () => {
    const file = addImageInput.files?.[0];
    const preview = document.querySelector("#inventory-upload-preview");
    const image = document.querySelector("#inventory-upload-preview-image");
    if (addProductPreviewUrl) URL.revokeObjectURL(addProductPreviewUrl);
    addProductPreviewUrl = "";
    if (!file) { preview.hidden = true; return; }
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 5 * 1024 * 1024) {
      addImageInput.value = "";
      preview.hidden = true;
      if (inventoryFeedback) inventoryFeedback.textContent = "Choose a JPEG, PNG or WebP image up to 5 MB.";
      return;
    }
    addProductPreviewUrl = URL.createObjectURL(file);
    image.src = addProductPreviewUrl;
    preview.hidden = false;
  });
  inventoryForm.addEventListener(
    "submit",
    async (event) => {
      event.preventDefault();

      if (!accessToken) {
        return;
      }

      const formData =
        new FormData(inventoryForm);

      const name =
        String(
          formData.get("name") || ""
        ).trim();

      const category =
        String(
          formData.get("category") || ""
        ).trim();

      const price =
        Number(
          formData.get("price")
        );

      let image = null;
      const imageFile = formData.get("image_file");

      if (!name || !category) {
        if (inventoryFeedback) {
          inventoryFeedback.textContent =
            "Name and category are required.";
        }
        return;
      }

      if (!Number.isFinite(price) || price <= 0) {
        if (inventoryFeedback) {
          inventoryFeedback.textContent =
            "Enter a valid price.";
        }
        return;
      }

      if (!(imageFile instanceof File) || imageFile.size === 0) {
        if (inventoryFeedback) inventoryFeedback.textContent = "Select a product image before publishing.";
        return;
      }

      const submitButton = inventoryForm.querySelector('[type="submit"]');
      if (submitButton) submitButton.disabled = true;

      if (inventoryFeedback) {
        inventoryFeedback.textContent =
          "Saving product...";
      }

      try {
        if (inventoryFeedback) inventoryFeedback.textContent = "Uploading product image…";
        image = await uploadProductImage(imageFile);
        const response =
          await fetch(
            `${API_URL}/api/products`,
            {
              method: "POST",
              headers: authHeaders(),
              body: JSON.stringify({
                name,
                category,
                price,
                image
              })
            }
          );

        const result =
          await response.json();

        if (!response.ok) {
          throw new Error(
            result.error ||
            "Failed to add product"
          );
        }

        inventoryForm.reset();
        document.querySelector("#inventory-upload-preview").hidden = true;
        if (addProductPreviewUrl) URL.revokeObjectURL(addProductPreviewUrl);
        addProductPreviewUrl = "";

        if (inventoryFeedback) {
          inventoryFeedback.textContent =
            `${name} added successfully.`;
        }

        await loadInventory();

      } catch (error) {
        console.error(
          "Add product error:",
          error
        );

        if (inventoryFeedback) {
          inventoryFeedback.textContent =
            error.message ||
            "Failed to add product.";
        }
      } finally {
        const submitButton = inventoryForm.querySelector('[type="submit"]');
        if (submitButton) submitButton.disabled = false;
      }
    }
  );
}

/* -----------------------------
   LOAD ORDERS
----------------------------- */

async function loadOrders() {
  const ordersContainer =
    document.querySelector("#orders-container");

  const ordersRows =
    document.querySelector("#orders-active-rows");

  if (!accessToken) return;

  try {
    if (!inventory.length) {
      try {
        const productsResponse = await fetch(`${API_URL}/api/products?include_inactive=true`, { headers: authHeaders() });
        if (productsResponse.ok) {
          const productsResult = await productsResponse.json();
          inventory = Array.isArray(productsResult.products) ? productsResult.products : [];
        }
      } catch (error) {
        console.warn("Product thumbnails are temporarily unavailable in orders.", error);
      }
    }
    const response =
      await fetch(
        `${API_URL}/api/orders`,
        {
          headers: {
            Authorization:
              `Bearer ${accessToken}`
          }
        }
      );

    const result =
      await response.json();

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) clearStaffSession();
      throw new Error(
        result.error ||
        "Failed to load orders"
      );
    }

    orders = groupOrdersById(Array.isArray(result.orders) ? result.orders : [])
      .sort((a, b) => Date.parse(b.created_at || "") - Date.parse(a.created_at || ""));

    updateOrderView();
    const navCount = document.querySelector("#orders-count");
    if (navCount) navCount.textContent = String(orders.filter(isActiveFulfillmentOrder).length);
    lastOrdersRefreshAt = Date.now();
    const refreshedAt = document.querySelector("#orders-refreshed-at");
    if (refreshedAt) refreshedAt.textContent = `Updated ${new Date(lastOrdersRefreshAt).toLocaleString()}`;
    updateOrderMetrics();

  } catch (error) {
    console.error(
      "Orders error:",
      error
    );
    for (const rows of [ordersRows, document.querySelector("#orders-history-rows")]) {
      if (!rows) continue;
      rows.replaceChildren();
      const message = document.createElement("p");
      message.className = "orders-empty";
      message.setAttribute("role", "status");
      message.textContent = error.message || "Failed to load orders.";
      rows.appendChild(message);
      updateOrderSectionToggle(rows, rows.closest(".orders-bucket")?.querySelector("[data-orders-toggle-all]"));
    }
  }
}

if (adminForm) {
  adminForm.addEventListener("submit", async event => {
    event.preventDefault();
    if (!accessToken) return;
    const values = Object.fromEntries(new FormData(adminForm).entries());
    if (adminFeedback) adminFeedback.textContent = "Creating staff account…";
    try {
      const response = await fetch(`${API_URL}/api/staff`, {
        method: "POST", headers: authHeaders(),
        body: JSON.stringify({
          full_name: String(values.full_name || "").trim(),
          login_name: String(values.login_name || "").trim(),
          password: String(values.password || "")
        })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Failed to create admin account.");
      adminForm.reset();
      if (adminFeedback) adminFeedback.textContent = "Admin account created successfully.";
    } catch (error) {
      if (adminFeedback) adminFeedback.textContent = error.message;
    }
  });
}

/* -----------------------------
   RENDER ORDERS
----------------------------- */

function groupOrdersById(rows) {
  const grouped = new Map();
  rows.forEach((source, index) => {
    const key = source?.id == null ? `unkeyed-${index}` : String(source.id);
    const order = { ...source, order_items: Array.isArray(source?.order_items) ? [...source.order_items] : [] };
    if (!grouped.has(key)) {
      grouped.set(key, order);
      return;
    }
    const existing = grouped.get(key);
    const knownItemIds = new Set(existing.order_items.filter(item => item?.id != null).map(item => String(item.id)));
    order.order_items.forEach(item => {
      const itemId = item?.id == null ? null : String(item.id);
      if (itemId == null || !knownItemIds.has(itemId)) {
        existing.order_items.push(item);
        if (itemId != null) knownItemIds.add(itemId);
      }
    });
    grouped.set(key, { ...existing, ...order, order_items: existing.order_items });
  });
  return [...grouped.values()];
}

function updateOrderView() {
  renderOrders();
  const count = document.querySelector("#orders-page-count");
  if (count) {
    const search = String(document.querySelector("#orders-search-input")?.value || "").trim();
    const visibleOrders = filterOrders(search);
    const activeCount = visibleOrders.filter(isActiveFulfillmentOrder).length;
    const historyCount = visibleOrders.filter(isHistoryOrder).length;
    count.textContent = `${activeCount} active · ${historyCount} in history`;
  }
}

function updateOrderMetrics() {
  const today = new Date();
  const isToday = value => {
    const date = new Date(value);
    return Number.isFinite(date.getTime()) && date.getFullYear() === today.getFullYear() && date.getMonth() === today.getMonth() && date.getDate() === today.getDate();
  };
  const isProcessed = order => /processing|processed|sorted|complete|delivered|fulfilled|ready/i.test(String(order.status || ""));
  const isFailed = order => /failed|cancel|refund/i.test(`${order.status || ""} ${order.payment_status || ""}`);
  const paidOrders = orders.filter(order => String(order.payment_status || "").toLowerCase() === "paid");
  const values = [
    ["#orders-today-count", orders.filter(order => isToday(order.created_at)).length],
    ["#orders-pending-count", orders.filter(order => !isProcessed(order) && !isFailed(order)).length],
    ["#sales-total", `GHS ${paidOrders.reduce((sum, order) => sum + Number(order.total_amount || 0), 0).toFixed(2)}`]
  ];
  values.forEach(([selector, value]) => {
    const element = document.querySelector(selector);
    if (element) element.textContent = String(value);
  });
}

function formatOrderMoney(value) {
  const amount = Number(value || 0);
  return `GHS ${Number.isFinite(amount) ? amount.toLocaleString("en-GH", { maximumFractionDigits: 2 }) : "0"}`;
}

function filterOrders(query) {
  const normalized = String(query || "").trim().toLowerCase();
  if (!normalized) return orders;
  const digits = normalized.replace(/\D/g, "");
  return orders.filter(order => {
    const customerText = `${order.customer_name || ""} ${order.email || ""} ${order.phone || ""}`.toLowerCase();
    if (customerText.includes(normalized) || (digits && String(order.phone || "").replace(/\D/g, "").includes(digits))) return true;
    return `${order.order_number || ""} ${order.id || ""}`.toLowerCase().includes(normalized);
  });
}

function isHistoryOrder(order) {
  return ["completed", "canceled", "cancelled"].includes(String(order.status || "").trim().toLowerCase()) || isPaymentIssueOrder(order);
}

function isPaymentIssueOrder(order) {
  const paymentStatus = String(order.payment_status || "").trim().toLowerCase();
  const orderStatus = String(order.status || "").trim().toLowerCase();
  return ["failed", "failure", "declined", "error"].includes(paymentStatus) || /^(?:payment setup failed|payment failed)$/.test(orderStatus);
}

function isActiveFulfillmentOrder(order) {
  return !isHistoryOrder(order);
}

function canCompleteOrder(order) {
  return String(order.payment_status || "").trim().toLowerCase() === "paid";
}

function orderStatusActions(order, historical) {
  if (historical) return [];
  const actions = [];
  if (canCompleteOrder(order)) actions.push(["Completed", "Complete Order", "button-primary"]);
  actions.push(["Canceled", "Cancel Order", "button-secondary"]);
  return actions;
}

function orderHistoryStatus(order) {
  const status = String(order.status || "").trim();
  const normalizedStatus = status.toLowerCase();
  if (["completed", "canceled", "cancelled"].includes(normalizedStatus)) return status;
  if (isPaymentIssueOrder(order)) {
    if (/failed|failure|declined|error/i.test(status)) return status;
    return String(order.payment_status || status || "Failed payment").trim();
  }
  return status || "Completed";
}

function toggleOrderCardDetails(card, button, details) {
  const expanded = card.dataset.expanded === "true";
  card.dataset.expanded = String(!expanded);
  button.setAttribute("aria-expanded", String(!expanded));
  button.textContent = expanded ? "View" : "Hide";
  details.setAttribute("aria-hidden", String(expanded));
  details.inert = expanded;
}

function updateOrderSectionToggle(container, sectionToggle) {
  if (!container || !sectionToggle) return;
  const cards = [...container.querySelectorAll(".admin-order-card")];
  const allExpanded = cards.length > 0 && cards.every(card => card.dataset.expanded === "true");
  const sectionName = {
    active: "active orders",
    history: "order history"
  }[sectionToggle.dataset.ordersToggleAll] || "orders";
  sectionToggle.disabled = cards.length === 0;
  sectionToggle.textContent = allExpanded ? "Hide All" : "View All";
  sectionToggle.setAttribute("aria-expanded", String(allExpanded));
  sectionToggle.setAttribute("aria-label", cards.length ? `${allExpanded ? "Hide" : "View"} all ${sectionName}` : `No ${sectionName} to expand`);
}

function setOrderSectionExpanded(container, sectionToggle, expanded) {
  if (!container || !sectionToggle) return;
  container.querySelectorAll(".admin-order-card").forEach(card => {
    const button = card.querySelector("[data-order-toggle]");
    const details = card.querySelector("[data-order-details]");
    if (button && details && (card.dataset.expanded === "true") !== expanded) {
      toggleOrderCardDetails(card, button, details);
    }
  });
  updateOrderSectionToggle(container, sectionToggle);
}

function appendField(container, label, value, className = "") {
  const field = document.createElement("div");
  if (className) field.className = className;
  const caption = document.createElement("span");
  caption.textContent = label;
  const content = document.createElement("strong");
  content.textContent = String(value || "—");
  field.append(caption, content);
  container.appendChild(field);
}

function appendOrderCard(container, order, historical) {
  const card = document.createElement("article");
  card.className = "admin-order-card";
  card.dataset.orderId = String(order.id ?? "");
  card.dataset.expanded = "false";
  card.setAttribute("role", "listitem");
  const header = document.createElement("header");
  header.className = "admin-order-card-header";
  const customerFields = document.createElement("div");
  customerFields.className = "order-customer-fields";
  appendField(customerFields, "Customer", order.customer_name);
  appendField(customerFields, "Phone", order.phone);
  appendField(customerFields, "Order number", order.order_number || (order.id != null ? `KH-${order.id}` : "Order"));
  header.appendChild(customerFields);
  card.appendChild(header);

  const detailsId = `order-details-${String(order.id ?? order.order_number ?? "order").replace(/[^a-zA-Z0-9_-]/g, "-")}`;
  const summary = document.createElement("section");
  summary.className = "order-card-summary";
  summary.setAttribute("aria-label", "Order summary");
  appendField(summary, "Order date", formatDate(order.created_at) || "Date unavailable");
  appendField(summary, "Order total", formatOrderMoney(order.total_amount), "order-summary-total");
  appendField(summary, "Payment status", order.payment_status);
  const toggle = document.createElement("button");
  toggle.type = "button";
  toggle.className = "button button-secondary order-view-toggle";
  toggle.dataset.orderToggle = "";
  toggle.setAttribute("aria-controls", detailsId);
  toggle.setAttribute("aria-expanded", "false");
  toggle.textContent = "View";
  summary.appendChild(toggle);
  card.appendChild(summary);

  const details = document.createElement("div");
  details.className = "order-details-panel";
  details.id = detailsId;
  details.dataset.orderDetails = "";
  details.setAttribute("aria-hidden", "true");
  details.inert = true;
  const detailsInner = document.createElement("div");
  detailsInner.className = "order-details-inner";
  const body = document.createElement("section");
  body.className = "admin-order-card-body";
  if (String(order.email || "").trim()) {
    const expandedCustomer = document.createElement("div");
    expandedCustomer.className = "order-expanded-customer";
    appendField(expandedCustomer, "Customer email", order.email);
    body.appendChild(expandedCustomer);
  }
  const itemsHeading = document.createElement("h3");
  itemsHeading.className = "order-items-heading";
  itemsHeading.textContent = "Items Ordered";
  body.appendChild(itemsHeading);
  const items = Array.isArray(order.order_items) ? order.order_items : [];
  card.dataset.itemCount = String(items.length);
  card.dataset.longOrder = String(items.length > 2);
  const itemList = document.createElement("div");
  itemList.className = "order-products-list";
  itemList.setAttribute("aria-label", `Items ordered for ${order.order_number || `KH-${order.id}`}`);
  items.forEach(item => {
    const itemRow = document.createElement("div");
    itemRow.className = "order-product-row";
    const catalogueProduct = inventory.find(product => String(product.id) === String(item.product_id)) || {};
    const imageProduct = { ...catalogueProduct, id: item.product_id ?? catalogueProduct.id, image: catalogueProduct.image || item.product_image || item.image || "" };
    const imageUrl = productImageUrl(imageProduct, "../frontend/product-images/");
    const thumbnail = document.createElement("div");
    thumbnail.className = "order-product-thumbnail";
    if (imageUrl) {
      const image = document.createElement("img");
      image.className = "order-product-image";
      image.src = imageUrl;
      image.alt = "";
      image.loading = "lazy";
      image.addEventListener("error", () => {
        const fallback = document.createElement("span");
        fallback.className = "order-product-image-missing";
        fallback.textContent = "No photo";
        thumbnail.replaceChildren(fallback);
      }, { once: true });
      thumbnail.appendChild(image);
    } else {
      const fallback = document.createElement("span");
      fallback.className = "order-product-image-missing";
      fallback.textContent = "No photo";
      thumbnail.appendChild(fallback);
    }
    itemRow.appendChild(thumbnail);
    const productInfo = document.createElement("div");
    productInfo.className = "order-product-info";
    const productName = document.createElement("strong");
    productName.textContent = String(item.product_name || catalogueProduct.name || "Product name unavailable");
    productInfo.appendChild(productName);
    const size = document.createElement("span");
    size.textContent = `Size: ${String(item.size || "N/A")}`;
    productInfo.appendChild(size);
    itemRow.appendChild(productInfo);
    const numbers = document.createElement("div");
    numbers.className = "order-product-numbers";
    [["Quantity", `×${Number(item.quantity || 0)}`], ["Unit price", formatOrderMoney(item.price)], ["Line total", formatOrderMoney(Number(item.price || 0) * Number(item.quantity || 0))]].forEach(([label, value]) => appendField(numbers, label, value));
    itemRow.appendChild(numbers);
    itemList.appendChild(itemRow);
  });
  if (!items.length) {
    const empty = document.createElement("p");
    empty.className = "order-items-empty";
    empty.textContent = "No order item details were returned by the backend.";
    itemList.appendChild(empty);
  }
  body.appendChild(itemList);

  const footer = document.createElement("footer");
  footer.className = "admin-order-card-footer";
  const meta = document.createElement("div");
  meta.className = "order-card-meta";
  if (order.payment_method) appendField(meta, "Payment method", order.payment_method);
  if (order.payment_reference) appendField(meta, "Payment reference", order.payment_reference);
  if (historical) {
    appendField(meta, "Order status", orderHistoryStatus(order));
    const statusDate = order.completed_at || order.canceled_at || order.status_updated_at || order.updated_at;
    if (statusDate) appendField(meta, "Status date", formatDate(statusDate));
  }
  footer.appendChild(meta);
  if (!historical) {
    const actions = document.createElement("div");
    actions.className = "order-actions";
    const availableActions = orderStatusActions(order, historical);
    availableActions.forEach(([status, label, style]) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = `button ${style}`;
      button.dataset.orderAction = status;
      button.dataset.orderId = String(order.id ?? "");
      button.textContent = label;
      actions.appendChild(button);
    });
    footer.appendChild(actions);
  }
  detailsInner.append(body, footer);
  details.appendChild(detailsInner);
  card.appendChild(details);
  container.appendChild(card);
}

function renderOrderSection(container, ordersForSection, historical, hasAnyOrders) {
  container.replaceChildren();
  const sectionToggle = container.closest(".orders-bucket")?.querySelector("[data-orders-toggle-all]");
  if (!ordersForSection.length) {
    const empty = document.createElement("p");
    empty.className = "orders-empty";
    empty.setAttribute("role", "status");
    empty.textContent = hasAnyOrders ? "No orders match your search." : historical ? "Completed, canceled, and failed-payment orders will appear here." : "No active orders.";
    container.appendChild(empty);
    updateOrderSectionToggle(container, sectionToggle);
    return;
  }
  [...ordersForSection]
    .sort((a, b) => Date.parse(b.created_at || "") - Date.parse(a.created_at || ""))
    .forEach(order => appendOrderCard(container, order, historical));
  updateOrderSectionToggle(container, sectionToggle);
}

function renderOrders() {
  const activeRows = document.querySelector("#orders-active-rows");
  const historyRows = document.querySelector("#orders-history-rows");
  if (!activeRows || !historyRows) return;
  const search = String(document.querySelector("#orders-search-input")?.value || "").trim();
  const visibleOrders = filterOrders(search);
  const activeOrders = visibleOrders.filter(isActiveFulfillmentOrder);
  renderOrderSection(activeRows, activeOrders, false, visibleOrders.length > 0);
  const historySearch = String(document.querySelector("#history-search-input")?.value || "").trim().toLowerCase();
  const historyMatches = orders.filter(isHistoryOrder).filter(order => !historySearch || JSON.stringify([order.customer_name, order.email, order.phone, order.order_number]).toLowerCase().includes(historySearch));
  renderOrderSection(historyRows, historyMatches, true, orders.length > 0);
}

document.addEventListener("click", async event => {
  const sectionToggle = event.target.closest("[data-orders-toggle-all]");
  if (sectionToggle) {
    const rows = sectionToggle.closest(".orders-bucket")?.querySelector(".orders-list");
    if (!rows) return;
    setOrderSectionExpanded(rows, sectionToggle, sectionToggle.getAttribute("aria-expanded") !== "true");
    return;
  }
  const toggle = event.target.closest("[data-order-toggle]");
  if (toggle) {
    const card = toggle.closest(".admin-order-card");
    const details = card?.querySelector("[data-order-details]");
    if (!card || !details) return;
    toggleOrderCardDetails(card, toggle, details);
    updateOrderSectionToggle(card.closest(".orders-list"), card.closest(".orders-bucket")?.querySelector("[data-orders-toggle-all]"));
    return;
  }
  const button = event.target.closest("[data-order-action]");
  if (!button || !accessToken) return;
  const status = button.dataset.orderAction;
  if (status === "Canceled" && !window.confirm("Cancel this order? This will move it to Order History.")) return;
  button.disabled = true;
  const feedback = document.querySelector("#orders-feedback");
  if (feedback) feedback.textContent = `Saving ${status.toLowerCase()} status…`;
  try {
    const response = await fetch(`${API_URL}/api/orders/${encodeURIComponent(button.dataset.orderId)}/status`, {
      method: "PATCH", headers: authHeaders(), body: JSON.stringify({ status })
    });
    const result = await response.json();
    if (!response.ok || !result.success) throw new Error(result.error || "Could not update this order.");
    orders = orders.map(order => String(order.id) === String(result.order.id) ? { ...order, ...result.order } : order);
    updateOrderView();
    updateOrderMetrics();
    const navCount = document.querySelector("#orders-count");
    if (navCount) navCount.textContent = String(orders.filter(isActiveFulfillmentOrder).length);
    if (feedback) feedback.textContent = `${result.order.order_number || `KH-${result.order.id}`} moved to Order History.`;
  } catch (error) {
    if (feedback) feedback.textContent = error.message || "Could not update this order.";
    button.disabled = false;
  }
});

document.querySelector("#orders-search-input")?.addEventListener("input", updateOrderView);

document.addEventListener("click", async event => {
  const refreshButton = event.target.closest("#refresh-orders");
  if (refreshButton && accessToken) {
    refreshButton.disabled = true;
    try { await loadOrders(); }
    finally { refreshButton.disabled = false; }
  }
});
setInterval(() => {
  if (accessToken) loadOrders();
}, 24 * 60 * 60 * 1000);

document.addEventListener("visibilitychange", () => {
  if (!document.hidden && accessToken && Date.now() - lastOrdersRefreshAt >= 24 * 60 * 60 * 1000) loadOrders();
});

/* -----------------------------
   CHANGE PASSWORD
----------------------------- */

if (changePasswordForm) {
  changePasswordForm.addEventListener(
    "submit",
    async (event) => {
      event.preventDefault();

      if (!accessToken) {
        return;
      }

      const newPassword =
        document.querySelector(
          "#new-password"
        )?.value || "";

      const confirmPassword =
        document.querySelector(
          "#confirm-password"
        )?.value || "";

      if (newPassword.length < 8) {
        if (passwordFeedback) {
          passwordFeedback.textContent =
            "Password must be at least 8 characters.";
        }
        return;
      }

      if (newPassword !== confirmPassword) {
        if (passwordFeedback) {
          passwordFeedback.textContent =
            "Passwords do not match.";
        }
        return;
      }

      try {
        const response =
          await fetch(
            `${API_URL}/api/staff/password`,
            {
              method: "POST",
              headers: authHeaders(),
              body: JSON.stringify({
                new_password: newPassword
              })
            }
          );

        const result =
          await response.json();

        if (!response.ok) {
          throw new Error(
            result.error ||
            "Failed to change password."
          );
        }

        changePasswordForm.reset();

        if (passwordFeedback) {
          passwordFeedback.textContent =
            "Password changed successfully.";
        }

      } catch (error) {
        console.error(
          "Password error:",
          error
        );

        if (passwordFeedback) {
          passwordFeedback.textContent =
            error.message ||
            "Failed to change password.";
        }
      }
    }
  );
}

/* -----------------------------
   LOGOUT
----------------------------- */

if (logoutButton) {
  logoutButton.addEventListener(
    "click",
    () => {
      clearStaffSession();
      if (loginForm) {
        loginForm.reset();
      }

      if (loginError) {
        loginError.textContent = "";
      }

      showScreen("login");
    }
  );
}

/* -----------------------------
   DASHBOARD NAVIGATION
----------------------------- */

function showDashboardView(viewName) {
  document
    .querySelectorAll(".dashboard-view")
    .forEach((view) => {
      view.classList.toggle(
        "is-hidden",
        view.id !== `view-${viewName}`
      );
    });

  document
    .querySelectorAll(".nav-item")
    .forEach((button) => {
      const active =
        button.dataset.view === viewName;

      button.classList.toggle(
        "is-active",
        active
      );

      button.setAttribute(
        "aria-current",
        active ? "page" : "false"
      );
    });

  const currentSection =
    document.querySelector(
      "#current-section"
    );

  if (currentSection) {
    currentSection.textContent =
      viewName
        .replace(/-/g, " ")
        .replace(/\b\w/g, (letter) =>
          letter.toUpperCase()
        );
  }

  if (viewName === "orders") {
    loadOrders();
  }

  if (viewName === "inventory") {
    loadInventory();
  }
}

document.querySelectorAll("[data-view]").forEach(button => {
  button.addEventListener("click", () => {
    const viewName = button.dataset.view;
    if (document.querySelector(`#view-${CSS.escape(viewName)}`)) {
      showDashboardView(viewName);
    }
  });
});

/* -----------------------------
   HELPERS
----------------------------- */

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatDate(value) {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat(
    "en-GH",
    {
      dateStyle: "medium",
      timeStyle: "short"
    }
  ).format(date);
}

/* -----------------------------
   INITIAL STATE
----------------------------- */

showScreen("login");
restoreStaffSession();

 document.querySelector("#history-search-input")?.addEventListener("input", updateOrderView);
 document.querySelector("#toggle-order-history")?.addEventListener("click", event => {
   const panel = document.querySelector("#overview-order-history");
   panel.hidden = !panel.hidden;
   event.currentTarget.setAttribute("aria-expanded", String(!panel.hidden));
   event.currentTarget.textContent = panel.hidden ? "View Order History" : "Hide Order History";
 });
