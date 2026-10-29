'use client';

import React, { useState, useEffect } from 'react';
import { SocraticCompanionSession } from '../components/companion/SocraticCompanionSession';
import { AfterSchoolTutor } from '../components/companion/AfterSchoolTutor';
import { TeacherHeatmap, StudentMastery } from '../components/dashboards/TeacherHeatmap';
import { ParentPulse } from '../components/dashboards/ParentPulse';
import { SmartNotesViewer } from '../components/dashboards/SmartNotesViewer';
import { HubHome } from '../components/hub/HubHome';
import { GraduationCap, BarChart3, HeartHandshake, Compass, FileText, Sparkles, School } from 'lucide-react';
import { apiBase, teacherAppUrl } from '../utils/apiBase';

function getAcademicRank(eureka: number): { title: string; badgeClass: string; dotClass: string } {
  if (eureka >= 1000) return { title: 'Grandmaster / Quốc tế', badgeClass: 'bg-rose-50 text-rose-700 border-rose-200', dotClass: 'bg-rose-600' };
  if (eureka >= 500) return { title: 'Đội tuyển Quốc gia (National Olympiad)', badgeClass: 'bg-amber-50 text-amber-800 border-amber-200', dotClass: 'bg-amber-600' };
  if (eureka >= 250) return { title: 'Đội tuyển Tỉnh (Provincial Team)', badgeClass: 'bg-blue-50 text-blue-700 border-blue-200', dotClass: 'bg-blue-600' };
  if (eureka >= 100) return { title: 'Varsity (Tuyển Trường)', badgeClass: 'bg-stone-100 text-stone-700 border-stone-200', dotClass: 'bg-stone-500' };
  return { title: 'Scholar (Tập sự THPT)', badgeClass: 'bg-stone-100 text-stone-600 border-stone-200', dotClass: 'bg-stone-400' };
}

