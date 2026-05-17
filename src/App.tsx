import React, { useState, useEffect, useRef } from 'react';
import { 
  Shield, 
  LogOut, 
  FileText, 
  Upload, 
  CheckCircle, 
  XCircle, 
  Calendar,
  ChevronLeft,
  ChevronRight, 
  User, 
  Wrench, 
  Download,
  AlertCircle,
  FilePlus,
  ArrowRight,
  Eye,
  Settings,
  Bell,
  Search,
  Lock,
  Stamp,
  Globe,
  X,
  LayoutGrid,
  Plus,
  Trash2,
  UserPlus,
  RotateCcw,
  Info,
  Key,
  Menu
} from 'lucide-react';
import { 
  useAuthState
} from 'react-firebase-hooks/auth';
import { signInWithEmailAndPassword, signInAnonymously, signOut, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { 
  collection, 
  query, 
  where,
  Timestamp,
  orderBy, 
  limit, 
  addDoc, 
  serverTimestamp,
  doc,
  setDoc,
  deleteDoc,
  getDoc,
} from 'firebase/firestore';
import { useCollection, useCollectionData, useDocumentData } from 'react-firebase-hooks/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { auth, db, OperationType, handleFirestoreError } from './lib/firebase';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { aiService } from './services/aiService';
import { applicationService, EntryApplication, Visitor, Tool as ToolItem } from './services/applicationService';
import { pdfService } from './services/pdfService';
import * as pdfjs from 'pdfjs-dist';

import { 
  format, 
  addMonths, 
  subMonths, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  isSameMonth, 
  isSameDay, 
  addDays, 
  eachDayOfInterval,
  isToday,
  parseISO
} from 'date-fns';
import { ko } from 'date-fns/locale';

// Utility for class merging
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Set worker for pdfjs
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

const Button = ({ 
  children, 
  variant = 'primary', 
  className, 
  ...props 
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost' | 'success' }) => {
  const variants = {
    primary: 'bg-[#E30613] text-white hover:bg-[#C20510] shadow-lg shadow-red-100',
    secondary: 'bg-[#1A1A1A] text-white hover:bg-black',
    outline: 'border border-slate-200 text-slate-700 hover:bg-slate-50',
    danger: 'bg-red-600 text-white hover:bg-red-700',
    ghost: 'text-slate-500 hover:bg-slate-100',
    success: 'bg-emerald-600 text-white hover:bg-emerald-700',
  };
  
  return (
    <button 
      className={cn(
        'px-4 py-2 rounded-lg font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 active:scale-95 text-sm',
        variants[variant],
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
};

const Card = ({ children, className, ...props }: { children: React.ReactNode; className?: string } & React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('bg-white border border-slate-200 rounded-2xl shadow-sm p-6', className)} {...props}>
    {children}
  </div>
);

const SwissportLogo = ({ className, size = 'md' }: { className?: string, size?: 'sm' | 'md' | 'lg' | 'xl' }) => {
  const sizes = {
    sm: { text: 'text-xl', rhombus: 'w-6 h-6', icon: 12, gap: 'gap-1' },
    md: { text: 'text-2xl', rhombus: 'w-8 h-8', icon: 16, gap: 'gap-1.5' },
    lg: { text: 'text-4xl', rhombus: 'w-12 h-12', icon: 24, gap: 'gap-2' },
    xl: { text: 'text-6xl', rhombus: 'w-20 h-20', icon: 40, gap: 'gap-3' },
  };
  
  const s = sizes[size];
  
  return (
    <div className={cn("flex items-center select-none", s.gap, className)}>
      <span className={cn("font-black text-[#1A1A1A] tracking-tighter italic lowercase leading-none", s.text)}>
        swissport
      </span>
      <div className={cn("relative flex items-center justify-center shrink-0", s.rhombus)}>
        <div className="absolute inset-0 bg-[#E30613] transform skew-x-[-20deg] rounded-sm" />
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 8, ease: "linear" }}
          className="relative z-10 flex items-center justify-center"
        >
          <Globe size={s.icon} className="text-white opacity-90" strokeWidth={1.5} />
        </motion.div>
      </div>
    </div>
  );
};

const ApprovalSeal = ({ className, size = 'md', isPdf = false }: { className?: string, size?: 'sm' | 'md' | 'lg', isPdf?: boolean }) => {
  const sizes = {
    sm: 'w-12 h-12',
    md: 'w-20 h-20',
    lg: 'w-28 h-28',
  };
  
  const [imageError, setImageError] = React.useState(false);
  
  return (
    <div className={cn("relative flex items-center justify-center overflow-hidden", sizes[size], className)}>
      {!imageError ? (
        <img 
          src="/1.JPG" 
          alt="직인" 
          className={cn(
            "w-full h-full object-contain opacity-90",
            !isPdf && "mix-blend-multiply"
          )}
          onError={() => setImageError(true)}
          referrerPolicy="no-referrer"
        />
      ) : (
        <div className="w-full h-full border-4 border-[#D30410] rounded-sm flex items-center justify-center p-1 bg-white/20">
           <div className="w-full h-full border-2 border-[#D30410] flex flex-col items-center justify-center text-[#D30410] font-black leading-none">
              <span className="text-[10px] scale-x-75">스위스포트</span>
              <span className="text-[14px]">직인</span>
              <span className="text-[10px] scale-x-75">코리아(주)</span>
           </div>
        </div>
      )}
    </div>
  );
};

// Administrator IDs (display names)
const ADMIN_IDS = ['spkgase', 'wu001'];

const AdminLoginPage = ({ onLogin, onError }: { onLogin: (adminId: string) => void, onError?: (err: React.ReactNode) => void }) => {
  const [adminId, setAdminId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<React.ReactNode>('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    const trimmedId = adminId.trim();
    const trimmedPassword = password.trim();

    const saveError = (err: React.ReactNode) => {
      setError(err);
      if (onError) onError(err);
    };

    try {
      const lowerId = adminId.trim().toLowerCase();
      const trimmedPassword = password.trim();
      
      const ADMIN_CREDENTIALS: Record<string, string> = {
        'spkgase': '000000',
        'wu001': '000000'
      };

      // 1. Perform Auth first
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

      // 2. Enforce only specific accounts
      let isValid = false;
      let name = adminId.trim();
      let initialRole = 'staff';

      // cloudkiss90 is handled via Google login usually, but if they use ID:
      if (lowerId === 'cloudkiss90' || lowerId === 'cloudkiss90@gmail.com') {
         // This block handles IDs. If they use cloudkiss90 as ID with password
         // We might need a password for it if they don't use Google.
         // But user gave cloudkiss90 as the ID. Let's assume they use Google mostly or we can add it to ADMIN_CREDENTIALS.
      }

      if (lowerId === 'spkgase' && trimmedPassword === '000000') {
        isValid = true;
        name = '관리자 (spkgase)';
        initialRole = 'manager';
      } else if (lowerId === 'wu001' && trimmedPassword === '000000') {
        isValid = true;
        name = '보안요원 (wu001)';
        initialRole = 'staff';
      } else if (lowerId === 'cloudkiss90' || lowerId === 'cloudkiss90@gmail.com') {
        // Special case for super admin if logging in via ID (though Google is preferred)
        // If password matches... we need a password for cloudkiss90. 
        // User didn't specify one for cloudkiss90, maybe it's 000000 too?
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
          // 3. Update active profile with the role we found
          await setDoc(doc(db, 'users', userCredential.user.uid), {
            name: name,
            adminId: lowerId,
            role: initialRole,
            updatedAt: serverTimestamp()
          }, { merge: true });

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
      // Detailed error logging
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
      
      // Check if this is the super admin email
      if (result.user.email === 'cloudkiss90@gmail.com') {
        // Set as super admin
        await setDoc(doc(db, 'users', result.user.uid), {
          name: 'Super Admin',
          adminId: 'super_admin',
          role: 'super_admin',
          email: result.user.email,
          updatedAt: serverTimestamp()
        }, { merge: true });
        
        onLogin('super_admin');
      } else {
        // Check if user is already a manager/staff in users collection
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

const EntryDocument = ({ app, id, className, isPdf = false }: { app: EntryApplication, id?: string, className?: string, isPdf?: boolean }) => {
  const visitors = app.visitors || [];
  
  // Helper to ensure we always show at least 8 rows for visitors
  const visitorRows = [...visitors];
  while (visitorRows.length < 8) {
    visitorRows.push({ name: '', birthDate: '', company: '', phone: '', badgeType: '', receiptNo: '', accessZone: '' } as any);
  }

  return (
    <div 
      className={cn(
        "bg-white text-[#1A1A1A] relative pdf-export-container font-sans overflow-hidden", 
        !isPdf && "border p-12 min-h-[1200px]",
        isPdf && "pdf-page",
        className
      )} 
      id={id}
    >
      {/* Letter Content */}
      <div className="relative z-20 px-[5mm] pt-[10mm]">
        {/* Header Logo */}
        <div className="flex justify-start mb-6">
           <div className="flex items-center gap-1.5 grayscale contrast-125">
             <span className="font-black text-2xl tracking-tighter italic lowercase leading-none">swissport</span>
             <div className="w-8 h-8 bg-black transform skew-x-[-20deg] rounded-sm flex items-center justify-center">
                <Globe size={16} className="text-white" />
             </div>
           </div>
           <h1 className="ml-8 text-3xl font-black tracking-tighter">화물창고 방문 출입 신청서</h1>
        </div>

        {/* 1. 방문자 인적사항 및 출입 정보 */}
        <div className="mb-8">
           <h3 className="text-lg font-black mb-3">1. 방문자 인적사항 및 출입 정보</h3>
           <table className="w-full border-collapse border border-black text-center text-xs">
              <thead>
                 <tr className="bg-white font-bold h-10 border-b border-black">
                    <th className="border-r border-black px-1 w-[12%]">성명</th>
                    <th className="border-r border-black px-1 w-[15%]">생년월일</th>
                    <th className="border-r border-black px-1 w-[18%]">소속</th>
                    <th className="border-r border-black px-1 w-[15%]">연락처</th>
                    <th className="border-r border-black px-1 w-[10%]">출입증<br/>종류</th>
                    <th className="border-r border-black px-1 w-[15%]">방문증 신청<br/>접수 번호</th>
                    <th className="px-1 w-[15%]">출입<br/>허가구역</th>
                 </tr>
              </thead>
              <tbody>
                 {visitorRows.slice(0, 8).map((v, i) => (
                    <tr key={i} className="h-9 border-b border-black last:border-0">
                       <td className="border-r border-black px-1 font-bold">{v.name}</td>
                       <td className="border-r border-black px-1">{v.birthDate}</td>
                       <td className="border-r border-black px-1">{v.company}</td>
                       <td className="border-r border-black px-1">{v.phone}</td>
                       <td className="border-r border-black px-1">{v.badgeType}</td>
                       <td className="border-r border-black px-1">{v.receiptNo}</td>
                       <td className="px-1 text-[10px]">{v.accessZone}</td>
                    </tr>
                 ))}
              </tbody>
           </table>
        </div>

        {/* 2. 방문일정 및 방문 목적 */}
        <div className="mb-8">
           <h3 className="text-lg font-black mb-3">2. 방문일정 및 방문 목적</h3>
           <table className="w-full border-collapse border border-black text-center text-xs">
              <thead>
                 <tr className="bg-white font-bold h-10 border-b border-black">
                    <th className="border-r border-black px-1 w-[15%]">성명</th>
                    <th className="border-r border-black px-1 w-[20%]">방문일정</th>
                    <th className="border-r border-black px-1 w-[50%]">방문목적</th>
                    <th className="px-1 w-[15%]">비고</th>
                 </tr>
              </thead>
              <tbody>
                 {visitorRows.slice(0, 5).map((v, i) => (
                    <tr key={i} className="h-9 border-b border-black last:border-0">
                       <td className="border-r border-black px-1 font-bold">{v.name}</td>
                       <td className="border-r border-black px-1 italic">{v.visitDate || app.applyDate}</td>
                       <td className="border-r border-black px-1 text-left px-2">{v.purpose}</td>
                       <td className="px-1 text-[10px]">{v.remarks}</td>
                    </tr>
                 ))}
              </tbody>
           </table>
           <p className="text-[10px] font-bold text-red-600 mt-1 italic">*공구류 등 반입 필요시에는 '반입공구 목록' 작성, 첨부 바랍니다.</p>
        </div>

        {/* 3. 인솔자 정보 */}
        <div className="mb-8">
           <h3 className="text-lg font-black mb-3">3. 인솔자 정보</h3>
           <table className="w-full border-collapse border border-black text-center text-xs">
              <thead>
                 <tr className="bg-white font-bold h-10 border-b border-black">
                    <th className="border-r border-black px-1 w-[15%]">성명</th>
                    <th className="border-r border-black px-1 w-[20%]">소속</th>
                    <th className="border-r border-black px-1 w-[25%]">연락처</th>
                    <th className="border-r border-black px-1 w-[25%]">정규출입증 출입구역</th>
                    <th className="px-1 w-[15%]">비고</th>
                 </tr>
              </thead>
              <tbody>
                 {(() => {
                    const escorts = [...(app.escorts || [])];
                    while (escorts.length < 5) escorts.push({ name: '', company: '', phone: '', regularBadgeZone: '', remarks: '' } as any);
                    return escorts.slice(0, 5).map((e, i) => (
                       <tr key={i} className="h-9 border-b border-black last:border-0">
                          <td className="border-r border-black px-1 font-bold">{e.name}</td>
                          <td className="border-r border-black px-1">{e.company || '스위스포트코리아'}</td>
                          <td className="border-r border-black px-1">{e.phone}</td>
                          <td className="border-r border-black px-1">{e.regularBadgeZone || 'F'}</td>
                          <td className="px-1">{e.remarks}</td>
                       </tr>
                    ));
                 })()}
              </tbody>
           </table>
        </div>

        {/* 4. 보호구역 출입 시 주의사항 */}
        <div className="mb-12">
           <h3 className="text-sm font-black mb-2 px-1">4. 보호구역 출입 시 주의사항</h3>
           <ol className="text-[9.5px] leading-relaxed space-y-0.5 text-slate-800 list-decimal pl-4 pr-2 font-medium">
              <li>방문 신청 인원은 인천국제공항 출입증을 소유하고 있으며, F 구역의 출입이 허가된 자이어야 합니다.</li>
              <li>방문증 소지자의 출입구역이 F만 있는 경우 창고로 직접 출입이 가능하나, F구역 외의 지역을 함께 신청한 경우 반드시 인천공항공사가 운영하는 초소를(G5 등) 통하여 진/출입 해야 합니다.</li>
              <li>신청 정보와 실제 출입자 정보가 일치하지 않을 경우 출입이 제한됩니다.</li>
              <li>정규출입증을 소지하고 있는 직원은 스위스포트 창고내 방문을 위하여 평일 09:00~17:30 사이에 스위스포트 3층 총무보안실로 방문하시어 스위스포트 출입관리 시스템에 등록해 주시기 바랍니다.</li>
              <li>최종 출입 후 3개월 이내에 창고 방문 기록이 없을 경우 출입증시스템에 등록은 말소되니 출입 가능여부 확인하시기 바랍니다.</li>
              <li>안전을 위하여 방문자 안전조끼, 안전화 착용은 필수입니다.</li>
              <li>창고 내 안전사고가 발생하지 않도록 조업 현장 직원과 특수경비 직원의 안내에 잘 따라 주시기 바랍니다.</li>
              <li>스위스포트 창고 내 허가되지 않은 촬영은 불가합니다.</li>
           </ol>
        </div>

        {/* Footer Confirmation Section */}
        <div className="mt-8 flex flex-col items-center">
           <div className="w-full flex justify-between items-end mb-16 px-4">
              <p className="text-lg font-black">출입신청자(인솔자)</p>
              <p className="text-xl font-black tracking-tighter">본인은 상기 내용이 사실과 틀림이 없음을 확인합니다.</p>
           </div>
           
           <div className="flex flex-col items-center mb-16">
              <div className="inline-flex gap-4 text-3xl font-bold font-serif mb-12">
                <span>2026년</span>
                <span>{new Date(app.createdAt?.seconds * 1000 || Date.now()).getMonth() + 1}월</span>
                <span>{new Date(app.createdAt?.seconds * 1000 || Date.now()).getDate()}일</span>
              </div>
              <div className="flex items-center gap-10">
                 <p className="text-3xl font-black">성 명 :</p>
                 <span className="text-4xl font-black tracking-widest min-w-[200px] border-b border-black pb-1 text-center">{app.applicantName || visitors[0]?.name || '__________'}</span>
                 <p className="text-sm font-bold text-slate-400 italic">(서명 또는 날인)</p>
              </div>
           </div>

           <div className="flex items-center gap-6 relative">
              <h2 className="text-4xl font-black tracking-[0.1em] text-slate-900 italic lowercase">
                 swissport korea <span className="not-italic">총무보안팀</span>
              </h2>
              <span className="text-3xl font-bold">(인)</span>
              
              {app.status === 'approved' && (
                <ApprovalSeal size="lg" isPdf={isPdf} className="absolute -right-20 -top-8 rotate-[-10deg] opacity-90" />
              )}
           </div>
        </div>
      </div>
    </div>
  );
};

const ToolDocument = ({ app, id, className, isPdf = false }: { app: EntryApplication, id?: string, className?: string, isPdf?: boolean }) => {
  const tools = app.tools || [];
  
  // Ensure we show at least 25 rows
  const toolRows = [...tools];
  while (toolRows.length < 25) {
    toolRows.push({ name: '', quantity: 0, unit: '', spec: '', note: '' } as any);
  }

  return (
    <div 
      className={cn(
        "bg-white text-[#1A1A1A] relative pdf-export-container font-sans overflow-hidden", 
        !isPdf && "border p-12 min-h-[1200px]",
        isPdf && "pdf-page",
        className
      )} 
      id={id}
    >
      <div className="relative z-20 px-[5mm] pt-[10mm]">
        {/* Header Logo */}
        <div className="flex justify-start mb-6">
           <div className="flex items-center gap-1.5 grayscale contrast-125">
             <span className="font-black text-2xl tracking-tighter italic lowercase leading-none">swissport</span>
             <div className="w-8 h-8 bg-black transform skew-x-[-20deg] rounded-sm flex items-center justify-center">
                <Globe size={16} className="text-white" />
             </div>
           </div>
           <h1 className="ml-8 text-3xl font-black tracking-tighter">화물창고 공구류 반입 신청서</h1>
        </div>

        {/* Table */}
        <div className="mb-10">
           <table className="w-full border-collapse border border-black text-center text-[11px]">
              <thead>
                 <tr className="bg-white font-bold h-9 border-b border-black">
                    <th className="border-r border-black px-1 w-[8%]">No.</th>
                    <th className="border-r border-black px-1 w-[32%]">품명</th>
                    <th className="border-r border-black px-1 w-[10%]">수량</th>
                    <th className="border-r border-black px-1 w-[10%]">단위</th>
                    <th className="border-r border-black px-1 w-[25%]">규격(길이/용량)</th>
                    <th className="px-1 w-[15%]">비고</th>
                 </tr>
              </thead>
              <tbody>
                 <tr className="h-8 border-b border-black text-slate-400 italic">
                    <td className="border-r border-black">예)</td>
                    <td className="border-r border-black">전동 드라이버</td>
                    <td className="border-r border-black">1</td>
                    <td className="border-r border-black">EA</td>
                    <td className="border-r border-black">6.35mm X 65mm</td>
                    <td></td>
                 </tr>
                 {toolRows.slice(0, 25).map((t, i) => (
                    <tr key={i} className="h-8 border-b border-black last:border-0">
                       <td className="border-r border-black">{i + 1}</td>
                       <td className="border-r border-black font-bold text-left px-4">{t.name}</td>
                       <td className="border-r border-black">{t.quantity || ''}</td>
                       <td className="border-r border-black">{t.unit}</td>
                       <td className="border-r border-black text-left px-2">{t.spec}</td>
                       <td className="text-left px-2">{t.note}</td>
                    </tr>
                 ))}
              </tbody>
           </table>
        </div>

        {/* Footer */}
        <div className="mt-16 flex flex-col items-center">
           <p className="text-xl font-black mb-16">상기 공구류에 대하여 스위스포트코리아 화물창고 반입을 승인합니다.</p>
           
           <div className="inline-flex gap-8 text-3xl font-bold font-serif mb-16 tracking-widest">
              <span>년</span>
              <span>월</span>
              <span>일</span>
           </div>

           <div className="flex items-center gap-6 relative">
              <h2 className="text-3xl font-black tracking-[0.1em] text-slate-900">
                 스위스포트코리아㈜
              </h2>
              <span className="text-3xl font-bold">(인)</span>
              
              {app.status === 'approved' && (
                <ApprovalSeal size="lg" isPdf={isPdf} className="absolute -right-20 -top-8 rotate-[-10deg] opacity-90" />
              )}
           </div>
        </div>
      </div>
    </div>
  );
};

const ProfileView = ({ userProfile, adminId }: { userProfile: any, adminId: string | null }) => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminId) {
      alert('아이디 로그인이 필요합니다 (Google 로그인은 해당 서비스에서 변경해주세요).');
      return;
    }
    if (newPassword !== confirmPassword) {
      alert('비밀번호가 일치하지 않습니다.');
      return;
    }
    if (newPassword.length < 4) {
      alert('비밀번호는 최소 4자리 이상이어야 합니다.');
      return;
    }

    try {
      setIsUpdating(true);
      await setDoc(doc(db, 'credentials', adminId.toLowerCase()), { password: newPassword }, { merge: true });
      alert('비밀번호가 성공적으로 변경되었습니다.');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      alert('변경 실패: ' + err.message);
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

const AdminsManagementView = () => {
  const [usersSnapshot, usersLoading] = useCollection(query(collection(db, 'users'), orderBy('updatedAt', 'desc')));
  const [credsSnapshot, credsLoading] = useCollection(query(collection(db, 'credentials'), orderBy('createdAt', 'desc')));
  
  const allProfiles = usersSnapshot?.docs.map(doc => ({ id: doc.id, ...doc.data() as any })) || [];
  const allCredentials = credsSnapshot?.docs.map(doc => ({ id: doc.id, ...doc.data() as any })) || [];
  
    // Create a unified list of accounts
    // Key = adminId (lowercase)
    const unifiedAccounts = React.useMemo(() => {
      const accMap = new Map();

      // 1. Initialize with authorized system accounts
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

      // 2. Add/Merge all registered credentials
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
          // This is a "stray" credential not in authorized list
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

      // 3. Add/Merge active profiles (UIDs)
      allProfiles.forEach(prof => {
        const emailPrefix = prof.email?.split('@')[0]?.toLowerCase();
        const adminIdLower = prof.adminId?.toLowerCase();
        
        // Match logic: try to find a credential/system entry that fits this profile
        let matchedKey = null;
        
        if (adminIdLower && accMap.has(adminIdLower)) matchedKey = adminIdLower;
        else if (emailPrefix && accMap.has(emailPrefix)) matchedKey = emailPrefix;
        else {
          // Search all existing entries for a matching adminId or email
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
            profileId: prof.id, // The UID
            adminId: existing.adminId 
          });
        } else {
          // This profile is a complete orphan (no matching credential)
          // We show it as 'stray' so it can be managed
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

  // New User Form State
  const [showAddForm, setShowAddForm] = useState(false);
  const [newUserId, setNewUserId] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserName, setNewUserName] = useState('');
  const [newUserRole, setNewUserRole] = useState('manager');
  const [isCreating, setIsCreating] = useState(false);

  const handleRoleChange = async (account: any, newRole: string) => {
    try {
      setIsUpdating(account.adminId);
      
      // 1. Update Credential
      if (account.adminId) {
        await setDoc(doc(db, 'credentials', account.adminId.toLowerCase()), { 
          role: newRole 
        }, { merge: true });
      }

      // 2. Update Active Profile(s)
      if (account.profileId) {
        await setDoc(doc(db, 'users', account.profileId), { 
          role: newRole, 
          updatedAt: serverTimestamp() 
        }, { merge: true });
      }

      alert('해당 계정의 권한이 성공적으로 변경되었습니다.');
    } catch (err: any) {
      console.error("Role update error:", err);
      alert('권한 변경에 실패했습니다: ' + err.message);
    } finally {
      setIsUpdating(null);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserId || !newUserPassword || !newUserName) {
      alert('모든 필드를 입력해 주세요.');
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

      alert('새로운 시스템 계정이 생성되었습니다.');
      setShowAddForm(false);
      setNewUserId('');
      setNewUserPassword('');
      setNewUserName('');
    } catch (err: any) {
      console.error("User creation error:", err);
      alert('계정 생성 실패: ' + err.message);
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteAccount = async (account: any) => {
    const identification = account.adminId || account.name || account.id || '알 수 없는 계정';
    if (!confirm(`'${identification}' 계정을 정말 삭제하시겠습니까? 관련 모든 권한 및 로그인 기록이 사라집니다.`)) return;
    
    try {
      setIsUpdating(account.id || account.profileId);
      
      // 1. Delete Credential document
      // We also try to delete based on the normalized ID (lowercase)
      const possibleIds = [account.id?.toLowerCase(), account.adminId?.toLowerCase(), account.profileId?.toLowerCase()].filter(Boolean);
      
      for (const id of possibleIds) {
        if (id === 'cloudkiss90' || id === 'cloud-admin') continue;
        console.log("Cleanup attempt (Cred/User):", id);
        await deleteDoc(doc(db, 'credentials', id));
        await deleteDoc(doc(db, 'users', id));
      }

      // 2. Specific Profile delete (UID)
      if (account.profileId && account.profileId !== 'cloudkiss90') {
        console.log("Cleanup attempt (UID):", account.profileId);
        await deleteDoc(doc(db, 'users', account.profileId));
      }
      
      alert('계정이 성공적으로 삭제되었습니다.');
    } catch (err: any) {
      console.error("Delete error:", err);
      alert('삭제 중 오류가 발생했습니다: ' + err.message);
    } finally {
      setIsUpdating(null);
    }
  };

  const handleSystemInitialize = async () => {
    if (!confirm('경고: 시스템을 즉시 초기화하시겠습니까? 최고 관리자를 제외한 모든 이용자 프로필과 계정 정보가 DB에서 영구 삭제됩니다.')) return;
    
    try {
      setIsUpdating('system_init');
      
      // Batch-like deletion
      const deletePromises = [];

      // 1. Delete all credentials except super admin
      for (const cred of allCredentials) {
        if (cred.id.toLowerCase() !== 'cloudkiss90') {
           deletePromises.push(deleteDoc(doc(db, 'credentials', cred.id)));
        }
      }

      // 2. Delete all profiles except super admin
      const superAdminEmail = 'cloudkiss90@gmail.com';
      for (const prof of allProfiles) {
        if (prof.email !== superAdminEmail && prof.id !== 'cloudkiss90') {
           deletePromises.push(deleteDoc(doc(db, 'users', prof.id)));
        }
      }

      await Promise.all(deletePromises);
      alert('전체 초기화가 완료되었습니다.');
    } catch (err: any) {
      console.error("System init error:", err);
      alert('초기화 중 오류 발생: ' + err.message);
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

const Dashboard = () => {
  const [user, loading] = useAuthState(auth);
  const [loginError, setLoginError] = useState<React.ReactNode>('');
  const [adminId, setAdminId] = useState<string | null>(localStorage.getItem('adminId'));
  const [userProfile, profileLoading] = useDocumentData(user ? doc(db, 'users', user.uid) : null);
  const [view, setView] = useState<'calendar' | 'applications' | 'create' | 'admins' | 'profile'>('calendar');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [selectedApp, setSelectedApp] = useState<EntryApplication | null>(null);
  const [currentDate, setCurrentMonth] = useState(new Date());
  const [detailViewMode, setDetailViewMode] = useState<'summary' | 'entry' | 'tools'>('entry');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [confirmApproveId, setConfirmApproveId] = useState<string | null>(null);
  const [confirmRejectId, setConfirmRejectId] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [editingVisitor, setEditingVisitor] = useState<number | null>(null);
  const [editingEscort, setEditingEscort] = useState<number | null>(null);
  const [editingTool, setEditingTool] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;
  const [newApp, setNewApp] = useState<Partial<EntryApplication>>({
    visitors: [],
    tools: [],
    escorts: [],
    status: 'pending'
  });

  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [isStamping, setIsStamping] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const notificationRef = useRef<HTMLDivElement>(null);

  // RBAC Helpers
  const isSuperAdmin = user?.email === 'cloudkiss90@gmail.com' || userProfile?.role === 'super_admin';
  const userRole = userProfile?.role || (isSuperAdmin ? 'super_admin' : 'staff');
  const roleLevel = userRole === 'super_admin' ? 1 : userRole === 'manager' ? 2 : 3;
  
  const canManageAdmins = roleLevel === 1;
  const canWriteData = roleLevel <= 2;
  const isManager = roleLevel <= 2;
  
  const roleLabel = userRole === 'super_admin' ? '최고 관리자' : userRole === 'manager' ? '관리자' : '보안요원';

  const appsQuery = query(collection(db, 'applications'), orderBy('createdAt', 'desc'), limit(50));
  const [appsSnapshot, appsLoading, appsError] = useCollection(appsQuery);
  const applications = appsSnapshot?.docs.map(doc => ({ id: doc.id, ...doc.data() as any })) ?? [];

  const handleAdminLogin = async (id: string) => {
    const lowerId = id.toLowerCase();
    setAdminId(lowerId);
    localStorage.setItem('adminId', lowerId);
    
    // Auth state is managed by useAuthState, and Dashboard components 
    // will pick up the profile from the 'users' collection automatically.
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setAdminId(null);
      localStorage.removeItem('adminId');
    } catch (err) {
      console.error("Logout error:", err);
    }
  };

  // Sync state from Firebase Auth on mount or change
  useEffect(() => {
    if (user && !adminId) {
      const email = user.email || '';
      const matchedAdmin = ADMIN_IDS.find(id => email.toLowerCase() === `${id.toLowerCase()}@spk.com`);
      if (matchedAdmin) {
        setAdminId(matchedAdmin);
        localStorage.setItem('adminId', matchedAdmin);
      }
    }
  }, [user]);

  // Ensure user profile exists for authenticated users
  useEffect(() => {
    const updateProfile = async () => {
      if (user && !profileLoading) {
        const email = user.email || '';
        const emailLower = email.toLowerCase();
        const isSuperAdminUser = emailLower === 'cloudkiss90' || emailLower === 'cloudkiss90@gmail.com';
        const isSpkgase = adminId === 'spkgase' || emailLower === 'spkgase@spk.com';
        const isWu001 = adminId === 'wu001' || emailLower === 'wu001@spk.com';
        
        let targetRole = 'staff';
        if (isSuperAdminUser) targetRole = 'super_admin';
        else if (isSpkgase) targetRole = 'manager';
        else if (isWu001) targetRole = 'staff'; 
        
        if (userProfile?.role !== targetRole) {
          try {
            await setDoc(doc(db, 'users', user.uid), {
              name: adminId ? (adminId === 'spkgase' ? '관리자 (spkgase)' : '보안요원 (wu001)') : (isSuperAdminUser ? '최고 관리자' : user.displayName || email.split('@')[0]),
              adminId: adminId || null,
              email: email || null,
              role: targetRole,
              updatedAt: serverTimestamp()
            }, { merge: true });
          } catch (err) {
            console.error("Profile sync error:", err);
          }
        }
      }
    };
    updateProfile();
  }, [user, adminId, userProfile, profileLoading]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setIsNotificationsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const notifications = [
    ...(applications?.filter(app => app.status === 'pending').map(app => ({
      id: `app-${app.id}`,
      title: '신규 출입 신청',
      description: `${app.visitors?.[0]?.name || '익명'} 외 ${app.visitors?.length || 0}명`,
      time: app.createdAt,
      type: 'application',
      app: app
    })) || [])
  ].sort((a, b) => (b.time?.seconds || 0) - (a.time?.seconds || 0)).slice(0, 10);

  // If auth is still loading, wait
  if (loading) return (
    <div className="h-screen w-screen flex items-center justify-center bg-white">
      <SwissportLogo size="lg" className="animate-pulse" />
    </div>
  );

  // If not logged in, show login page
  if (!user) {
    return (
      <>
        <AdminLoginPage 
          onLogin={handleAdminLogin} 
          onError={(err) => setLoginError(err)}
        />
        {loginError && (
          <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[100] p-5 bg-white border-2 border-red-100 text-red-600 rounded-[2rem] shadow-[0_20px_50px_rgba(227,6,19,0.15)] max-w-sm w-[90%] flex items-center gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center shrink-0">
              <AlertCircle size={24} />
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="font-black text-xs uppercase tracking-wider opacity-50 mb-0.5">AUTH_SYSTEM_ERROR</p>
              <div className="text-[13px] font-bold leading-tight break-words">{loginError}</div>
            </div>
            <button onClick={() => setLoginError('')} className="w-10 h-10 flex items-center justify-center hover:bg-slate-50 rounded-xl transition-colors">
              <X size={18} />
            </button>
          </div>
        )}
      </>
    );
  }

  const filteredApps = applications?.filter(app => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    const visitorMatch = app.visitors?.some((v: any) => v.name?.toLowerCase().includes(query) || v.company?.toLowerCase().includes(query));
    const toolMatch = app.tools?.some((t: any) => t.name?.toLowerCase().includes(query));
    const dateMatch = app.applyDate?.includes(query);
    return visitorMatch || toolMatch || dateMatch;
  }) || [];

  const totalPages = Math.ceil(filteredApps.length / ITEMS_PER_PAGE);
  const paginatedApps = filteredApps.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  // Calendar View Component
  const CalendarView = () => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);

    const days = eachDayOfInterval({
      start: startDate,
      end: endDate,
    });

    const nextMonth = () => setCurrentMonth(addMonths(currentDate, 1));
    const prevMonth = () => setCurrentMonth(subMonths(currentDate, 1));

    // Normalize date strings (e.g. "2026년 5월 17일" → "2026-05-17")
    const normalizeDate = (raw: string): string => {
      if (!raw) return '';
      const korean = raw.match(/(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일/);
      if (korean) {
        const [, y, m, d] = korean;
        return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
      }
      return raw.slice(0, 10); // already ISO or truncate to date part
    };

    // Group apps by date (using visitDate of the first visitor or applyDate)
    const appsByDate: Record<string, EntryApplication[]> = {};
    applications.forEach(app => {
      const raw = app.visitors?.[0]?.visitDate || app.applyDate;
      const dateKey = normalizeDate(raw);
      if (dateKey) {
        if (!appsByDate[dateKey]) {
          appsByDate[dateKey] = [];
        }
        appsByDate[dateKey].push(app);
      }
    });

    return (
      <div className="bg-white rounded-[1.5rem] md:rounded-[2.5rem] shadow-xl border border-slate-100 overflow-hidden flex flex-col h-full min-h-[500px] md:min-h-[700px]">
        {/* Calendar Header */}
        <div className="p-4 md:p-8 border-b border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between bg-slate-50/50 gap-4">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 md:w-12 md:h-12 bg-[#1A1A1A] rounded-xl md:rounded-2xl flex items-center justify-center text-white shadow-lg">
              <Calendar size={20} />
            </div>
            <div>
              <h2 className="text-lg md:text-xl font-black text-[#1A1A1A] tracking-tight">
                {format(currentDate, 'yyyy년 M월', { locale: ko })}
              </h2>
              <p className="text-[9px] md:text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Entry Schedule Management</p>
            </div>
          </div>

          <div className="flex items-center gap-1 md:gap-2 bg-white p-1 rounded-xl md:rounded-2xl border border-slate-200">
            <button 
              onClick={prevMonth}
              className="p-2 md:p-2.5 hover:bg-slate-50 rounded-lg md:rounded-xl transition-all text-slate-400 hover:text-[#E30613]"
            >
              <ChevronLeft size={18} />
            </button>
            <button 
              onClick={() => setCurrentMonth(new Date())}
              className="px-3 md:px-4 py-1.5 md:py-2 text-[10px] md:text-[11px] font-black uppercase tracking-wider text-slate-600 hover:bg-slate-50 rounded-lg md:rounded-xl"
            >
              오늘
            </button>
            <button 
              onClick={nextMonth}
              className="p-2 md:p-2.5 hover:bg-slate-50 rounded-lg md:rounded-xl transition-all text-slate-400 hover:text-[#E30613]"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>

        {/* Days of week */}
        <div className="grid grid-cols-7 border-b border-slate-100 bg-white">
          {['일', '월', '화', '수', '목', '금', '토'].map((day, i) => (
            <div 
              key={day} 
              className={cn(
                "py-3 md:py-4 text-center text-[9px] md:text-[11px] font-black uppercase tracking-widest border-r border-slate-50 last:border-0",
                i === 0 ? "text-red-500" : i === 6 ? "text-blue-500" : "text-slate-400"
              )}
            >
              <span className="hidden sm:inline">{day}요일</span>
              <span className="inline sm:hidden">{day}</span>
            </div>
          ))}
        </div>

        {/* Calendar Body */}
        <div className="flex-1 grid grid-cols-7 auto-rows-fr bg-slate-50/30 overflow-y-auto">
          {days.map((day, idx) => {
            const dateKey = format(day, 'yyyy-MM-dd');
            const dayApps = appsByDate[dateKey] || [];
            const isSelectedMonth = isSameMonth(day, monthStart);
            
            return (
              <div 
                key={dateKey} 
                className={cn(
                  "min-h-[80px] md:min-h-[120px] p-1.5 md:p-3 border-r border-b border-slate-100 bg-white hover:bg-slate-50/50 transition-colors group flex flex-col relative",
                  !isSelectedMonth && "bg-slate-50/10 opacity-30 pointer-events-none"
                )}
              >
                <div className="flex justify-between items-center mb-1 md:mb-2">
                  <span className={cn(
                    "text-[10px] md:text-xs font-black w-5 h-5 md:w-7 md:h-7 flex items-center justify-center rounded-full transition-all",
                    isToday(day) ? "bg-[#E30613] text-white shadow-md shadow-red-500/20" : "text-slate-500 group-hover:text-slate-900"
                  )}>
                    {format(day, 'd')}
                  </span>
                  {dayApps.length > 0 && (
                    <span className="text-[8px] md:text-[9px] font-black text-slate-400 bg-slate-100 px-1 md:px-1.5 py-0.5 rounded">
                      {dayApps.length}
                    </span>
                  )}
                </div>

                <div className="flex-1 flex flex-col gap-0.5 md:gap-1 overflow-y-auto max-h-[60px] md:max-h-[100px] no-scrollbar">
                  {dayApps.slice(0, 3).map((app) => (
                    <motion.div
                      key={app.id}
                      whileHover={{ x: 3 }}
                      onClick={() => { setSelectedApp(app); setDetailViewMode('entry'); }}
                      className={cn(
                        "text-[8px] md:text-[10px] p-0.5 md:p-1.5 rounded-md md:rounded-lg border-l-2 cursor-pointer shadow-sm truncate font-bold",
                        app.status === 'approved' 
                          ? "bg-emerald-50 border-emerald-500 text-emerald-700" 
                          : app.status === 'pending' 
                            ? "bg-orange-50 border-orange-400 text-orange-700" 
                            : "bg-red-50 border-red-500 text-red-700"
                      )}
                    >
                      {app.visitors?.[0]?.name || '익명'}
                    </motion.div>
                  ))}
                  {dayApps.length > 3 && (
                    <div className="text-[8px] text-slate-400 font-bold pl-1">
                      +{dayApps.length - 3} 더보기
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const handleAddVisitor = () => {
    setNewApp(prev => ({
      ...prev,
      visitors: [...(prev.visitors || []), { 
        name: '', 
        birthDate: '', 
        company: '', 
        phone: '', 
        badgeType: '임시', 
        receiptNo: '', 
        accessZone: '창고', 
        visitDate: new Date().toISOString().split('T')[0], 
        purpose: '업무', 
        remarks: '' 
      }]
    }));
  };

  // Handle PDF Upload and AI Analysis
  const processFiles = async (files: FileList | File[]) => {
    if (!files || files.length === 0) return;

    setView('create'); // Switch to create view immediately so user sees the progress
    setIsAnalyzing(true);
    console.log("Starting batch processing for", files.length, "files");
    
    try {
      const results = await Promise.all(
        Array.from(files).map(async (file: File) => {
          console.log(`Processing file: ${file.name} (${file.size} bytes)`);
          return new Promise<{ visitors: any[], tools: any[], escorts: any[], signatureImage?: string, applicantName?: string }>((resolve, reject) => {
            const mimeType = file.type || "application/pdf";
            const reader = new FileReader();
            
            // Set a safety timeout for file reading
            const timeoutId = setTimeout(() => {
              reject(new Error(`File read timeout for ${file.name}`));
            }, 30000);

            reader.readAsDataURL(file);
            reader.onload = async () => {
              clearTimeout(timeoutId);
              try {
                const base64Data = (reader.result as string).split(',')[1];
                
                console.log(`Sending ${file.name} to AI...`);
                const result = await aiService.analyzeApplicationPdf(base64Data, mimeType);
                resolve({ ...result });
              } catch (err) {
                console.error(`AI analysis failed for ${file.name}:`, err);
                reject(err);
              }
            };
            reader.onerror = () => {
              clearTimeout(timeoutId);
              reject(new Error(`File read error for ${file.name}`));
            };
          });
        })
      );

      console.log("All files analyzed. Merging results...");

      // Merge all results
      setNewApp(prev => {
        const allVisitors = [...(prev.visitors || [])];
        const allTools = [...(prev.tools || [])];
        const allEscorts = [...(prev.escorts || [])];
        let mergedSignature = prev.signatureImage || '';
        let mergedApplicantName = prev.applicantName || '';
        
        results.forEach(res => {
          if (res.visitors) allVisitors.push(...res.visitors);
          if (res.tools) allTools.push(...res.tools);
          if (res.escorts) allEscorts.push(...res.escorts);
          if (res.signatureImage && !mergedSignature) mergedSignature = res.signatureImage;
          if (res.applicantName && !mergedApplicantName) mergedApplicantName = res.applicantName;
        });

        return {
          ...prev,
          visitors: allVisitors,
          tools: allTools,
          escorts: allEscorts,
          signatureImage: mergedSignature,
          applicantName: mergedApplicantName
        };
      });

    } catch (err: any) {
      console.error("Processing Error:", err);
      if (err.message?.includes("timeout")) {
        alert("분석 시간이 너무 오래 걸립니다. 파일 용량을 줄이거나 다시 시도해주세요.");
      } else {
        alert("신청서 분석 중 오류가 발생했습니다. 파일 형식을 확인해주세요.");
      }
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files).filter(f => f.type === 'application/pdf');
      if (files.length > 0) setUploadedFiles(files);
      processFiles(e.target.files);
      e.target.value = '';
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const files = Array.from(e.dataTransfer.files).filter(f => f.type === 'application/pdf');
      if (files.length > 0) setUploadedFiles(files);
      processFiles(e.dataTransfer.files);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const submitApplication = async () => {
    if (!user) return;
    const finalApp: Omit<EntryApplication, 'id'> = {
      applyDate: new Date().toISOString().split('T')[0],
      visitors: newApp.visitors || [],
      tools: newApp.tools || [],
      escorts: newApp.escorts || [],
      status: 'pending',
      applicantId: user.uid,
      applicantEmail: user.email || '',
      applicantName: newApp.applicantName || user.displayName || '',
      signatureImage: newApp.signatureImage || ''
    };

    try {
      await applicationService.createApplication(finalApp);
      setView('applications');
      setNewApp({ visitors: [], tools: [], escorts: [], status: 'pending' });
      setUploadedFiles([]);
    } catch (err: any) {
      console.error('신청서 제출 실패:', err);
      const msg = err?.message || String(err);
      if (msg.includes('permission-denied') || msg.includes('insufficient permissions')) {
        alert('제출 권한이 없습니다. 관리자에게 문의하세요.');
      } else {
        alert('제출에 실패했습니다. 네트워크 상태를 확인하고 다시 시도해주세요.');
      }
    }
  };

  const handleApprove = (appId: string) => {
    if (!appId) return;
    setConfirmApproveId(appId);
  };

  const performApprove = async (appId: string) => {
    try {
      setIsProcessing(true);
      if (!user) {
        alert('시스템 인증이 만료되었습니다. 다시 로그인해주세요.');
        handleLogout();
        return;
      }
      
      await applicationService.approveApplication(appId, adminId || user.uid);
      setConfirmApproveId(null);
      alert('신청서가 승인되었습니다.');
      
      if (selectedApp?.id === appId) {
        setSelectedApp(prev => prev ? { ...prev, status: 'approved' } : null);
      }
    } catch (err: any) {
      console.error("Approve failed:", err);
      let errorMsg = "승인 처리에 실패했습니다. 권한을 확인해주세요.";
      try {
        const errStr = String(err.message || err);
        if (errStr.includes('{')) {
          const parsed = JSON.parse(errStr.substring(errStr.indexOf('{')));
          if (parsed.error && (parsed.error.includes('permission-denied') || parsed.error.includes('insufficient permissions'))) {
            errorMsg = "승인 권한이 없습니다. 관리자 계정으로 로그인해주세요.";
          }
        }
      } catch (e) {}
      alert(errorMsg);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = (appId: string) => {
    if (!appId) return;
    setConfirmRejectId(appId);
  };

  const performRejectOrCancel = async (appId: string) => {
    try {
      setIsProcessing(true);
      if (!user) {
        alert('시스템 인증이 만료되었습니다. 다시 로그인해주세요.');
        handleLogout();
        return;
      }

      // If it was already approved, "Cancel Approval" often means resetting it to pending
      const currentApp = applications.find(a => a.id === appId);
      if (currentApp?.status === 'approved') {
        await applicationService.updateApplicationStatus(appId, 'pending');
        alert('승인이 취소되어 대기 상태로 변경되었습니다.');
      } else {
        await applicationService.rejectApplication(appId, adminId || user.uid);
        alert('반려 처리되었습니다.');
      }
      
      setConfirmRejectId(null);
      
      if (selectedApp?.id === appId) {
        setSelectedApp(prev => prev ? { ...prev, status: currentApp?.status === 'approved' ? 'pending' : 'rejected' } : null);
      }
    } catch (err: any) {
      console.error("Reject failed:", err);
      let errorMsg = "처리에 실패했습니다. 권한을 확인해주세요.";
      try {
        const errStr = String(err.message || err);
        if (errStr.includes('{')) {
          const parsed = JSON.parse(errStr.substring(errStr.indexOf('{')));
          if (parsed.error && (parsed.error.includes('permission-denied') || parsed.error.includes('insufficient permissions'))) {
            errorMsg = "처리 권한이 없습니다. 관리자 계정으로 로그인해주세요.";
          }
        }
      } catch (e) {}
      alert(errorMsg);
    } finally {
      setIsProcessing(false);
    }
  };

  const performDeletion = async (appId: string) => {
    try {
      setIsDeleting(true);
      console.log(`DEBUG: Starting performDeletion for ${appId}...`);
      await applicationService.deleteApplication(appId);
      console.log(`DEBUG: Deletion of ${appId} successful.`);
      
      if (selectedApp?.id === appId) {
        setSelectedApp(null);
      }
      setConfirmDeleteId(null);
      alert('신청서가 삭제되었습니다.');
    } catch (err: any) {
      console.error("DEBUG: Deletion failed:", err);
      let errorMsg = String(err.message || err);
      try {
        if (errorMsg.includes('{')) {
          const parsed = JSON.parse(errorMsg.substring(errorMsg.indexOf('{')));
          if (parsed.error && (parsed.error.includes('permission-denied') || parsed.error.includes('insufficient permissions'))) {
            errorMsg = "삭제 권한이 없습니다. (관리자 또는 본인만 가능)";
          }
        }
      } catch (e) {}
      alert(errorMsg);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCancelApplication = (appId: string) => {
    try {
      if (!appId) {
        alert('삭제할 신청서 ID가 없습니다.');
        return;
      }
      if (!user) {
        alert('시스템 인증이 만료되었습니다. 다시 로그인해주세요.');
        handleLogout();
        return;
      }

      console.log("DEBUG: handleCancelApplication triggered for ID:", appId);
      setConfirmDeleteId(appId);
    } catch (err: any) {
      console.error("Delete failed:", err);
      let message = String(err.message || err);
      
      // Try to parse JSON error from handleFirestoreError
      try {
        const parsed = JSON.parse(message);
        if (parsed.error && parsed.error.includes('permission-denied')) {
          alert('삭제 권한이 없습니다. 관리자 권한을 확인해주세요.');
          return;
        }
        message = parsed.error || message;
      } catch (e) {
        // Not JSON
      }

      alert('신청서 삭제 중 오류가 발생했습니다: ' + message);
    }
  };

  const handleRemoveVisitor = (index: number) => {
    setNewApp(prev => ({
      ...prev,
      visitors: prev.visitors?.filter((_, i) => i !== index)
    }));
    if (editingVisitor === index) setEditingVisitor(null);
    else if (editingVisitor !== null && editingVisitor > index) setEditingVisitor(editingVisitor - 1);
  };

  const handleAddEscort = () => {
    setNewApp(prev => ({
      ...prev,
      escorts: [...(prev.escorts || []), { 
        name: '', 
        company: '', 
        phone: '', 
        regularBadgeZone: '창고',
        remarks: '' 
      }]
    }));
  };

  const handleRemoveEscort = (index: number) => {
    setNewApp(prev => ({
      ...prev,
      escorts: prev.escorts?.filter((_, i) => i !== index)
    }));
    if (editingEscort === index) setEditingEscort(null);
    else if (editingEscort !== null && editingEscort > index) setEditingEscort(editingEscort - 1);
  };

  const handleAddTool = () => {
    setNewApp(prev => ({
      ...prev,
      tools: [...(prev.tools || []), { 
        name: '', 
        quantity: 1, 
        unit: 'EA', 
        spec: '',
        note: '' 
      }]
    }));
  };

  const handleRemoveTool = (index: number) => {
    setNewApp(prev => ({
      ...prev,
      tools: prev.tools?.filter((_, i) => i !== index)
    }));
    if (editingTool === index) setEditingTool(null);
    else if (editingTool !== null && editingTool > index) setEditingTool(editingTool - 1);
  };

  const handleUpdateVisitor = (index: number, updates: Partial<Visitor>) => {
    setNewApp(prev => ({
      ...prev,
      visitors: prev.visitors?.map((v, i) => i === index ? { ...v, ...updates } : v)
    }));
  };

  const handleUpdateEscort = (index: number, updates: Partial<any>) => {
    setNewApp(prev => ({
      ...prev,
      escorts: prev.escorts?.map((e, i) => i === index ? { ...e, ...updates } : e)
    }));
  };

  const handleUpdateTool = (index: number, updates: Partial<ToolItem>) => {
    setNewApp(prev => ({
      ...prev,
      tools: prev.tools?.map((t, i) => i === index ? { ...t, ...updates } : t)
    }));
  };

  return (
    <div className="flex h-screen w-full bg-white font-sans overflow-hidden">
      {/* Detail Modal */}
      <AnimatePresence>
        {selectedApp && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-[#1A1A1A]/40 backdrop-blur-sm"
            onClick={() => setSelectedApp(null)}
          >
            <motion.div 
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="bg-white w-full max-w-5xl max-h-[90vh] rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="p-4 md:p-8 border-b border-slate-100 flex flex-col md:flex-row items-center justify-between bg-slate-50/50 gap-6">
                <div className="flex items-center gap-4 w-full md:w-auto">
                  <div className={cn(
                    "w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl flex items-center justify-center shadow-sm shrink-0",
                    selectedApp.status === 'approved' ? "bg-emerald-500 text-white" : selectedApp.status === 'pending' ? "bg-orange-400 text-white" : "bg-red-500 text-white"
                  )}>
                    <FileText size={20} className="md:size-[24px]" />
                  </div>
                  <div>
                    <h2 className="text-lg md:text-xl font-black text-[#1A1A1A]">상세 정보</h2>
                    <p className="text-[9px] md:text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Personnel & Tool Registry System</p>
                  </div>
                </div>

                <div className="w-full md:w-auto overflow-x-auto no-scrollbar">
                  <div className="flex bg-white p-1 rounded-xl border border-slate-200 min-w-max">
                     {[
                       { id: 'summary', label: '요약', icon: LayoutGrid },
                       { id: 'entry', label: '신청서', icon: FileText },
                       { id: 'tools', label: '공구목록', icon: Wrench },
                     ].map((tab) => (
                       <button
                         key={tab.id}
                         onClick={() => setDetailViewMode(tab.id as any)}
                         className={cn(
                           "flex items-center gap-2 px-3 md:px-6 py-2 md:py-2.5 rounded-lg md:rounded-xl transition-all text-[9px] md:text-[11px] font-black uppercase tracking-wider",
                           detailViewMode === tab.id 
                             ? "bg-[#1A1A1A] text-white shadow-md font-black" 
                             : "text-slate-400 hover:text-[#1A1A1A] font-bold"
                         )}
                       >
                         <tab.icon size={12} className="md:size-[14px]" />
                         {tab.label}
                       </button>
                     ))}
                  </div>
                </div>

                <button onClick={() => setSelectedApp(null)} className="absolute top-4 right-4 md:static p-2 md:p-3 hover:bg-slate-100 rounded-full transition-colors">
                  <X size={20} className="text-slate-400" />
                </button>
              </div>

              {/* Modal Content - Scrollable */}
              <div className="flex-1 overflow-y-auto p-10 bg-slate-100/50">
                <div className="max-w-4xl mx-auto space-y-12">
                  {detailViewMode === 'summary' ? (
                    <div className="space-y-12">
                      {/* Summary Section (Existing modern style) */}
                      <div className="border-[3px] border-[#1A1A1A] p-8 relative overflow-hidden bg-white">
                        <div className="absolute top-0 right-0 p-4 border-l-2 border-b-2 border-[#1A1A1A] bg-slate-50">
                           <p className="text-[9px] font-black text-center mb-1">보안 확인</p>
                           <div className="w-16 h-16 border border-dashed border-slate-300 rounded flex items-center justify-center">
                              {selectedApp.status === 'approved' ? (
                                <ApprovalSeal size="sm" className="rotate-[-12deg]" />
                              ) : (
                                <span className="text-[8px] text-slate-300">STAMP</span>
                              )}
                           </div>
                        </div>
                        
                        <h3 className="text-2xl font-black text-center mb-10 tracking-widest uppercase italic">Warehouse Entry Permit</h3>
                        
                        <div className="grid grid-cols-4 border-2 border-[#1A1A1A] text-xs">
                           <div className="bg-slate-100 p-3 font-black border-r-2 border-[#1A1A1A] flex items-center">신청구분</div>
                           <div className="p-3 border-r-2 border-[#1A1A1A] flex items-center font-bold">임시출입 (공구포함)</div>
                           <div className="bg-slate-100 p-3 font-black border-r-2 border-[#1A1A1A] flex items-center">신청일자</div>
                           <div className="p-3 flex items-center font-bold">{selectedApp.applyDate}</div>
                           
                           <div className="bg-slate-100 p-3 font-black border-t-2 border-r-2 border-[#1A1A1A] flex items-center">방문업체</div>
                           <div className="p-3 border-t-2 border-r-2 border-[#1A1A1A] flex items-center font-bold">{selectedApp.visitors?.[0]?.company || '-'}</div>
                           <div className="bg-slate-100 p-3 font-black border-t-2 border-r-2 border-[#1A1A1A] flex items-center">방문인원</div>
                           <div className="p-3 border-t-2 flex items-center font-bold">{selectedApp.visitors?.length || 0} 명</div>
                        </div>
                      </div>

                      {/* Visitors Detail */}
                      {selectedApp.visitors && selectedApp.visitors.length > 0 && (
                        <div className="space-y-6">
                          <div className="flex items-center gap-2 border-l-4 border-[#E30613] pl-4">
                            <h4 className="text-sm font-black text-[#1A1A1A] uppercase tracking-wider">방문자 명단 및 상세정보</h4>
                          </div>
                          <div className="grid grid-cols-1 gap-4">
                            {selectedApp.visitors.map((v, i) => (
                              <div key={i} className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
                                 <div className="flex items-center gap-4 mb-4 pb-4 border-b border-slate-200/50">
                                    <div className="w-8 h-8 bg-[#1A1A1A] rounded-lg text-white font-black text-xs flex items-center justify-center">{i+1}</div>
                                    <p className="font-black text-lg text-[#1A1A1A]">{v.name}</p>
                                    <span className="text-[10px] font-bold text-slate-400 bg-white px-2 py-0.5 rounded border border-slate-100">{v.company}</span>
                                 </div>
                                 <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-[11px]">
                                    <div>
                                      <p className="text-slate-400 font-bold mb-0.5">생년월일</p>
                                      <p className="font-bold text-slate-700">{v.birthDate || '-'}</p>
                                    </div>
                                    <div>
                                      <p className="text-slate-400 font-bold mb-0.5">연락처</p>
                                      <p className="font-bold text-slate-700">{v.phone || '-'}</p>
                                    </div>
                                    <div>
                                      <p className="text-slate-400 font-bold mb-0.5">출입증구분</p>
                                      <p className="font-black text-[#E30613]">{v.badgeType || '-'}</p>
                                    </div>
                                    <div>
                                      <p className="text-slate-400 font-bold mb-0.5">허가구역</p>
                                      <p className="font-bold text-slate-700">{v.accessZone || '-'}</p>
                                    </div>
                                    <div>
                                      <p className="text-slate-400 font-bold mb-0.5">방문목적</p>
                                      <p className="font-bold text-slate-700">{v.purpose || '-'}</p>
                                    </div>
                                    <div className="col-span-2">
                                      <p className="text-slate-400 font-bold mb-0.5">비고</p>
                                      <p className="text-slate-600 italic">{v.remarks || '-'}</p>
                                    </div>
                                 </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : detailViewMode === 'entry' ? (
                    <EntryDocument app={selectedApp} id="application-document" />
                  ) : (
                    <ToolDocument app={selectedApp} id="tool-application-document" />
                  )}
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-8 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-3 rounded-b-[2.5rem]">
                 <Button variant="outline" className="px-8 min-w-32 h-12 bg-white" onClick={() => setSelectedApp(null)}>
                    닫기
                 </Button>

                 {selectedApp.status === 'pending' && isManager && (
                   <div className="flex gap-3">
                     <Button 
                        variant="primary" 
                        className="px-8 h-12 shadow-lg shadow-red-500/20" 
                        onClick={(e) => { e.stopPropagation(); handleApprove(selectedApp.id!); }}
                     >
                        승인하기
                     </Button>
                     <Button 
                        variant="outline" 
                        className="px-8 h-12 border-red-200 text-red-600 hover:bg-red-50" 
                        onClick={(e) => { e.stopPropagation(); handleReject(selectedApp.id!); }}
                     >
                        반려하기
                     </Button>
                   </div>
                 )}

                 {selectedApp.status === 'approved' && isManager && (
                   <Button 
                      variant="outline" 
                      className="px-6 h-12 border-red-200 text-red-600 hover:bg-red-50" 
                      onClick={(e) => { e.stopPropagation(); handleReject(selectedApp.id!); }}
                   >
                      승인 취소
                   </Button>
                 )}
                 
                 {(isManager || (user && selectedApp.applicantId === user.uid && selectedApp.status === 'pending')) && (
                   <Button 
                      variant="danger" 
                      className="px-6 h-12 flex items-center gap-2" 
                      onClick={(e) => {
                        e.stopPropagation();
                        setConfirmDeleteId(selectedApp.id!);
                      }}
                   >
                      <Trash2 size={16} />
                      삭제하기
                   </Button>
                 )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sidebar Overlay */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[40] md:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside className={cn(
        "bg-white flex flex-col shrink-0 border-r border-slate-100 shadow-xl z-[50] transition-transform duration-300",
        "fixed inset-y-0 left-0 w-72 md:relative md:w-80 md:translate-x-0 md:shadow-sm",
        isSidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="p-10 flex flex-col items-start gap-1">
          <div className="flex items-center justify-between w-full">
            <SwissportLogo size="md" />
            <button onClick={() => setIsSidebarOpen(false)} className="md:hidden p-2 text-slate-400">
               <X size={20} />
            </button>
          </div>
          <p className="text-[10px] font-black text-[#E30613] uppercase tracking-[0.25em] mt-4">Warehouse Access Control</p>
        </div>

        <nav className="flex-1 py-4 px-6 space-y-1.5">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 px-4">Navigation &bull; {roleLabel}</p>
          <button 
            onClick={() => { setView('calendar'); setIsSidebarOpen(false); }}
            className={cn(
              "w-full flex items-center gap-3 px-6 py-4 rounded-2xl transition-all font-bold text-sm",
              view === 'calendar' ? "bg-[#1A1A1A] text-white shadow-lg" : "text-slate-500 hover:text-[#E30613] hover:bg-slate-50"
            )}
          >
            <Calendar size={18} />
            전체 일정
          </button>
          <button 
            onClick={() => { setView('applications'); setIsSidebarOpen(false); }}
            className={cn(
              "w-full flex items-center gap-3 px-6 py-4 rounded-2xl transition-all font-bold text-sm",
              view === 'applications' ? "bg-[#1A1A1A] text-white shadow-lg" : "text-slate-500 hover:text-[#E30613] hover:bg-slate-50"
            )}
          >
            <FileText size={18} />
            신청 내역 조회
          </button>
          
          {canWriteData && (
            <button 
              onClick={() => { setView('create'); setIsSidebarOpen(false); }}
              className={cn(
                "w-full flex items-center gap-3 px-6 py-4 rounded-2xl transition-all font-bold text-sm",
                view === 'create' ? "bg-[#1A1A1A] text-white shadow-lg" : "text-slate-500 hover:text-[#E30613] hover:bg-slate-50"
              )}
            >
              <FilePlus size={18} />
              출입 신청서 업로드
            </button>
          )}

          {canManageAdmins && (
            <div className="pt-6">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 px-4">Management</p>
              <button 
                onClick={() => { setView('admins'); setIsSidebarOpen(false); }}
                className={cn(
                  "w-full flex items-center gap-3 px-6 py-4 rounded-2xl transition-all font-bold text-sm",
                  view === 'admins' ? "bg-indigo-600 text-white shadow-lg" : "text-slate-500 hover:text-indigo-600 hover:bg-slate-50"
                )}
              >
                <Shield size={18} />
                이용자 권한 관리
              </button>
            </div>
          )}
        </nav>

        <div className="p-8">
           <div className="bg-slate-50 rounded-[2rem] p-6 flex flex-col gap-4 border border-slate-100 shadow-sm">
                  <div className="flex items-center gap-3 px-1 mb-4">
                 <div className="w-12 h-12 bg-[#1A1A1A] rounded-2xl shadow-md overflow-hidden flex items-center justify-center border-2 border-white">
                    {adminId ? (
                      <div className="text-white font-black text-lg">{adminId.charAt(0)}</div>
                    ) : user?.photoURL ? (
                      <img src={user.photoURL} alt="User" />
                    ) : ( 
                      <User className="text-white" size={24} />
                    )}
                 </div>
                 <div>
                    <p className="text-sm font-black text-[#1A1A1A]">
                      {adminId || (user?.email === 'cloudkiss90@gmail.com' ? 'System' : user?.displayName || '사용자')}
                    </p>
                    <p className="text-[10px] font-bold text-[#E30613] uppercase tracking-widest leading-none">{roleLabel}</p>
                 </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                 <button 
                   onClick={() => { setView('profile'); setIsSidebarOpen(false); }}
                   className={cn(
                     "flex items-center justify-center gap-2 py-2 rounded-xl text-[10px] font-black uppercase transition-all",
                     view === 'profile' ? "bg-[#1A1A1A] text-white shadow-md" : "bg-white text-slate-400 hover:text-slate-900 border border-slate-100"
                   )}
                 >
                    <Settings size={12} />
                    설정
                 </button>
                 <button 
                   onClick={handleLogout}
                   className="flex items-center justify-center gap-2 py-2 rounded-xl text-[10px] font-black uppercase bg-white text-slate-400 hover:text-red-600 border border-slate-100 transition-all"
                 >
                    <LogOut size={12} />
                    로그아웃
                 </button>
              </div>
           </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden relative">
        <header className="h-16 md:h-20 bg-white border-b border-slate-200 flex items-center justify-between px-4 md:px-10 shrink-0 z-10">
          <div className="flex items-center gap-3">
             <button 
               onClick={() => setIsSidebarOpen(true)}
               className="p-2 md:hidden text-slate-600 hover:bg-slate-50 rounded-lg transition-colors"
             >
               <Menu size={20} />
             </button>
             <div className="flex flex-col">
                <h2 className="text-base md:text-xl font-bold text-[#1A1A1A] tracking-tight leading-none md:leading-normal">
                  {view === 'calendar' ? '출입 일정 캘린더' : view === 'applications' ? '창고 출입 승인 현황' : view === 'create' ? '출입 신청서 업로드' : view === 'admins' ? '이용자 권한 관리' : '내 프로필 설정'}
                </h2>
                <p className="text-[8px] md:text-[9px] font-bold text-[#E30613] uppercase tracking-widest mt-0.5">
                  {roleLabel} &bull; SWISSPORT
                </p>
             </div>
          </div>

          <div className="flex items-center gap-3 md:gap-6 relative" ref={notificationRef}>
             <div 
               className="relative cursor-pointer p-2 hover:bg-slate-50 rounded-full transition-colors"
               onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
             >
                <Bell size={18} className={cn("transition-colors", isNotificationsOpen ? "text-[#E30613]" : "text-slate-400")} />
                {notifications.length > 0 && (
                  <div className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#E30613] rounded-full border-2 border-white" />
                )}
             </div>

             <AnimatePresence>
               {isNotificationsOpen && (
                 <motion.div 
                   initial={{ opacity: 0, y: 10, scale: 0.95 }}
                   animate={{ opacity: 1, y: 0, scale: 1 }}
                   exit={{ opacity: 0, y: 10, scale: 0.95 }}
                   className="absolute top-12 right-0 w-80 bg-white border border-slate-200 rounded-3xl shadow-2xl z-[100] overflow-hidden"
                 >
                    <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                       <h3 className="font-black text-sm text-slate-800 uppercase tracking-widest">실시간 알림</h3>
                       <span className="text-[10px] font-bold text-[#E30613] bg-red-50 px-2 py-0.5 rounded-full">{notifications.length}</span>
                    </div>
                    <div className="max-h-[400px] overflow-y-auto p-2">
                       {notifications.length > 0 ? (
                         notifications.map((notif) => (
                           <div 
                             key={notif.id}
                             onClick={() => {
                               if (notif.type === 'application') {
                                 setSelectedApp((notif as any).app);
                                 setDetailViewMode('entry');
                               }
                               setIsNotificationsOpen(false);
                             }}
                             className="p-4 hover:bg-slate-50 rounded-2xl transition-all cursor-pointer group flex items-start gap-4 mb-1 last:mb-0"
                           >
                              <div className={cn(
                                "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-110 shadow-sm",
                                notif.type === 'application' ? "bg-red-50 text-[#E30613]" : "bg-blue-50 text-blue-600"
                              )}>
                                 {notif.type === 'application' ? <FileText size={18} /> : <AlertCircle size={18} />}
                              </div>
                              <div className="flex-1 min-w-0">
                                 <p className="text-xs font-black text-slate-900 mb-0.5 truncate">{notif.title}</p>
                                 <p className="text-[11px] font-medium text-slate-500 truncate">{notif.description}</p>
                                 {notif.time && (
                                   <p className="text-[9px] font-bold text-slate-300 mt-1 uppercase">
                                     {format(new Date(notif.time.seconds * 1000), 'HH:mm')} &bull; {isToday(new Date(notif.time.seconds * 1000)) ? '오늘' : format(new Date(notif.time.seconds * 1000), 'MM/dd')}
                                   </p>
                                 )}
                              </div>
                           </div>
                         ))
                       ) : (
                         <div className="py-12 text-center">
                            <Bell className="mx-auto text-slate-200 mb-3" size={32} />
                            <p className="text-[11px] font-bold text-slate-400">새로운 알림이 없습니다.</p>
                         </div>
                       )}
                    </div>
                    {notifications.length > 0 && (
                      <div 
                        className="p-4 border-t border-slate-100 text-center"
                        onClick={() => setIsNotificationsOpen(false)}
                      >
                         <button className="text-[10px] font-black text-slate-400 hover:text-[#E30613] transition-colors uppercase tracking-widest">모두 닫기</button>
                      </div>
                    )}
                 </motion.div>
               )}
             </AnimatePresence>

             <div className="hidden sm:block h-6 w-[1px] bg-slate-200" />
             <div className="hidden sm:flex items-center gap-4 py-2 px-4 bg-slate-50 border border-slate-200 rounded-xl">
                <Lock size={14} className="text-slate-400" />
                <span className="text-[9px] font-black text-slate-700 uppercase tracking-[0.1em]">Security Protocol Active</span>
             </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-10 bg-[#F8F9FA]">
          <AnimatePresence mode="wait">
            {view === 'calendar' && (
               <motion.div 
                 key="calendar"
                 initial={{ opacity: 0, y: 15 }}
                 animate={{ opacity: 1, y: 0 }}
                 className="h-full max-w-7xl mx-auto"
               >
                 <CalendarView />
               </motion.div>
            )}
            {view === 'admins' && canManageAdmins && (
               <motion.div 
                 key="admins"
                 initial={{ opacity: 0, y: 15 }}
                 animate={{ opacity: 1, y: 0 }}
                 className="h-full max-w-7xl mx-auto"
               >
                 <AdminsManagementView />
               </motion.div>
            )}
            {view === 'profile' && (
               <motion.div 
                 key="profile"
                 initial={{ opacity: 0, y: 15 }}
                 animate={{ opacity: 1, y: 0 }}
                 className="h-full max-w-7xl mx-auto"
               >
                 <ProfileView userProfile={userProfile} adminId={adminId} />
               </motion.div>
            )}
            {view === 'applications' && (
              <motion.div 
                key="apps"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6 max-w-6xl mx-auto"
              >
                <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-6 mb-8 mt-2">
                   <div className="relative w-full md:w-96 group order-2 md:order-1">
                      <Search size={16} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#E30613] transition-colors" />
                      <input 
                        placeholder="이름, 업체명, 날짜 검색..." 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-12 pr-6 py-4 md:py-3.5 bg-white border border-slate-200 rounded-xl text-sm font-bold shadow-sm outline-none transition-all ring-1 ring-slate-200 focus:ring-2 focus:ring-[#E30613]/20"
                      />
                   </div>
                   {canWriteData && (
                     <div className="flex gap-2 order-1 md:order-2">
                        <Button variant="outline" className="flex-1 md:flex-none px-5 border-none shadow-sm ring-1 ring-slate-200 text-xs" onClick={() => setSearchQuery('')}>
                           초기화
                        </Button>
                        <Button variant="primary" onClick={() => setView('create')} className="flex-1 md:flex-none px-6 text-xs">
                           <FilePlus size={16} />
                           신규 신청
                        </Button>
                     </div>
                   )}
                </div>

                <div className="grid grid-cols-1 gap-3">
                  {paginatedApps?.map((app: any) => (
                    <Card 
                      key={app.id} 
                      className="p-0 border-none shadow-sm relative overflow-hidden group hover:shadow-md transition-shadow cursor-pointer"
                      onClick={() => { setSelectedApp(app); setDetailViewMode('entry'); }}
                    >
                      <div className={cn(
                        "absolute top-0 left-0 w-1 h-full transition-all group-hover:w-1.5",
                        app.status === 'approved' ? "bg-emerald-500" : app.status === 'pending' ? "bg-orange-400" : "bg-red-500"
                      )} />
                      <div className="p-6 flex flex-col md:flex-row items-center justify-between gap-6">
                        <div className="flex items-center gap-6 flex-1">
                           <div className="w-12 h-12 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-center shrink-0">
                              <User className="text-slate-400" size={18} />
                           </div>
                           <div className="flex flex-col gap-0.5">
                              <div className="flex items-center gap-3">
                                <h3 className="font-black text-lg text-[#1A1A1A]">
                                  {app.visitors?.[0]?.name || '익명'} {app.visitors?.length > 1 ? `외 ${app.visitors.length - 1}명` : ''}
                                </h3>
                                <span className={cn(
                                  "px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest",
                                  app.status === 'approved' ? "bg-emerald-50 text-emerald-600" : "bg-orange-50 text-orange-600"
                                )}>
                                  {app.status === 'approved' ? '승인됨' : app.status === 'pending' ? '대기중' : '반려됨'}
                                </span>
                              </div>
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                {app.visitors?.[0]?.company || '소속 정보 없음'} &bull; {app.applyDate}
                              </p>
                           </div>
                        </div>

                        <div className="flex items-center gap-8">
                           <div className="text-center px-4 border-l border-slate-100 border-r">
                              <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">반입 공구</p>
                              <div className="flex items-center gap-2 justify-center">
                                 <Wrench size={12} className="text-[#E30613]" />
                                 <span className="font-black text-slate-900 text-sm">{app.tools?.length || 0}종</span>
                              </div>
                           </div>
                           <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                             {app.status === 'approved' ? (
                                <div className="flex gap-1.5" onClick={(e) => e.stopPropagation()}>
                                   {/* PDF download removed per user request */}
                                   {isManager && (
                                      <Button 
                                        variant="outline" 
                                        className="text-red-600 hover:bg-red-50 border-none ring-1 ring-red-100 text-xs"
                                        onClick={async (e) => {
                                          e.stopPropagation();
                                          handleReject(app.id);
                                        }}
                                      >
                                        승인 취소
                                      </Button>
                                   )}
                                </div>
                             ) : isManager ? (
                                <div className="flex gap-1.5">
                                   <Button variant="primary" className="px-5 text-xs" onClick={(e) => { e.stopPropagation(); handleApprove(app.id); }}>
                                      승인하기
                                   </Button>
                                   <Button 
                                      variant="outline" 
                                      className="text-red-600 hover:bg-red-50 border-none ring-1 ring-red-100 text-xs"
                                      onClick={async (e) => {
                                        e.stopPropagation();
                                        await handleReject(app.id);
                                      }}
                                    >
                                      승인 취소 / 반려
                                   </Button>
                                </div>
                             ) : (
                                <Button variant="outline" disabled className="text-xs border-none ring-1 ring-slate-100">
                                   승인 대기중
                                </Button>
                             )}
                             {(isManager || (user && app.applicantId === user.uid && app.status === 'pending')) && (
                               <button 
                                  onClick={async (e) => {
                                     e.stopPropagation();
                                     setConfirmDeleteId(app.id!);
                                   }}
                                  className="p-2.5 text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors rounded-lg flex items-center justify-center"
                                  title="삭제"
                               >
                                  <XCircle size={18} />
                               </button>
                             )}
                             <button 
                                onClick={() => { setSelectedApp(app); setDetailViewMode('summary'); }}
                                className="p-2.5 text-slate-400 hover:text-[#E30613] hover:bg-slate-50 transition-colors rounded-lg"
                             >
                                <Eye size={16} />
                             </button>
                           </div>
                        </div>
                      </div>
                    </Card>
                  ))}
                  
                  {/* Pagination Controls */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-center gap-4 mt-10 pb-10">
                      <Button 
                        variant="outline" 
                        className="w-10 h-10 p-0 rounded-full"
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                      >
                        <ChevronRight className="rotate-180" size={18} />
                      </Button>
                      <div className="flex items-center gap-2">
                         {Array.from({ length: totalPages }).map((_, i) => (
                           <button
                             key={i+1}
                             onClick={() => setCurrentPage(i + 1)}
                             className={cn(
                               "w-8 h-8 rounded-lg text-xs font-black transition-all",
                               currentPage === i + 1 
                                 ? "bg-[#1A1A1A] text-white shadow-md scale-110" 
                                 : "bg-white text-slate-400 hover:text-[#1A1A1A] border border-slate-100"
                             )}
                           >
                             {i + 1}
                           </button>
                         ))}
                      </div>
                      <Button 
                        variant="outline" 
                        className="w-10 h-10 p-0 rounded-full"
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                      >
                        <ChevronRight size={18} />
                      </Button>
                    </div>
                  )}

                  {paginatedApps?.length === 0 && !appsLoading && (
                    <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-slate-200">
                        <FileText className="mx-auto text-slate-200 mb-4" size={48} />
                        <p className="text-sm font-bold text-slate-400">등록된 신청 내역이 없습니다.</p>
                    </div>
                  )}
                  {appsLoading && <div className="text-center p-20 text-slate-300 uppercase font-black tracking-widest text-xs">데이터 동기화 중...</div>}
                  {appsError && <div className="text-center p-8 text-red-500 text-sm font-bold">데이터 로드 실패: {appsError.message}</div>}
                </div>
              </motion.div>
            )}

            {view === 'create' && (
              <motion.div 
                key="create"
                initial={{ opacity: 0, scale: 0.99 }}
                animate={{ opacity: 1, scale: 1 }}
                className="max-w-4xl mx-auto"
              >
                <div className="bg-white rounded-[1.5rem] md:rounded-[2rem] border border-slate-200 shadow-xl p-6 md:p-10 relative overflow-hidden">
                  <div className="flex items-center justify-between mb-8 md:mb-10">
                    <div className="flex items-center gap-4 md:gap-5">
                      <div className="w-12 h-12 md:w-14 md:h-14 bg-[#1A1A1A] rounded-xl md:rounded-2xl flex items-center justify-center shadow-lg shrink-0">
                        <FilePlus size={20} className="md:size-[24px] text-white" />
                      </div>
                      <div>
                        <h2 className="text-xl md:text-2xl font-black text-[#1A1A1A] tracking-tight">출입 신청서 업로드</h2>
                        <p className="text-[9px] md:text-[10px] font-bold text-slate-400 uppercase tracking-[0.15em] md:tracking-[0.2em] mt-1">Registry System</p>
                      </div>
                    </div>
                  </div>

                  {/* PDF Upload Area */}
                  <div className="mb-8 md:mb-10">
                    <label 
                      className="group cursor-pointer"
                      onDrop={handleDrop}
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                    >
                      <div className={cn(
                        "border-2 border-dashed rounded-2xl md:rounded-3xl p-8 md:p-14 flex flex-col items-center justify-center gap-4 md:gap-5 transition-all outline-none",
                        isDragging ? "border-[#E30613] bg-[#E30613]/10 scale-[1.01]" : "border-slate-200 group-hover:border-[#E30613]/50 group-hover:bg-[#E30613]/5"
                      )}>
                        <div className={cn(
                            "w-12 h-12 md:w-16 md:h-16 bg-slate-50 rounded-xl md:rounded-2xl flex items-center justify-center group-hover:scale-105 transition-transform shadow-sm",
                            (isAnalyzing || isDragging) && "bg-[#E30613]/10 border border-[#E30613]/20"
                        )}>
                          {isAnalyzing ? (
                             <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }} className="w-5 h-5 md:w-6 md:h-6 border-2 md:border-3 border-[#E30613] border-t-transparent rounded-full" />
                          ) : (
                             <Upload className={cn("text-slate-300 group-hover:text-[#E30613]", isDragging && "text-[#E30613]")} size={24} />
                          )}
                        </div>
                        <div className="text-center">
                          <p className="text-base md:text-lg font-black text-[#1A1A1A] mb-1">
                            {isAnalyzing ? "문서를 처리 중입니다..." : isDragging ? "여기에 놓으세요" : "PDF 업로드"}
                          </p>
                          <p className="text-[10px] md:text-xs font-medium text-slate-400 max-w-xs mx-auto">
                            {isAnalyzing ? "AI가 정보를 추출하고 있습니다." : "신청서를 클릭하거나 이곳으로 끌어오세요."}
                          </p>
                        </div>
                        <input type="file" className="hidden" accept="application/pdf,image/*" onChange={handleFileUpload} disabled={isAnalyzing} multiple />
                      </div>
                    </label>
                  </div>

                  {/* Stamp Download — shown after a PDF scan has been uploaded */}
                  {uploadedFiles.length > 0 && !isAnalyzing && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {uploadedFiles.map((file, idx) => (
                        <button
                          key={idx}
                          disabled={isStamping}
                          onClick={async () => {
                            setIsStamping(true);
                            try {
                              await pdfService.stampUploadedPdf(file);
                              setUploadedFiles(prev => prev.filter((_, i) => i !== idx));
                            } catch (err) {
                              console.error('직인 적용 실패:', err);
                              alert('직인 적용 중 오류가 발생했습니다.');
                            } finally {
                              setIsStamping(false);
                            }
                          }}
                          className="flex items-center gap-2 px-4 py-2 rounded-xl border-2 border-[#E30613]/30 bg-red-50 hover:bg-red-100 text-[#E30613] text-xs font-black transition-colors disabled:opacity-50"
                        >
                          <Download size={13} />
                          {isStamping ? '처리 중...' : `직인 찍어 다운로드 — ${file.name}`}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Extracted Data Preview or Manual Entry */}
                  {(newApp.visitors?.length === 0 && newApp.escorts?.length === 0 && newApp.tools?.length === 0) ? (
                    isAnalyzing ? null : (
                      <div className="text-center py-10 bg-slate-50 rounded-3xl border border-dashed border-slate-200 mb-8">
                         <p className="text-sm font-bold text-slate-500 mb-4">추출된 데이터가 없습니다. 직접 입력하시겠습니까?</p>
                         <Button variant="outline" onClick={handleAddVisitor}>
                            <Plus size={14} />
                            방문자 직접 추가
                         </Button>
                      </div>
                    )
                  ) : (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-12">
                       {/* Visitors Header with Add Button */}
                       <div className="flex items-center justify-between">
                          <h3 className="text-[10px] font-black text-[#E30613] uppercase tracking-[0.2em] flex items-center gap-2">
                            <CheckCircle size={14} />
                            방문자 인적사항 및 출입정보
                          </h3>
                          <Button variant="outline" size="sm" onClick={handleAddVisitor} className="h-8 py-0 px-3 text-[10px]">
                            <Plus size={12} />
                            방문자 추가
                          </Button>
                       </div>
                            <div className="grid grid-cols-1 gap-4">
                              {newApp.visitors.map((v, i) => (
                                  <div key={i} className="p-8 bg-white rounded-3xl border border-slate-200 shadow-sm relative overflow-hidden group">
                                    <div className="absolute top-0 left-0 w-1.5 h-full bg-[#E30613]" />
                                    <div className="flex items-start justify-between mb-6">
                                        <div className="flex items-center gap-4">
                                          <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center font-black text-[#E30613] text-sm shrink-0 border border-slate-100">{i+1}</div>
                                          <div>
                                              {editingVisitor === i ? (
                                                <input 
                                                  className="font-black text-lg text-[#1A1A1A] border-b border-slate-300 outline-none focus:border-[#E30613]"
                                                  value={v.name}
                                                  onChange={(e) => handleUpdateVisitor(i, { name: e.target.value })}
                                                  placeholder="성명"
                                                />
                                              ) : (
                                                <p className="font-black text-lg text-[#1A1A1A]">{v.name || '성명 미상'}</p>
                                              )}
                                              {editingVisitor === i ? (
                                                <input 
                                                  className="text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-200 outline-none block mt-1 w-full"
                                                  value={v.company}
                                                  onChange={(e) => handleUpdateVisitor(i, { company: e.target.value })}
                                                  placeholder="소속"
                                                />
                                              ) : (
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{v.company || '소속 정보 없음'}</p>
                                              )}
                                          </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                          <button 
                                            onClick={() => setEditingVisitor(editingVisitor === i ? null : i)}
                                            className="p-2 text-slate-400 hover:text-[#E30613] hover:bg-slate-50 rounded-lg transition-colors"
                                            title="수정하기"
                                          >
                                            {editingVisitor === i ? <CheckCircle size={18} /> : <Settings size={18} />}
                                          </button>
                                          <button 
                                            onClick={() => handleRemoveVisitor(i)}
                                            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                            title="삭제하기"
                                          >
                                            <Trash2 size={18} />
                                          </button>
                                        </div>
                                    </div>
                                    
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-y-6 gap-x-8">
                                        {[
                                          { label: '생년월일', key: 'birthDate' },
                                          { label: '연락처', key: 'phone' },
                                          { label: '출입증 종류', key: 'badgeType' },
                                          { label: '출입 허가구역', key: 'accessZone' },
                                          { label: '방문일정', key: 'visitDate' },
                                          { label: '방문목적', key: 'purpose' },
                                          { label: '접수번호', key: 'receiptNo' },
                                        ].map((field) => (
                                          <div key={field.key}>
                                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">{field.label}</p>
                                            {editingVisitor === i ? (
                                                <input 
                                                  className="text-xs font-bold text-slate-700 bg-slate-50 p-2 rounded w-full outline-none focus:ring-1 focus:ring-[#E30613]/50"
                                                  value={(v as any)[field.key] || ''}
                                                  onChange={(e) => handleUpdateVisitor(i, { [field.key]: e.target.value })}
                                                />
                                            ) : (
                                                <p className="text-xs font-bold text-slate-700">{(v as any)[field.key] || '-'}</p>
                                            )}
                                          </div>
                                        ))}
                                    </div>
                                    
                                    <div className="mt-6 pt-6 border-t border-slate-50">
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">비고</p>
                                        {editingVisitor === i ? (
                                          <textarea 
                                            className="text-xs font-medium text-slate-600 leading-relaxed w-full bg-slate-50 p-2 rounded outline-none focus:ring-1 focus:ring-[#E30613]/50"
                                            value={v.remarks || ''}
                                            onChange={(e) => handleUpdateVisitor(i, { remarks: e.target.value })}
                                          />
                                        ) : (
                                          <p className="text-xs font-medium text-slate-600 leading-relaxed">{v.remarks || '-'}</p>
                                        )}
                                    </div>
                                  </div>
                              ))}
                            </div>
                       {/* Escorts */}
                       <div className="space-y-6">
                          <div className="flex items-center justify-between">
                             <h3 className="text-[10px] font-black text-[#E30613] uppercase tracking-[0.2em] flex items-center gap-2">
                                <User size={14} />
                                인솔자 정보 ({(newApp.escorts || []).length})
                             </h3>
                             <Button variant="outline" size="sm" onClick={handleAddEscort} className="h-8 py-0 px-3 text-[10px]">
                               <Plus size={12} />
                               인솔자 추가
                             </Button>
                          </div>
                          {(newApp.escorts && newApp.escorts.length > 0) ? (
                             <div className="space-y-4">
                               {newApp.escorts.map((escort, i) => (
                                 <div key={i} className="p-8 bg-slate-50 rounded-3xl border border-slate-200 border-dashed relative group">
                                    <div className="absolute top-4 right-4 flex items-center gap-2">
                                       <button 
                                         onClick={() => setEditingEscort(editingEscort === i ? null : i)}
                                         className="p-2 text-slate-400 hover:text-[#E30613] hover:bg-white rounded-lg transition-colors border border-transparent hover:border-slate-100"
                                         title="수정하기"
                                       >
                                         {editingEscort === i ? <CheckCircle size={18} /> : <Settings size={18} />}
                                       </button>
                                       <button 
                                         onClick={() => handleRemoveEscort(i)}
                                         className="p-2 text-slate-400 hover:text-red-600 hover:bg-white rounded-lg transition-colors border border-transparent hover:border-slate-100"
                                         title="삭제하기"
                                       >
                                         <Trash2 size={18} />
                                       </button>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                                       <div>
                                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">성명</p>
                                          {editingEscort === i ? (
                                            <input 
                                              className="text-sm font-black text-[#1A1A1A] bg-white p-2 rounded w-full outline-none border border-slate-200"
                                              value={escort.name}
                                              onChange={(e) => handleUpdateEscort(i, { name: e.target.value })}
                                            />
                                          ) : (
                                            <p className="text-sm font-black text-[#1A1A1A]">{escort.name || '-'}</p>
                                          )}
                                       </div>
                                       <div>
                                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">소속</p>
                                          {editingEscort === i ? (
                                            <input 
                                              className="text-sm font-bold text-slate-700 bg-white p-2 rounded w-full outline-none border border-slate-200"
                                              value={escort.company}
                                              onChange={(e) => handleUpdateEscort(i, { company: e.target.value })}
                                            />
                                          ) : (
                                            <p className="text-sm font-bold text-slate-700">{escort.company || '-'}</p>
                                          )}
                                       </div>
                                       <div>
                                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">연락처</p>
                                          {editingEscort === i ? (
                                            <input 
                                              className="text-sm font-bold text-slate-700 bg-white p-2 rounded w-full outline-none border border-slate-200"
                                              value={escort.phone}
                                              onChange={(e) => handleUpdateEscort(i, { phone: e.target.value })}
                                            />
                                          ) : (
                                            <p className="text-sm font-bold text-slate-700">{escort.phone || '-'}</p>
                                          )}
                                       </div>
                                       <div>
                                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">정규출입증구역</p>
                                          {editingEscort === i ? (
                                            <input 
                                              className="text-sm font-bold text-slate-700 bg-white p-2 rounded w-full outline-none border border-slate-200"
                                              value={escort.regularBadgeZone}
                                              onChange={(e) => handleUpdateEscort(i, { regularBadgeZone: e.target.value })}
                                            />
                                          ) : (
                                            <p className="text-sm font-bold text-slate-700">{escort.regularBadgeZone || '-'}</p>
                                          )}
                                       </div>
                                    </div>
                                    <div className="mt-6 pt-6 border-t border-slate-200">
                                       <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">비고</p>
                                       {editingEscort === i ? (
                                          <textarea 
                                            className="text-xs font-medium text-slate-600 w-full bg-white p-2 rounded outline-none border border-slate-200"
                                            value={escort.remarks}
                                            onChange={(e) => handleUpdateEscort(i, { remarks: e.target.value })}
                                          />
                                       ) : (
                                          <p className="text-xs font-medium text-slate-600">{escort.remarks || '-'}</p>
                                       )}
                                    </div>
                                 </div>
                               ))}
                             </div>
                          ) : (
                             <div className="text-center py-10 bg-white rounded-3xl border border-dashed border-slate-200">
                                <p className="text-xs font-bold text-slate-400">등록된 인솔자 정보가 없습니다.</p>
                             </div>
                          )}
                       </div>

                       {/* Tools */}
                       <div className="bg-[#1A1A1A] p-8 rounded-3xl overflow-hidden shadow-xl">
                          <div className="flex items-center justify-between mb-6">
                             <h3 className="text-[10px] font-black text-white/50 uppercase tracking-[0.2em] flex items-center gap-2">
                                <Wrench size={14} className="text-[#E30613]" />
                                반입 공구 목록 ({(newApp.tools || []).length})
                             </h3>
                             <Button variant="outline" size="sm" onClick={handleAddTool} className="h-8 py-0 px-3 text-[10px] border-white/20 text-white hover:bg-white/10 uppercase tracking-widest font-black">
                               <Plus size={12} className="text-[#E30613]" />
                               공구 추가
                             </Button>
                          </div>
                          {(newApp.tools && newApp.tools.length > 0) ? (
                             <div className="overflow-hidden border border-white/10 rounded-2xl">
                                <table className="w-full text-left text-xs">
                                   <thead className="bg-white/5 text-slate-400 uppercase font-black text-[9px] tracking-widest border-b border-white/5">
                                      <tr>
                                         <th className="px-6 py-4">품명</th>
                                         <th className="px-6 py-4">수량</th>
                                         <th className="px-6 py-4">규격 및 비고</th>
                                         <th className="px-6 py-4 w-32 text-center">작업</th>
                                      </tr>
                                   </thead>
                                   <tbody className="divide-y divide-white/5">
                                      {newApp.tools.map((t, i) => (
                                         <tr key={i} className="text-white hover:bg-white/5 transition-colors group/row">
                                            <td className="px-6 py-4">
                                               {editingTool === i ? (
                                                 <input 
                                                   className="bg-white/10 text-white p-1 rounded w-full outline-none focus:ring-1 focus:ring-[#E30613] placeholder:text-white/20"
                                                   value={t.name}
                                                   onChange={(e) => handleUpdateTool(i, { name: e.target.value })}
                                                   placeholder="품명"
                                                 />
                                               ) : (
                                                 <span className="font-black">{t.name || '품명 미상'}</span>
                                               )}
                                            </td>
                                            <td className="px-6 py-4">
                                               {editingTool === i ? (
                                                 <div className="flex gap-1 items-center">
                                                   <input 
                                                     className="bg-white/10 text-white p-1 rounded w-12 outline-none focus:ring-1 focus:ring-[#E30613]"
                                                     type="number"
                                                     value={t.quantity}
                                                     onChange={(e) => handleUpdateTool(i, { quantity: parseInt(e.target.value) || 0 })}
                                                   />
                                                   <input 
                                                     className="bg-white/10 text-white p-1 rounded w-12 outline-none focus:ring-1 focus:ring-[#E30613]"
                                                     value={t.unit}
                                                     onChange={(e) => handleUpdateTool(i, { unit: e.target.value })}
                                                   />
                                                 </div>
                                               ) : (
                                                 <span className="font-bold text-[#E30613]">{t.quantity} {t.unit}</span>
                                               )}
                                            </td>
                                            <td className="px-6 py-4">
                                               {editingTool === i ? (
                                                 <input 
                                                   className="bg-white/10 text-white p-1 rounded w-full outline-none focus:ring-1 focus:ring-[#E30613] placeholder:text-white/20"
                                                   value={t.spec || t.note || ''}
                                                   onChange={(e) => handleUpdateTool(i, { spec: e.target.value })}
                                                   placeholder="규격 및 비고"
                                                 />
                                               ) : (
                                                 <span className="text-white/50 italic">{t.spec || t.note || '-'}</span>
                                               )}
                                            </td>
                                            <td className="px-6 py-4">
                                               <div className="flex items-center justify-center gap-2 opacity-30 group-hover/row:opacity-100 transition-opacity">
                                                 <button 
                                                   onClick={() => setEditingTool(editingTool === i ? null : i)}
                                                   className="p-1.5 text-white/70 hover:text-white transition-colors"
                                                   title="수정하기"
                                                 >
                                                   {editingTool === i ? <CheckCircle size={16} /> : <Settings size={16} />}
                                                 </button>
                                                 <button 
                                                   onClick={() => handleRemoveTool(i)}
                                                   className="p-1.5 text-white/70 hover:text-red-500 transition-colors"
                                                   title="삭제하기"
                                                 >
                                                   <Trash2 size={16} />
                                                 </button>
                                               </div>
                                            </td>
                                         </tr>
                                      ))}
                                   </tbody>
                                </table>
                             </div>
                          ) : (
                             <div className="text-center py-10 bg-white/5 rounded-2xl border border-dashed border-white/10">
                                <p className="text-xs font-bold text-white/30">반입 공구 목록이 비어있습니다.</p>
                             </div>
                          )}
                       </div>

                       <div className="pt-8 flex gap-3">
                          <Button variant="outline" className="flex-1 py-4 h-14 bg-white ring-1 ring-slate-200 border-none" onClick={() => setNewApp({ visitors: [], tools: [], escorts: [], status: 'pending' })}>다시 작성</Button>
                          <Button variant="primary" className="flex-[3] py-4 h-14 shadow-2xl shadow-red-500/20" onClick={submitApplication}>
                             신청서 일괄 업로드
                             <ArrowRight size={18} />
                          </Button>
                       </div>
                    </motion.div>
                  )}
                </div>
              </motion.div>
            )}

          </AnimatePresence>

          {confirmDeleteId && (
            <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
              <div className="bg-white rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl animate-in fade-in zoom-in duration-200">
                <div className="w-20 h-20 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Trash2 size={40} />
                </div>
                <h3 className="text-2xl font-black text-slate-900 mb-2">삭제 확인</h3>
                <p className="text-slate-500 font-bold mb-8">영구적으로 삭제하시겠습니까?</p>
                <div className="grid grid-cols-2 gap-3">
                  <Button variant="outline" className="h-14 font-black" onClick={() => setConfirmDeleteId(null)} disabled={isDeleting}>취소</Button>
                  <Button variant="danger" className="h-14 font-black" onClick={() => performDeletion(confirmDeleteId)} disabled={isDeleting}>
                    {isDeleting ? '삭제 중...' : '확인'}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {confirmApproveId && (
            <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
              <div className="bg-white rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl animate-in fade-in zoom-in duration-200">
                <div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-6">
                  <CheckCircle size={40} />
                </div>
                <h3 className="text-2xl font-black text-slate-900 mb-2">승인 확인</h3>
                <p className="text-slate-500 font-bold mb-8">이 신청서를 승인하시겠습니까?</p>
                <div className="grid grid-cols-2 gap-3">
                  <Button variant="outline" className="h-14 font-black" onClick={() => setConfirmApproveId(null)} disabled={isProcessing}>취소</Button>
                  <Button variant="primary" className="h-14 font-black" onClick={() => performApprove(confirmApproveId)} disabled={isProcessing}>
                    {isProcessing ? '처리 중...' : '승인'}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {confirmRejectId && (
            <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
              <div className="bg-white rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl animate-in fade-in zoom-in duration-200">
                <div className="w-20 h-20 bg-orange-50 text-orange-600 rounded-full flex items-center justify-center mx-auto mb-6">
                  <AlertCircle size={40} />
                </div>
                <h3 className="text-2xl font-black text-slate-900 mb-2">
                  {applications.find(a => a.id === confirmRejectId)?.status === 'approved' ? '승인 취소' : '반려 확인'}
                </h3>
                <p className="text-slate-500 font-bold mb-8">
                  {applications.find(a => a.id === confirmRejectId)?.status === 'approved' 
                    ? '승인을 취소하고 대기 상태로 되돌리시겠습니까?' 
                    : '이 신청서를 반려하시겠습니까?'}
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <Button variant="outline" className="h-14 font-black" onClick={() => setConfirmRejectId(null)} disabled={isProcessing}>취소</Button>
                  <Button variant="danger" className="h-14 font-black" onClick={() => performRejectOrCancel(confirmRejectId)} disabled={isProcessing}>
                    {isProcessing ? '처리 중...' : '확인'}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};
const App = () => {
  const [user, loading] = useAuthState(auth);

  if (loading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-white">
        <motion.div 
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ repeat: Infinity, duration: 2 }}
        >
          <SwissportLogo size="lg" />
        </motion.div>
      </div>
    );
  }

  // Dashboard now handles its own internal routing for AdminLogin
  return <Dashboard />;
};

export default App;