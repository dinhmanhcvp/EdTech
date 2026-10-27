'use client';

import React, {useState} from 'react';
import {SimulationBlueprint} from '@socratic/types';
import {Mic, MicOff, Sparkles, Send, X, Play, Layers, TrendingUp, Cpu} from 'lucide-react';
import {MathView} from '../common/MathView';

export interface VoiceQaVisualAction {
  id: string;
  label: string;
  sublabel: string;
  badge: string;
  previewType: 'HEXAGON_CUBE' | 'TRIANGLE_CUBE' | 'MULTI_GRAPH' | 'PYRAMID_SECTION' | 'PENDULUM_WAVE';
  blueprint: SimulationBlueprint;
}

export interface VoiceQaAnswer {
  question: string;
  headline: string;
  explanation: string;
  formulaLatex: string;
  actions: VoiceQaVisualAction[];
}

const PRESET_QA_BANK: {match: RegExp; answer: VoiceQaAnswer}[] = [
  {
    match: /lập phương|thiết diện|diện tích lớn nhất|mặt cắt|đa diện|hình học không gian/i,
    answer: {
      question: 'Trong hình lập phương cạnh a, thiết diện nào có diện tích lớn nhất và biến đổi ra sao?',
      headline: 'Thiết diện có diện tích lớn nhất là Hình chữ nhật chéo (S = a²√2), còn thiết diện nhiều cạnh nhất là Lục giác đều!',
      explanation:
        'Khi mặt phẳng cắt đi qua tâm O và vuông góc với đường chéo chính AC\', thiết diện tạo thành một Lục giác đều cạnh a√2/2 với diện tích S = (3√3/4)a² ≈ 1.30a². Trong khi đó, mặt phẳng chứa hai cạnh đối diện (như AB và C\'D\') tạo ra thiết diện Hình chữ nhật kích thước a × a√2 có diện tích cực đại S = a²√2 ≈ 1.414a².',
      formulaLatex: 'S_{\\text{lục giác đều}} = \\frac{3\\sqrt{3}}{4}a^2 \\approx 1{,}30a^2, \\quad S_{\\max(\\text{HCN chéo})} = a^2\\sqrt{2} \\approx 1{,}414a^2',
      actions: [
        {
          id: 'act-hexagon',
          label: 'Minh họa Thiết diện Lục giác đều (6 cạnh)',
          sublabel: 'Mặt phẳng đi qua trung điểm 6 cạnh của hình lập phương',
          badge: '3D + Mặt cắt 2D',
          previewType: 'HEXAGON_CUBE',
          blueprint: {
            engine: 'GEOMETRY',
            templateId: 'GEO_SOLID',
            recognizedLatex: '\\text{Thiết diện Lục giác đều — Hình lập phương}',
            ocrAlternatives: [],
            parameters: [],
            meta: {
              solid: 'cube',
              dims: {a: 2},
              initialMode: 'section',
              sectionNormal: [1, 1, 1],
              sectionOffset: 0,
            },
            socraticQuestion: 'Tại sao mặt phẳng vuông góc với đường chéo chính đi qua tâm lại cắt đúng trung điểm của 6 cạnh tạo thành lục giác đều?',
            curriculumLevel: 'THPT_STANDARD',
          },
        },
        {
          id: 'act-triangle',
          label: 'Minh họa Thiết diện Tam giác đều (3 cạnh)',
          sublabel: 'Mặt phẳng cắt gần một đỉnh của hình lập phương',
          badge: '3D + Mặt cắt 2D',
          previewType: 'TRIANGLE_CUBE',
          blueprint: {
            engine: 'GEOMETRY',
            templateId: 'GEO_SOLID',
            recognizedLatex: '\\text{Thiết diện Tam giác đều — Hình lập phương}',
            ocrAlternatives: [],
            parameters: [],
            meta: {
              solid: 'cube',
              dims: {a: 2},
              initialMode: 'section',
              sectionNormal: [1, 1, 1],
              sectionOffset: 1.15,
            },
            socraticQuestion: 'Khi tịnh tiến mặt phẳng cắt từ đỉnh A vào tâm O, thiết diện chuyển tiếp từ Tam giác đều sang Lục giác đều tại thời điểm nào?',
            curriculumLevel: 'THPT_STANDARD',
          },
        },
        {
          id: 'act-pyramid-sec',
          label: 'Minh họa Thiết diện Hình chóp S.ABCD',
          sublabel: 'Khảo sát thiết diện ngũ giác & tứ giác trên hình chóp',
          badge: 'Hình chóp 3D',
          previewType: 'PYRAMID_SECTION',
          blueprint: {
            engine: 'GEOMETRY',
            templateId: 'GEO_SOLID',
            recognizedLatex: '\\text{Thiết diện Hình chóp tứ giác đều } S.ABCD',
            ocrAlternatives: [],
            parameters: [],
            meta: {
              solid: 'pyramid4',
              dims: {a: 2, h: 2.5},
              initialMode: 'section',
              sectionNormal: [0.6, 0.3, 0.74],
              sectionOffset: -0.2,
            },
            socraticQuestion: 'Khi nào mặt phẳng cắt hình chóp tứ giác đều S.ABCD tạo thành một ngũ giác?',
            curriculumLevel: 'THPT_STANDARD',
          },
        },
      ],
    },
  },
  {
    match: /tương giao|giao điểm|hai hàm|2 hàm|đồ thị|parabol|sin/i,
    answer: {
      question: 'Làm sao khảo sát trực quan số giao điểm của parabol y = x² − 3 và hàm lượng giác y = A sin x + B?',
      headline: 'Đưa đồng thời cả 2 hàm vào hệ trục tương giao nền tối và cho tham số A, B chạy biến thiên tự động!',
      explanation:
        'Số nghiệm của phương trình hoành độ giao điểm x² − 3 = A sin x + B chính là số giao điểm của hai đường cong. Khi kéo thanh trượt B tịnh tiến theo phương thẳng đứng hoặc bấm ▶ Auto-Play cho biên độ A biến thiên, học sinh thấy ngay khoảnh khắc tiếp xúc (nghiệm kép) và sự phân nhánh số giao điểm.',
      formulaLatex: 'x^2 - 3 = A\\sin x + B \\iff f(x) = g(x)',
      actions: [
        {
          id: 'act-multigraph',
          label: 'Mở Đồ thị Tương giao Đa hàm (y = x² − 3 & y = A sin x + B)',
          sublabel: 'Kèm HUD thanh trượt A, B góc phải và nút ▶ Auto-Play',
          badge: 'Đa hàm 60FPS',
          previewType: 'MULTI_GRAPH',
          blueprint: {
            engine: 'MATH',
            templateId: 'MATH_GRAPH',
            recognizedLatex: 'y = x^2 - 3, \\quad y = A\\sin x + B',
            ocrAlternatives: [],
            expressions: ['y = x^2 - 3', 'y = A sin x + B'],
            parameters: [],
            socraticQuestion: 'Khi biên độ A và độ lệch B biến thiên, số giao điểm tối đa của parabol và đường hình sin này là bao nhiêu?',
            curriculumLevel: 'THPT_STANDARD',
          },
        },
      ],
    },
  },
];

