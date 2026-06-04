import React, { useState, useMemo } from 'react';
import { 
  Search, 
  Plus, 
  Upload, 
  Check, 
  Clock, 
  X, 
  Edit3, 
  Trash2, 
  ChevronDown, 
  FileSpreadsheet, 
  Paperclip,
  CheckCircle2,
  Calendar,
  AlertCircle,
  Download
} from 'lucide-react';
import { Transaction, SubAccount, ArticleCategory, Project, LegalEntity, TransactionSplit } from '../types';
import { formatCurrency } from '../utils';

interface Parsed1CTransaction {
  id: string;
  date: string;
  type: 'income' | 'expense';
  amount: number;
  contragent: string;
  contragentIban: string;
  contragentBin: string;
  ourIban: string;
  ourName: string;
  ourBin: string;
  notes: string;
  article: string;
  project: string;
  isConfirmed: boolean;
}

interface Parsed1CAccount {
  iban: string;
  legalEntityName: string;
  legalEntityBin: string;
  currency: string;
  type: string;
}

function parse1CClientBank(text: string): {
  transactions: Parsed1CTransaction[];
  newAccounts: Parsed1CAccount[];
} {
  const lines = text.split(/\r?\n|\r/).map(l => l.trim());
  const transactions: Parsed1CTransaction[] = [];
  const newAccountsMap: Record<string, Parsed1CAccount> = {};

  let currentDoc: any = null;
  let inDocSection = false;
  let ourCalculatedAccount = '';

  for (const line of lines) {
    if (line.startsWith('РасчСчет=')) {
      ourCalculatedAccount = line.split('=')[1] || '';
    }
  }

  for (const line of lines) {
    if (line === 'СекцияДокумент=выписка') {
      currentDoc = {};
      inDocSection = true;
      continue;
    }
    if (line === 'КонецДокумента') {
      if (currentDoc) {
        const docNum = currentDoc['НомерДокумента'] || '';
        const dateRaw = currentDoc['ДатаОперации'] || currentDoc['ДатаДокумента'] || '';
        
        let dateFormatted = new Date().toISOString().slice(0, 10);
        if (dateRaw) {
          const parts = dateRaw.split('.');
          if (parts.length === 3) {
            dateFormatted = `${parts[2]}-${parts[1]}-${parts[0]}`;
          }
        }

        const purpose = currentDoc['НазначениеПлатежа'] || '';
        const rawAmountIncome = currentDoc['СуммаПриход'];
        const rawAmountExpense = currentDoc['СуммаРасход'];
        
        const isIncome = !!rawAmountIncome;
        const amount = Number(rawAmountIncome || rawAmountExpense || 0);
        const type = isIncome ? 'income' : 'expense';

        const senderName = currentDoc['ПлательщикНаименование'] || '';
        const senderBin = currentDoc['ПлательщикБИН_ИИН'] || '';
        const senderIban = currentDoc['ПлательщикИИК'] || '';

        const receiverName = currentDoc['ПолучательНаименование'] || '';
        const receiverBin = currentDoc['ПолучательБИН_ИИН'] || '';
        const receiverIban = currentDoc['ПолучательИИК'] || '';

        const ourIban = isIncome ? receiverIban : senderIban;
        const ourName = isIncome ? receiverName : senderName;
        const ourBin = isIncome ? receiverBin : senderBin;

        const contragent = isIncome ? senderName : receiverName;
        const contragentIban = isIncome ? senderIban : receiverIban;
        const contragentBin = isIncome ? senderBin : receiverBin;

        let matchedCategory = 'Прочее';
        const purposeLower = purpose.toLowerCase();
        if (purposeLower.includes('зарплат') || purposeLower.includes('оплата труда') || purposeLower.includes('зп')) {
          matchedCategory = 'Зарплата';
        } else if (purposeLower.includes('процессинг') || purposeLower.includes('комисси') || purposeLower.includes('услуги банка')) {
          matchedCategory = 'Маркетинг';
        } else if (purposeLower.includes('продаж') || purposeLower.includes('поступлен')) {
          matchedCategory = 'Олимпиады';
        } else if (purposeLower.includes('перевод собственных средств')) {
          matchedCategory = 'Перевод';
        }

        transactions.push({
          id: `import-${docNum}-${Date.now()}-${Math.random()}`,
          date: dateFormatted,
          type,
          amount,
          contragent,
          contragentIban,
          contragentBin,
          ourIban: ourIban || ourCalculatedAccount,
          ourName,
          ourBin,
          notes: purpose,
          article: matchedCategory,
          project: 'Без проекта',
          isConfirmed: true,
        });

        const activeIban = ourIban || ourCalculatedAccount;
        if (activeIban) {
          newAccountsMap[activeIban] = {
            iban: activeIban,
            legalEntityName: ourName || 'ТОО "NOVA EDU"',
            legalEntityBin: ourBin || '220540040973',
            currency: '₸',
            type: 'non-cash',
          };
        }
      }
      inDocSection = false;
      currentDoc = null;
      continue;
    }

    if (inDocSection && currentDoc) {
      const idx = line.indexOf('=');
      if (idx !== -1) {
        const key = line.slice(0, idx).trim();
        const value = line.slice(idx + 1).trim();
        currentDoc[key] = value;
      }
    }
  }

  return {
    transactions,
    newAccounts: Object.values(newAccountsMap),
  };
}

interface TransactionsViewProps {
  transactions: Transaction[];
  setTransactions: React.Dispatch<React.SetStateAction<Transaction[]>>;
  subAccounts: SubAccount[];
  setSubAccounts: React.Dispatch<React.SetStateAction<SubAccount[]>>;
  categories: ArticleCategory[];
  setCategories: React.Dispatch<React.SetStateAction<ArticleCategory[]>>;
  projects: Project[];
  setProjects: React.Dispatch<React.SetStateAction<Project[]>>;
  legalEntities: LegalEntity[];
  accountTypes: string[];
}

