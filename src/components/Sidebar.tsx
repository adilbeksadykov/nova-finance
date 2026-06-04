import React, { useState } from 'react';
import { 
  BarChart3, 
  RefreshCw, 
  Briefcase, 
  TrendingUp, 
  FileText, 
  FolderTree, 
  Users, 
  Settings, 
  Wallet,
  Menu,
  ChevronDown,
  Bell,
  MoreHorizontal
} from 'lucide-react';
import { formatCurrency } from '../utils';

interface SidebarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  totalBalance: number;
  onBalanceClick: () => void;
  userEmail: string;
  onLogout: () => void;
}

export default function Sidebar({ 
  currentTab, 
  setCurrentTab, 
  totalBalance, 
  onBalanceClick,
  userEmail,
  onLogout
}: SidebarProps) {
  const [isPlanOpen, setIsPlanOpen] = useState(false);
  const [isDirectoriesOpen, setIsDirectoriesOpen] = useState(true);

  const mainNav = [
    { id: 'dashboard', label: 'Показатели', icon: BarChart3 },
    { id: 'transactions', label: 'Операции', icon: RefreshCw },
  ];

  const planNav = [
    { id: 'plan-calendar', label: 'Платежный календарь' },
    { id: 'plan-bdds', label: 'Бюджет движения денег' },
    { id: 'plan-bdr', label: 'Бюджет доходов и расходов' },
  ];

  const bottomNavBase = [
    { id: 'projects', label: 'Проекты', icon: Briefcase },
    { id: 'reports', label: 'Отчёты', icon: FileText },
  ];

  const directoryNav = [
    { id: 'contractors', label: 'Контрагенты' },
    { id: 'categories', label: 'Учетные статьи' },
    { id: 'account-types', label: 'Типы счетов' },
    { id: 'accounts', label: 'Мои счета' },
    { id: 'legal-entities', label: 'Мои юрлица' },
  ];

  return (
    <div className="w-64 bg-slate-800 text-slate-300 flex flex-col h-screen sticky top-0 shrink-0 font-sans">
      
      {/* Top logo block */}
      <div className="pt-8 pb-6 flex flex-col items-center justify-center gap-3">
        {/* The Icon */}
        <div className="w-14 h-14 bg-[#3d338a] rounded-[18px] flex items-center justify-center shadow-lg relative">
            <svg width="30" height="30" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                {/* Left/Top part */}
                <path d="M8 24V13C8 10.2386 10.2386 8 13 8H18L24 16" stroke="white" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round"/>
                {/* Right/Bottom part */}
                <path d="M24 8V19C24 21.7614 21.7614 24 19 24H14L8 16" stroke="white" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
        </div>
        {/* The Text */}
        <div className="text-center">
            <div className="text-[#968cf0] font-bold text-2xl tracking-[0.15em] leading-none mb-1 shadow-sm mix-blend-screen bg-clip-text text-transparent bg-gradient-to-r from-blue-100 to-white">NOVA</div>
            <div className="text-slate-400 text-[10px] tracking-[0.45em] uppercase font-bold pl-1">Education</div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto w-full pt-2">
        <ul className="space-y-0.5">
          {mainNav.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <li key={item.id}>
                <button
                  onClick={() => setCurrentTab(item.id)}
                  className={`w-full flex items-center gap-3 px-6 py-2.5 text-xs transition-colors ${
                    isActive 
                      ? 'bg-slate-700/50 text-white border-l-2 border-teal-500' 
                      : 'hover:bg-slate-700/30 text-slate-300 hover:text-white border-l-2 border-transparent'
                  }`}
                >
                  <Icon size={16} className={isActive ? 'text-teal-400' : 'text-slate-400'} strokeWidth={1.5} />
                  <span>{item.label}</span>
                </button>
              </li>
            );
          })}

          <li className="pt-2 pb-1">
            <button
              onClick={() => setIsPlanOpen(!isPlanOpen)}
              className={`w-full flex items-center justify-between px-6 py-2.5 text-xs transition-colors ${
                planNav.some(p => p.id === currentTab) && !isPlanOpen
                  ? 'text-white'
                  : 'hover:bg-slate-700/30 text-slate-300 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-3">
                <Bell size={16} className="text-slate-400" strokeWidth={1.5} />
                <span>План</span>
              </div>
            </button>

            {isPlanOpen && (
              <ul className="bg-slate-750 pb-2">
                {planNav.map(item => {
                  const isActive = currentTab === item.id;
                  return (
                    <li key={item.id}>
                      <button
                        onClick={() => setCurrentTab(item.id)}
                        className={`w-full text-left pl-14 pr-6 py-2 text-xs transition-colors ${
                          isActive 
                            ? 'text-white bg-slate-700/30 font-medium' 
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {item.label}
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </li>

          {bottomNavBase.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <li key={item.id}>
                <button
                  onClick={() => setCurrentTab(item.id)}
                  className={`w-full flex items-center gap-3 px-6 py-2.5 text-xs transition-colors ${
                    isActive 
                      ? 'bg-slate-700/50 text-white border-l-2 border-teal-500' 
                      : 'hover:bg-slate-700/30 text-slate-300 hover:text-white border-l-2 border-transparent'
                  }`}
                >
                  <Icon size={16} className={isActive ? 'text-teal-400' : 'text-slate-400'} strokeWidth={1.5} />
                  <span>{item.label}</span>
                </button>
              </li>
            );
          })}

          <li className="pt-2">
            <button
              onClick={() => setIsDirectoriesOpen(!isDirectoriesOpen)}
              className={`w-full flex items-center justify-between px-6 py-2.5 text-xs transition-colors ${
                directoryNav.some(d => d.id === currentTab) && !isDirectoriesOpen
                  ? 'text-white'
                  : 'hover:bg-slate-700/30 text-slate-300 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-3">
                <FolderTree size={16} className="text-slate-400" strokeWidth={1.5} />
                <span>Справочники</span>
              </div>
            </button>

            {isDirectoriesOpen && (
              <ul className="bg-slate-750 pb-2">
                {directoryNav.map(item => {
                  const isActive = currentTab === item.id;
                  return (
                    <li key={item.id}>
                      <button
                        onClick={() => setCurrentTab(item.id)}
                        className={`w-full text-left pl-14 pr-6 py-2 text-xs transition-colors ${
                          isActive 
                            ? 'text-white bg-slate-700/30 font-medium' 
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {item.label}
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </li>

          <li>
            <button
              onClick={() => setCurrentTab('settings')}
              className={`w-full flex items-center gap-3 px-6 py-2.5 text-xs transition-colors ${
                currentTab === 'settings'
                  ? 'bg-slate-700/50 text-white border-l-2 border-teal-500' 
                  : 'hover:bg-slate-700/30 text-slate-300 hover:text-white border-l-2 border-transparent'
              }`}
            >
              <Settings size={16} className={currentTab === 'settings' ? 'text-teal-400' : 'text-slate-400'} strokeWidth={1.5} />
              <span>Настройки</span>
            </button>
          </li>
        </ul>
      </nav>

      {/* User profile footer */}
      <div className="p-4 border-t border-slate-700/60 flex flex-col gap-2 bg-slate-900/20">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="w-8 h-8 rounded-full bg-teal-500/10 text-teal-400 flex items-center justify-center font-bold text-sm shrink-0 border border-teal-500/20 font-mono">
            {userEmail ? userEmail.substring(0, 1).toUpperCase() : 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[11px] font-semibold text-slate-100 truncate">{userEmail ? userEmail.split('@')[0] : 'User'}</div>
            <div className="text-[10px] text-slate-400 truncate">{userEmail || ''}</div>
          </div>
        </div>
        
        {/* Logout button */}
        <button
          onClick={onLogout}
          className="w-full flex items-center justify-center gap-1.5 mt-2 px-3 py-1.5 border border-slate-700/80 hover:bg-slate-700/40 text-[11px] text-slate-300 hover:text-white transition-colors cursor-pointer rounded-md font-sans"
        >
          <MoreHorizontal size={14} className="rotate-90 shrink-0 text-slate-400" />
          <span>Выйти из аккаунта</span>
        </button>
      </div>

    </div>
  );
}
