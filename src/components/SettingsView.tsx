import React, { useState } from 'react';
import { 
  Building2, 
  Coins, 
  History, 
  Save, 
  Zap, 
  Check
} from 'lucide-react';
import { ExchangeRate } from '../types';

interface SettingsViewProps {
  exchangeRates: ExchangeRate[];
  setExchangeRates: React.Dispatch<React.SetStateAction<ExchangeRate[]>>;
}

export default function SettingsView({ exchangeRates, setExchangeRates }: SettingsViewProps) {
  const [businessName, setBusinessName] = useState('NOVA Education');
  const [primaryCurrency, setPrimaryCurrency] = useState('₸ KZT');
  const [exchangeRateEdit, setExchangeRateEdit] = useState<string | null>(null);
  const [tempRate, setTempRate] = useState('');

  // Settings mock fields
  const [kaspiSynced, setKaspiSynced] = useState(true);
  const [halykSynced, setHalykSynced] = useState(false);
  
  const handleSaveGeneral = (e: React.FormEvent) => {
    e.preventDefault();
    alert('Системные настройки успешно обновлены!');
  };

  const handleEditRate = (rateId: string, currentRate: number) => {
    setExchangeRateEdit(rateId);
    setTempRate(currentRate.toString());
  };

  const handleSaveRate = (rateId: string) => {
    if (!tempRate || isNaN(Number(tempRate))) return;

    setExchangeRates(prev => prev.map(r => 
      r.id === rateId ? { ...r, rate: Number(tempRate) } : r
    ));
    setExchangeRateEdit(null);
  };

  return (
    <div className="space-y-6">
      
      {/* Settings title header */}
      <div className="p-8 bg-white rounded-none border border-zinc-200 shadow-none">
        <h1 className="text-2xl font-serif italic text-zinc-900 tracking-tight flex items-center gap-3">
          Настройки платформы и Интеграции 
          <span className="text-[10px] bg-zinc-100 border border-zinc-250 text-zinc-600 px-2.5 py-0.5 rounded-none font-mono uppercase font-bold tracking-wider">
            Админ-Панель
          </span>
        </h1>
        <p className="text-xs text-zinc-500 mt-2 font-sans">Управляйте курсами мировых валют, параметрами выгрузки и прямыми банковскими API-шлюзами</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        
        {/* FIRST COLUMN: General corporate information */}
        <div className="space-y-6 lg:col-span-2">
          
          {/* General business form */}
          <div className="bg-white p-6 rounded-none border border-zinc-200 shadow-none space-y-5">
            <h3 className="font-bold text-zinc-900 text-xs uppercase tracking-[0.15em] border-b border-zinc-200 pb-3 flex items-center gap-2">
              <Building2 size={14} className="text-zinc-650" />
              <span>Главная конфигурация</span>
            </h3>

            <form onSubmit={handleSaveGeneral} className="space-y-5 text-xs text-zinc-750">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block">Название компании</label>
                  <input
                    type="text"
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    className="w-full text-xs border border-zinc-200 rounded-none p-2.5 text-zinc-800 bg-zinc-50 focus:outline-none focus:border-zinc-805 focus:bg-white transition-all font-sans"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block">Основная валюта учета</label>
                  <select
                    value={primaryCurrency}
                    onChange={(e) => setPrimaryCurrency(e.target.value)}
                    className="w-full border border-zinc-200 rounded-none p-2.5 text-zinc-800 bg-zinc-50 outline-none focus:border-zinc-805"
                  >
                    <option value="₸ KZT">Казахстанский тенге (₸ KZT)</option>
                    <option value="$ USD">Доллар США ($ USD)</option>
                    <option value="€ EUR">Евро (€ EUR)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block">Формат исчисления дат</label>
                  <select className="w-full border border-zinc-200 rounded-none p-2.5 text-zinc-800 bg-zinc-50 outline-none focus:border-zinc-805">
                    <option>DD-MM-YYYY (ДД-ММ-ГГГГ)</option>
                    <option>YYYY-MM-DD (ГГГГ-ММ-ДД)</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block">Авто-подтверждение проводок</label>
                  <select className="w-full border border-zinc-200 rounded-none p-2.5 text-zinc-800 bg-zinc-50 outline-none focus:border-zinc-805">
                    <option>Подтверждать новые импорты из Каспи сразу</option>
                    <option>Помещать в статус &quot;Ожидает разбора&quot;</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                className="flex items-center gap-1.5 bg-zinc-900 hover:bg-zinc-850 text-white rounded-none px-5 py-3 text-[11px] font-bold uppercase tracking-widest transition-colors cursor-pointer"
              >
                <Save size={13} />
                <span>Записать изменения</span>
              </button>

            </form>
          </div>

          {/* Dynamic Sync Gateways section */}
          <div className="bg-white p-6 rounded-none border border-zinc-200 shadow-none space-y-5">
            <h3 className="font-bold text-zinc-905 text-xs uppercase tracking-[0.16em] border-b border-zinc-200 pb-3 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Zap size={14} className="text-zinc-600" />
                <span>Прямые банковские API-шлюзы</span>
              </span>
              <span className="text-[10px] bg-zinc-100 border border-zinc-200 text-zinc-700 px-2.5 py-0.5 rounded-none font-mono font-bold tracking-wider">PRO CONNECT</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-sans text-xs">
              
              {/* Kaspi Business API Card */}
              <div className="border border-zinc-200 p-4 rounded-none space-y-3 bg-zinc-50 hover:bg-white hover:border-zinc-800 transition-all flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-center border-b border-zinc-200 pb-2">
                    <span className="font-bold text-zinc-900 font-mono text-xs uppercase tracking-wide">Kaspi Gateway</span>
                    <span className={`h-2 w-2 rounded-none ${kaspiSynced ? 'bg-zinc-800' : 'bg-zinc-300'}`}></span>
                  </div>
                  <p className="text-[11px] text-zinc-500 leading-relaxed mt-2">Ежечасно ПланФакт скачивает официальные банковские выписки по ИП AQLDY и TOO NOVA EDU</p>
                </div>
                
                <div className="flex justify-between items-center pt-2.5 border-t border-zinc-150">
                  <span className="text-[10px] font-mono uppercase tracking-wider font-bold text-zinc-600">{kaspiSynced ? 'Подключен' : 'Отключен'}</span>
                  <button 
                    onClick={() => setKaspiSynced(!kaspiSynced)}
                    className="text-[10px] font-bold uppercase tracking-wider text-zinc-900 hover:underline"
                  >
                    {kaspiSynced ? 'Деактивировать' : 'Активировать'}
                  </button>
                </div>
              </div>

              {/* Halyk Business Connector Card */}
              <div className="border border-zinc-200 p-4 rounded-none space-y-3 bg-zinc-50 hover:bg-white hover:border-zinc-800 transition-all flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-center border-b border-zinc-200 pb-2">
                    <span className="font-bold text-zinc-900 font-mono text-xs uppercase tracking-wide">Halyk Connector</span>
                    <span className={`h-2 w-2 rounded-none ${halykSynced ? 'bg-zinc-800' : 'bg-zinc-300'}`}></span>
                  </div>
                  <p className="text-[11px] text-zinc-500 leading-relaxed mt-2">Прямое подключение к Халык банку по токену авторизации Кабинета Клиента</p>
                </div>

                <div className="flex justify-between items-center pt-2.5 border-t border-zinc-150">
                  <span className="text-[10px] font-mono uppercase tracking-wider font-bold text-zinc-400">{halykSynced ? 'Активен' : 'Соединение отсутствует'}</span>
                  <button 
                    onClick={() => {
                      if (!halykSynced) {
                        const token = prompt('Введите авторизационный API-токен Halyk Business:');
                        if (token) setHalykSynced(true);
                      } else {
                        setHalykSynced(false);
                      }
                    }}
                    className="text-[10px] font-bold uppercase tracking-wider text-zinc-900 hover:underline"
                  >
                    {halykSynced ? 'Деактивировать' : 'Интегрировать'}
                  </button>
                </div>
              </div>

            </div>
          </div>

        </div>

        {/* RIGHT COLUMN: Exchange rates and Logs audit */}
        <div className="space-y-6">
          
          {/* Dynamic Exchange rates list */}
          <div className="bg-white p-6 rounded-none border border-zinc-200 shadow-none space-y-4">
            <div className="border-b border-zinc-200 pb-2.5">
              <h3 className="font-bold text-zinc-900 text-xs uppercase tracking-[0.15em] flex items-center gap-2">
                <Coins size={14} className="text-zinc-650" />
                <span>Курсы валют к KZT</span>
              </h3>
              <p className="text-[10px] text-zinc-400 mt-1 uppercase tracking-wide">Используются при автоматических обменах USD/EUR</p>
            </div>

            <div className="divide-y divide-zinc-200 text-xs font-mono">
              {exchangeRates.map((r) => {
                const isEditing = exchangeRateEdit === r.id;
                return (
                  <div key={r.id} className="py-3 flex items-center justify-between">
                    <div className="flex items-center gap-2 font-sans font-bold text-zinc-850">
                      <span className="w-5 text-center text-xs font-bold text-zinc-400">{r.symbol}</span>
                      <span className="text-[11px] uppercase tracking-wider">{r.code}</span>
                    </div>

                    {isEditing ? (
                      <div className="flex items-center gap-1">
                        <input
                          type="text"
                          value={tempRate}
                          onChange={(e) => setTempRate(e.target.value)}
                          className="w-16 text-center border border-zinc-200 rounded-none px-1.5 py-0.5 bg-zinc-50 outline-none"
                        />
                        <button 
                          onClick={() => handleSaveRate(r.id)}
                          className="p-1 bg-zinc-900 text-white hover:bg-zinc-800 transition"
                        >
                          <Check size={11} className="stroke-[3px]" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-zinc-900">{r.rate.toFixed(4)} ₸</span>
                        {r.code !== 'KZT' && (
                          <button
                            onClick={() => handleEditRate(r.id, r.rate)}
                            className="text-[10px] text-zinc-400 hover:text-zinc-900 hover:underline font-sans uppercase tracking-wider font-bold"
                          >
                            ред.
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Activity Security actions logs trail */}
          <div className="bg-white p-6 rounded-none border border-zinc-200 shadow-none space-y-4">
            <h3 className="font-bold text-zinc-900 text-xs uppercase tracking-[0.15em] border-b border-zinc-200 pb-2.5 flex items-center gap-2">
              <History size={14} className="text-zinc-600" />
              <span>Логи действий (Аудит)</span>
            </h3>

            <div className="space-y-3 max-h-56 overflow-y-auto text-[10px] pr-1 leading-normal font-sans">
              {[
                { time: '30.05.2026 12:07', action: 'Проведен импорт выписки Каспи банка (.txt)', user: 'A. Садыков' },
                { time: '29.05.2026 17:42', action: 'Бухгалтер ПФ нажал пересчет P&L (ОПУ)', user: 'N. Assauov' },
                { time: '29.05.2026 15:10', action: 'Добалена проводка №842 в кошелек Halyk', user: 'R. Almaz' },
                { time: '28.05.2026 09:12', action: 'Поменялись права роли u3 на "Директор филиала"', user: 'A. Садыков' },
              ].map((log, idx) => (
                <div key={idx} className="p-3 border border-zinc-200 rounded-none bg-zinc-50 space-y-1.5 font-mono">
                  <div className="flex justify-between text-[9px] text-zinc-400 uppercase tracking-widest font-semibold">
                    <span>{log.time}</span>
                    <span className="text-zinc-500 font-sans">{log.user}</span>
                  </div>
                  <p className="text-zinc-800 text-[11px] font-sans leading-relaxed">{log.action}</p>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
