import React, { useState } from 'react';
import { AlertCircle } from 'lucide-react';
import { motion } from 'motion/react';
import { signInWithEmailAndPassword, signInAnonymously, signOut, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { Button, Card, SwissportLogo } from './ui';

export const ADMIN_IDS = ['spkgase', 'wu001'];

export const AdminLoginPage = ({ onLogin, onError }: { onLogin: (adminId: string) => void, onError?: (err: React.ReactNode) => void }) => {
  const [adminId, setAdminId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<React.ReactNode>('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    const saveError = (err: React.ReactNode) => {
      setError(err);
      if (onError) onError(err);
    };

    try {
      const lowerId = adminId.trim().toLowerCase();
      const trimmedPassword = password.trim();

      let userCredential;
      try {
        const loginEmail = lowerId.includes('@') ? lowerId : `${lowerId}@spk.com`;
        userCredential = await signInWithEmailAndPassword(auth, loginEmail, trimmedPassword);
      } catch (authErr: any) {
        console.log("Email login failed, trying anonymous fallback:", authErr.message);
        userCredential = await signInAnonymously(auth);
      }

      if (!userCredential || !userCredential.user) {
        throw new Error("Failed to establish authentication session.");
      }

      let isValid = false;
      let name = adminId.trim();
      let initialRole = 'staff';

      if (lowerId === 'spkgase' && trimmedPassword === '000000') {
        isValid = true;
        name = '관리자 (spkgase)';
        initialRole = 'manager';
      } else if (lowerId === 'wu001' && trimmedPassword === '000000') {
        isValid = true;
        name = '보안요원 (wu001)';
        initialRole = 'staff';
      } else if (lowerId === 'cloudkiss90' || lowerId === 'cloudkiss90@gmail.com') {
        if (trimmedPassword === '000000') {
          isValid = true;
          name = '최고 관리자';
          initialRole = 'super_admin';
        }
      }

      if (!isValid) {
        await signOut(auth);
        saveError('허가된 아이디 또는 비밀번호가 일치하지 않습니다.');
        setIsLoading(false);
        return;
      }

      if (userCredential && userCredential.user) {
        try {
          // 세션 내 중복 쓰기 방지 (Firestore 쓰기 할당량 절약)
          const sessionKey = `profile_written_${userCredential.user.uid}`;
          if (!sessionStorage.getItem(sessionKey)) {
            await setDoc(doc(db, 'users', userCredential.user.uid), {
              name: name,
              adminId: lowerId,
              role: initialRole,
              updatedAt: serverTimestamp()
            }, { merge: true });
            sessionStorage.setItem(sessionKey, '1');
          }

          onLogin(lowerId);
        } catch (setErr: any) {
          console.error("Profile creation error:", setErr);
          saveError(
            <div className="text-left space-y-1">
              <p className="font-black text-red-600">프로필 생성 오류</p>
              <p className="text-[10px] leading-relaxed opacity-80">
                권한 또는 네트워크 문제로 프로필을 생성할 수 없습니다. 다시 시도해 주세요.
                <br/>(에러: {setErr.message})
              </p>
            </div>
          );
          await signOut(auth);
        }
      }
    } catch (err: any) {
      console.error("Login creation error:", err);
      const errorCode = err.code || 'unknown';
      const errorMessage = err.message || String(err);

      if (err.code === 'auth/admin-restricted-operation' || err.message?.includes('admin-restricted-operation')) {
        saveError(
          <div className="text-left space-y-1">
            <p className="font-black text-red-600">익명 인증 비활성화 상태 ({errorCode})</p>
            <p className="text-[10px] leading-relaxed opacity-80">
              Firebase Console &gt; Authentication &gt; Sign-in method에서 <b>익명(Anonymous)</b> 로그인이 "사용 설정됨"인지 다시 확인해주세요.
              설정 후 1~2분 정도 지연이 있을 수 있습니다.
            </p>
          </div>
        );
      } else {
        saveError(
          <div className="text-left space-y-1">
            <p className="font-black text-red-600">로그인 오류 ({errorCode})</p>
            <p className="text-[10px] leading-relaxed opacity-80">{errorMessage}</p>
          </div>
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setError('');
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);

      if (result.user.email === 'cloudkiss90@gmail.com') {
        await setDoc(doc(db, 'users', result.user.uid), {
          name: 'Super Admin',
          adminId: 'super_admin',
          role: 'super_admin',
          email: result.user.email,
          updatedAt: serverTimestamp()
        }, { merge: true });

        onLogin('super_admin');
      } else {
        const userDoc = await getDoc(doc(db, 'users', result.user.uid));
        if (userDoc.exists()) {
          onLogin(userDoc.data().adminId || 'manager');
        } else {
          await signOut(auth);
          setError('승인되지 않은 구글 계정입니다.');
        }
      }
    } catch (err: any) {
      console.error("Google login error:", err);
      setError('구글 로그인 중 오류가 발생했습니다: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-white relative overflow-hidden">
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-[#E30613] rounded-full blur-[120px] opacity-5" />

      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md relative z-10 text-center"
      >
        <div className="flex flex-col items-center justify-center gap-4 mb-16">
          <SwissportLogo size="lg" />
          <p className="text-[14px] font-black tracking-[0.5em] text-[#E30613] uppercase">Security Portal</p>
        </div>

        <Card className="p-8 md:p-10 border border-slate-100 shadow-2xl shadow-slate-200/40 bg-white rounded-[2.5rem]">
          <h2 className="text-2xl md:text-3xl font-black mb-8 md:mb-10 text-[#1A1A1A]">시스템 로그인</h2>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2 text-left">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">ID</label>
              <input
                type="text"
                className="w-full h-14 px-6 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:border-[#E30613]/30 focus:ring-4 focus:ring-[#E30613]/5 transition-all font-bold"
                value={adminId}
                onChange={(e) => setAdminId(e.target.value)}
                autoComplete="username"
              />
            </div>

            <div className="space-y-2 text-left">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Password</label>
              <input
                type="password"
                className="w-full h-14 px-6 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:border-[#E30613]/30 focus:ring-4 focus:ring-[#E30613]/5 transition-all font-bold"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
              />
            </div>

            <Button
              type="submit"
              disabled={isLoading || !adminId || !password}
              className="w-full h-16 text-lg rounded-2xl bg-[#1A1A1A] hover:bg-black mt-4"
            >
              {isLoading ? '인증 중...' : '접속하기'}
            </Button>
          </form>

          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-slate-100"></span>
            </div>
            <div className="relative flex justify-center text-[10px] uppercase font-black text-slate-300 px-4 bg-white">
              OR
            </div>
          </div>

          <Button
            variant="outline"
            className="w-full h-16 rounded-2xl border-slate-200 text-slate-600 font-bold"
            onClick={handleGoogleLogin}
            disabled={isLoading}
          >
            {isLoading ? '인증 중...' : 'Google 인증으로 접속'}
          </Button>

          {error && (
            <div className="mt-6 p-4 bg-red-50 text-red-600 text-xs rounded-xl border border-red-100 flex items-center gap-2">
              <AlertCircle size={18} />
              {error}
            </div>
          )}
        </Card>

        <p className="mt-12 text-[10px] text-slate-400 uppercase font-black tracking-[0.2em] opacity-50">
          SPK Internal Registry System &bull; Restricted Access
        </p>
      </motion.div>
    </div>
  );
};
