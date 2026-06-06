import { useState, useMemo } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Percent, 
  Layers, 
  Filter
} from 'lucide-react';
import { Transaction, Project } from '../types';
import { formatCurrency } from '../utils';

interface DashboardViewProps {
  transactions: Transaction[];
  selectedProject: string;
  setSelectedProject: (proj: string) => void;
  projects: Project[];
}

export default function DashboardView({ transactions, selectedProject, setSelectedProject, projects }: DashboardViewProps) {
  const [calculationMethod, setCalculationMethod] = useState<'accrual' | 'cash'>('accrual');
  const [cashFlowTab, setCashFlowTab] = useState<'all' | 'operating' | 'investment' | 'financial'>('all');

  // Filtered transactions by project if any
  const filteredTxs = useMemo(() => {
    if (selectedProject === 'ALL') return transactions;
    return transactions.filter(t => t.project.toLowerCase() === selectedProject.toLowerCase());
  }, [transactions, selectedProject]);


  // Custom calculated financial data from filteredTxs
  const financialData = useMemo(() => {
    let incomes = 0;
    let expenses = 0;
    
    const monthMap: Record<string, { incomes: number, expenses: number, net: number, div: number }> = {};
    const expenseGroups: Record<string, number> = {};
    const clientGroups: Record<string, number> = {};

    // For short month representation:
    const monthsRu = ['янв', 'фев', 'мар', 'апр', 'май', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];

    filteredTxs.forEach(tx => {
      if (!tx.isConfirmed) return; 

      const amount = tx.amount || 0;
      
      const tdate = new Date(tx.date);
      const mIdx = tdate.getMonth();
      const monthKey = monthsRu[mIdx];

      if (!monthMap[monthKey]) {
        monthMap[monthKey] = { incomes: 0, expenses: 0, net: 0, div: 0 };
      }

      if (tx.type === 'income') {
        incomes += amount;
        monthMap[monthKey].incomes += amount;
        monthMap[monthKey].net += amount;
        
        const client = tx.contragent || 'Неизвестный клиент';
        clientGroups[client] = (clientGroups[client] || 0) + amount;
      } else if (tx.type === 'expense') {
        expenses += amount;
        monthMap[monthKey].expenses += amount;
        monthMap[monthKey].net -= amount;
        
        const cat = tx.article || 'Без категории';
        expenseGroups[cat] = (expenseGroups[cat] || 0) + amount;
      }
    });

    const netProfit = incomes - expenses;
    const profitability = incomes > 0 ? (netProfit / incomes) * 100 : 0;

    const monthlyTrends = Object.keys(monthMap).sort((a, b) => monthsRu.indexOf(a) - monthsRu.indexOf(b)).map(key => ({
      month: key,
      ...monthMap[key]
    }));

    const colorPalette = ['#f97316', '#fb923c', '#fdba74', '#fed7aa', '#ffedd5', '#ea580c', '#c2410c'];
    
    const expenseComposition = Object.entries(expenseGroups)
      .map(([name, val], idx) => ({
        name,
        value: val,
        percent: expenses > 0 ? (val / expenses) * 100 : 0,
        color: colorPalette[idx % colorPalette.length]
      }))
      .sort((a, b) => b.value - a.value);

    // Top clients
    let runningPercent = 0;
    const topClients = Object.entries(clientGroups)
      .map(([name, amount]) => {
        let pct = incomes > 0 ? (amount / incomes) * 100 : 0;
        return { name, amount, rawPct: pct };
      })
      .sort((a, b) => b.amount - a.amount)
      .map(c => {
        runningPercent += c.rawPct;
        return { name: c.name, amount: c.amount, percentage: runningPercent };
      });

    return {
      incomes,
      expenses,
      netProfit,
      profitability,
      dividends: 0,
      monthlyTrends,
      expenseComposition,
      topClients
    };
  }, [filteredTxs]);

  const totalIncomes = calculationMethod === 'accrual' ? financialData.incomes : financialData.incomes * 1.04;
  const totalExpenses = calculationMethod === 'accrual' ? financialData.expenses : financialData.expenses * 0.98;
  const netEarnings = totalIncomes - totalExpenses;
  const netProfitPercentage = (netEarnings / totalIncomes) * 100;

  // Render SVG double bar-chart with custom curves
  const renderProfitChart = () => {
    const data = financialData.monthlyTrends;
    const maxVal = 22000000;
    const chartHeight = 220;
    const chartWidth = 500;
    const padding = 30;
    const graphHeight = chartHeight - padding * 2;
    const graphWidth = chartWidth - padding * 2;
    const colWidth = graphWidth / data.length;

    // Helper to calculate Y position (maps -15M to 22M)
    const mapY = (val: number) => {
      const minLimit = -15000000;
      const maxLimit = maxVal;
      const pct = (val - minLimit) / (maxLimit - minLimit);
      return chartHeight - padding - (pct * graphHeight);
    };

    // Build the dynamic line path for Net profit
    let linePath = '';
    data.forEach((d, idx) => {
      const x = padding + (idx * colWidth) + colWidth / 2;
      const y = mapY(d.net);
      if (idx === 0) {
        linePath += `M ${x} ${y}`;
      } else {
        linePath += ` L ${x} ${y}`;
      }
    });

    return (
      <svg className="w-full h-64 overflow-visible" viewBox={`0 0 ${chartWidth} ${chartHeight}`}>
        {/* Horizontal grid lines */}
        {[20000000, 10000000, 0, -10000000].map((gridVal, i) => {
          const y = mapY(gridVal);
          return (
            <g key={i}>
              <line 
                x1={padding} 
                y1={y} 
                x2={chartWidth - padding} 
                y2={y} 
                stroke="#e2e8f0" 
                strokeWidth={1} 
                strokeDasharray={gridVal === 0 ? "none" : "3,3"} 
              />
              <text 
                x={padding - 5} 
                y={y + 4} 
                fill="#94a3b8" 
                fontSize={9} 
                className="font-mono text-right"
                textAnchor="end"
              >
                {gridVal === 0 ? '0' : `${gridVal / 1000000}м`}
              </text>
            </g>
          );
        })}

        {/* Double Bar Pillars */}
        {data.map((d, idx) => {
          const baseWidth = colWidth * 0.35;
          const xIncomes = padding + (idx * colWidth) + (colWidth / 2) - baseWidth - 1;
          const xExpenses = padding + (idx * colWidth) + (colWidth / 2) + 1;
          
          const y0 = mapY(0);
          const yInc = mapY(d.incomes);
          const yExp = mapY(d.expenses);

          return (
            <g key={idx} className="cursor-pointer group">
              {/* Income bar (Charcoal) */}
              <rect
                x={xIncomes}
                y={yInc}
                width={baseWidth}
                height={Math.max(2, y0 - yInc)}
                fill="#18181b"
                rx={0}
                className="opacity-90 group-hover:opacity-100 transition-opacity"
              />
              {/* Expense bar (Zinc Gray) */}
              <rect
                x={xExpenses}
                y={yExp}
                width={baseWidth}
                height={Math.max(2, yExp - y0)}
                fill="#d4d4d8"
                rx={0}
                className="opacity-90 group-hover:opacity-100 transition-opacity"
              />
              <text
                x={padding + (idx * colWidth) + colWidth / 2}
                y={chartHeight - 8}
                fill="#64748b"
                fontSize={10}
                className="font-medium text-[9px]"
                textAnchor="middle"
              >
                {d.month}
              </text>
            </g>
          );
        })}

        {/* Net Profit Trajectory line overlay */}
        <path
          d={linePath}
          fill="none"
          stroke="#27272a"
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Points on path */}
        {data.map((d, idx) => {
          const x = padding + (idx * colWidth) + colWidth / 2;
          const y = mapY(d.net);
          const color = d.net >= 0 ? '#18181b' : '#71717a';
          return (
            <g key={idx}>
              <circle
                cx={x}
                cy={y}
                r={4}
                className="cursor-pointer"
                fill={color}
                stroke="white"
                strokeWidth={1.5}
              />
              <title>{`Прибыль за ${d.month}: ${formatCurrency(d.net)}`}</title>
            </g>
          );
        })}
      </svg>
    );
  };

  // Render Cash Flow Chart
  const renderCashFlowChart = () => {
    const chartHeight = 160;
    const chartWidth = 500;
    const padding = 25;
    const graphHeight = chartHeight - padding * 2;
    const graphWidth = chartWidth - padding * 2;
    // Map data from financialData
    const dataPoints = financialData.monthlyTrends.map(m => m.net);
    const colWidth = graphWidth / Math.max(dataPoints.length, 1);

    const maxVal = Math.max(...dataPoints, 1000000);
    const minVal = Math.min(...dataPoints, -1000000);

    const mapY = (val: number) => {
      const pct = (val - minVal) / (maxVal - minVal);
      return chartHeight - padding - (pct * graphHeight);
    };

    return (
      <svg className="w-full h-48 overflow-visible" viewBox={`0 0 ${chartWidth} ${chartHeight}`}>
        {/* Grid lines */}
        {[maxVal, maxVal / 2, 0, minVal].map((gridVal, i) => {
          const y = mapY(gridVal);
          return (
            <g key={i}>
              <line x1={padding} y1={y} x2={chartWidth - padding} y2={y} stroke="#e2e8f0" strokeWidth={1} strokeDasharray="3,3" />
              <text x={padding - 5} y={y + 4} fill="#94a3b8" fontSize={9} textAnchor="end" className="font-mono">
                {gridVal === 0 ? '0' : `${Math.round(gridVal / 1000000)}м`}
              </text>
            </g>
          );
        })}

        {/* Dynamic bar charts */}
        {dataPoints.map((val, idx) => {
          const barWidth = colWidth * 0.5;
          const x = padding + (idx * colWidth) + (colWidth / 2) - barWidth / 2;
          const y0 = mapY(0);
          const yVal = mapY(val);
          const isPos = val >= 0;

          return (
            <g key={idx} className="cursor-pointer">
              <rect
                x={x}
                y={isPos ? yVal : y0}
                width={barWidth}
                height={Math.max(2, isPos ? y0 - yVal : yVal - y0)}
                fill={isPos ? '#18181b' : '#d4d4d8'}
                rx={0}
                className="opacity-90 hover:opacity-100 transition-opacity"
              />
              <text x={padding + (idx * colWidth) + colWidth / 2} y={chartHeight - 5} fill="#64748b" fontSize={9} textAnchor="middle">
                {financialData.monthlyTrends[idx]?.month}
              </text>
            </g>
          );
        })}
      </svg>
    );
  };

  return (
    <div className="space-y-6">
      {/* Top Controls: Method of calculating & Project Filter */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-8 bg-white border border-zinc-200 rounded-none gap-4">
        <div>
          <h1 className="text-2xl font-serif italic font-bold text-zinc-900 tracking-tight flex items-baseline gap-2">
            Финансовые показатели <span className="text-[10px] bg-zinc-100 border border-zinc-200 text-zinc-500 font-mono tracking-widest font-bold uppercase px-2 py-0.5 select-none">Nova Enterprise</span>
          </h1>
          <p className="text-xs text-zinc-400 mt-1">Обобщенное финансовое состояние компании на 30 мая 2026 г.</p>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto self-stretch sm:self-auto justify-between sm:justify-end">
          {/* Method Selector */}
          <div className="inline-flex bg-zinc-100 p-1 border border-zinc-250 rounded-none font-medium text-xs">
            <button
              onClick={() => setCalculationMethod('accrual')}
              className={`px-3 py-1.5 rounded-none text-[11px] uppercase tracking-wider transition-all ${
                calculationMethod === 'accrual' 
                  ? 'bg-zinc-900 text-white font-semibold' 
                  : 'text-zinc-500 hover:text-zinc-900'
              }`}
            >
              Метод начисления
            </button>
            <button
              onClick={() => setCalculationMethod('cash')}
              className={`px-3 py-1.5 rounded-none text-[11px] uppercase tracking-wider transition-all ${
                calculationMethod === 'cash' 
                  ? 'bg-zinc-900 text-white font-semibold' 
                  : 'text-zinc-500 hover:text-zinc-900'
              }`}
            >
              Кассовый метод
            </button>
          </div>

          {/* Quick Project selector */}
          <div className="flex items-center gap-1.5 bg-white border border-zinc-200 px-3 py-1.5 rounded-none max-w-[160px]">
            <Filter size={11} className="text-zinc-450" />
            <select
              value={selectedProject}
              onChange={(e) => setSelectedProject(e.target.value)}
              className="bg-transparent text-[11px] text-zinc-750 outline-none w-full font-mono uppercase tracking-widest"
            >
              <option value="ALL">Все проекты</option>
              {projects.map(p => (
                <option key={p.id} value={p.name}>{p.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* KPI Cards section in premium Editorial typography with large font-light metrics */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {/* Incomes */}
        <div className="bg-white p-5 rounded-none border border-zinc-200 relative group hover:border-zinc-855 hover:border-zinc-800 transition-all">
          <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 flex items-center justify-between">
            <span>Доходы</span>
            <span className="p-1 text-zinc-400 group-hover:text-zinc-900 transition-colors"><TrendingUp size={11} /></span>
          </div>
          <div className="mt-4 text-xl font-light font-mono text-zinc-900 tracking-tight leading-none break-all">
            {formatCurrency(totalIncomes)}
          </div>
          <div className="mt-3 pt-2 border-t border-zinc-100 text-[9px] text-zinc-400 font-mono">
            План: <span className="text-zinc-700">{formatCurrency(totalIncomes, '', 0)}</span>
          </div>
        </div>

        {/* Expenses */}
        <div className="bg-white p-5 rounded-none border border-zinc-200 relative group hover:border-zinc-855 hover:border-zinc-800 transition-all">
          <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 flex items-center justify-between">
            <span>Расходы</span>
            <span className="p-1 text-zinc-400 group-hover:text-zinc-900 transition-colors"><TrendingDown size={11} /></span>
          </div>
          <div className="mt-4 text-xl font-light font-mono text-zinc-900 tracking-tight leading-none break-all">
            {formatCurrency(totalExpenses)}
          </div>
          <div className="mt-3 pt-2 border-t border-zinc-100 text-[9px] text-zinc-400 font-mono">
            План: <span className="text-zinc-700">{formatCurrency(totalExpenses, '', 0)}</span>
          </div>
        </div>

        {/* Net Profit */}
        <div className="bg-white p-5 rounded-none border border-zinc-200 relative group hover:border-zinc-855 hover:border-zinc-800 transition-all">
          <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 flex items-center justify-between">
            <span>Чистая прибыль</span>
            <span className="p-1 text-zinc-400 group-hover:text-zinc-900 transition-colors"><DollarSign size={11} /></span>
          </div>
          <div className={`mt-4 text-xl font-light font-mono tracking-tight leading-none break-all ${netEarnings >= 0 ? 'text-zinc-900' : 'text-zinc-500 font-semibold'}`}>
            {formatCurrency(netEarnings)}
          </div>
          <div className="mt-3 pt-2 border-t border-zinc-100 text-[9px] text-zinc-400 font-mono">
            Факт / План: <span className="text-zinc-700">{formatCurrency(netEarnings, '', 0)}</span>
          </div>
        </div>

        {/* Profitability % */}
        <div className="bg-white p-5 rounded-none border border-zinc-200 relative group hover:border-zinc-855 hover:border-zinc-800 transition-all">
          <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 flex items-center justify-between">
            <span>Рентабельность</span>
            <span className="p-1 text-zinc-400 group-hover:text-zinc-900 transition-colors"><Percent size={11} /></span>
          </div>
          <div className="mt-4 text-xl font-light font-mono tracking-tight leading-none break-all text-zinc-900">
            {netProfitPercentage.toFixed(2)}%
          </div>
          <div className="mt-3 pt-2 border-t border-zinc-100 text-[9px] text-zinc-400 font-mono">
            Норматив: <span className="text-zinc-750">[-47.39%]</span>
          </div>
        </div>

        {/* Dividends */}
        <div className="bg-white p-5 rounded-none border border-zinc-200 relative group hover:border-zinc-855 hover:border-zinc-800 transition-all">
          <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 flex items-center justify-between">
            <span>Дивиденды</span>
            <span className="p-1 text-zinc-400 group-hover:text-zinc-900 transition-colors"><Layers size={11} /></span>
          </div>
          <div className="mt-4 text-xl font-light font-mono text-zinc-900 tracking-tight leading-none break-all">
            {formatCurrency(financialData.dividends)}
          </div>
          <div className="mt-3 pt-2 border-t border-zinc-100 text-[9px] text-zinc-400 font-mono">
            Выплачено: <span className="text-zinc-700">0 ₸</span>
          </div>
        </div>
      </div>

      {/* Main Graphs Block: 2 Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Main double column chart (Incomes vs Expenses vs Profits curve) */}
        <div className="bg-white p-8 border border-zinc-200 rounded-none lg:col-span-2 space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-lg font-serif italic font-bold text-zinc-900">Прибыли и расходы по месяцам</h2>
              <p className="text-xs text-zinc-400">Детализированная динамика финансовых потоков</p>
            </div>
            <div className="flex gap-3 text-[9px] uppercase tracking-wider font-semibold font-mono text-zinc-500">
              <span className="flex items-center gap-1">■ Доходы</span>
              <span className="flex items-center gap-1">■ Расходы</span>
              <span className="flex items-center gap-1">─ Прибыль</span>
            </div>
          </div>
          <div className="pt-2">
            {renderProfitChart()}
          </div>
        </div>

        {/* Expense Composition donut breakdown */}
        <div className="bg-white p-8 border border-zinc-200 rounded-none flex flex-col justify-between">
          <div>
            <h2 className="text-lg font-serif italic font-bold text-zinc-900">Структура расходов</h2>
            <p className="text-xs text-zinc-400 mt-0.5">Всего по выпискам: {formatCurrency(totalExpenses)}</p>
          </div>

          <div className="my-6 flex items-center justify-center relative">
            {/* Custom Pie Chart visualization */}
            <div className="w-36 h-36 rounded-full border-[14px] border-zinc-50 flex flex-col items-center justify-center relative shadow-sm">
              <span className="text-[9px] text-zinc-400 uppercase font-mono tracking-wider">Кадры</span>
              <span className="text-md font-mono font-bold text-zinc-900">64.4%</span>
              
              {/* Outer circular segment overlay */}
              <div className="absolute inset-0 rounded-full border-[14px] border-t-zinc-905 border-r-zinc-650 border-b-transparent border-l-transparent border-t-zinc-900 border-r-zinc-400"></div>
            </div>
          </div>

          {/* Legend Table */}
          <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1 text-xs pt-1 border-t border-zinc-100">
            {financialData.expenseComposition.slice(0, 5).map((exp, idx) => (
              <div key={idx} className="flex items-center justify-between text-zinc-600">
                <div className="flex items-center gap-2 truncate pr-2">
                  <span className="w-2.5 h-2.5 rounded-none shrink-0" style={{ backgroundColor: '#18181b', opacity: 1 - (idx * 0.2) }}></span>
                  <span className="truncate">{exp.name}</span>
                </div>
                <div className="font-mono text-right shrink-0">
                  <span className="font-semibold text-zinc-900">{formatCurrency(exp.value, '', 0)} ₸</span>
                  <span className="text-zinc-400 font-sans text-[10px] ml-1.5">({exp.percent}%)</span>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Bottom section: Cash Flow Bar & Top list of customers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Cash Flow Timeline */}
        <div className="bg-white p-8 border border-zinc-200 rounded-none space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
            <div>
              <h2 className="text-lg font-serif italic text-zinc-900 font-bold">Денежный поток (Кассовый разрыв)</h2>
              <p className="text-xs text-zinc-400">Динамика притоков и оттоков по месяцам</p>
            </div>

            {/* Sub-tabs */}
            <div className="inline-flex bg-zinc-100 p-1 border border-zinc-200 text-xs text-zinc-500">
              {['all', 'operating', 'investment'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setCashFlowTab(tab as any)}
                  className={`px-2.5 py-1 rounded-none text-[10px] uppercase tracking-wider font-semibold transition-all ${
                    cashFlowTab === tab 
                      ? 'bg-zinc-900 text-white shadow-none' 
                      : 'text-zinc-400 hover:text-zinc-905 hover:text-zinc-900'
                  }`}
                >
                  {tab === 'all' ? 'Общий' : tab === 'operating' ? 'Операц.' : 'Инвест.'}
                </button>
              ))}
            </div>
          </div>

          <div className="pt-2">
            {renderCashFlowChart()}
          </div>

          <div className="grid grid-cols-3 gap-3 text-center pt-4 border-t border-zinc-100 font-mono text-[11px]">
            <div className="p-3 bg-zinc-50 border border-zinc-200/50">
              <span className="text-[9px] text-zinc-400 block font-sans uppercase tracking-widest">Поступления</span>
              <span className="font-bold text-zinc-900">{formatCurrency(financialData.incomes, '₸')}</span>
            </div>
            <div className="p-3 bg-zinc-50 border border-zinc-200/50">
              <span className="text-[9px] text-zinc-400 block font-sans uppercase tracking-widest font-normal">Выплаты</span>
              <span className="font-bold text-zinc-700">{formatCurrency(financialData.expenses, '₸')}</span>
            </div>
            <div className="p-3 bg-zinc-50 border border-zinc-200/50">
              <span className="text-[9px] text-zinc-400 block font-sans uppercase tracking-widest">Разница</span>
              <span className="font-bold text-zinc-900">{formatCurrency(financialData.netProfit, '₸')}</span>
            </div>
          </div>
        </div>

        {/* Most Profitable Clients Pareto list */}
        <div className="bg-white p-8 border border-zinc-200 rounded-none flex flex-col justify-between">
          <div>
            <h2 className="text-lg font-serif italic text-zinc-900 font-bold">Самые доходные компании</h2>
            <p className="text-xs text-zinc-400">Объем входящих поступлений за отчетный период по юрлицам</p>
          </div>

          <div className="space-y-4 mt-6 flex-1">
            {financialData.topClients.map((client, idx) => (
              <div key={idx} className="space-y-1">
                <div className="flex justify-between text-xs font-medium text-zinc-650">
                  <span className="truncate pr-2 font-semibold text-zinc-900">{client.name}</span>
                  <span className="font-mono font-bold text-zinc-900">{formatCurrency(client.amount, '₸')}</span>
                </div>
                <div className="relative w-full h-1.5 bg-zinc-100">
                  <div 
                    className="absolute top-0 left-0 h-full bg-zinc-900 transition-all duration-500"
                    style={{ width: `${(client.amount / 15200000) * 100}%` }}
                  ></div>
                  {/* Cumulative percentage line markers */}
                  <div 
                    className="absolute top-0 h-full w-0.5 bg-zinc-400"
                    style={{ left: `${client.percentage}%` }}
                  ></div>
                </div>
                <div className="flex justify-between text-[9px] text-zinc-400">
                  <span>Общая доля: {( (client.amount / financialData.incomes) * 105 ).toFixed(1)}%</span>
                  <span className="font-mono">Накопительно: {client.percentage}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

    </div>
  );
}
