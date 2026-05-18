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
  X,
  LayoutGrid,
  Plus,
  Trash2,
  Info,
  Menu,
  ChevronsLeft,
  ChevronsRight
} from 'lucide-react';
import { 
  useAuthState
} from 'react-firebase-hooks/auth';
import { signOut } from 'firebase/auth';
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
  getDocs,
  deleteDoc,
} from 'firebase/firestore';
import { useDocumentData } from 'react-firebase-hooks/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { auth, db, storage, OperationType, handleFirestoreError } from './lib/firebase';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
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

import { cn, Button, Card, SwissportLogo, ApprovalSeal } from './components/ui';
import { ADMIN_IDS, AdminLoginPage } from './components/AdminLoginPage';
import { EntryDocument } from './components/EntryDocument';
import { ToolDocument } from './components/ToolDocument';
import { ProfileView } from './components/ProfileView';
import { AdminsManagementView } from './components/AdminsManagementView';

// Set worker for pdfjs
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;


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
  const [fileCategories, setFileCategories] = useState<Record<number, 'entry' | 'tools'>>({});
  const [stampedFiles, setStampedFiles] = useState<Array<{bytes: Uint8Array; category: 'entry' | 'tools'; name: string}>>([]);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isStamping, setIsStamping] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const notificationRef = useRef<HTMLDivElement>(null);
  const appsCacheRef = useRef<{ data: any[]; ts: number } | null>(null);
  const APPS_CACHE_TTL = 5 * 60 * 1000; // 5분 캐시 (읽기 할당량 절약)
  const [toasts, setToasts] = useState<Array<{id: string; message: string; type: 'success' | 'error' | 'info'}>>([]);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  };

  // RBAC Helpers
  const isSuperAdmin = user?.email === 'cloudkiss90@gmail.com' || userProfile?.role === 'super_admin';
  const userRole = userProfile?.role || (isSuperAdmin ? 'super_admin' : 'staff');
  const roleLevel = userRole === 'super_admin' ? 1 : userRole === 'manager' ? 2 : 3;
  
  const canManageAdmins = roleLevel === 1;
  const canWriteData = roleLevel <= 2;
  const isManager = roleLevel <= 2;
  
  const roleLabel = userRole === 'super_admin' ? '최고 관리자' : userRole === 'manager' ? '관리자' : '보안요원';

  const [applications, setApplications] = useState<any[]>([]);
  const [appsLoading, setAppsLoading] = useState(false);
  const [appsError, setAppsError] = useState<Error | null>(null);

  // 30일 경과 데이터 삭제 — 관리자만, 하루 1회만 실행
  const runCleanupIfNeeded = async (currentAdminId: string | null) => {
    const isAdmin = currentAdminId && ADMIN_IDS.includes(currentAdminId);
    if (!isAdmin) return;

    const today = new Date().toISOString().slice(0, 10); // "yyyy-MM-dd"
    const lastRun = localStorage.getItem('spk_cleanup_date');
    if (lastRun === today) return; // 오늘 이미 실행함

    try {
      const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
      const oldQuery = query(
        collection(db, 'applications'),
        where('createdAt', '<', new Timestamp(Math.floor(thirtyDaysAgo / 1000), 0)),
        limit(50)
      );
      const snapshot = await getDocs(oldQuery);
      if (snapshot.empty) {
        localStorage.setItem('spk_cleanup_date', today);
        return;
      }
      await Promise.all(snapshot.docs.map(async (docSnap) => {
        const data = docSnap.data() as any;
        const paths: string[] = data.storagePaths || [];
        await Promise.all(paths.map(p => deleteObject(ref(storage, p)).catch(() => {})));
        await deleteDoc(doc(db, 'applications', docSnap.id)).catch(() => {});
      }));
      localStorage.setItem('spk_cleanup_date', today);
    } catch {
      // 실패해도 조용히 무시
    }
  };

  const loadApplications = async (force = false) => {
    if (!user) return;
    // 캐시 유효 시 Firestore 읽기 생략 (할당량 절약)
    if (!force && appsCacheRef.current && Date.now() - appsCacheRef.current.ts < APPS_CACHE_TTL) {
      setApplications(appsCacheRef.current.data);
      return;
    }
    setAppsLoading(true);
    setAppsError(null);
    try {
      const appsQuery = query(collection(db, 'applications'), orderBy('createdAt', 'desc'), limit(100));
      const snapshot = await getDocs(appsQuery);
      const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() as any }));
      appsCacheRef.current = { data, ts: Date.now() };
      setApplications(data);
    } catch (err: any) {
      setAppsError(err);
    } finally {
      setAppsLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadApplications();
      runCleanupIfNeeded(adminId);
    }
  }, [user]);

  useEffect(() => {
    if (user && view === 'calendar') {
      loadApplications();
    }
  }, [view]);

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
      type: 'application' as const,
      app: app
    })) || []),
    ...(applications?.filter(app => app.status === 'approved' && app.approvedAt).map(app => ({
      id: `approved-${app.id}`,
      title: '출입 승인 완료',
      description: `${app.visitors?.[0]?.name || '익명'} - 승인됨`,
      time: app.approvedAt,
      type: 'approved' as const,
      app: app
    })) || []),
    ...(applications?.filter(app => app.status === 'rejected' && app.rejectedAt).map(app => ({
      id: `rejected-${app.id}`,
      title: '출입 반려 처리',
      description: `${app.visitors?.[0]?.name || '익명'} - 반려됨`,
      time: app.rejectedAt,
      type: 'rejected' as const,
      app: app
    })) || [])
  ].sort((a, b) => (b.time?.seconds || 0) - (a.time?.seconds || 0)).slice(0, 15);

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
    const nextYear = () => setCurrentMonth(addMonths(currentDate, 12));
    const prevYear = () => setCurrentMonth(addMonths(currentDate, -12));

    // Normalize date strings to "yyyy-MM-dd" (handles Korean, ISO, slash, dot formats)
    const normalizeDate = (raw: any): string => {
      if (!raw) return '';
      const s = (typeof raw === 'string' ? raw : String(raw)).trim();
      if (!s) return '';
      // Korean: "2026년 5월 17일" (range "~" ignored — extract first date)
      const korean = s.match(/(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일/);
      if (korean) {
        const [, y, m, d] = korean;
        return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
      }
      // ISO: "2026-05-17" or datetime
      if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
      // Slash: "2026/05/17"
      const slash = s.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})/);
      if (slash) return `${slash[1]}-${slash[2].padStart(2, '0')}-${slash[3].padStart(2, '0')}`;
      // Dot: "2026.05.17"
      const dot = s.match(/^(\d{4})\.(\d{1,2})\.(\d{1,2})/);
      if (dot) return `${dot[1]}-${dot[2].padStart(2, '0')}-${dot[3].padStart(2, '0')}`;
      return '';
    };

    const ISO_RE = /^\d{4}-\d{2}-\d{2}$/;

    // Group apps by date:
    // visitDate of first visitor is tried first; if it fails to normalize, fall back to applyDate
    const appsByDate: Record<string, EntryApplication[]> = {};
    applications.forEach(app => {
      const normalizedVisit = normalizeDate(app.visitors?.[0]?.visitDate);
      const dateKey = (normalizedVisit && ISO_RE.test(normalizedVisit))
        ? normalizedVisit
        : normalizeDate(app.applyDate);
      if (dateKey && ISO_RE.test(dateKey)) {
        if (!appsByDate[dateKey]) appsByDate[dateKey] = [];
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
              onClick={prevYear}
              className="p-2 md:p-2.5 hover:bg-slate-50 rounded-lg md:rounded-xl transition-all text-slate-400 hover:text-[#E30613]"
              title="이전 해"
            >
              <ChevronsLeft size={18} />
            </button>
            <button
              onClick={prevMonth}
              className="p-2 md:p-2.5 hover:bg-slate-50 rounded-lg md:rounded-xl transition-all text-slate-400 hover:text-[#E30613]"
              title="이전 달"
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
              title="다음 달"
            >
              <ChevronRight size={18} />
            </button>
            <button
              onClick={nextYear}
              className="p-2 md:p-2.5 hover:bg-slate-50 rounded-lg md:rounded-xl transition-all text-slate-400 hover:text-[#E30613]"
              title="다음 해"
            >
              <ChevronsRight size={18} />
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
                      onClick={() => { setSelectedApp(app); setDetailViewMode('summary'); }}
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
        showToast("분석 시간이 너무 오래 걸립니다. 파일 용량을 줄이거나 다시 시도해주세요.", 'error');
      } else {
        showToast("신청서 분석 중 오류가 발생했습니다. 파일 형식을 확인해주세요.", 'error');
      }
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files).filter(f => f.type === 'application/pdf');
      if (files.length > 0) {
        setUploadedFiles(files);
        const cats: Record<number, 'entry' | 'tools'> = {};
        files.forEach((_, i) => { cats[i] = i === 0 ? 'entry' : 'tools'; });
        setFileCategories(cats);
      }
      setUploadError(null);
      processFiles(e.target.files);
      e.target.value = '';
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const files = Array.from(e.dataTransfer.files).filter(f => f.type === 'application/pdf');
      if (files.length > 0) {
        setUploadedFiles(files);
        const cats: Record<number, 'entry' | 'tools'> = {};
        files.forEach((_, i) => { cats[i] = i === 0 ? 'entry' : 'tools'; });
        setFileCategories(cats);
      }
      setUploadError(null);
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

    let pdfUrls: string[] = [];
    let storagePaths: string[] = [];
    if (uploadedFiles.length > 0) {
      // 파일 용량 및 개수 제한 (Firebase Storage 할당량 보호)
      const MAX_FILE_SIZE = 5 * 1024 * 1024;   // 파일당 최대 5MB
      const MAX_TOTAL_SIZE = 20 * 1024 * 1024; // 총합 최대 20MB
      const MAX_FILES = 10;

      if (uploadedFiles.length > MAX_FILES) {
        setUploadError(`파일은 최대 ${MAX_FILES}개까지 업로드할 수 있습니다.`);
        return;
      }
      const oversized = uploadedFiles.find(f => f.size > MAX_FILE_SIZE);
      if (oversized) {
        setUploadError(`파일 크기는 5MB를 초과할 수 없습니다: ${oversized.name}`);
        return;
      }
      const totalSize = uploadedFiles.reduce((acc, f) => acc + f.size, 0);
      if (totalSize > MAX_TOTAL_SIZE) {
        setUploadError(`전체 파일 크기가 20MB를 초과합니다. 파일을 줄여주세요.`);
        return;
      }

      try {
        const uploadResults = await Promise.all(
          uploadedFiles.map(async (file, idx) => {
            const path = `pdfs/${user.uid}/${Date.now()}_${file.name}`;
            const storageRef = ref(storage, path);
            const snapshot = await uploadBytes(storageRef, file);
            const url = await getDownloadURL(snapshot.ref);
            return { url, path, category: fileCategories[idx] || 'entry' };
          })
        );
        const entryResult = uploadResults.find(r => r.category === 'entry');
        const toolsResult = uploadResults.find(r => r.category === 'tools');
        if (entryResult) pdfUrls[0] = entryResult.url;
        if (toolsResult) pdfUrls[1] = toolsResult.url;
        storagePaths = uploadResults.map(r => r.path);
      } catch (uploadErr) {
        setUploadError('PDF 파일 업로드에 실패했습니다. 네트워크 상태를 확인하고 다시 시도해주세요.');
        return;
      }
    }

    let stampedPdfUrls: string[] = [];
    if (stampedFiles.length > 0) {
      try {
        const stampedResults = await Promise.all(
          stampedFiles.map(async (sf) => {
            const path = `pdfs/${user.uid}/${Date.now()}_stamped_${sf.name}`;
            const storageRef = ref(storage, path);
            const snapshot = await uploadBytes(storageRef, sf.bytes, { contentType: 'application/pdf' });
            const url = await getDownloadURL(snapshot.ref);
            storagePaths.push(path);
            return { url, category: sf.category };
          })
        );
        const entryStamped = stampedResults.find(r => r.category === 'entry');
        const toolsStamped = stampedResults.find(r => r.category === 'tools');
        if (entryStamped) stampedPdfUrls[0] = entryStamped.url;
        if (toolsStamped) stampedPdfUrls[1] = toolsStamped.url;
      } catch (uploadErr) {
        setUploadError('직인 PDF 업로드에 실패했습니다. 다시 시도해주세요.');
        return;
      }
    }

    const finalApp: Omit<EntryApplication, 'id'> = {
      applyDate: new Date().toISOString().split('T')[0],
      visitors: newApp.visitors || [],
      tools: newApp.tools || [],
      escorts: newApp.escorts || [],
      status: 'pending',
      applicantId: user.uid,
      applicantEmail: user.email || '',
      applicantName: newApp.applicantName || user.displayName || '',
      signatureImage: newApp.signatureImage || '',
      ...(pdfUrls.length > 0 && { pdfUrls }),
      ...(stampedPdfUrls.length > 0 && { stampedPdfUrls }),
      ...(storagePaths.length > 0 && { storagePaths }),
    };

    try {
      await applicationService.createApplication(finalApp);
      appsCacheRef.current = null; // 캐시 무효화 — 새 신청서 즉시 반영
      await loadApplications(true); // 달력·목록에 즉시 반영
      setView('applications');
      setNewApp({ visitors: [], tools: [], escorts: [], status: 'pending' });
      setUploadedFiles([]);
      setStampedFiles([]);
    } catch (err: any) {
      console.error('신청서 제출 실패:', err);
      const msg = err?.message || String(err);
      if (msg.includes('permission-denied') || msg.includes('insufficient permissions')) {
        showToast('제출 권한이 없습니다. 관리자에게 문의하세요.', 'error');
      } else {
        showToast('제출에 실패했습니다. 네트워크 상태를 확인하고 다시 시도해주세요.', 'error');
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
        showToast('시스템 인증이 만료되었습니다. 다시 로그인해주세요.', 'error');
        handleLogout();
        return;
      }

      await applicationService.approveApplication(appId, adminId || user.uid);
      appsCacheRef.current = null;
      await loadApplications(true);
      setConfirmApproveId(null);
      showToast('신청서가 승인되었습니다.', 'success');

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
      showToast(errorMsg, 'error');
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
        showToast('시스템 인증이 만료되었습니다. 다시 로그인해주세요.', 'error');
        handleLogout();
        return;
      }

      const currentApp = applications.find(a => a.id === appId);
      if (currentApp?.status === 'approved') {
        await applicationService.updateApplicationStatus(appId, 'pending');
        appsCacheRef.current = null;
        await loadApplications(true);
        showToast('승인이 취소되어 대기 상태로 변경되었습니다.', 'info');
      } else {
        await applicationService.rejectApplication(appId, adminId || user.uid);
        appsCacheRef.current = null;
        await loadApplications(true);
        showToast('반려 처리되었습니다.', 'success');
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
      showToast(errorMsg, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const performDeletion = async (appId: string) => {
    try {
      setIsDeleting(true);
      console.log(`DEBUG: Starting performDeletion for ${appId}...`);
      await applicationService.deleteApplication(appId);
      appsCacheRef.current = null;
      await loadApplications(true);
      console.log(`DEBUG: Deletion of ${appId} successful.`);
      
      if (selectedApp?.id === appId) {
        setSelectedApp(null);
      }
      setConfirmDeleteId(null);
      showToast('신청서가 삭제되었습니다.', 'success');
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
      showToast(errorMsg, 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCancelApplication = (appId: string) => {
    try {
      if (!appId) {
        showToast('삭제할 신청서 ID가 없습니다.', 'error');
        return;
      }
      if (!user) {
        showToast('시스템 인증이 만료되었습니다. 다시 로그인해주세요.', 'error');
        handleLogout();
        return;
      }

      console.log("DEBUG: handleCancelApplication triggered for ID:", appId);
      setConfirmDeleteId(appId);
    } catch (err: any) {
      console.error("Delete failed:", err);
      let message = String(err.message || err);

      try {
        const parsed = JSON.parse(message);
        if (parsed.error && parsed.error.includes('permission-denied')) {
          showToast('삭제 권한이 없습니다. 관리자 권한을 확인해주세요.', 'error');
          return;
        }
        message = parsed.error || message;
      } catch (e) {}

      showToast('신청서 삭제 중 오류가 발생했습니다: ' + message, 'error');
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
            className="fixed inset-0 z-[100] flex items-center justify-center p-2 md:p-6 bg-[#1A1A1A]/40 backdrop-blur-sm"
            onClick={() => setSelectedApp(null)}
          >
            <motion.div 
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="bg-white w-full max-w-5xl max-h-[95vh] md:max-h-[90vh] rounded-2xl md:rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col"
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
              <div className="flex-1 overflow-y-auto p-4 md:p-10 bg-slate-100/50">
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
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 border-2 border-[#1A1A1A] text-xs">
                           <div className="bg-slate-100 p-2 md:p-3 font-black border-r-2 border-[#1A1A1A] flex items-center">신청구분</div>
                           <div className="p-2 md:p-3 border-r-0 md:border-r-2 border-[#1A1A1A] flex items-center font-bold">임시출입 (공구포함)</div>
                           <div className="bg-slate-100 p-2 md:p-3 font-black border-r-2 border-t-2 md:border-t-0 border-[#1A1A1A] flex items-center">신청일자</div>
                           <div className="p-2 md:p-3 border-t-2 md:border-t-0 flex items-center font-bold">{selectedApp.applyDate}</div>

                           <div className="bg-slate-100 p-2 md:p-3 font-black border-t-2 border-r-2 border-[#1A1A1A] flex items-center">방문업체</div>
                           <div className="p-2 md:p-3 border-t-2 border-r-0 md:border-r-2 border-[#1A1A1A] flex items-center font-bold">{selectedApp.visitors?.[0]?.company || '-'}</div>
                           <div className="bg-slate-100 p-2 md:p-3 font-black border-t-2 border-r-2 border-[#1A1A1A] flex items-center">방문인원</div>
                           <div className="p-2 md:p-3 border-t-2 flex items-center font-bold">{selectedApp.visitors?.length || 0} 명</div>
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
                    (() => {
                      const stampedUrl = selectedApp.stampedPdfUrls?.[0];
                      const originalUrl = selectedApp.pdfUrls?.[0];
                      const displayUrl = stampedUrl || originalUrl;
                      return displayUrl ? (
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                              {stampedUrl ? '직인 출입 신청서' : '업로드된 출입 신청서 (스캔본)'}
                            </p>
                            <div className="flex items-center gap-3">
                              {stampedUrl && (
                                <a href={stampedUrl} target="_blank" rel="noopener noreferrer" className="text-[10px] font-black text-[#E30613] hover:underline flex items-center gap-1">
                                  <Download size={11} /> 직인본 다운로드
                                </a>
                              )}
                              {originalUrl && (
                                <a href={originalUrl} target="_blank" rel="noopener noreferrer" className="text-[10px] font-black text-slate-500 hover:underline flex items-center gap-1">
                                  <Download size={11} /> 원본 다운로드
                                </a>
                              )}
                            </div>
                          </div>
                          <iframe
                            src={displayUrl}
                            className="w-full rounded-2xl border border-slate-200 shadow-sm"
                            style={{ height: '70vh' }}
                            title="출입신청서"
                          />
                        </div>
                      ) : (
                        <EntryDocument app={selectedApp} id="application-document" />
                      );
                    })()
                  ) : (
                    (() => {
                      const stampedUrl = selectedApp.stampedPdfUrls?.[1];
                      const originalUrl = selectedApp.pdfUrls?.[1];
                      const displayUrl = stampedUrl || originalUrl;
                      return displayUrl ? (
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                              {stampedUrl ? '직인 공구 반입 신청서' : '업로드된 공구 반입 신청서 (스캔본)'}
                            </p>
                            <div className="flex items-center gap-3">
                              {stampedUrl && (
                                <a href={stampedUrl} target="_blank" rel="noopener noreferrer" className="text-[10px] font-black text-[#E30613] hover:underline flex items-center gap-1">
                                  <Download size={11} /> 직인본 다운로드
                                </a>
                              )}
                              {originalUrl && (
                                <a href={originalUrl} target="_blank" rel="noopener noreferrer" className="text-[10px] font-black text-slate-500 hover:underline flex items-center gap-1">
                                  <Download size={11} /> 원본 다운로드
                                </a>
                              )}
                            </div>
                          </div>
                          <iframe
                            src={displayUrl}
                            className="w-full rounded-2xl border border-slate-200 shadow-sm"
                            style={{ height: '70vh' }}
                            title="공구반입신청서"
                          />
                        </div>
                      ) : (
                        <ToolDocument app={selectedApp} id="tool-application-document" />
                      );
                    })()
                  )}
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-8 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-3 rounded-b-[2.5rem]">
                 {/* PDF Download — left-aligned */}
                 <Button
                   variant="outline"
                   className="px-6 h-12 flex items-center gap-2 mr-auto bg-white border-slate-200 text-slate-700"
                   onClick={async () => {
                     if (!selectedApp) return;
                     const name = selectedApp.visitors?.[0]?.name || 'application';
                     const date = selectedApp.applyDate || format(new Date(), 'yyyy-MM-dd');
                     if (detailViewMode === 'tools') {
                       await pdfService.downloadElementAsPdf('tool-application-document', `공구반입신청서_${name}_${date}.pdf`);
                     } else {
                       await pdfService.downloadElementAsPdf('application-document', `출입신청서_${name}_${date}.pdf`);
                     }
                   }}
                 >
                   <Download size={16} />
                   PDF 다운로드
                 </Button>

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
                               if (notif.type === 'application' || notif.type === 'approved' || notif.type === 'rejected') {
                                 setSelectedApp((notif as any).app);
                                 setDetailViewMode('entry');
                                 setView('applications');
                               }
                               setIsNotificationsOpen(false);
                             }}
                             className="p-4 hover:bg-slate-50 rounded-2xl transition-all cursor-pointer group flex items-start gap-4 mb-1 last:mb-0"
                           >
                              <div className={cn(
                                "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-110 shadow-sm",
                                notif.type === 'application' ? "bg-red-50 text-[#E30613]" :
                                notif.type === 'approved' ? "bg-emerald-50 text-emerald-600" :
                                notif.type === 'rejected' ? "bg-orange-50 text-orange-600" :
                                "bg-blue-50 text-blue-600"
                              )}>
                                 {notif.type === 'application' ? <FileText size={18} /> :
                                  notif.type === 'approved' ? <CheckCircle size={18} /> :
                                  notif.type === 'rejected' ? <XCircle size={18} /> :
                                  <AlertCircle size={18} />}
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
                      <div className="p-4 md:p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 md:gap-6">
                        <div className="flex items-center gap-4 md:gap-6 flex-1 min-w-0">
                           <div className="w-10 h-10 md:w-12 md:h-12 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-center shrink-0">
                              <User className="text-slate-400" size={18} />
                           </div>
                           <div className="flex flex-col gap-0.5 min-w-0">
                              <div className="flex items-center gap-2 md:gap-3 flex-wrap">
                                <h3 className="font-black text-base md:text-lg text-[#1A1A1A] truncate">
                                  {app.visitors?.[0]?.name || '익명'} {app.visitors?.length > 1 ? `외 ${app.visitors.length - 1}명` : ''}
                                </h3>
                                <span className={cn(
                                  "px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest shrink-0",
                                  app.status === 'approved' ? "bg-emerald-50 text-emerald-600" : "bg-orange-50 text-orange-600"
                                )}>
                                  {app.status === 'approved' ? '승인됨' : app.status === 'pending' ? '대기중' : '반려됨'}
                                </span>
                              </div>
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest truncate">
                                {app.visitors?.[0]?.company || '소속 정보 없음'} &bull; {app.applyDate}
                              </p>
                           </div>
                        </div>

                        <div className="flex items-center gap-3 md:gap-8 w-full md:w-auto pl-14 md:pl-0">
                           <div className="text-center px-3 md:px-4 border-l border-slate-100 md:border-r">
                              <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">반입 공구</p>
                              <div className="flex items-center gap-2 justify-center">
                                 <Wrench size={12} className="text-[#E30613]" />
                                 <span className="font-black text-slate-900 text-sm">{app.tools?.length || 0}종</span>
                              </div>
                           </div>
                           <div className="flex flex-wrap gap-1.5 md:gap-2" onClick={(e) => e.stopPropagation()}>
                             {app.status === 'approved' ? (
                                <div className="flex gap-1.5" onClick={(e) => e.stopPropagation()}>
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
                                   <Button variant="primary" className="px-3 md:px-5 text-xs" onClick={(e) => { e.stopPropagation(); handleApprove(app.id); }}>
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
                                      반려
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
                  {appsLoading && <div className="text-center p-20 text-slate-300 uppercase font-black tracking-widest text-xs">데이터 불러오는 중...</div>}
                  {appsError && (
                    <div className="text-center p-8 space-y-3">
                      <p className="text-red-500 text-sm font-bold">
                        {appsError.message?.includes('Quota') || appsError.message?.includes('quota') || appsError.message?.includes('resource-exhausted')
                          ? 'Firebase 일일 읽기 한도 초과 — 자정(태평양 시간) 이후 자동 초기화됩니다.'
                          : `데이터 로드 실패: ${appsError.message}`}
                      </p>
                      <button onClick={loadApplications} className="text-xs font-bold text-indigo-600 underline">다시 시도</button>
                    </div>
                  )}
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

                  {/* Upload Error */}
                  {uploadError && (
                    <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-2xl flex items-center gap-3">
                      <AlertCircle size={18} className="text-red-500 shrink-0" />
                      <p className="text-sm font-bold text-red-600">{uploadError}</p>
                      <button onClick={() => setUploadError(null)} className="ml-auto text-red-400 hover:text-red-600"><X size={16} /></button>
                    </div>
                  )}

                  {/* Uploaded Files with Category Selection */}
                  {uploadedFiles.length > 0 && !isAnalyzing && (
                    <div className="mt-3 space-y-3">
                      {uploadedFiles.map((file, idx) => (
                        <div key={idx} className="flex flex-col sm:flex-row items-start sm:items-center gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-200">
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <FileText size={16} className="text-slate-400 shrink-0" />
                            <span className="text-xs font-bold text-slate-700 truncate">{file.name}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => setFileCategories(prev => ({ ...prev, [idx]: 'entry' }))}
                              className={cn(
                                "px-3 py-1.5 rounded-lg text-[10px] font-black transition-colors border",
                                fileCategories[idx] === 'entry'
                                  ? "bg-[#E30613] text-white border-[#E30613]"
                                  : "bg-white text-slate-500 border-slate-200 hover:border-[#E30613]/50"
                              )}
                            >
                              출입신청서
                            </button>
                            <button
                              onClick={() => setFileCategories(prev => ({ ...prev, [idx]: 'tools' }))}
                              className={cn(
                                "px-3 py-1.5 rounded-lg text-[10px] font-black transition-colors border",
                                fileCategories[idx] === 'tools'
                                  ? "bg-[#1A1A1A] text-white border-[#1A1A1A]"
                                  : "bg-white text-slate-500 border-slate-200 hover:border-slate-400"
                              )}
                            >
                              공구리스트
                            </button>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              disabled={isStamping}
                              onClick={async () => {
                                setIsStamping(true);
                                try {
                                  const bytes = await pdfService.stampUploadedPdf(file);
                                  setStampedFiles(prev => [...prev, {
                                    bytes,
                                    category: (fileCategories[idx] || 'entry') as 'entry' | 'tools',
                                    name: file.name
                                  }]);
                                  setUploadedFiles(prev => prev.filter((_, i) => i !== idx));
                                  setFileCategories(prev => {
                                    const next = { ...prev };
                                    delete next[idx];
                                    return next;
                                  });
                                } catch (err) {
                                  console.error('직인 적용 실패:', err);
                                  showToast('직인 적용 중 오류가 발생했습니다.', 'error');
                                } finally {
                                  setIsStamping(false);
                                }
                              }}
                              className="flex items-center gap-2 px-4 py-2 rounded-xl border-2 border-[#E30613]/30 bg-red-50 hover:bg-red-100 text-[#E30613] text-xs font-black transition-colors disabled:opacity-50"
                            >
                              <Download size={13} />
                              {isStamping ? '처리 중...' : '직인 다운로드'}
                            </button>
                            <button
                              onClick={() => {
                                setUploadedFiles(prev => prev.filter((_, i) => i !== idx));
                                setFileCategories(prev => {
                                  const next = { ...prev };
                                  delete next[idx];
                                  return next;
                                });
                              }}
                              className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-red-50 hover:border-red-200 text-slate-400 hover:text-red-500 transition-colors"
                              title="삭제"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
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
                                  <div key={i} className="p-4 md:p-8 bg-white rounded-2xl md:rounded-3xl border border-slate-200 shadow-sm relative overflow-hidden group">
                                    <div className="absolute top-0 left-0 w-1.5 h-full bg-[#E30613]" />
                                    <div className="flex items-start justify-between mb-4 md:mb-6">
                                        <div className="flex items-center gap-3 md:gap-4">
                                          <div className="w-8 h-8 md:w-10 md:h-10 bg-slate-50 rounded-xl flex items-center justify-center font-black text-[#E30613] text-sm shrink-0 border border-slate-100">{i+1}</div>
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
                                    
                                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-y-4 md:gap-y-6 gap-x-4 md:gap-x-8">
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
                                 <div key={i} className="p-4 md:p-8 bg-slate-50 rounded-2xl md:rounded-3xl border border-slate-200 border-dashed relative group">
                                    <div className="absolute top-3 right-3 md:top-4 md:right-4 flex items-center gap-1 md:gap-2">
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
                                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 md:gap-8">
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
                       <div className="bg-[#1A1A1A] p-4 md:p-8 rounded-2xl md:rounded-3xl overflow-hidden shadow-xl">
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
                             <div className="overflow-x-auto border border-white/10 rounded-2xl">
                                <table className="w-full text-left text-xs min-w-[500px]">
                                   <thead className="bg-white/5 text-slate-400 uppercase font-black text-[9px] tracking-widest border-b border-white/5">
                                      <tr>
                                         <th className="px-3 md:px-6 py-3 md:py-4">품명</th>
                                         <th className="px-3 md:px-6 py-3 md:py-4">수량</th>
                                         <th className="px-3 md:px-6 py-3 md:py-4">규격 및 비고</th>
                                         <th className="px-3 md:px-6 py-3 md:py-4 w-24 md:w-32 text-center">작업</th>
                                      </tr>
                                   </thead>
                                   <tbody className="divide-y divide-white/5">
                                      {newApp.tools.map((t, i) => (
                                         <tr key={i} className="text-white hover:bg-white/5 transition-colors group/row">
                                            <td className="px-3 md:px-6 py-3 md:py-4">
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
                                            <td className="px-3 md:px-6 py-3 md:py-4">
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
                                            <td className="px-3 md:px-6 py-3 md:py-4">
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
                                            <td className="px-3 md:px-6 py-3 md:py-4">
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

      {/* Toast notifications */}
      <div className="fixed bottom-6 right-6 z-[200] flex flex-col gap-3 pointer-events-none">
        <AnimatePresence>
          {toasts.map(toast => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              className={cn(
                "pointer-events-auto px-5 py-3.5 rounded-2xl shadow-2xl border flex items-center gap-3 min-w-[280px] max-w-sm",
                toast.type === 'success' ? "bg-emerald-50 border-emerald-200 text-emerald-800" :
                toast.type === 'error' ? "bg-red-50 border-red-200 text-red-800" :
                "bg-blue-50 border-blue-200 text-blue-800"
              )}
            >
              <div className={cn(
                "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
                toast.type === 'success' ? "bg-emerald-100" :
                toast.type === 'error' ? "bg-red-100" :
                "bg-blue-100"
              )}>
                {toast.type === 'success' ? <CheckCircle size={16} /> :
                 toast.type === 'error' ? <XCircle size={16} /> :
                 <Info size={16} />}
              </div>
              <p className="text-xs font-bold leading-tight">{toast.message}</p>
              <button
                onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))}
                className="ml-auto text-current opacity-40 hover:opacity-100 transition-opacity"
              >
                <X size={14} />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
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
