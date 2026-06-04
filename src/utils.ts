import { SubAccount, Transaction, TeamUser, ExchangeRate, ArticleCategory, Project, LegalEntity } from './types';

// Numeric formatting with elegant spacing for currencies (e.g., 34 859 510 ₸)
export function formatCurrency(value: number, symbol = '₸', decimals = 0): string {
  const isNegative = value < 0;
  const absValue = Math.abs(value);
  
  const formatted = new Intl.NumberFormat('ru-RU', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(absValue);
  
  return `${isNegative ? '-' : ''}${formatted} ${symbol}`;
}

export const INITIAL_SUB_ACCOUNTS: SubAccount[] = [];

export const INITIAL_TRANSACTIONS: Transaction[] = [];

export const INITIAL_TEAM_USERS: TeamUser[] = [];

export const INITIAL_EXCHANGE_RATES: ExchangeRate[] = [
  { id: 'er1', name: 'Казахстанский тенге', code: 'KZT', symbol: '₸', rate: 1.0000 },
  { id: 'er2', name: 'Доллар США', code: 'USD', symbol: '$', rate: 452.4000 },
  { id: 'er3', name: 'Евро', code: 'EUR', symbol: '€', rate: 489.1500 },
  { id: 'er4', name: 'Российский рубль', code: 'RUB', symbol: '₽', rate: 5.0200 },
  { id: 'er5', name: 'Фунт стерлингов', code: 'GBP', symbol: '£', rate: 572.2000 },
  { id: 'er6', name: 'Китайский юань', code: 'CNY', symbol: '¥', rate: 62.1500 },
];

export const INITIAL_ARTICLE_CATEGORIES: ArticleCategory[] = [
  { id: 'cat-inc-1', name: 'Олимпиады', type: 'income', parentId: null },
  { id: 'cat-inc-2', name: 'Поступление за рубеж', type: 'income', parentId: null },
  { id: 'cat-inc-3', name: 'Сопровождение', type: 'income', parentId: 'cat-inc-2' },
  { id: 'cat-inc-4', name: 'Менторство', type: 'income', parentId: 'cat-inc-2' },
  { id: 'cat-inc-5', name: 'Оформление визы', type: 'income', parentId: 'cat-inc-2' },
  
  { id: 'cat-exp-1', name: 'Маркетинг', type: 'expense', parentId: null },
  { id: 'cat-exp-2', name: 'Цифровая реклама', type: 'expense', parentId: 'cat-exp-1' },
  { id: 'cat-exp-3', name: 'Мероприятия', type: 'expense', parentId: 'cat-exp-1' },
  { id: 'cat-exp-4', name: 'Производственный персонал', type: 'expense', parentId: null },
  { id: 'cat-exp-5', name: 'Зарплата', type: 'expense', parentId: 'cat-exp-4' },
];

export const INITIAL_PROJECTS: Project[] = [];

export const INITIAL_LEGAL_ENTITIES: LegalEntity[] = [
  { id: 'le-1', code: 'NOVA', label: 'NOVA', inn: '123456789012' },
  { id: 'le-2', code: 'ИП AQLDY', label: 'ИП AQLDY', inn: '970621300235' },
  { id: 'le-3', code: 'TOO NOVA CAMPS', label: 'TOO NOVA CAMPS"', inn: '230340033638' },
  { id: 'le-4', code: 'NOVA EDU', label: 'TOO "NOVA EDU"', inn: '220540040973' },
  { id: 'le-5', code: 'NOVA EDUCATION', label: 'TOO NOVA EDUCATION', inn: '251140014581' },
  { id: 'le-6', code: 'IP NOMAD SCHOLARS', label: 'ИП NOMAD SCHOLARS', inn: '960713300114' },
  { id: 'le-7', code: 'IP STAR EDUCATION', label: 'ИП STAR EDUCATION', inn: '970924351148' }
];
