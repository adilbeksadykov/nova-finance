import React, { useState } from 'react';
import { Trash2, Edit2, Search } from 'lucide-react';

interface AccountTypesViewProps {
  types: string[];
  setTypes: React.Dispatch<React.SetStateAction<string[]>>;
}

export default function AccountTypesView({ types, setTypes }: AccountTypesViewProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [name, setName] = useState('');

  const filtered = types.filter(t => t.toLowerCase().includes(searchTerm.toLowerCase()));

  const handleOpenAdd = () => {
    setName('');
    setEditingIndex(null);
    setIsAddOpen(true);
  };

  const handleOpenEdit = (t: string, idx: number) => {
    setName(t);
    setEditingIndex(idx);
    setIsAddOpen(true);
  };

  const handleDelete = (t: string) => {
    setTypes(prev => prev.filter(x => x !== t));
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;
    
    if (editingIndex !== null) {
      setTypes(prev => prev.map((x, i) => i === editingIndex ? name : x));
    } else {
      setTypes(prev => [...prev, name]);
    }
    setIsAddOpen(false);
    setEditingIndex(null);
    setName('');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-8 bg-white border border-zinc-200 rounded-none gap-4">
        <div>
          <h1 className="text-2xl font-serif italic text-zinc-900 tracking-tight flex items-center gap-3">
             Типы счетов / Кошельков
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleOpenAdd} className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 text-[11px] font-bold uppercase tracking-wider transition-colors">
            Создать
          </button>
        </div>
      </div>

      <div className="bg-white border border-zinc-200 overflow-hidden min-h-[400px]">
        <div className="bg-white border-b border-zinc-200 p-3 flex justify-end">
          <div className="relative">
            <input
              type="text"
              placeholder="Поиск..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-64 text-[11px] bg-white border border-zinc-200 rounded-none py-1.5 px-3 text-zinc-700 font-mono outline-none focus:border-zinc-800"
            />
            <Search size={12} className="absolute right-3 top-2 text-zinc-400" />
          </div>
        </div>

        <table className="w-full text-left text-xs">
          <tbody className="divide-y divide-zinc-100">
            {filtered.map((t, idx) => (
              <tr key={idx} className="hover:bg-zinc-50 transition-colors group">
                <td className="p-4 font-medium text-zinc-800">{t}</td>
                <td className="p-4 text-center text-zinc-400 w-24">
                  <div className="flex gap-2 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => handleOpenEdit(t, types.indexOf(t))} className="hover:text-zinc-800 transition-colors">
                      <Edit2 size={14} />
                    </button>
                    <button onClick={() => handleDelete(t)} className="hover:text-red-500 transition-colors">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                 <td colSpan={2} className="p-8 text-center text-zinc-500 italic">Нет данных</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* DIALOG SHEET: ADD / EDIT ACCOUNT TYPE */}
      {isAddOpen && (
        <div className="fixed inset-0 bg-zinc-950/70 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-none overflow-hidden shadow-xl border border-zinc-350">
            <div className="p-6 border-b border-zinc-200 flex items-center justify-between bg-zinc-900 text-white">
              <h3 className="font-serif italic font-bold text-lg">{editingIndex !== null ? 'Редактировать тип' : 'Новый тип счета'}</h3>
              <button 
                onClick={() => { setIsAddOpen(false); setEditingIndex(null); }} 
                className="text-zinc-400 hover:text-white transition-colors"
              >
                <Trash2 size={16} />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-5">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Название типа</label>
                <input
                  type="text"
                  placeholder="Например: Наличные, Карта..."
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full text-xs border border-zinc-200 rounded-none p-2.5 text-zinc-800 bg-zinc-50 focus:outline-none focus:bg-white focus:border-zinc-800 font-mono"
                />
              </div>

              <div className="flex gap-2 pt-4 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => { setIsAddOpen(false); setEditingIndex(null); }}
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
