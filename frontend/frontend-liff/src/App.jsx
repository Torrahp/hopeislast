import React, { useEffect, useState } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
// eslint-disable-next-line no-unused-vars
import { AnimatePresence, motion } from 'framer-motion';
import { initLiff } from './services/liffServices.js';
import SurveyDetailPage from './pages/SurveyDetailPage.jsx';
import MapPage from './pages/MapPage.jsx';
import RegisterForm from './pages/RegisterForm.jsx';
import './App.css';
import HomePage from './pages/HomePage.jsx';

/* ── Icons (Heroicons v2 outline) ── */
import {
  HiOutlineHome,
  HiOutlineClipboardDocument,
  HiOutlineMap,
} from 'react-icons/hi2';

const pageVariants = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.22, ease: 'easeOut' } },
  exit:    { opacity: 0, y: -6, transition: { duration: 0.15, ease: 'easeIn'  } },
};

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [liffProfile, setLiffProfile] = useState(null);

  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const startLiff = async () => {
      if (window.Cypress) {
        console.log("🛠️ Cypress Mode: Mocking user data...");
        setUser({
          user_id: 'U1234567890',
          display_name: 'เกษตรกร ทดสอบ (Cypress)',
          picture_url: 'https://placehold.jp/100x100.png',
          role: 'admin',
          phone_number: '0812345678'
        });
        setLoading(false);
        return;
      }

      try {
        const liffId = import.meta.env.VITE_LIFF_ID;
        const data = await initLiff(liffId);
        if (data) {
          if (data.phone_number) setUser(data);
          else setLiffProfile(data);
        }
      } catch (err) {
        console.error("❌ LIFF Error:", err);
      } finally {
        setLoading(false);
      }
    };
    startLiff();
  }, []);

  const handleRegisterSuccess = (updatedUser) => setUser(updatedUser);

  /* ── Loading ── */
  if (loading) {
    return (
      <div className="min-h-screen bg-[#006600] flex flex-col items-center justify-center gap-5">
        <div className="w-20 h-20 rounded-full bg-white flex items-center justify-center shadow-lg">
          <span className="text-[#006600] font-extrabold text-3xl leading-none">KU</span>
        </div>
        <div className="ku-spinner" />
        <p className="text-white text-sm font-medium">กำลังเชื่อมต่อ LINE...</p>
      </div>
    );
  }

  /* ── Register ── */
  if (!user && liffProfile) {
    return <RegisterForm liffProfile={liffProfile} onRegisterSuccess={handleRegisterSuccess} />;
  }

  /* ── Pending approval ── */
  if (user && user.role === 'user') {
    return (
      <div className="min-h-screen bg-[#f3f7f3] flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-sm text-center">
          <div className="w-16 h-16 rounded-full bg-amber-50 border-2 border-amber-300 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-lg font-bold text-gray-800 mb-2">รอการอนุมัติ</h2>
          <p className="text-sm text-gray-500 leading-relaxed">
            สวัสดีคุณ <span className="font-semibold text-[#006600]">{user.display_name}</span>
            <br />กรุณารอเจ้าหน้าที่อนุมัติสิทธิ์เข้าใช้งาน
          </p>
          <div className="mt-4 bg-[#e6f2e6] rounded-lg px-4 py-2 text-xs text-[#006600] font-medium">
            Kasetsart University · Munbot System
          </div>
        </div>
      </div>
    );
  }

  /* ── No LINE user ── */
  if (!user) {
    return (
      <div className="min-h-screen bg-[#006600] flex items-center justify-center p-6">
        <div className="bg-white/10 rounded-2xl p-6 text-center">
          <p className="text-white font-semibold">⚠️ กรุณาเข้าใช้งานผ่าน LINE</p>
        </div>
      </div>
    );
  }

  /* ── Nav helpers ── */
  const NAV = [
    { path: '/',       Icon: HiOutlineHome,              label: 'หน้าแรก' },
    { path: '/survey', Icon: HiOutlineClipboardDocument, label: 'สร้างแปลง' },
    { path: '/map',    Icon: HiOutlineMap,               label: 'แผนที่' },
  ];

  const isActive = (path) =>
    path === '/' ? location.pathname === '/' : location.pathname.startsWith(path);

  return (
    <div className="min-h-screen bg-[#f3f7f3] flex flex-col">
      {/* Main content — animated page transitions */}
      <AnimatePresence mode="wait">
        <motion.div
          key={location.pathname}
          variants={pageVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          className="flex-1 pb-[calc(4rem+env(safe-area-inset-bottom))]"
        >
          <Routes location={location}>
            <Route path="/"                          element={<HomePage user={user} />} />
            <Route path="/survey"                    element={<SurveyDetailPage user={user} />} />
            <Route path="/survey/edit/:plotId"       element={<SurveyDetailPage user={user} isEdit={true} />} />
            <Route path="/survey/new-record/:plotId" element={<SurveyDetailPage user={user} isNewRecord={true} />} />
            <Route path="/map"                       element={<MapPage user={user} />} />
          </Routes>
        </motion.div>
      </AnimatePresence>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-[0_-2px_12px_rgba(0,0,0,0.06)] z-50"
           style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <div className="flex">
          {NAV.map(({ path, Icon, label }) => {
            const active = isActive(path);
            return (
              <button
                key={path}
                onClick={() => navigate(path)}
                className={`flex-1 flex flex-col items-center justify-center py-2.5 gap-0.5 transition-colors border-0 outline-none bg-transparent ${
                  active ? 'text-[#006600]' : 'text-gray-400'
                }`}
              >
                <Icon className={`w-6 h-6 transition-transform ${active ? 'scale-110' : ''}`} />
                <span className={`text-[11px] font-medium leading-tight ${active ? 'text-[#006600]' : 'text-gray-400'}`}>
                  {label}
                </span>
                {active && <span className="w-1 h-1 rounded-full bg-[#006600] mt-0.5" />}
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

export default App;
