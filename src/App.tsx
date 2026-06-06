import { useState, useMemo, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import DashboardView from './components/DashboardView';
import TransactionsView from './components/TransactionsView';
import AccountsView from './components/AccountsView';
import ReportsView from './components/ReportsView';
import CategoriesView from './components/CategoriesView';
import AccountTypesView from './components/AccountTypesView';
import UsersView from './components/UsersView';
import SettingsView from './components/SettingsView';
import PlanCalendarView from './components/PlanCalendarView';
import PlanBDRView from './components/PlanBDRView';

import LegalEntitiesView from './components/LegalEntitiesView';
import ProjectsView from './components/ProjectsView';

import { 
  INITIAL_SUB_ACCOUNTS, 
  INITIAL_TRANSACTIONS, 
  INITIAL_TEAM_USERS, 
  INITIAL_ARTICLE_CATEGORIES, 
  INITIAL_EXCHANGE_RATES,
  INITIAL_PROJECTS,
  INITIAL_LEGAL_ENTITIES,
  formatCurrency
} from './utils';

import { SubAccount, Transaction, TeamUser, ArticleCategory, ExchangeRate, Project, LegalEntity, ProjectGroup } from './types';
import { Loader } from 'lucide-react';

import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from './firebase';
import Login from './components/Login';

function useLocalStorage<T>(key: string, initialValue: T) {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.warn(error);
      return initialValue;
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(storedValue));
    } catch (error) {
      console.warn(error);
    }
  }, [key, storedValue]);

  return [storedValue, setStoredValue] as const;
}

