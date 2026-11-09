'use client';

import React, { useState, useEffect } from 'react';
import { SocraticCompanionSession } from '../components/companion/SocraticCompanionSession';
import { AfterSchoolTutor } from '../components/companion/AfterSchoolTutor';
import { TeacherHeatmap, StudentMastery } from '../components/dashboards/TeacherHeatmap';
import { ParentPulse } from '../components/dashboards/ParentPulse';
import { SmartNotesViewer } from '../components/dashboards/SmartNotesViewer';
import { HubHome } from '../components/hub/HubHome';
import { BarChart3, HeartHandshake, Compass, FileText, Sparkles, School } from 'lucide-react';
import { apiBase, teacherAppUrl } from '../utils/apiBase';

type TabId = 'MY_CLASS' | 'COMPANION' | 'AFTER_SCHOOL_TUTOR' | 'SMARTNOTES' | 'HEATMAP' | 'PARENTPULSE';

const TABS: { id: TabId; testId: string; label: string; Icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'MY_CLASS', testId: 'tab-my-class', label: 'Lớp của em', Icon: School },
  { id: 'COMPANION', testId: 'tab-socratic-companion', label: 'Gia sư Socratic 1:1', Icon: Compass },
  { id: 'AFTER_SCHOOL_TUTOR', testId: 'tab-after-school-tutor', label: 'Gia sư 4 chế độ', Icon: Sparkles },
  { id: 'SMARTNOTES', testId: 'tab-smart-notes', label: 'Vở ghi (Smart Notes)', Icon: FileText },
  { id: 'HEATMAP', testId: 'tab-teacher-heatmap', label: 'Phân tích lớp', Icon: BarChart3 },
  { id: 'PARENTPULSE', testId: 'tab-parent-pulse', label: 'Báo cáo phụ huynh', Icon: HeartHandshake },
];

function getAcademicRank(eureka: number): { title: string; badgeClass: string; dotClass: string } {
  if (eureka >= 1000) return { title: 'Grandmaster / Quốc tế', badgeClass: 'bg-brand-50 text-brand-700 border-brand-200', dotClass: 'bg-brand-600' };
  if (eureka >= 500) return { title: 'Đội tuyển Quốc gia (National Olympiad)', badgeClass: 'bg-hint-bg text-hint-fg border-hint-bd', dotClass: 'bg-hint' };
  if (eureka >= 250) return { title: 'Đội tuyển Tỉnh (Provincial Team)', badgeClass: 'bg-white text-ink border-rule', dotClass: 'bg-ink' };
  if (eureka >= 100) return { title: 'Varsity (Tuyển Trường)', badgeClass: 'bg-sunk text-ink border-rule', dotClass: 'bg-mute' };
  return { title: 'Scholar (Tập sự THPT)', badgeClass: 'bg-sunk text-mute border-rule', dotClass: 'bg-mute' };
}

