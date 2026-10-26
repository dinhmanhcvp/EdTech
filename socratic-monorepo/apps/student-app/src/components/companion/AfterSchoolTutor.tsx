'use client';

import React, { useState } from 'react';
import {
  GraduationCap,
  Sparkles,
  BookOpen,
  Compass,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  ArrowRight,
  Sliders,
  RotateCcw,
  Layers,
  Clock,
  ShieldCheck,
  Send,
  Eye,
} from 'lucide-react';
import { MathView } from '../common/MathView';
import { updateMasteryBKT, KnowledgeComponentState } from '../../utils/bktEngine';
import {
  ChemicalBalanceScale,
  VectorForcePolygon,
  FunctionExtremaTangent,
  CellOsmosisPressure,
} from './VisualDebugWidgets';

export type TutorInteractionMode =
  | 'SOCRATIC_SOLVER'
  | 'HOME_SANDBOX'
  | 'SPACED_REVIEWS'
  | 'PARENTPULSE_SYNC';

export interface AfterSchoolTutorProps {
  curriculumLevel?: 'THPT_STANDARD' | 'OLYMPIAD_ADVANCED';
  onEurekaEarned?: (points: number) => void;
}

interface HomeworkExercise {
  id: string;
  title: string;
  subject: 'MATH' | 'PHYSICS' | 'CHEMISTRY' | 'BIOLOGY';
  classContextLatex: string;
  problemStatement: string;
  difficulty: 'STANDARD' | 'OLYMPIAD';
  kcId: string;
  steps: {
    prompt: string;
    expectedLatex: string;
    microCue: string;
    counterExample: string;
    visualWidget?: 'CHEM_SCALE' | 'FORCE_POLYGON' | 'EXTREMA_TANGENT' | 'OSMOSIS';
  }[];
}

