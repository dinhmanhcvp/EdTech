'use client';

import React, {useEffect, useMemo, useRef, useState} from 'react';
import {Activity, BookOpen, CheckCircle2, ChevronDown, ChevronRight, ChevronUp, Eraser, FileText, Gauge, GitBranch, Layers, Pencil, RefreshCw, ShieldAlert, SlidersHorizontal, Sparkles, Target, UserRound, Users, X} from 'lucide-react';
import {MathView} from '../common/MathView';
import {ChemicalBalanceScale} from './VisualDebugWidgets';
import {formatUpdatedAt, fetchClassroomSessionContext, fetchStudentRoadmap, getClassroomContextFallback, readClassroomSessionSnapshot, recordStudentError, recordStudentEvent, saveStudentProfile, type ClassroomSessionSnapshot, type ClassroomBoardSnapshot, type ClassroomStudentWork} from '../../utils/classroomContext';

type ProfileId = 'FOUNDATION' | 'TRAP_HUNTER' | 'OLYMPIAD' | 'VISUAL';
type Pane = 'VISUAL' | 'BOARD' | 'AUDIT' | 'SCRATCH';

const PROFILES: Record<ProfileId, {name: string; detail: string; tone: string; scaffold: string; pace: string; difficulty: string}> = {
  FOUNDATION: {name: 'Trần Minh Quân', detail: 'Cần kèm sát từng bước', tone: 'blue', scaffold: 'Vi mô', pace: 'Chậm', difficulty: 'Nền tảng'},
  TRAP_HUNTER: {name: 'Nguyễn Hà Phương', detail: 'Mục tiêu 8.5+ · hay mắc bẫy', tone: 'amber', scaffold: 'Bẫy biên', pace: 'Vừa', difficulty: 'THPT 2025+'},
  OLYMPIAD: {name: 'Lê Hoàng Nam', detail: 'Chuyên / Olympic', tone: 'violet', scaffold: 'Fast-track', pace: 'Nhanh', difficulty: 'HSG'},
  VISUAL: {name: 'Phạm Thảo Tiên', detail: 'Visual-first learner', tone: 'emerald', scaffold: 'Trực quan', pace: 'Theo nhịp', difficulty: 'Mô phỏng'},
};

function toneClass(tone: string, active: boolean) {
  if (!active) return 'bg-white border-[#E6E4DD] text-stone-700 hover:bg-stone-50';
  return tone === 'amber' ? 'bg-amber-50 border-amber-300 text-amber-900' : tone === 'violet' ? 'bg-violet-50 border-violet-300 text-violet-900' : tone === 'emerald' ? 'bg-emerald-50 border-emerald-300 text-emerald-900' : 'bg-blue-50 border-blue-300 text-blue-900';
}

