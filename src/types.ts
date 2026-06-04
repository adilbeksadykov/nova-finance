export interface SubAccount {
  id: string;
  name: string;
  balance: number;
  initialBalance: number;
  parentEntity: string; // E.g., 'NOVA', 'TOO NOVA EDU', etc.
  type: string;
  currency: string;
}

export interface TransactionSplit {
  id: string;
  amount: number;
  article: string;
  project: string;
  notes: string;
}

export interface Transaction {
  id: string;
  date: string; // YYYY-MM-DD
  type: 'income' | 'expense' | 'transfer' | 'accrual';
  amount: number;
  accountId: string;
  accountName: string;
  contragent: string;
  article: string;
  project: string;
  isConfirmed: boolean;
  notes: string;
  attachmentName?: string;
  attachmentSize?: string;
  isRecurring?: boolean;
  recurringFrequency?: 'weekly' | 'monthly' | 'yearly';
  splits?: TransactionSplit[];
}

export interface UserRole {
  role: 'Owner' | 'Manager' | 'Guest' | 'Administrator';
  label: string;
}

export interface TeamUser {
  id: string;
  email: string;
  role: 'Owner' | 'Manager' | 'Guest' | 'Administrator';
  name: string;
  position: string;
  status: 'Active' | 'Invited';
  lastActive?: string;
  dateCreated: string;
}

export interface ExchangeRate {
  id: string;
  name: string;
  code: string;
  symbol: string;
  rate: number;
}

export interface ArticleCategory {
  id: string;
  name: string;
  type: string;
  parentId?: string | null;
  budgetLimit?: number;
}

export interface ProjectGroup {
  id: string;
  name: string;
  status: 'В работе' | 'Завершен' | 'Плановый';
  isArchived?: boolean;
}

export interface Project {
  id: string;
  name: string;
  group: string;
  startDate: string;
  endDate: string;
  status: 'В работе' | 'Завершен' | 'Плановый';
  description?: string;
  budgetLimit?: number;
  isArchived?: boolean;
}

export interface LegalEntity {
  id: string;
  code: string;
  label: string;
  inn: string;
}
