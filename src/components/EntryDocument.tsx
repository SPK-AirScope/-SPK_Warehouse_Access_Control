import React from 'react';
import { Globe } from 'lucide-react';
import { EntryApplication } from '../services/applicationService';
import { ApprovalSeal, cn } from './ui';

export const EntryDocument = ({ app, id, className, isPdf = false }: { app: EntryApplication, id?: string, className?: string, isPdf?: boolean }) => {
  const visitors = app.visitors || [];

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
      <div className="relative z-20 px-[5mm] pt-[10mm]">
        <div className="flex justify-start mb-6">
           <div className="flex items-center gap-1.5 grayscale contrast-125">
             <span className="font-black text-2xl tracking-tighter italic lowercase leading-none">swissport</span>
             <div className="w-8 h-8 bg-black transform skew-x-[-20deg] rounded-sm flex items-center justify-center">
                <Globe size={16} className="text-white" />
             </div>
           </div>
           <h1 className="ml-8 text-3xl font-black tracking-tighter">화물창고 방문 출입 신청서</h1>
        </div>

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
