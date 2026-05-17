import React from 'react';
import { Globe } from 'lucide-react';
import { EntryApplication } from '../services/applicationService';
import { ApprovalSeal, cn } from './ui';

export const ToolDocument = ({ app, id, className, isPdf = false }: { app: EntryApplication, id?: string, className?: string, isPdf?: boolean }) => {
  const tools = app.tools || [];

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
        <div className="flex justify-start mb-6">
           <div className="flex items-center gap-1.5 grayscale contrast-125">
             <span className="font-black text-2xl tracking-tighter italic lowercase leading-none">swissport</span>
             <div className="w-8 h-8 bg-black transform skew-x-[-20deg] rounded-sm flex items-center justify-center">
                <Globe size={16} className="text-white" />
             </div>
           </div>
           <h1 className="ml-8 text-3xl font-black tracking-tighter">화물창고 공구류 반입 신청서</h1>
        </div>

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