export default function App() {
  const [currentTab, setCurrentTab] = useState<string>('dashboard');
  const [selectedProject, setSelectedProject] = useState<string>('ALL');

  // Firebase auth & DB sync state
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [dbLoading, setDbLoading] = useState(false);
  const [isDataLoaded, setIsDataLoaded] = useState(false);

  // Load state
  const [subAccounts, setSubAccounts] = useLocalStorage<SubAccount[]>('app_subAccounts', INITIAL_SUB_ACCOUNTS);
  const [transactions, setTransactions] = useLocalStorage<Transaction[]>('app_transactions', INITIAL_TRANSACTIONS);
  const [users, setUsers] = useLocalStorage<TeamUser[]>('app_users', INITIAL_TEAM_USERS);
  const [categories, setCategories] = useLocalStorage<ArticleCategory[]>('app_categories', INITIAL_ARTICLE_CATEGORIES);
  const [exchangeRates, setExchangeRates] = useLocalStorage<ExchangeRate[]>('app_exchangeRates', INITIAL_EXCHANGE_RATES);
  const [projectGroups, setProjectGroups] = useLocalStorage<ProjectGroup[]>('app_projectGroups', []);
  const [projects, setProjects] = useLocalStorage<Project[]>('app_projects', INITIAL_PROJECTS);
  const [legalEntities, setLegalEntities] = useLocalStorage<LegalEntity[]>('app_legalEntities', INITIAL_LEGAL_ENTITIES);
  const [accountTypes, setAccountTypes] = useLocalStorage<string[]>('app_accountTypes', ['cash', 'non-cash', 'card', 'electronic']);
  
  // Format: { [projectId_or_no_project]: { [periodKey]: { [articleId]: number } } }
  const [budgets, setBudgets] = useLocalStorage<Record<string, Record<string, Record<string, number>>>>('app_budgets', {});

  // Balances Popover State
  const [isBalancePopoverOpen, setIsBalancePopoverOpen] = useState(false);

  // Sync state with Firestore on Auth Change
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      setAuthLoading(false);
      
      if (user) {
        setDbLoading(true);
        try {
          const configDocRef = doc(db, 'users', user.uid, 'data', 'config');
          const configDocSnap = await getDoc(configDocRef);
          
          const txDocRef = doc(db, 'users', user.uid, 'data', 'transactions');
          const txDocSnap = await getDoc(txDocRef);

          if (configDocSnap.exists() && txDocSnap.exists()) {
            const configData = configDocSnap.data();
            const txData = txDocSnap.data();

            const shouldMigrateCategories = !configData.categories || configData.categories.length < 25;
            const cats = shouldMigrateCategories ? INITIAL_ARTICLE_CATEGORIES : (configData.categories || INITIAL_ARTICLE_CATEGORIES);

            if (shouldMigrateCategories) {
              console.log('Migrating categories to the new list...');
              await setDoc(configDocRef, {
                ...configData,
                categories: INITIAL_ARTICLE_CATEGORIES
              });
            }

            setSubAccounts(configData.subAccounts || []);
            setCategories(cats);
            setExchangeRates(configData.exchangeRates || INITIAL_EXCHANGE_RATES);
            setProjects(configData.projects || INITIAL_PROJECTS);
            setProjectGroups(configData.projectGroups || []);
            setLegalEntities(configData.legalEntities || INITIAL_LEGAL_ENTITIES);
            setAccountTypes(configData.accountTypes || ['cash', 'non-cash', 'card', 'electronic']);
            setBudgets(configData.budgets || {});
            setUsers(configData.users || INITIAL_TEAM_USERS);
            setTransactions(txData.transactions || []);
          } else {
            // First login - try migrating from localStorage or initialize with default configs
            const localSubAccounts = localStorage.getItem('app_subAccounts');
            const localTransactions = localStorage.getItem('app_transactions');
            const localCategories = localStorage.getItem('app_categories');
            const localExchangeRates = localStorage.getItem('app_exchangeRates');
            const localProjects = localStorage.getItem('app_projects');
            const localProjectGroups = localStorage.getItem('app_projectGroups');
            const localLegalEntities = localStorage.getItem('app_legalEntities');
            const localAccountTypes = localStorage.getItem('app_accountTypes');
            const localBudgets = localStorage.getItem('app_budgets');
            const localUsers = localStorage.getItem('app_users');

            const subAccountsVal = localSubAccounts ? JSON.parse(localSubAccounts) : INITIAL_SUB_ACCOUNTS;
            const transactionsVal = localTransactions ? JSON.parse(localTransactions) : INITIAL_TRANSACTIONS;
            const categoriesVal = localCategories ? JSON.parse(localCategories) : INITIAL_ARTICLE_CATEGORIES;
            const exchangeRatesVal = localExchangeRates ? JSON.parse(localExchangeRates) : INITIAL_EXCHANGE_RATES;
            const projectsVal = localProjects ? JSON.parse(localProjects) : INITIAL_PROJECTS;
            const projectGroupsVal = localProjectGroups ? JSON.parse(localProjectGroups) : [];
            const legalEntitiesVal = localLegalEntities ? JSON.parse(localLegalEntities) : INITIAL_LEGAL_ENTITIES;
            const accountTypesVal = localAccountTypes ? JSON.parse(localAccountTypes) : ['cash', 'non-cash', 'card', 'electronic'];
            const budgetsVal = localBudgets ? JSON.parse(localBudgets) : {};
            const usersVal = localUsers ? JSON.parse(localUsers) : INITIAL_TEAM_USERS;

            await setDoc(configDocRef, {
              subAccounts: subAccountsVal,
              categories: categoriesVal,
              exchangeRates: exchangeRatesVal,
              projects: projectsVal,
              projectGroups: projectGroupsVal,
              legalEntities: legalEntitiesVal,
              accountTypes: accountTypesVal,
              budgets: budgetsVal,
              users: usersVal,
            });

            await setDoc(txDocRef, {
              transactions: transactionsVal,
            });

            setSubAccounts(subAccountsVal);
            setTransactions(transactionsVal);
            setCategories(categoriesVal);
            setExchangeRates(exchangeRatesVal);
            setProjects(projectsVal);
            setProjectGroups(projectGroupsVal);
            setLegalEntities(legalEntitiesVal);
            setAccountTypes(accountTypesVal);
            setBudgets(budgetsVal);
            setUsers(usersVal);
          }
          setIsDataLoaded(true);
        } catch (error) {
          console.error('Error syncing Firestore data on login:', error);
        } finally {
          setDbLoading(false);
        }
      } else {
        setIsDataLoaded(false);
      }
    });

    return () => unsubscribe();
  }, []);

  // Auto-save data changes to Firestore
  useEffect(() => {
    if (!currentUser || !isDataLoaded) return;

    const saveConfig = async () => {
      try {
        const configDocRef = doc(db, 'users', currentUser.uid, 'data', 'config');
        await setDoc(configDocRef, {
          subAccounts,
          categories,
          exchangeRates,
          projects,
          projectGroups,
          legalEntities,
          accountTypes,
          budgets,
          users,
        });
      } catch (err) {
        console.error('Error auto-saving config to Firestore:', err);
      }
    };

    const timeout = setTimeout(saveConfig, 800);
    return () => clearTimeout(timeout);
  }, [subAccounts, categories, exchangeRates, projects, projectGroups, legalEntities, accountTypes, budgets, users, currentUser, isDataLoaded]);

  // Auto-save transactions changes to Firestore
  useEffect(() => {
    if (!currentUser || !isDataLoaded) return;

    const saveTransactions = async () => {
      try {
        const txDocRef = doc(db, 'users', currentUser.uid, 'data', 'transactions');
        await setDoc(txDocRef, {
          transactions,
        });
      } catch (err) {
        console.error('Error auto-saving transactions to Firestore:', err);
      }
    };

    const timeout = setTimeout(saveTransactions, 800);
    return () => clearTimeout(timeout);
  }, [transactions, currentUser, isDataLoaded]);

  // Dynamic Balance Math
  const netCorporateBalance = useMemo(() => {
    return subAccounts.reduce((sum, sub) => {
      const rateObj = exchangeRates.find(r => r.symbol === sub.currency);
      const multiplier = rateObj ? rateObj.rate : 1;
      return sum + (sub.balance * multiplier);
    }, 0);
  }, [subAccounts, exchangeRates]);

  const renderActiveTab = () => {
    switch (currentTab) {
      case 'plan-bdr':
        return (
          <PlanBDRView 
            categories={categories}
            projects={projects}
            budgets={budgets}
            setBudgets={setBudgets}
          />
        );
      case 'plan-calendar':
        return (
          <PlanCalendarView 
            transactions={transactions}
            subAccounts={subAccounts}
            categories={categories}
            projects={projects}
            budgets={budgets}
          />
        );
      case 'projects':
        return (
          <ProjectsView 
            projects={projects}
            setProjects={setProjects}
            projectGroups={projectGroups}
            setProjectGroups={setProjectGroups}
            transactions={transactions}
          />
        );
      case 'legal-entities':
        return (
          <LegalEntitiesView 
            entities={legalEntities}
            setEntities={setLegalEntities}
          />
        );
      case 'dashboard':
        return (
          <DashboardView 
            transactions={transactions} 
            selectedProject={selectedProject}
            setSelectedProject={setSelectedProject}
            projects={projects}
          />
        );
      case 'transactions':
        return (
          <TransactionsView 
            transactions={transactions} 
            setTransactions={setTransactions}
            subAccounts={subAccounts}
            setSubAccounts={setSubAccounts}
            categories={categories}
            setCategories={setCategories}
            projects={projects}
            setProjects={setProjects}
            legalEntities={legalEntities}
            setLegalEntities={setLegalEntities}
            accountTypes={accountTypes}
          />
        );
      case 'account-types':
        return (
          <AccountTypesView
            types={accountTypes}
            setTypes={setAccountTypes}
          />
        );
      case 'accounts':
        return (
          <AccountsView 
            subAccounts={subAccounts} 
            setSubAccounts={setSubAccounts} 
            legalEntities={legalEntities}
            accountTypes={accountTypes}
          />
        );
      case 'reports':
        return (
          <ReportsView 
            transactions={transactions} 
          />
        );
      case 'categories':
        return (
          <CategoriesView 
            categories={categories} 
            setCategories={setCategories} 
          />
        );
      case 'users':
        return (
          <UsersView 
            users={users} 
            setUsers={setUsers} 
          />
        );
      case 'settings':
        return (
          <SettingsView 
            exchangeRates={exchangeRates} 
            setExchangeRates={setExchangeRates} 
          />
        );
      default:
        return <div className="p-8 text-center text-slate-500">Вкладка находится в разработке</div>;
    }
  };

  if (authLoading || dbLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-zinc-950 text-zinc-100 font-sans">
        <Loader className="w-10 h-10 text-emerald-400 animate-spin mb-4" />
        <p className="text-sm text-zinc-400 font-mono tracking-widest uppercase">Загрузка данных...</p>
      </div>
    );
  }

  if (!currentUser) {
    return <Login />;
  }

  return (
    <div className="flex bg-zinc-50 min-h-screen font-sans overflow-x-hidden antialiased text-zinc-900">
      
      {/* Dynamic Navigation Sidebar */}
      <Sidebar 
        currentTab={currentTab} 
        setCurrentTab={setCurrentTab}
        userEmail={currentUser.email || "User"}
        onLogout={() => signOut(auth)}
      />

      {/* Main body content section wrapper */}
      <main className="flex-1 overflow-y-auto max-h-screen p-8 relative">
        {renderActiveTab()}

        {/* Global balance sub-accounts popover (details from screenshot 1 & requirements) */}
        {isBalancePopoverOpen && (
          <div className="absolute top-20 left-8 z-50 w-80 bg-zinc-900 text-zinc-100 border border-zinc-700 rounded-none p-5 shadow-xl transition-all">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-2 mb-3">
              <span className="font-bold text-xs uppercase text-zinc-400 tracking-widest font-mono">Группировка счетов</span>
              <button 
                onClick={() => setIsBalancePopoverOpen(false)}
                className="text-[10px] text-zinc-300 hover:text-white underline font-semibold"
              >
                Закрыть
              </button>
            </div>

            {/* Incomes & deposits sub-divisions */}
            <div className="space-y-4 text-xs font-sans">
              
              {/* Division 1: Unallocated */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-zinc-400 font-semibold uppercase tracking-wider text-[10px]">
                  <span className="flex items-center gap-1">🟢 Нераспределенные кассы</span>
                  <span className="font-mono">{formatCurrency(subAccounts.filter(s => s.id !== '10').reduce((sum, s) => {
                    const mult = s.currency === '$' ? 452.40 : 1;
                    return sum + (s.balance * mult);
                  }, 0))}</span>
                </div>
                <div className="bg-zinc-950 p-2.5 rounded-none text-[11px] divide-y divide-zinc-800 border border-zinc-800">
                  {subAccounts.filter(s => s.id !== '10').slice(0, 5).map((sub) => (
                    <div key={sub.id} className="py-1 flex justify-between">
                      <span className="text-zinc-400 truncate max-w-[150px]">{sub.name}</span>
                      <span className="font-mono text-zinc-200 font-medium">{formatCurrency(sub.balance, sub.currency)}</span>
                    </div>
                  ))}
                  <div className="pt-1.5 text-center text-[9px] text-zinc-400">Показаны 5 крупнейших кошельков из {subAccounts.length - 1}...</div>
                </div>
              </div>

              {/* Division 2: Deposits */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-zinc-400 font-semibold uppercase tracking-wider text-[10px]">
                  <span className="flex items-center gap-1">🔑 Депозиты и Резервы</span>
                  <span className="font-mono">5 163 041 ₸</span>
                </div>
                <div className="bg-zinc-950 p-2.5 rounded-none text-[11px] divide-y divide-zinc-800 border border-zinc-800">
                  <div className="py-1 flex justify-between">
                    <span className="text-zinc-400">Депозит Kaspi</span>
                    <span className="font-mono text-zinc-200 font-medium">5 163 041 ₸</span>
                  </div>
                </div>
              </div>

              {/* Summary line */}
              <div className="p-3 bg-zinc-950 rounded-none flex items-center justify-between text-[11px] uppercase tracking-widest border border-zinc-700 text-zinc-300">
                <span className="font-bold">Всего к распределению:</span>
                <span className="font-mono font-bold text-white">{formatCurrency(netCorporateBalance)}</span>
              </div>

            </div>
          </div>
        )}
      </main>

    </div>
  );
}

