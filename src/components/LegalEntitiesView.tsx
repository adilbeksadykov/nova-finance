import React, { useState } from 'react';
import { Plus, Trash2, Edit2, Search, Check, X } from 'lucide-react';
import { LegalEntity } from '../types';

interface LegalEntitiesViewProps {
  entities: LegalEntity[];
  setEntities: React.Dispatch<React.SetStateAction<LegalEntity[]>>;
}

export default function LegalEntitiesView({ entities, setEntities }: LegalEntitiesViewProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingEntity, setEditingEntity] = useState<LegalEntity | null>(null);
  const [label, setLabel] = useState('');
  const [code, setCode] = useState('');
  const [inn, setInn] = useState('');

  const filtered = entities.filter(e => e.label.toLowerCase().includes(searchTerm.toLowerCase()));

  const handleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleDeleteParams = () => {
    setEntities(prev => prev.filter(e => !selectedIds.has(e.id)));
    setSelectedIds(new Set());
  };

  const handleOpenAdd = () => {
    setLabel('');
    setCode('');
    setInn('');
    setEditingEntity(null);
    setIsAddOpen(true);
  };

  const handleOpenEdit = (e: LegalEntity) => {
    setEditingEntity(e);
    setLabel(e.label);
    setCode(e.code);
    setInn(e.inn);
    setIsAddOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!label) return;

    if (editingEntity) {
      setEntities(prev => prev.map(x => x.id === editingEntity.id ? { ...x, label, code, inn } : x));
    } else {
      setEntities(prev => [...prev, {
        id: `le-${Date.now()}`,
        label,
        code,
        inn
      }]);
    }
    setIsAddOpen(false);
    setEditingEntity(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-8 bg-white border border-zinc-200 rounded-none gap-4">
        <div>
          <h1 className="text-2xl font-serif italic text-zinc-900 tracking-tight flex items-center gap-3">
             Мои юрлица
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleOpenAdd} className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 text-[11px] font-bold uppercase tracking-wider transition-colors">
            Создать
          </button>
        </div>
      </div>

      <div className="bg-white border border-zinc-200 overflow-hidden min-h-[400px]">
        {selectedIds.size > 0 ? (
          <div className="bg-zinc-50 border-b border-zinc-200 p-3 flex items-center gap-4 text-xs">
            <span className="font-bold text-zinc-700 ml-4">Выбран: {selectedIds.size}</span>
            <button className="text-zinc-500 hover:text-zinc-800 flex items-center gap-1">
              <span className="text-[10px] uppercase font-bold tracking-wider">В архив</span>
            </button>
            <button onClick={handleDeleteParams} className="text-red-500 hover:text-red-700 flex items-center gap-1">
              <Trash2 size={13} />
              <span className="text-[10px] uppercase font-bold tracking-wider">Удалить</span>
            </button>
          </div>
        ) : (
          <div className="bg-white border-b border-zinc-200 p-3 flex justify-end">
            <div className="relative">
              <input
                type="text"
                placeholder="Поиск по названию"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-64 text-[11px] bg-white border border-zinc-200 rounded-none py-1.5 px-3 text-zinc-700 font-mono outline-none"
              />
              <Search size={12} className="absolute right-3 top-2 text-zinc-400" />
            </div>
          </div>
        )}

        <table className="w-full text-left text-xs">
          <tbody className="divide-y divide-zinc-100">
            {filtered.map(e => (
              <tr key={e.id} className="hover:bg-zinc-50 transition-colors">
                <td className="p-4 w-12 text-center">
                  <button 
                    onClick={() => handleSelect(e.id)}
                    className={`w-4 h-4 border flex items-center justify-center rounded-sm ${selectedIds.has(e.id) ? 'bg-teal-600 border-teal-600 text-white' : 'border-zinc-300'}`}
                  >
                    {selectedIds.has(e.id) && <Check size={12} />}
                  </button>
                </td>
                <td className="p-4 font-medium text-zinc-800">{e.label}</td>
                <td className="p-4 text-zinc-500">{e.code}</td>
                <td className="p-4 font-mono text-zinc-500">{e.inn}</td>
                <td className="p-4 text-center text-zinc-400 w-24">
                  <div className="flex gap-2 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => handleOpenEdit(e)} className="hover:text-zinc-800 transition-colors">
                      <Edit2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                 <td colSpan={5} className="p-8 text-center text-zinc-500 italic">Нет данных</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="bg-zinc-50 p-4 shrink-0 text-xs text-zinc-500 font-mono">
        {filtered.length} юрлиц
      </div>

      {/* DIALOG SHEET: ADD / EDIT ACCOUNT TYPE */}
      {isAddOpen && (
        <div className="fixed inset-0 bg-zinc-950/70 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-none overflow-hidden shadow-xl border border-zinc-350">
            <div className="p-6 border-b border-zinc-200 flex items-center justify-between bg-zinc-900 text-white">
              <h3 className="font-serif italic font-bold text-lg">{editingEntity ? 'Редактировать юрлицо' : 'Новое юрлицо'}</h3>
              <button 
                onClick={() => { setIsAddOpen(false); setEditingEntity(null); }} 
                className="text-zinc-400 hover:text-white transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-5">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Название (Label)</label>
                <input
                  type="text"
                  placeholder="Например: ТОО NOVA CAMPS"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  required
                  className="w-full text-xs border border-zinc-200 rounded-none p-2.5 text-zinc-800 bg-zinc-50 focus:outline-none focus:bg-white focus:border-zinc-800 font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Код (Code)</label>
                <input
                  type="text"
                  placeholder="Например: TOO NOVA CAMPS"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="w-full text-xs border border-zinc-200 rounded-none p-2.5 text-zinc-800 bg-zinc-50 focus:outline-none focus:bg-white focus:border-zinc-800 font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">БИН/ИИН</label>
                <input
                  type="text"
                  placeholder="123456789012"
                  value={inn}
                  onChange={(e) => setInn(e.target.value)}
                  className="w-full text-xs border border-zinc-200 rounded-none p-2.5 text-zinc-800 bg-zinc-50 focus:outline-none focus:bg-white focus:border-zinc-800 font-mono"
                />
              </div>

              <div className="flex gap-2 pt-4 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => { setIsAddOpen(false); setEditingEntity(null); }}
                  className="flex-1 bg-zinc-100 hover:bg-zinc-200 text-[11px] font-bold text-zinc-650 uppercase tracking-wider py-3 rounded-none transition-colors"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-teal-600 hover:bg-teal-700 text-[11px] font-bold text-white uppercase tracking-wider py-3 rounded-none transition-colors"
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
