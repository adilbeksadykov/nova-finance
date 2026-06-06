import React, { useState, useMemo } from 'react';
import { ChevronDown, ChevronRight, MoreHorizontal, AlertCircle } from 'lucide-react';
import { Transaction, SubAccount, ArticleCategory, Project, ExchangeRate } from '../types';
import { formatCurrency, getAmountInKzt } from '../utils';

interface PlanCalendarViewProps {
  transactions: Transaction[];
  subAccounts: SubAccount[];
  categories: ArticleCategory[];
  projects: Project[];
  budgets: Record<string, Record<string, Record<string, number>>>;
  exchangeRates: ExchangeRate[];
}

const addMonths = (date: Date, months: number) => {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
};

const formatMonthKey = (date: Date) => date.toISOString().slice(0, 7); // YYYY-MM
const formatDisplayMonth = (date: Date) => {
    const m = date.toLocaleString('ru', { month: 'long' });
    const y = date.getFullYear().toString().slice(2);
    // return capitalized month
    return `${m.charAt(0).toUpperCase() + m.slice(1)} '${y}`;
}

export default function PlanCalendarView({ transactions, subAccounts, categories, projects, budgets, exchangeRates }: PlanCalendarViewProps) {
  const [selectedProject, setSelectedProject] = useState('ALL');

  const baseDateStr = '2026-05-01'; // align to month start
  const baseDate = new Date(baseDateStr);

  const periods = useMemo(() => {
     const p = [];
     for(let i = -2; i < 10; i++) {
         const d = addMonths(baseDate, i);
         p.push({
             key: formatMonthKey(d),
             label: formatDisplayMonth(d),
             date: d,
             isPast: i < 0
         });
     }
     return p;
  }, []);

  const initialBalance = useMemo(() => {
    return subAccounts.reduce((sum, sub) => sum + sub.balance, 0); 
  }, [subAccounts]);

  const factData = useMemo(() => {
      const data: Record<string, Record<string, number>> = {};
      periods.forEach(p => { data[p.key] = {}; });

      const categoryNameToId = categories.reduce((acc, cat) => {
          acc[cat.name] = cat.id;
          return acc;
      }, {} as Record<string, string>);

      transactions.forEach(tx => {
         const monthKey = tx.date.slice(0, 7);
         if (data[monthKey]) {
             if (tx.splits && tx.splits.length > 0) {
                 tx.splits.forEach(split => {
                     if (selectedProject === 'ALL' || split.project === selectedProject) {
                         let catId = categoryNameToId[split.article];
                         if (!catId) {
                             if (tx.type === 'income') {
                                 catId = 'unassigned_income';
                             } else if (tx.type === 'expense') {
                                 catId = 'unassigned_expense';
                             }
                         }
                         if (catId) {
                             const amt = data[monthKey][catId] || 0;
                             data[monthKey][catId] = amt + getAmountInKzt(Math.abs(split.amount), tx.accountId, subAccounts, exchangeRates);
                         }
                     }
                 });
             } else {
                 if (selectedProject === 'ALL' || tx.project === selectedProject) {
                     let catId = categoryNameToId[tx.article];
                     if (!catId) {
                         if (tx.type === 'income') {
                             catId = 'unassigned_income';
                         } else if (tx.type === 'expense') {
                             catId = 'unassigned_expense';
                         }
                     }
                     if (catId) {
                         const amt = data[monthKey][catId] || 0;
                         data[monthKey][catId] = amt + getAmountInKzt(Math.abs(tx.amount), tx.accountId, subAccounts, exchangeRates);
                     }
                 }
             }
         }
      });
      return data;
   }, [periods, transactions, selectedProject, categories, subAccounts, exchangeRates]);

  const calculateFactTotal = (nodeId: string, pKey: string): number => {
      if (nodeId === 'op') {
          return calculateFactTotal('op_in', pKey) - calculateFactTotal('op_out', pKey);
      }
      
      let total = factData[pKey]?.[nodeId] || 0;
      
      const node = flattenTree.find(n => n.id === nodeId);
      if (node && node.children) {
          node.children.forEach((c: any) => {
              total += calculateFactTotal(c.id, pKey);
          });
      }
      return total;
  };

  const calculatePlanTotal = (nodeId: string, pKey: string): number => {
      if (nodeId === 'op') {
          return calculatePlanTotal('op_in', pKey) - calculatePlanTotal('op_out', pKey);
      }

      let selfVal = 0;
      if (!['op_in', 'op_out', 'inv', 'fin', 'trans'].includes(nodeId)) {
          if (selectedProject === 'ALL') {
              Object.values(budgets).forEach(projBudgets => {
                  selfVal += (projBudgets[pKey]?.[nodeId] || 0);
              });
          } else {
              selfVal = budgets[selectedProject]?.[pKey]?.[nodeId] || 0;
          }
      }

      let total = selfVal;
      const node = flattenTree.find(n => n.id === nodeId);
      if (node && node.children) {
          node.children.forEach((c: any) => {
              total += calculatePlanTotal(c.id, pKey);
          });
      }
      return total;
  };

  // Build dynamic tree
  const tree = useMemo(() => {
      const op_in_children: any[] = [];
      const op_out_children: any[] = [];
      
      // Filter root categories
      const roots = categories.filter(c => !c.parentId);
      roots.forEach(r => {
          const buildSubTree = (cat: ArticleCategory) => {
              const children = categories.filter(c => c.parentId === cat.id);
              return {
                  id: cat.id,
                  label: cat.name,
                  children: children.length > 0 ? children.map(buildSubTree) : undefined
              };
          };
          
          if (r.type === 'income') {
              op_in_children.push(buildSubTree(r));
          } else if (r.type === 'expense') {
              op_out_children.push(buildSubTree(r));
          }
      });

      // Append virtual "Без статьи" nodes
      op_in_children.push({
          id: 'unassigned_income',
          label: 'Без статьи'
      });
      op_out_children.push({
          id: 'unassigned_expense',
          label: 'Без статьи'
      });

      return [
        { id: 'op', label: 'Операционный поток', children: [
            { id: 'op_in', label: 'Поступления', children: op_in_children },
            { id: 'op_out', label: 'Выплаты', children: op_out_children }
        ]},
        { id: 'inv', label: 'Инвестиционный поток' },
        { id: 'fin', label: 'Финансовый поток' },
        { id: 'trans', label: 'Перемещения' },
      ];
  }, [categories]);

  const flattenTree = useMemo(() => {
      const flat: any[] = [];
      const traverse = (nodes: any[]) => {
          nodes.forEach(n => {
              flat.push(n);
              if (n.children) traverse(n.children);
          });
      };
      traverse(tree);
      return flat;
  }, [tree]);

  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({
    'op': true,
    'op_in': true,
    'op_out': true,
  });

  const toggleNode = (id: string) => {
    setExpandedNodes(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const periodBalances = useMemo(() => {
      const bals: Record<string, { factStart: number, factEnd: number, planStart: number, planEnd: number, gap: boolean }> = {};
      let currentFactStart = initialBalance; 
      let currentPlanStart = initialBalance;

      periods.forEach(p => {
         const factInflow = calculateFactTotal('op_in', p.key);
         const factOutflow = calculateFactTotal('op_out', p.key);
         const planInflow = calculatePlanTotal('op_in', p.key);
         const planOutflow = calculatePlanTotal('op_out', p.key);

         const factEnd = currentFactStart + factInflow - factOutflow;
         const planEnd = currentPlanStart + planInflow - planOutflow;
         
         bals[p.key] = {
             factStart: currentFactStart,
             factEnd: factEnd,
             planStart: currentPlanStart,
             planEnd: planEnd,
             gap: planEnd < 0
         };
         currentFactStart = factEnd;
         currentPlanStart = planEnd;
      });
      return bals;
  }, [periods, initialBalance, flattenTree, factData, budgets, selectedProject]);

  const hasCashGap = useMemo(() => {
      return Object.values(periodBalances).some((b: any) => b.gap);
  }, [periodBalances]);
  
  const gapPeriod = useMemo(() => {
      const g = periods.find(p => periodBalances[p.key]?.gap);
      return g ? g.label : '';
  }, [periods, periodBalances]);

  const renderRow = (node: any, level: number) => {
    const isExpanded = expandedNodes[node.id];
    const hasChildren = node.children && node.children.length > 0;
    
    // Choose classes based on hierarchy level and ID
    let rowClass = "border-b border-zinc-200 transition-colors group ";
    let stickyCellClass = "p-3 sticky left-0 z-10 w-64 shadow-[1px_0_0_0_#e4e4e7] ";
    let textClass = "flex items-center text-xs ";

    if (level === 0) {
      rowClass += "bg-zinc-100/90 font-bold border-t border-zinc-200 hover:bg-zinc-200/50";
      stickyCellClass += "bg-zinc-100/90 group-hover:bg-zinc-200/50";
      textClass += "text-zinc-900 uppercase tracking-wider text-[10px] py-0.5";
    } else if (node.id === 'op_in') {
      rowClass += "bg-teal-50/20 hover:bg-teal-50/45 font-semibold";
      stickyCellClass += "bg-teal-50/20 group-hover:bg-teal-50/45";
      textClass += "text-teal-850 uppercase tracking-wider text-[10px]";
    } else if (node.id === 'op_out') {
      rowClass += "bg-rose-50/20 hover:bg-rose-50/45 font-semibold";
      stickyCellClass += "bg-rose-50/20 group-hover:bg-rose-50/45";
      textClass += "text-rose-850 uppercase tracking-wider text-[10px]";
    } else if (node.id === 'unassigned_income' || node.id === 'unassigned_expense') {
      rowClass += "bg-white hover:bg-zinc-50/60";
      stickyCellClass += "bg-white group-hover:bg-zinc-50/60";
      textClass += "text-zinc-500 font-normal italic";
    } else if (level === 2) {
      rowClass += "bg-white hover:bg-zinc-50/80";
      stickyCellClass += "bg-white group-hover:bg-zinc-50/80";
      textClass += "text-zinc-800 font-medium";
    } else {
      rowClass += "bg-zinc-50/5 hover:bg-zinc-50/60";
      stickyCellClass += "bg-zinc-50/5 group-hover:bg-zinc-50/60";
      textClass += "text-zinc-500 font-normal";
    }

    return (
      <React.Fragment key={node.id}>
        <tr className={rowClass}>
          <td className={stickyCellClass}>
            <div 
              className={textClass} 
              style={{ paddingLeft: `${level * 16}px` }}
            >
              {hasChildren ? (
                <button onClick={() => toggleNode(node.id)} className="mr-2 text-zinc-400 hover:text-zinc-700 shrink-0">
                  {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                </button>
              ) : (
                <span className="w-6 inline-block shrink-0"></span>
              )}
              {level >= 3 && (
                <span className="text-zinc-300 mr-1.5 select-none font-normal shrink-0">—</span>
              )}
              <span className="truncate">{node.label}</span>
            </div>
          </td>
          {periods.map(p => {
             const factVal = calculateFactTotal(node.id, p.key);
             const planVal = calculatePlanTotal(node.id, p.key);

             let factTextClass = 'text-zinc-400 font-normal';
             if (factVal !== 0) {
                 if (level === 0) factTextClass = 'text-zinc-950 font-bold';
                 else if (node.id === 'op_in') factTextClass = 'text-teal-850 font-bold';
                 else if (node.id === 'op_out') factTextClass = 'text-rose-850 font-bold';
                 else if (node.id === 'unassigned_income' || node.id === 'unassigned_expense') factTextClass = 'text-zinc-500 font-normal italic';
                 else if (level === 2) factTextClass = 'text-zinc-800 font-semibold';
                 else factTextClass = 'text-zinc-600 font-medium';
             }

             let planTextClass = 'text-zinc-400 font-normal';
             if (planVal !== 0) {
                 if (level === 0) planTextClass = 'text-teal-900 font-bold';
                 else if (node.id === 'op_in') planTextClass = 'text-teal-950 font-bold';
                 else if (node.id === 'op_out') planTextClass = 'text-rose-950 font-bold';
                 else if (level === 2) planTextClass = 'text-teal-700 font-semibold';
                 else planTextClass = 'text-teal-600 font-medium';
             }

             return (
              <React.Fragment key={p.key}>
                <td className="p-2 w-28 text-right text-xs font-mono border-l border-zinc-200">
                    <span className={`pr-2 ${factTextClass}`}>{factVal !== 0 ? formatCurrency(factVal, '') : '-'}</span>
                </td>
                <td className="p-2 w-28 text-right text-xs font-mono">
                    <span className={`pr-3 ${planTextClass}`}>
                        {planVal !== 0 ? formatCurrency(planVal, '') : '-'}
                    </span>
                </td>
              </React.Fragment>
            );
          })}
        </tr>
        {hasChildren && isExpanded && node.children.map((child: any) => renderRow(child, level + 1))}
      </React.Fragment>
    );
  };

  return (
    <div className="flex flex-col h-full bg-white border border-zinc-200 shadow-sm animate-in fade-in duration-300">
      <div className="flex flex-wrap lg:flex-nowrap items-center justify-between p-5 border-b border-zinc-200 gap-4">
        <div className="flex items-center gap-6 flex-wrap">
          <h1 className="text-2xl font-serif tracking-tight text-zinc-900">Платежный календарь</h1>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider hidden sm:inline">Отображение</span>
            <select 
              className="text-xs font-medium border border-zinc-200 bg-white p-1.5 pr-6 outline-none shadow-sm cursor-pointer hover:border-zinc-300 transition-colors focus:ring-1 focus:ring-teal-500"
            >
              <option value="months">По месяцам</option>
            </select>
          </div>
          <button className="p-2 border border-zinc-200 text-zinc-400 hover:text-zinc-600 hover:bg-zinc-50 transition-colors bg-white shadow-sm disabled:opacity-50 h-[30px] w-[30px] flex items-center justify-center">
            <MoreHorizontal size={16} />
          </button>
        </div>
      </div>
      
      {hasCashGap && (
          <div className="bg-red-50 text-red-700 px-5 py-3 text-sm font-medium flex items-center gap-2 border-b border-red-100">
             <AlertCircle size={16}/> Надвигающийся кассовый разрыв начиная с: {gapPeriod}
          </div>
      )}

      <div className="px-5 py-3 border-b border-zinc-100 bg-zinc-50/50 flex items-center gap-4 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-zinc-500">Счета:</span>
            <select className="bg-transparent font-medium text-zinc-800 outline-none cursor-pointer">
                <option>Все счета и юрлица</option>
            </select>
          </div>
          <div className="flex items-center gap-2 border-l border-zinc-200 pl-4">
            <span className="text-zinc-500">Проекты:</span>
            <select 
                value={selectedProject}
                onChange={e => setSelectedProject(e.target.value)}
                className="bg-transparent font-medium text-zinc-800 outline-none cursor-pointer"
            >
                <option value="ALL">Все проекты</option>
                {projects.map(p => (
                   <option key={p.id} value={p.id}>{p.name}</option>
                ))}
            </select>
          </div>
      </div>

      <div className="flex-1 overflow-auto bg-zinc-50/20">
        <table className="w-full text-left whitespace-nowrap border-collapse min-w-max">
          <thead className="sticky top-0 z-20 shadow-[0_1px_0_0_#e4e4e7]">
            <tr className="bg-zinc-50">
              <th rowSpan={2} className="p-3 text-xs font-medium text-zinc-700 w-64 shadow-[1px_0_0_0_#e4e4e7] sticky left-0 z-30 bg-zinc-50 align-bottom border-b border-zinc-200">
                Движение денег, ₸
              </th>
              {periods.map(p => (
                <th key={p.key} colSpan={2} className={`p-3 pt-4 text-xs font-medium text-center border-l border-b border-zinc-200 ${periodBalances[p.key]?.gap ? 'bg-red-50 text-red-700 border-red-200 border-x font-bold' : 'text-zinc-800 bg-zinc-50'}`}>
                  {p.label}
                </th>
              ))}
            </tr>
            <tr className="bg-zinc-50">
              {periods.map(p => (
                <React.Fragment key={p.key}>
                  <th className={`p-2 pb-3 text-center text-[10px] font-bold tracking-widest uppercase border-b border-l border-zinc-200 w-28 ${periodBalances[p.key]?.gap ? 'bg-red-50/50 text-red-600 border-l-red-200' : 'text-zinc-500 bg-zinc-50'}`}>Факт</th>
                  <th className={`p-2 pb-3 text-center text-[10px] font-bold tracking-widest uppercase border-b border-zinc-200 w-28 ${periodBalances[p.key]?.gap ? 'bg-red-50/50 text-red-600 border-r border-r-red-200' : 'text-zinc-500 bg-zinc-50'}`}>План</th>
                </React.Fragment>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr className="bg-white border-b border-zinc-200 font-bold group">
               <td className="p-3 text-xs text-zinc-800 sticky left-0 z-10 w-64 shadow-[1px_0_0_0_#e4e4e7] bg-white group-hover:bg-zinc-50">Остаток на начало</td>
               {periods.map(p => (
                <React.Fragment key={p.key}>
                  <td className={`p-3 px-2 text-right text-xs font-mono border-l ${periodBalances[p.key]?.gap ? 'bg-red-50/30 text-red-700' : 'text-zinc-600 bg-zinc-50/30'}`}>
                    {formatCurrency(periodBalances[p.key].factStart, '')}
                  </td>
                  <td className={`p-3 px-2 text-right text-xs font-mono border-l border-zinc-200 ${periodBalances[p.key]?.gap ? 'bg-red-50/30 text-red-700' : 'text-zinc-600 bg-zinc-50/30'}`}>
                    {formatCurrency(periodBalances[p.key].planStart, '')}
                  </td>
                </React.Fragment>
              ))}
            </tr>
            
            {tree.map(node => renderRow(node, 0))}
            
            <tr className="bg-zinc-50/80 border-t-2 border-zinc-200 font-bold group">
               <td className="p-3 text-xs text-zinc-900 sticky left-0 z-10 w-64 shadow-[1px_0_0_0_#e4e4e7] bg-zinc-50/80 group-hover:bg-zinc-100">Общий денежный поток</td>
               {periods.map(p => {
                 const factIn = calculateFactTotal('op_in', p.key);
                 const factOut = calculateFactTotal('op_out', p.key);
                 const factFlow = factIn - factOut;
                 
                 const planIn = calculatePlanTotal('op_in', p.key);
                 const planOut = calculatePlanTotal('op_out', p.key);
                 const planFlow = planIn - planOut;
                 return (
                  <React.Fragment key={p.key}>
                    <td className={`p-3 px-2 text-right text-xs font-mono border-l border-zinc-200 ${factFlow > 0 ? 'text-teal-700' : factFlow < 0 ? 'text-red-700' : 'text-zinc-800'}`}>
                      {factFlow !== 0 ? formatCurrency(factFlow, '') : '0'}
                    </td>
                    <td className={`p-3 px-2 text-right text-xs font-mono border-l border-zinc-200 ${planFlow > 0 ? 'text-teal-700' : planFlow < 0 ? 'text-red-700' : 'text-zinc-800'}`}>
                      {planFlow !== 0 ? formatCurrency(planFlow, '') : '0'}
                    </td>
                  </React.Fragment>
                )
               })}
            </tr>
          </tbody>
          <tfoot className="sticky bottom-0 z-20 shadow-[0_-1px_0_0_#e4e4e7]">
             <tr className="bg-zinc-100">
               <td className="p-3 py-4 text-xs font-bold text-zinc-900 sticky left-0 z-30 w-64 shadow-[1px_0_0_0_#e4e4e7] bg-zinc-100 flex items-center gap-2 leading-none cursor-pointer hover:bg-zinc-200">
                 <button className="text-zinc-500"><ChevronDown size={14} /></button>
                 Остатки на счетах
               </td>
               {periods.map(p => (
                <React.Fragment key={p.key}>
                  <td className={`p-3 px-2 text-right text-xs font-bold font-mono border-l border-zinc-200 ${periodBalances[p.key]?.gap ? 'text-red-700 bg-red-100' : 'text-zinc-900'}`}>
                    {formatCurrency(periodBalances[p.key].factEnd, '')}
                  </td>
                  <td className={`p-3 px-2 text-right text-xs font-bold font-mono border-l border-zinc-200 ${periodBalances[p.key]?.gap ? 'text-red-700 bg-red-100' : 'text-zinc-900'}`}>
                    {formatCurrency(periodBalances[p.key].planEnd, '')}
                  </td>
                </React.Fragment>
              ))}
             </tr>
             <tr className="bg-zinc-50">
               <td className="p-3 text-xs text-zinc-600 sticky left-0 z-30 w-64 shadow-[1px_0_0_0_#e4e4e7] bg-zinc-50 pl-8 border-t border-zinc-200">
                 Основной счет
               </td>
               {periods.map(p => (
                <React.Fragment key={p.key}>
                  <td className={`p-3 px-2 text-right text-xs font-mono border-l border-t border-zinc-200 ${periodBalances[p.key]?.gap ? 'text-red-600 bg-red-50/50' : 'text-zinc-500'}`}>
                    {formatCurrency(periodBalances[p.key].factEnd, '')}
                  </td>
                  <td className={`p-3 px-2 text-right text-xs font-mono border-l border-t border-zinc-200 ${periodBalances[p.key]?.gap ? 'text-red-600 bg-red-50/50' : 'text-zinc-500'}`}>
                    {formatCurrency(periodBalances[p.key].planEnd, '')}
                  </td>
                </React.Fragment>
              ))}
             </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
