import React, { useState } from 'react';
import { User, Key } from 'lucide-react';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Card } from './ui';

export const ProfileView = ({ userProfile, adminId, showToast }: {
  userProfile: any,
  adminId: string | null,
  showToast?: (message: string, type: 'success' | 'error' | 'info') => void
}) => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  const notify = (msg: string, type: 'success' | 'error' | 'info') => {
    if (showToast) showToast(msg, type);
    else alert(msg);
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminId) {
      notify('아이디 로그인이 필요합니다 (Google 로그인은 해당 서비스에서 변경해주세요).', 'error');
      return;
    }
    if (newPassword !== confirmPassword) {
      notify('비밀번호가 일치하지 않습니다.', 'error');
      return;
    }
    if (newPassword.length < 4) {
      notify('비밀번호는 최소 4자리 이상이어야 합니다.', 'error');
      return;
    }

    try {
      setIsUpdating(true);
      await setDoc(doc(db, 'credentials', adminId.toLowerCase()), { password: newPassword }, { merge: true });
      notify('비밀번호가 성공적으로 변경되었습니다.', 'success');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      notify('변경 실패: ' + err.message, 'error');
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center text-white shadow-lg">
          <User size={24} />
        </div>
        <div>
          <h2 className="text-xl font-black text-[#1A1A1A] tracking-tight">내 프로필 설정</h2>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Account & Security Settings</p>
        </div>
      </div>

      <Card className="p-8 space-y-8 rounded-[2rem]">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">이름</p>
            <p className="font-bold text-slate-900">{userProfile?.name || '정보 없음'}</p>
          </div>
          <div className="space-y-1">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">아이디 / 이메일</p>
            <p className="font-bold text-slate-900">{adminId || userProfile?.email || '정보 없음'}</p>
          </div>
          <div className="space-y-1">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">권한 등급</p>
            <p className="font-bold text-indigo-600">
              {userProfile?.role === 'super_admin' ? '최고 관리자' : userProfile?.role === 'manager' ? '관리자' : '보안요원'}
            </p>
          </div>
        </div>

        {adminId && (
          <div className="pt-8 border-t border-slate-100">
            <h3 className="text-sm font-black text-slate-900 mb-6 flex items-center gap-2">
              <Key size={16} className="text-slate-400" />
              비밀번호 변경
            </h3>
            <form onSubmit={handleUpdatePassword} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">새 비밀번호</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full h-12 px-4 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-indigo-500 outline-none transition-all font-bold text-sm"
                    placeholder="New Password"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">비밀번호 확인</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full h-12 px-4 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-indigo-500 outline-none transition-all font-bold text-sm"
                    placeholder="Confirm Password"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={isUpdating}
                className="w-full h-12 bg-slate-900 text-white rounded-xl font-bold text-sm hover:bg-slate-800 transition-all shadow-lg active:scale-[0.98]"
              >
                {isUpdating ? '변경 중...' : '비밀번호 변경 완료'}
              </button>
            </form>
          </div>
        )}
      </Card>
    </div>
  );
};
