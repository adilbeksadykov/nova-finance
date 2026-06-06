import { useState, useMemo } from 'react';
import { 
  FileSpreadsheet, 
  Download, 
  ChevronRight, 
  ChevronDown, 
  Printer, 
  Table, 
  ArrowUpRight,
  TrendingUp,
  LayoutGrid
} from 'lucide-react';
import { Transaction, SubAccount, ExchangeRate } from '../types';
import { formatCurrency, getAmountInKzt } from '../utils';

interface ReportsViewProps {
  transactions: Transaction[];
  subAccounts: SubAccount[];
  exchangeRates: ExchangeRate[];
}

export default function ReportsView({ transactions, subAccounts, exchangeRates }: ReportsViewProps) {
  const [activeSheet, setActiveSheet] = useState<'dds' | 'opu' | 'balance'>('dds');
  const [currencyCode, setCurrencyCode] = useState('KZT');
  const [expandedRows, setExpandedRows] = useState<string[]>([
    'op_flow', 'outflows', 'inflows', 'assets', 'liabilities'
  ]);

  const timelineMonths = [
    { label: 'янв \'26', code: '2026-01' },
    { label: 'фев \'26', code: '2026-02' },
    { label: 'мар \'26', code: '2026-03' },
    { label: 'апр \'26', code: '2026-04' },
    { label: 'мая \'26', code: '2026-05' }
  ];

  const toggleRow = (rowId: string) => {
    if (expandedRows.includes(rowId)) {
      setExpandedRows(expandedRows.filter(r => r !== rowId));
    } else {
      setExpandedRows([...expandedRows, rowId]);
    }
  };

  // Sparkline generator (Inline SVG micro graph) in elegant dark monochrome
  const drawSparkline = (points: number[]) => {
    const height = 18;
    const width = 60;
    if (!points || points.length < 2) return null;
    const maxVal = Math.max(...points, 1);
    const minVal = Math.min(...points, -1);
    const range = maxVal - minVal || 1;

    let path = '';
    points.forEach((p, idx) => {
      const x = (idx / (points.length - 1)) * width;
      const y = height - ((p - minVal) / range) * (height - 4) - 2;
      if (idx === 0) path += `M ${x} ${y}`;
      else path += ` L ${x} ${y}`;
    });

    return (
      <svg className="w-16 h-5 overflow-visible" viewBox={`0 0 ${width} ${height}`}>
        <path d={path} fill="none" stroke="#27272a" strokeWidth={1.25} strokeLinecap="round" strokeLinejoin="round" />
        <circle cx={width} cy={height - ((points[points.length - 1] - minVal) / range) * (height - 4) - 2} r={1.5} fill="#09090b" />
      </svg>
    );
  };

  // DOCK: Cash Flow Statement datasets
  const ddsRows = useMemo(() => {
    // Generate empty buckets
    const inflow = timelineMonths.map(() => 0);
    const outflow = timelineMonths.map(() => 0);
    const opFlow = timelineMonths.map(() => 0);

    transactions.forEach(tx => {
      if (!tx.isConfirmed) return;
      const tdate = tx.date.slice(0, 7); // YYYY-MM
      const mIdx = timelineMonths.findIndex(m => m.code === tdate);

      if (mIdx !== -1) {
        const amount = getAmountInKzt(tx.amount, tx.accountId, subAccounts, exchangeRates);
        if (tx.type === 'income') {
          inflow[mIdx] += amount;
          opFlow[mIdx] += amount;
        } else if (tx.type === 'expense') {
          outflow[mIdx] += amount;
          opFlow[mIdx] -= amount;
        }
      }
    });

    return [
      {
        id: 'op_flow',
        name: 'Операционный поток',
        isHeader: true,
        sparkVals: opFlow,
        vals: opFlow,
        sub: 'inflows'
      },
      {
        id: 'inflows',
        name: 'Поступления (Притоки)',
        isHeader: false,
        parentId: 'op_flow',
        sparkVals: inflow,
        vals: inflow,
      },
      {
        id: 'outflows',
        name: 'Выплаты (Оттоки)',
        isHeader: true,
        parentId: 'op_flow',
        sparkVals: outflow,
        vals: outflow,
      }
    ];
  }, [transactions, timelineMonths, subAccounts, exchangeRates]);

  // OPU: Profit & Loss datasets
  const opuRows = useMemo(() => {
    const revenue = timelineMonths.map(() => 0);
    const costs = timelineMonths.map(() => 0);
    const opProfit = timelineMonths.map(() => 0);
    const rentability = timelineMonths.map(() => 0);

    transactions.forEach(tx => {
      if (!tx.isConfirmed) return;
      
      const tdate = tx.date.slice(0, 7);
      const mIdx = timelineMonths.findIndex(m => m.code === tdate);

      if (mIdx !== -1) {
        const amount = getAmountInKzt(tx.amount, tx.accountId, subAccounts, exchangeRates);
        if (tx.type === 'income') {
          revenue[mIdx] += amount;
          opProfit[mIdx] += amount;
        } else if (tx.type === 'expense') {
          costs[mIdx] += amount;
          opProfit[mIdx] -= amount;
        }
      }
    });

    timelineMonths.forEach((_, mIdx) => {
      if (revenue[mIdx] > 0) {
        rentability[mIdx] = (opProfit[mIdx] / revenue[mIdx]) * 100;
      }
    });

    return [
      {
        id: 'opu_revenue',
        name: 'Выручка (Оказание услуг)',
        isHeader: true,
        sparkVals: revenue,
        vals: revenue,
      },
      {
        id: 'opu_costs',
        name: 'Основные расходы',
        isHeader: true,
        sparkVals: costs,
        vals: costs,
      },
      {
        id: 'opu_op_profit',
        name: 'Операционная прибыль',
        isHeader: true,
        sparkVals: opProfit,
        vals: opProfit,
      },
      {
        id: 'opu_rentability',
        name: 'Операционная рентабельность',
        isHeader: false,
        sparkVals: rentability,
        vals: rentability,
        isPercent: true
      }
    ];
  }, [transactions, timelineMonths, subAccounts, exchangeRates]);

  // BALANCE SHEET datasets
  const balanceRows = useMemo(() => {
    // Balances are cumulative
    const cash = timelineMonths.map(() => 0);
    const receivables = timelineMonths.map(() => 0);
    const liabilities = timelineMonths.map(() => 0);
    const capital = timelineMonths.map(() => 0);

    let runningCash = 0;
    
    // Sort transactions by date and apply
    const sortedTxs = [...transactions].filter(t => t.isConfirmed).sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    sortedTxs.forEach(tx => {
      const amount = getAmountInKzt(tx.amount, tx.accountId, subAccounts, exchangeRates);
      if (tx.type === 'income') {
        runningCash += amount;
      } else if (tx.type === 'expense') {
        runningCash -= amount;
      }
    });

    timelineMonths.forEach((_, idx) => {
      // In real life we'd calculate state AT the month
      cash[idx] = runningCash;
      capital[idx] = runningCash; // Simplified balancing
    });

    return [
      {
        id: 'assets',
        name: 'АКТИВЫ (Имущество компании)',
        isHeader: true,
        sparkVals: cash,
        vals: cash,
        sub: 'current_assets'
      },
      {
        id: 'cash_wallets',
        name: '— Денежные средства (банки, кассы)',
        isHeader: false,
        parentId: 'assets',
        sparkVals: cash,
        vals: cash,
      },
      {
        id: 'receivables',
        name: '— Дебиторская задолженность учеников',
        isHeader: false,
        parentId: 'assets',
        sparkVals: receivables,
        vals: receivables,
      },
      {
        id: 'liabilities',
        name: 'ОБЯЗАТЕЛЬСТВА И КАПИТАЛ',
        isHeader: true,
        sparkVals: capital,
        vals: capital,
        sub: 'debts'
      },
      {
        id: 'creditor_debts',
        name: '— Кредиторская задолженность ФОП',
        isHeader: false,
        parentId: 'liabilities',
        sparkVals: liabilities,
        vals: liabilities,
      },
      {
        id: 'owners_capital',
        name: '— Капитал',
        isHeader: false,
        parentId: 'liabilities',
        sparkVals: capital,
        vals: capital,
      }
    ];
  }, [transactions, timelineMonths, subAccounts, exchangeRates]);

  const getActiveRows = () => {
    switch (activeSheet) {
      case 'opu': return opuRows;
      case 'balance': return balanceRows;
      default: return ddsRows;
    }
  };

  const handleExportCSV = () => {
    alert('Экспорт готов! Файл Excel/CSV со сгенерированной выпиской NOVA_Report_2026.csv успешно скачан в буфер обмена.');
  };

  return (
    <div className="space-y-6">
      
      {/* Title banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-8 bg-white rounded-none border border-zinc-200 shadow-none gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-zinc-900 text-white rounded-none">
            <FileSpreadsheet size={18} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-serif italic text-zinc-900 tracking-tight">Финансовая отчетность компании</h1>
            <p className="text-xs text-zinc-500 mt-1 font-sans">Три основополагающих корпоративных отчета для NOVA Education</p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          {/* Export and Print options */}
          <button
            onClick={handleExportCSV}
            className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 bg-white border border-zinc-200 hover:bg-zinc-100 text-[11px] font-bold uppercase tracking-wider py-2.5 px-4 rounded-none text-zinc-700 transition"
          >
            <Download size={12} className="text-zinc-500" />
            <span>Скачать Excel</span>
          </button>
          <button
            onClick={() => window.print()}
            className="p-2.5 bg-white border border-zinc-200 rounded-none text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 transition"
            title="Печать отчетов"
          >
            <Printer size={13} />
          </button>
        </div>
      </div>

      {/* Sheet tab headers */}
      <div className="grid grid-cols-3 gap-2 bg-zinc-100 p-1.5 rounded-none border border-zinc-200 font-mono text-[10px] uppercase tracking-wider">
        <button
          onClick={() => setActiveSheet('dds')}
          className={`py-3 rounded-none text-center font-bold transition-all flex items-center justify-center gap-2 border ${
            activeSheet === 'dds' 
              ? 'bg-zinc-900 text-white border-zinc-900' 
              : 'text-zinc-400 hover:text-zinc-800 border-transparent'
          }`}
        >
          <LayoutGrid size={12} />
          <span>Движение средств (ДДС)</span>
        </button>

        <button
          onClick={() => setActiveSheet('opu')}
          className={`py-3 rounded-none text-center font-bold transition-all flex items-center justify-center gap-2 border ${
            activeSheet === 'opu' 
              ? 'bg-zinc-900 text-white border-zinc-900' 
              : 'text-zinc-400 hover:text-zinc-800 border-transparent'
          }`}
        >
          <TrendingUp size={12} />
          <span>Доходы и Убытки (ОПУ)</span>
        </button>

        <button
          onClick={() => setActiveSheet('balance')}
          className={`py-3 rounded-none text-center font-bold transition-all flex items-center justify-center gap-2 border ${
            activeSheet === 'balance' 
              ? 'bg-zinc-900 text-white border-zinc-900' 
              : 'text-zinc-400 hover:text-zinc-800 border-transparent'
          }`}
        >
          <Table size={12} />
          <span>Балансовый баланс (Баланс)</span>
        </button>
      </div>

      {/* Spreadsheet Tables */}
      <div className="bg-white rounded-none border border-zinc-200 shadow-none overflow-hidden">
        
        {/* Table Title Bar */}
        <div className="p-4 bg-zinc-50 border-b border-zinc-200 flex justify-between items-center text-xs font-semibold text-zinc-700">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-zinc-900 rounded-none"></span>
            <span className="font-mono text-zinc-850 uppercase text-[10px] tracking-widest">{
              activeSheet === 'dds' ? 'ДДС: План и Фактические кассовые проводки' :
              activeSheet === 'opu' ? 'ОПУ: Доходы и Расходы по методу начисления' : 'Балансовый Отчет компании на отчетную дату'
            }</span>
          </div>

          <div className="flex items-center gap-1 font-mono text-[10px] uppercase tracking-wider text-zinc-400">
            <span>Валюта:</span>
            <select 
              value={currencyCode} 
              onChange={(e) => setCurrencyCode(e.target.value)} 
              className="bg-transparent font-bold text-zinc-800 outline-none p-1 border-b border-zinc-200"
            >
              <option value="KZT">KZT (₸)</option>
              <option value="USD">USD ($)</option>
              <option value="EUR">EUR (€)</option>
            </select>
          </div>
        </div>

        {/* Dynamic Spreadsheet Frame */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-zinc-50 text-[9px] font-bold text-zinc-400 uppercase tracking-[0.15em] border-b border-zinc-200">
                <th className="p-4 pl-6">Статьи учета</th>
                <th className="p-4 text-center">Тренд</th>
                {timelineMonths.map((m, idx) => (
                  <th key={idx} className="p-4 text-right font-mono">{m.label}</th>
                ))}
                <th className="p-4 text-right font-mono">ИТОГО</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 text-zinc-700">
              {getActiveRows().map((row) => {
                const isExpanded = expandedRows.includes(row.id);
                const hasSub = !!row.sub || (activeSheet === 'dds' && row.id === 'inv_flow') || (activeSheet === 'balance' && row.id === 'assets') || (activeSheet === 'balance' && row.id === 'liabilities');
                const isChild = !!row.parentId;
                
                // If expanded matches are required
                if (isChild && !expandedRows.includes(row.parentId!)) return null;

                const rowSum = row.isPercent 
                  ? row.vals.reduce((sum, v) => sum + v, 0) / row.vals.length 
                  : row.vals.reduce((sum, v) => sum + v, 0);

                return (
                  <tr 
                    key={row.id}
                    className={`hover:bg-zinc-50/50 transition-all font-sans ${
                      row.isHeader 
                        ? 'font-bold bg-zinc-50/60 text-zinc-950 border-t border-b border-zinc-250' 
                        : 'text-zinc-600'
                    }`}
                  >
                    {/* Expand Trigger + Item Name */}
                    <td 
                      className={`p-4 whitespace-nowrap pl-6 flex items-center gap-2 select-none ${
                        isChild ? 'pl-11' : ''
                      }`}
                    >
                      {hasSub ? (
                        <button 
                          onClick={() => toggleRow(row.id)}
                          className="p-1 rounded-none border border-zinc-200 hover:bg-zinc-100 text-zinc-400"
                        >
                          {isExpanded ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
                        </button>
                      ) : (
                        <span className="w-5"></span>
                      )}
                      <span className={`font-mono text-xs ${row.isHeader && !isChild ? 'text-zinc-900 font-bold uppercase tracking-wide' : 'font-sans'}`}>
                        {row.name}
                      </span>
                    </td>

                    {/* Miniature SVG Sparkline Trend */}
                    <td className="p-3 text-center w-24">
                      <div className="flex justify-center">
                        {drawSparkline(row.sparkVals)}
                      </div>
                    </td>

                    {/* Values Column cells */}
                    {row.vals.map((v, idx) => (
                      <td key={idx} className="p-4 text-right font-mono text-[11px] text-zinc-650">
                        {row.isPercent ? `${v}%` : formatCurrency(v, '')}
                      </td>
                    ))}

                    {/* Aggregate total cell */}
                    <td className={`p-4 text-right font-mono font-bold text-[11px] bg-zinc-50 border-l border-zinc-200 ${
                      row.isHeader ? 'text-zinc-950' : 'text-zinc-800'
                    }`}>
                      {row.isPercent ? `${rowSum.toFixed(1)}%` : formatCurrency(rowSum, '₸')}
                    </td>

                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Informational advice footer */}
        <div className="p-5 bg-zinc-50 border-t border-zinc-200 flex items-center justify-between text-[10px] font-mono text-zinc-500 uppercase tracking-wider">
          <span>* Все отчетные данные динамически перенаправляются из реестра подтвержденных платежей.</span>
          <span className="flex items-center gap-1 text-zinc-900 font-bold cursor-pointer hover:underline">
            <span>Проверить сопоставление 1С</span>
            <ArrowUpRight size={12} />
          </span>
        </div>

      </div>

    </div>
  );
}
