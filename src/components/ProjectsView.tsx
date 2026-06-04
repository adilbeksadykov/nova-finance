import React, { useState, useMemo } from 'react';
import { Plus, Search, MoreVertical, Edit2, Trash2, ChevronDown, ChevronRight, ArrowLeft, BarChart3, AlertCircle, Calendar, MessageSquare, Briefcase, FileText, CheckCircle2, Clock } from 'lucide-react';
import { Project, Transaction, ProjectGroup } from '../types';
import { formatCurrency } from '../utils';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, BarChart, Bar, Legend } from 'recharts';

interface ProjectsViewProps {
  projects: Project[];
  setProjects: React.Dispatch<React.SetStateAction<Project[]>>;
  projectGroups: ProjectGroup[];
  setProjectGroups: React.Dispatch<React.SetStateAction<ProjectGroup[]>>;
  transactions: Transaction[];
}

export default function ProjectsView({ projects, setProjects, projectGroups, setProjectGroups, transactions }: ProjectsViewProps) {
  // Navigation State
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  // Filters state for List View
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatuses, setFilterStatuses] = useState<string[]>(['В работе', 'Плановый']);
  const [filterArchive, setFilterArchive] = useState<boolean>(false);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  // Dropdown for create button
  const [isCreateDropdownOpen, setIsCreateDropdownOpen] = useState(false);

  // Project Modals state
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  
  // Group Modals state
  const [isAddGroupOpen, setIsAddGroupOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<ProjectGroup | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [group, setGroup] = useState('');
  const [description, setDescription] = useState('');
  const [budgetLimit, setBudgetLimit] = useState('');
  const [status, setStatus] = useState<'В работе' | 'Завершен' | 'Плановый'>('В работе');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // --------------------------------------------------------------------------
  // LIST VIEW LOGIC
  // --------------------------------------------------------------------------

  // Global Project Stats (includes all transactions linked to project directly or via splits)
  const getProjectStats = (projectName: string) => {
    let incomes = 0;
    let expenses = 0;
    transactions.forEach(tx => {
      // Direct
      if (tx.project === projectName) {
        if (tx.type === 'income') incomes += tx.amount;
        if (tx.type === 'expense' || tx.type === 'accrual') expenses += Math.abs(tx.amount);
      }
      // Via splits
      if (tx.splits && tx.splits.length > 0) {
        tx.splits.forEach(s => {
          if (s.project === projectName) {
             if (tx.type === 'income') incomes += s.amount;
             if (tx.type === 'expense' || tx.type === 'accrual') expenses += Math.abs(s.amount);
          }
        });
      }
    });
    return { incomes, expenses, profit: incomes - expenses };
  };

  const projectStats = useMemo(() => {
    const stats: Record<string, { incomes: number, expenses: number, profit: number }> = {};
    projects.forEach(p => {
      stats[p.name] = getProjectStats(p.name);
    });
    return stats;
  }, [projects, transactions]);

  const filteredProjects = useMemo(() => {
    return projects.filter(p => {
      if (filterArchive ? !p.isArchived : p.isArchived) return false;
      if (searchTerm && !p.name.toLowerCase().includes(searchTerm.toLowerCase()) && !(p.description || '').toLowerCase().includes(searchTerm.toLowerCase())) return false;
      if (filterStatuses.length > 0 && !filterStatuses.includes(p.status)) return false;
      return true;
    });
  }, [projects, searchTerm, filterStatuses, filterArchive]);

  const groupedProjects = useMemo(() => {
    const groups: Record<string, Project[]> = {};
    
    // Initialize groups from projectGroups state
    projectGroups.forEach(g => {
      if (filterArchive ? g.isArchived : !g.isArchived) {
        groups[g.name] = [];
      }
    });

    filteredProjects.forEach(p => {
      const key = p.group || 'Без группы';
      if (!groups[key]) groups[key] = [];
      groups[key].push(p);
    });
    return groups;
  }, [filteredProjects, projectGroups, filterArchive]);

  const toggleGroup = (groupName: string) => {
    setExpandedGroups(prev => ({ ...prev, [groupName]: !prev[groupName] }));
  };

  const toggleFilterStatus = (st: string) => {
    setFilterStatuses(prev => prev.includes(st) ? prev.filter(s => s !== st) : [...prev, st]);
  };

  // --------------------------------------------------------------------------
  // DETAILS VIEW LOGIC
  // --------------------------------------------------------------------------
  const selectedProjStats = selectedProject ? projectStats[selectedProject.name] : null;
  
  const selectedProjTransactions = useMemo(() => {
    if (!selectedProject) return [];
    return transactions.filter(tx => 
      tx.project === selectedProject.name || 
      (tx.splits && tx.splits.some(s => s.project === selectedProject.name))
    ).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [selectedProject, transactions]);

  const chartData = useMemo(() => {
    if (!selectedProject) return [];
    const monthlyData: Record<string, { name: string, income: number, expense: number }> = {};
    
    selectedProjTransactions.forEach(tx => {
      const date = new Date(tx.date);
      // Format: "Jan 2026", "Feb 2026"
      const monthKey = date.toLocaleString('ru-RU', { month: 'short', year: 'numeric' });
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = { name: monthKey, income: 0, expense: 0 };
      }
      
      let txAmount = tx.amount;
      if (tx.splits && tx.splits.length > 0) {
        txAmount = tx.splits.filter(s => s.project === selectedProject.name).reduce((sum, s) => sum + Number(s.amount), 0);
      }

      if (tx.type === 'income') {
        monthlyData[monthKey].income += txAmount;
      } else if (tx.type === 'expense' || tx.type === 'accrual') {
        monthlyData[monthKey].expense += Math.abs(txAmount);
      }
    });

    return Object.values(monthlyData).sort((a, b) => 0); // No real sort for now
  }, [selectedProjTransactions, selectedProject]);

  // Handle Operations
  const handleOpenAdd = () => {
    setName('');
    setGroup('');
    setDescription('');
    setBudgetLimit('');
    setStatus('В работе');
    setStartDate(new Date().toISOString().slice(0, 10));
    setEndDate('');
    setEditingProject(null);
    setIsAddOpen(true);
  };

  const handleOpenEdit = (p: Project, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setName(p.name);
    setGroup(p.group);
    setDescription(p.description || '');
    setBudgetLimit(p.budgetLimit ? p.budgetLimit.toString() : '');
    setStatus(p.status || 'В работе');
    setStartDate(p.startDate || '');
    setEndDate(p.endDate && p.endDate !== '--' ? p.endDate : '');
    setEditingProject(p);
    setIsAddOpen(true);
  };

  const handleDelete = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setProjects(prev => prev.filter(p => p.id !== id));
    if (selectedProject?.id === id) setSelectedProject(null);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;
    
    const projData = {
        name,
        group: group || '',
        description,
        status,
        startDate: startDate || new Date().toISOString().slice(0, 10),
        endDate: endDate || '--',
        budgetLimit: budgetLimit ? Number(budgetLimit) : undefined
    };

    if (editingProject) {
      setProjects(prev => prev.map(p => p.id === editingProject.id ? { ...p, ...projData } : p));
      if (selectedProject?.id === editingProject.id) {
         setSelectedProject({ ...selectedProject, ...projData } as Project);
      }
    } else {
      setProjects(prev => [...prev, { id: `proj-${Date.now()}`, ...projData }]);
    }
    
    setIsAddOpen(false);
    setEditingProject(null);
  };

  const handleArchiveProject = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setProjects(prev => prev.map(p => p.id === id ? { ...p, isArchived: !p.isArchived } : p));
  };

  const handleOpenAddGroup = () => {
    setName('');
    setStatus('В работе');
    setEditingGroup(null);
    setIsAddGroupOpen(true);
    setIsCreateDropdownOpen(false);
  };

  const handleOpenEditGroup = (gName: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const g = projectGroups.find(gr => gr.name === gName);
    if (g) {
      setName(g.name);
      setStatus(g.status || 'В работе');
      setEditingGroup(g);
    } else {
      setName(gName);
      setStatus('В работе');
      setEditingGroup({ id: `gr-${Date.now()}`, name: gName, status: 'В работе' }); // Virtual group edit
    }
    setIsAddGroupOpen(true);
  };

  const handleSaveGroup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;

    if (editingGroup) {
      // Find old name to update projects
      const oldName = editingGroup.name;
      setProjectGroups(prev => prev.map(g => g.id === editingGroup.id ? { ...g, name, status } : g));
      // Update inherited projects
      if (oldName !== name) {
        setProjects(prev => prev.map(p => p.group === oldName ? { ...p, group: name } : p));
      }
    } else {
      setProjectGroups(prev => [...prev, { id: `gr-${Date.now()}`, name, status }]);
    }
    
    setIsAddGroupOpen(false);
    setEditingGroup(null);
  };

  const handleDeleteGroup = (gName: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    // Re-assign child projects to 'Без группы'
    setProjects(prev => prev.map(p => p.group === gName ? { ...p, group: '' } : p));
    setProjectGroups(prev => prev.filter(g => g.name !== gName));
  };
  
  const handleArchiveGroup = (gName: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setProjectGroups(prev => prev.map(g => g.name === gName ? { ...g, isArchived: !g.isArchived } : g));
  };

  // --------------------------------------------------------------------------
  // RENDER SELECTED PROJECT DETAILS
  // --------------------------------------------------------------------------
  if (selectedProject && selectedProjStats) {
    const profitability = selectedProjStats.incomes > 0 ? (selectedProjStats.profit / selectedProjStats.incomes) * 100 : 0;
    
    return (
      <div className="space-y-6">
        {/* Breadcrumb / Top bar */}
        <div className="bg-white border text-sm border-zinc-200">
           <div className="flex items-center px-6 py-4 text-zinc-500 font-medium">
             <button onClick={() => setSelectedProject(null)} className="hover:text-zinc-800 transition-colors">Все проекты</button>
             <ChevronRight size={14} className="mx-2" />
             <span className="text-zinc-400">{selectedProject.group || 'Без группы'}</span>
           </div>
           <div className="px-6 pb-6 border-b border-zinc-200 flex flex-col sm:flex-row flex-wrap sm:items-center justify-between gap-4">
             <div>
               <h1 className="text-3xl font-serif font-bold text-zinc-900 tracking-tight flex items-center gap-4">
                 {selectedProject.name}
                 <span className={`text-[10px] px-2.5 py-1 uppercase tracking-wider font-bold rounded-none border ${
                    selectedProject.status === 'В работе' ? 'bg-amber-50 text-amber-600 border-amber-200' : 
                    selectedProject.status === 'Завершен' ? 'bg-green-50 text-green-600 border-green-200' :
                    'bg-slate-50 text-slate-600 border-slate-200'
                  }`}>
                    {selectedProject.status}
                 </span>
               </h1>
               <div className="mt-2 text-zinc-500 font-mono text-xs flex items-center gap-2">
                 <Calendar size={14} /> 
                 {selectedProject.startDate} — {selectedProject.endDate !== '--' ? selectedProject.endDate : '...'}
               </div>
             </div>
             <div className="flex gap-2">
               <button onClick={(e) => handleOpenEdit(selectedProject, e)} className="px-4 py-2 border border-zinc-200 text-zinc-600 hover:bg-zinc-50 text-xs font-bold uppercase tracking-wider transition-colors flex items-center gap-2">
                  <Edit2 size={14} /> Настроить
               </button>
             </div>
           </div>
        </div>

        {/* Dashboards Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
           <div className="col-span-1 flex flex-col gap-6">
             <div className="bg-white border border-zinc-200 p-6 flex flex-col items-start h-full justify-center">
               <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1.5">Прибыль</div>
               <div className={`text-3xl font-serif ${selectedProjStats.profit >= 0 ? 'text-zinc-900' : 'text-red-500'}`}>
                 {formatCurrency(selectedProjStats.profit)}
               </div>
               
               <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mt-8 mb-1.5">Рентабельность</div>
               <div className={`text-4xl font-bold font-mono tracking-tighter ${profitability >= 0 ? 'text-zinc-900' : 'text-red-500'}`}>
                 {profitability.toFixed(1)}%
               </div>
             </div>
           </div>

           <div className="col-span-1 flex flex-col gap-4">
             <div className="bg-white border border-zinc-200 overflow-hidden h-full flex flex-col">
               <div className="p-4 text-[10px] font-bold text-zinc-400 uppercase tracking-widest flex items-center justify-between">
                 Доходы
               </div>
               <div className="px-4 pb-3">
                 <div className="text-2xl font-serif text-teal-600 font-medium">
                   {formatCurrency(selectedProjStats.incomes)} 
                 </div>
               </div>
               <div className="w-full bg-teal-50 h-10 mt-auto flex items-end">
                  <div className="bg-teal-500 h-full w-[100%] transition-all"></div>
               </div>
             </div>
             
             <div className="bg-white border border-zinc-200 overflow-hidden h-full flex flex-col">
               <div className="p-4 text-[10px] font-bold text-zinc-400 uppercase tracking-widest flex items-center justify-between">
                 Расходы
               </div>
               <div className="px-4 pb-3">
                 <div className="text-2xl font-serif text-red-500 font-medium">
                   {formatCurrency(selectedProjStats.expenses)} 
                 </div>
               </div>
               <div className="w-full bg-red-50 h-10 mt-auto flex items-end">
                  <div className="bg-red-400 h-full w-[100%] transition-all"></div>
               </div>
             </div>
           </div>

           <div className="col-span-1 lg:col-span-2 bg-white border border-zinc-200 p-6 min-h-[250px]">
             {chartData.length > 0 ? (
               <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e4e4e7" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#71717a' }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#71717a' }} tickFormatter={(val) => `${val / 1000}k`} dx={-10} />
                    <RechartsTooltip 
                      cursor={{fill: '#f4f4f5'}}
                      contentStyle={{ borderRadius: '0px', border: '1px solid #e4e4e7', fontSize: '12px' }}
                      formatter={(val: number) => formatCurrency(val, '₸')}
                    />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                    <Bar dataKey="income" name="Доходы" fill="#0d9488" radius={[2, 2, 0, 0]} maxBarSize={40} />
                    <Bar dataKey="expense" name="Расходы" fill="#f87171" radius={[2, 2, 0, 0]} maxBarSize={40} />
                  </BarChart>
               </ResponsiveContainer>
             ) : (
                <div className="h-full flex flex-col items-center justify-center text-zinc-400 text-sm">
                  <BarChart3 size={32} className="mb-2 opacity-50" />
                  Нет данных для графика
                </div>
             )}
           </div>
        </div>

        {/* Transactions Table for Project */}
        <div className="bg-white border border-zinc-200 overflow-hidden">
          <div className="p-5 bg-zinc-50 border-b border-zinc-200 flex items-center justify-between">
            <h3 className="font-bold text-zinc-800 flex items-center gap-2">Операции по проекту <span className="text-[10px] bg-zinc-200 font-mono text-zinc-600 px-2 py-0.5 rounded-none">{selectedProjTransactions.length} шт</span></h3>
          </div>
          <div className="overflow-x-auto min-h-[300px]">
            <table className="w-full text-left text-xs whitespace-nowrap">
              <thead>
                <tr className="bg-zinc-50/80 border-b border-zinc-200 text-[10px] uppercase text-zinc-400 tracking-wider">
                  <th className="p-4 font-bold text-center w-10">Статус</th>
                  <th className="p-4 font-bold">Дата</th>
                  <th className="p-4 font-bold">Счет</th>
                  <th className="p-4 font-bold text-center">Тип</th>
                  <th className="p-4 font-bold">Контрагент</th>
                  <th className="p-4 font-bold">Статья</th>
                  <th className="p-4 font-bold text-right">Сумма</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200">
                {selectedProjTransactions.map(tx => {
                  let displayAmount = tx.amount;
                  let isAmountPartial = false;
                  if (tx.splits && tx.splits.length > 0) {
                     const splitAmount = tx.splits.filter(s => s.project === selectedProject.name).reduce((sum, s) => sum + Number(s.amount), 0);
                     // if it's a split match, show the partial sum
                     if (splitAmount > 0 && tx.project !== selectedProject.name) {
                        displayAmount = splitAmount;
                        isAmountPartial = true;
                     }
                  }

                  return (
                    <tr key={tx.id} className="hover:bg-zinc-50 transition-colors">
                      <td className="p-4 text-center text-zinc-400">
                         {tx.isConfirmed ? <CheckCircle2 size={14} className="text-green-500 mx-auto" /> : <Clock size={14} className="text-amber-500 mx-auto" />}
                      </td>
                      <td className="p-4 text-zinc-600 font-mono text-[11px]">{tx.date}</td>
                      <td className="p-4 text-zinc-600 font-medium">{tx.accountName}</td>
                      <td className="p-4 text-center">
                        {tx.type === 'income' ? <span className="text-green-600">→</span> : tx.type === 'expense' ? <span className="text-red-500">←</span> : <span className="text-zinc-400">↔</span>}
                      </td>
                      <td className="p-4 text-zinc-800">{tx.contragent}</td>
                      <td className="p-4 text-zinc-600">{tx.splits && tx.splits.length ? <span className="italic text-zinc-400 text-[10px]">(Сплит)</span> : tx.article}</td>
                      <td className={`p-4 text-right font-mono font-medium ${tx.type === 'income' ? 'text-teal-600' : tx.type === 'expense' ? 'text-red-500' : 'text-zinc-600'}`}>
                        {tx.type === 'expense' ? '-' : tx.type === 'income' ? '+' : ''}{formatCurrency(displayAmount)}
                        {isAmountPartial && <span className="text-[9px] text-zinc-400 block font-sans font-normal leading-tight mt-1">Часть из {formatCurrency(tx.amount)}</span>}
                      </td>
                    </tr>
                  )
                })}
                {selectedProjTransactions.length === 0 && (
                   <tr>
                     <td colSpan={7} className="p-8 text-center text-zinc-500 italic">Операций не найдено</td>
                   </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  // --------------------------------------------------------------------------
  // RENDER PROJECT LIST
  // --------------------------------------------------------------------------

  let overallIncomes = 0;
  let overallExpenses = 0;
  Object.values(projectStats as Record<string, any>).forEach(s => { overallIncomes += s.incomes; overallExpenses += s.expenses; });
  const overallProfit = overallIncomes - overallExpenses;
  const overallProfitability = overallIncomes > 0 ? (overallProfit / overallIncomes) * 100 : 0;

  return (
    <div className="flex flex-col lg:flex-row gap-6 items-start h-full w-full">
      {/* Sidebar Filters */}
      <div className="w-full lg:w-56 space-y-6 flex-shrink-0">
        <h2 className="text-xl font-serif text-zinc-900 tracking-tight flex items-center justify-between">
          Фильтры
        </h2>
        
        {/* Status */}
        <div className="space-y-4">
          <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-2">
            Статус проекта <AlertCircle size={10} />
          </label>
          <div className="space-y-3">
             {['Плановый', 'В работе', 'Завершен'].map(st => (
               <label key={st} className="flex items-center gap-3 cursor-pointer group">
                  <input type="checkbox" checked={filterStatuses.includes(st)} onChange={() => toggleFilterStatus(st)} className="rounded-none w-3.5 h-3.5 accent-teal-600 cursor-pointer" />
                  <span className="text-xs font-medium text-zinc-700 group-hover:text-zinc-950 transition-colors">{st}</span>
               </label>
             ))}
             <label className="flex items-center gap-3 cursor-pointer group pt-2 border-t border-zinc-200">
                <input type="checkbox" checked={filterArchive} onChange={() => setFilterArchive(!filterArchive)} className="rounded-none w-3.5 h-3.5 accent-teal-600 cursor-pointer" />
                <span className="text-xs font-medium text-zinc-700 group-hover:text-zinc-950 transition-colors">Архивные</span>
             </label>
          </div>
        </div>

        {/* Parameters / Dates */}
        <div className="space-y-4 pt-4 border-t border-zinc-200">
          <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-2">
            Параметры <AlertCircle size={10} />
          </label>
          <div className="space-y-3">
            <div className="relative">
              <input type="date" placeholder="Начало проекта" className="w-full text-[10px] font-mono border border-zinc-200 bg-white py-2 pl-8 pr-2 outline-none focus:border-zinc-500" />
              <Calendar size={12} className="absolute left-2.5 top-2.5 text-zinc-400" />
            </div>
            <div className="relative">
              <input type="date" placeholder="Конец проекта" className="w-full text-[10px] font-mono border border-zinc-200 bg-white py-2 pl-8 pr-2 outline-none focus:border-zinc-500" />
              <Calendar size={12} className="absolute left-2.5 top-2.5 text-zinc-400" />
            </div>
          </div>
        </div>
      </div>
      
      {/* Main List Area */}
      <div className="flex-1 min-w-0 w-full flex flex-col gap-4">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 h-auto min-h-10 mb-2">
           <h1 className="text-3xl font-serif text-zinc-900 tracking-tight flex items-center gap-3 w-full sm:w-auto">
             Проекты
           </h1>
           <div className="flex flex-wrap sm:flex-nowrap items-center gap-3 w-full sm:w-auto">
             <div className="relative flex-1 sm:w-[250px]">
               <input
                 type="text"
                 placeholder="Поиск по названию..."
                 value={searchTerm}
                 onChange={(e) => setSearchTerm(e.target.value)}
                 className="w-full text-xs font-mono border border-zinc-200 py-2 pl-8 pr-2 focus:outline-none focus:border-zinc-400"
               />
               <Search size={14} className="text-zinc-400 absolute left-2.5 top-2" />
             </div>
             <div className="relative">
               <button
                 onClick={() => setIsCreateDropdownOpen(!isCreateDropdownOpen)}
                 className="bg-teal-600 hover:bg-teal-700 text-white px-5 py-2 text-[11px] font-bold uppercase tracking-wider transition-colors flex items-center gap-2 whitespace-nowrap"
               >
                 Создать <ChevronDown size={14} />
               </button>
               {isCreateDropdownOpen && (
                 <>
                   <div 
                     className="fixed inset-0 z-10" 
                     onClick={() => setIsCreateDropdownOpen(false)}
                   />
                   <div className="absolute right-0 mt-1 w-48 bg-white border border-zinc-200 shadow-lg z-20 py-1 font-medium text-sm">
                     <button 
                       className="w-full text-left px-4 py-2 hover:bg-zinc-50 text-zinc-700 flex items-center gap-2"
                       onClick={() => { setIsCreateDropdownOpen(false); handleOpenAdd(); }}
                     >
                       <FileText size={14} /> Проект
                     </button>
                     <button 
                       className="w-full text-left px-4 py-2 hover:bg-zinc-50 text-zinc-700 flex items-center gap-2"
                       onClick={handleOpenAddGroup}
                     >
                       <Briefcase size={14} /> Группу
                     </button>
                   </div>
                 </>
               )}
             </div>
           </div>
        </div>

        {/* Tree Table */}
        <div className="bg-white border text-[11px] border-zinc-200 overflow-hidden shadow-sm flex-1">
          <div className="overflow-x-auto min-h-[400px]">
             <table className="w-full text-left whitespace-nowrap">
                <thead>
                  <tr className="bg-zinc-50/80 border-b border-zinc-200 text-[10px] text-zinc-500 uppercase tracking-widest font-bold">
                     <th className="p-4 w-8 font-medium"></th>
                     <th className="p-4">Группа / Проект</th>
                     <th className="p-4">Начало / Конец</th>
                     <th className="p-4 text-center">Статус</th>
                     <th className="p-4 text-right">Доходы, ₸</th>
                     <th className="p-4 text-right">Расходы, ₸</th>
                     <th className="p-4 text-right">Прибыль, ₸</th>
                     <th className="p-4 text-right">Рентабельность</th>
                     <th className="p-4 w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200/60 font-medium">
                   {(Object.entries(groupedProjects) as [string, Project[]][]).map(([groupName, groupProjs]) => {
                     const isExpanded = expandedGroups[groupName] !== false;
                     
                     // group totals
                     let gIncome = 0;
                     let gExpense = 0;
                     groupProjs.forEach(gp => {
                       gIncome += projectStats[gp.name].incomes;
                       gExpense += projectStats[gp.name].expenses;
                     });
                     const gProfit = gIncome - gExpense;
                     const gProf = gIncome > 0 ? (gProfit / gIncome) * 100 : 0;
                     const isRootProjs = groupName === 'Без группы';

                     return (
                       <React.Fragment key={groupName}>
                         {/* Group Row */}
                         {!isRootProjs && (() => {
                            const gData = projectGroups.find(g => g.name === groupName) || { isArchived: false, status: 'В работе' };
                            return (
                           <tr className="bg-zinc-50/50 hover:bg-zinc-100 transition-colors group">
                             <td className="p-3.5 text-center cursor-pointer" onClick={() => toggleGroup(groupName)}>
                               {isExpanded ? <ChevronDown size={14} className="text-zinc-400 group-hover:text-zinc-700 mx-auto" /> : <ChevronRight size={14} className="text-zinc-400 group-hover:text-zinc-700 mx-auto" />}
                             </td>
                             <td className="p-3.5 font-bold text-zinc-800 flex items-center gap-2 text-xs">
                               <Briefcase size={12} className="text-zinc-400" />
                               <span className="cursor-pointer hover:underline" onClick={() => toggleGroup(groupName)}>{groupName}</span>
                               {gData.isArchived && <span className="px-1.5 py-0.5 ml-1 text-[9px] font-bold bg-zinc-200 text-zinc-600 uppercase tracking-widest">Архив</span>}
                               <span className="text-[10px] text-zinc-400 font-mono font-normal ml-1">({groupProjs.length})</span>
                             </td>
                             <td className="p-3.5"></td>
                             <td className="p-3.5 text-center">
                              {gData.status && (
                                <span className={`text-[9px] uppercase font-bold tracking-wider px-2.5 py-1 rounded-none border opacity-60 ${
                                  gData.status === 'В работе' ? 'bg-amber-50 text-amber-600 border-amber-200' : 
                                  gData.status === 'Завершен' ? 'bg-green-50 text-green-600 border-green-200' :
                                  'bg-slate-50 text-slate-600 border-slate-200'
                                }`}>
                                  {gData.status}
                                </span>
                              )}
                             </td>
                             <td className="p-3.5 text-right font-mono font-medium text-zinc-600">{formatCurrency(gIncome, '')}</td>
                             <td className="p-3.5 text-right font-mono font-medium text-zinc-600">{formatCurrency(gExpense, '')}</td>
                             <td className="p-3.5 text-right font-mono font-bold text-zinc-900">{formatCurrency(gProfit, '')}</td>
                             <td className={`p-3.5 text-right font-mono font-bold ${gProf >= 0 ? 'text-teal-600' : 'text-red-500'}`}>
                               {gProf.toFixed(1)}%
                             </td>
                             <td className="p-3.5 pr-6">
                               <div className="flex items-center gap-2 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                                 <button onClick={(e) => handleOpenEditGroup(groupName, e)} className="text-zinc-400 hover:text-zinc-800 transition-colors" title="Редактировать">
                                   <Edit2 size={13} />
                                 </button>
                                 <button onClick={(e) => handleArchiveGroup(groupName, e)} className="text-zinc-400 hover:text-amber-600 transition-colors" title={gData.isArchived ? "Вернуть из архива" : "В архив"}>
                                   <FileText size={13} />
                                 </button>
                                 <button onClick={(e) => handleDeleteGroup(groupName, e)} className="text-zinc-400 hover:text-red-500 transition-colors" title="Удалить">
                                   <Trash2 size={13} />
                                 </button>
                               </div>
                             </td>
                           </tr>
                         )})()}

                         {/* Projects in this group */}
                         {(isExpanded || isRootProjs) && groupProjs.map(p => {
                           const stats = projectStats[p.name];
                           const pProf = stats.incomes > 0 ? (stats.profit / stats.incomes) * 100 : 0;
                           
                           return (
                             <tr key={p.id} className={`hover:bg-zinc-50 transition-colors group ${!isRootProjs ? 'bg-white border-t border-dashed border-zinc-200' : ''}`}>
                               <td className="p-3.5 border-r border-zinc-200 bg-zinc-50/30 cursor-pointer" onClick={() => { setSelectedProject(p); }}>
                                 {!isRootProjs && (
                                   <div className="w-full flex justify-end pr-2 opacity-30">
                                       <span className="block w-3 h-3 border-l-2 border-b-2 border-zinc-400 -translate-y-2"></span>
                                   </div>
                                 )}
                               </td>
                               <td className="p-3.5 pl-6 flex items-center gap-3 cursor-pointer" onClick={() => { setSelectedProject(p); }}>
                                 <span className="font-semibold text-zinc-800 group-hover:text-teal-700 transition-colors text-xs flex items-center gap-2">
                                   {p.name}
                                   {p.isArchived && <span className="px-1.5 py-0.5 text-[9px] font-bold bg-zinc-200 text-zinc-600 uppercase tracking-widest">Архив</span>}
                                 </span>
                               </td>
                               <td className="p-3.5 font-mono text-[10px] text-zinc-500">
                                 <div className="font-bold flex items-center gap-1.5"><Calendar size={10} className="text-zinc-300"/>{p.startDate}</div>
                                 <div className="opacity-60 pl-4">{p.endDate !== '--' ? p.endDate : ''}</div>
                               </td>
                               <td className="p-3.5 text-center cursor-pointer" onClick={() => { setSelectedProject(p); }}>
                                  <span className={`text-[9px] uppercase font-bold tracking-wider px-2.5 py-1 rounded-none border ${
                                    p.status === 'В работе' ? 'bg-amber-50 text-amber-600 border-amber-200' : 
                                    p.status === 'Завершен' ? 'bg-green-50 text-green-600 border-green-200' :
                                    'bg-slate-50 text-slate-600 border-slate-200'
                                  }`}>
                                    {p.status}
                                  </span>
                               </td>
                               <td className="p-3.5 text-right font-mono text-zinc-700">{formatCurrency(stats.incomes, '')}</td>
                               <td className="p-3.5 text-right font-mono text-zinc-700">{formatCurrency(stats.expenses, '')}</td>
                               <td className={`p-3.5 text-right font-mono font-medium ${stats.profit > 0 ? 'text-teal-600' : stats.profit < 0 ? 'text-red-500' : 'text-zinc-500'}`}>{formatCurrency(stats.profit, '')}</td>
                               <td className={`p-3.5 text-right font-mono font-medium ${pProf > 0 ? 'text-teal-600' : pProf < 0 ? 'text-red-500' : 'text-zinc-500'}`}>
                                 {pProf.toFixed(1)}%
                               </td>
                               <td className="p-3.5 pr-6">
                                 <div className="flex items-center gap-2 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                                   <button onClick={(e) => handleOpenEdit(p, e)} className="text-zinc-400 hover:text-zinc-800 transition-colors" title="Редактировать">
                                     <Edit2 size={13} />
                                   </button>
                                   <button onClick={(e) => handleArchiveProject(p.id, e)} className="text-zinc-400 hover:text-amber-600 transition-colors" title={p.isArchived ? "Вернуть из архива" : "В архив"}>
                                     <FileText size={13} />
                                   </button>
                                   <button onClick={(e) => handleDelete(p.id, e)} className="text-zinc-400 hover:text-red-500 transition-colors" title="Удалить">
                                     <Trash2 size={13} />
                                   </button>
                                 </div>
                               </td>
                             </tr>
                           );
                         })}
                       </React.Fragment>
                     );
                   })}

                   {filteredProjects.length === 0 && (
                     <tr>
                       <td colSpan={8} className="p-12 text-center text-zinc-500">
                         <div className="flex flex-col items-center justify-center gap-2">
                           <Briefcase size={32} className="text-zinc-300 mb-2" />
                           <span className="font-serif text-lg">Нет проектов</span>
                           <span className="text-xs text-zinc-400">Измените фильтры или создайте новый проект</span>
                         </div>
                       </td>
                     </tr>
                   )}
                </tbody>
             </table>
          </div>
          
          {/* Footer Totals */}
          <div className="bg-zinc-100 p-4 border-t border-zinc-200 flex flex-wrap gap-6 text-[11px] text-zinc-500 justify-between items-center items-stretch font-mono">
             <div className="flex items-center font-sans tracking-wide">
               <span className="font-bold text-zinc-900">{filteredProjects.length}</span> <span className="ml-1 text-zinc-600">проекта (-ов)</span>
             </div>
             <div className="flex flex-wrap items-center gap-6 divide-x divide-zinc-300">
               <div className="flex items-center gap-2 pl-6 first:pl-0">
                  <span className="text-[10px] uppercase font-bold tracking-widest text-zinc-400">Доходы:</span> 
                  <span className="font-bold text-zinc-900 text-sm">{formatCurrency(overallIncomes, '₸')}</span>
               </div>
               <div className="flex items-center gap-2 pl-6">
                  <span className="text-[10px] uppercase font-bold tracking-widest text-zinc-400">Расходы:</span> 
                  <span className="font-bold text-zinc-900 text-sm">{formatCurrency(overallExpenses, '₸')}</span>
               </div>
               <div className="flex items-center gap-2 pl-6">
                  <span className="text-[10px] uppercase font-bold tracking-widest text-zinc-400">Прибыль:</span> 
                  <span className={`font-bold text-sm ${overallProfit >= 0 ? 'text-teal-600' : 'text-red-500'}`}>{formatCurrency(overallProfit, '₸')}</span>
               </div>
               <div className="flex items-center gap-2 pl-6">
                  <span className="text-[10px] uppercase font-bold tracking-widest text-zinc-400">Рентабельность:</span> 
                  <span className={`font-bold text-sm ${overallProfitability >= 0 ? 'text-teal-600' : 'text-red-500'}`}>{overallProfitability.toFixed(1)}%</span>
               </div>
             </div>
          </div>
        </div>
      </div>

       {isAddOpen && (
        <div className="fixed inset-0 bg-zinc-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white border border-zinc-200 shadow-xl p-8 slide-in-from-bottom-2 duration-300 max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-serif text-zinc-900 mb-6">{editingProject ? 'Редактировать проект' : 'Создать проект'}</h2>
            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-2 gap-5">
               <div className="col-span-2">
                 <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Название *</label>
                 <input
                   type="text"
                   value={name}
                   onChange={(e) => setName(e.target.value)}
                   className="w-full mt-1.5 text-sm font-medium border border-zinc-200 p-2.5 outline-none focus:border-teal-600 focus:ring-1 focus:ring-teal-600 transition-shadow"
                   required
                 />
               </div>
               <div className="col-span-2 sm:col-span-1">
                 <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Группа проектов</label>
                 <select
                   value={group}
                   onChange={(e) => setGroup(e.target.value)}
                   className="w-full mt-1.5 text-xs border border-zinc-200 p-2.5 outline-none focus:border-teal-600 focus:ring-1 focus:ring-teal-600 transition-shadow bg-white"
                 >
                   <option value="">Без группы</option>
                   {projectGroups.map(g => (
                     <option key={g.id} value={g.name}>{g.name}</option>
                   ))}
                   {/* Handle legacy groups not in projectGroups */}
                   {Array.from(new Set(projects.map(p => p.group).filter(Boolean))).filter(g => !projectGroups.some(pg => pg.name === g)).map(gName => (
                     <option key={`legacy-${gName}`} value={gName}>{gName}</option>
                   ))}
                 </select>
               </div>
               <div className="col-span-2 sm:col-span-1">
                 <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Статус</label>
                 <select
                   value={status}
                   onChange={(e) => setStatus(e.target.value as any)}
                   className="w-full mt-1.5 text-xs border border-zinc-200 p-2.5 outline-none focus:border-teal-600 focus:ring-1 focus:ring-teal-600 transition-shadow bg-white"
                 >
                   <option value="Плановый">Плановый</option>
                   <option value="В работе">В работе</option>
                   <option value="Завершен">Завершен</option>
                 </select>
               </div>
               <div className="col-span-2 sm:col-span-1">
                 <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Начало</label>
                 <input
                   type="date"
                   value={startDate}
                   onChange={(e) => setStartDate(e.target.value)}
                   className="w-full mt-1.5 text-[11px] font-mono border border-zinc-200 p-2.5 outline-none focus:border-teal-600 focus:ring-1 focus:ring-teal-600"
                 />
               </div>
               <div className="col-span-2 sm:col-span-1">
                 <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Конец</label>
                 <input
                   type="date"
                   value={endDate || ''}
                   onChange={(e) => setEndDate(e.target.value)}
                   className="w-full mt-1.5 text-[11px] font-mono border border-zinc-200 p-2.5 outline-none focus:border-teal-600 focus:ring-1 focus:ring-teal-600 bg-white"
                 />
               </div>
              </div>
              <div className="pt-2">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Комментарий</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full mt-1.5 text-xs border border-zinc-200 p-2.5 outline-none focus:border-teal-600 focus:ring-1 focus:ring-teal-600 resize-none h-20"
                />
              </div>
              <div className="flex justify-end gap-3 pt-6 border-t border-zinc-100 mt-6 md:mt-8">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="px-5 py-2 text-xs font-bold text-zinc-500 hover:text-zinc-800 uppercase tracking-wider transition-colors"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="bg-teal-600 text-white px-6 py-2.5 text-xs font-bold uppercase tracking-wider hover:bg-teal-700 transition-colors shadow-sm"
                >
                  {editingProject ? 'Сохранить изменения' : 'Создать проект'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isAddGroupOpen && (
        <div className="fixed inset-0 bg-zinc-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-sm bg-white border border-zinc-200 shadow-xl p-8 slide-in-from-bottom-2 duration-300">
            <h2 className="text-2xl font-serif text-zinc-900 mb-6">{editingGroup ? 'Редактировать группу' : 'Создать группу'}</h2>
            <form onSubmit={handleSaveGroup} className="space-y-4">
               <div>
                 <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Название группы *</label>
                 <input
                   type="text"
                   value={name}
                   onChange={(e) => setName(e.target.value)}
                   className="w-full mt-1.5 text-sm font-medium border border-zinc-200 p-2.5 outline-none focus:border-teal-600 focus:ring-1 focus:ring-teal-600 transition-shadow"
                   required
                 />
               </div>
               <div>
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Статус</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as any)}
                    className="w-full mt-1.5 text-xs border border-zinc-200 p-2.5 outline-none focus:border-teal-600 focus:ring-1 focus:ring-teal-600 transition-shadow bg-white"
                  >
                    <option value="Плановый">Плановый</option>
                    <option value="В работе">В работе</option>
                    <option value="Завершен">Завершен</option>
                  </select>
               </div>
               <div className="flex justify-end gap-3 pt-6 border-t border-zinc-100 mt-6 max-w-sm">
                 <button
                   type="button"
                   onClick={() => setIsAddGroupOpen(false)}
                   className="px-5 py-2 text-xs font-bold text-zinc-500 hover:text-zinc-800 uppercase tracking-wider transition-colors"
                 >
                   Отмена
                 </button>
                 <button
                   type="submit"
                   className="bg-teal-600 text-white px-6 py-2.5 text-xs font-bold uppercase tracking-wider hover:bg-teal-700 transition-colors shadow-sm whitespace-nowrap"
                 >
                   {editingGroup ? 'Сохранить' : 'Создать'}
                 </button>
               </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