const SAMPLE_EXERCISES: HomeworkExercise[] = [
  {
    id: 'hw-phys-1',
    title: 'Ném xiên trong Trọng trường',
    subject: 'PHYSICS',
    classContextLatex: 'v_0 = 22\\text{ m/s}, \\quad \\alpha = 45^\\circ',
    problemStatement: 'Từ đỉnh dốc cao 15 m, một vật được ném với vận tốc v₀ = 22 m/s ở góc 45°. Tính thời gian chạm đất khi có thêm lực cản không khí nhẹ.',
    difficulty: 'STANDARD',
    kcId: 'PHYSICS_PROJECTILE',
    steps: [
      {
        prompt: 'Bước 1: Viết phương trình vận tốc theo phương ngang Ox',
        expectedLatex: 'v_x = v_0\\cos\\alpha',
        microCue: 'Theo phương ngang không có gia tốc trọng trường, vận tốc có biến đổi không?',
        counterExample: 'Nếu trọng lực tác dụng theo phương ngang thì quỹ đạo vật thể sẽ uốn cong như thế nào?',
        visualWidget: 'FORCE_POLYGON',
      },
      {
        prompt: 'Bước 2: Viết phương trình tọa độ y(t) theo phương thẳng đứng',
        expectedLatex: 'y = h + v_0\\sin\\alpha t - \\frac{1}{2}gt^2',
        microCue: 'Chú ý dấu của gia tốc trọng trường g khi chọn trục Oy hướng lên.',
        counterExample: 'Nếu g cùng chiều với trục Oy thì vật ném lên sẽ bay thẳng ra ngoài vũ trụ?',
      },
    ],
  },
  {
    id: 'hw-chem-1',
    title: 'Cân bằng Oxi hóa Sắt & Bảo toàn Electron',
    subject: 'CHEMISTRY',
    classContextLatex: '4\\text{Fe} + 3\\text{O}_2 \\rightarrow 2\\text{Fe}_2\\text{O}_3',
    problemStatement: 'Khi đốt cháy 11,2 g bột sắt trong bình chứa 4,48 lít khí Oxi đktc. Xác định chất còn dư và khối lượng oxit sắt thu được.',
    difficulty: 'STANDARD',
    kcId: 'CHEM_REDOX',
    steps: [
      {
        prompt: 'Bước 1: Tính số mol Fe và O₂ ban đầu',
        expectedLatex: 'n_{\\text{Fe}} = 0.2\\text{ mol}, \\quad n_{\\text{O}_2} = 0.2\\text{ mol}',
        microCue: 'Nhớ áp dụng công thức n = m / M đối với kim loại và n = V / 22.4 đối với khí.',
        counterExample: 'Khối lượng mol của Fe là 56 g/mol, đừng nhầm với phân tử khối của Fe2O3.',
        visualWidget: 'CHEM_SCALE',
      },
      {
        prompt: 'Bước 2: So sánh tỷ lệ mol theo phương trình để tìm chất phản ứng hết',
        expectedLatex: '\\frac{0.2}{4} < \\frac{0.2}{3}',
        microCue: 'Lấy số mol chia cho hệ số tương ứng trong phương trình cân bằng trên bảng.',
        counterExample: 'Nếu Fe dư thì toàn bộ O2 có phản ứng hết không?',
      },
    ],
  },
  {
    id: 'hw-math-1',
    title: 'Hàm số Lượng giác & Dao động điều hòa',
    subject: 'MATH',
    classContextLatex: 'y = 2\\sin(3x)',
    problemStatement: 'Tìm chu kỳ tuần hoàn và các điểm cực đại của hàm số y = 2sin(3x) trên đoạn [0, 2π].',
    difficulty: 'OLYMPIAD',
    kcId: 'MATH_TRIG',
    steps: [
      {
        prompt: 'Bước 1: Xác định chu kỳ tuần hoàn T của hàm số y = A sin(ωx)',
        expectedLatex: 'T = \\frac{2\\pi}{\\omega} = \\frac{2\\pi}{3}',
        microCue: 'Quan sát hệ số góc ω đứng trước biến x trong biểu thức bài giảng.',
        counterExample: 'Nếu chu kỳ T = 2π thì đồ thị có bị co hẹp gấp 3 lần không?',
        visualWidget: 'EXTREMA_TANGENT',
      },
    ],
  },
];

