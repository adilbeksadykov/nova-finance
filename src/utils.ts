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
  // --- Доходы (Income) ---
  { id: 'inc-1', name: 'Поступление за рубеж', type: 'income', parentId: null },
  { id: 'inc-1-1', name: 'Онлайн курс', type: 'income', parentId: 'inc-1' },
  { id: 'inc-1-2', name: 'Сопровождение', type: 'income', parentId: 'inc-1' },
  { id: 'inc-1-3', name: 'Менторство', type: 'income', parentId: 'inc-1' },
  { id: 'inc-1-4', name: 'Оформление визы', type: 'income', parentId: 'inc-1' },
  { id: 'inc-1-5', name: 'Маркетинг бюджет', type: 'income', parentId: 'inc-1' },
  { id: 'inc-1-6', name: 'Тур по школам', type: 'income', parentId: 'inc-1' },
  { id: 'inc-1-7', name: 'Страховка', type: 'income', parentId: 'inc-1' },

  { id: 'inc-2', name: 'Академ программы', type: 'income', parentId: null },
  { id: 'inc-3', name: 'Олимпиады', type: 'income', parentId: null },
  { id: 'inc-4', name: 'Комиссия от партнеров', type: 'income', parentId: null },
  { id: 'inc-5', name: 'Прочие доходы', type: 'income', parentId: null },
  { id: 'inc-6', name: 'Cash', type: 'income', parentId: null },
  { id: 'inc-7', name: 'Возврат', type: 'income', parentId: null },
  { id: 'inc-8', name: 'Налоги', type: 'income', parentId: null },
  { id: 'inc-9', name: 'Курсовая разница', type: 'income', parentId: null },
  { id: 'inc-10', name: 'Проценты по вкладам', type: 'income', parentId: null },

  // --- Расходы (Expense) ---
  { id: 'exp-1', name: 'Возврат банка', type: 'expense', parentId: null },

  { id: 'exp-2', name: 'Административный персонал', type: 'expense', parentId: null },
  { id: 'exp-2-1', name: 'Зарплата', type: 'expense', parentId: 'exp-2' },
  { id: 'exp-2-2', name: 'Налоги с ФОТ', type: 'expense', parentId: 'exp-2' },
  { id: 'exp-2-3', name: 'Бонусы', type: 'expense', parentId: 'exp-2' },
  { id: 'exp-2-4', name: 'Бухгалтерия', type: 'expense', parentId: 'exp-2' },

  { id: 'exp-3', name: 'Ежемесячные расходы', type: 'expense', parentId: null },
  { id: 'exp-3-1', name: 'Транспорт-аренда авто', type: 'expense', parentId: 'exp-3' },
  { id: 'exp-3-2', name: 'Представительские расходы', type: 'expense', parentId: 'exp-3' },
  { id: 'exp-3-3', name: 'Офисные расходы', type: 'expense', parentId: 'exp-3' },
  { id: 'exp-3-4', name: 'Содержание офиса', type: 'expense', parentId: 'exp-3' },
  { id: 'exp-3-5', name: 'Питание', type: 'expense', parentId: 'exp-3' },
  { id: 'exp-3-6', name: 'Подписки', type: 'expense', parentId: 'exp-3' },
  { id: 'exp-3-7', name: 'Аренда', type: 'expense', parentId: 'exp-3' },
  { id: 'exp-3-8', name: 'Ком услуги', type: 'expense', parentId: 'exp-3' },

  { id: 'exp-4', name: 'Маркетинг', type: 'expense', parentId: null },
  { id: 'exp-4-1', name: 'Командировки', type: 'expense', parentId: 'exp-4' },
  { id: 'exp-4-2', name: 'Спонсорство', type: 'expense', parentId: 'exp-4' },
  { id: 'exp-4-3', name: 'Мероприятия', type: 'expense', parentId: 'exp-4' },
  { id: 'exp-4-4', name: 'Реклама в интернете', type: 'expense', parentId: 'exp-4' },
  { id: 'exp-4-5', name: 'Цифровая продукция', type: 'expense', parentId: 'exp-4' },
  { id: 'exp-4-6', name: 'Печатная продукция', type: 'expense', parentId: 'exp-4' },
  { id: 'exp-4-7', name: 'Рассрочка банка', type: 'expense', parentId: 'exp-4' },
  { id: 'exp-4-8', name: 'Прочие рекламные расходы', type: 'expense', parentId: 'exp-4' },

  { id: 'exp-5', name: 'Поступление себестоимость', type: 'expense', parentId: null },
  { id: 'exp-5-1', name: 'Профориентация', type: 'expense', parentId: 'exp-5' },
  { id: 'exp-5-2', name: 'Оформление документов', type: 'expense', parentId: 'exp-5' },
  { id: 'exp-5-3', name: 'Перевод документов', type: 'expense', parentId: 'exp-5' },
  { id: 'exp-5-4', name: 'Мотивационные письма', type: 'expense', parentId: 'exp-5' },
  { id: 'exp-5-5', name: 'Оплата партнерам Италия', type: 'expense', parentId: 'exp-5' },
  { id: 'exp-5-6', name: 'Менторство', type: 'expense', parentId: 'exp-5' },
  { id: 'exp-5-7', name: 'SAT', type: 'expense', parentId: 'exp-5' },
  { id: 'exp-5-8', name: 'IELTS', type: 'expense', parentId: 'exp-5' },
  { id: 'exp-5-9', name: 'Подписка IELTS', type: 'expense', parentId: 'exp-5' },
  { id: 'exp-5-10', name: 'Кураторы IELTS', type: 'expense', parentId: 'exp-5' },
  { id: 'exp-5-11', name: 'Миникурс', type: 'expense', parentId: 'exp-5' },

  { id: 'exp-6', name: 'Академ Программы', type: 'expense', parentId: null },
  { id: 'exp-6-1', name: 'Оплата партнерам АП', type: 'expense', parentId: 'exp-6' },
  { id: 'exp-6-2', name: 'Оформление ВИЗы', type: 'expense', parentId: 'exp-6' },
  { id: 'exp-6-3', name: 'Билеты кураторам', type: 'expense', parentId: 'exp-6' },
  { id: 'exp-6-4', name: 'Куратор расходы', type: 'expense', parentId: 'exp-6' },
  { id: 'exp-6-5', name: 'Расходы АП', type: 'expense', parentId: 'exp-6' },

  { id: 'exp-7', name: 'UniTap', type: 'expense', parentId: null },
  { id: 'exp-7-1', name: 'Контент', type: 'expense', parentId: 'exp-7' },
  { id: 'exp-7-2', name: 'Разработка', type: 'expense', parentId: 'exp-7' },

  { id: 'exp-8', name: 'Cashback', type: 'expense', parentId: null },
  { id: 'exp-9', name: 'Возврат', type: 'expense', parentId: null },
  { id: 'exp-10', name: 'Соц. Расходы', type: 'expense', parentId: null },
  { id: 'exp-11', name: 'Страховка', type: 'expense', parentId: null },
  { id: 'exp-12', name: 'Прочие расходы', type: 'expense', parentId: null },
  { id: 'exp-13', name: 'Банковские услуги', type: 'expense', parentId: null },
  { id: 'exp-14', name: 'Налог на прибыль (доходы)', type: 'expense', parentId: null },
  { id: 'exp-15', name: 'Инвестиционная деятельность', type: 'expense', parentId: null },
  { id: 'exp-16', name: 'Ремонт ОС', type: 'expense', parentId: null },
  { id: 'exp-17', name: 'Покупка ОС', type: 'expense', parentId: null },
  { id: 'exp-18', name: 'Продажа ОС', type: 'expense', parentId: null },
  { id: 'exp-19', name: 'Обучение в компании', type: 'expense', parentId: null },
  { id: 'exp-20', name: 'Поиск персонала', type: 'expense', parentId: null },
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

export function getAmountInKzt(amount: number | undefined, accountId: string, subAccounts: SubAccount[], exchangeRates: ExchangeRate[]): number {
  const amt = amount || 0;
  const sub = subAccounts.find(s => s.id === accountId);
  if (!sub) return amt;
  const rateObj = exchangeRates.find(r => r.symbol === sub.currency);
  const multiplier = rateObj ? rateObj.rate : 1;
  return amt * multiplier;
}