export const StudentBoardWorkbench: React.FC = () => {
  const [snapshot, setSnapshot] = useState<ClassroomSessionSnapshot>(getClassroomContextFallback());
  const [profile, setProfile] = useState<ProfileId>('FOUNDATION');
  const [pane, setPane] = useState<Pane>('VISUAL');
  const [selectedBoard, setSelectedBoard] = useState<ClassroomBoardSnapshot | null>(null);
  const [selectedWork, setSelectedWork] = useState<ClassroomStudentWork | null>(null);
  const [wrapOpen, setWrapOpen] = useState(false);
  const [scratch, setScratch] = useState('');
  const [customScaffold, setCustomScaffold] = useState(3);
  const [bridgeStatus, setBridgeStatus] = useState<'loading' | 'online' | 'offline'>('loading');
  const [serverRoadmap, setServerRoadmap] = useState<{steps?: {title: string; detail: string}[]} | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const activeProfile = PROFILES[profile];

  useEffect(() => {
    const local = readClassroomSessionSnapshot();
    setSnapshot(local);
    setSelectedBoard(local.boardSnapshots[0] ?? null);
    setSelectedWork(local.studentWork[0] ?? null);
    fetchClassroomSessionContext().then((remote) => {
      if (!remote) { setBridgeStatus('offline'); return; }
      const next = {...remote.snapshot, studentWork: remote.snapshot.studentWork.length ? remote.snapshot.studentWork : local.studentWork};
      setSnapshot(next); setSelectedBoard(next.boardSnapshots[0] ?? null); setSelectedWork(next.studentWork[0] ?? null); setServerRoadmap(remote.roadmap); setBridgeStatus('online');
    });
    const saved = window.localStorage.getItem('socratic_student_profile') as ProfileId | null;
    if (saved && PROFILES[saved]) setProfile(saved);
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') window.localStorage.setItem('socratic_student_profile', profile);
    void saveStudentProfile('student_default', {profile_id: profile, display_name: activeProfile.name, scaffold_depth: customScaffold, pace: activeProfile.pace, difficulty: activeProfile.difficulty === 'HSG' ? 'OLYMPIAD_ADVANCED' : 'THPT_STANDARD', visual_first: profile === 'VISUAL'});
  }, [profile]);

  useEffect(() => {
    if (!selectedWork) return;
    void Promise.all(selectedWork.lines.filter((line) => line.status !== 'correct').map((line) => recordStudentError('student_default', {subject: selectedWork.subject, concept: selectedWork.title, diagnosis: line.diagnosis})));
    void recordStudentEvent('student_default', 'CLASSROOM_WORK_OPENED', {work_id: selectedWork.id, confidence: selectedWork.confidence});
  }, [selectedWork?.id]);

  const currentFormula = selectedBoard?.latex ?? snapshot.boardSnapshots[0]?.latex ?? '';
  const remediation = selectedWork?.remediation ?? 'Chọn một bài chữa trên bảng để nhận bài tập khắc phục cá nhân.';
  const classGroups = useMemo(() => [
    {label: 'Nhóm A · Sẵn sàng nâng cao', count: 14, tone: 'emerald', action: 'Bài tập cực trị và giới hạn'},
    {label: 'Nhóm B · Hay sập bẫy biên', count: 21, tone: 'amber', action: 'Ghost trail và Đúng / Sai'},
    {label: 'Nhóm C · Kẹt chuyển đổi', count: 9, tone: 'rose', action: 'Kèm đầu tiết và thứ nguyên'},
  ], []);

  const startScratch = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.strokeStyle = '#18181B'; ctx.lineWidth = 2; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(event.clientX - rect.left, event.clientY - rect.top);
    canvas.setPointerCapture(event.pointerId);
  };
  const moveScratch = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    const rect = event.currentTarget.getBoundingClientRect();
    ctx.lineTo(event.clientX - rect.left, event.clientY - rect.top); ctx.stroke();
  };

  return (
    <section data-testid="student-board-workbench" className="w-full max-w-6xl rounded-[24px] border border-[#E6E4DD] bg-white shadow-[0_18px_50px_-28px_rgba(24,24,27,0.45)] overflow-hidden text-stone-900">
      <div className="px-5 py-4 bg-[#FCFBF9] border-b border-[#E6E4DD] flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-stone-900 text-white flex items-center justify-center"><Layers className="w-4 h-4" /></div>
          <div><div className="flex items-center gap-2"><h2 className="text-sm font-semibold">Ngữ cảnh tiết học hôm nay</h2><span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">Read-only bridge</span></div><p className="text-[11px] text-stone-500">{snapshot.className} · {snapshot.lessonTitle} · cập nhật {formatUpdatedAt(snapshot.updatedAt)}</p></div>
        </div>
        <div className="flex items-center gap-2"><span className={`text-[10px] font-mono px-2 py-1 rounded-full border ${bridgeStatus === 'online' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : bridgeStatus === 'loading' ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-stone-100 text-stone-600 border-stone-200'}`}>{bridgeStatus === 'online' ? 'Context API online' : bridgeStatus === 'loading' ? 'Đang đồng bộ' : 'Offline fallback'}</span><button type="button" onClick={() => setIsExpanded((open) => !open)} className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-stone-900 text-white text-xs font-semibold">{isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />} {isExpanded ? 'Thu gọn' : 'Mở ngữ cảnh'}</button></div>
      </div>

      {!isExpanded && <div className="px-5 py-3 flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-2 text-xs text-stone-700"><span className="w-2 h-2 rounded-full bg-blue-600" /> Đang học theo <b>{activeProfile.name}</b><span className="text-stone-400">·</span><span>{snapshot.boardSnapshots.length} mốc bảng lớp</span><span className="text-stone-400">·</span><span>{selectedWork?.lines.filter((line) => line.status === 'error').length ?? 0} lỗi cần xem</span></div><button type="button" onClick={() => setIsExpanded(true)} className="text-xs font-semibold text-blue-700 hover:text-blue-900">Xem phân tích bài chữa <ChevronRight className="inline w-3.5 h-3.5" /></button></div>}

      {isExpanded && <>

      <div className="px-5 py-3 border-b border-[#E6E4DD] flex flex-col gap-2">
        <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-wider text-stone-500"><UserRound className="w-3.5 h-3.5" /> Hồ sơ học sinh 1:1</div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
          {(Object.keys(PROFILES) as ProfileId[]).map((id) => <button key={id} type="button" onClick={() => setProfile(id)} className={`text-left p-2.5 rounded-xl border transition ${toneClass(PROFILES[id].tone, profile === id)}`}><div className="text-xs font-semibold">{PROFILES[id].name}</div><div className="text-[10px] opacity-75 mt-0.5">{PROFILES[id].detail}</div><div className="flex gap-1.5 mt-2 text-[9px] font-mono"><span>{PROFILES[id].scaffold}</span><span>·</span><span>{PROFILES[id].difficulty}</span></div></button>)}
        </div>
        <div className="flex flex-wrap items-center gap-3 text-[10px] text-stone-600"><span>Persona: <b>{activeProfile.scaffold}</b></span><span>Nhịp: <b>{activeProfile.pace}</b></span><label className="inline-flex items-center gap-1.5">Độ giàn giáo <input type="range" min="1" max="5" value={customScaffold} onChange={(e) => setCustomScaffold(Number(e.target.value))} className="accent-blue-600" /> <b>{customScaffold}/5</b></label></div>
      </div>

      <div className="px-5 py-3 bg-[#F8F7F4] border-b border-[#E6E4DD] flex items-center gap-2 overflow-x-auto">
        <span className="text-[10px] font-mono uppercase tracking-wider text-stone-500 mr-1">Workbench</span>
        {([['VISUAL', 'Gỡ lỗi thị giác', Activity], ['BOARD', 'Bảng & bài chữa', BookOpen], ['AUDIT', 'Thứ nguyên & giới hạn', Gauge], ['SCRATCH', 'Bảng nháp', Pencil]] as const).map(([id, label, Icon]) => <button key={id} type="button" onClick={() => setPane(id)} className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs border whitespace-nowrap ${pane === id ? 'bg-white border-stone-300 text-stone-900 shadow-xs font-semibold' : 'border-transparent text-stone-600 hover:bg-white'}`}><Icon className="w-3.5 h-3.5" />{label}</button>)}
      </div>

      <div className="p-5 grid grid-cols-1 lg:grid-cols-[1fr_0.9fr] gap-5">
        <div className="min-h-[260px]">
          {pane === 'VISUAL' && <div className="flex flex-col gap-3"><div className="flex items-center justify-between"><div><h3 className="text-sm font-semibold">Trạng thái chuẩn ↔ bài làm</h3><p className="text-[11px] text-stone-500">Persona hiện tại: {activeProfile.detail}</p></div><span className="text-[10px] font-mono px-2 py-1 rounded bg-rose-50 text-rose-700 border border-rose-200">{selectedWork?.lines.filter((l) => l.status === 'error').length ?? 0} lỗi cần xem</span></div><div className="grid grid-cols-1 md:grid-cols-2 gap-3"><div className="rounded-xl border border-stone-200 bg-[#FCFBF9] p-3"><div className="text-[10px] font-mono uppercase tracking-wider text-stone-500 mb-2">Công thức từ bảng</div><MathView latex={currentFormula} displayMode={true} /><p className="text-[11px] text-stone-600 mt-3">{selectedBoard?.note}</p></div><ChemicalBalanceScale leftAtomsCount={3} rightAtomsCount={4} elementName="Fe/O" feedbackText={selectedWork?.lines[0]?.diagnosis ?? 'Chọn bài chữa để xem chênh lệch.'} /></div></div>}
          {pane === 'BOARD' && <div className="grid grid-cols-1 md:grid-cols-2 gap-3"><div><h3 className="text-sm font-semibold mb-2">Bảng và slide tiết học</h3>{snapshot.boardSnapshots.map((item) => <button key={item.id} type="button" onClick={() => setSelectedBoard(item)} className={`w-full text-left p-3 rounded-xl border mb-2 ${selectedBoard?.id === item.id ? 'bg-blue-50 border-blue-300' : 'bg-white border-[#E6E4DD]'}`}><div className="flex items-center justify-between"><span className="text-xs font-semibold">{item.title}</span><span className="text-[9px] font-mono text-stone-500">{item.kind}</span></div><div className="mt-2 overflow-x-auto"><MathView latex={item.latex} /></div></button>)}</div><div><h3 className="text-sm font-semibold mb-2">Bài chữa của học sinh</h3>{snapshot.studentWork.map((item) => <button key={item.id} type="button" onClick={() => setSelectedWork(item)} className={`w-full text-left p-3 rounded-xl border mb-2 ${selectedWork?.id === item.id ? 'bg-rose-50 border-rose-300' : 'bg-white border-[#E6E4DD]'}`}><div className="text-xs font-semibold">{item.title}</div><div className="text-[10px] text-stone-500 mt-1">OCR {Math.round(item.confidence * 100)}% · {item.capturedAt}</div><div className="text-[10px] text-rose-700 mt-2">{item.lines.filter((l) => l.status === 'error').length} dòng cần phân tích</div></button>)}</div></div>}
          {pane === 'AUDIT' && <div className="flex flex-col gap-4"><div><h3 className="text-sm font-semibold">Kiểm tra thứ nguyên</h3><p className="text-[11px] text-stone-500 mb-3">Đối chiếu nhanh theo công thức đang học, không thay thế verifier backend.</p><div className="rounded-xl bg-stone-900 text-white p-4 font-mono text-sm">[m/s²] <span className="text-stone-400">≡</span> [N/kg] <span className="text-emerald-300">✓ đồng nhất</span></div></div><div><h3 className="text-sm font-semibold mb-2">Khảo sát giới hạn</h3><div className="grid grid-cols-2 gap-2"><div className="p-3 rounded-xl border border-[#E6E4DD] bg-[#FCFBF9]"><span className="text-[10px] font-mono text-stone-500">α → 0°</span><div className="mt-2"><MathView latex="\\sin\\alpha \\to 0" /></div></div><div className="p-3 rounded-xl border border-[#E6E4DD] bg-[#FCFBF9]"><span className="text-[10px] font-mono text-stone-500">α → 90°</span><div className="mt-2"><MathView latex="\\cos\\alpha \\to 0" /></div></div></div></div></div>}
          {pane === 'SCRATCH' && <div><div className="flex items-center justify-between mb-2"><div><h3 className="text-sm font-semibold">Bảng nháp viết tay</h3><p className="text-[11px] text-stone-500">Dùng để thử ý tưởng; nội dung không tự động trở thành đáp án.</p></div><button type="button" onClick={() => {const c = canvasRef.current; c?.getContext('2d')?.clearRect(0, 0, c.width, c.height);}} className="inline-flex items-center gap-1 px-2 py-1 rounded-lg border border-[#DCD9D0] text-[10px]"><Eraser className="w-3 h-3" /> Xóa</button></div><canvas ref={canvasRef} width={720} height={240} onPointerDown={startScratch} onPointerMove={moveScratch} className="w-full h-56 rounded-xl border border-dashed border-stone-300 bg-[radial-gradient(#d6d3d1_0.7px,transparent_0.7px)] [background-size:16px_16px] touch-none" /><textarea value={scratch} onChange={(e) => setScratch(e.target.value)} placeholder="Ghi chú ngắn hoặc câu hỏi cần quay lại…" className="mt-3 w-full rounded-xl border border-[#E6E4DD] p-2 text-xs min-h-16" /></div>}
        </div>
        <aside className="rounded-2xl border border-[#E6E4DD] bg-[#FCFBF9] p-4 flex flex-col gap-4"><div className="flex items-center gap-2"><Target className="w-4 h-4 text-rose-600" /><div><h3 className="text-sm font-semibold">Lỗi sai cá nhân</h3><p className="text-[10px] text-stone-500">Sổ tay được cập nhật từ bài chữa hôm nay</p></div></div>{selectedWork?.lines.map((line) => <div key={line.id} className="rounded-xl border border-rose-200 bg-rose-50/60 p-2.5"><div className="flex items-center gap-2 text-[10px] font-mono text-rose-700"><ShieldAlert className="w-3 h-3" /> {line.status === 'error' ? 'Cần sửa bản chất' : 'Cần kiểm tra'}</div><div className="mt-2"><MathView latex={line.latex} /></div><p className="text-[11px] text-stone-700 mt-2">{line.diagnosis}</p></div>)}<div className="border-t border-[#E6E4DD] pt-3"><div className="text-[10px] font-mono uppercase tracking-wider text-stone-500">Bài tập khắc phục</div><p className="text-xs text-stone-800 mt-1">{remediation}</p><button type="button" onClick={() => setPane('VISUAL')} className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-blue-700">Mở mô phỏng liên quan <ChevronRight className="w-3.5 h-3.5" /></button></div></aside>
      </div>

      <div className="px-5 py-3 border-t border-[#E6E4DD] bg-[#FCFBF9] flex items-center justify-between"><div className="flex items-center gap-2 text-xs text-stone-600"><Users className="w-4 h-4 text-emerald-600" /> Lộ trình lớp học được tổng hợp từ {snapshot.studentWork.length} bài chữa hôm nay</div><button type="button" onClick={() => setWrapOpen(true)} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-stone-900 text-white text-xs font-semibold"><GitBranch className="w-3.5 h-3.5" /> Tổng kết & lộ trình</button></div>

      {wrapOpen && <div className="fixed inset-0 z-50 bg-stone-900/35 backdrop-blur-sm flex items-center justify-center p-4"><div className="w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white border border-[#E6E4DD] shadow-2xl p-5"><div className="flex items-center justify-between"><div><h2 className="font-semibold text-base">Tổng kết cuối buổi & lộ trình hỗ trợ</h2><p className="text-xs text-stone-500">{bridgeStatus === 'online' ? 'Roadmap đã lấy từ Student Context API.' : 'Roadmap cục bộ; backend chưa sẵn sàng.'}</p></div><button type="button" onClick={() => setWrapOpen(false)} className="p-1.5 rounded-lg hover:bg-stone-100"><X className="w-4 h-4" /></button></div><div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4"><div className="p-3 rounded-xl bg-blue-50 border border-blue-200"><div className="text-[10px] font-mono uppercase text-blue-700">Lộ trình cá nhân · {activeProfile.name}</div><ol className="text-xs text-stone-800 mt-2 space-y-2">{(serverRoadmap?.steps ?? [{title: 'Ôn lại điểm kẹt', detail: `Đối chiếu lại lỗi ${selectedWork?.subject === 'CHEMISTRY' ? 'số oxi hóa trung bình' : 'cộng vector và dấu lực ma sát'}.`}, {title: 'Một câu kiểm tra bẫy', detail: 'Làm một câu Đúng / Sai bẫy điều kiện biên.'}, {title: 'Bài mở rộng', detail: `Thử mức ${activeProfile.difficulty}.`}]).map((step, index) => <li key={step.title}>{index + 1}. <b>{step.title}:</b> {step.detail}</li>)}</ol></div><div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200"><div className="text-[10px] font-mono uppercase text-emerald-700">Roadmap cho giáo viên · 15 phút đầu tiết sau</div><div className="text-xs text-stone-800 mt-2 space-y-2"><p>01–05′: Chiếu lại dòng sai phổ biến và cho học sinh tự chỉ ra lỗi.</p><p>05–10′: Mở mô phỏng {selectedBoard?.title ?? 'chủ đề hôm nay'}.</p><p>10–15′: Làm nhanh một câu săn bẫy và phân nhóm hỗ trợ.</p></div></div></div><div className="mt-4"><div className="text-[10px] font-mono uppercase text-stone-500 mb-2">Phân loại nhóm năng lực</div><div className="grid grid-cols-1 sm:grid-cols-3 gap-2">{classGroups.map((g) => <div key={g.label} className="p-3 rounded-xl border border-[#E6E4DD] bg-[#FCFBF9]"><div className="text-xs font-semibold">{g.label}</div><div className="text-2xl font-mono tabular-nums mt-1">{g.count}</div><div className="text-[10px] text-stone-500 mt-1">{g.action}</div></div>)}</div></div><button type="button" onClick={() => {setWrapOpen(false); setPane('BOARD'); void recordStudentEvent('student_default', 'ROADMAP_REVIEWED', {bridge: bridgeStatus});}} className="mt-4 w-full py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold">Chuẩn bị bộ bài chữa cho buổi sau</button></div></div>}
      </>}
    </section>
  );
};
