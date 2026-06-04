import React, { useState, useMemo } from 'react';
import { 
  Building2, 
  Plus, 
  Edit2, 
  Trash2, 
  ChevronRight, 
  ChevronDown, 
  Coins, 
  CreditCard, 
  Smartphone, 
  Wallet,
  Globe,
  Search,
  Check,
  X
} from 'lucide-react';
import { SubAccount, LegalEntity } from '../types';
import { formatCurrency } from '../utils';

interface AccountsViewProps {
  subAccounts: SubAccount[];
  setSubAccounts: React.Dispatch<React.SetStateAction<SubAccount[]>>;
  legalEntities: LegalEntity[];
  accountTypes: string[];
}

export default function AccountsView({ subAccounts, setSubAccounts, legalEntities, accountTypes }: AccountsViewProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedEntities, setExpandedEntities] = useState<string[]>(
    legalEntities.map(le => le.code)
  );
  
  // Modal toggle
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingSub, setEditingSub] = useState<SubAccount | null>(null);

  // New account form
  const [name, setName] = useState('');
  const [parentEntity, setParentEntity] = useState('NOVA EDU');
  const [balance, setBalance] = useState('');
  const [initialBalance, setInitialBalance] = useState('');
  const [type, setType] = useState<string>(accountTypes[0] || 'cash');
  const [currency, setCurrency] = useState('₸');

  // Group accounts by legal entity
  const groupedAccounts = useMemo(() => {
    const groups: { [key: string]: SubAccount[] } = {};
    
    // Seed groups
    legalEntities.forEach(le => {
      groups[le.code] = [];
    });

    // Populate
    subAccounts.forEach(sub => {
      const match = legalEntities.find(le => le.code === sub.parentEntity);
      const groupCode = match ? match.code : 'NOVA';
      if (!groups[groupCode]) groups[groupCode] = [];
      
      if (searchTerm) {
        if (sub.name.toLowerCase().includes(searchTerm.toLowerCase())) {
          groups[groupCode].push(sub);
        }
      } else {
        groups[groupCode].push(sub);
      }
    });

    return groups;
  }, [subAccounts, searchTerm]);

  const toggleExpand = (entity: string) => {
    if (expandedEntities.includes(entity)) {
      setExpandedEntities(expandedEntities.filter(e => e !== entity));
    } else {
      setExpandedEntities([...expandedEntities, entity]);
    }
  };

  const handleOpenAdd = () => {
    setName('');
    setParentEntity(legalEntities[0]?.code || '');
    setBalance('');
    setInitialBalance('');
    setType(accountTypes[0] || 'cash');
    setCurrency('₸');
    setIsAddOpen(true);
  };

  const handleOpenEdit = (sub: SubAccount) => {
    setEditingSub(sub);
    setName(sub.name);
    setParentEntity(sub.parentEntity);
    setBalance(sub.balance.toString());
    setInitialBalance(sub.initialBalance.toString());
    setType(sub.type);
    setCurrency(sub.currency);
  };

  const handleSaveSubAccount = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;

    if (editingSub) {
      setSubAccounts(prev => prev.map(s => 
        s.id === editingSub.id 
          ? {
              ...s,
              name,
              parentEntity,
              balance: Number(balance) || 0,
              initialBalance: Number(initialBalance) || 0,
              type,
              currency
            }
          : s
      ));
      setEditingSub(null);
    } else {
      const newSub: SubAccount = {
        id: `sub-${Date.now()}`,
        name,
        parentEntity,
        balance: Number(balance) || 0,
        initialBalance: Number(initialBalance) || 0,
        type,
        currency
      };
      setSubAccounts(prev => [...prev, newSub]);
      setIsAddOpen(false);
    }
  };

  const handleDeleteSub = (id: string) => {
    // Direct deletion because window.confirm is blocked in iframe preview
    setSubAccounts(prev => prev.filter(s => s.id !== id));
    if (editingSub?.id === id) setEditingSub(null);
  };

  // Helper to render Account type badges
  const renderTypeIcon = (t: string) => {
    switch (t) {
      case 'cash': return <Coins size={14} className="text-amber-500" title="Наличные" />;
      case 'card': return <CreditCard size={14} className="text-teal-500" title="Карта физлица" />;
      case 'electronic': return <Smartphone size={14} className="text-indigo-500" title="Электронный" />;
      default: return <Wallet size={14} className="text-blue-500" title="Безналичный/Расчетный счет" />;
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Search Header Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-8 bg-white border border-zinc-200 rounded-none gap-4">
        <div>
          <h1 className="text-2xl font-serif italic font-bold text-zinc-900 tracking-tight flex items-baseline gap-2">
            Мои кошельки и юрлица <span className="text-[10px] bg-zinc-100 border border-zinc-200 text-zinc-500 px-2 py-0.5 tracking-widest font-mono uppercase font-bold">{subAccounts.length} счетов</span>
          </h1>
          <p className="text-xs text-zinc-400 mt-1">Остатки на расчетных счетах, наличных кассах и лимитах Kaspi банка</p>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto self-stretch sm:self-auto justify-between sm:justify-end">
          <div className="relative flex-1 sm:flex-none">
            <input
              type="text"
              placeholder="Поиск по названию счета..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full sm:w-56 text-[11px] bg-zinc-50 border border-zinc-200 rounded-none py-2 pl-9 pr-3 text-zinc-700 font-mono focus:outline-none focus:bg-white focus:border-zinc-800"
            />
            <Search size={12} className="text-zinc-405 text-zinc-400 absolute left-3 top-3" />
          </div>

          <button
            onClick={handleOpenAdd}
            className="flex items-center justify-center gap-1.5 bg-zinc-900 hover:bg-zinc-800 text-white px-4 py-2.5 rounded-none text-[11px] font-bold uppercase tracking-wider transition-colors"
          >
            <Plus size={13} />
            <span>Создать счет</span>
          </button>
        </div>
      </div>

      {/* Main accounts table grouped by Entities */}
      <div className="bg-white rounded-none border border-zinc-200 shadow-none overflow-hidden">
        
        {/* Table labels */}
        <div className="grid grid-cols-12 gap-2 bg-zinc-50/80 p-4 border-b border-zinc-200 text-[9px] font-bold text-zinc-400 uppercase tracking-[0.18em]">
          <div className="col-span-5 md:col-span-6 pl-2">Название юридического лица / Кошелька</div>
          <div className="col-span-1 text-center hidden md:block border-l border-zinc-200">Тип</div>
          <div className="col-span-3 text-right">Начальный остаток</div>
          <div className="col-span-3 text-right">Текущий остаток</div>
          <div className="col-span-1 text-center"></div>
        </div>

        <div className="divide-y divide-zinc-200 text-zinc-700">
          {legalEntities.map((le) => {
            const groupCode = le.code;
            const accounts = groupedAccounts[groupCode] || [];
            const isExpanded = expandedEntities.includes(groupCode);
            
            // Calc aggregates
            const totalInitial = accounts.reduce((sum, a) => sum + a.initialBalance, 0);
            const totalCurrent = accounts.reduce((sum, a) => sum + a.balance, 0);

            // Skip rendering if search is active and group has no accounts matching
            if (searchTerm && accounts.length === 0) return null;

            return (
              <div key={groupCode} className="transition-all">
                {/* Legal Entity Row Header */}
                <div 
                  onClick={() => toggleExpand(groupCode)}
                  className="grid grid-cols-12 gap-2 p-4 bg-zinc-50/35 hover:bg-zinc-50 border-b border-zinc-150 cursor-pointer items-center transition-colors font-medium text-xs text-zinc-800"
                >
                  <div className="col-span-5 md:col-span-6 flex items-center gap-2 pl-2">
                    <span className="text-zinc-400">
                      {isExpanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                    </span>
                    <Building2 size={13} className="text-zinc-400 shrink-0" />
                    <span className="font-serif italic font-bold tracking-tight text-zinc-950 text-sm">{le.label}</span>
                    <span className="text-[10px] bg-zinc-100 border border-zinc-150 text-zinc-500 px-1.5 py-0.2 rounded-none font-mono">
                      {accounts.length}
                    </span>
                  </div>
                  <div className="col-span-1 text-center hidden md:block text-[10px] text-zinc-400 font-bold">—</div>
                  <div className="col-span-3 text-right font-mono text-zinc-500">{totalInitial > 0 ? formatCurrency(totalInitial) : '0 ₸'}</div>
                  <div className="col-span-3 text-right font-mono font-bold text-zinc-900">{formatCurrency(totalCurrent)}</div>
                  <div className="col-span-1 text-center"></div>
                </div>

                {/* Subaccounts Nesting */}
                {isExpanded && (
                  <div className="bg-white/50 divide-y divide-zinc-100 pl-4">
                    {accounts.length === 0 ? (
                      <div className="py-4 pl-8 text-xs text-zinc-400 italic">Счетов для этого юридического лица не зарегистрировано</div>
                    ) : (
                      accounts.map((sub) => (
                        <div 
                          key={sub.id} 
                          className="grid grid-cols-12 gap-2 p-3.5 items-center hover:bg-zinc-50/70 text-xs transition-colors"
                        >
                          <div className="col-span-5 md:col-span-6 flex items-center gap-2.5 pl-8 text-zinc-650 font-medium">
                            <span className="text-zinc-600">{renderTypeIcon(sub.type)}</span>
                            <span>{sub.name}</span>
                          </div>
                          
                          <div className="col-span-1 text-center hidden md:block">
                            <span className="text-[9px] text-zinc-500 uppercase font-bold font-mono bg-zinc-100 border border-zinc-200 px-2 py-0.5 rounded-none select-none">
                              {sub.type}
                            </span>
                          </div>

                          <div className="col-span-3 text-right font-mono text-zinc-455 text-zinc-400">{formatCurrency(sub.initialBalance, sub.currency)}</div>
                          <div className="col-span-3 text-right font-mono font-bold text-zinc-900">
                            {formatCurrency(sub.balance, sub.currency)}
                          </div>

                          <div className="col-span-1 text-center flex justify-center gap-1.5">
                            <button
                              onClick={() => handleOpenEdit(sub)}
                              className="text-zinc-400 hover:text-zinc-900 rounded p-1 transition-colors"
                              title="Редактировать"
                            >
                              <Edit2 size={12} />
                            </button>
                            <button
                              onClick={() => handleDeleteSub(sub.id)}
                              className="text-zinc-400 hover:text-red-950 hover:text-zinc-800 rounded p-1 transition-colors"
                              title="Удалить"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Aggregate footer summary page */}
        <div className="p-5 bg-zinc-900 text-zinc-400 font-mono text-[10px] tracking-widest uppercase flex flex-col sm:flex-row gap-2 justify-between items-center">
          <span className="font-bold text-white border-l-2 border-white pl-3 py-0.5">Баланс всех направлений:</span>
          <div className="flex flex-wrap gap-4 sm:gap-8 justify-end">
            <span>Начальное сальдо: <span className="font-bold text-white font-mono text-xs">{formatCurrency(subAccounts.reduce((sum, s) => sum + s.initialBalance, 0))}</span></span>
            <span>Текущие лимиты: <span className="font-bold text-white font-mono text-xs">{formatCurrency(subAccounts.reduce((sum, s) => sum + s.balance, 0))}</span></span>
          </div>
        </div>

      </div>

      {/* DIALOG SHEET: ADD / EDIT ACCOUNT */}
      {(isAddOpen || editingSub) && (
        <div className="fixed inset-0 bg-zinc-950/70 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-none overflow-hidden shadow-xl border border-zinc-350">
            <div className="p-6 border-b border-zinc-200 flex items-center justify-between bg-zinc-905 bg-zinc-900 text-white">
              <div>
                <h3 className="font-serif italic font-bold text-lg">{editingSub ? 'Редактировать счет' : 'Создать новый счет'}</h3>
                <p className="text-[10px] text-zinc-400 uppercase tracking-widest mt-1">Реквизиты, остатки и лимиты юридического лица</p>
              </div>
              <button 
                onClick={() => {
                  setIsAddOpen(false);
                  setEditingSub(null);
                }} 
                className="text-zinc-400 hover:text-white transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveSubAccount} className="p-6 space-y-5">
              
              {/* Account / Wallet Name */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Название счета</label>
                <input
                  type="text"
                  placeholder="Kaspi KZT-3, Наличные касса, Halyk USD"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full text-xs border border-zinc-200 rounded-none p-2.5 text-zinc-800 bg-zinc-50 focus:outline-none focus:bg-white focus:border-zinc-800 font-mono"
                />
              </div>

              {/* Legal Entity Affiliation */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-400 uppercase block tracking-wider font-semibold">Юридическое лицо</label>
                <select
                  value={parentEntity}
                  onChange={(e) => setParentEntity(e.target.value)}
                  className="w-full text-xs border border-zinc-200 rounded-none p-2.5 text-zinc-800 bg-zinc-50 outline-none focus:bg-white focus:border-zinc-800"
                >
                  {legalEntities.map((le) => (
                    <option key={le.code} value={le.code}>{le.label}</option>
                  ))}
                </select>
              </div>

              {/* Wallet Type */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase block tracking-wider">Тип кошелька</label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                    className="w-full text-xs border border-zinc-200 rounded-none p-2.5 text-zinc-800 bg-zinc-50 outline-none focus:bg-white focus:border-zinc-800"
                  >
                    {accountTypes.map(at => (
                      <option key={at} value={at}>{at}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase block tracking-wider">Валюта</label>
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className="w-full text-xs border border-zinc-200 rounded-none p-2.5 text-zinc-800 bg-zinc-50 outline-none focus:bg-white focus:border-zinc-800"
                  >
                    <option value="₸">Казахстанский тенге (₸)</option>
                    <option value="$">Доллар США ($)</option>
                    <option value="€">Евро (€)</option>
                    <option value="₽">Российский рубль (₽)</option>
                  </select>
                </div>
              </div>

              {/* Account Balances */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase block tracking-wider">Начальный баланс</label>
                  <input
                    type="number"
                    placeholder="0"
                    value={initialBalance}
                    onChange={(e) => setInitialBalance(e.target.value)}
                    className="w-full text-xs border border-zinc-200 rounded-none p-2.5 text-zinc-800 bg-zinc-50 font-mono focus:bg-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase block tracking-wider">Текущий остаток</label>
                  <input
                    type="number"
                    placeholder="0"
                    value={balance}
                    onChange={(e) => setBalance(e.target.value)}
                    className="w-full text-xs border border-zinc-200 rounded-none p-2.5 text-zinc-800 bg-zinc-50 font-mono font-bold focus:bg-white"
                  />
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex gap-2 pt-4 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddOpen(false);
                    setEditingSub(null);
                  }}
                  className="flex-1 bg-zinc-100 hover:bg-zinc-200 text-[11px] font-bold text-zinc-650 uppercase tracking-wider py-3 rounded-none transition-colors"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-zinc-900 hover:bg-zinc-800 text-[11px] font-bold text-white uppercase tracking-wider py-3 rounded-none transition-colors"
                >
                  Сохранить
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
