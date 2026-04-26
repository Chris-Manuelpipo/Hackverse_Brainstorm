import { api } from './apiRoutes';

export async function getAccounts() {
  return await api.accounts.list();
}

export async function addAccount(account) {
  account.created_at = new Date().toISOString();
  return await api.accounts.create(account);
}

export async function updateAccount(id, data) {
  return await api.accounts.update(id, data);
}

export async function deleteAccount(id) {
  return await api.accounts.delete(id);
}

export async function getAccountBalance(accountId) {
  return await api.accounts.balance(accountId);
}

export async function getTransactions(filters = {}) {
  return await api.transactions.list(filters);
}

export async function addTransaction(transaction) {
  const hashData = {
    ...transaction,
    created_at: new Date().toISOString()
  };
  transaction.hash = computeHash(hashData);
  transaction.created_at = new Date().toISOString();
  transaction.synced = false;
  
  return await api.transactions.create(transaction);
}

export async function cancelTransaction(id) {
  return await api.transactions.cancel(id);
}

export async function uploadAttachment(txId, file, type = 'IMAGE') {
  const formData = new FormData();
  formData.append('file', file);
  return await api.transactions.uploadAttachment(txId, formData, type);
}

export async function getCategories() {
  return await api.categories.list();
}

export async function addCategory(category) {
  category.created_at = new Date().toISOString();
  return await api.categories.create(category);
}

export async function updateCategory(id, data) {
  return await api.categories.update(id, data);
}

export async function deleteCategory(id) {
  return await api.categories.delete(id);
}

export async function getSetting(key) {
  return await api.settings.get(key);
}

export async function setSetting(key, value) {
  return await api.settings.set(key, value);
}

export function convertCurrency(amount, from, to, rates = defaultRates) {
  if (from === to) return amount;
  
  if (from === 'XAF') {
    return amount / rates[to]?.XAF || 1;
  }
  if (to === 'XAF') {
    return amount * (rates[from]?.XAF || 1);
  }
  
  const inXAF = amount * (rates[from]?.XAF || 1);
  return inXAF / (rates[to]?.XAF || 1);
}

export async function getDashboardData() {
  const accounts = await getAccounts();
  const categories = await getCategories();
  
  const balances = {};
  for (const account of accounts) {
    balances[account.id] = await getAccountBalance(account.id);
  }
  
  const transactions = await api.transactions.list({ limit: 30 });
  
  const now = new Date();
  const thisMonth = transactions.filter(t => {
    const d = new Date(t.date);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });
  
  let totalIn = 0;
  let totalOut = 0;
  for (const t of thisMonth) {
    if (t.type === 'credit') totalIn += t.amount;
    else totalOut += t.amount;
  }
  
  return {
    accounts,
    balances,
    categories,
    recentTransactions: transactions.slice(0, 10),
    monthlyIn: totalIn,
    monthlyOut: totalOut,
    netBalance: totalIn - totalOut
  };
}

export async function getReports() {
  return await api.reports.bilan();
}

export async function getCashflowReport() {
  return await api.reports.cashflow();
}

export async function shareReport(reportType) {
  return await api.reports.share({ report_type: reportType });
}

export async function getPublicReport(token) {
  return await api.reports.getPublic(token);
}


function computeHash(data) {
  const str = JSON.stringify(data);
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash.toString(16);
}

export const defaultRates = {
  'USD': { 'XAF': 615 },
  'EUR': { 'XAF': 655 }
};

export { api };