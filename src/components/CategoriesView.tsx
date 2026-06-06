import React, { useState } from 'react';
import { Edit2, Trash2 } from 'lucide-react';
import { ArticleCategory } from '../types';

interface CategoriesViewProps {
  categories: ArticleCategory[];
  setCategories: React.Dispatch<React.SetStateAction<ArticleCategory[]>>;
}

export default function CategoriesView({ categories, setCategories }: CategoriesViewProps) {
  const [activeSegment, setActiveSegment] = useState<'income' | 'expense' | 'asset' | 'liability' | 'equity'>('income');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<ArticleCategory | null>(null);
  const [newCatType, setNewCatType] = useState<string>('income');
  
  // New article state
  const [newName, setNewName] = useState('');
  const [newParent, setNewParent] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newBudgetLimit, setNewBudgetLimit] = useState('');

  const handleOpenAdd = () => {
    setNewName('');
    setNewParent('');
    setNewDescription('');
    setNewBudgetLimit('');
    setNewCatType(activeSegment);
    setEditingCategory(null);
    setIsAddOpen(true);
  };

  const handleOpenEdit = (c: ArticleCategory) => {
    setNewName(c.name);
    setNewCatType(c.type);
    setNewParent(c.parentId || '');
    setNewBudgetLimit(c.budgetLimit ? c.budgetLimit.toString() : '');
    setEditingCategory(c);
    setIsAddOpen(true);
  };

  const handleDelete = (id: string) => {
    setCategories(prev => prev.filter(c => c.id !== id));
  };

  const segments = [
    { id: 'income', label: 'Доходы' },
    { id: 'expense', label: 'Расходы' },
    { id: 'asset', label: 'Активы' },
    { id: 'liability', label: 'Обязательства' },
    { id: 'equity', label: 'Капитал' },
  ];

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName) return;
    
    if (editingCategory) {
      setCategories(prev => prev.map(c => c.id === editingCategory.id ? {
        ...c,
        name: newName,
        type: newCatType,
        parentId: newParent || null,
        budgetLimit: newBudgetLimit ? Number(newBudgetLimit) : undefined
      } : c));
    } else {
      setCategories(prev => [...prev, {
        id: `cat-${Date.now()}`,
        name: newName,
        type: newCatType,
        parentId: newParent || null,
        budgetLimit: newBudgetLimit ? Number(newBudgetLimit) : undefined
      }]);
    }
    
    setIsAddOpen(false);
    setEditingCategory(null);
    setNewName('');
    setNewParent('');
    setNewDescription('');
    setNewBudgetLimit('');
  };

  const getFilteredCategories = () => {
    return categories.filter(c => c.type === activeSegment) || [];
  };

  const getPotentialParents = () => {
    const list: { id: string; name: string; level: number }[] = [];
    const filtered = categories.filter(c => c.type === newCatType && c.id !== editingCategory?.id);
    
    const roots = filtered.filter(c => !c.parentId);
    roots.forEach(root => {
      list.push({ id: root.id, name: root.name, level: 1 });
      
      const children = filtered.filter(c => c.parentId === root.id);
      children.forEach(child => {
        list.push({ id: child.id, name: `— ${child.name}`, level: 2 });
      });
    });
    return list;
  };

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white border border-zinc-200 p-8 rounded-none gap-4">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-serif italic text-zinc-900 tracking-tight">Учетные статьи</h1>
          <button 
            onClick={handleOpenAdd}
            className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 text-[11px] font-bold tracking-wider transition-colors"
          >
            Создать
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-zinc-200 bg-white">
        {segments.map(seg => (
          <button
            key={seg.id}
            onClick={() => setActiveSegment(seg.id as any)}
            className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeSegment === seg.id 
                ? 'border-teal-600 text-teal-600' 
                : 'border-transparent text-zinc-500 hover:text-zinc-800 hover:border-zinc-300'
            }`}
          >
            {seg.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        {/* LEFT COLUMN: Categories list */}
        <div className="space-y-2">
          {getFilteredCategories().length === 0 ? (
            <div className="bg-white p-4 border border-zinc-200 text-sm italic text-zinc-400">
              Нет добавленных статей
            </div>
          ) : (
            getFilteredCategories().filter(c => !c.parentId).map((parentCat) => (
              <div key={parentCat.id} className="p-3 border border-zinc-200 bg-white mb-2">
                <div className="flex justify-between items-center group">
                  <span className="font-medium text-xs flex items-center gap-2">
                    <span className="border text-[10px] w-4 h-4 flex items-center justify-center">
                      {getFilteredCategories().some(c => c.parentId === parentCat.id) ? '-' : '•'}
                    </span>
                    {parentCat.name}
                  </span>
                  <div className="flex gap-2">
                    <button onClick={() => handleOpenEdit(parentCat)} className="text-zinc-400 hover:text-zinc-800 transition-colors opacity-0 group-hover:opacity-100">
                      <Edit2 size={14} />
                    </button>
                    <button onClick={() => handleDelete(parentCat.id)} className="text-zinc-400 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
                
                {getFilteredCategories().some(c => c.parentId === parentCat.id) && (
                  <div className="pl-6 mt-3 space-y-3">
                    {getFilteredCategories().filter(c => c.parentId === parentCat.id).map(childCat => (
                      <div key={childCat.id} className="space-y-2">
                        <div className="flex justify-between items-center p-2.5 border border-zinc-150 bg-zinc-50/50 group">
                          <span className="text-xs text-zinc-700">{childCat.name}</span>
                          <div className="flex gap-2">
                            <button onClick={() => handleOpenEdit(childCat)} className="text-zinc-400 hover:text-zinc-800 transition-colors opacity-0 group-hover:opacity-100">
                              <Edit2 size={14} />
                            </button>
                            <button onClick={() => handleDelete(childCat.id)} className="text-zinc-400 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100">
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                        
                        {/* Level 3: Sub-subcategories */}
                        {getFilteredCategories().some(c => c.parentId === childCat.id) && (
                          <div className="pl-6 space-y-1.5 border-l-2 border-zinc-100">
                            {getFilteredCategories().filter(c => c.parentId === childCat.id).map(subSubCat => (
                              <div key={subSubCat.id} className="flex justify-between items-center p-2 border border-zinc-100 bg-white group">
                                <span className="text-[11px] text-zinc-600 font-mono">• {subSubCat.name}</span>
                                <div className="flex gap-2">
                                  <button onClick={() => handleOpenEdit(subSubCat)} className="text-zinc-400 hover:text-zinc-800 transition-colors opacity-0 group-hover:opacity-100">
                                    <Edit2 size={12} />
                                  </button>
                                  <button onClick={() => handleDelete(subSubCat.id)} className="text-zinc-400 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100">
                                    <Trash2 size={12} />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* RIGHT COLUMN: Info Diagram */}
        <div className="bg-zinc-50/50 p-6 rounded-none space-y-6">
          <p className="text-sm font-medium text-zinc-700">Эта схема наглядно показывает, как статьи участвуют в формировании отчета Баланс</p>
          
          <div className="grid grid-cols-2 gap-6">
            
            <div className="space-y-6">
              <div className="border border-teal-200 bg-white p-4">
                <h3 className="font-bold text-center text-sm mb-4">Движение денег</h3>
                <div className="space-y-4">
                  <div>
                    <div className="text-xs font-bold mb-1">Операционный поток</div>
                    <div className="text-[11px] text-zinc-600 space-y-1">
                      <div>Поступления</div>
                      <div className="border-b border-zinc-200 pb-1">Выплаты</div>
                    </div>
                  </div>
                  <div>
                    <div className="text-xs font-bold mb-1">Инвестиционный поток</div>
                    <div className="text-[11px] text-zinc-600 space-y-1">
                      <div>Поступления</div>
                      <div className="border-b border-zinc-200 pb-1">Выплаты</div>
                    </div>
                  </div>
                  <div>
                    <div className="text-xs font-bold mb-1">Финансовый поток</div>
                    <div className="text-[11px] text-zinc-600 space-y-1">
                      <div>Поступления</div>
                      <div className="border-b border-zinc-200 pb-1">Выплаты</div>
                    </div>
                  </div>
                  <div className="text-xs font-bold uppercase border-t border-zinc-300 pt-2">
                    ОБЩИЙ ДЕНЕЖНЫЙ ПОТОК
                  </div>
                </div>
              </div>

              <div className="border border-teal-200 bg-white p-4">
                <h3 className="font-bold text-center text-sm mb-4">Прибыли и убытки</h3>
                <div className="space-y-3 relative">
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <div className="text-xs font-bold">Доходы</div>
                      <div className="bg-zinc-200 text-zinc-600 text-[10px] px-1 font-mono">О</div>
                    </div>
                    <div className="text-[11px] text-zinc-600 space-y-1 pl-2">
                      <div>Продажа товаров</div>
                      <div>Оказание услуг</div>
                      <div>Прочие доходы</div>
                    </div>
                  </div>
                  
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <div className="text-xs font-bold flex items-center gap-1"><span className="text-red-500 font-normal text-[10px]">минус</span> Расходы</div>
                      <div className="bg-zinc-200 text-zinc-600 text-[10px] px-1 font-mono">О</div>
                    </div>
                    <div className="text-[11px] text-zinc-600 space-y-1 pl-2">
                      <div>Производственный персонал</div>
                      <div>Покупка товаров</div>
                      <div>Административный персонал</div>
                      <div>Аренда</div>
                      <div>Прочие расходы</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="border border-teal-200 bg-white p-4">
               <h3 className="font-bold text-center text-sm mb-4">Баланс</h3>
               <div className="space-y-3">
                 <div>
                    <div className="flex justify-between items-center mb-1">
                      <div className="text-xs font-bold">Оборотные активы</div>
                      <div className="bg-zinc-200 text-zinc-600 text-[10px] px-1 font-mono">О</div>
                    </div>
                    <div className="text-[11px] text-zinc-600 space-y-1 pl-2">
                      <div>Дебиторская задолженность</div>
                      <div>Денежные средства</div>
                      <div>Запасы</div>
                      <div>Другие оборотные</div>
                      <div className="pl-2">Залоговые платежи</div>
                      <div className="pl-2">Выданные займы (до 1 года)</div>
                    </div>
                 </div>

                 <div>
                    <div className="flex justify-between items-center mb-1">
                      <div className="text-xs font-bold">Внеоборотные активы</div>
                      <div className="bg-slate-700 text-white text-[10px] px-1 font-mono">И</div>
                    </div>
                    <div className="text-[11px] text-zinc-600 space-y-1 pl-2">
                      <div>Основные средства</div>
                      <div className="pl-2">Оборудование</div>
                      <div className="pl-2">Транспорт</div>
                      <div>Другие внеоборотные</div>
                      <div className="pl-2">Выданные займы (от 1 года)</div>
                      <div className="pl-2">Финансовые вложения</div>
                      <div>Нематериальные активы</div>
                    </div>
                 </div>

                 <div className="text-xs font-bold uppercase border-t border-zinc-200 pt-3 pb-2 mt-2">
                    ИТОГО АКТИВЫ
                 </div>

                 <div>
                    <div className="flex justify-between items-center mb-1">
                      <div className="text-xs font-bold">Краткосрочные обязательства</div>
                      <div className="bg-zinc-200 text-zinc-600 text-[10px] px-1 font-mono">О</div>
                    </div>
                    <div className="text-[11px] text-zinc-600 space-y-1 pl-2">
                      <div>Кредиторская задолженность</div>
                      <div>Другие краткосрочные</div>
                      <div className="pl-2">Платежи третьим лицам</div>
                      <div className="pl-2">Полученные займы (до 1 года)</div>
                    </div>
                 </div>

                 <div>
                    <div className="flex justify-between items-center mb-1">
                      <div className="text-xs font-bold">Долгосрочные обязательства</div>
                      <div className="bg-teal-600 text-white text-[10px] px-1 font-mono">Ф</div>
                    </div>
                    <div className="text-[11px] text-zinc-600 space-y-1 pl-2">
                      <div>Кредиты</div>
                      <div>Другие долгосрочные</div>
                      <div className="pl-2">Полученные займы (от 1 года)</div>
                    </div>
                 </div>
               </div>
            </div>

          </div>
        </div>
      </div>

      {isAddOpen && (
        <div className="fixed inset-0 bg-zinc-900/40 z-50 flex justify-center p-4 pt-20">
          <div className="w-full max-w-lg bg-white shadow-xl h-fit">
            <div className="flex justify-between items-center p-6 border-b border-zinc-200">
              <h2 className="text-lg font-bold text-zinc-900">{editingCategory ? 'Редактирование' : 'Создание учетной статьи'}</h2>
              <button onClick={() => setIsAddOpen(false)} className="text-zinc-400 hover:text-zinc-700">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
              </button>
            </div>
            
            <form onSubmit={handleSave} className="p-0">
              
              <div className="flex text-xs text-center border-b border-zinc-200 px-6 pt-4">
                {segments.map(s => (
                   <div 
                    key={s.id}
                    onClick={() => setNewCatType(s.id as any)}
                    className={`flex-1 pb-3 text-sm cursor-pointer transition-colors ${newCatType === s.id ? 'border-b-2 border-teal-600 text-teal-600 font-medium' : 'text-zinc-500 hover:text-zinc-800'}`}>
                      {s.label}
                   </div>
                ))}
              </div>

              <div className="p-6 space-y-5">
                <div className="flex gap-4 items-center">
                  <label className="text-xs font-bold w-1/3 text-zinc-700">Название <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    value={newName}
                    onChange={e => setNewName(e.target.value)}
                    placeholder="Укажите название статьи"
                    className="flex-1 text-xs border border-zinc-300 p-2 outline-none focus:border-teal-600"
                    required
                  />
                </div>

                <div className="flex gap-4 items-center">
                  <label className="text-xs font-bold w-1/3 text-zinc-700">Относится к</label>
                  <select
                    value={newParent}
                    onChange={e => setNewParent(e.target.value)}
                    className="flex-1 text-xs border border-zinc-300 p-2 outline-none focus:border-teal-600 text-zinc-800 bg-white"
                  >
                    <option value="">Без родительской статьи (Уровень 1)</option>
                    {getPotentialParents().map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>

                <div className="flex gap-4 items-center">
                  <label className="text-xs font-bold w-1/3 text-zinc-700">Лимит бюджета</label>
                  <input
                    type="number"
                    value={newBudgetLimit}
                    onChange={e => setNewBudgetLimit(e.target.value)}
                    placeholder="Лимит на месяц в ₸"
                    className="flex-1 text-xs border border-zinc-300 p-2 outline-none focus:border-teal-600"
                  />
                </div>

                <div className="flex gap-4 items-start">
                  <label className="text-xs font-bold w-1/3 text-zinc-700 pt-2">Комментарий</label>
                  <textarea
                    value={newDescription}
                    onChange={e => setNewDescription(e.target.value)}
                    placeholder="Пояснение к статье"
                    className="flex-1 text-xs border border-zinc-300 p-2 outline-none focus:border-teal-600 h-20 resize-none"
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-4 border-t border-zinc-200 p-6 justify-end bg-zinc-50">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-teal-600 hover:text-teal-800 transition-colors"
                >
                  Отменить
                </button>
                <button
                  type="submit"
                  className="bg-teal-600 text-white px-4 py-2 text-xs font-bold transition-colors hover:bg-teal-700 uppercase tracking-wider"
                >
                  {editingCategory ? 'Сохранить' : 'Создать'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}
    </div>
  );
}
