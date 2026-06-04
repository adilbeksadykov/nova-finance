import React, { useState } from 'react';
import { 
  Plus, 
  Mail, 
  Shield, 
  Clock, 
  Trash2, 
  Search, 
  X,
  AlertTriangle
} from 'lucide-react';
import { TeamUser } from '../types';

interface UsersViewProps {
  users: TeamUser[];
  setUsers: React.Dispatch<React.SetStateAction<TeamUser[]>>;
}

export default function UsersView({ users, setUsers }: UsersViewProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<TeamUser | null>(null);

  // Invitation Form
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'Owner' | 'Manager' | 'Guest' | 'Administrator'>('Manager');
  const [position, setPosition] = useState('');

  const filteredUsers = users.filter(u => {
    const searchString = `${u.name} ${u.email} ${u.position} ${u.role}`.toLowerCase();
    return searchString.includes(searchTerm.toLowerCase());
  });

  const handleSendInvite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email) return;

    if (editingUser) {
      setUsers(prev => prev.map(u => 
        u.id === editingUser.id 
          ? { ...u, name, email, role, position }
          : u
      ));
      setEditingUser(null);
    } else {
      const newUser: TeamUser = {
        id: `user-${Date.now()}`,
        email,
        role,
        name,
        position: position || 'Сотрудник',
        status: 'Invited',
        dateCreated: new Date().toLocaleDateString('ru-RU')
      };
      setUsers(prev => [...prev, newUser]);
      setIsInviteOpen(false);
    }

    // Reset
    setName('');
    setEmail('');
    setRole('Manager');
    setPosition('');
  };

  const handleDeleteUser = (id: string, userMail: string) => {
    // Direct deletion since window.confirm is blocked in iframes
    setUsers(prev => prev.filter(u => u.id !== id));
  };

  const handleOpenEdit = (u: TeamUser) => {
    setEditingUser(u);
    setName(u.name);
    setEmail(u.email);
    setRole(u.role);
    setPosition(u.position);
    setIsInviteOpen(true);
  };

  return (
    <div className="space-y-6">
      
      {/* Title block */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-8 bg-white rounded-none border border-zinc-200 shadow-none gap-4">
        <div>
          <h1 className="text-2xl font-serif italic text-zinc-900 tracking-tight flex items-center gap-3">
            Команда и доступ к финансам
            <span className="text-[10px] bg-zinc-100 border border-zinc-250 text-zinc-600 px-2.5 py-0.5 rounded-none font-mono uppercase font-bold tracking-wider">
              Безопасность
            </span>
          </h1>
          <p className="text-xs text-zinc-500 mt-2 font-sans">Организуйте уровни просмотра для аудиторов, менеджеров проектов и директоров филиалов</p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto self-stretch sm:self-auto justify-between sm:justify-start">
          <div className="relative">
            <input
              type="text"
              placeholder="Имя, заголовок, роль..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full sm:w-56 text-xs bg-zinc-50 border border-zinc-200 rounded-none py-2.5 pl-8 pr-3 text-zinc-800 focus:outline-none focus:bg-white focus:border-zinc-805 font-mono"
            />
            <Search size={13} className="text-zinc-400 absolute left-2.5 top-3" />
          </div>

          <button
            onClick={() => {
              setEditingUser(null);
              setName('');
              setEmail('');
              setRole('Manager');
              setPosition('');
              setIsInviteOpen(true);
            }}
            className="flex items-center justify-center gap-1.5 bg-zinc-900 hover:bg-zinc-850 text-white px-4 py-3 rounded-none text-[11px] font-bold uppercase tracking-wider transition-colors cursor-pointer"
          >
            <Plus size={12} />
            <span>Новый сотрудник</span>
          </button>
        </div>
      </div>

      {/* Grid List */}
      <div className="bg-white rounded-none border border-zinc-200 shadow-none overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-zinc-50 border-b border-zinc-200 text-[9px] font-bold text-zinc-400 uppercase tracking-[0.15em]">
                <th className="p-4 pl-6">Пользователь / Почта</th>
                <th className="p-4">Должность</th>
                <th className="p-4">Роль прав</th>
                <th className="p-4">Статус</th>
                <th className="p-4">Последняя активность</th>
                <th className="p-4">Регистрация</th>
                <th className="p-4 text-center">Действия</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 text-zinc-600">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-zinc-450 italic font-mono">Сотрудники с такими именами не найдены</td>
                </tr>
              ) : (
                filteredUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-zinc-50/50 transition-colors">
                    
                    {/* User profile identifier block */}
                    <td className="p-4 pl-6 flex items-center gap-3">
                      <div className="h-8 w-8 rounded-none bg-zinc-900 border border-zinc-950 text-white font-mono font-bold flex items-center justify-center text-xs shrink-0 select-none">
                        {u.name.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-bold text-zinc-900 leading-tight font-mono">{u.name}</div>
                        <div className="text-[10px] text-zinc-400 mt-0.5 flex items-center gap-1">
                          <Mail size={10} />
                          <span>{u.email}</span>
                        </div>
                      </div>
                    </td>

                    {/* Position */}
                    <td className="p-4 font-medium text-zinc-800">
                      {u.position}
                    </td>

                    {/* Role badge */}
                    <td className="p-4">
                      <span className={`px-2 py-0.5 rounded-none text-[9px] font-bold uppercase tracking-wider inline-flex items-center gap-1.5 border ${
                        u.role === 'Owner' ? 'bg-zinc-100 text-zinc-800 border-zinc-305' :
                        u.role === 'Administrator' ? 'bg-zinc-100 text-zinc-800 border-zinc-305' :
                        u.role === 'Manager' ? 'bg-zinc-50 text-zinc-600 border-zinc-200' :
                        'bg-zinc-50 text-zinc-400 border-dashed border-zinc-200'
                      }`}>
                        <Shield size={9} />
                        <span>
                          {u.role === 'Owner' ? 'Владелец' :
                           u.role === 'Administrator' ? 'Бухгалтер ПФ' :
                           u.role === 'Manager' ? 'Директор филиала' : 'Наблюдатель'}
                        </span>
                      </span>
                    </td>

                    {/* Invitation Status */}
                    <td className="p-4">
                      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 border text-[9px] font-bold uppercase tracking-wider rounded-none ${
                        u.status === 'Active' 
                          ? 'bg-zinc-100 text-zinc-800 border-zinc-300' 
                          : 'bg-zinc-50 text-zinc-500 border-dashed border-zinc-200'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-none ${u.status === 'Active' ? 'bg-zinc-900' : 'bg-zinc-400'}`}></span>
                        <span>{u.status === 'Active' ? 'Активен' : 'Отправлено'}</span>
                      </span>
                    </td>

                    {/* Last active timestamp */}
                    <td className="p-4 font-mono text-[11px] text-zinc-500">
                      {u.lastActive ? (
                        <span className="flex items-center gap-1">
                          <Clock size={11} className="text-zinc-400" />
                          <span>{u.lastActive}</span>
                        </span>
                      ) : (
                        <span className="text-zinc-400 font-sans">—</span>
                      )}
                    </td>

                    {/* Creation Date audit trail */}
                    <td className="p-4 font-mono text-[11px] text-zinc-400">
                      {u.dateCreated}
                    </td>

                    {/* Profile adjustments */}
                    <td className="p-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleOpenEdit(u)}
                          className="bg-zinc-50 hover:bg-zinc-150 border border-zinc-200 text-[10px] font-bold uppercase tracking-wider text-zinc-700 px-2.5 py-1.5 rounded-none"
                        >
                          Изменить
                        </button>
                        {u.role !== 'Owner' && (
                          <button
                            onClick={() => handleDeleteUser(u.id, u.email)}
                            className="text-zinc-400 hover:text-zinc-950 p-1 rounded-none transition-colors"
                            title="Отрезать доступ"
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    </td>

                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* DIALOG SHEET: INVITE COLLEAGUE / EDIT PERMISSIONS */}
      {isInviteOpen && (
        <div className="fixed inset-0 bg-zinc-950/70 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-none overflow-hidden shadow-xl border border-zinc-350 animate-fade-in">
            <div className="p-6 border-b border-zinc-200 flex items-center justify-between bg-zinc-900 text-white">
              <div>
                <h3 className="font-serif italic font-bold text-lg leading-none">{editingUser ? 'Изменить параметры' : 'Новое приглашение'}</h3>
                <p className="text-[10px] text-zinc-400 uppercase tracking-widest mt-1">Доступ по почтовой аутентификации</p>
              </div>
              <button onClick={() => setIsInviteOpen(false)} className="text-zinc-400 hover:text-white transition-colors">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSendInvite} className="p-6 space-y-4 text-zinc-750">
              
              {/* Full Name */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Имя сотрудника</label>
                <input
                  type="text"
                  placeholder="ФИО сотрудника, например Алмаз Жұмагелді"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full text-xs border border-zinc-200 rounded-none p-2.5 text-zinc-800 bg-zinc-50 focus:outline-none focus:bg-white focus:border-zinc-800"
                />
              </div>

              {/* Email address */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Электронная почта (Логин)</label>
                <input
                  type="email"
                  placeholder="name@novaedu.kz"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full text-xs border border-zinc-200 rounded-none p-2.5 text-zinc-800 bg-zinc-50 focus:outline-none focus:bg-white focus:border-zinc-800"
                />
              </div>

              {/* Department position */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Должность в компании</label>
                <input
                  type="text"
                  placeholder="E.g., Финансы, Директор Олимпиад, Инвестор"
                  value={position}
                  onChange={(e) => setPosition(e.target.value)}
                  className="w-full text-xs border border-zinc-200 rounded-none p-2.5 text-zinc-800 bg-zinc-50 focus:outline-none focus:bg-white focus:border-zinc-800"
                />
              </div>

              {/* Access levels */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Роль привилегий</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as any)}
                  className="w-full text-xs border border-zinc-200 rounded-none p-2.5 text-zinc-800 bg-zinc-50 outline-none focus:border-zinc-805"
                >
                  <option value="Manager">Директор филиала (Ввод операций, просмотр своего бюджета)</option>
                  <option value="Administrator">Бухгалтер ПФ (Полное управление справочниками и счетами)</option>
                  <option value="Guest">Наблюдатель / Гость (Только чтение ДДС и ОПУ без возможности редактирования)</option>
                  <option value="Owner">Полный Владелец бизнеса (Добавление банков, реквизитов компаний)</option>
                </select>
              </div>

              {/* Warning label */}
              <div className="p-4 bg-zinc-50 border border-zinc-250 rounded-none text-[10px] text-zinc-550 leading-relaxed flex gap-2 font-mono">
                <AlertTriangle size={14} className="text-zinc-650 shrink-0" />
                <span>Бухгалтер ПФ и Владельцы имеют право удалять проводки из реестра и совершать импорт выписок.</span>
              </div>

              {/* CTA buttons */}
              <div className="flex gap-2 pt-4 border-t border-zinc-200">
                <button
                  type="button"
                  onClick={() => setIsInviteOpen(false)}
                  className="flex-1 bg-zinc-150 hover:bg-zinc-200 text-[11px] font-bold text-zinc-700 py-3 rounded-none uppercase tracking-wider transition-colors"
                >
                  Отменить
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-zinc-900 hover:bg-zinc-850 text-[11px] font-bold text-white py-3 rounded-none uppercase tracking-wider transition-colors"
                >
                  {editingUser ? 'Сохранить доступы' : 'Отправить доступы'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
