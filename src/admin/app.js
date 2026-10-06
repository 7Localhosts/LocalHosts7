const API_URL = "http://localhost:8000";

/* -----------------------------
   STATE
----------------------------- */

let accessToken = null;
let currentUser = null;
let inventory = [];
let orders = [];

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
      await loadInventory();

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

  const userName =
    document.querySelector("#user-name");

  const greetingName =
    document.querySelector("#greeting-name");

  const userAvatar =
    document.querySelector("#user-avatar");

  if (userName) {
    userName.textContent =
      currentUser.full_name;
  }

  if (greetingName) {
    greetingName.textContent =
      currentUser.full_name.split(" ")[0];
  }

  if (userAvatar) {
    userAvatar.textContent =
      currentUser.full_name
        .split(" ")
        .map((part) => part[0])
        .join("")
        .toUpperCase();
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

/* -----------------------------
   LOAD INVENTORY
----------------------------- */

async function loadInventory() {
  if (!inventoryRows) return;

  try {
    const response =
      await fetch(`${API_URL}/api/products`);

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

    inventoryRows.innerHTML = `
      <tr>
        <td colspan="5">
          Failed to load inventory.
        </td>
      </tr>
    `;
  }
}

/* -----------------------------
   RENDER INVENTORY
----------------------------- */

function renderInventory() {
  if (!inventoryRows) return;

  inventoryRows.innerHTML = "";

  inventory.forEach((product) => {
    const row =
      document.createElement("tr");

    const stock =
      Number(product.stock || 0);

    const status =
      stock <= 10
        ? "Reorder soon"
        : "In stock";

    row.innerHTML = `
      <td class="order-number">
        ${escapeHtml(product.name || "")}
      </td>

      <td>
        ${escapeHtml(product.category || "")}
      </td>

      <td>
        GH₵${Number(product.price || 0).toFixed(2)}
      </td>

      <td>
        ${stock}
      </td>

      <td>
        <span class="order-status ${
          stock <= 10
            ? "status-new"
            : "status-ready"
        }">
          ${status}
        </span>
      </td>
    `;

    inventoryRows.appendChild(row);
  });

  const productCount =
    document.querySelector("#product-count");

  const restockCount =
    document.querySelector("#restock-count");

  const lowStock =
    inventory.filter(
      (product) =>
        Number(product.stock || 0) <= 10
    ).length;

  if (productCount) {
    productCount.textContent =
      `${inventory.length} ${
        inventory.length === 1
          ? "product"
          : "products"
      }`;
  }

  if (restockCount) {
    restockCount.textContent =
      `${lowStock} NEED RESTOCK`;
  }
}

/* -----------------------------
   ADD PRODUCT
----------------------------- */

if (inventoryForm) {
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

      const stock =
        Number(
          formData.get("stock") ??
          formData.get("quantity") ??
          0
        );

      if (!name || !category) {
        if (inventoryFeedback) {
          inventoryFeedback.textContent =
            "Name and category are required.";
        }
        return;
      }

      if (!Number.isFinite(price) || price < 0) {
        if (inventoryFeedback) {
          inventoryFeedback.textContent =
            "Enter a valid price.";
        }
        return;
      }

      if (!Number.isFinite(stock) || stock < 0) {
        if (inventoryFeedback) {
          inventoryFeedback.textContent =
            "Enter a valid stock quantity.";
        }
        return;
      }

      if (inventoryFeedback) {
        inventoryFeedback.textContent =
          "Saving product...";
      }

      try {
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
                stock,
                image: null,
                description: null
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
    document.querySelector("#orders-rows");

  if (!accessToken) return;

  try {
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
      throw new Error(
        result.error ||
        "Failed to load orders"
      );
    }

    orders =
      Array.isArray(result.orders)
        ? result.orders
        : [];

    if (ordersRows) {
      renderOrders(ordersRows);
    } else if (ordersContainer) {
      renderOrdersContainer(
        ordersContainer
      );
    }

  } catch (error) {
    console.error(
      "Orders error:",
      error
    );
  }
}

/* -----------------------------
   RENDER ORDERS
----------------------------- */

function renderOrders(rows) {
  rows.innerHTML = "";

  if (!orders.length) {
    rows.innerHTML = `
      <tr>
        <td colspan="6">
          No orders yet.
        </td>
      </tr>
    `;
    return;
  }

  orders.forEach((order) => {
    const row =
      document.createElement("tr");

    const itemsText =
      Array.isArray(order.order_items) &&
      order.order_items.length
        ? order.order_items
            .map(item =>
            `${item.product_name} × ${item.quantity}${item.size ? ` — Size: ${item.size}` : ""}`
            )
            .join(", ")
        : "No items";

    row.innerHTML = `
      <td>
        ${escapeHtml(
          order.order_number ||
          order.id ||
          ""
        )}
      </td>

      <td>
        ${escapeHtml(
          order.customer_name ||
          order.name ||
          ""
        )}
      </td>

      <td>
        ${escapeHtml(itemsText)}
      </td>

      <td>
        ${escapeHtml(
          order.status ||
          "Pending"
        )}
      </td>

      <td>
        GH₵${Number(
          order.total_amount || 0
        ).toFixed(2)}
      </td>

      <td>
        ${formatDate(
          order.created_at
        )}
      </td>
    `;

    rows.appendChild(row);
  });
}


function renderOrdersContainer(container) {
  container.innerHTML = "";

  if (!orders.length) {
    container.innerHTML =
      "<p>No orders yet.</p>";
    return;
  }

  orders.forEach((order) => {
    const item =
      document.createElement("div");

    item.className =
      "order-item";

    const itemsText =
      Array.isArray(order.order_items) &&
      order.order_items.length
        ? order.order_items
            .map(orderItem =>
              `${orderItem.product_name} × ${orderItem.quantity}`
            )
            .join(", ")
        : "No items";

    item.innerHTML = `
      <strong>
        ${escapeHtml(
          order.order_number ||
          order.id ||
          ""
        )}
      </strong>

      <span>
        ${escapeHtml(
          order.customer_name ||
          order.name ||
          ""
        )}
      </span>

      <span>
        ${escapeHtml(itemsText)}
      </span>

      <span>
        GH₵${Number(
          order.total_amount || 0
        ).toFixed(2)}
      </span>
    `;

    container.appendChild(item);
  });
}

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
      accessToken = null;
      currentUser = null;
      orders = [];
      inventory = [];

      sessionStorage.removeItem(
        "kayshaven-access-token"
      );

      sessionStorage.removeItem(
        "kayshaven-staff"
      );

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

document
  .querySelectorAll(".nav-item")
  .forEach((button) => {
    button.addEventListener(
      "click",
      () => {
        showDashboardView(
          button.dataset.view
        );
      }
    );
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