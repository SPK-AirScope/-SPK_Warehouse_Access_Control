import React, { useState } from 'react';
import { Shield, RotateCcw, UserPlus, X, Info, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { collection, query, orderBy, doc, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { useCollection } from 'react-firebase-hooks/firestore';
import { db } from '../lib/firebase';
import { Card, cn } from './ui';

export const AdminsManagementView = ({ showToast }: {
  showToast?: (message: string, type: 'success' | 'error' | 'info') => void
}) => {
  const [usersSnapshot, usersLoading] = useCollection(query(collection(db, 'users'), orderBy('updatedAt', 'desc')));
  const [credsSnapshot, credsLoading] = useCollection(query(collection(db, 'credentials'), orderBy('createdAt', 'desc')));

  const allProfiles = usersSnapshot?.docs.map(doc => ({ id: doc.id, ...doc.data() as any })) || [];
  const allCredentials = credsSnapshot?.docs.map(doc => ({ id: doc.id, ...doc.data() as any })) || [];

  const notify = (msg: string, type: 'success' | 'error' | 'info') => {
    if (showToast) showToast(msg, type);
    else alert(msg);
  };

  const unifiedAccounts = React.useMemo(() => {
    const accMap = new Map();

    const authorizedIds = ['cloudkiss90', 'spkgase', 'wu001'];
    authorizedIds.forEach(id => {
      const upperId = id.toUpperCase();
      accMap.set(id, {
         id: id,
         adminId: id === 'cloudkiss90' ? 'CLOUD-ADMIN' : upperId,
         name: id === 'cloudkiss90' ? '최고 관리자' : upperId,
         role: id === 'cloudkiss90' ? 'super_admin' : (id === 'spkgase' ? 'manager' : 'staff'),
         type: 'system',
         createdAtNormalized: 0,
         isActive: false,
         email: id === 'cloudkiss90' ? 'cloudkiss90@gmail.com' : null
      });
    });

    allCredentials.forEach(cred => {
      const key = cred.id.toLowerCase();
      const existing = accMap.get(key);
      if (existing) {
        accMap.set(key, {
          ...existing,
          ...cred,
          type: 'credential',
          adminId: cred.adminId?.toUpperCase() || existing.adminId
        });
      } else {
        accMap.set(key, {
          ...cred,
          type: 'credential',
          adminId: cred.adminId?.toUpperCase() || key.toUpperCase(),
          createdAtNormalized: cred.createdAt?.seconds || 0,
          name: cred.name || key.toUpperCase(),
          isActive: false
        });
      }
    });

    allProfiles.forEach(prof => {
      const emailPrefix = prof.email?.split('@')[0]?.toLowerCase();
      const adminIdLower = prof.adminId?.toLowerCase();

      let matchedKey = null;

      if (adminIdLower && accMap.has(adminIdLower)) matchedKey = adminIdLower;
      else if (emailPrefix && accMap.has(emailPrefix)) matchedKey = emailPrefix;
      else {
        for (const [key, val] of accMap.entries()) {
          if (val.adminId?.toLowerCase() === adminIdLower || val.email?.toLowerCase() === prof.email?.toLowerCase()) {
            matchedKey = key;
            break;
          }
        }
      }

      if (matchedKey) {
        const existing = accMap.get(matchedKey);
        accMap.set(matchedKey, {
          ...existing,
          ...prof,
          isActive: true,
          profileId: prof.id,
          adminId: existing.adminId
        });
      } else {
        accMap.set(prof.id, {
          ...prof,
          id: prof.id,
          isActive: true,
          profileId: prof.id,
          adminId: prof.adminId?.toUpperCase() || prof.email?.split('@')[0]?.toUpperCase() || prof.id,
          name: prof.name || '알 수 없는 사용자',
          type: 'stray'
        });
      }
    });

    return Array.from(accMap.values()).sort((a, b) => {
      const rank = (id: string) => {
        const low = id?.toLowerCase();
        if (low === 'cloudkiss90') return 0;
        if (low === 'spkgase') return 1;
        if (low === 'wu001') return 2;
        return 99;
      };
      const rankA = rank(a.id);
      const rankB = rank(b.id);
      if (rankA !== rankB) return rankA - rankB;
      return (b.createdAtNormalized || 0) - (a.createdAtNormalized || 0);
    });
  }, [allProfiles, allCredentials]);

  const [isUpdating, setIsUpdating] = useState<string | null>(null);

  const [showAddForm, setShowAddForm] = useState(false);
  const [newUserId, setNewUserId] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserName, setNewUserName] = useState('');
  const [newUserRole, setNewUserRole] = useState('manager');
  const [isCreating, setIsCreating] = useState(false);

  const handleRoleChange = async (account: any, newRole: string) => {
    try {
      setIsUpdating(account.adminId);

      if (account.adminId) {
        await setDoc(doc(db, 'credentials', account.adminId.toLowerCase()), {
          role: newRole
        }, { merge: true });
      }

      if (account.profileId) {
        await setDoc(doc(db, 'users', account.profileId), {
          role: newRole,
          updatedAt: serverTimestamp()
        }, { merge: true });
      }

      notify('해당 계정의 권한이 성공적으로 변경되었습니다.', 'success');
    } catch (err: any) {
      console.error("Role update error:", err);
      notify('권한 변경에 실패했습니다: ' + err.message, 'error');
    } finally {
      setIsUpdating(null);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserId || !newUserPassword || !newUserName) {
      notify('모든 필드를 입력해 주세요.', 'error');
      return;
    }

    try {
      setIsCreating(true);
      await setDoc(doc(db, 'credentials', newUserId.toLowerCase()), {
        adminId: newUserId.toLowerCase(),
        password: newUserPassword,
        name: newUserName,
        role: newUserRole,
        createdAt: serverTimestamp()
      });

      notify('새로운 시스템 계정이 생성되었습니다.', 'success');
      setShowAddForm(false);
      setNewUserId('');
      setNewUserPassword('');
      setNewUserName('');
    } catch (err: any) {
      console.error("User creation error:", err);
      notify('계정 생성 실패: ' + err.message, 'error');
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteAccount = async (account: any) => {
    const identification = account.adminId || account.name || account.id || '알 수 없는 계정';
    if (!confirm(`'${identification}' 계정을 정말 삭제하시겠습니까? 관련 모든 권한 및 로그인 기록이 사라집니다.`)) return;

    try {
      setIsUpdating(account.id || account.profileId);

      const possibleIds = [account.id?.toLowerCase(), account.adminId?.toLowerCase(), account.profileId?.toLowerCase()].filter(Boolean);

      for (const id of possibleIds) {
        if (id === 'cloudkiss90' || id === 'cloud-admin') continue;
        console.log("Cleanup attempt (Cred/User):", id);
        await deleteDoc(doc(db, 'credentials', id));
        await deleteDoc(doc(db, 'users', id));
      }

      if (account.profileId && account.profileId !== 'cloudkiss90') {
        console.log("Cleanup attempt (UID):", account.profileId);
        await deleteDoc(doc(db, 'users', account.profileId));
      }

      notify('계정이 성공적으로 삭제되었습니다.', 'success');
    } catch (err: any) {
      console.error("Delete error:", err);
      notify('삭제 중 오류가 발생했습니다: ' + err.message, 'error');
    } finally {
      setIsUpdating(null);
    }
  };

  const handleSystemInitialize = async () => {
    if (!confirm('경고: 시스템을 즉시 초기화하시겠습니까? 최고 관리자를 제외한 모든 이용자 프로필과 계정 정보가 DB에서 영구 삭제됩니다.')) return;

    try {
      setIsUpdating('system_init');

      const deletePromises = [];

      for (const cred of allCredentials) {
        if (cred.id.toLowerCase() !== 'cloudkiss90') {
           deletePromises.push(deleteDoc(doc(db, 'credentials', cred.id)));
        }
      }

      const superAdminEmail = 'cloudkiss90@gmail.com';
      for (const prof of allProfiles) {
        if (prof.email !== superAdminEmail && prof.id !== 'cloudkiss90') {
           deletePromises.push(deleteDoc(doc(db, 'users', prof.id)));
        }
      }

      await Promise.all(deletePromises);
      notify('전체 초기화가 완료되었습니다.', 'success');
    } catch (err: any) {
      console.error("System init error:", err);
      notify('초기화 중 오류 발생: ' + err.message, 'error');
    } finally {
      setIsUpdating(null);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg">
            <Shield size={24} />
          </div>
          <div>
            <h2 className="text-xl font-black text-[#1A1A1A] tracking-tight">시스템 권한 관리</h2>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Admin Management & RBAC Control</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleSystemInitialize}
            disabled={isUpdating === 'system_init'}
            className="flex items-center gap-2 px-6 py-3 bg-rose-50 text-rose-600 rounded-xl font-bold text-sm border border-rose-100 hover:bg-rose-100 transition-all disabled:opacity-50"
          >
            <RotateCcw size={18} />
            {isUpdating === 'system_init' ? '초기화 중...' : '시스템 초기화'}
          </button>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all"
          >
            {showAddForm ? <X size={18} /> : <UserPlus size={18} />}
            {showAddForm ? '취소' : '신규 계정 생성'}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {showAddForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <Card className="p-8 border-indigo-100 bg-indigo-50/30 rounded-[2rem] shadow-inner">
              <form onSubmit={handleCreateUser} className="grid grid-cols-1 md:grid-cols-6 gap-4 items-end">
                <div className="md:col-span-1 space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">아이디 (ID)</label>
                  <input
                    type="text"
                    value={newUserId}
                    onChange={(e) => setNewUserId(e.target.value)}
                    className="w-full h-12 px-4 rounded-xl border border-slate-200 bg-white focus:border-indigo-500 outline-none transition-all font-bold text-sm"
                    placeholder="ID 입력"
                  />
                </div>
                <div className="md:col-span-1 space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">비밀번호</label>
                  <input
                    type="password"
                    value={newUserPassword}
                    onChange={(e) => setNewUserPassword(e.target.value)}
                    className="w-full h-12 px-4 rounded-xl border border-slate-200 bg-white focus:border-indigo-500 outline-none transition-all font-bold text-sm"
                    placeholder="Pass"
                  />
                </div>
                <div className="md:col-span-2 space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">성명 / 소속</label>
                  <input
                    type="text"
                    value={newUserName}
                    onChange={(e) => setNewUserName(e.target.value)}
                    className="w-full h-12 px-4 rounded-xl border border-slate-200 bg-white focus:border-indigo-500 outline-none transition-all font-bold text-sm"
                    placeholder="실명 입력"
                  />
                </div>
                <div className="md:col-span-1 space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">권한 등급</label>
                  <select
                    value={newUserRole}
                    onChange={(e) => setNewUserRole(e.target.value)}
                    className="w-full h-12 px-4 rounded-xl border border-slate-200 bg-white focus:border-indigo-500 outline-none transition-all font-bold text-sm appearance-none"
                  >
                    <option value="manager">관리자 (Manager)</option>
                    <option value="staff">보안요원 (Staff)</option>
                    <option value="super_admin">최고 관리자</option>
                  </select>
                </div>
                <div className="md:col-span-1">
                  <button
                    type="submit"
                    disabled={isCreating}
                    className="w-full h-12 px-4 bg-indigo-600 text-white rounded-xl font-black text-sm hover:bg-indigo-700 transition-all disabled:opacity-50 shadow-md shadow-indigo-100"
                  >
                    {isCreating ? '생성 중' : '계정 생성'}
                  </button>
                </div>
              </form>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="space-y-6">
        <div className="flex items-center gap-2 px-4 py-2 bg-indigo-50 rounded-xl">
          <Info size={14} className="text-indigo-600" />
          <p className="text-[10px] font-bold text-indigo-700 tracking-tight">Active 계정은 시스템에 1회 이상 로그인한 기록이 있는 실제 프로필이며, Credential은 로그인 가능한 계정 정보입니다.</p>
        </div>

        <div className="grid grid-cols-1 gap-8">
          <Card className="p-0 overflow-hidden border-slate-200 shadow-2xl rounded-[2.5rem]">
            <div className="bg-slate-50/50 px-8 py-6 border-b border-slate-100 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="w-2.5 h-2.5 rounded-full bg-indigo-600 animate-pulse" />
                <h3 className="text-lg font-black text-slate-800 tracking-tight">시스템 이용자 통합 관리 리스트</h3>
              </div>
              <span className="bg-white/80 px-3 py-1 rounded-full border border-slate-200 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                Total {unifiedAccounts.length} Accounts
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-[#FBFBFF] border-b border-slate-100">
                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">사용자 정보 (Profile)</th>
                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-center">계정 상태</th>
                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-center">권한 등급</th>
                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-right pr-12">관리</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {usersLoading || credsLoading ? (
                    <tr>
                      <td colSpan={4} className="px-8 py-20 text-center">
                        <div className="flex flex-col items-center gap-3">
                          <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                          <p className="text-sm font-black text-slate-400">데이터를 불러오는 중...</p>
                        </div>
                      </td>
                    </tr>
                  ) : unifiedAccounts.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-8 py-20 text-center">
                        <p className="text-xl font-black text-slate-200">등록된 계정 정보가 없습니다.</p>
                      </td>
                    </tr>
                  ) : (
                    unifiedAccounts.map((acc) => (
                      <tr key={acc.adminId} className="group hover:bg-indigo-50/10 transition-all duration-300">
                        <td className="px-8 py-6">
                          <div className="flex items-center gap-4">
                            <div className={cn(
                              "w-12 h-12 rounded-2xl flex items-center justify-center text-lg font-black shadow-lg transition-transform group-hover:scale-110 duration-300",
                              acc.role === 'super_admin' ? "bg-indigo-600 text-white" :
                              acc.role === 'manager' ? "bg-blue-100 text-blue-600" :
                              (acc.type === 'stray' ? "bg-amber-100 text-amber-600 shadow-sm" : "bg-slate-100 text-slate-500 shadow-none")
                            )}>
                              {(acc.name || acc.adminId || '?').charAt(0).toUpperCase()}
                            </div>
                            <div className="space-y-0.5">
                              <p className="font-extrabold text-[15px] text-slate-900 leading-tight">
                                {acc.name}
                                {acc.type === 'stray' && <span className="ml-2 text-[8px] bg-amber-50 text-amber-500 px-1.5 py-0.5 rounded-full border border-amber-100 font-black uppercase tracking-tighter">Unknown Profile</span>}
                              </p>
                              <div className="flex items-center gap-2">
                                <span className={cn(
                                  "text-[10px] font-bold uppercase tracking-wider",
                                  acc.type === 'stray' ? "text-amber-500" : "text-slate-400"
                                )}>{acc.adminId}</span>
                                {acc.email && <span className="text-[9px] font-medium text-indigo-400 italic">[{acc.email}]</span>}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-8 py-6">
                          <div className="flex justify-center">
                            {acc.isActive ? (
                              <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full border border-emerald-100">
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                <span className="text-[10px] font-black uppercase">Active</span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1.5 px-3 py-1 bg-slate-100 text-slate-400 rounded-full">
                                <div className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                                <span className="text-[10px] font-black uppercase">Registered</span>
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-8 py-6">
                          <div className="flex justify-center">
                            <select
                              value={acc.role}
                              disabled={isUpdating === acc.adminId || acc.email === 'cloudkiss90@gmail.com'}
                              onChange={(e) => handleRoleChange(acc, e.target.value)}
                              className={cn(
                                "h-10 px-4 rounded-xl border-2 text-[10px] font-black uppercase tracking-widest outline-none transition-all cursor-pointer disabled:opacity-30",
                                acc.role === 'super_admin' ? "border-indigo-100 bg-white text-indigo-700 focus:border-indigo-600" :
                                acc.role === 'manager' ? "border-blue-50 bg-white text-blue-700 focus:border-blue-600" :
                                "border-slate-100 bg-white text-slate-600 focus:border-slate-500"
                              )}
                            >
                              <option value="super_admin">SUPER ADMIN</option>
                              <option value="manager">MANAGER</option>
                              <option value="staff">SECURITY STAFF</option>
                            </select>
                          </div>
                        </td>
                        <td className="px-8 py-6">
                          <div className="flex justify-end pr-4">
                            <button
                              disabled={isUpdating === acc.adminId || acc.email === 'cloudkiss90@gmail.com'}
                              onClick={() => handleDeleteAccount(acc)}
                              className="w-11 h-11 flex items-center justify-center rounded-xl text-slate-300 hover:text-rose-600 hover:bg-rose-50 hover:shadow-inner transition-all duration-300 group/del disabled:opacity-0"
                            >
                              <Trash2 size={20} strokeWidth={2.5} className="group-hover/del:scale-110 transition-transform" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
