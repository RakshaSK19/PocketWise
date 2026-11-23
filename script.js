
'use strict';

// Storage key
const STORAGE_KEY = 'pocketwise-transactions-v1';

// Available categories
const CATEGORY_OPTIONS = {
  expense: [
    'Food & drinks',
    'Transport',
    'Shopping',
    'Bills',
    'Education',
    'Health',
    'Entertainment',
    'Other'
  ],

  income: [
    'Salary',
    'Allowance',
    'Freelance',
    'Gift',
    'Scholarship',
    'Other'
  ]
};

// Get HTML elements
const form = document.getElementById('transactionForm');
const descriptionInput = document.getElementById('description');
const amountInput = document.getElementById('amount');
const typeInput = document.getElementById('type');
const categoryInput = document.getElementById('category');
const dateInput = document.getElementById('date');
const filterInput = document.getElementById('filterType');
const transactionList = document.getElementById('transactionList');
const categoryBreakdown = document.getElementById('categoryBreakdown');
const toast = document.getElementById('toast');

let transactions = loadTransactions();
let toastTimeout;

// Get today's date in local time
function localDateString(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

// Load saved transactions
function loadTransactions() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);

    if (!saved) return [];

    const parsed = JSON.parse(saved);

    if (!Array.isArray(parsed)) return [];

    return parsed.filter((item) =>
      item &&
      typeof item.id === 'string' &&
      typeof item.description === 'string' &&
      Number.isFinite(Number(item.amount)) &&
      Number(item.amount) > 0 &&
      (item.type === 'income' || item.type === 'expense') &&
      typeof item.category === 'string' &&
      typeof item.date === 'string'
    ).map((item) => ({
      ...item,
      amount: Number(item.amount)
    }));

  } catch (error) {
    console.error('Could not read saved transactions:', error);
    return [];
  }
}

// Save transactions in local storage
function saveTransactions() {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(transactions)
    );
  } catch (error) {
    console.error('Could not save transactions:', error);
    showToast('Could not save data in this browser.');
  }
}

// Format money in Indian Rupees
function formatCurrency(amount) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
}

// Format transaction date
function formatDate(dateString) {
  const [year, month, day] = dateString.split('-').map(Number);

  const date = new Date(year, month - 1, day);

  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  }).format(date);
}

// Display notification
function showToast(message) {
  toast.textContent = message;
  toast.classList.add('show');

  window.clearTimeout(toastTimeout);

  toastTimeout = window.setTimeout(() => {
    toast.classList.remove('show');
  }, 2400);
}

// Update categories based on transaction type
function updateCategoryOptions() {
  const options = CATEGORY_OPTIONS[typeInput.value];

  categoryInput.replaceChildren();

  options.forEach((category) => {
    const option = document.createElement('option');

    option.value = category;
    option.textContent = category;

    categoryInput.append(option);
  });
}

// Clear form errors
function clearErrors() {
  document.getElementById('descriptionError').textContent = '';
  document.getElementById('amountError').textContent = '';
  document.getElementById('dateError').textContent = '';
}

// Validate form fields
function validateForm() {
  clearErrors();

  let isValid = true;

  const description = descriptionInput.value.trim();
  const amount = Number(amountInput.value);
  const selectedDate = dateInput.value;

  if (!description) {
    document.getElementById('descriptionError').textContent =
      'Please enter a description.';

    isValid = false;
  }

  if (!Number.isFinite(amount) || amount <= 0) {
    document.getElementById('amountError').textContent =
      'Enter an amount greater than zero.';

    isValid = false;
  }

  if (!selectedDate) {
    document.getElementById('dateError').textContent =
      'Please select a date.';

    isValid = false;

  } else if (selectedDate > localDateString()) {
    document.getElementById('dateError').textContent =
      'Date cannot be in the future.';

    isValid = false;
  }

  return isValid;
}

