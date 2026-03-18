import React, { useState, useEffect } from 'react';
import Registration from './components/Registration';
import Attendance from './components/Attendance';
import { supabase } from './lib/supabase';

function App() {
  const [currentPage, setCurrentPage] = useState('attendance'); // 'attendance', 'register'

  const renderPage = () => {
    if (currentPage === 'register') return <Registration onNavigate={setCurrentPage} />;
    return <Attendance />;
  };

  return (
    <div className="min-h-screen w-full bg-[#0f172a] text-slate-200 selection:bg-primary-500/30 flex flex-col items-center">
      <nav className="w-full p-4 border-b border-slate-800/50 backdrop-blur-md sticky top-0 z-50 flex justify-center">
        <div className="w-full max-w-4xl flex justify-between items-center px-2">
          <div className="text-xl font-black gradient-text tracking-tighter cursor-pointer" onClick={() => setCurrentPage('attendance')}>
            ABSENSI.PRO
          </div>
          <div className="flex gap-2 sm:gap-4 items-center">
            <button 
              onClick={() => setCurrentPage('attendance')}
              className={`text-xs sm:text-sm font-medium transition-colors ${currentPage === 'attendance' ? 'text-primary-400' : 'hover:text-primary-400'}`}
            >
              Attendance
            </button>
            <button 
              onClick={() => setCurrentPage('register')}
              className={`px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl text-xs sm:text-sm font-bold transition-all shadow-lg ${
                currentPage === 'register' 
                ? 'bg-slate-700 text-slate-300 cursor-default' 
                : 'bg-primary-600 hover:bg-primary-700 shadow-primary-500/20'
              }`}
            >
              Register <span className="hidden sm:inline">Student</span>
            </button>
          </div>
        </div>
      </nav>

      <main className="w-full max-w-5xl py-8 sm:py-12 px-4 flex flex-col items-center">
        {renderPage()}
      </main>
      
      <footer className="py-8 text-center text-slate-500 text-sm">
        &copy; 2026 Absensi Pro • Student Attendance System
      </footer>
    </div>
  );
}

export default App;
