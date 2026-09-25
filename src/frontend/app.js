const accounts = [
  { email: 'employee@localhost.test', password: 'Welcome123!', role: 'employee', name: 'Alex Morgan' },
  { email: 'customer@localhost.test', password: 'Welcome123!', role: 'customer', name: 'Taylor Reed' },
];

const screens = {
  home: document.querySelector('#home'),
  login: document.querySelector('#login-screen'),
  dashboard: document.querySelector('#dashboard-screen'),
};
const loginForm = document.querySelector('#login-form');
const loginError = document.querySelector('#login-error');
const emailInput = document.querySelector('#email');
const passwordInput = document.querySelector('#password');
let currentUser = null;
const inventoryStorageKey = 'localhosts7-inventory';
const startingInventory = [
  { name: 'Cloud-soft wrap', category: 'Newborn essentials', quantity: 4, reorderAt: 10 },
  { name: 'Calm balm duo', category: 'Skin & comfort', quantity: 7, reorderAt: 10 },
  { name: 'First days journal', category: 'Gifts & keepsakes', quantity: 9, reorderAt: 10 },
  { name: 'Everyday nursing bra', category: 'Feeding & comfort', quantity: 38, reorderAt: 10 },
];
let inventory;

try {
  const savedInventory = JSON.parse(localStorage.getItem(inventoryStorageKey));
  inventory = Array.isArray(savedInventory) ? savedInventory : startingInventory;
} catch {
  inventory = startingInventory;
}

function showScreen(screenName) {
  for (const [name, screen] of Object.entries(screens)) {
    const isVisible = name === screenName;
    screen.classList.toggle('is-hidden', !isVisible);
    screen.setAttribute('aria-hidden', String(!isVisible));
  }
  document.querySelector('#open-login').hidden = screenName !== 'home';
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function openLogin() {
  loginError.textContent = '';
  showScreen('login');
  emailInput.focus();
}

document.querySelector('#open-login').addEventListener('click', openLogin);
document.querySelector('#welcome-login').addEventListener('click', openLogin);
document.querySelector('#back-home').addEventListener('click', () => showScreen('home'));

document.querySelector('#toggle-password').addEventListener('click', (event) => {
  const isPassword = passwordInput.type === 'password';
  passwordInput.type = isPassword ? 'text' : 'password';
  event.currentTarget.textContent = isPassword ? 'HIDE' : 'SHOW';
  event.currentTarget.setAttribute('aria-label', isPassword ? 'Hide password' : 'Show password');
});

loginForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const account = accounts.find((candidate) => candidate.email === emailInput.value.trim().toLowerCase()
    && candidate.password === passwordInput.value);

  if (!account) {
    loginError.textContent = 'That email and password combination was not found.';
    return;
  }

  if (account.role !== 'employee') {
    loginError.textContent = 'Dashboard access is available to employee accounts only.';
    return;
  }

  currentUser = account;
  document.querySelector('#user-name').textContent = account.name;
  document.querySelector('#greeting-name').textContent = account.name.split(' ')[0];
  document.querySelector('#user-avatar').textContent = account.name.split(' ').map((part) => part[0]).join('');
  loginForm.reset();
  loginError.textContent = '';
  showScreen('dashboard');
});

document.querySelector('#logout-button').addEventListener('click', () => {
  currentUser = null;
  loginForm.reset();
  showScreen('home');
});

function showDashboardView(viewName) {
  if (!currentUser || currentUser.role !== 'employee') return;

  document.querySelectorAll('.dashboard-view').forEach((view) => {
    view.classList.toggle('is-hidden', view.id !== `view-${viewName}`);
  });
  document.querySelectorAll('.nav-item').forEach((button) => {
    const isActive = button.dataset.view === viewName;
    button.classList.toggle('is-active', isActive);
    button.setAttribute('aria-current', isActive ? 'page' : 'false');
  });
  const sectionName = viewName[0].toUpperCase() + viewName.slice(1);
  document.querySelector('#current-section').textContent = sectionName;
}

document.querySelectorAll('.nav-item, .stock-link, .view-orders').forEach((button) => {
  button.addEventListener('click', () => showDashboardView(button.dataset.view || 'orders'));
});

function renderInventory() {
  const rows = document.querySelector('#inventory-rows');
  const lowStock = inventory.filter((product) => product.quantity <= product.reorderAt).length;
  rows.replaceChildren();

  for (const product of inventory) {
    const row = document.createElement('tr');
    const nameCell = document.createElement('td');
    const categoryCell = document.createElement('td');
    const quantityCell = document.createElement('td');
    const statusCell = document.createElement('td');
    const status = document.createElement('span');
    nameCell.className = 'order-number';
    nameCell.textContent = product.name;
    categoryCell.textContent = product.category;
    quantityCell.textContent = `${product.quantity} units`;
    status.className = `order-status ${product.quantity <= product.reorderAt ? 'status-new' : 'status-ready'}`;
    status.textContent = product.quantity <= product.reorderAt ? 'Reorder soon' : 'In stock';
    statusCell.append(status);
    row.append(nameCell, categoryCell, quantityCell, statusCell);
    rows.append(row);
  }

  document.querySelector('#restock-count').textContent = `${lowStock} NEED RESTOCK`;
  document.querySelector('#product-count').textContent = `${inventory.length} ${inventory.length === 1 ? 'product' : 'products'}`;
}

document.querySelector('#inventory-form').addEventListener('submit', (event) => {
  event.preventDefault();
  if (!currentUser || currentUser.role !== 'employee') return;

  const formData = new FormData(event.currentTarget);
  const product = {
    name: String(formData.get('name')).trim(),
    category: String(formData.get('category')),
    quantity: Number(formData.get('quantity')),
    reorderAt: Number(formData.get('reorderAt')),
  };
  if (!product.name) return;

  inventory.push(product);
  try {
    localStorage.setItem(inventoryStorageKey, JSON.stringify(inventory));
  } catch {
    document.querySelector('#inventory-feedback').textContent = 'Product added for this session, but this browser could not save it.';
  }
  renderInventory();
  event.currentTarget.reset();
  document.querySelector('#product-reorder').value = '10';
  document.querySelector('#inventory-feedback').textContent = `${product.name} added to inventory.`;
});

renderInventory();

document.querySelector('#today-label').textContent = new Intl.DateTimeFormat('en', {
  weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
}).format(new Date());