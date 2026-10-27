'use client';

import React, {useEffect, useMemo, useRef, useState} from 'react';
import {Check, ClipboardCopy, Sparkles, X, Wand2, LineChart, Loader2, ArrowRightLeft, Type, GraduationCap, AlertTriangle} from 'lucide-react';
import type {Stroke} from '../../utils/lassoGeometry';
import {exportIsolatedWebp} from '../../utils/isolatedExporter';
import {
  recognizeLocal,
  recognizeWithAi,
  localVisualization,
  latexToPlain,
  sourceStrokes,
  type ConvertLine,
  type ConvertResult,
} from '../../utils/inkConvert';
import {MathView} from '../common/MathView';
import {detectSolidFromStrokes} from '../../utils/sketchSolid';
import {makeSolidBlueprint, SOLID_TITLES} from '../../utils/localRouter';
import {detectSubject, SUBJECT_LABEL, type Subject} from '../../utils/subjectContext';
import {findAmbiguousTokens, swapTokenInFormula} from '../../utils/ocrConfusions';
import type {SimulationBlueprint} from '@socratic/types';

export interface InkConvertPanelProps {
  /** nét viết cần chuyển; để trống khi sửa một công thức đã gõ */
  source: Stroke[];
  /** kết quả AI Vision đã quét trước từ SmartboardCanvas */
  initialAiResult?: ConvertResult | null;
  /** cờ báo AI Vision đang quét nền từ SmartboardCanvas */
  isAiScanning?: boolean;
  /** chế độ sửa công thức đã gõ */
  editing?: {latex: string; text: string} | null;
  /** tab chế độ ban đầu: VISUAL (công thức & trực quan) hoặc GRADE (chấm bài học sinh) */
  initialTab?: 'VISUAL' | 'GRADE';
  /** khóa môn học ngữ cảnh */
  initialSubject?: Subject | null;
  onSubjectChange?: (s: Subject | null) => void;
  onOpenConfig?: () => void;
  onClose: () => void;
  onApply: (lines: ConvertLine[], mode: 'replace' | 'insert') => void;
  onVisualizeLocal: (bp: SimulationBlueprint) => void;
  onVisualizeAi: (latex: string) => void;
  /** Enables the reviewed student-solution grading flow. */
  enableGrading?: boolean;
}

/** Bàn phím ký hiệu: [nhãn, đoạn chèn, số ký tự lùi con trỏ về sau khi chèn] */
const KEYS: [string, string, number][] = [
  ['x²', '^{2}', 0],
  ['xⁿ', '^{}', 1],
  ['xₙ', '_{}', 1],
  ['a/b', String.raw`\frac{}{}`, 3],
  ['√', String.raw`\sqrt{}`, 1],
  ['π', String.raw`\pi `, 0],
  ['α', String.raw`\alpha `, 0],
  ['θ', String.raw`\theta `, 0],
  ['ω', String.raw`\omega `, 0],
  ['×', String.raw`\times `, 0],
  ['÷', String.raw`\div `, 0],
  ['±', String.raw`\pm `, 0],
  ['≤', String.raw`\le `, 0],
  ['≥', String.raw`\ge `, 0],
  ['≠', String.raw`\ne `, 0],
  ['∞', String.raw`\infty `, 0],
  ['°', '^{\\circ}', 0],
  ['∫', String.raw`\int `, 0],
  ['sin', String.raw`\sin `, 0],
  ['cos', String.raw`\cos `, 0],
  ['→', String.raw`\rightarrow `, 0],
];

const pct = (v: number) => `${Math.round(v * 100)}%`;

const SUBJECT_OPTIONS: [Subject, string][] = [
  ['MATH', '#2563EB'],
  ['PHYSICS', '#7C3AED'],
  ['CHEMISTRY', '#D97706'],
  ['BIOLOGY', '#059669'],
];