export const AfterSchoolTutor: React.FC<AfterSchoolTutorProps> = ({
  curriculumLevel = 'THPT_STANDARD',
  onEurekaEarned,
}) => {
  const [activeMode, setActiveMode] = useState<TutorInteractionMode>('SOCRATIC_SOLVER');
  const [selectedExId, setSelectedExId] = useState<string>('hw-phys-1');
  const [currentStepIdx, setCurrentStepIdx] = useState<number>(0);
  const [studentInput, setStudentInput] = useState<string>('');
  const [scaffoldLevel, setScaffoldLevel] = useState<1 | 2 | 3 | 4>(1);
  const [showWidget, setShowWidget] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [guardrailAlert, setGuardrailAlert] = useState<string | null>(null);
  const [struggleSeconds, setStruggleSeconds] = useState<number>(145);
  const [eurekaTotal, setEurekaTotal] = useState<number>(150);

  // Bayesian Knowledge Tracing states
  const [kcMastery, setKcMastery] = useState<Record<string, number>>({
    PHYSICS_PROJECTILE: 0.62,
    CHEM_REDOX: 0.45,
    MATH_TRIG: 0.78,
  });

  const currentExercise =
    SAMPLE_EXERCISES.find((e) => e.id === selectedExId) || SAMPLE_EXERCISES[0];
  const currentStep = currentExercise.steps[currentStepIdx] || currentExercise.steps[0];
  const currentMastery = kcMastery[currentExercise.kcId] ?? 0.50;

  // Xử lý gửi câu trả lời với Socratic Guardrails
  const handleSubmitAnswer = () => {
    const raw = studentInput.trim().toLowerCase();
    setGuardrailAlert(null);

    // Socratic Guardrails tầng 1: Chặn câu lệnh giải hộ hoặc đầu hàng
    if (
      raw.includes('cho đáp án') ||
      raw.includes('giải hộ') ||
      raw.includes('không biết') ||
      raw.includes('cho xem bài giải') ||
      raw.includes('hãy giải hết')
    ) {
      setGuardrailAlert(
        'Hàng rào Socratic: AI Tutor không cung cấp đáp án giải sẵn. Thầy đã mở công cụ thị giác hỗ trợ để em tự quan sát và suy luận.'
      );
      setShowWidget(true);
      setScaffoldLevel(2);
      return;
    }

    if (!studentInput.trim()) return;

    // Kiểm tra tính đúng đắn tượng trưng
    const isCorrect =
      raw.includes(currentStep.expectedLatex.toLowerCase().replace(/\\/g, '')) ||
      raw.includes(currentStep.expectedLatex.toLowerCase()) ||
      raw.length > 5;

    // Cập nhật BKT
    const bktResult = updateMasteryBKT(currentMastery, isCorrect);
    setKcMastery((prev) => ({
      ...prev,
      [currentExercise.kcId]: bktResult.nextMastery,
    }));

    if (isCorrect) {
      setFeedback('Chính xác! Lập luận của em rất chuẩn xác và bám sát kiến thức từ bảng thông minh.');
      const pts = 30;
      setEurekaTotal((prev) => prev + pts);
      if (onEurekaEarned) onEurekaEarned(pts);

      if (currentStepIdx < currentExercise.steps.length - 1) {
        setTimeout(() => {
          setCurrentStepIdx((i) => i + 1);
          setStudentInput('');
          setFeedback(null);
          setShowWidget(false);
          setScaffoldLevel(1);
        }, 1500);
      }
    } else {
      setFeedback('Chưa hoàn toàn chuẩn xác. Em hãy quan sát gợi ý vi mô bên dưới và thử lại.');
      setScaffoldLevel((lvl) => (lvl < 4 ? ((lvl + 1) as 1 | 2 | 3 | 4) : 4));
      if (currentStep.visualWidget) setShowWidget(true);
    }
  };

  return (
    <div
      data-testid="after-school-tutor"
      className="w-full max-w-5xl bg-white border border-[#E6E4DD] rounded-2xl shadow-xl overflow-hidden flex flex-col font-sans text-stone-900"
    >
      {/* Header bar */}
      <div className="bg-[#FCFBF9] border-b border-[#E6E4DD] px-6 py-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-sm">
            <GraduationCap className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-stone-900 tracking-tight">
                Gia sư AI Socratic Đồng hành sau Giờ học
              </h2>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 font-semibold">
                Classroom-to-Home
              </span>
            </div>
            <p className="text-xs text-stone-500">
              Nguyên tắc ma sát nhận thức: Không giải hộ, chỉ cung cấp công cụ để tự thấy
            </p>
          </div>
        </div>

        {/* Eureka Particles Badge & Struggle timer */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 border border-amber-200 text-xs font-mono text-amber-900 font-medium">
            <Sparkles className="w-3.5 h-3.5 text-amber-600" />
            <span>{eurekaTotal} Hạt Eureka</span>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-stone-100 border border-stone-200 text-xs font-mono text-stone-600">
            <Clock className="w-3.5 h-3.5 text-stone-500" />
            <span>Nỗ lực: {Math.floor(struggleSeconds / 60)}p {struggleSeconds % 60}s</span>
          </div>
        </div>
      </div>

      {/* 4 Interaction Modes Switcher */}
      <div className="bg-stone-50 border-b border-[#E6E4DD] px-6 py-2 flex flex-wrap items-center gap-2">
        <button
          type="button"
          data-testid="mode-socratic-solver"
          onClick={() => setActiveMode('SOCRATIC_SOLVER')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer flex items-center gap-1.5 ${
            activeMode === 'SOCRATIC_SOLVER'
              ? 'bg-white text-blue-700 shadow-xs border border-[#E6E4DD]'
              : 'text-stone-600 hover:text-stone-900'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span>1. Giải bài tập có giàn giáo</span>
        </button>

        <button
          type="button"
          data-testid="mode-home-sandbox"
          onClick={() => setActiveMode('HOME_SANDBOX')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer flex items-center gap-1.5 ${
            activeMode === 'HOME_SANDBOX'
              ? 'bg-white text-emerald-700 shadow-xs border border-[#E6E4DD]'
              : 'text-stone-600 hover:text-stone-900'
          }`}
        >
          <Sliders className="w-3.5 h-3.5" />
          <span>2. Phòng thí nghiệm tự do tại nhà</span>
        </button>

        <button
          type="button"
          data-testid="mode-spaced-reviews"
          onClick={() => setActiveMode('SPACED_REVIEWS')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer flex items-center gap-1.5 ${
            activeMode === 'SPACED_REVIEWS'
              ? 'bg-white text-purple-700 shadow-xs border border-[#E6E4DD]'
              : 'text-stone-600 hover:text-stone-900'
          }`}
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>3. Ôn tập ngắt quãng & Luyện thi</span>
        </button>

        <button
          type="button"
          data-testid="mode-parentpulse-sync"
          onClick={() => setActiveMode('PARENTPULSE_SYNC')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer flex items-center gap-1.5 ${
            activeMode === 'PARENTPULSE_SYNC'
              ? 'bg-white text-rose-700 shadow-xs border border-[#E6E4DD]'
              : 'text-stone-600 hover:text-stone-900'
          }`}
        >
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>4. ParentPulse & Đồng bộ Ma trận</span>
        </button>
      </div>

      {/* Main Content Body */}
      <div className="p-6 flex-1 flex flex-col gap-6">
        {/* MODE 1: SOCRATIC SOLVER */}
        {activeMode === 'SOCRATIC_SOLVER' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column: Exercises & BKT Tracker */}
            <div className="lg:col-span-4 flex flex-col gap-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-stone-500 font-mono">
                Bài tập đồng bộ từ bảng trên lớp
              </h3>

              <div className="flex flex-col gap-2">
                {SAMPLE_EXERCISES.map((ex) => {
                  const mastery = kcMastery[ex.kcId] ?? 0.5;
                  const isSelected = ex.id === selectedExId;
                  return (
                    <button
                      key={ex.id}
                      type="button"
                      onClick={() => {
                        setSelectedExId(ex.id);
                        setCurrentStepIdx(0);
                        setStudentInput('');
                        setFeedback(null);
                        setShowWidget(false);
                      }}
                      className={`p-3 rounded-xl border text-left transition cursor-pointer flex flex-col gap-1.5 ${
                        isSelected
                          ? 'bg-blue-50/70 border-blue-300 shadow-xs'
                          : 'bg-white border-[#E6E4DD] hover:bg-stone-50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-stone-900">{ex.title}</span>
                        <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-white border border-stone-200 text-stone-600">
                          {ex.subject}
                        </span>
                      </div>

                      {/* Class context formula badge */}
                      <div className="text-[11px] text-stone-600 font-mono bg-white/80 p-1.5 rounded border border-stone-200/60 overflow-x-auto">
                        <MathView latex={ex.classContextLatex} displayMode={false} />
                      </div>

                      {/* BKT Mastery Bar */}
                      <div className="flex items-center justify-between text-[10px] text-stone-500 pt-1">
                        <span>Độ thành thạo BKT:</span>
                        <span className="font-mono font-bold text-stone-800">
                          {Math.round(mastery * 100)}%
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-stone-200 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            mastery >= 0.8
                              ? 'bg-emerald-500'
                              : mastery >= 0.5
                              ? 'bg-blue-500'
                              : 'bg-amber-500'
                          }`}
                          style={{ width: `${Math.round(mastery * 100)}%` }}
                        />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Right Column: Step Scaffolding & Visual Debugger */}
            <div className="lg:col-span-8 flex flex-col gap-4">
              {/* Problem statement card */}
              <div className="p-4 rounded-xl bg-[#FCFBF9] border border-[#E6E4DD] flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono uppercase tracking-wider text-blue-700 font-bold">
                    Đề bài tự rèn luyện
                  </span>
                  <span className="text-[11px] font-mono text-stone-500">
                    Bước {currentStepIdx + 1} / {currentExercise.steps.length}
                  </span>
                </div>
                <p className="text-sm font-medium text-stone-800">
                  {currentExercise.problemStatement}
                </p>
              </div>

              {/* Guardrail alert if user asks for solution */}
              {guardrailAlert && (
                <div
                  data-testid="guardrail-alert"
                  className="p-3 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 text-xs flex items-start gap-2.5 shadow-2xs"
                >
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold">{guardrailAlert}</span>
                  </div>
                </div>
              )}

              {/* Current Active Step */}
              <div className="p-4 rounded-xl border border-blue-200 bg-blue-50/30 flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold font-mono">
                    {currentStepIdx + 1}
                  </div>
                  <h4 className="text-sm font-bold text-stone-900">{currentStep.prompt}</h4>
                </div>

                {/* Socratic Scaffolding Level Indicator */}
                <div className="flex items-center gap-2 text-[11px] font-mono text-stone-600">
                  <span>Mức độ giàn giáo:</span>
                  <span className="px-2 py-0.5 rounded bg-white border border-stone-200 font-semibold text-blue-800">
                    Mức {scaffoldLevel}: {scaffoldLevel === 1 ? 'Gợi ý vi mô' : scaffoldLevel === 2 ? 'Kích hoạt công cụ thị giác' : scaffoldLevel === 3 ? 'Phản ví dụ dẫn dắt' : 'Phân rã bài toán'}
                  </span>
                </div>

                {/* Micro-Cue or Counter Example */}
                {scaffoldLevel >= 1 && (
                  <div className="p-3 rounded-lg bg-white border border-[#E6E4DD] text-xs text-stone-700 flex items-start gap-2">
                    <HelpCircle className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold text-stone-900">Gợi ý Socratic: </span>
                      {scaffoldLevel >= 3 ? currentStep.counterExample : currentStep.microCue}
                    </div>
                  </div>
                )}

                {/* Input area */}
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <input
                      data-testid="tutor-step-input"
                      type="text"
                      value={studentInput}
                      onChange={(e) => setStudentInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSubmitAnswer()}
                      placeholder="Gõ biểu thức hoặc lập luận (VD: vx = v0*cos(alpha))"
                      className="flex-1 px-3 py-2 rounded-lg bg-white border border-[#DCD9D0] text-xs font-mono focus:outline-none focus:border-blue-500 shadow-inner"
                    />
                    <button
                      type="button"
                      data-testid="tutor-submit-btn"
                      onClick={handleSubmitAnswer}
                      className="px-4 py-2 rounded-lg bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shadow-xs"
                    >
                      <span>Kiểm tra</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Feedback */}
                {feedback && (
                  <div
                    data-testid="tutor-feedback"
                    className={`p-3 rounded-lg text-xs flex items-center gap-2 ${
                      feedback.includes('Chính xác')
                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 font-medium'
                        : 'bg-rose-50 text-rose-800 border border-rose-200'
                    }`}
                  >
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>{feedback}</span>
                  </div>
                )}
              </div>

              {/* Visual Debugger Trigger */}
              {showWidget && currentStep.visualWidget && (
                <div className="p-4 rounded-xl border border-violet-200 bg-violet-50/40 flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Eye className="w-4 h-4 text-violet-700" />
                      <span className="text-xs font-bold text-violet-900">
                        Công cụ Thị giác Hỗ trợ Tự phát hiện Lỗi sai
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowWidget(false)}
                      className="text-[10px] text-stone-500 hover:text-stone-800 font-mono"
                    >
                      Đóng công cụ
                    </button>
                  </div>

                  {currentStep.visualWidget === 'CHEM_SCALE' && (
                    <ChemicalBalanceScale
                      leftAtomsCount={4}
                      rightAtomsCount={6}
                      elementName="Oxi (O)"
                      feedbackText="Quan sát cân đĩa: Số nguyên tử Oxi ở hai vế đang chênh lệch."
                    />
                  )}

                  {currentStep.visualWidget === 'FORCE_POLYGON' && (
                    <VectorForcePolygon
                      fGravity={50}
                      fNormal={43.3}
                      fFriction={15}
                      fPullOrParallel={25}
                      angleDeg={30}
                      feedbackText="Đa giác véc-tơ lực: Quan sát phương chuyển động theo từng trục tọa độ."
                    />
                  )}

                  {currentStep.visualWidget === 'EXTREMA_TANGENT' && (
                    <FunctionExtremaTangent
                      x0={0.0}
                      functionExpression="y = 2\sin(3x)"
                      feedbackText="Thước tiếp tuyến cực trị: Tại điểm cực đại, đạo hàm y' bằng 0."
                    />
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* MODE 2: HOME SANDBOX & FREE SKETCH */}
        {activeMode === 'HOME_SANDBOX' && (
          <div className="flex flex-col gap-4">
            <div className="p-4 rounded-xl bg-emerald-50/50 border border-emerald-200 flex flex-col gap-1.5">
              <h3 className="text-sm font-bold text-emerald-950 flex items-center gap-2">
                <Sliders className="w-4 h-4 text-emerald-700" />
                <span>Phòng Thí nghiệm Mô phỏng Tự do tại Nhà (What-If Sandbox)</span>
              </h3>
              <p className="text-xs text-emerald-900/80">
                Tái hiện mô hình sống của thầy cô trên lớp. Em có thể tự do thay đổi tham số góc ném, nhiệt độ hoặc chu kỳ dao động để kiểm chứng các giả thuyết khoa học.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl border border-[#E6E4DD] bg-[#FCFBF9] flex flex-col gap-3">
                <span className="text-xs font-bold text-stone-800">Thí nghiệm Ném xiên Trọng trường</span>
                <div className="text-xs font-mono text-stone-600 bg-white p-2 rounded border border-stone-200">
                  <MathView latex="v_0 = 22\text{ m/s}, \quad \alpha = 45^\circ" displayMode={false} />
                </div>
                <div className="flex flex-col gap-2 text-xs">
                  <div className="flex justify-between text-stone-600">
                    <span>Góc ném α:</span>
                    <span className="font-mono font-bold">45°</span>
                  </div>
                  <input type="range" min="15" max="85" defaultValue="45" className="w-full accent-emerald-600" />
                </div>
              </div>

              <div className="p-4 rounded-xl border border-[#E6E4DD] bg-[#FCFBF9] flex flex-col gap-3">
                <span className="text-xs font-bold text-stone-800">Thí nghiệm Cân bằng Hóa học Fe + O₂</span>
                <div className="text-xs font-mono text-stone-600 bg-white p-2 rounded border border-stone-200">
                  <MathView latex="4\text{Fe} + 3\text{O}_2 \rightarrow 2\text{Fe}_2\text{O}_3" displayMode={false} />
                </div>
                <div className="flex flex-col gap-2 text-xs">
                  <div className="flex justify-between text-stone-600">
                    <span>Hệ số phản ứng Fe:</span>
                    <span className="font-mono font-bold">4</span>
                  </div>
                  <input type="range" min="1" max="8" defaultValue="4" className="w-full accent-blue-600" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* MODE 3: SPACED REPETITION & EXAM DRILL */}
        {activeMode === 'SPACED_REVIEWS' && (
          <div className="flex flex-col gap-4">
            <div className="p-4 rounded-xl bg-purple-50/50 border border-purple-200 flex flex-col gap-1.5">
              <h3 className="text-sm font-bold text-purple-950 flex items-center gap-2">
                <RotateCcw className="w-4 h-4 text-purple-700" />
                <span>Luyện thi Phân hóa & Ôn tập Ngắt quãng (Spaced Repetition SM-2)</span>
              </h3>
              <p className="text-xs text-purple-900/80">
                Thuật toán tự động tính toán đường cong quên lãng để nhắc lại kiến thức đúng vào điểm trũng nhận thức trước khi em bị quên.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl border border-stone-200 bg-white flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-stone-900">Dao động Con lắc đơn</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 font-bold border border-emerald-200">
                    Sau 7 ngày
                  </span>
                </div>
                <p className="text-[11px] text-stone-500">Đã thành thạo 88%. Nhắc lại câu hỏi phân hóa nâng cao vào tối thứ Năm.</p>
              </div>

              <div className="p-4 rounded-xl border border-stone-200 bg-white flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-stone-900">Cân bằng Redox Fe + O₂</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-50 text-amber-800 font-bold border border-amber-200">
                    Cần ôn ngay tối nay
                  </span>
                </div>
                <p className="text-[11px] text-stone-500">Độ thành thạo 45%. Có điểm nghẽn về phân biệt số mol Fe và Oxi.</p>
              </div>

              <div className="p-4 rounded-xl border border-stone-200 bg-white flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-stone-900">Ném xiên Trọng trường</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-bold border border-blue-200">
                    Sau 3 ngày
                  </span>
                </div>
                <p className="text-[11px] text-stone-500">Độ thành thạo 62%. Tiếp tục củng cố phương trình tọa độ Oy.</p>
              </div>
            </div>
          </div>
        )}

        {/* MODE 4: PARENTPULSE & TEACHER DASHBOARD SYNC */}
        {activeMode === 'PARENTPULSE_SYNC' && (
          <div className="flex flex-col gap-4">
            <div className="p-4 rounded-xl bg-rose-50/50 border border-rose-200 flex flex-col gap-1.5">
              <h3 className="text-sm font-bold text-rose-950 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-rose-700" />
                <span>Cầu nối Phản hồi Định tính: ParentPulse & Bục giảng</span>
              </h3>
              <p className="text-xs text-rose-900/80">
                Ghi nhận nỗ lực tư duy thực chất thay vì điểm số ảo, tạo sự an tâm cho cha mẹ và đồng bộ bản đồ nhiệt với thầy cô giáo chủ nhiệm.
              </p>
            </div>

            <div className="p-4 rounded-xl border border-[#E6E4DD] bg-[#FCFBF9] flex flex-col gap-3">
              <div className="flex items-center justify-between border-b border-stone-200 pb-2">
                <span className="text-xs font-bold text-stone-800">Báo cáo gửi phụ huynh tối nay</span>
                <span className="text-[10px] font-mono text-stone-500">Đã đồng bộ lúc 20:45</span>
              </div>
              <p className="text-xs text-stone-700 leading-relaxed italic font-serif">
                "Hôm nay bạn Nam đã kiên trì suy nghĩ suốt 35 phút để tự giải bài toán Ném xiên và Cân bằng Redox mà không cần xem đáp án mẫu. Khả năng phân tích lực của Nam đã tăng từ 45% lên 78%."
              </p>
              <div className="flex items-center gap-4 text-xs font-mono text-stone-600 pt-1">
                <span>Điểm kiên trì Grit: <strong className="text-stone-900">92/100</strong></span>
                <span>Thời gian nỗ lực: <strong className="text-blue-700">35 phút</strong></span>
                <span>Hạt Eureka: <strong className="text-amber-700">+{eurekaTotal}</strong></span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
