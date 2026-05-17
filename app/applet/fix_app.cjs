const fs = require('fs');
const path = require('path');
const filePath = path.join(process.cwd(), 'src/App.tsx');
const content = fs.readFileSync(filePath, 'utf8');
const lines = content.split('\n');

// Find the corrupted line for modal
const brokenIndex = lines.findIndex(l => l.includes('{v.                 {selectedApp.status === \'approved\' ? ('));
if (brokenIndex !== -1) {
    console.log('Found broken modal line at', brokenIndex + 1);
    const footerEndIndex = lines.findIndex((l, i) => i > brokenIndex && l.includes('</AnimatePresence>'));
    if (footerEndIndex !== -1) {
        const replacement = `                                      <p className="text-slate-600 italic">{v.remarks || '-'}</p>
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
                 {selectedApp.status === 'pending' ? (
                   isManager && (
                    <div className="flex gap-4">
                      <Button variant="primary" className="px-8 h-12" onClick={async (e) => { e.stopPropagation(); await handleApprove(selectedApp.id!); setSelectedApp(null); }}>
                         승인하기
                      </Button>
                      <Button variant="outline" className="px-8 h-12 border-red-200 text-red-600 hover:bg-red-50" onClick={(e) => { 
                        e.stopPropagation(); 
                        handleReject(selectedApp.id!); 
                        setSelectedApp(null);
                      }}>
                         승인 취소 / 반려
                      </Button>
                    </div>
                   )
                 ) : selectedApp.status === 'approved' ? (
                    <div className="flex gap-4">
                       {/* PDF download removed per user request */}
                       {isManager && (
                         <Button 
                            variant="outline" 
                            className="px-6 h-12 border-red-200 text-red-600 hover:bg-red-50" 
                            onClick={async (e) => { 
                              e.stopPropagation(); 
                              await handleReject(selectedApp.id!); 
                              setSelectedApp(null); 
                            }}
                         >
                            승인 취소
                         </Button>
                       )}
                    </div>
                 ) : null}
                 
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
      </AnimatePresence>`;
        
        lines.splice(brokenIndex, footerEndIndex - brokenIndex + 1, replacement);
    }
}

// Find the corrupted line for card list
const brokenCardIndex = lines.findIndex(l => l.includes('<span cla                             {app.status === \'approved\' ? ('));
if (brokenCardIndex !== -1) {
    console.log('Found broken card line at', brokenCardIndex + 1);
    const cardEndIndex = lines.findIndex((l, i) => i > brokenCardIndex && l.includes('</Card>'));
    if (cardEndIndex !== -1) {
        const replacement = `                                <span className={cn(
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
                    </Card>`;
        lines.splice(brokenCardIndex, cardEndIndex - brokenCardIndex + 1, replacement);
    }
}

fs.writeFileSync(filePath, lines.join('\n'));
console.log('Fixed App.tsx');