export const InkConvertPanel: React.FC<InkConvertPanelProps> = ({
  source,
  editing,
  initialAiResult,
  isAiScanning = false,
  initialTab = 'VISUAL',
  initialSubject = null,
  onSubjectChange,
  onOpenConfig,
  onClose,
  onApply,
  onVisualizeLocal,
  onVisualizeAi,
  enableGrading = false,
}) => {
  const [activeTab, setActiveTab] = useState<'VISUAL' | 'GRADE'>(initialTab);
  const [selectedSubj, setSelectedSubj] = useState<Subject | null>(initialSubject);
  const src = useMemo(() => sourceStrokes(source), [source]);
  const sketch = useMemo(() => (editing || src.length < 4 ? null : detectSolidFromStrokes(src.map((x) => ({points: x.points})))), [src, editing]);
  const local = useMemo<ConvertResult | null>(() => (editing || !src.length ? null : recognizeLocal(src)), [src, editing]);
  const [ai, setAi] = useState<ConvertResult | null>(initialAiResult ?? null);
  const [aiState, setAiState] = useState<'idle' | 'loading' | 'done' | 'unavailable'>(
    initialAiResult ? 'done' : isAiScanning ? 'loading' : 'idle'
  );
  const [engine, setEngine] = useState<'local' | 'gemini'>(initialAiResult ? 'gemini' : 'local');
  const [lines, setLines] = useState<ConvertLine[]>(() =>
    editing
      ? [{text: editing.text, latex: editing.latex, confidence: 1, alternatives: []}]
      : initialAiResult?.lines.length
      ? initialAiResult.lines
      : local?.lines.length
      ? local.lines
      : [{text: '', latex: '', confidence: 0, alternatives: []}],
  );
  const [edited, setEdited] = useState(false);
  const [thumb, setThumb] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [expectedAnswer, setExpectedAnswer] = useState('');
  const [gradeState, setGradeState] = useState<'idle' | 'loading' | 'needs_clarification' | 'graded' | 'error'>('idle');
  const [gradeFeedback, setGradeFeedback] = useState('');
  const [gradeCorrect, setGradeCorrect] = useState<boolean | null>(null);
  const [gradeOptions, setGradeOptions] = useState<string[]>([]);
  const focusRef = useRef<{i: number; el: HTMLInputElement | null}>({i: 0, el: null});
  const inputs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  // ảnh chụp vùng nét viết để đối chiếu
  useEffect(() => {
    let alive = true;
    if (!src.length) return;
    exportIsolatedWebp(src)
      .then((r) => alive && setThumb(r.dataUrl))
      .catch(() => alive && setThumb(null));
    return () => {
      alive = false;
    };
  }, [src]);

  const handleSelectSubject = (s: Subject | null) => {
    setSelectedSubj(s);
    onSubjectChange?.(s);
    if (!editing && src.length > 0) {
      setAiState('loading');
      recognizeWithAi(src, { hint: s ? `Môn ${SUBJECT_LABEL[s]}` : undefined }).then((r) => {
        if (!r) {
          setAiState('unavailable');
          return;
        }
        setAi(r);
        setAiState('done');
        setEngine('gemini');
        setLines(r.lines);
        setEdited(false);
      });
    }
  };

  const runAiRecognition = () => {
    if (editing || !src.length) return;
    setAiState('loading');
    recognizeWithAi(src, { hint: selectedSubj ? `Môn ${SUBJECT_LABEL[selectedSubj]}` : undefined }).then((r) => {
      if (!r) {
        setAiState('unavailable');
        return;
      }
      setAi(r);
      setAiState('done');
      if (!edited) {
        setEngine('gemini');
        setLines(r.lines);
      }
    });
  };

  // nâng cấp bằng AI Vision ở nền
  useEffect(() => {
    if (initialAiResult) {
      setAi(initialAiResult);
      setAiState('done');
      if (!edited) {
        setEngine('gemini');
        setLines(initialAiResult.lines);
      }
      return;
    }
    if (editing || !src.length) return;
    let alive = true;
    setAiState('loading');
    recognizeWithAi(src).then((r) => {
      if (!alive) return;
      if (!r) {
        setAiState('unavailable');
        return;
      }
      setAi(r);
      setAiState('done');
      if (!edited) {
        setEngine('gemini');
        setLines(r.lines);
      }
    });
    return () => {
      alive = false;
    };
  }, [src, editing, initialAiResult]);

  const pick = (e: 'local' | 'gemini') => {
    const r = e === 'gemini' ? ai : local;
    if (!r) return;
    setEngine(e);
    setLines(r.lines.length ? r.lines : lines);
    setEdited(false);
  };

  const setLine = (i: number, patch: Partial<ConvertLine>) => {
    setEdited(true);
    setLines((ls) => ls.map((l, k) => (k === i ? {...l, ...patch} : l)));
  };

  const insertKey = (snip: string, back: number) => {
    const i = Math.min(focusRef.current.i, lines.length - 1);
    const el = inputs.current[i];
    const cur = lines[i]?.latex ?? '';
    const a = el?.selectionStart ?? cur.length;
    const b = el?.selectionEnd ?? cur.length;
    const next = cur.slice(0, a) + snip + cur.slice(b);
    setLine(i, {latex: next, text: latexToPlain(next)});
    requestAnimationFrame(() => {
      const e2 = inputs.current[i];
      if (e2) {
        e2.focus();
        const pos = a + snip.length - back;
        e2.setSelectionRange(pos, pos);
      }
    });
  };

  const joinedLatex = lines.map((l) => l.latex.trim()).filter(Boolean).join(String.raw` \\ `);
  const joinedText = lines.map((l) => (l.text || latexToPlain(l.latex)).trim()).filter(Boolean).join('\n');
  const subj = useMemo(() => detectSubject(`${joinedLatex}
${joinedText}`), [joinedLatex, joinedText]);
  const viz = useMemo(() => (joinedLatex ? localVisualization(joinedLatex) : null), [joinedLatex]);
  const conf = lines.length ? lines.reduce((s, l) => s + l.confidence, 0) / lines.length : 0;
  const unsure = !editing && engine === 'local' && (conf < 0.45 || lines.some((l) => l.valid === false));

  const copy = async (what: 'latex' | 'text') => {
    try {
      await navigator.clipboard.writeText(what === 'latex' ? joinedLatex : joinedText);
      setCopied(what);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      setCopied(null);
    }
  };

  const apply = (mode: 'replace' | 'insert') => {
    const out = lines
      .filter((l) => l.latex.trim())
      .map((l) => ({...l, text: l.text || latexToPlain(l.latex)}));
    if (out.length) onApply(out, mode);
  };

  const gradeSolution = async () => {
    if (!joinedLatex.trim() || !expectedAnswer.trim()) return;
    setGradeState('loading');
    setGradeFeedback('');
    setGradeCorrect(null);
    try {
      const alternatives = lines.flatMap((line) => line.alternatives.map((a) => a.latex));
      const response = await fetch('/api/v1/companion/grade-solution', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          solution_latex: joinedLatex,
          expected_answer: expectedAnswer,
          subject: subj.subject ?? 'MATH',
          ocr_confidence: conf,
          alternatives,
        }),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const result = await response.json() as {
        status: 'GRADED' | 'NEEDS_CLARIFICATION';
        feedback?: string;
        is_correct?: boolean;
        options?: string[];
      };
      setGradeState(result.status === 'GRADED' ? 'graded' : 'needs_clarification');
      setGradeFeedback(result.feedback ?? '');
      setGradeCorrect(result.is_correct ?? null);
      setGradeOptions(result.options ?? []);
    } catch {
      setGradeState('error');
      setGradeFeedback('Không kết nối được máy chấm. Giữ nguyên bài để giáo viên kiểm tra thủ công.');
    }
  };

  const chooseGradeOption = (option: string) => {
    if (!lines.length) return;
    setLine(0, {latex: option, text: latexToPlain(option)});
    setGradeState('idle');
    setGradeFeedback('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/35 backdrop-blur-[2px] p-3" data-testid="ink-convert-overlay">
      <div
        data-testid="ink-convert-panel"
        className="w-full max-w-3xl max-h-[92vh] overflow-y-auto rounded-2xl bg-white border border-[#E6E4DD] shadow-[0_20px_60px_-10px_rgba(20,20,19,0.35)] flex flex-col"
      >
        {/* Tiêu đề & Chế độ Chuyển đổi */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 border-b border-[#E6E4DD] sticky top-0 bg-white/95 backdrop-blur z-10">
          <div className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0">
              <Wand2 className="w-4 h-4" />
            </span>
            <div>
              <h2 className="text-sm font-semibold text-stone-900">
                {editing ? 'Sửa công thức' : activeTab === 'GRADE' ? 'Chấm bài chữa trên bảng' : 'Chữ viết tay → văn bản & công thức chuẩn'}
              </h2>
              <p className="text-[11px] text-stone-500">
                {editing
                  ? 'Chỉnh LaTeX hoặc dùng bàn phím ký hiệu, xem trước ngay.'
                  : activeTab === 'GRADE'
                  ? 'Đối chiếu bài làm của học sinh với đáp án chuẩn và nhận diện sai số.'
                  : 'Kiểm tra, sửa nếu cần, rồi thay nét viết bằng công thức gõ sạch trên bảng.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 ml-auto">
            {!editing && enableGrading && (
              <div className="flex items-center bg-[#F2F0EA] p-0.5 rounded-xl border border-[#E6E4DD]" data-testid="ink-mode-tabs">
                <button
                  type="button"
                  data-testid="ink-tab-visual"
                  onClick={() => setActiveTab('VISUAL')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                    activeTab === 'VISUAL'
                      ? 'bg-blue-600 text-white shadow-2xs'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Công thức & Trực quan</span>
                </button>
                <button
                  type="button"
                  data-testid="ink-tab-grade"
                  onClick={() => setActiveTab('GRADE')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                    activeTab === 'GRADE'
                      ? 'bg-violet-600 text-white shadow-2xs'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  <GraduationCap className="w-3.5 h-3.5" />
                  <span>Chấm bài</span>
                </button>
              </div>
            )}
            <button onClick={onClose} data-testid="ink-convert-close" className="p-1.5 rounded-lg hover:bg-stone-100 text-stone-500 transition cursor-pointer" title="Đóng (Esc)">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="p-5 flex flex-col gap-4">
          {/* Bộ chọn phân môn nhận diện (Ép sát context khoa học) */}
          {!editing && (
            <div className="flex flex-wrap items-center justify-between gap-2 p-2 rounded-xl bg-[#F8F7F4] border border-[#E6E4DD]" data-testid="ink-subject-selector">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[10px] font-mono uppercase text-stone-500 font-semibold px-1">
                  Môn nhận diện:
                </span>
                <button
                  type="button"
                  data-testid="ink-subject-auto"
                  onClick={() => handleSelectSubject(null)}
                  className={`px-2.5 py-0.5 rounded-full text-xs transition cursor-pointer font-medium border ${
                    selectedSubj === null
                      ? 'bg-stone-900 text-white border-stone-900 shadow-2xs'
                      : 'bg-white text-stone-700 border-[#DCD9D0] hover:bg-stone-50'
                  }`}
                >
                  Tự động
                </button>
                {SUBJECT_OPTIONS.map(([k, c]) => (
                  <button
                    key={k}
                    type="button"
                    data-testid={`ink-subject-${k.toLowerCase()}`}
                    onClick={() => handleSelectSubject(selectedSubj === k ? null : k)}
                    className="px-2.5 py-0.5 rounded-full text-xs font-medium transition cursor-pointer border"
                    style={
                      selectedSubj === k
                        ? { background: c, color: '#fff', borderColor: c, boxShadow: '0 1px 2px rgba(0,0,0,0.08)' }
                        : { color: c, borderColor: `${c}55`, background: `${c}0c` }
                    }
                  >
                    {SUBJECT_LABEL[k]}
                  </button>
                ))}
              </div>
              {subj.subject && selectedSubj === null && (
                <span className="text-[10px] font-mono text-stone-500 pr-1">
                  Nhận diện tự động: <strong className="text-stone-800">{SUBJECT_LABEL[subj.subject as Subject]}</strong>
                </span>
              )}
            </div>
          )}
          {/* Nguồn + động cơ */}
          {!editing && (
            <div className="flex flex-col sm:flex-row gap-3 items-stretch">
              <div className="sm:w-56 shrink-0 rounded-xl border border-[#E6E4DD] bg-[#FCFBF9] p-2 flex items-center justify-center min-h-[84px]">
                {thumb ? <img src={thumb} alt="Nét viết gốc" data-testid="ink-convert-thumb" className="max-h-24 w-auto object-contain" /> : <span className="text-[10px] font-mono text-stone-400">nét viết gốc</span>}
              </div>
              <div className="flex-1 flex flex-col gap-2">
                <div className="flex flex-wrap items-center gap-2" data-testid="ink-convert-engines">
                  <button
                    data-testid="ink-engine-local"
                    onClick={() => pick('local')}
                    disabled={!local}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border transition ${engine === 'local' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-white text-stone-600 border-[#DCD9D0] hover:bg-stone-50'}`}
                  >
                    ⚡ Tức thì{local ? ` · ${Math.round(local.ms)} ms` : ''}
                  </button>
                  <button
                    data-testid="ink-engine-ai"
                    onClick={() => pick('gemini')}
                    disabled={!ai}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border transition disabled:opacity-50 ${engine === 'gemini' ? 'bg-violet-50 text-violet-700 border-violet-200' : 'bg-white text-stone-600 border-[#DCD9D0] hover:bg-stone-50'}`}
                  >
                    {aiState === 'loading' ? (
                      <span className="inline-flex items-center gap-1">
                        <Loader2 className="w-3 h-3 animate-spin" /> AI Vision…
                      </span>
                    ) : (
                      <>✨ AI Vision{ai ? ` · ${Math.round(ai.ms)} ms` : ''}</>
                    )}
                  </button>
                  <span className="text-[11px] text-stone-500 font-mono" data-testid="ink-convert-confidence">
                    tin cậy {pct(conf)}
                  </span>
                </div>
                {aiState === 'unavailable' && (
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-[11px] text-amber-900" data-testid="ink-convert-ai-note">
                    <span className="leading-relaxed">
                      Chưa nhận được phản hồi AI Vision. Đang dùng nhận dạng tức thì. Render có thể đang khởi động từ trạng thái ngủ hoặc cần kết nối lại.
                    </span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          if (onOpenConfig) {
                            onOpenConfig();
                          } else if (typeof window !== 'undefined') {
                            window.dispatchEvent(new CustomEvent('open-ai-backend-config'));
                          }
                        }}
                        className="px-2.5 py-1 rounded-lg bg-white hover:bg-stone-50 text-stone-700 font-medium border border-stone-300 transition cursor-pointer"
                        title="Kiểm tra kết nối và cấu hình URL Render / Gemini API Key"
                      >
                        ⚙ Ping & Cấu hình
                      </button>
                      <button
                        type="button"
                        onClick={runAiRecognition}
                        className="px-2.5 py-1 rounded-lg bg-violet-600 hover:bg-violet-700 text-white font-medium shadow-xs transition cursor-pointer"
                      >
                        Thử lại AI Vision
                      </button>
                    </div>
                  </div>
                )}
                {unsure && (
                  <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2 py-1" data-testid="ink-convert-unsure">
                    Chưa chắc chắn — hãy soát lại từng ký tự bên dưới (có thể sửa trực tiếp hoặc chọn phương án gợi ý).
                  </p>
                )}
              </div>
            </div>
          )}

          {subj.subject && (
            <div className="text-[11px] text-stone-600" data-testid="ink-convert-subject">
              Nhận ra môn <b>{SUBJECT_LABEL[subj.subject]}</b> — dấu hiệu: {subj.evidence.join(', ')}.
            </div>
          )}
          {sketch && sketch.confidence >= 0.7 && (
            <div className="flex flex-wrap items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2" data-testid="ink-convert-sketch">
              <span className="text-xs text-emerald-900">
                Nét vẽ giống <b>{SOLID_TITLES[sketch.kind]}</b> ({sketch.note}).
              </span>
              <button
                data-testid="ink-convert-sketch-build"
                onClick={() => onVisualizeLocal(makeSolidBlueprint(sketch.kind, sketch.dims))}
                className="ml-auto px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white transition"
              >
                Dựng khối 3D
              </button>
            </div>
          )}

          {/* Các dòng */}
          <div className="flex flex-col gap-3">
            {lines.map((l, i) => (
              <div key={i} className="rounded-xl border border-[#E6E4DD] bg-[#FCFBF9] p-3 flex flex-col gap-2" data-testid={`ink-convert-line-${i}`}>
                <div className="min-h-[44px] flex items-center overflow-x-auto text-stone-900 text-xl" data-testid={`ink-convert-preview-${i}`}>
                  {l.latex.trim() ? <MathView latex={l.latex} displayMode={false} /> : <span className="text-xs text-stone-400 font-mono">(trống)</span>}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-stone-400 shrink-0">LaTeX</span>
                  <input
                    ref={(el) => {
                      inputs.current[i] = el;
                    }}
                    data-testid={`ink-convert-input-${i}`}
                    value={l.latex}
                    onFocus={(e) => {
                      focusRef.current = {i, el: e.currentTarget};
                    }}
                    onChange={(e) => setLine(i, {latex: e.target.value, text: latexToPlain(e.target.value)})}
                    spellCheck={false}
                    className="flex-1 px-2.5 py-1.5 rounded-lg bg-white border border-[#E6E4DD] text-xs font-mono text-stone-900 focus:outline-none focus:border-blue-500"
                  />
                  {l.valid === false && <span className="text-[10px] text-amber-700 font-mono shrink-0">cần soát</span>}
                </div>
                {l.alternatives.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5" data-testid={`ink-convert-alts-${i}`}>
                    <span className="text-[10px] font-mono uppercase tracking-wider text-stone-400">Có thể là</span>
                    {l.alternatives.map((a, k) => (
                      <button
                        key={k}
                        onClick={() => setLine(i, {latex: a.latex, text: a.text || latexToPlain(a.latex)})}
                        className="px-2 py-0.5 rounded-md bg-white border border-[#DCD9D0] hover:border-blue-400 hover:bg-blue-50 text-xs transition"
                        title={a.latex}
                      >
                        <MathView latex={a.latex} />
                      </button>
                    ))}
                  </div>
                )}
                {/* 1-Tap Ambiguous OCR Tokens Swap Chips khi confidence thấp hoặc cần soát */}
                {(l.confidence < 0.85 || l.valid === false) && findAmbiguousTokens(l.latex).length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5 p-2 rounded-lg bg-amber-50/70 border border-amber-200/80" data-testid={`ink-convert-confusions-${i}`}>
                    <span className="text-[10px] font-mono font-medium text-amber-800">
                      Sửa ký tự nghi ngờ:
                    </span>
                    {findAmbiguousTokens(l.latex).map((conf) =>
                      conf.alternatives.map((alt) => (
                        <button
                          key={`${conf.token}-${alt}`}
                          type="button"
                          onClick={() => {
                            const updated = swapTokenInFormula(l.latex, conf.token, alt);
                            setLine(i, { latex: updated, text: latexToPlain(updated) });
                          }}
                          className="px-2 py-0.5 rounded-md bg-white hover:bg-amber-100 border border-amber-300 text-xs font-mono text-amber-900 transition cursor-pointer shadow-2xs active:translate-y-px"
                          title={`Đổi ${conf.token} thành ${alt}`}
                        >
                          {conf.token} ⇄ {alt}
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Bảng Chấm Bài Học Sinh (Chỉ hiện khi chọn tab Chấm bài) */}
          {enableGrading && !editing && activeTab === 'GRADE' && (
            <div className="rounded-xl border border-violet-200 bg-violet-50/60 p-3.5 flex flex-col gap-2.5 animate-in fade-in" data-testid="solution-grading-panel">
              <div className="flex items-center gap-2">
                <span className="w-7 h-7 rounded-lg bg-violet-600 text-white flex items-center justify-center"><GraduationCap className="w-4 h-4" /></span>
                <div>
                  <h3 className="text-xs font-semibold text-violet-950">Chấm bài chữa trên bảng</h3>
                  <p className="text-[10px] text-violet-800/70">Chỉ chấm sau khi LaTeX và đáp án chuẩn đã rõ ràng.</p>
                </div>
                <span className={`ml-auto text-[10px] font-mono px-2 py-0.5 rounded-md border ${conf < 0.72 ? 'bg-amber-50 text-amber-800 border-amber-200' : 'bg-emerald-50 text-emerald-800 border-emerald-200'}`}>
                  OCR {pct(conf)}
                </span>
              </div>
              <input
                data-testid="solution-expected-input"
                value={expectedAnswer}
                onChange={(e) => { setExpectedAnswer(e.target.value); setGradeState('idle'); }}
                placeholder="Đáp án chuẩn / biểu thức cần đối chiếu"
                className="w-full px-2.5 py-2 rounded-lg bg-white border border-violet-200 text-xs font-mono text-stone-900 focus:outline-none focus:border-violet-500"
              />
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  data-testid="solution-grade-btn"
                  onClick={gradeSolution}
                  disabled={!joinedLatex.trim() || !expectedAnswer.trim() || gradeState === 'loading'}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-700 disabled:opacity-40 text-white text-xs font-semibold transition"
                >
                  {gradeState === 'loading' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <GraduationCap className="w-3.5 h-3.5" />}
                  {gradeState === 'loading' ? 'Đang chấm…' : 'Chấm bài'}
                </button>
                {gradeState === 'needs_clarification' && <span className="text-[10px] text-amber-800 inline-flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Cần xác nhận ký hiệu</span>}
                {gradeState === 'graded' && <span className={`text-xs font-semibold ${gradeCorrect ? 'text-emerald-700' : 'text-rose-700'}`}>{gradeCorrect ? 'Đúng' : 'Cần sửa'}</span>}
              </div>
              {gradeFeedback && <p data-testid="solution-grade-feedback" className="text-xs text-stone-700 bg-white/80 border border-violet-100 rounded-lg px-2.5 py-2">{gradeFeedback}</p>}
              {gradeState === 'needs_clarification' && gradeOptions.length > 0 && (
                <div className="flex flex-wrap gap-1.5" data-testid="solution-grade-options">
                  <span className="text-[10px] text-stone-500 self-center">Có thể là:</span>
                  {gradeOptions.map((option) => <button key={option} type="button" onClick={() => chooseGradeOption(option)} className="px-2 py-1 rounded-md bg-white border border-violet-200 hover:bg-violet-100 text-xs font-mono">{option}</button>)}
                </div>
              )}
            </div>
          )}

          {/* Bàn phím ký hiệu */}
          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] font-mono uppercase tracking-wider text-stone-400">Bàn phím ký hiệu</span>
            <div className="flex flex-wrap gap-1" data-testid="ink-convert-keypad">
              {KEYS.map(([label, snip, back]) => (
                <button
                  key={label}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => insertKey(snip, back)}
                  className="min-w-9 px-2 py-1.5 rounded-lg bg-white border border-[#DCD9D0] hover:bg-stone-50 hover:border-stone-400 text-sm text-stone-800 transition"
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Hành động */}
        <div className="px-5 py-3 border-t border-[#E6E4DD] bg-[#FCFBF9] flex flex-wrap items-center gap-2 sticky bottom-0 rounded-b-2xl">
          {editing ? (
            <button
              data-testid="ink-convert-apply"
              onClick={() => apply('replace')}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition"
            >
              <Check className="w-3.5 h-3.5" /> Cập nhật công thức
            </button>
          ) : (
            <>
              <button
                data-testid="ink-convert-apply"
                onClick={() => apply('replace')}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition"
                title="Xóa nét viết tay và đặt công thức chuẩn vào đúng chỗ đó"
              >
                <Check className="w-3.5 h-3.5" /> Thay nét viết bằng công thức
              </button>
              <button
                data-testid="ink-convert-insert"
                onClick={() => apply('insert')}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-white hover:bg-stone-50 border border-[#DCD9D0] text-stone-700 transition"
                title="Giữ nét viết tay, thêm công thức chuẩn bên phải"
              >
                <ArrowRightLeft className="w-3.5 h-3.5" /> Giữ nét, chèn bên cạnh
              </button>
            </>
          )}
          <div className="flex items-center gap-1.5 ml-auto">
            <button
              data-testid="ink-convert-copy-latex"
              onClick={() => copy('latex')}
              className="flex items-center gap-1 px-2.5 py-2 rounded-lg text-[11px] font-medium bg-white hover:bg-stone-50 border border-[#DCD9D0] text-stone-700 transition"
            >
              <ClipboardCopy className="w-3.5 h-3.5" /> {copied === 'latex' ? 'Đã chép' : 'LaTeX'}
            </button>
            <button
              data-testid="ink-convert-copy-text"
              onClick={() => copy('text')}
              className="flex items-center gap-1 px-2.5 py-2 rounded-lg text-[11px] font-medium bg-white hover:bg-stone-50 border border-[#DCD9D0] text-stone-700 transition"
            >
              <Type className="w-3.5 h-3.5" /> {copied === 'text' ? 'Đã chép' : 'Văn bản'}
            </button>
            {!editing &&
              (viz ? (
                <button
                  data-testid="ink-convert-visualize-local"
                  onClick={() => onVisualizeLocal(viz)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white transition"
                  title="Dựng ngay, không cần AI"
                >
                  <LineChart className="w-3.5 h-3.5" /> {viz.templateId === 'GEO_SOLID' ? 'Dựng khối 3D' : 'Vẽ đồ thị'}
                </button>
              ) : (
                <button
                  data-testid="ink-convert-visualize-ai"
                  onClick={() => joinedLatex && onVisualizeAi(joinedLatex)}
                  disabled={!joinedLatex}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-violet-600 hover:bg-violet-700 disabled:opacity-40 text-white transition"
                >
                  <Sparkles className="w-3.5 h-3.5" /> Trực quan hóa
                </button>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
};
