import Dexie from 'dexie';

export const db = new Dexie('PMEComptaDB');

db.version(2).stores({
  transactions: '++id, hash, account_id, category_id, type, amount, currency, date, created_at, synced',
  accounts: '++id, name, type, initial_balance, created_at',
  categories: '++id, name, group_name, created_at',
  exchangeRates: '++id, from_currency, to_currency, rate, date',
  syncLog: '++id, action, table_name, record_id, timestamp, status',
  settings: '++id, key, value'
});

export const currencies = ['XAF', 'USD', 'EUR'];

export const defaultRates = {
  'USD': { 'XAF': 615 },
  'EUR': { 'XAF': 655 }
};

export function computeHash(data) {
  const str = JSON.stringify(data);
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash.toString(16);
}