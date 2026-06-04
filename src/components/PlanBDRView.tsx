import React, { useState, useMemo } from 'react';
import { ChevronDown, ChevronRight, Download, MoreHorizontal, Upload } from 'lucide-react';
import { ArticleCategory, Project, Transaction } from '../types';
import { formatCurrency } from '../utils';

interface PlanBDRViewProps {
  categories: ArticleCategory[];
  projects: Project[];
  transactions: Transaction[];
  budgets: Record<string, Record<string, Record<string, number>>>;
  setBudgets: React.Dispatch<React.SetStateAction<Record<string, Record<string, Record<string, number>>>>>;
}

const addMonths = (date: Date, months: number) => {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
};

const formatMonthKey = (date: Date) => date.toISOString().slice(0, 7); // YYYY-MM
const formatDisplayMonth = (date: Date) => {
    const m = date.toLocaleString('ru', { month: 'short' });
    const y = date.getFullYear().toString().slice(2);
    return `${m} '${y}`;
}

export default function PlanBDRView({ categories, projects, transactions, budgets, setBudgets }: PlanBDRViewProps) {
  const [selectedProject, setSelectedProject] = useState('ALL');

  const baseDate = new Date('2026-01-01');

  const periods = useMemo(() => {
     const p = [];
     for(let i = 0; i < 12; i++) {
         const d = addMonths(baseDate, i);
         p.push({
             key: formatMonthKey(d),
             label: formatDisplayMonth(d),
             date: d
         });
     }
     return p;
  }, []);

  const handlePlanChange = (periodKey: string, articleId: string, val: string) => {
     const numStr = val.replace(/\s/g, '').replace(',', '.');
     let num = Number(numStr);
     if (isNaN(num)) num = 0;
     
     const prjKey = selectedProject === 'ALL' ? 'NO_PROJECT' : selectedProject;
     setBudgets(prev => ({
         ...prev,
         [prjKey]: {
             ...(prev[prjKey] || {}),
             [periodKey]: {
                 ...(prev[prjKey]?.[periodKey] || {}),
                 [articleId]: num
             }
         }
     }));
  };

  const getBudgetValue = (periodKey: string, articleId: string) => {
      if (selectedProject === 'ALL') {
          let sum = 0;
          Object.values(budgets).forEach(projBudgets => {
              sum += (projBudgets[periodKey]?.[articleId] || 0);
          });
          return sum;
      } else {
          return budgets[selectedProject]?.[periodKey]?.[articleId] || 0;
      }
  };

  // Build tree
  const tree = useMemo(() => {
      const bdr_income: any[] = [];
      const bdr_expense: any[] = [];
      
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
              bdr_income.push(buildSubTree(r));
          } else if (r.type === 'expense') {
              bdr_expense.push(buildSubTree(r));
          }
      });

      return [
        { id: 'bdr_inc', label: 'Выручка / Доходы', children: bdr_income },
        { id: 'bdr_exp', label: 'Расходы', children: bdr_expense },
      ];
  }, [categories]);

  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({
    'bdr_inc': true,
    'bdr_exp': true,
  });

  const toggleNode = (id: string) => {
    setExpandedNodes(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const hasChildWithData = (nodeId: string, pKey: string): boolean => {
      const findNode = (nodes: any[], targetId: string): any => {
          for (const n of nodes) {
              if (n.id === targetId) return n;
              if (n.children) {
                  const f = findNode(n.children, targetId);
                  if (f) return f;
              }
          }
          return null;
      };

      const nodeTree = findNode(tree, nodeId);
      if (!nodeTree || !nodeTree.children) return false;

      let hasData = false;
      const checkChildren = (nodes: any[]) => {
          for (const c of nodes) {
              if (getBudgetValue(pKey, c.id) !== 0) {
                  hasData = true;
                  return;
              }
              if (c.children) checkChildren(c.children);
          }
      };
      checkChildren(nodeTree.children);
      return hasData;
  };

  const hasParentWithData = (nodeId: string, pKey: string): boolean => {
      let currentId = nodeId;
      while (true) {
          const cat = categories.find(c => c.id === currentId);
          if (!cat || !cat.parentId) break;
          currentId = cat.parentId;
          if (getBudgetValue(pKey, currentId) !== 0) return true;
      }
      return false;
  };

  const calculateNodeTotal = (nodeId: string, pKey: string) => {
      const isInternal = ['bdr_inc', 'bdr_exp'].includes(nodeId);
      
      let selfVal = isInternal ? 0 : getBudgetValue(pKey, nodeId);

      const findNode = (nodes: any[], targetId: string): any => {
          for (const n of nodes) {
              if (n.id === targetId) return n;
              if (n.children) {
                  const f = findNode(n.children, targetId);
                  if (f) return f;
              }
          }
          return null;
      };

      const nodeTree = isInternal ? (nodeId === 'bdr_inc' ? tree[0] : tree[1]) : findNode(tree, nodeId);
      if (!nodeTree || !nodeTree.children) return selfVal;
      
      let sum = selfVal;
      const sumChildren = (nodes: any[]) => {
          nodes.forEach(c => {
             sum += getBudgetValue(pKey, c.id);
             if (c.children) sumChildren(c.children);
          });
      };
      sumChildren(nodeTree.children);
      return sum;
  };

  const renderRow = (node: any, level: number) => {
    const isExpanded = expandedNodes[node.id];
    const hasChildren = node.children && node.children.length > 0;
    const isCategoryNode = !['bdr_inc', 'bdr_exp'].includes(node.id);
    
    return (
      <React.Fragment key={node.id}>
        <tr className="border-b border-zinc-200 hover:bg-zinc-50 transition-colors group">
          <td className="p-3 bg-white sticky left-0 z-10 w-64 shadow-[1px_0_0_0_#e4e4e7] group-hover:bg-zinc-50">
            <div 
              className={`flex items-center text-xs text-zinc-800 ${hasChildren ? 'font-medium' : ''}`} 
              style={{ paddingLeft: `${level * 16}px` }}
            >
              {hasChildren ? (
                <button onClick={() => toggleNode(node.id)} className="mr-2 text-zinc-400 hover:text-zinc-700">
                  {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                </button>
              ) : (
                <span className="w-6 inline-block"></span>
              )}
              {node.label}
            </div>
          </td>
          {periods.map(p => {
             const val = calculateNodeTotal(node.id, p.key);
             const prjKey = selectedProject === 'ALL' ? 'NO_PROJECT' : selectedProject;
             const inputValue = budgets[prjKey]?.[p.key]?.[node.id] || '';
             
             const isInputMode = isCategoryNode && selectedProject !== 'ALL' && !hasChildWithData(node.id, p.key) && !hasParentWithData(node.id, p.key);

             return (
              <td key={p.key} className="p-2 w-28 text-right text-xs font-mono border-l border-zinc-200 group">
                  {isInputMode ? (
                      <input 
                        type="text"
                        value={val === 0 && !inputValue ? '' : inputValue}
                        onChange={(e) => handlePlanChange(p.key, node.id, e.target.value)}
                        className="w-full text-right bg-transparent outline-none text-teal-700 hover:bg-teal-50 focus:bg-teal-50 px-2 py-1 rounded border border-transparent focus:border-teal-300 transition-colors placeholder-transparent focus:placeholder-zinc-300"
                        placeholder="0"
                      />
                  ) : (
                      <span className={`pr-3 ${val !== 0 ? (hasChildren ? 'text-zinc-900 font-bold' : 'text-zinc-900 font-medium') : 'text-zinc-400'}`}>
                          {val === 0 ? '-' : formatCurrency(val, '')}
                      </span>
                  )}
              </td>
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
          <h1 className="text-2xl font-serif tracking-tight text-zinc-900">Бюджет доходов и расходов (БДР)</h1>
          <div className="flex items-center gap-2">
            <span className="bg-zinc-100 text-zinc-600 px-2 py-1 text-[10px] font-bold uppercase tracking-widest rounded-sm">Янв '26 — Дек '26</span>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <button className="px-3 py-1.5 text-xs font-medium border border-zinc-200 text-zinc-700 hover:bg-zinc-50 bg-white shadow-sm flex items-center gap-1.5">
            <Upload size={14} /> Импортировать
          </button>
          <button className="px-3 py-1.5 text-xs font-medium border border-zinc-200 text-zinc-700 hover:bg-zinc-50 bg-white shadow-sm flex items-center gap-1.5">
            <Download size={14} /> .xls
          </button>
          <button className="p-2 border border-zinc-200 text-zinc-400 hover:text-zinc-600 hover:bg-zinc-50 transition-colors bg-white shadow-sm disabled:opacity-50 h-[30px] w-[30px] flex items-center justify-center">
            <MoreHorizontal size={16} />
          </button>
        </div>
      </div>

      <div className="px-5 py-3 border-b border-zinc-100 bg-zinc-50/50 flex items-center gap-4 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-zinc-500">Отображение:</span>
            <select className="bg-transparent font-medium text-zinc-800 outline-none cursor-pointer">
                <option>По месяцам</option>
            </select>
          </div>
          <div className="flex items-center gap-2 border-l border-zinc-200 pl-4">
            <span className="text-zinc-500">Проект:</span>
            <select 
                value={selectedProject}
                onChange={e => setSelectedProject(e.target.value)}
                className="bg-transparent font-medium text-zinc-800 outline-none cursor-pointer"
            >
                <option value="ALL">Сводный по всем проектам</option>
                <option value="NO_PROJECT">Без проекта</option>
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
              <th className="p-3 text-xs font-medium text-zinc-700 w-64 shadow-[1px_0_0_0_#e4e4e7] sticky left-0 z-30 bg-zinc-50 align-bottom border-b border-zinc-200">
                Общий бюджет
              </th>
              {periods.map(p => (
                <th key={p.key} className="p-3 pt-4 text-xs font-medium text-center border-l border-b border-zinc-200 text-zinc-800 bg-zinc-50 w-28">
                  {p.label}
                  <div className="text-[10px] uppercase font-bold tracking-widest text-zinc-400 mt-2">План</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {tree.map(node => renderRow(node, 0))}
            
            <tr className="bg-zinc-50/80 border-t-2 border-zinc-200 font-bold group">
               <td className="p-3 text-xs text-zinc-900 sticky left-0 z-10 w-64 shadow-[1px_0_0_0_#e4e4e7] bg-zinc-50/80 group-hover:bg-zinc-100">Итоговая прибыль (EBITDA)</td>
               {periods.map(p => {
                 const tIn = calculateNodeTotal('bdr_inc', p.key);
                 const tOut = calculateNodeTotal('bdr_exp', p.key);
                 const flow = tIn - tOut;
                 return (
                  <td key={p.key} className={`p-3 px-4 text-right text-xs font-mono border-l border-zinc-200 ${flow > 0 ? 'text-teal-700' : flow < 0 ? 'text-red-700' : 'text-zinc-800'}`}>
                    {flow !== 0 ? formatCurrency(flow, '') : '0'}
                  </td>
                )
               })}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