export default function StudentAppPage() {
  const [activeTab, setActiveTab] = useState<'MY_CLASS' | 'COMPANION' | 'AFTER_SCHOOL_TUTOR' | 'SMARTNOTES' | 'HEATMAP' | 'PARENTPULSE'>('COMPANION');
  const [totalEureka, setTotalEureka] = useState<number>(0);
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
    if (tabParam && ['MY_CLASS', 'COMPANION', 'AFTER_SCHOOL_TUTOR', 'SMARTNOTES', 'HEATMAP', 'PARENTPULSE'].includes(tabParam)) {
      setActiveTab(tabParam as any);
    }
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

  return (
    <main className="min-h-screen bg-[#F8F7F4] text-[#18181B] flex flex-col antialiased font-sans paper-grid">
      {/* Precision Header */}
      <header className="h-12 border-b border-[#E6E4DD] bg-white/90 backdrop-blur-md px-4 flex items-center justify-between sticky top-0 z-50 shadow-[0_1px_8px_-1px_rgba(20,20,19,0.03)]">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-semibold tracking-widest text-[#18181B]">
              SOCRATIC
            </span>
            <span className="text-stone-400 text-xs font-mono">/</span>
            <span className="font-display text-lg text-stone-800">After-School</span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200 font-semibold hidden xl:inline-flex whitespace-nowrap items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-purple-600" />
              Tính năng 2: Gia Sư AI & Tự Học Sau Giờ Học
            </span>
          </div>

          <div className="h-3.5 w-px bg-[#E6E4DD]" />

          <div className={`px-2 py-0.5 rounded border text-[11px] font-mono flex items-center gap-1.5 ${academicRank.badgeClass}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${academicRank.dotClass}`} />
            <span>{academicRank.title}</span>
          </div>
        </div>

        {/* Center: Curriculum Toggle */}
        <div
          className="flex items-center bg-[#F2F0EA] p-0.5 rounded-lg border border-[#E5E3DC]"
          data-testid="student-curriculum-toggle"
        >
          <button
            type="button"
            data-testid="btn-student-mode-standard"
            onClick={() => setCurriculumLevel('THPT_STANDARD')}
            className={`px-3 py-1 rounded-md text-xs transition cursor-pointer ${
              curriculumLevel === 'THPT_STANDARD'
                ? 'bg-white text-stone-900 font-medium shadow-xs'
                : 'text-stone-500 hover:text-stone-800'
            }`}
          >
            Chuẩn THPT
          </button>
          <button
            type="button"
            data-testid="btn-student-mode-olympiad"
            onClick={() => setCurriculumLevel('OLYMPIAD_ADVANCED')}
            className={`px-3 py-1 rounded-md text-xs transition cursor-pointer flex items-center gap-1.5 ${
              curriculumLevel === 'OLYMPIAD_ADVANCED'
                ? 'bg-white text-amber-800 font-medium shadow-xs'
                : 'text-stone-500 hover:text-stone-800'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            <span>Chuyên sâu (Chuyên/HSG)</span>
          </button>
        </div>

        {/* Right: Tab Switcher & Bridge to Feature 1 */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-[#F2F0EA] p-0.5 rounded-lg border border-[#E5E3DC]">
            <button
              onClick={() => setActiveTab('MY_CLASS')}
              data-testid="tab-my-class"
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs transition cursor-pointer ${
                activeTab === 'MY_CLASS'
                  ? 'bg-white text-stone-900 font-medium shadow-xs'
                  : 'text-stone-500 hover:text-stone-800'
              }`}
            >
              <School className="w-3.5 h-3.5 text-indigo-600" />
              <span>Lớp của em</span>
            </button>
            <button
              onClick={() => setActiveTab('AFTER_SCHOOL_TUTOR')}
              data-testid="tab-after-school-tutor"
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs transition cursor-pointer ${
                activeTab === 'AFTER_SCHOOL_TUTOR'
                  ? 'bg-white text-stone-900 font-medium shadow-xs'
                  : 'text-stone-500 hover:text-stone-800'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-purple-600" />
              <span>Gia sư AI 4 chế độ</span>
            </button>

            <button
              onClick={() => setActiveTab('COMPANION')}
              data-testid="tab-socratic-companion"
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs transition cursor-pointer ${
                activeTab === 'COMPANION'
                  ? 'bg-white text-stone-900 font-medium shadow-xs'
                  : 'text-stone-500 hover:text-stone-800'
              }`}
            >
              <Compass className="w-3.5 h-3.5 text-blue-600" />
              <span>Gia sư Socratic 1:1</span>
            </button>

            <button
              onClick={() => setActiveTab('SMARTNOTES')}
              data-testid="tab-smart-notes"
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs transition cursor-pointer ${
                activeTab === 'SMARTNOTES'
                  ? 'bg-white text-stone-900 font-medium shadow-xs'
                  : 'text-stone-500 hover:text-stone-800'
              }`}
            >
              <FileText className="w-3.5 h-3.5 text-stone-600" />
              <span>Smart Notes (Vở ghi)</span>
            </button>

            <button
              onClick={() => setActiveTab('HEATMAP')}
              data-testid="tab-teacher-heatmap"
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs transition cursor-pointer ${
                activeTab === 'HEATMAP'
                  ? 'bg-white text-stone-900 font-medium shadow-xs'
                  : 'text-stone-500 hover:text-stone-800'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5 text-emerald-600" />
              <span>Phân tích lớp học (Heatmap)</span>
            </button>

            <button
              onClick={() => setActiveTab('PARENTPULSE')}
              data-testid="tab-parent-pulse"
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs transition cursor-pointer ${
                activeTab === 'PARENTPULSE'
                  ? 'bg-white text-stone-900 font-medium shadow-xs'
                  : 'text-stone-500 hover:text-stone-800'
              }`}
            >
              <HeartHandshake className="w-3.5 h-3.5 text-rose-600" />
              <span>Báo cáo Phụ huynh</span>
            </button>
          </div>

          {/* Bridge button to Feature 1 */}
          <button
            type="button"
            data-testid="btn-open-feature-1-board"
            onClick={() => {
              if (typeof window !== 'undefined') {
                window.open(teacherAppUrl(), '_blank');
              }
            }}
            className="text-xs border border-blue-200 bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-lg text-blue-800 font-semibold shadow-xs transition cursor-pointer hidden 2xl:flex items-center gap-1"
            title="Mở Bảng tương tác thông minh bục giảng trên lớp (Feature 1)"
          >
            <span>Tính năng 1: Bảng trên lớp</span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 w-full max-w-[1500px] mx-auto p-4 md:p-6 flex flex-col items-center justify-center">
        {activeTab === 'MY_CLASS' && <HubHome />}

        {activeTab === 'COMPANION' && (
          <div className="w-full flex justify-center">
            <SocraticCompanionSession
              onSessionComplete={(pts) => setTotalEureka(pts)}
              curriculumLevel={curriculumLevel}
            />
          </div>
        )}

        {activeTab === 'AFTER_SCHOOL_TUTOR' && (
          <div className="w-full flex justify-center">
            <AfterSchoolTutor
              curriculumLevel={curriculumLevel}
              onEurekaEarned={(pts) => setTotalEureka((prev) => prev + pts)}
            />
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
    </main>
  );
}