export default function TransactionsView({ 
  transactions, 
  setTransactions, 
  subAccounts,
  setSubAccounts,
  categories,
  setCategories,
  projects,
  setProjects,
  legalEntities,
  accountTypes
}: TransactionsViewProps) {
  // Search and Filter states
  const [searchTerm, setSearchTerm] = useState('');
  
  // 1. Types of operations
  const [filterOpTypes, setFilterOpTypes] = useState<string[]>(['income', 'expense', 'transfer', 'accrual']);
  
  // 2. Date and Status
  const [filterConfirmedCheck, setFilterConfirmedCheck] = useState<boolean>(true);
  const [filterUnconfirmedCheck, setFilterUnconfirmedCheck] = useState<boolean>(true);
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');

  // 3. Parameters (Multiple)
  const [filterAccounts, setFilterAccounts] = useState<string[]>([]);
  const [filterContragents, setFilterContragents] = useState<string[]>([]);
  const [filterArticles, setFilterArticles] = useState<string[]>([]);
  const [filterProjects, setFilterProjects] = useState<string[]>([]);

  // 4. Amount
  const [filterAmountMin, setFilterAmountMin] = useState<string>('');
  const [filterAmountMax, setFilterAmountMax] = useState<string>('');
  
  // Create / Edit modal states
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);

  // Bank Import State
  const [importPhase, setImportPhase] = useState<'select' | 'preview'>('select');
  const [importTransactions, setImportTransactions] = useState<any[]>([]);
  const [importNewAccounts, setImportNewAccounts] = useState<any[]>([]);

  // Quick Create Modal states
  const [createAccountModal, setCreateAccountModal] = useState(false);
  const [createAccountData, setCreateAccountData] = useState({ name: '', parentEntity: '', type: '', balance: '', initialBalance: '', currency: '₸' });

  const [createArticleModal, setCreateArticleModal] = useState(false);
  const [createArticleData, setCreateArticleData] = useState({ name: '', parentId: '', type: 'income' });

  const [createProjectModal, setCreateProjectModal] = useState(false);
  const [createProjectData, setCreateProjectData] = useState({ name: '', group: '', description: '' });

  // Quick Create Modal Handlers
  const handleQuickCreateAccount = (e: React.FormEvent) => {
    e.preventDefault();
    if (!createAccountData.name || !createAccountData.parentEntity) return;
    const newId = `acc-${Date.now()}`;
    const newAcc: SubAccount = {
      id: newId,
      name: createAccountData.name,
      parentEntity: createAccountData.parentEntity,
      type: createAccountData.type || (accountTypes[0] || 'cash'),
      balance: Number(createAccountData.balance) || 0,
      initialBalance: Number(createAccountData.initialBalance) || 0,
      currency: createAccountData.currency || '₸'
    };
    setSubAccounts(prev => [...prev, newAcc]);
    setFormAccountId(newId);
    setCreateAccountModal(false);
  };

  const handleQuickCreateArticle = (e: React.FormEvent) => {
    e.preventDefault();
    if (!createArticleData.name) return;
    const typeMap: Record<string, string> = {
      'income': 'income',
      'expense': 'expense',
      'transfer': 'asset',
      'accrual': 'equity'
    };
    const newArt: ArticleCategory = {
      id: `cat-${Date.now()}`,
      name: createArticleData.name,
      type: typeMap[formType] || createArticleData.type || 'expense',
      parentId: createArticleData.parentId || null
    };
    setCategories(prev => [...prev, newArt]);
    setFormArticle(createArticleData.name);
    setCreateArticleModal(false);
  };

  const handleQuickCreateProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!createProjectData.name) return;
    const newProj: Project = {
      id: `proj-${Date.now()}`,
      name: createProjectData.name,
      group: createProjectData.group || 'Без группы',
      startDate: new Date().toISOString().slice(0, 10),
      endDate: '--',
      status: 'В работе',
      description: createProjectData.description
    };
    setProjects(prev => [...prev, newProj]);
    setFormProject(createProjectData.name);
    setCreateProjectModal(false);
  };

  // Form states for Create/Edit
  const [formType, setFormType] = useState<'income' | 'expense' | 'transfer' | 'accrual'>('income');
  const [formDate, setFormDate] = useState('2026-05-30');
  const [formAccountId, setFormAccountId] = useState('1');
  const [formAmount, setFormAmount] = useState('');
  const [formContragent, setFormContragent] = useState('');
  const [formArticle, setFormArticle] = useState('Зарплата');
  const [formProject, setFormProject] = useState('Unitap');
  const [formNotes, setFormNotes] = useState('');
  const [formIsConfirmed, setFormIsConfirmed] = useState(true);
  const [formIsRecurring, setFormIsRecurring] = useState(false);
  const [formRecurringFreq, setFormRecurringFreq] = useState<'weekly' | 'monthly' | 'yearly'>('monthly');
  const [formAttachment, setFormAttachment] = useState<File | null>(null);
  
  const [formHasSplits, setFormHasSplits] = useState(false);
  const [formSplits, setFormSplits] = useState<TransactionSplit[]>([]);
  const [expandedTxs, setExpandedTxs] = useState<Record<string, boolean>>({});
  const [selectedTxs, setSelectedTxs] = useState<string[]>([]);

  const selectedStats = useMemo(() => {
    const count = selectedTxs.length;
    let income = 0;
    let expense = 0;
    
    transactions.forEach(tx => {
      if (selectedTxs.includes(tx.id)) {
        let txAmount = tx.amount;
        
        if (tx.splits && tx.splits.length > 0) {
           const hasArticleFilter = filterArticles.length > 0;
           const hasProjectFilter = filterProjects.length > 0;
           
           if (hasArticleFilter || hasProjectFilter) {
             let matchedAmount = 0;
             tx.splits.forEach(s => {
               const matchArticle = !hasArticleFilter || filterArticles.includes(s.article);
               const matchProject = !hasProjectFilter || filterProjects.includes(s.project);
               if (matchArticle && matchProject) {
                 matchedAmount += Number(s.amount);
               }
             });
             txAmount = matchedAmount;
           }
        }

        if (tx.type === 'income') income += txAmount;
        if (tx.type === 'expense' || tx.type === 'accrual') expense += Math.abs(txAmount); 
      }
    });

    const total = income - expense;
    return { count, income, expense, total };
  }, [selectedTxs, transactions, filterArticles, filterProjects]);

  // Filter options list
  const activeProjects = useMemo(() => projects.map(p => p.name), [projects]);
  const allArticles = useMemo(() => {
    return categories.map(c => c.name);
  }, [categories]);
  const allContragents = useMemo(() => {
    return Array.from(new Set(transactions.map(t => t.contragent).filter(Boolean)));
  }, [transactions]);

  // Multiple Array toggle helper
  const toggleArrayFilter = (setState: React.Dispatch<React.SetStateAction<string[]>>, item: string) => {
    setState(prev => prev.includes(item) ? prev.filter(i => i !== item) : [...prev, item]);
  };

  // Handle Search and Filter logic
  const filteredTxs = useMemo(() => {
    return transactions.filter(tx => {
      // Search matches
      const searchStr = `${tx.contragent} ${tx.article} ${tx.notes} ${tx.accountName} ${tx.splits?.map(s => `${s.article} ${s.project} ${s.notes}`).join(' ')}`.toLowerCase();
      if (searchTerm && !searchStr.includes(searchTerm.toLowerCase())) return false;

      // 1. Types of Operation
      if (!filterOpTypes.includes(tx.type)) return false;

      // 2. Date and Status
      if (tx.isConfirmed && !filterConfirmedCheck) return false;
      if (!tx.isConfirmed && !filterUnconfirmedCheck) return false;
      
      const txDate = new Date(tx.date).getTime();
      if (filterDateFrom && txDate < new Date(filterDateFrom).getTime()) return false;
      if (filterDateTo && txDate > new Date(filterDateTo).getTime()) return false;

      // 3. Parameters
      if (filterAccounts.length > 0 && !filterAccounts.includes(tx.accountId)) return false;
      if (filterContragents.length > 0 && !filterContragents.includes(tx.contragent)) return false;
      if (filterArticles.length > 0) {
        const matchesMain = filterArticles.includes(tx.article);
        const matchesSplits = tx.splits?.some(s => filterArticles.includes(s.article));
        if (!matchesMain && !matchesSplits) return false;
      }
      if (filterProjects.length > 0) {
        const matchesMain = filterProjects.includes(tx.project);
        const matchesSplits = tx.splits?.some(s => filterProjects.includes(s.project));
        if (!matchesMain && !matchesSplits) return false;
      }

      // 4. Amount
      const absAmount = Math.abs(tx.amount);
      if (filterAmountMin && absAmount < Number(filterAmountMin)) return false;
      if (filterAmountMax && absAmount > Number(filterAmountMax)) return false;

      return true;
    });
  }, [
    transactions, searchTerm, filterOpTypes, 
    filterConfirmedCheck, filterUnconfirmedCheck, filterDateFrom, filterDateTo,
    filterAccounts, filterContragents, filterArticles, filterProjects,
    filterAmountMin, filterAmountMax
  ]);

  const handleOpenCreate = () => {
    setFormType('income');
    setFormDate('2026-05-30');
    setFormAccountId(subAccounts[0]?.id || '1');
    setFormAmount('');
    setFormContragent('');
    setFormArticle('Обучение за рубежом');
    setFormProject('Nova Educ');
    setFormNotes('');
    setFormIsConfirmed(true);
    setFormIsRecurring(false);
    setFormRecurringFreq('monthly');
    setFormAttachment(null);
    setFormHasSplits(false);
    setFormSplits([]);
    setIsCreateOpen(true);
  };

  const handleOpenEdit = (tx: Transaction) => {
    setEditingTx(tx);
    setFormType(tx.type);
    setFormDate(tx.date);
    setFormAccountId(tx.accountId);
    setFormAmount(tx.amount.toString());
    setFormContragent(tx.contragent);
    setFormArticle(tx.article);
    setFormProject(tx.project);
    setFormNotes(tx.notes);
    setFormIsConfirmed(tx.isConfirmed);
    setFormIsRecurring(tx.isRecurring || false);
    setFormRecurringFreq(tx.recurringFrequency || 'monthly');
    setFormAttachment(null);
    setFormHasSplits(!!tx.splits && tx.splits.length > 0);
    setFormSplits(tx.splits || []);
  };

  const getImpact = (type: 'income' | 'expense' | 'transfer' | 'accrual', amount: number, isConfirmed: boolean) => {
    if (!isConfirmed) return 0;
    if (type === 'income') return amount;
    if (type === 'expense' || type === 'transfer') return -amount;
    return 0;
  };

  const handleSaveTransaction = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formAmount || isNaN(Number(formAmount))) return;

    const acc = subAccounts.find(s => s.id === formAccountId);
    const accountName = acc ? acc.name : 'Наличные';

    if (editingTx) {
      // Revert old impact and apply new impact
      const oldImpact = getImpact(editingTx.type, editingTx.amount, editingTx.isConfirmed);
      const newImpact = getImpact(formType, Number(formAmount), formIsConfirmed);

      setSubAccounts(prev => prev.map(a => {
        let newBalance = a.balance;
        if (a.id === editingTx.accountId) {
          newBalance -= oldImpact;
        }
        if (a.id === formAccountId) {
          newBalance += newImpact;
        }
        return { ...a, balance: newBalance };
      }));

      // Editing
      setTransactions(prev => prev.map(t => 
        t.id === editingTx.id 
          ? {
              ...t,
              type: formType,
              date: formDate,
              accountId: formAccountId,
              accountName,
              amount: Number(formAmount),
              contragent: formContragent,
              notes: formNotes,
              isConfirmed: formIsConfirmed,
              isRecurring: formIsRecurring,
              recurringFrequency: formRecurringFreq,
              attachmentName: formAttachment?.name || t.attachmentName,
              attachmentSize: formAttachment ? `${(formAttachment.size / 1024 / 1024).toFixed(2)} MB` : t.attachmentSize,
              splits: formHasSplits ? formSplits : undefined,
              article: formHasSplits ? '(Сплит-операция)' : formArticle,
              project: formHasSplits ? '(Несколькo)' : formProject,
            }
          : t
      ));
      setEditingTx(null);
    } else {
      // Create impact
      const impact = getImpact(formType, Number(formAmount), formIsConfirmed);
      if (impact !== 0) {
        setSubAccounts(prev => prev.map(a => 
          a.id === formAccountId 
            ? { ...a, balance: a.balance + impact }
            : a
        ));
      }

      // Creating
      const newTx: Transaction = {
        id: `tx-${Date.now()}`,
        type: formType,
        date: formDate,
        accountId: formAccountId,
        accountName,
        amount: Number(formAmount),
        contragent: formContragent || 'Не указан',
        article: formHasSplits ? '(Сплит-операция)' : formArticle,
        project: formHasSplits ? '(Несколько)' : formProject,
        isConfirmed: formIsConfirmed,
        notes: formNotes,
        isRecurring: formIsRecurring,
        recurringFrequency: formIsRecurring ? formRecurringFreq : undefined,
        attachmentName: formAttachment?.name,
        attachmentSize: formAttachment ? `${(formAttachment.size / 1024 / 1024).toFixed(2)} MB` : undefined,
        splits: formHasSplits ? formSplits : undefined,
      };
      setTransactions(prev => [newTx, ...prev]);
      setIsCreateOpen(false);
    }
  };

  const handleDeleteTx = (id: string) => {
    const tx = transactions.find(t => t.id === id);
    if (!tx) return;

    // Direct deletion since window.confirm is blocked in iframes
    const impact = getImpact(tx.type, tx.amount, tx.isConfirmed);
    if (impact !== 0) {
      setSubAccounts(prev => prev.map(a => 
        a.id === tx.accountId 
          ? { ...a, balance: a.balance - impact }
          : a
      ));
    }

    setTransactions(prev => prev.filter(t => t.id !== id));
    if (editingTx?.id === id) setEditingTx(null);
  };

  const handleDeleteSelected = () => {
    const txsToDelete = transactions.filter(t => selectedTxs.includes(t.id));
    
    setSubAccounts(prev => prev.map(a => {
      let balanceChange = 0;
      txsToDelete.forEach(tx => {
        if (tx.accountId === a.id) {
          balanceChange -= getImpact(tx.type, tx.amount, tx.isConfirmed);
        }
      });
      return balanceChange !== 0 ? { ...a, balance: a.balance + balanceChange } : a;
    }));

    setTransactions(prev => prev.filter(t => !selectedTxs.includes(t.id)));
    if (editingTx && selectedTxs.includes(editingTx.id)) setEditingTx(null);
    setSelectedTxs([]);
  };

  const handleExportSelected = () => {
    const txsToExport = transactions.filter(t => selectedTxs.includes(t.id));
    if (txsToExport.length === 0) return;
    
    const headers = ['Дата', 'Счет', 'Тип', 'Сумма', 'Контрагент', 'Статья', 'Проект', 'Примечание'];
    const rows = txsToExport.map(tx => {
      const typeStr = tx.type === 'income' ? 'Приход' : tx.type === 'expense' ? 'Расход' : tx.type === 'transfer' ? 'Перевод' : 'Начисление';
      return [
        tx.date,
        tx.accountName,
        typeStr,
        tx.amount,
        tx.contragent,
        tx.article,
        tx.project,
        tx.notes
      ].map(v => `"${(v || '').toString().replace(/"/g, '""')}"`).join(',');
    });
    
    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + headers.join(',') + "\n" + rows.join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `operations_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    setSelectedTxs([]);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const arrayBuffer = event.target?.result as ArrayBuffer;
      const decoder = new TextDecoder('windows-1251');
      let text = decoder.decode(arrayBuffer);
      
      if (!text.toLowerCase().includes('выписка') && !text.toLowerCase().includes('секциядокумент')) {
        const utfDecoder = new TextDecoder('utf-8');
        text = utfDecoder.decode(arrayBuffer);
      }

      const parsed = parse1CClientBank(text);

      const detectedNewAccounts: any[] = [];
      parsed.newAccounts.forEach((acc: any) => {
        const match = subAccounts.find(
          s => s.name.includes(acc.iban) || s.id === acc.iban || s.name.toLowerCase().includes(acc.iban.toLowerCase())
        );
        if (!match) {
          const matchedLe = legalEntities.find(le => le.inn === acc.legalEntityBin);
          
          detectedNewAccounts.push({
            iban: acc.iban,
            name: `Расчетный счет Kaspi ${acc.iban.slice(-4)}`,
            parentEntity: matchedLe ? matchedLe.code : (legalEntities[0]?.code || 'NOVA'),
            type: 'non-cash',
            currency: '₸',
            balance: 0,
            initialBalance: 0
          });
        }
      });

      const mappedTxs = parsed.transactions.map((tx: any) => {
        const existingAcc = subAccounts.find(s => s.id === tx.ourIban || s.name.includes(tx.ourIban));
        const newAcc = detectedNewAccounts.find(a => a.iban === tx.ourIban);
        
        return {
          ...tx,
          accountId: existingAcc ? existingAcc.id : tx.ourIban,
          accountName: existingAcc ? existingAcc.name : (newAcc ? newAcc.name : `Счет ${tx.ourIban.slice(-4)}`)
        };
      });

      setImportTransactions(mappedTxs);
      setImportNewAccounts(detectedNewAccounts);
      setImportPhase('preview');
    };
    reader.readAsArrayBuffer(file);
  };

  const handleConfirmImport = () => {
    const createdAccounts: SubAccount[] = importNewAccounts.map(acc => ({
      id: acc.iban,
      name: acc.name,
      parentEntity: acc.parentEntity,
      type: acc.type,
      balance: Number(acc.balance) || 0,
      initialBalance: Number(acc.initialBalance) || 0,
      currency: acc.currency
    }));

    if (createdAccounts.length > 0) {
      setSubAccounts(prev => [...prev, ...createdAccounts]);
    }

    const newTxs: Transaction[] = importTransactions.map(tx => {
      const targetAcc = createdAccounts.find(a => a.id === tx.accountId) || subAccounts.find(a => a.id === tx.accountId);
      return {
        id: tx.id,
        date: tx.date,
        type: tx.type,
        amount: tx.amount,
        accountId: tx.accountId,
        accountName: targetAcc ? targetAcc.name : tx.accountName,
        contragent: tx.contragent || 'Не указан',
        article: tx.article,
        project: tx.project,
        isConfirmed: true,
        notes: tx.notes
      };
    });

    setSubAccounts(prev => prev.map(acc => {
      let balanceChange = 0;
      newTxs.forEach(tx => {
        if (tx.accountId === acc.id) {
          balanceChange += getImpact(tx.type, tx.amount, true);
        }
      });
      return balanceChange !== 0 ? { ...acc, balance: acc.balance + balanceChange } : acc;
    }));

    setTransactions(prev => [...newTxs, ...prev]);
    setIsImportOpen(false);
    setImportPhase('select');
    setImportTransactions([]);
    setImportNewAccounts([]);
    
    alert(`Успешно импортировано операций: ${newTxs.length}. Создано новых счетов: ${createdAccounts.length}.`);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
      
      {/* LEFT SIDEBAR FILTERS (PlanFact Filter Panel layout) */}
      <div className="bg-white p-6 rounded-none border border-zinc-200 shadow-none space-y-6 lg:sticky lg:top-24">
        <div className="flex items-center justify-between border-b border-zinc-200 pb-3">
          <h3 className="font-bold text-zinc-900 text-[10px] uppercase tracking-widest">Фильтры реестра</h3>
          {(searchTerm || filterOpTypes.length !== 4 || !filterConfirmedCheck || !filterUnconfirmedCheck || filterDateFrom || filterDateTo || filterAccounts.length > 0 || filterContragents.length > 0 || filterArticles.length > 0 || filterProjects.length > 0 || filterAmountMin || filterAmountMax) && (
            <button 
              onClick={() => {
                setSearchTerm('');
                setFilterOpTypes(['income', 'expense', 'transfer', 'accrual']);
                setFilterConfirmedCheck(true);
                setFilterUnconfirmedCheck(true);
                setFilterDateFrom('');
                setFilterDateTo('');
                setFilterAccounts([]);
                setFilterContragents([]);
                setFilterArticles([]);
                setFilterProjects([]);
                setFilterAmountMin('');
                setFilterAmountMax('');
              }}
              className="text-[9px] text-zinc-500 hover:text-zinc-950 font-bold uppercase tracking-widest"
            >
              Сброс
            </button>
          )}
        </div>

        {/* Types of operations */}
        <div className="space-y-1.5 border-b border-zinc-200 pb-4">
          <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest block">Тип операции</label>
          <div className="space-y-1">
            {[
              { id: 'income', label: 'Поступление' },
              { id: 'expense', label: 'Выплата' },
              { id: 'transfer', label: 'Перемещение' },
              { id: 'accrual', label: 'Начисление' }
            ].map((t) => (
              <label key={t.id} className="flex items-center gap-2 text-zinc-700 cursor-pointer text-[11px]">
                <input
                  type="checkbox"
                  checked={filterOpTypes.includes(t.id)}
                  onChange={() => toggleArrayFilter(setFilterOpTypes, t.id)}
                  className="rounded-none border-zinc-300 text-zinc-900 focus:ring-zinc-800 w-3.5 h-3.5"
                />
                <span className="font-sans leading-none mt-0.5">{t.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Date and Status */}
        <div className="space-y-3 border-b border-zinc-200 pb-4">
          <div>
            <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest block mb-1.5">Дата оплаты</label>
            <div className="space-y-1">
              <label className="flex items-center gap-2 text-zinc-700 cursor-pointer text-[11px]">
                <input type="checkbox" checked={filterConfirmedCheck} onChange={(e) => setFilterConfirmedCheck(e.target.checked)} className="rounded-none border-zinc-300 w-3.5 h-3.5" />
                <span className="font-sans leading-none mt-0.5">Подтверждена</span>
              </label>
              <label className="flex items-center gap-2 text-zinc-700 cursor-pointer text-[11px]">
                <input type="checkbox" checked={filterUnconfirmedCheck} onChange={(e) => setFilterUnconfirmedCheck(e.target.checked)} className="rounded-none border-zinc-300 w-3.5 h-3.5" />
                <span className="font-sans leading-none mt-0.5">Не подтверждена</span>
              </label>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[8px] font-bold text-zinc-400 uppercase tracking-widest block mb-1">Период от</label>
              <input type="date" value={filterDateFrom} onChange={(e) => setFilterDateFrom(e.target.value)} className="w-full text-[10px] bg-zinc-50 border border-zinc-200 p-1.5 outline-none font-mono text-zinc-800" />
            </div>
            <div>
              <label className="text-[8px] font-bold text-zinc-400 uppercase tracking-widest block mb-1">Период до</label>
              <input type="date" value={filterDateTo} onChange={(e) => setFilterDateTo(e.target.value)} className="w-full text-[10px] bg-zinc-50 border border-zinc-200 p-1.5 outline-none font-mono text-zinc-800" />
            </div>
          </div>
        </div>

        {/* Parameters */}
        <div className="space-y-3 border-b border-zinc-200 pb-4">
          <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest block">Параметры</label>

          <details className="group">
            <summary className="text-[10px] font-bold text-zinc-700 uppercase tracking-wider cursor-pointer list-none flex items-center justify-between bg-zinc-50 p-2 border border-zinc-200">
              Счет и юрлицо
              {filterAccounts.length > 0 && <span className="text-[10px] font-mono bg-zinc-200 px-1">{filterAccounts.length}</span>}
            </summary>
            <div className="border border-t-0 border-zinc-200 bg-white p-2 space-y-1 max-h-32 overflow-y-auto">
              {subAccounts.map(s => (
                <label key={s.id} className="flex items-center gap-2 text-zinc-700 cursor-pointer text-[10px]">
                  <input type="checkbox" checked={filterAccounts.includes(s.id)} onChange={() => toggleArrayFilter(setFilterAccounts, s.id)} className="rounded-none w-3 h-3" />
                  <span className="leading-tight">{s.name} [{s.parentEntity}]</span>
                </label>
              ))}
            </div>
          </details>

          <details className="group">
            <summary className="text-[10px] font-bold text-zinc-700 uppercase tracking-wider cursor-pointer list-none flex items-center justify-between bg-zinc-50 p-2 border border-zinc-200">
              Контрагент
              {filterContragents.length > 0 && <span className="text-[10px] font-mono bg-zinc-200 px-1">{filterContragents.length}</span>}
            </summary>
            <div className="border border-t-0 border-zinc-200 bg-white p-2 space-y-1 max-h-32 overflow-y-auto">
              {allContragents.map(c => (
                <label key={c} className="flex items-center gap-2 text-zinc-700 cursor-pointer text-[10px]">
                  <input type="checkbox" checked={filterContragents.includes(c)} onChange={() => toggleArrayFilter(setFilterContragents, c)} className="rounded-none w-3 h-3" />
                  <span className="leading-tight">{c}</span>
                </label>
              ))}
            </div>
          </details>

          <details className="group">
            <summary className="text-[10px] font-bold text-zinc-700 uppercase tracking-wider cursor-pointer list-none flex items-center justify-between bg-zinc-50 p-2 border border-zinc-200">
              Учетная статья
              {filterArticles.length > 0 && <span className="text-[10px] font-mono bg-zinc-200 px-1">{filterArticles.length}</span>}
            </summary>
            <div className="border border-t-0 border-zinc-200 bg-white p-2 space-y-1 max-h-32 overflow-y-auto">
              {allArticles.map(a => (
                <label key={a} className="flex items-center gap-2 text-zinc-700 cursor-pointer text-[10px]">
                  <input type="checkbox" checked={filterArticles.includes(a)} onChange={() => toggleArrayFilter(setFilterArticles, a)} className="rounded-none w-3 h-3" />
                  <span className="leading-tight">{a}</span>
                </label>
              ))}
            </div>
          </details>

          <details className="group">
            <summary className="text-[10px] font-bold text-zinc-700 uppercase tracking-wider cursor-pointer list-none flex items-center justify-between bg-zinc-50 p-2 border border-zinc-200">
              Проект
              {filterProjects.length > 0 && <span className="text-[10px] font-mono bg-zinc-200 px-1">{filterProjects.length}</span>}
            </summary>
            <div className="border border-t-0 border-zinc-200 bg-white p-2 space-y-1 max-h-32 overflow-y-auto">
              {activeProjects.map(p => (
                <label key={p} className="flex items-center gap-2 text-zinc-700 cursor-pointer text-[10px]">
                  <input type="checkbox" checked={filterProjects.includes(p)} onChange={() => toggleArrayFilter(setFilterProjects, p)} className="rounded-none w-3 h-3" />
                  <span className="leading-tight">{p}</span>
                </label>
              ))}
            </div>
          </details>
        </div>

        {/* Amount limits */}
        <div className="space-y-1.5">
          <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest block mb-1">Сумма (по модулю)</label>
          <div className="grid grid-cols-2 gap-2">
            <input type="number" placeholder="От..." value={filterAmountMin} onChange={(e) => setFilterAmountMin(e.target.value)} className="w-full text-[11px] bg-zinc-50 border border-zinc-200 p-2 outline-none font-mono text-zinc-800" />
            <input type="number" placeholder="До..." value={filterAmountMax} onChange={(e) => setFilterAmountMax(e.target.value)} className="w-full text-[11px] bg-zinc-50 border border-zinc-200 p-2 outline-none font-mono text-zinc-800" />
          </div>
        </div>
      </div>

      {/* CENTRAL TRANSACTIONS TABLE */}
      <div className="bg-white rounded-none border border-zinc-200 shadow-none lg:col-span-3 overflow-hidden">
        
        {/* Table Controls (Creation & Statement imports) */}
        <div className="p-5 bg-zinc-55 bg-zinc-50/80 border-b border-zinc-200 flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3">
          <div className="relative flex-grow max-w-sm">
            <input
              type="text"
              placeholder="Поиск по контрагенту, статье..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full text-[11px] bg-white border border-zinc-200 rounded-none py-2 pl-8 pr-3 text-zinc-700 font-mono focus:outline-none focus:border-zinc-800 transition-colors"
            />
            <Search size={14} className="text-zinc-400 absolute left-3 top-2" />
          </div>

          <div className="flex items-center gap-2">
            {/* Import Statement */}
            <button
              onClick={() => setIsImportOpen(true)}
              className="flex items-center justify-center gap-1.5 bg-white border border-zinc-200 px-3.5 py-2 rounded-none text-[11px] font-bold uppercase tracking-wider text-zinc-700 hover:bg-zinc-100 transition-colors"
            >
              <Upload size={12} className="text-zinc-500" />
              <span>Импортировать выписку</span>
            </button>

            {/* Create Button */}
            <button
              onClick={handleOpenCreate}
              className="flex items-center justify-center gap-1.5 bg-zinc-900 hover:bg-zinc-800 text-white px-4 py-2 rounded-none text-[11px] font-bold uppercase tracking-wider transition-colors"
            >
              <Plus size={13} />
              <span>Создать операцию</span>
            </button>
          </div>
        </div>

        {/* Ledger Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-zinc-55 bg-zinc-50/40 text-[9px] font-bold text-zinc-400 uppercase tracking-[0.16em] border-b border-zinc-200">
                <th className="p-3.5 w-10 text-center">
                  <input
                    type="checkbox"
                    className="w-3.5 h-3.5 accent-zinc-900 cursor-pointer"
                    checked={filteredTxs.length > 0 && selectedTxs.length === filteredTxs.length}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedTxs(filteredTxs.map(t => t.id));
                      } else {
                        setSelectedTxs([]);
                      }
                    }}
                  />
                </th>
                <th className="p-3.5">Дата</th>
                <th className="p-3.5">Счет поступления</th>
                <th className="p-3.5">Тип</th>
                <th className="p-3.5">Контрагент</th>
                <th className="p-3.5">Статья</th>
                <th className="p-3.5">Проект</th>
                <th className="p-3.5 text-right">Сумма</th>
                <th className="p-3.5 text-center">Действия</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-150 text-zinc-600">
              {filteredTxs.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-12 text-center text-zinc-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <AlertCircle size={28} className="text-zinc-300" />
                      <div className="font-sans italic text-zinc-400">Операций, подходящих под критерии фильтра, не найдено</div>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredTxs.map((tx) => {
                  const isInc = tx.type === 'income';
                  return (
                    <React.Fragment key={tx.id}>
                    <tr 
                      className={`hover:bg-zinc-50/70 cursor-pointer transition-colors group ${
                        editingTx?.id === tx.id ? 'bg-zinc-55 bg-zinc-50' : ''
                      }`}
                      onClick={() => handleOpenEdit(tx)}
                    >
                      <td className="p-3.5 text-center" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          className="w-3.5 h-3.5 accent-zinc-900 cursor-pointer"
                          checked={selectedTxs.includes(tx.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedTxs(prev => [...prev, tx.id]);
                            } else {
                              setSelectedTxs(prev => prev.filter(id => id !== tx.id));
                            }
                          }}
                        />
                      </td>
                      <td className="p-3.5 font-mono text-[11px] text-zinc-500 whitespace-nowrap">{tx.date}</td>
                      <td className="p-3.5 font-medium text-zinc-800 whitespace-nowrap">{tx.accountName}</td>
                      <td className="p-3.5">
                        <span className={`px-1.5 py-0.5 rounded-none text-[9px] font-bold uppercase tracking-wider border ${
                          tx.type === 'income' ? 'bg-zinc-50 border-zinc-250 text-zinc-800' :
                          tx.type === 'expense' ? 'bg-zinc-50 border-zinc-250 text-zinc-800' :
                          tx.type === 'transfer' ? 'bg-zinc-50 border-zinc-250 text-zinc-800' : 'bg-zinc-50 border-zinc-250 text-zinc-800'
                        }`}>
                          {tx.type === 'income' ? 'Приход' :
                           tx.type === 'expense' ? 'Расход' :
                           tx.type === 'transfer' ? 'Перевод' : 'Начисл.'}
                        </span>
                      </td>
                      <td className="p-3.5 font-medium text-zinc-900 max-w-[140px] truncate">{tx.contragent}</td>
                      <td className="p-3.5 font-medium text-zinc-850 whitespace-nowrap">
                        {tx.splits && tx.splits.length > 0 ? (
                          <div 
                            className="flex items-center gap-1.5 text-teal-600 hover:text-teal-800 transition-colors"
                            onClick={(e) => {
                              e.stopPropagation();
                              setExpandedTxs(prev => ({ ...prev, [tx.id]: !prev[tx.id] }));
                            }}
                          >
                            <span className="font-bold underline decoration-dotted underline-offset-4">{tx.article}</span>
                            <div className={`transition-transform duration-200 ${expandedTxs[tx.id] ? 'rotate-180' : ''}`}>
                              <ChevronDown size={14} />
                            </div>
                          </div>
                        ) : tx.article}
                      </td>
                      <td className="p-3.5">
                        <span className="text-[10px] bg-zinc-100 border border-zinc-200 text-zinc-600 px-2 py-0.5 rounded-none font-mono">
                          {tx.project}
                        </span>
                      </td>
                      <td className={`p-3.5 text-right font-mono font-bold whitespace-nowrap text-xs text-zinc-900`}>
                        {tx.type === 'expense' ? '-' : ''}{formatCurrency(tx.amount, '₸')}
                      </td>
                      <td className="p-3.5 text-center" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => handleOpenEdit(tx)}
                            className="p-1 text-zinc-400 hover:text-zinc-900 transition-colors"
                            title="Редактировать"
                          >
                            <Edit3 size={12} />
                          </button>
                          <button
                            onClick={() => handleDeleteTx(tx.id)}
                            className="p-1 text-zinc-400 hover:text-zinc-900 transition-colors"
                            title="Удалить"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </td>
                    </tr>
                    {tx.splits && expandedTxs[tx.id] && tx.splits.map((s, idx) => {
                      const matchArticle = filterArticles.length === 0 || filterArticles.includes(s.article);
                      const matchProject = filterProjects.length === 0 || filterProjects.includes(s.project);
                      const isSplitMatch = matchArticle && matchProject;
                      return (
                        <tr key={s.id} className={`bg-zinc-50/50 hover:bg-zinc-100 transition-all cursor-pointer border-t border-dashed border-zinc-200 ${isSplitMatch ? '' : 'opacity-30'}`} onClick={() => handleOpenEdit(tx)}>
                          <td className="p-3.5 bg-zinc-50/30"></td>
                          <td className="p-3.5 text-center border-l-2 border-zinc-300">
                            <div className="w-full flex justify-center">
                              <span className="block w-2 h-2 border-l-2 border-b-2 border-zinc-300 -translate-y-1"></span>
                            </div>
                          </td>
                          <td className="p-3.5 font-mono text-[10px] text-zinc-400 uppercase tracking-widest" colSpan={2}>
                            Часть {idx + 1}
                          </td>
                          <td className="p-3.5 font-medium text-zinc-500 max-w-[140px] truncate">{s.notes}</td>
                          <td className="p-3.5 font-medium text-zinc-500">{s.article}</td>
                          <td className="p-3.5">
                            <span className="text-[10px] bg-white border border-zinc-200 text-zinc-500 px-2 py-0.5 rounded-none font-mono">
                              {s.project}
                            </span>
                          </td>
                          <td className={`p-3.5 text-right font-mono font-medium whitespace-nowrap text-xs text-zinc-600`}>
                            {tx.type === 'expense' ? '-' : ''}{formatCurrency(s.amount, '₸')}
                          </td>
                          <td className="p-3.5 border-r border-zinc-300"></td>
                        </tr>
                      );
                    })}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer aggregate bar */}
        <div className="p-4 bg-zinc-900 text-zinc-400 border-t border-zinc-800 grid grid-cols-2 sm:grid-cols-4 gap-3 text-center text-[10px] font-mono uppercase tracking-wider">
          <div className="text-left pl-2">
            <span className="text-zinc-500 mr-2">Всего операций:</span>
            <span className="font-bold text-white font-mono">{filteredTxs.length}</span>
          </div>
          <div>
            <span className="text-zinc-500 mr-2">Все Приходы:</span>
            <span className="font-bold text-white font-mono">
              {formatCurrency(filteredTxs.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0))}
            </span>
          </div>
          <div>
            <span className="text-zinc-500 mr-2">Все Расходы:</span>
            <span className="font-bold text-zinc-200 font-mono">
              {formatCurrency(filteredTxs.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0))}
            </span>
          </div>
          <div className="text-right pr-2">
            <span className="text-zinc-500 mr-2">Итого Сальдо:</span>
            <span className="font-bold text-white font-mono">
              {formatCurrency(
                filteredTxs.reduce((sum, t) => sum + (t.type === 'income' ? t.amount : -t.amount), 0)
              )}
            </span>
          </div>
        </div>

      </div>

      {/* CREATE TRANSACTION MODAL & SLIDER */}
      {isCreateOpen && (
        <div className="fixed inset-0 bg-zinc-950/70 z-50 flex justify-end backdrop-blur-xs transition-opacity animate-fade-in">
          <div className="w-full max-w-xl bg-white h-full border-l border-zinc-200 flex flex-col">
            <div className="p-6 border-b border-zinc-200 flex items-center justify-between bg-zinc-900 text-white">
              <div>
                <h3 className="font-serif italic font-bold text-lg leading-none">Создание финансовой операции</h3>
                <p className="text-[10px] text-zinc-400 uppercase tracking-widest mt-1">Добавьте доходы, выплаты, уплаты налогов или проекты</p>
              </div>
              <button onClick={() => setIsCreateOpen(false)} className="text-zinc-400 hover:text-white transition-colors">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveTransaction} className="flex-1 overflow-y-auto p-6 space-y-5">
              
              {/* Type Switcher */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Вид операции</label>
                <div className="grid grid-cols-4 gap-1 p-1 bg-zinc-100 border border-zinc-200 rounded-none">
                  {[
                    { id: 'income', label: 'Поступление', color: 'bg-zinc-900 text-white' },
                    { id: 'expense', label: 'Выплата', color: 'bg-zinc-900 text-white' },
                    { id: 'transfer', label: 'Перевод', color: 'bg-zinc-900 text-white' },
                    { id: 'accrual', label: 'Начисление', color: 'bg-zinc-900 text-white' },
                  ].map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => {
                        setFormType(t.id as any);
                        setFormArticle(t.id === 'income' ? 'Обучение за рубежом' : 'Зарплата');
                      }}
                      className={`py-2 rounded-none text-[10px] font-bold text-center transition-all uppercase tracking-wider ${
                        formType === t.id ? t.color : 'text-zinc-400 hover:text-zinc-650'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Date & Confirmation Toggle */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase block tracking-wider">Дата операции</label>
                  <input
                    type="date"
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    required
                    className="w-full text-xs border border-zinc-200 rounded-none p-2.5 text-zinc-800 bg-zinc-50 font-mono focus:bg-white focus:border-zinc-800 outline-none"
                  />
                </div>
                <div className="space-y-1.5 flex flex-col justify-end">
                  <label className="flex items-center gap-2 border border-zinc-200 p-2 text-xs font-bold text-zinc-700 bg-zinc-50 rounded-none cursor-pointer hover:bg-zinc-100 select-none">
                    <input
                      type="checkbox"
                      checked={formIsConfirmed}
                      onChange={(e) => setFormIsConfirmed(e.target.checked)}
                      className="rounded-none border-zinc-300 text-zinc-900 focus:ring-zinc-800 w-4 h-4 shadow-none"
                    />
                    <span className="font-sans">Подтвердить ведомость</span>
                  </label>
                </div>
              </div>

              {/* Sub-account selection & Amount */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase block tracking-wider">Счет и юрлицо</label>
                  <select
                    value={formAccountId}
                    onChange={(e) => {
                      if (e.target.value === 'CREATE_NEW') setCreateAccountModal(true);
                      else setFormAccountId(e.target.value);
                    }}
                    className="w-full text-xs border border-zinc-200 rounded-none p-2.5 text-zinc-850 bg-zinc-50 outline-none focus:bg-white focus:border-zinc-800"
                  >
                    {subAccounts.map((sub) => (
                      <option key={sub.id} value={sub.id}>
                        {sub.name} [{sub.parentEntity}] ({sub.balance >= 0 ? '+' : ''}{formatCurrency(sub.balance, '')})
                      </option>
                    ))}
                    <option value="CREATE_NEW">+++ Создать счет +++</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase block tracking-wider">Сумма в KZT (₸)</label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="0"
                      value={formAmount}
                      onChange={(e) => setFormAmount(e.target.value.replace(/\D/g, ''))}
                      required
                      className="w-full text-xs border border-zinc-200 rounded-none p-2.5 pl-3 pr-10 text-zinc-800 bg-zinc-50 font-mono font-bold focus:outline-none focus:bg-white focus:border-zinc-800"
                    />
                    <span className="absolute right-3.5 top-2.5 text-xs text-zinc-400 font-bold font-mono">₸</span>
                  </div>
                </div>
              </div>

              {/* Contragent Selection */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-zinc-400 uppercase block tracking-wider">Контрагент / Клиент</label>
                <input
                  type="text"
                  placeholder="ФИО сотрудника, наименование компании ФОП или инвестора"
                  value={formContragent}
                  onChange={(e) => setFormContragent(e.target.value)}
                  className="w-full text-xs border border-zinc-200 rounded-none p-2.5 text-zinc-800 bg-zinc-50 focus:outline-none focus:bg-white focus:border-zinc-800"
                />
              </div>

              {/* Categorical Article & Project */}
              {/* Categorical Article & Project */}
              <div className="flex items-center gap-3 bg-zinc-50 border border-zinc-200 p-3">
                <input 
                  type="checkbox" 
                  checked={formHasSplits} 
                  onChange={(e) => {
                    setFormHasSplits(e.target.checked);
                    if (e.target.checked && formSplits.length === 0) {
                      setFormSplits([{ id: `split-${Date.now()}`, amount: Number(formAmount) || 0, article: formArticle, project: formProject, notes: '' }]);
                    }
                  }}
                  id="create-splits"
                  className="w-4 h-4 cursor-pointer accent-zinc-900"
                />
                <label htmlFor="create-splits" className="text-xs text-zinc-700 font-bold select-none cursor-pointer flex-1">Сплитование операции (разбить на части)</label>
              </div>

              {!formHasSplits ? (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase block tracking-wider">Учетная статья</label>
                    <select
                      value={formArticle}
                      onChange={(e) => {
                        if (e.target.value === 'CREATE_NEW') setCreateArticleModal(true);
                        else setFormArticle(e.target.value);
                      }}
                      className="w-full text-xs border border-zinc-200 rounded-none p-2.5 text-zinc-850 bg-zinc-50 outline-none focus:bg-white focus:border-zinc-800"
                    >
                      {allArticles.map((art, idx) => (
                        <option key={idx} value={art}>{art}</option>
                      ))}
                      <option value="CREATE_NEW">+++ Создать статью +++</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase block tracking-wider">Корпоративный проект</label>
                    <select
                      value={formProject}
                      onChange={(e) => {
                        if (e.target.value === 'CREATE_NEW') setCreateProjectModal(true);
                        else setFormProject(e.target.value);
                      }}
                      className="w-full text-xs border border-zinc-200 rounded-none p-2.5 text-zinc-850 bg-zinc-50 outline-none focus:bg-white focus:border-zinc-800"
                    >
                      {activeProjects.map((proj, idx) => (
                        <option key={idx} value={proj}>{proj}</option>
                      ))}
                      <option value="CREATE_NEW">+++ Создать проект +++</option>
                    </select>
                  </div>
                </div>
              ) : (
                <div className="space-y-3 bg-zinc-50 border border-zinc-200 p-4">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Части операции</label>
                    <div className="text-[10px] font-mono text-zinc-500">
                      Всего разбито: {formSplits.reduce((acc, s) => acc + Number(s.amount || 0), 0).toLocaleString('ru-RU')} / 
                      {Number(formAmount || 0).toLocaleString('ru-RU')}
                    </div>
                  </div>
                  {formSplits.map((split, idx) => (
                    <div key={split.id} className="grid grid-cols-12 gap-2 relative group p-3 bg-white border border-zinc-200 shadow-sm">
                      <div className="col-span-3">
                        <label className="text-[9px] font-bold text-zinc-400 uppercase block mb-1">Сумма</label>
                        <input
                          type="number"
                          value={split.amount}
                          onChange={e => {
                            const newSplits = [...formSplits];
                            newSplits[idx].amount = Number(e.target.value);
                            setFormSplits(newSplits);
                          }}
                          className="w-full text-xs border border-zinc-200 p-1.5 outline-none font-mono focus:border-zinc-800"
                        />
                      </div>
                      <div className="col-span-4">
                        <label className="text-[9px] font-bold text-zinc-400 uppercase block mb-1">Статья</label>
                        <select
                          value={split.article}
                          onChange={e => {
                            const newSplits = [...formSplits];
                            newSplits[idx].article = e.target.value;
                            setFormSplits(newSplits);
                          }}
                          className="w-full text-[10px] border border-zinc-200 p-1.5 outline-none focus:border-zinc-800"
                        >
                          {allArticles.map(a => <option key={a} value={a}>{a}</option>)}
                        </select>
                      </div>
                      <div className="col-span-4">
                        <label className="text-[9px] font-bold text-zinc-400 uppercase block mb-1">Проект</label>
                        <select
                          value={split.project}
                          onChange={e => {
                            const newSplits = [...formSplits];
                            newSplits[idx].project = e.target.value;
                            setFormSplits(newSplits);
                          }}
                          className="w-full text-[10px] border border-zinc-200 p-1.5 outline-none focus:border-zinc-800"
                        >
                          {activeProjects.map(p => <option key={p} value={p}>{p}</option>)}
                        </select>
                      </div>
                      <div className="col-span-1 flex items-end justify-end pb-1 pb-1">
                        <button 
                          type="button" 
                          onClick={() => {
                            setFormSplits(formSplits.filter(s => s.id !== split.id));
                          }}
                          className="text-red-600 hover:text-red-800 font-bold text-xs"
                        >
                          &times;
                        </button>
                      </div>
                      <div className="col-span-12 mt-1">
                        <input
                          type="text"
                          placeholder="Примечание к части (опционально)"
                          value={split.notes}
                          onChange={e => {
                            const newSplits = [...formSplits];
                            newSplits[idx].notes = e.target.value;
                            setFormSplits(newSplits);
                          }}
                          className="w-full text-[10px] border border-zinc-200 p-1.5 focus:border-zinc-800 outline-none"
                        />
                      </div>
                    </div>
                  ))}
                  <button 
                    type="button" 
                    onClick={() => {
                      const currentSum = formSplits.reduce((acc, s) => acc + Number(s.amount || 0), 0);
                      const remainder = Math.max(0, Number(formAmount || 0) - currentSum);
                      setFormSplits([...formSplits, { id: `split-${Date.now()}`, amount: remainder, article: allArticles[0], project: activeProjects[0], notes: '' }]);
                    }}
                    className="w-full py-2 border border-zinc-300 text-xs text-zinc-600 font-bold uppercase tracking-wider hover:bg-zinc-100 transition-colors bg-white mt-2 cursor-pointer"
                  >
                    + Добавить часть операции
                  </button>
                </div>
              )}

              {/* Description Notes & File Attachment Dropzone */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-zinc-400 uppercase block tracking-wider">Назначение платежа (Примечания)</label>
                <textarea
                  placeholder="Введите описание, комментарии или целевое распределение платежа"
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  rows={2}
                  className="w-full text-xs border border-zinc-200 rounded-none p-2.5 text-zinc-800 bg-zinc-50 focus:outline-none focus:bg-white focus:border-zinc-800"
                ></textarea>
              </div>

              {/* Drag/Drop receipts block */}
              <label className="border border-dashed border-zinc-250 rounded-none p-5 bg-zinc-50 text-center text-xs space-y-2 select-none group cursor-pointer hover:border-zinc-800 hover:bg-zinc-100 transition-all block relative">
                <input type="file" className="hidden" onChange={e => {
                  if (e.target.files && e.target.files.length > 0) {
                    setFormAttachment(e.target.files[0]);
                  }
                }} />
                <Paperclip size={20} className="mx-auto text-zinc-400 group-hover:text-zinc-900 transition-colors" />
                <div>
                  <span className="font-bold text-zinc-800 group-hover:text-zinc-950">Прикрепите к операции первичные файлы</span>
                  <p className="text-[10px] text-zinc-400 mt-1 uppercase tracking-wider">подтверждения квитанций, ПКО, инвойсы, акты</p>
                  {formAttachment && <p className="mt-2 text-teal-600 font-bold">{formAttachment.name}</p>}
                </div>
              </label>

              {/* Recurring payments */}
              <div className="flex items-center gap-3 bg-zinc-50 border border-zinc-200 p-4">
                <input 
                  type="checkbox" 
                  checked={formIsRecurring} 
                  onChange={(e) => setFormIsRecurring(e.target.checked)}
                  id="create-recurring"
                  className="w-4 h-4 cursor-pointer accent-zinc-900"
                />
                <label htmlFor="create-recurring" className="text-xs text-zinc-700 font-bold select-none cursor-pointer flex-1">Сделать этот платеж регулярным (Календарь)</label>
                {formIsRecurring && (
                  <select 
                    value={formRecurringFreq} 
                    onChange={e => setFormRecurringFreq(e.target.value as any)}
                    className="text-xs border border-zinc-200 p-1.5 outline-none bg-white text-zinc-800 focus:border-zinc-800"
                  >
                    <option value="weekly">Еженедельно</option>
                    <option value="monthly">Ежемесячно</option>
                    <option value="yearly">Ежегодно</option>
                  </select>
                )}
              </div>

              {/* Buttons */}
              <div className="flex gap-3 pt-4 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="flex-1 border border-zinc-200 text-[11px] font-bold text-zinc-600 uppercase tracking-wider py-3 rounded-none hover:bg-zinc-50 transition-colors"
                >
                  Отменить
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-zinc-900 text-[11px] font-bold text-white uppercase tracking-wider py-3 rounded-none hover:bg-zinc-800 transition-colors"
                >
                  Записать операцию
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* EDIT SIDEBAR SHEET */}
      {editingTx && (
        <div className="fixed inset-0 bg-zinc-950/70 z-50 flex justify-end backdrop-blur-xs transition-opacity">
          <div className="w-full max-w-xl bg-white h-full border-l border-zinc-200 flex flex-col">
            <div className="p-6 border-b border-zinc-200 flex items-center justify-between bg-zinc-900 text-white">
              <div>
                <h3 className="font-serif italic font-bold text-lg leading-none">Редактирование операции</h3>
                <p className="text-[10px] text-zinc-400 uppercase tracking-widest mt-1">ID операции: {editingTx.id}</p>
              </div>
              <button onClick={() => setEditingTx(null)} className="text-zinc-400 hover:text-white transition-colors">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveTransaction} className="flex-1 overflow-y-auto p-6 space-y-5">
              
              {/* Delete button option */}
              <div className="p-4 bg-red-50 border border-red-200 text-red-950 rounded-none flex items-center justify-between text-xs">
                <span className="font-sans text-[11px] font-medium">Внимание! Все изменения немедленно обновят отчеты.</span>
                <button 
                  type="button"
                  onClick={() => handleDeleteTx(editingTx.id)}
                  className="bg-red-900 hover:bg-red-950 text-white rounded-none px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 shrink-0 transition-colors"
                >
                  <Trash2 size={11} />
                  <span>Удалить</span>
                </button>
              </div>

              {/* Type selector */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Вид операции</label>
                <div className="grid grid-cols-4 gap-1 p-1 bg-zinc-100 border border-zinc-250 rounded-none">
                  {[
                    { id: 'income', label: 'Поступление', color: 'bg-zinc-900 text-white' },
                    { id: 'expense', label: 'Выплата', color: 'bg-zinc-900 text-white' },
                    { id: 'transfer', label: 'Перевод', color: 'bg-zinc-900 text-white' },
                    { id: 'accrual', label: 'Начисление', color: 'bg-zinc-900 text-white' },
                  ].map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setFormType(t.id as any)}
                      className={`py-2 rounded-none text-[10px] font-bold text-center transition-all uppercase tracking-wider ${
                        formType === t.id ? t.color : 'text-zinc-400 hover:text-zinc-650'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Date & Confirm */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase block tracking-wider font-semibold">Дата платежа</label>
                  <input
                    type="date"
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    required
                    className="w-full text-xs border border-zinc-200 rounded-none p-2.5 text-zinc-800 bg-zinc-50 font-mono focus:bg-white focus:border-zinc-800 outline-none"
                  />
                </div>
                <div className="space-y-1.5 flex flex-col justify-end">
                  <label className="flex items-center gap-2 border border-zinc-200 p-2 text-xs font-bold text-zinc-750 bg-zinc-50 rounded-none cursor-pointer hover:bg-zinc-100 select-none">
                    <input
                      type="checkbox"
                      checked={formIsConfirmed}
                      onChange={(e) => setFormIsConfirmed(e.target.checked)}
                      className="rounded-none border-zinc-300 text-zinc-900 focus:ring-zinc-800 w-4 h-4 shadow-none"
                    />
                    <span className="font-sans">Подтвердить ведомость</span>
                  </label>
                </div>
              </div>

              {/* Subaccounts & Amount */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase block tracking-wider">Кошелек</label>
                  <select
                    value={formAccountId}
                    onChange={(e) => {
                      if (e.target.value === 'CREATE_NEW') setCreateAccountModal(true);
                      else setFormAccountId(e.target.value);
                    }}
                    className="w-full text-xs border border-zinc-200 rounded-none p-2.5 text-zinc-850 bg-zinc-50 outline-none focus:bg-white focus:border-zinc-800"
                  >
                    {subAccounts.map((sub) => (
                      <option key={sub.id} value={sub.id}>{sub.name} [{sub.parentEntity}]</option>
                    ))}
                    <option value="CREATE_NEW">+++ Создать счет +++</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase block tracking-wider">Сумма валюты (₸)</label>
                  <input
                    type="text"
                    value={formAmount}
                    onChange={(e) => setFormAmount(e.target.value.replace(/\D/g, ''))}
                    className="w-full text-xs border border-zinc-200 rounded-none p-2.5 text-zinc-800 bg-zinc-50 font-mono font-bold focus:outline-none focus:bg-white focus:border-zinc-800"
                  />
                </div>
              </div>

              {/* Contragent Selection */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-zinc-400 uppercase block tracking-wider">Контрагент (Составитель)</label>
                <input
                  type="text"
                  value={formContragent}
                  onChange={(e) => setFormContragent(e.target.value)}
                  className="w-full text-xs border border-zinc-200 rounded-none p-2.5 text-zinc-850 bg-zinc-50 focus:outline-none focus:bg-white focus:border-zinc-800"
                />
              </div>

              {/* Categories & Projects */}
              <div className="flex items-center gap-3 bg-zinc-50 border border-zinc-200 p-3">
                <input 
                  type="checkbox" 
                  checked={formHasSplits} 
                  onChange={(e) => {
                    setFormHasSplits(e.target.checked);
                    if (e.target.checked && formSplits.length === 0) {
                      setFormSplits([{ id: `split-${Date.now()}`, amount: Number(formAmount) || 0, article: formArticle, project: formProject, notes: '' }]);
                    }
                  }}
                  id="edit-splits"
                  className="w-4 h-4 cursor-pointer accent-zinc-900"
                />
                <label htmlFor="edit-splits" className="text-xs text-zinc-700 font-bold select-none cursor-pointer flex-1">Сплитование операции (разбить на части)</label>
              </div>

              {!formHasSplits ? (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase block tracking-wider">Статья затрат/прибыли</label>
                    <select
                      value={formArticle}
                      onChange={(e) => {
                        if (e.target.value === 'CREATE_NEW') setCreateArticleModal(true);
                        else setFormArticle(e.target.value);
                      }}
                      className="w-full text-xs border border-zinc-200 rounded-none p-2.5 text-zinc-850 bg-zinc-50 outline-none focus:bg-white focus:border-zinc-800"
                    >
                      {allArticles.map((art, idx) => (
                        <option key={idx} value={art}>{art}</option>
                      ))}
                      <option value="CREATE_NEW">+++ Создать статью +++</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase block tracking-wider">Корпоративный проект</label>
                    <select
                      value={formProject}
                      onChange={(e) => {
                        if (e.target.value === 'CREATE_NEW') setCreateProjectModal(true);
                        else setFormProject(e.target.value);
                      }}
                      className="w-full text-xs border border-zinc-200 rounded-none p-2.5 text-zinc-850 bg-zinc-50 outline-none focus:bg-white focus:border-zinc-800"
                    >
                      {activeProjects.map((p, idx) => (
                        <option key={idx} value={p}>{p}</option>
                      ))}
                      <option value="CREATE_NEW">+++ Создать проект +++</option>
                    </select>
                  </div>
                </div>
              ) : (
                <div className="space-y-3 bg-zinc-50 border border-zinc-200 p-4">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Части операции</label>
                    <div className="text-[10px] font-mono text-zinc-500">
                      Всего разбито: {formSplits.reduce((acc, s) => acc + Number(s.amount || 0), 0).toLocaleString('ru-RU')} / 
                      {Number(formAmount || 0).toLocaleString('ru-RU')}
                    </div>
                  </div>
                  {formSplits.map((split, idx) => (
                    <div key={split.id} className="grid grid-cols-12 gap-2 relative group p-3 bg-white border border-zinc-200 shadow-sm">
                      <div className="col-span-3">
                        <label className="text-[9px] font-bold text-zinc-400 uppercase block mb-1">Сумма</label>
                        <input
                          type="number"
                          value={split.amount}
                          onChange={e => {
                            const newSplits = [...formSplits];
                            newSplits[idx].amount = Number(e.target.value);
                            setFormSplits(newSplits);
                          }}
                          className="w-full text-xs border border-zinc-200 p-1.5 outline-none font-mono focus:border-zinc-800"
                        />
                      </div>
                      <div className="col-span-4">
                        <label className="text-[9px] font-bold text-zinc-400 uppercase block mb-1">Статья</label>
                        <select
                          value={split.article}
                          onChange={e => {
                            const newSplits = [...formSplits];
                            newSplits[idx].article = e.target.value;
                            setFormSplits(newSplits);
                          }}
                          className="w-full text-[10px] border border-zinc-200 p-1.5 outline-none focus:border-zinc-800"
                        >
                          {allArticles.map(a => <option key={a} value={a}>{a}</option>)}
                        </select>
                      </div>
                      <div className="col-span-4">
                        <label className="text-[9px] font-bold text-zinc-400 uppercase block mb-1">Проект</label>
                        <select
                          value={split.project}
                          onChange={e => {
                            const newSplits = [...formSplits];
                            newSplits[idx].project = e.target.value;
                            setFormSplits(newSplits);
                          }}
                          className="w-full text-[10px] border border-zinc-200 p-1.5 outline-none focus:border-zinc-800"
                        >
                          {activeProjects.map(p => <option key={p} value={p}>{p}</option>)}
                        </select>
                      </div>
                      <div className="col-span-1 flex items-end justify-end pb-1 pb-1">
                        <button 
                          type="button" 
                          onClick={() => {
                            setFormSplits(formSplits.filter(s => s.id !== split.id));
                          }}
                          className="text-red-600 hover:text-red-800 font-bold text-xs"
                        >
                          &times;
                        </button>
                      </div>
                      <div className="col-span-12 mt-1">
                        <input
                          type="text"
                          placeholder="Примечание к части (опционально)"
                          value={split.notes}
                          onChange={e => {
                            const newSplits = [...formSplits];
                            newSplits[idx].notes = e.target.value;
                            setFormSplits(newSplits);
                          }}
                          className="w-full text-[10px] border border-zinc-200 p-1.5 focus:border-zinc-800 outline-none"
                        />
                      </div>
                    </div>
                  ))}
                  <button 
                    type="button" 
                    onClick={() => {
                      const currentSum = formSplits.reduce((acc, s) => acc + Number(s.amount || 0), 0);
                      const remainder = Math.max(0, Number(formAmount || 0) - currentSum);
                      setFormSplits([...formSplits, { id: `split-${Date.now()}`, amount: remainder, article: allArticles[0], project: activeProjects[0], notes: '' }]);
                    }}
                    className="w-full py-2 border border-zinc-300 text-xs text-zinc-600 font-bold uppercase tracking-wider hover:bg-zinc-100 transition-colors bg-white mt-2 cursor-pointer"
                  >
                    + Добавить часть операции
                  </button>
                </div>
              )}

              {/* Memo Textarea */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-zinc-400 uppercase block tracking-wider">Описание назначения платежа</label>
                <textarea
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  rows={2}
                  className="w-full text-xs border border-zinc-200 rounded-none p-2.5 text-zinc-805 bg-zinc-50 focus:outline-none focus:bg-white focus:border-zinc-800"
                ></textarea>
              </div>

              {/* Interactive File Area */}
              <label className="p-4 bg-zinc-50 rounded-none border border-zinc-200 space-y-2 text-xs text-zinc-600 font-mono block relative cursor-pointer hover:border-zinc-800 transition-colors">
                <input type="file" className="hidden" onChange={e => {
                  if (e.target.files && e.target.files.length > 0) {
                    setFormAttachment(e.target.files[0]);
                  }
                }} />
                <div className="flex justify-between items-center text-zinc-800">
                  <span className="font-bold flex items-center gap-1 uppercase text-[9px] tracking-wider"><Paperclip size={12} className="text-zinc-400" /> Первичные файлы</span>
                  <span className="text-[10px] text-zinc-400">{formAttachment?.name || editingTx?.attachmentName || 'Оригиналы документов'} ({formAttachment ? `${(formAttachment.size / 1024).toFixed(1)} КБ` : editingTx?.attachmentSize || 'КБ'})</span>
                </div>
                <div className="flex gap-2">
                  <span className="text-xs text-zinc-900 font-bold">ПОКАЗАТЬ ОРИГИНАЛ</span>
                  <span className="text-zinc-200">|</span>
                  <span className="text-xs text-zinc-400 hover:text-zinc-850">ВЫБРАТЬ ИЛИ ЗАМЕНИТЬ ФАЙЛ</span>
                </div>
              </label>

              {/* Recurring payments */}
              <div className="flex items-center gap-3 bg-zinc-50 border border-zinc-200 p-4">
                <input 
                  type="checkbox" 
                  checked={formIsRecurring} 
                  onChange={(e) => setFormIsRecurring(e.target.checked)}
                  id="edit-recurring"
                  className="w-4 h-4 cursor-pointer accent-zinc-900"
                />
                <label htmlFor="edit-recurring" className="text-xs text-zinc-700 font-bold select-none cursor-pointer flex-1">Сделать этот платеж регулярным (Календарь)</label>
                {formIsRecurring && (
                  <select 
                    value={formRecurringFreq} 
                    onChange={e => setFormRecurringFreq(e.target.value as any)}
                    className="text-xs border border-zinc-200 p-1.5 outline-none bg-white text-zinc-800 focus:border-zinc-800"
                  >
                    <option value="weekly">Еженедельно</option>
                    <option value="monthly">Ежемесячно</option>
                    <option value="yearly">Ежегодно</option>
                  </select>
                )}
              </div>

              {/* CTA */}
              <div className="flex gap-3 pt-4 border-t border-zinc-150">
                <button
                  type="button"
                  onClick={() => setEditingTx(null)}
                  className="flex-1 border border-zinc-200 text-[11px] font-bold text-zinc-600 uppercase tracking-wider py-3 rounded-none hover:bg-zinc-50 transition-colors"
                >
                  Закрыть без изменений
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-zinc-900 text-[11px] font-bold text-white uppercase tracking-wider py-3 rounded-none hover:bg-zinc-800 transition-colors"
                >
                  Сохранить изменения
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* IMPORT BANK STATEMENT MODAL */}
      {isImportOpen && (
        <div className="fixed inset-0 bg-zinc-950/70 z-50 flex items-center justify-center p-4 backdrop-blur-xs overflow-y-auto">
          <div className={`w-full ${importPhase === 'preview' ? 'max-w-5xl' : 'max-w-lg'} bg-white rounded-none overflow-hidden shadow-xl border border-zinc-350 transition-all duration-300`}>
            <div className="p-6 border-b border-zinc-200 flex items-center justify-between bg-zinc-900 text-white">
              <div>
                <h3 className="font-serif italic font-bold text-lg leading-none">Импортировать выписки</h3>
                <p className="text-[10px] text-zinc-400 uppercase tracking-widest mt-1">Автоматическая состыковка с Kaspi, Halyk, 1С</p>
              </div>
              <button onClick={() => { setIsImportOpen(false); setImportPhase('select'); }} className="text-zinc-400 hover:text-white transition-colors cursor-pointer">
                <X size={16} />
              </button>
            </div>

            {importPhase === 'select' ? (
              <div className="p-6 space-y-6">
                {/* Type Switcher */}
                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="p-3 border border-zinc-900 bg-zinc-50 text-zinc-950 rounded-none font-bold cursor-pointer flex flex-col items-center gap-1.5 uppercase text-[9px] tracking-wider">
                    <CheckCircle2 size={15} className="text-emerald-500" />
                    <span>Каспи Выписка (.txt)</span>
                  </div>
                  <div className="p-3 border border-zinc-200 text-zinc-400 hover:border-zinc-800 rounded-none cursor-pointer flex flex-col items-center gap-1.5 uppercase text-[9px] tracking-wider transition-all" onClick={() => alert('Пожалуйста, используйте текстовый формат выписки 1С/Kaspi')}>
                    <FileSpreadsheet size={15} />
                    <span>Excel Бюджет (.xlsx)</span>
                  </div>
                  <div className="p-3 border border-zinc-200 text-zinc-400 hover:border-zinc-800 rounded-none cursor-pointer flex flex-col items-center gap-1.5 uppercase text-[9px] tracking-wider transition-all" onClick={() => alert('Пожалуйста, используйте текстовый формат выписки 1С/Kaspi')}>
                    <Upload size={15} />
                    <span>1С Бухгалтерия (.xml)</span>
                  </div>
                </div>

                {/* Interactive upload trigger */}
                <div className="relative border-2 border-dashed border-zinc-200 hover:border-zinc-800 hover:bg-zinc-50 cursor-pointer p-8 rounded-none text-center space-y-2 select-none group transition-all">
                  <input
                    type="file"
                    accept=".txt"
                    onChange={handleFileChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <div className="h-10 w-10 bg-zinc-100 group-hover:bg-zinc-200 text-zinc-500 group-hover:text-zinc-900 rounded-none flex items-center justify-center mx-auto transition-colors">
                    <Upload size={15} />
                  </div>
                  <div>
                    <span className="font-bold text-zinc-800 text-xs hover:underline uppercase tracking-wider block">Выбрать файл выписки 1С/банк</span>
                    <p className="text-[10px] text-zinc-400 mt-1 uppercase tracking-wider">поддерживается формат 1CClientBankExchange (.txt)</p>
                  </div>
                </div>

                {/* Status footer warnings */}
                <div className="p-4 bg-zinc-50 rounded-none border border-zinc-200 text-[10px] text-zinc-500 leading-normal space-y-1">
                  <span className="font-bold text-zinc-700 block uppercase tracking-wider">Интеллектуальное сопоставление ПланФакта</span>
                  <p>Наша система автоматически сопоставит плательщика с базой контрагентов и назначит статьи доходов/расходов по ключевым фразам!</p>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setIsImportOpen(false)}
                    className="flex-1 bg-zinc-100 hover:bg-zinc-200 text-[11px] font-bold text-zinc-650 uppercase tracking-widest py-3 rounded-none transition-colors cursor-pointer"
                  >
                    Отмена
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-6 space-y-6">
                
                {/* 1. NEW ACCOUNTS CONFIGURATION */}
                {importNewAccounts.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 border-b border-zinc-200 pb-1.5">
                      <AlertCircle size={16} className="text-amber-500" />
                      <span className="font-bold text-xs uppercase tracking-wider text-zinc-700">Обнаружены новые счета в файле ({importNewAccounts.length}):</span>
                    </div>
                    <div className="space-y-4 max-h-48 overflow-y-auto pr-1">
                      {importNewAccounts.map((acc, index) => (
                        <div key={acc.iban} className="p-4 bg-zinc-50 border border-zinc-200 space-y-3 rounded-none">
                          <div className="text-[10px] font-mono text-zinc-500 truncate font-semibold">IBAN / Счет: {acc.iban}</div>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                            <div>
                              <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">Название счета</label>
                              <input
                                type="text"
                                required
                                value={acc.name}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setImportNewAccounts(prev => prev.map((a, i) => i === index ? { ...a, name: val } : a));
                                  setImportTransactions(prev => prev.map(tx => tx.accountId === acc.iban ? { ...tx, accountName: val } : tx));
                                }}
                                className="w-full text-xs p-1.5 border border-zinc-200 bg-white outline-none"
                              />
                            </div>
                            <div>
                              <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">Владелец (Юрлицо)</label>
                              <select
                                value={acc.parentEntity}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setImportNewAccounts(prev => prev.map((a, i) => i === index ? { ...a, parentEntity: val } : a));
                                }}
                                className="w-full text-xs p-1.5 border border-zinc-200 bg-white outline-none"
                              >
                                {legalEntities.map(l => <option key={l.id} value={l.code}>{l.label}</option>)}
                              </select>
                            </div>
                            <div>
                              <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">Валюта</label>
                              <select
                                value={acc.currency}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setImportNewAccounts(prev => prev.map((a, i) => i === index ? { ...a, currency: val } : a));
                                }}
                                className="w-full text-xs p-1.5 border border-zinc-200 bg-white outline-none"
                              >
                                <option value="₸">₸ (KZT)</option>
                                <option value="$">$ (USD)</option>
                                <option value="€">€ (EUR)</option>
                                <option value="₽">₽ (RUB)</option>
                              </select>
                            </div>
                            <div>
                              <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">Нач. баланс</label>
                              <input
                                type="number"
                                value={acc.balance}
                                onChange={(e) => {
                                  const val = Number(e.target.value);
                                  setImportNewAccounts(prev => prev.map((a, i) => i === index ? { ...a, balance: val, initialBalance: val } : a));
                                }}
                                className="w-full text-xs p-1.5 border border-zinc-200 bg-white outline-none"
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 2. TRANSACTIONS PREVIEW LIST */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between border-b border-zinc-200 pb-1.5">
                    <span className="font-bold text-xs uppercase tracking-wider text-zinc-700">Транзакции к импорту ({importTransactions.length}):</span>
                    <span className="text-[10px] text-zinc-400">Проверьте корректность статей доходов/расходов и проектов</span>
                  </div>
                  <div className="overflow-x-auto border border-zinc-200 max-h-72 overflow-y-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-zinc-50 text-[9px] font-bold text-zinc-500 uppercase tracking-wider border-b border-zinc-200 sticky top-0 z-10">
                          <th className="p-2.5">Дата</th>
                          <th className="p-2.5">Счет</th>
                          <th className="p-2.5">Тип</th>
                          <th className="p-2.5">Контрагент</th>
                          <th className="p-2.5">Назначение платежа</th>
                          <th className="p-2.5">Статья</th>
                          <th className="p-2.5">Проект</th>
                          <th className="p-2.5 text-right">Сумма</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-200 text-[11px] text-zinc-650 bg-white">
                        {importTransactions.map((tx, index) => {
                          const isInc = tx.type === 'income';
                          return (
                            <tr key={tx.id} className="hover:bg-zinc-50/50">
                              <td className="p-2.5 font-mono text-[10px] whitespace-nowrap">{tx.date}</td>
                              <td className="p-2.5 font-medium text-zinc-800 whitespace-nowrap">{tx.accountName}</td>
                              <td className="p-2.5">
                                <span className={`px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider border ${
                                  isInc ? 'bg-emerald-50 border-emerald-250 text-emerald-800' : 'bg-red-50 border-red-250 text-red-800'
                                }`}>
                                  {isInc ? 'Приход' : 'Расход'}
                                </span>
                              </td>
                              <td className="p-2.5 font-medium text-zinc-900 truncate max-w-[120px]" title={tx.contragent}>{tx.contragent}</td>
                              <td className="p-2.5 text-zinc-400 truncate max-w-[180px]" title={tx.notes}>{tx.notes}</td>
                              <td className="p-2">
                                <select
                                  value={tx.article}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setImportTransactions(prev => prev.map((t, i) => i === index ? { ...t, article: val } : t));
                                  }}
                                  className="text-[11px] p-1 border border-zinc-200 bg-white outline-none rounded-sm"
                                >
                                  {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                                  <option value="Прочее">Прочее</option>
                                </select>
                              </td>
                              <td className="p-2">
                                <select
                                  value={tx.project}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setImportTransactions(prev => prev.map((t, i) => i === index ? { ...t, project: val } : t));
                                  }}
                                  className="text-[11px] p-1 border border-zinc-200 bg-white outline-none rounded-sm"
                                >
                                  <option value="Без проекта">Без проекта</option>
                                  {projects.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
                                </select>
                              </td>
                              <td className={`p-2.5 text-right font-mono font-bold whitespace-nowrap text-xs ${
                                isInc ? 'text-emerald-600' : 'text-red-600'
                              }`}>
                                {isInc ? '+' : '-'}{formatCurrency(tx.amount, '₸')}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Actions footer */}
                <div className="flex gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setImportPhase('select');
                      setImportTransactions([]);
                      setImportNewAccounts([]);
                    }}
                    className="flex-grow bg-zinc-150 hover:bg-zinc-200 text-[11px] font-bold text-zinc-650 uppercase tracking-widest py-3 rounded-none transition-colors cursor-pointer border border-zinc-250 text-zinc-800"
                  >
                    Назад
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmImport}
                    className="flex-[2] bg-zinc-900 hover:bg-zinc-800 text-[11px] font-bold text-white uppercase tracking-widest py-3 rounded-none transition-colors cursor-pointer"
                  >
                    Завершить импорт ({importTransactions.length} платежей)
                  </button>
                </div>

              </div>
            )}

          </div>
        </div>
      )}

      {/* QUICK CREATE MODALS */}
      {createAccountModal && (
        <div className="fixed inset-0 bg-zinc-950/70 z-[60] flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-white rounded-none border border-zinc-200 shadow-xl">
            <div className="p-4 border-b border-zinc-200 flex justify-between bg-zinc-900 text-white">
              <h3 className="font-serif italic font-bold">Новый счет</h3>
              <button onClick={() => setCreateAccountModal(false)}><X size={16}/></button>
            </div>
            <form onSubmit={handleQuickCreateAccount} className="p-4 space-y-4">
              <div>
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">Название счета</label>
                <input required value={createAccountData.name} onChange={e => setCreateAccountData({...createAccountData, name: e.target.value})} className="w-full text-xs p-2 border border-zinc-200 bg-zinc-50 outline-none" />
              </div>
              <div>
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">Юрлицо</label>
                <select required value={createAccountData.parentEntity} onChange={e => setCreateAccountData({...createAccountData, parentEntity: e.target.value})} className="w-full text-xs p-2 border border-zinc-200 bg-zinc-50 outline-none">
                  <option value="">Выберите юрлицо</option>
                  {legalEntities.map(l => <option key={l.id} value={l.code}>{l.label}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">Тип счета</label>
                <select value={createAccountData.type} onChange={e => setCreateAccountData({...createAccountData, type: e.target.value})} className="w-full text-xs p-2 border border-zinc-200 bg-zinc-50 outline-none">
                  {accountTypes.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">Текущий баланс</label>
                  <input type="number" required value={createAccountData.balance} onChange={e => setCreateAccountData({...createAccountData, balance: e.target.value})} className="w-full text-xs p-2 border border-zinc-200 bg-zinc-50 outline-none" placeholder="0" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">Начальный баланс</label>
                  <input type="number" required value={createAccountData.initialBalance} onChange={e => setCreateAccountData({...createAccountData, initialBalance: e.target.value})} className="w-full text-xs p-2 border border-zinc-200 bg-zinc-50 outline-none" placeholder="0" />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">Валюта</label>
                <select value={createAccountData.currency} onChange={e => setCreateAccountData({...createAccountData, currency: e.target.value})} className="w-full text-xs p-2 border border-zinc-200 bg-zinc-50 outline-none block font-mono bg-white focus:bg-zinc-50 focus:border-zinc-800">
                  <option value="₸">₸ (KZT)</option>
                  <option value="$">$ (USD)</option>
                  <option value="€">€ (EUR)</option>
                  <option value="₽">₽ (RUB)</option>
                  <option value="£">£ (GBP)</option>
                  <option value="¥">¥ (CNY)</option>
                </select>
              </div>
              <button className="w-full py-2 bg-teal-600 hover:bg-teal-700 transition-colors text-white font-bold text-[10px] uppercase">Сохранить</button>
            </form>
          </div>
        </div>
      )}

      {createArticleModal && (
        <div className="fixed inset-0 bg-zinc-950/70 z-[60] flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-white rounded-none border border-zinc-200 shadow-xl">
            <div className="p-4 border-b border-zinc-200 flex justify-between bg-zinc-900 text-white">
              <h3 className="font-serif italic font-bold">Новая статья</h3>
              <button onClick={() => setCreateArticleModal(false)}><X size={16}/></button>
            </div>
            <form onSubmit={handleQuickCreateArticle} className="p-4 space-y-4">
              <div>
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">Название статьи</label>
                <input required value={createArticleData.name} onChange={e => setCreateArticleData({...createArticleData, name: e.target.value})} className="w-full text-xs p-2 border border-zinc-200 bg-zinc-50 outline-none border border-zinc-200 focus:border-zinc-800 focus:bg-white" />
              </div>
              <div>
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">Движение</label>
                <select value={createArticleData.type || (formType === 'income' ? 'income' : 'expense')} onChange={(e) => setCreateArticleData({...createArticleData, type: e.target.value})} className="w-full text-xs border border-zinc-200 rounded-none p-2 text-zinc-800 bg-zinc-50 outline-none focus:bg-white focus:border-zinc-800">
                  <option value="income">Доходы</option>
                  <option value="expense">Расходы</option>
                  <option value="asset">Активы</option>
                  <option value="liability">Обязательства</option>
                  <option value="equity">Капитал</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">Вложить в статью (Субстатья)</label>
                <select value={createArticleData.parentId} onChange={(e) => setCreateArticleData({...createArticleData, parentId: e.target.value})} className="w-full text-xs border border-zinc-200 p-2 outline-none focus:border-zinc-800 focus:bg-white bg-zinc-50 text-zinc-800">
                  <option value="">Выберите родительскую статью</option>
                  {categories.filter(c => !c.parentId && c.type === (createArticleData.type || (formType === 'income' ? 'income' : 'expense'))).map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
              <button className="w-full py-2 bg-teal-600 hover:bg-teal-700 transition-colors text-white font-bold text-[10px] uppercase">Сохранить</button>
            </form>
          </div>
        </div>
      )}

      {createProjectModal && (
        <div className="fixed inset-0 bg-zinc-950/70 z-[60] flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-white rounded-none border border-zinc-200 shadow-xl">
            <div className="p-4 border-b border-zinc-200 flex justify-between bg-zinc-900 text-white">
              <h3 className="font-serif italic font-bold">Новый проект</h3>
              <button onClick={() => setCreateProjectModal(false)}><X size={16}/></button>
            </div>
            <form onSubmit={handleQuickCreateProject} className="p-4 space-y-4">
              <div>
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">Название проекта</label>
                <input required value={createProjectData.name} onChange={e => setCreateProjectData({...createProjectData, name: e.target.value})} className="w-full text-xs p-2 border border-zinc-200 bg-zinc-50 outline-none" />
              </div>
              <div>
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">Группа проектов</label>
                <input placeholder="Например: Внутренние, Клиентские..." value={createProjectData.group} onChange={e => setCreateProjectData({...createProjectData, group: e.target.value})} className="w-full text-xs p-2 border border-zinc-200 bg-zinc-50 outline-none" />
              </div>
              <div>
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1 mt-4">Описание</label>
                <textarea rows={3} placeholder="Краткое описание целей..." value={createProjectData.description} onChange={e => setCreateProjectData({...createProjectData, description: e.target.value})} className="w-full text-xs border border-zinc-200 rounded-none p-2.5 text-zinc-800 bg-zinc-50 focus:outline-none focus:bg-white focus:border-zinc-800 resize-none font-sans" />
              </div>
              <button className="w-full py-2 bg-teal-600 hover:bg-teal-700 transition-colors text-white font-bold text-[10px] uppercase">Сохранить</button>
            </form>
          </div>
        </div>
      )}

      {/* Selected Transactions Floating Bar */}
      {selectedStats.count > 0 && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-40 bg-zinc-900 text-white shadow-2xl rounded-sm flex items-center gap-6 px-6 py-3 border border-zinc-700/50 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="flex flex-col">
            <span className="text-[9px] text-zinc-400 font-bold uppercase tracking-widest leading-none mb-1">Выделено операций</span>
            <span className="font-mono text-sm leading-none">{selectedStats.count} шт.</span>
          </div>
          <div className="w-px h-8 bg-zinc-700"></div>
          <div className="flex gap-6">
            <div className="flex flex-col">
              <span className="text-[9px] text-teal-400 font-bold uppercase tracking-widest leading-none mb-1">Приход</span>
              <span className="font-mono text-sm leading-none">{formatCurrency(selectedStats.income, '₸')}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[9px] text-red-400 font-bold uppercase tracking-widest leading-none mb-1">Расход</span>
              <span className="font-mono text-sm leading-none">{formatCurrency(selectedStats.expense, '₸')}</span>
            </div>
            {(selectedStats.income > 0 || selectedStats.expense > 0) && (
              <>
                <div className="w-px h-8 bg-zinc-700"></div>
                <div className="flex flex-col">
                  <span className="text-[9px] text-zinc-400 font-bold uppercase tracking-widest leading-none mb-1">Итого (Сальдо)</span>
                  <span className={`font-mono text-sm leading-none ${selectedStats.total > 0 ? 'text-teal-400' : selectedStats.total < 0 ? 'text-red-400' : 'text-zinc-200'}`}>
                    {selectedStats.total > 0 ? '+' : ''}{formatCurrency(selectedStats.total, '₸')}
                  </span>
                </div>
              </>
            )}
          </div>
          <div className="flex items-center gap-2 ml-4 border-l border-zinc-700 pl-4">
            <button
              onClick={handleExportSelected}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-zinc-300 hover:text-white hover:bg-zinc-800 rounded-sm transition-colors uppercase tracking-wider"
            >
              <Download size={14} />
              Экспорт
            </button>
            <button
              onClick={handleDeleteSelected}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-red-400 hover:text-red-300 hover:bg-red-950 rounded-sm transition-colors uppercase tracking-wider"
            >
              <Trash2 size={14} />
              Удалить
            </button>
            <button 
              onClick={() => setSelectedTxs([])}
              className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-sm transition-colors"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