export default function StudentAppPage() {
  const [activeTab, setActiveTab] = useState<TabId>('COMPANION');
  const [totalEureka, setTotalEureka] = useState<number>(0);
  // ?problem=<id> mở thẳng một bài của gia sư 1:1 (VD bài cân bằng Fe + O2 không nằm trong danh sách chọn bài)
  const [problemParam, setProblemParam] = useState<string | null>(null);
  // thanh "Demo Director" (nút thao tác nhanh để quay video) chỉ hiện khi mở bằng ?demo=1
  const [demo, setDemo] = useState(false);
  const [curriculumLevel, setCurriculumLevel] = useState<'THPT_STANDARD' | 'OLYMPIAD_ADVANCED'>('THPT_STANDARD');

  const defaultStudents: StudentMastery[] = [
    { name: 'Nguyễn Văn An', mathWave: 'green', physicsProjectile: 'green', chemRedox: 'red', bioStomata: 'amber', gritScore: 88 },
    { name: 'Trần Thị Mai', mathWave: 'green', physicsProjectile: 'amber', chemRedox: 'green', bioStomata: 'green', gritScore: 95 },
    { name: 'Lê Hoàng Nam', mathWave: 'amber', physicsProjectile: 'red', chemRedox: 'red', bioStomata: 'green', gritScore: 74 },
    { name: 'Phạm Minh Tuấn', mathWave: 'green', physicsProjectile: 'green', chemRedox: 'green', bioStomata: 'green', gritScore: 98 },
  ];

  const [students, setStudents] = useState<StudentMastery[]>(defaultStudents);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const tabParam = params.get('tab');
    if (tabParam && TABS.some((t) => t.id === tabParam)) {
      setActiveTab(tabParam as TabId);
    }
    setProblemParam(params.get('problem'));
    setDemo(params.get('demo') === '1');
  }, []);

  useEffect(() => {
    const fetchHeatmap = async () => {
      try {
        let res: Response | null = null;
        try {
          res = await fetch('/api/v1/heatmap');
        } catch {
          res = await fetch(`${apiBase()}/api/v1/heatmap`);
        }
        if (res && res.ok) {
          const data = await res.json();
          if (data.students && Array.isArray(data.students)) {
            const mapped: StudentMastery[] = data.students.map((s: any) => ({
              name: s.name,
              mathWave: s.steps?.[0] === 'passed' ? 'green' : 'amber',
              physicsProjectile: s.steps?.[1] === 'passed' ? 'green' : 'red',
              chemRedox: s.status === 'STUCK' ? 'red' : 'green',
              bioStomata: s.steps?.[3] === 'passed' ? 'green' : 'amber',
              gritScore: s.status === 'MASTERED' ? 95 : 88,
            }));
            if (mapped.length > 0) setStudents(mapped);
          }
        }
      } catch {
        // Fallback to default students
      }
    };
    fetchHeatmap();
  }, []);

  const academicRank = getAcademicRank(totalEureka);
  const level = (id: 'THPT_STANDARD' | 'OLYMPIAD_ADVANCED', label: string, testId: string) => (
    <button
      type="button"
      data-testid={testId}
      aria-pressed={curriculumLevel === id}
      onClick={() => setCurriculumLevel(id)}
      className="px-2.5 py-1 rounded-md text-xs transition cursor-pointer text-mute hover:text-ink aria-[pressed=true]:bg-white aria-[pressed=true]:text-ink aria-[pressed=true]:font-semibold aria-[pressed=true]:shadow-card"
    >
      {label}
    </button>
  );

  return (
    <main className="min-h-screen bg-paper text-ink flex flex-col antialiased font-sans">
      <header className="border-b border-rule bg-paper/90 backdrop-blur-md sticky top-0 z-50">
        <div className="mx-auto max-w-[1500px] px-4 pt-2.5 flex flex-wrap items-center gap-x-4 gap-y-2">
          <div className="flex items-baseline gap-2">
            <span className="font-serif text-xl font-semibold tracking-[.18em] text-brand-600">AXIOMA</span>
            <span className="hidden sm:inline text-[11px] uppercase tracking-wider text-mute">Sổ tay thí nghiệm</span>
          </div>
          <div className={`px-2 py-0.5 rounded-full border text-[11px] flex items-center gap-1.5 ${academicRank.badgeClass}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${academicRank.dotClass}`} />
            <span>{academicRank.title}</span>
          </div>
          <div data-testid="header-eureka" className="px-2.5 py-0.5 rounded-full border border-hint-bd bg-hint-bg text-hint-fg font-mono text-xs font-semibold flex items-center gap-1">
            <Sparkles className="w-3 h-3" />
            <span>{totalEureka} Eureka</span>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <div className="flex items-center bg-sunk p-0.5 rounded-lg border border-rule" data-testid="student-curriculum-toggle">
              {level('THPT_STANDARD', 'Chuẩn THPT', 'btn-student-mode-standard')}
              {level('OLYMPIAD_ADVANCED', 'Chuyên sâu', 'btn-student-mode-olympiad')}
            </div>
            <button
              type="button"
              data-testid="btn-open-feature-1-board"
              onClick={() => {
                if (typeof window !== 'undefined') window.open(teacherAppUrl(), '_blank');
              }}
              className="text-xs border border-rule bg-white hover:bg-sunk px-2.5 py-1 rounded-lg text-ink font-medium transition cursor-pointer hidden 2xl:flex items-center gap-1"
              title="Mở Bảng tương tác thông minh bục giảng trên lớp"
            >
              Bảng trên lớp
            </button>
          </div>
        </div>

        <nav aria-label="Các khu học" className="mx-auto max-w-[1500px] px-2 mt-1 flex gap-1 overflow-x-auto">
          {TABS.map(({ id, testId, label, Icon }) => (
            <button
              key={id}
              data-testid={testId}
              aria-current={activeTab === id ? 'page' : undefined}
              onClick={() => setActiveTab(id)}
              className="shrink-0 flex items-center gap-1.5 px-3 py-2 text-sm border-b-2 border-transparent text-mute hover:text-ink transition cursor-pointer aria-[current=page]:border-ink aria-[current=page]:text-ink aria-[current=page]:font-semibold"
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{label}</span>
            </button>
          ))}
        </nav>
      </header>

      <div className="flex-1 w-full dot-canvas">
        <div className="mx-auto max-w-[1500px] p-3 sm:p-5 flex flex-col items-center">
          {activeTab === 'MY_CLASS' && <HubHome />}

          {activeTab === 'COMPANION' && (
            <div className="w-full flex justify-center">
              <SocraticCompanionSession
                key={problemParam ?? 'default'}
                initialProblemId={problemParam ?? undefined}
                onSessionComplete={(pts) => setTotalEureka(pts)}
                curriculumLevel={curriculumLevel}
                showDirector={demo}
              />
            </div>
          )}

          {activeTab === 'AFTER_SCHOOL_TUTOR' && (
            <div className="w-full flex justify-center">
              <AfterSchoolTutor curriculumLevel={curriculumLevel} onEurekaEarned={(pts) => setTotalEureka((prev) => prev + pts)} />
            </div>
          )}

          {activeTab === 'SMARTNOTES' && (
            <div className="w-full flex justify-center">
              <SmartNotesViewer />
            </div>
          )}

          {activeTab === 'HEATMAP' && (
            <div className="w-full max-w-4xl">
              <TeacherHeatmap students={students} />
            </div>
          )}

          {activeTab === 'PARENTPULSE' && (
            <div className="w-full flex justify-center">
              <ParentPulse
                studentName="Nguyễn Văn An"
                gritScore={88}
                narrativeText="Hôm nay An đã kiên trì thử 4 lần để cân bằng phản ứng oxi hóa Sắt (Fe + O2 -> Fe2O3) và vượt qua cổng giải thích bản chất bảo toàn nguyên tử!"
                conversationStarters={[
                  'Hôm nay con đã khám phá ra quy luật nào để cân bằng số nguyên tử Oxi?',
                  'Tại sao tổng khối lượng trước và sau phản ứng của gỉ sắt lại không thay đổi?',
                  'Cảm giác của con khi nghe thấy tiếng bíp +50 Hạt Eureka thế nào?',
                ]}
              />
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
