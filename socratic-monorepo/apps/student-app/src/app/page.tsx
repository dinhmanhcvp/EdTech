'use client';

import React, { useState, useEffect } from 'react';
import { SocraticCompanionSession } from '../components/companion/SocraticCompanionSession';
import { TeacherHeatmap, StudentMastery } from '../components/dashboards/TeacherHeatmap';
import { ParentPulse } from '../components/dashboards/ParentPulse';
import { SmartNotesViewer } from '../components/dashboards/SmartNotesViewer';
import { GraduationCap, BarChart3, HeartHandshake, Compass, FileText } from 'lucide-react';

function getAcademicRank(eureka: number): { title: string; badgeClass: string; dotClass: string } {
  if (eureka >= 1000) return { title: 'Grandmaster / Quốc tế', badgeClass: 'bg-rose-500/10 text-rose-400 border-rose-500/30', dotClass: 'bg-rose-500' };
  if (eureka >= 500) return { title: 'Đội tuyển Quốc gia (National Olympiad)', badgeClass: 'bg-amber-500/10 text-amber-400 border-amber-500/30', dotClass: 'bg-amber-400' };
  if (eureka >= 250) return { title: 'Đội tuyển Tỉnh (Provincial Team)', badgeClass: 'bg-sky-500/10 text-sky-400 border-sky-500/30', dotClass: 'bg-sky-400' };
  if (eureka >= 100) return { title: 'Varsity (Tuyển Trường)', badgeClass: 'bg-zinc-800 text-zinc-300 border-zinc-700', dotClass: 'bg-zinc-400' };
  return { title: 'Scholar (Tập sự THPT)', badgeClass: 'bg-zinc-900 text-zinc-400 border-zinc-800', dotClass: 'bg-zinc-500' };
}

export default function StudentAppPage() {
  const [activeTab, setActiveTab] = useState<'COMPANION' | 'SMARTNOTES' | 'HEATMAP' | 'PARENTPULSE'>('COMPANION');
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
    const fetchHeatmap = async () => {
      try {
        let res: Response | null = null;
        try {
          res = await fetch('/api/v1/heatmap');
        } catch {
          res = await fetch('http://127.0.0.1:8000/api/v1/heatmap');
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
    <main className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col antialiased">
      {/* Precision Header */}
      <header className="h-11 border-b border-zinc-800/80 bg-zinc-950 px-4 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-semibold tracking-widest text-zinc-100">
              SOCRATIC
            </span>
            <span className="text-zinc-600 text-xs font-mono">/</span>
            <span className="text-xs text-zinc-400 font-medium">Companion</span>
            <span className="font-mono text-[10px] text-zinc-500 border border-zinc-800 px-1.5 py-0.5 rounded">
              v4.0
            </span>
          </div>

          <div className="h-3.5 w-px bg-zinc-800" />

          <div className={`px-2 py-0.5 rounded border text-[11px] font-mono flex items-center gap-1.5 ${academicRank.badgeClass}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${academicRank.dotClass}`} />
            <span>{academicRank.title}</span>
          </div>
        </div>

        {/* Center: Curriculum Toggle */}
        <div
          className="flex items-center bg-zinc-900 p-0.5 rounded-md border border-zinc-800"
          data-testid="student-curriculum-toggle"
        >
          <button
            type="button"
            data-testid="btn-student-mode-standard"
            onClick={() => setCurriculumLevel('THPT_STANDARD')}
            className={`px-3 py-1 rounded text-xs transition cursor-pointer ${
              curriculumLevel === 'THPT_STANDARD'
                ? 'bg-zinc-800 text-zinc-100 font-medium shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Chuẩn THPT
          </button>
          <button
            type="button"
            data-testid="btn-student-mode-olympiad"
            onClick={() => setCurriculumLevel('OLYMPIAD_ADVANCED')}
            className={`px-3 py-1 rounded text-xs transition cursor-pointer flex items-center gap-1.5 ${
              curriculumLevel === 'OLYMPIAD_ADVANCED'
                ? 'bg-zinc-800 text-amber-400 font-medium shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            <span>Chuyên sâu (Chuyên/HSG)</span>
          </button>
        </div>

        {/* Right: Tab Switcher */}
        <div className="flex items-center gap-1 bg-zinc-900 p-0.5 rounded-md border border-zinc-800">
          <button
            onClick={() => setActiveTab('COMPANION')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs transition cursor-pointer ${
              activeTab === 'COMPANION'
                ? 'bg-zinc-800 text-zinc-100 font-medium'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Compass className="w-3.5 h-3.5" />
            <span>Bài học Socratic</span>
          </button>

          <button
            onClick={() => setActiveTab('SMARTNOTES')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs transition cursor-pointer ${
              activeTab === 'SMARTNOTES'
                ? 'bg-zinc-800 text-zinc-100 font-medium'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Smart Notes (Tính năng 5)</span>
          </button>

          <button
            onClick={() => setActiveTab('HEATMAP')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs transition cursor-pointer ${
              activeTab === 'HEATMAP'
                ? 'bg-zinc-800 text-zinc-100 font-medium'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Ma trận Giáo viên</span>
          </button>

          <button
            onClick={() => setActiveTab('PARENTPULSE')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs transition cursor-pointer ${
              activeTab === 'PARENTPULSE'
                ? 'bg-zinc-800 text-zinc-100 font-medium'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <HeartHandshake className="w-3.5 h-3.5" />
            <span>Parent Pulse</span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 p-6 flex flex-col items-center justify-center">
        {activeTab === 'COMPANION' && (
          <div className="w-full flex justify-center">
            <SocraticCompanionSession
              onSessionComplete={(pts) => setTotalEureka(pts)}
              curriculumLevel={curriculumLevel}
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
