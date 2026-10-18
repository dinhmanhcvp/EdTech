'use client';

import React, { useState } from 'react';
import { SocraticCompanionSession } from '../components/companion/SocraticCompanionSession';
import { TeacherHeatmap, StudentMastery } from '../components/dashboards/TeacherHeatmap';
import { ParentPulse } from '../components/dashboards/ParentPulse';
import { GraduationCap, Sparkles, BarChart3, HeartHandshake, Compass } from 'lucide-react';

export default function StudentAppPage() {
  const [activeTab, setActiveTab] = useState<'COMPANION' | 'HEATMAP' | 'PARENTPULSE'>('COMPANION');
  const [totalEureka, setTotalEureka] = useState<number>(0);

  const mockStudents: StudentMastery[] = [
    { name: 'Nguyễn Văn An', mathWave: 'green', physicsProjectile: 'green', chemRedox: 'red', bioStomata: 'amber', gritScore: 88 },
    { name: 'Trần Thị Mai', mathWave: 'green', physicsProjectile: 'amber', chemRedox: 'green', bioStomata: 'green', gritScore: 95 },
    { name: 'Lê Hoàng Nam', mathWave: 'amber', physicsProjectile: 'red', chemRedox: 'red', bioStomata: 'green', gritScore: 74 },
    { name: 'Phạm Minh Tuấn', mathWave: 'green', physicsProjectile: 'green', chemRedox: 'green', bioStomata: 'green', gritScore: 98 },
  ];

  return (
    <main className="min-h-screen bg-slate-950 flex flex-col">
      {/* Header */}
      <header className="px-8 py-4 border-b border-white/10 bg-slate-900/80 backdrop-blur-xl flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-500 to-indigo-600 flex items-center justify-center text-slate-950 shadow-lg shadow-purple-500/20">
            <GraduationCap className="w-5 h-5 font-bold" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-extrabold text-base tracking-tight text-white">
                Socratic Companion <span className="text-purple-400 font-mono text-xs">v2.0</span>
              </h1>
              <span className="px-2 py-0.5 rounded-full bg-purple-500/20 border border-purple-500/40 text-purple-300 text-[10px] font-mono font-bold">
                Port 3000
              </span>
            </div>
            <p className="text-xs text-slate-400">Ứng dụng Học sinh • Scaffolding chống gian lận • Kinh tế Hạt Eureka</p>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-2 bg-slate-950/60 p-1.5 rounded-2xl border border-white/10">
          <button
            onClick={() => setActiveTab('COMPANION')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
              activeTab === 'COMPANION'
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Compass className="w-4 h-4" />
            <span>Bài học Socratic</span>
          </button>

          <button
            onClick={() => setActiveTab('HEATMAP')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
              activeTab === 'HEATMAP'
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>Ma trận Giáo viên</span>
          </button>

          <button
            onClick={() => setActiveTab('PARENTPULSE')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
              activeTab === 'PARENTPULSE'
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <HeartHandshake className="w-4 h-4" />
            <span>Parent Pulse</span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 p-8 flex flex-col items-center justify-center">
        {activeTab === 'COMPANION' && (
          <div className="w-full flex justify-center">
            <SocraticCompanionSession onSessionComplete={(pts) => setTotalEureka(pts)} />
          </div>
        )}

        {activeTab === 'HEATMAP' && (
          <div className="w-full max-w-4xl">
            <TeacherHeatmap students={mockStudents} />
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