export function resolveVoiceQaQuery(query: string): VoiceQaAnswer {
  const q = (query || '').trim();
  for (const item of PRESET_QA_BANK) {
    if (item.match.test(q)) {
      return {
        ...item.answer,
        question: q || item.answer.question,
      };
    }
  }
  // Mặc định trả về câu trả lời thiết diện hình lập phương + đa hàm tương giao để giáo viên luôn có mô hình minh họa tức thì
  return {
    ...PRESET_QA_BANK[0].answer,
    question: q || PRESET_QA_BANK[0].answer.question,
    actions: [
      ...PRESET_QA_BANK[0].answer.actions.slice(0, 2),
      PRESET_QA_BANK[1].answer.actions[0],
    ],
  };
}

export interface VoiceAiQaCardProps {
  isOpen: boolean;
  initialQuery?: string;
  isListening?: boolean;
  onStartVoice?: () => void;
  onClose: () => void;
  onSpawnBlueprint: (bp: SimulationBlueprint) => void;
}

const MiniAnimatedPreview: React.FC<{type: VoiceQaVisualAction['previewType']}> = ({type}) => {
  if (type === 'HEXAGON_CUBE' || type === 'TRIANGLE_CUBE' || type === 'PYRAMID_SECTION') {
    const isHex = type === 'HEXAGON_CUBE';
    return (
      <svg viewBox="0 0 88 64" className="w-20 h-14 rounded-lg bg-slate-900 border border-cyan-500/40 shrink-0">
        {/* Khung lập phương 3D */}
        <polygon points="24,14 58,14 68,26 34,26" fill="none" stroke="#64748B" strokeWidth="1.2" />
        <polygon points="24,38 58,38 68,50 34,50" fill="none" stroke="#64748B" strokeWidth="1.2" strokeDasharray="2 2" />
        <line x1="24" y1="14" x2="24" y2="38" stroke="#64748B" strokeWidth="1.2" />
        <line x1="58" y1="14" x2="58" y2="38" stroke="#64748B" strokeWidth="1.2" />
        <line x1="68" y1="26" x2="68" y2="50" stroke="#64748B" strokeWidth="1.2" />
        <line x1="34" y1="26" x2="34" y2="50" stroke="#64748B" strokeWidth="1.2" strokeDasharray="2 2" />
        {isHex ? (
          <polygon
            points="41,14 63,20 68,38 51,50 29,44 24,26"
            fill="rgba(6, 182, 212, 0.45)"
            stroke="#22D3EE"
            strokeWidth="1.8"
          />
        ) : (
          <polygon
            points="44,14 64,22 58,36"
            fill="rgba(245, 158, 11, 0.45)"
            stroke="#FBBF24"
            strokeWidth="1.8"
          />
        )}
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 88 64" className="w-20 h-14 rounded-lg bg-slate-900 border border-indigo-500/40 shrink-0">
      <line x1="8" y1="36" x2="80" y2="36" stroke="#475569" strokeWidth="1" />
      <line x1="44" y1="6" x2="44" y2="58" stroke="#475569" strokeWidth="1" />
      {/* Parabol y = x^2 - 3 */}
      <path d="M 20,10 Q 44,58 68,10" fill="none" stroke="#FB7185" strokeWidth="2" />
      {/* Đường sin y = A sin x + B */}
      <path d="M 10,36 C 26,14 38,52 54,28 C 66,14 74,42 82,30" fill="none" stroke="#38BDF8" strokeWidth="2" />
      <circle cx="30" cy="31" r="3" fill="#FACC15" />
      <circle cx="59" cy="24" r="3" fill="#FACC15" />
    </svg>
  );
};

export const VoiceAiQaCard: React.FC<VoiceAiQaCardProps> = ({
  isOpen,
  initialQuery = 'Trong hình lập phương, thiết diện nào có diện tích lớn nhất?',
  isListening = false,
  onStartVoice,
  onClose,
  onSpawnBlueprint,
}) => {
  const [query, setQuery] = useState(initialQuery);
  const [answer, setAnswer] = useState<VoiceQaAnswer>(() => resolveVoiceQaQuery(initialQuery));

  if (!isOpen) return null;

  const handleAsk = (customQ?: string) => {
    const target = customQ ?? query;
    setQuery(target);
    setAnswer(resolveVoiceQaQuery(target));
  };

  return (
    <div
      data-testid="voice-ai-qa-card"
      className="fixed bottom-24 right-6 z-50 w-[min(520px,calc(100vw-24px))] rounded-2xl bg-slate-950/95 backdrop-blur-xl border border-cyan-500/40 text-slate-100 shadow-[0_20px_60px_rgba(0,0,0,0.55)] p-4 flex flex-col gap-3 animate-in fade-in slide-in-from-bottom-3 duration-150"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
        <div className="flex items-center gap-2">
          <span className="w-7 h-7 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white shadow-sm">
            <Sparkles className="w-4 h-4" />
          </span>
          <div>
            <div className="text-xs font-bold tracking-wide text-white flex items-center gap-1.5">
              <span>Hỏi Đáp AI Giọng Nói & Mô Hình Minh Họa Động</span>
              <span className="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-400/30">
                Live Q&A
              </span>
            </div>
            <div className="text-[10px] text-slate-400">
              Đặt câu hỏi bằng giọng nói hoặc văn bản — bấm 1 chạm để bung mô phỏng lên bảng
            </div>
          </div>
        </div>
        <button
          type="button"
          data-testid="voice-qa-close-btn"
          onClick={onClose}
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          title="Đóng thẻ Hỏi đáp AI"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Ô nhập câu hỏi + Nút Mic Giọng nói */}
      <div className="flex items-center gap-1.5">
        <input
          type="text"
          data-testid="voice-qa-input"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleAsk();
          }}
          placeholder="Hỏi AI (VD: Trong hình lập phương, thiết diện nào có diện tích lớn nhất?)..."
          className="flex-1 px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-cyan-400"
        />
        {onStartVoice && (
          <button
            type="button"
            data-testid="voice-qa-mic-btn"
            onClick={onStartVoice}
            className={`p-2 rounded-xl border transition cursor-pointer ${
              isListening
                ? 'bg-rose-600 border-rose-400 text-white animate-pulse'
                : 'bg-slate-900 hover:bg-slate-800 border-slate-700 text-cyan-300'
            }`}
            title="Nói câu hỏi bằng giọng nói"
          >
            {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </button>
        )}
        <button
          type="button"
          data-testid="voice-qa-submit-btn"
          onClick={() => handleAsk()}
          className="px-3 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold flex items-center gap-1 transition cursor-pointer shadow-sm"
        >
          <Send className="w-3.5 h-3.5" />
          <span>Hỏi AI</span>
        </button>
      </div>

      {/* Gợi ý câu hỏi nhanh */}
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-[10px] font-mono text-slate-400">Gợi ý:</span>
        <button
          type="button"
          data-testid="voice-qa-chip-cube"
          onClick={() => handleAsk('Trong hình lập phương, thiết diện nào có diện tích lớn nhất?')}
          className="px-2 py-0.5 rounded-full bg-slate-900 hover:bg-slate-800 border border-slate-700 text-[10px] text-cyan-300 transition cursor-pointer"
        >
          Thiết diện lớn nhất của lập phương?
        </button>
        <button
          type="button"
          data-testid="voice-qa-chip-graph"
          onClick={() => handleAsk('Khảo sát tương giao hai hàm y = x² − 3 và y = A sin x + B')}
          className="px-2 py-0.5 rounded-full bg-slate-900 hover:bg-slate-800 border border-slate-700 text-[10px] text-amber-300 transition cursor-pointer"
        >
          Tương giao y = x² − 3 và y = A sin x + B?
        </button>
      </div>

      {/* Nội dung trả lời trực quan */}
      <div className="rounded-xl bg-slate-900/90 border border-slate-800 p-3 flex flex-col gap-2" data-testid="voice-qa-answer-box">
        <div className="text-xs font-bold text-cyan-300 leading-snug" data-testid="voice-qa-headline">
          {answer.headline}
        </div>
        <p className="text-[11px] text-slate-300 leading-relaxed">
          {answer.explanation}
        </p>
        <div className="px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-amber-200 overflow-x-auto text-xs">
          <MathView latex={answer.formulaLatex} />
        </div>
      </div>

      {/* Danh sách mô hình minh họa động bấm 1 chạm để bung lên bảng */}
      <div className="flex flex-col gap-2" data-testid="voice-qa-actions">
        <span className="text-[10px] font-mono uppercase tracking-wider text-cyan-400 font-bold">
          Mô hình minh họa động — Bấm để bung lên bảng ngay:
        </span>
        {answer.actions.map((act) => (
          <button
            key={act.id}
            type="button"
            data-testid={`voice-qa-spawn-${act.id}`}
            onClick={() => onSpawnBlueprint(act.blueprint)}
            className="w-full flex items-center gap-3 p-2.5 rounded-xl bg-gradient-to-r from-slate-900 to-slate-900/80 hover:from-cyan-950/80 hover:to-blue-950/60 border border-slate-700/80 hover:border-cyan-400/60 transition group text-left cursor-pointer"
          >
            <MiniAnimatedPreview type={act.previewType} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-white group-hover:text-cyan-300 transition truncate">
                  {act.label}
                </span>
              </div>
              <div className="text-[11px] text-slate-400 truncate mt-0.5">
                {act.sublabel}
              </div>
              <div className="mt-1 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-cyan-500/15 border border-cyan-400/30 text-[10px] font-mono text-cyan-300">
                <Play className="w-2.5 h-2.5 fill-current" />
                <span>{act.badge} • Chạm để minh họa</span>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};
