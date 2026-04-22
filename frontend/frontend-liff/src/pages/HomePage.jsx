import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Swal from 'sweetalert2';
// eslint-disable-next-line no-unused-vars
import { motion, AnimatePresence } from 'framer-motion';
import { MdArrowDropDown } from 'react-icons/md';
import {
    HiOutlineMapPin,
    HiOutlinePlus,
    HiOutlineCalendarDays,
    HiOutlineEye,
    HiOutlinePencilSquare,
    HiOutlineEyeSlash,
    HiOutlineTrash,
    HiOutlineShieldCheck,
    HiOutlineBeaker,
    HiOutlineChartBar,
    HiOutlineArchiveBox,
} from 'react-icons/hi2';

const listContainer = {
    hidden: {},
    show: { transition: { staggerChildren: 0.07, delayChildren: 0.1 } },
};
const listItem = {
    hidden: { opacity: 0, y: 18, scale: 0.98 },
    show:   { opacity: 1, y: 0,  scale: 1, transition: { duration: 0.3, ease: 'easeOut' } },
};

/* ── Disease colour helpers ──────────────────────────────────── */
const DISEASE_STYLE = {
    'healthy':              { bg: 'bg-emerald-100', text: 'text-emerald-800', dot: 'bg-emerald-500' },
    'mosaic disease':       { bg: 'bg-red-100',     text: 'text-red-800',     dot: 'bg-red-500'     },
    'bacterial blight':     { bg: 'bg-amber-100',   text: 'text-amber-800',   dot: 'bg-amber-500'   },
    'brown streak disease': { bg: 'bg-violet-100',  text: 'text-violet-800',  dot: 'bg-violet-500'  },
};
const getDiseaseStyle = (n) =>
    DISEASE_STYLE[n?.toLowerCase()] ?? { bg: 'bg-gray-100', text: 'text-gray-700', dot: 'bg-gray-400' };

/* ── Image preview modal ─────────────────────────────────────── */
const ImageModal = ({ src, onClose }) => (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={onClose}>
        <div className="relative max-w-sm w-full" onClick={e => e.stopPropagation()}>
            <button
                onClick={onClose}
                className="absolute -top-10 right-0 text-white text-2xl font-bold leading-none"
            >✕</button>
            <img src={src} alt="Preview" className="w-full rounded-2xl shadow-2xl object-contain max-h-[70vh]" />
        </div>
    </div>
);