// Add a new transaction
function addTransaction(event) {
  event.preventDefault();

  if (!validateForm()) return;

  const transaction = {
    id: (window.crypto && typeof window.crypto.randomUUID === 'function')
      ? window.crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`,

    description: descriptionInput.value.trim(),

    amount: Number(
      Number(amountInput.value).toFixed(2)
    ),

    type: typeInput.value,
    category: categoryInput.value,
    date: dateInput.value,
    createdAt: Date.now()
  };

  transactions.push(transaction);

  saveTransactions();
  renderApp();

  form.reset();

  typeInput.value = 'expense';

  updateCategoryOptions();

  dateInput.value = localDateString();

  descriptionInput.focus();

  showToast('Transaction added successfully.');
}

// Create transaction HTML elements
function createTransactionElement(transaction) {
  const item = document.createElement('article');

  item.className = 'transaction-item';

  const main = document.createElement('div');

  main.className = 'transaction-main';

  const symbol = document.createElement('span');

  symbol.className = `transaction-symbol ${transaction.type}`;

  symbol.setAttribute('aria-hidden', 'true');

  symbol.textContent =
    transaction.type === 'income' ? '↗' : '↘';

  const textWrap = document.createElement('div');

  textWrap.style.minWidth = '0';

  const title = document.createElement('p');

  title.className = 'transaction-description';

  title.textContent = transaction.description;

  const meta = document.createElement('p');

  meta.className = 'transaction-meta';

  meta.textContent =
    `${transaction.category} · ${formatDate(transaction.date)}`;

  textWrap.append(title, meta);

  main.append(symbol, textWrap);

  const amount = document.createElement('span');

  amount.className = `transaction-amount ${transaction.type}`;

  amount.textContent =
    `${transaction.type === 'income' ? '+' : '−'}${formatCurrency(transaction.amount)}`;

  // Delete button
  const deleteButton = document.createElement('button');

  deleteButton.className = 'delete-button';

  deleteButton.type = 'button';

  deleteButton.setAttribute(
    'aria-label',
    `Delete ${transaction.description}`
  );

  deleteButton.title = 'Delete transaction';

  deleteButton.textContent = '×';

  deleteButton.addEventListener('click', () => {
    deleteTransaction(transaction.id);
  });

  item.append(main, amount, deleteButton);

  return item;
}

// Delete a transaction
function deleteTransaction(id) {
  const transaction = transactions.find(
    (item) => item.id === id
  );

  if (!transaction) return;

  const shouldDelete = window.confirm(
    `Delete the transaction "${transaction.description}"?`
  );

  if (!shouldDelete) return;

  transactions = transactions.filter(
    (item) => item.id !== id
  );

  saveTransactions();

  renderApp();

  showToast('Transaction deleted.');
}

// Calculate income, expenses and balance
function updateSummary() {
  const income = transactions
    .filter((item) => item.type === 'income')
    .reduce((total, item) => total + item.amount, 0);

  const expenses = transactions
    .filter((item) => item.type === 'expense')
    .reduce((total, item) => total + item.amount, 0);

  document.getElementById('balanceValue').textContent =
    formatCurrency(income - expenses);

  document.getElementById('incomeValue').textContent =
    formatCurrency(income);

  document.getElementById('expenseValue').textContent =
    formatCurrency(expenses);
}

// Update transaction history
function updateTransactions() {
  const filter = filterInput.value;

  const filtered = transactions
    .filter((item) =>
      filter === 'all' || item.type === filter
    )
    .sort((a, b) =>
      b.date.localeCompare(a.date) ||
      (b.createdAt || 0) - (a.createdAt || 0)
    );

  transactionList.replaceChildren();

  if (filtered.length === 0) {
    const message = document.createElement('div');

    message.className = 'empty-state';

    const icon = document.createElement('span');

    icon.className = 'empty-illustration';

    icon.setAttribute('aria-hidden', 'true');

    icon.textContent = '＋';

    const heading = document.createElement('h3');

    const copy = document.createElement('p');

    if (transactions.length === 0) {
      heading.textContent = 'No transactions yet';

      copy.textContent =
        'Add your first income or expense to get started.';

    } else {
      heading.textContent = 'No matching transactions';

      copy.textContent =
        'Try changing the activity filter.';
    }

    message.append(icon, heading, copy);

    transactionList.append(message);

  } else {
    filtered.forEach((transaction) => {
      transactionList.append(
        createTransactionElement(transaction)
      );
    });
  }

  document.getElementById('listFooter').textContent =
    `Showing ${filtered.length} ${
      filtered.length === 1 ? 'transaction' : 'transactions'
    }`;
}

// Display expense categories and totals
function updateCategoryBreakdown() {
  const expenses = transactions.filter(
    (item) => item.type === 'expense'
  );

  const totals = new Map();

  expenses.forEach((item) => {
    totals.set(
      item.category,
      (totals.get(item.category) || 0) + item.amount
    );
  });

  const categoryTotals = [...totals.entries()]
    .sort((a, b) => b[1] - a[1]);

  categoryBreakdown.replaceChildren();

  if (categoryTotals.length === 0) {
    const empty = document.createElement('p');

    empty.className = 'breakdown-empty';

    empty.textContent =
      'Your expense categories will appear here when you add transactions.';

    categoryBreakdown.append(empty);

    return;
  }

  const largest = categoryTotals[0][1];

  categoryTotals.forEach(([category, total]) => {
    const row = document.createElement('div');

    row.className = 'category-row';

    const labelRow = document.createElement('div');

    labelRow.className = 'category-label-row';

    const label = document.createElement('span');

    label.textContent = category;

    const value = document.createElement('strong');

    value.textContent = formatCurrency(total);

    labelRow.append(label, value);

    const track = document.createElement('div');

    track.className = 'progress-track';

    track.setAttribute('role', 'img');

    track.setAttribute(
      'aria-label',
      `${category}: ${formatCurrency(total)}`
    );

    const fill = document.createElement('div');

    fill.className = 'progress-fill';

    fill.style.width =
      `${Math.max(4, (total / largest) * 100)}%`;

    track.append(fill);

    row.append(labelRow, track);

    categoryBreakdown.append(row);
  });
}

// Refresh all dashboard sections
function renderApp() {
  updateSummary();
  updateTransactions();
  updateCategoryBreakdown();
}

// Initialise page
function initialisePage() {
  const today = new Date();

  document.getElementById('todayLabel').textContent =
    new Intl.DateTimeFormat('en-IN', {
      weekday: 'short',
      day: 'numeric',
      month: 'short'
    }).format(today);

  document.getElementById('monthLabel').textContent =
    new Intl.DateTimeFormat('en-IN', {
      month: 'long',
      year: 'numeric'
    }).format(today);

  dateInput.value = localDateString();

  dateInput.max = localDateString();

  updateCategoryOptions();

  renderApp();
}

// Event listeners
form.addEventListener('submit', addTransaction);

typeInput.addEventListener(
  'change',
  updateCategoryOptions
);

filterInput.addEventListener(
  'change',
  updateTransactions
);

// Start application
initialisePage();