const HomePage = ({ user }) => {
    const [stats, setStats] = useState({ totalPlots: 0, plots: [] });
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    const Toast = Swal.mixin({
        toast: true, position: 'top-end',
        showConfirmButton: false, timer: 3000, timerProgressBar: true,
    });

    useEffect(() => {
        const fetchDashboard = async () => {
            try {
                const res = await axios.get(`/api/survey/dashboard/${user.user_id || user.userId}`);
                if (res.data.success) setStats(res.data);
            } catch (err) { console.error("Dashboard Error:", err); }
            finally { setLoading(false); }
        };
        if (user) fetchDashboard();
    }, [user]);

    useEffect(() => {
        const refreshData = async () => {
            if (!user) return;
            setLoading(true);
            try {
                const userId = user.user_id || user.userId;
                await axios.put(`/api/survey/auto-hide/${userId}`);
                const res = await axios.get(`/api/survey/dashboard/${userId}`);
                if (res.data.success) setStats(res.data);
            } catch (err) { console.error("Refresh Dashboard Error:", err); }
            finally { setLoading(false); }
        };
        refreshData();
    }, [user]);

    const fetchDashboard = async () => {
        try {
            const res = await axios.get(`/api/survey/dashboard/${user.user_id || user.userId}`);
            if (res.data.success) setStats(res.data);
        } catch (err) { console.error("Dashboard Error:", err); }
        finally { setLoading(false); }
    };

    const handleAction = async (plotId, action) => {
        const isDelete = action === 'delete';
        const result = await Swal.fire({
            title: isDelete ? 'ยืนยันการลบ?' : 'ยืนยันการซ่อน?',
            text: isDelete ? "ข้อมูลจะถูกลบถาวร ไม่สามารถกู้คืนได้" : "แปลงนี้จะไม่แสดงในหน้าหลักชั่วคราว",
            icon: isDelete ? 'warning' : 'question',
            showCancelButton: true,
            confirmButtonColor: isDelete ? '#ef4444' : '#006600',
            cancelButtonColor: '#94a3b8',
            confirmButtonText: isDelete ? 'ใช่, ลบเลย!' : 'ใช่, ซ่อนเลย',
            cancelButtonText: 'ยกเลิก',
            reverseButtons: true,
        });
        if (result.isConfirmed) {
            try {
                await axios.put(`/api/survey/status/${plotId}`, { action });
                Toast.fire({ icon: 'success', title: isDelete ? 'ลบข้อมูลเรียบร้อย' : 'ซ่อนแปลงเรียบร้อย' });
                fetchDashboard();
            } catch (err) {
                Swal.fire({ icon: 'error', title: 'เกิดข้อผิดพลาด',
                    text: err.response?.data?.message || 'ไม่สามารถดำเนินการได้',
                    confirmButtonColor: '#006600' });
            }
        }
    };

    const [expandedPlot, setExpandedPlot] = useState(null);
    const [plotHistory, setPlotHistory] = useState([]);
    const [selectedImg, setSelectedImg] = useState(null);

    const toggleExpand = async (plotId) => {
        if (expandedPlot === plotId) { setExpandedPlot(null); return; }
        try {
            const res = await axios.get(`/api/survey/history/${plotId}`);
            if (res.data.success) { setPlotHistory(res.data.history); setExpandedPlot(plotId); }
        } catch (err) { console.error("Load History Error:", err); }
    };

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center bg-[#f3f7f3]">
            <div className="flex flex-col items-center gap-3">
                <div className="ku-spinner" />
                <p className="text-sm text-gray-500">กำลังโหลด...</p>
            </div>
        </div>
    );

    /* ── Role badge ── */
    const RoleBadge = () => {
        if (user?.role === 'admin')
            return <span className="inline-flex items-center gap-1 text-xs bg-white/20 text-white px-2.5 py-0.5 rounded-full font-medium"><HiOutlineShieldCheck className="w-3.5 h-3.5" />ผู้ดูแลระบบ</span>;
        if (user?.role === 'Plant Pathologist')
            return <span className="inline-flex items-center gap-1 text-xs bg-amber-400/30 text-amber-100 px-2.5 py-0.5 rounded-full font-medium"><HiOutlineBeaker className="w-3.5 h-3.5" />นักโรคพืช</span>;
        return null;
    };

    return (
        <div className="min-h-screen bg-[#f3f7f3]">

            {/* ── Header ── */}
            <motion.header
                initial={{ opacity: 0, y: -16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, ease: 'easeOut' }}
                className="pt-10 pb-6 px-5"
                style={{ background: 'linear-gradient(160deg, #006600 0%, #004d00 100%)' }}
            >
                <div className="flex items-center gap-4">
                    <img
                        src={user?.picture_url}
                        alt="profile"
                        className="w-14 h-14 rounded-full border-3 border-white/50 object-cover shadow"
                    />
                    <div>
                        <p className="text-green-200 text-xs">สวัสดี,</p>
                        <h1 className="text-white text-lg font-bold leading-tight">{user?.display_name}</h1>
                        <RoleBadge />
                    </div>
                </div>

                {/* Stats chips */}
                <div className="flex gap-3 mt-5">
                    <div className="flex-1 bg-white/10 rounded-xl p-3 text-center">
                        <HiOutlineMapPin className="w-5 h-5 text-green-200 mx-auto mb-1" />
                        <p className="text-white text-xl font-bold leading-none">{stats.totalPlots}</p>
                        <p className="text-green-200 text-xs mt-0.5">แปลงที่ติดตาม</p>
                    </div>
                    <div className="flex-1 bg-white/10 rounded-xl p-3 text-center">
                        <HiOutlineChartBar className="w-5 h-5 text-green-200 mx-auto mb-1" />
                        <p className="text-white text-xl font-bold leading-none">{stats.allRecords || 0}</p>
                        <p className="text-green-200 text-xs mt-0.5">ครั้งที่สำรวจ</p>
                    </div>
                    <div className="flex-1 bg-white/10 rounded-xl p-3 text-center">
                        <HiOutlineArchiveBox className="w-5 h-5 text-green-200 mx-auto mb-1" />
                        <p className="text-white text-xl font-bold leading-none">{stats.hiddenPlots || 0}</p>
                        <p className="text-green-200 text-xs mt-0.5">ซ่อนไว้</p>
                    </div>
                </div>
            </motion.header>

            {/* ── Content ── */}
            <div className="px-4 py-5">

                {/* Create button */}
                <motion.button
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: 0.15 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => navigate('/survey')}
                    className="w-full flex items-center justify-center gap-2 text-white font-bold py-4 rounded-2xl text-base shadow-lg transition-colors mb-6"
                    style={{ background: 'linear-gradient(135deg, #006600 0%, #004d00 100%)' }}
                >
                    <HiOutlinePlus className="w-5 h-5" />
                    สร้างแปลงพืชใหม่
                </motion.button>

                {/* Plot list */}
                <h2 className="text-base font-bold text-gray-700 mb-3">รายการแปลงพืช</h2>

                {stats.plots.length === 0 ? (
                    <div className="bg-white rounded-2xl p-10 text-center shadow-sm border border-gray-100">
                        <HiOutlineMapPin className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                        <p className="text-gray-500 text-sm">ยังไม่มีรายการแปลงพืช</p>
                    </div>
                ) : (
                    <motion.div
                        className="flex flex-col gap-3"
                        variants={listContainer}
                        initial="hidden"
                        animate="show"
                    >
                        {stats.plots.map(plot => {
                            const isOpen = expandedPlot === plot.plot_id;
                            return (
                                <motion.div key={plot.plot_id} variants={listItem} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">

                                    {/* Plot header row */}
                                    <div className="flex items-center justify-between px-4 py-4">
                                        <div className="flex-1 min-w-0 pr-2">
                                            <h3 className="font-bold text-gray-800 text-base leading-tight truncate">
                                                {plot.plot_name?.trim() || `${plot.province} - ${plot.district}`}
                                            </h3>
                                            {plot.plot_name?.trim() && (
                                                <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                                                    <HiOutlineMapPin className="w-3 h-3" />
                                                    {plot.province} · {plot.district}
                                                </p>
                                            )}
                                        </div>
                                        <button
                                            onClick={() => toggleExpand(plot.plot_id)}
                                            className="shrink-0 w-9 h-9 flex items-center justify-center rounded-full bg-gray-50 border-0 outline-none transition-colors hover:bg-[#e6f2e6]"
                                        >
                                            <MdArrowDropDown
                                                size={26}
                                                color={isOpen ? '#006600' : '#6b7280'}
                                                style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0)', transition: '0.25s' }}
                                            />
                                        </button>
                                    </div>

                                    {/* History expansion */}
                                    <AnimatePresence>
                                    {isOpen && (
                                        <motion.div
                                            initial={{ opacity: 0, height: 0 }}
                                            animate={{ opacity: 1, height: 'auto' }}
                                            exit={{ opacity: 0, height: 0 }}
                                            transition={{ duration: 0.25, ease: 'easeInOut' }}
                                            className="overflow-hidden"
                                        >
                                        <div className="border-t border-gray-100 bg-gray-50 px-4 py-4">
                                            <h4 className="text-xs font-bold text-[#006600] uppercase tracking-wide flex items-center gap-1.5 mb-3">
                                                <HiOutlineCalendarDays className="w-4 h-4" />
                                                ประวัติการสำรวจ
                                            </h4>

                                            {plotHistory.length === 0 ? (
                                                <p className="text-sm text-gray-400 text-center py-3">ไม่มีข้อมูลการสำรวจ</p>
                                            ) : (
                                                <div className="flex flex-col gap-3">
                                                    {plotHistory.map((rec) => (
                                                        <div key={rec.record_id} className="bg-white rounded-xl border border-gray-200 p-3 shadow-sm">
                                                            <p className="text-xs font-semibold text-gray-500 mb-1">
                                                                {new Date(rec.survey_date).toLocaleDateString('th-TH', { day: '2-digit', month: 'short', year: '2-digit' })}
                                                            </p>
                                                            <p className="text-xs text-gray-500 mb-2">
                                                                พันธุ์: {rec.plant_species} · เริ่มปลูก: {new Date(rec.plant_date).toLocaleDateString('th-TH')}
                                                            </p>
                                                            <div className="flex flex-col gap-1.5">
                                                                {rec.images.map((img, idx) => {
                                                                    const ds = getDiseaseStyle(img.disease);
                                                                    return (
                                                                        <div key={idx} className="flex items-center justify-between gap-2">
                                                                            <div className="flex items-center gap-2 flex-1 min-w-0">
                                                                                <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${ds.bg} ${ds.text} truncate`}>
                                                                                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${ds.dot}`} />
                                                                                    {img.disease}
                                                                                </span>
                                                                                <span className="text-xs text-gray-400 shrink-0">ระดับ {img.severity}</span>
                                                                            </div>
                                                                            <button
                                                                                onClick={() => setSelectedImg(`/uploads/${img.path}`)}
                                                                                className="shrink-0 flex items-center gap-1 text-xs text-[#006600] font-medium border border-[#006600]/30 rounded-full px-2.5 py-1 bg-[#e6f2e6] hover:bg-[#006600] hover:text-white transition-colors border-0 outline-none"
                                                                            >
                                                                                <HiOutlineEye className="w-3.5 h-3.5" />
                                                                                ดูรูป
                                                                            </button>
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                        </motion.div>
                                    )}
                                    </AnimatePresence>

                                    {/* Action buttons */}
                                    <div className="border-t border-gray-100 px-4 py-3 flex gap-2 flex-wrap">
                                        <button
                                            onClick={() => navigate(`/survey/new-record/${plot.plot_id}`)}
                                            className="flex-1 flex items-center justify-center gap-1.5 bg-[#006600] text-white text-xs font-semibold py-2.5 rounded-xl border-0 outline-none min-w-[90px]"
                                        >
                                            <HiOutlinePlus className="w-4 h-4" />
                                            สำรวจใหม่
                                        </button>
                                        <button
                                            onClick={() => navigate(`/survey/edit/${plot.plot_id}`)}
                                            className="flex items-center gap-1 text-xs font-semibold text-gray-600 border border-gray-300 px-3 py-2.5 rounded-xl bg-white border-0 outline-none hover:bg-gray-50"
                                        >
                                            <HiOutlinePencilSquare className="w-4 h-4" />
                                            แก้ไข
                                        </button>
                                        <button
                                            onClick={() => handleAction(plot.plot_id, 'hide')}
                                            className="flex items-center gap-1 text-xs font-semibold text-amber-600 border border-amber-200 px-3 py-2.5 rounded-xl bg-amber-50 border-0 outline-none"
                                        >
                                            <HiOutlineEyeSlash className="w-4 h-4" />
                                            ซ่อน
                                        </button>
                                        <button
                                            onClick={() => handleAction(plot.plot_id, 'delete')}
                                            className="flex items-center gap-1 text-xs font-semibold text-red-600 border border-red-200 px-3 py-2.5 rounded-xl bg-red-50 border-0 outline-none"
                                        >
                                            <HiOutlineTrash className="w-4 h-4" />
                                            ลบ
                                        </button>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </motion.div>
                )}
            </div>

            {/* Image modal */}
            {selectedImg && <ImageModal src={selectedImg} onClose={() => setSelectedImg(null)} />}
        </div>
    );
};

export default HomePage;
