import React, { useState, useEffect } from 'react';
import adminApi from '../services/adminApi';

const CLASSES = [
    'Healthy',
    'Mosaic Disease',
    'Bacterial Blight',
    'Brown Streak Disease',
    'another',
];

const PAGE_SIZE = 200;

const LogImage = ({ src }) => {
    const [error, setError] = useState(false);
    const fullSrc = src ? `http://localhost:5000/uploads/${src}` : null;

    if (!fullSrc || error) {
        return (
            <div className="w-full h-full flex items-center justify-center bg-gray-100 text-gray-400 text-sm">
                {error ? 'รูปภาพเสีย' : 'ไม่มีรูปภาพ'}
            </div>
        );
    }
    return (
        <img
            src={fullSrc}
            alt="prediction"
            className="w-full h-full object-cover"
            onError={() => setError(true)}
        />
    );
};

const classAccuracy = (logs) => {
    const withBoth = logs.filter(l => l.disease_name != null && l.ai_predicted_disease != null);
    if (withBoth.length === 0) return null;
    const correct = withBoth.filter(l => l.disease_name === l.ai_predicted_disease).length;
    return ((correct / withBoth.length) * 100).toFixed(1);
};

const PredictionLogs = () => {
    const [logs, setLogs]           = useState([]);
    const [loading, setLoading]     = useState(true);
    const [activeTab, setActiveTab] = useState(CLASSES[0]);
    const [visibleCounts, setVisibleCounts] = useState(
        Object.fromEntries(CLASSES.map(c => [c, PAGE_SIZE]))
    );

    useEffect(() => {
        const fetchLogs = async () => {
            try {
                const res = await adminApi.get('/prediction-logs');
                if (res.data.success) {
                    const sorted = [...res.data.data].sort(
                        (a, b) => new Date(b.created_at) - new Date(a.created_at)
                    );
                    setLogs(sorted);
                }
            } catch (err) {
                console.error('Fetch error:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchLogs();
    }, []);

    const logsForClass = (cls) => logs.filter(l => l.disease_name === cls);

    const handleViewMore = (cls) =>
        setVisibleCounts(prev => ({ ...prev, [cls]: prev[cls] + PAGE_SIZE }));

    const tabLogs    = logsForClass(activeTab);
    const visibleLogs = tabLogs.slice(0, visibleCounts[activeTab]);
    const hasMore    = tabLogs.length > visibleCounts[activeTab];
    const accuracy   = classAccuracy(tabLogs);

    const withBothCount = tabLogs.filter(l => l.disease_name != null && l.ai_predicted_disease != null).length;
    const correctCount  = tabLogs.filter(l => l.disease_name != null && l.ai_predicted_disease != null && l.disease_name === l.ai_predicted_disease).length;

    return (
        <div className="min-h-screen bg-[#f3f7f3] py-8 px-4">
            <div className="max-w-screen-xl mx-auto">

                {/* Page header */}
                <div className="mb-6">
                    <h1 className="text-2xl font-bold text-[#006600]">ประวัติการวิเคราะห์โรค (AI Logs)</h1>
                    <p className="text-gray-500 text-sm mt-1">Kasetsart University · Munbot Plant Disease System</p>
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">

                    {/* Total count */}
                    <div className="flex items-center gap-3 mb-5">
                        <span className="font-semibold text-gray-700">รายการทั้งหมด</span>
                        <span className="bg-[#e6f2e6] text-[#006600] text-xs font-bold px-2.5 py-1 rounded-full">
                            {logs.length} รายการ
                        </span>
                    </div>

                    {loading ? (
                        <div className="py-20 text-center text-gray-400">กำลังโหลดข้อมูล...</div>
                    ) : (
                        <>
                            {/* ── Tabs ── */}
                            <div className="flex flex-wrap gap-2 mb-5">
                                {CLASSES.map(cls => {
                                    const count = logsForClass(cls).length;
                                    const acc   = classAccuracy(logsForClass(cls));
                                    const isActive = activeTab === cls;
                                    return (
                                        <button
                                            key={cls}
                                            onClick={() => setActiveTab(cls)}
                                            className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium border transition-all ${
                                                isActive
                                                    ? 'bg-[#006600] text-white border-[#006600] shadow-sm'
                                                    : 'bg-white text-gray-600 border-gray-300 hover:border-[#006600] hover:text-[#006600]'
                                            }`}
                                        >
                                            <span>{cls}</span>
                                            <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${
                                                isActive ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-600'
                                            }`}>
                                                {count}
                                            </span>
                                            {acc !== null && (
                                                <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${
                                                    parseFloat(acc) >= 70
                                                        ? (isActive ? 'bg-green-200/30 text-green-100' : 'bg-green-100 text-green-700')
                                                        : (isActive ? 'bg-red-200/30 text-red-200' : 'bg-red-100 text-red-700')
                                                }`}>
                                                    {acc}%
                                                </span>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>

                            {/* ── Accuracy bar ── */}
                            {accuracy !== null && (
                                <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-5">
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="text-sm text-gray-600">
                                            Model Accuracy — <span className="font-semibold text-gray-800">{activeTab}</span>
                                        </span>
                                        <span className={`text-xl font-bold ${parseFloat(accuracy) >= 70 ? 'text-green-600' : 'text-red-600'}`}>
                                            {accuracy}%
                                        </span>
                                    </div>
                                    <p className="text-xs text-gray-400 mb-3">
                                        ทำนายถูก {correctCount} / {withBothCount} รายการที่มีข้อมูลอ้างอิง
                                    </p>
                                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                                        <div
                                            className={`h-full rounded-full transition-all duration-500 ${parseFloat(accuracy) >= 70 ? 'bg-green-500' : 'bg-red-500'}`}
                                            style={{ width: `${accuracy}%` }}
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Meta line */}
                            <p className="text-xs text-gray-400 mb-4">
                                แสดง {visibleLogs.length} / {tabLogs.length} รายการ · เรียงจากใหม่ไปเก่า
                            </p>

                            {tabLogs.length === 0 ? (
                                <div className="py-16 text-center text-gray-400">ไม่มีข้อมูลในหมวดนี้</div>
                            ) : (
                                <>
                                    {/* ── Grid ── */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                                        {visibleLogs.map(log => {
                                            const hasBoth  = log.disease_name != null && log.ai_predicted_disease != null;
                                            const isCorrect = hasBoth && log.disease_name === log.ai_predicted_disease;
                                            return (
                                                <div
                                                    key={log.image_id}
                                                    className={`rounded-xl overflow-hidden border-2 shadow-sm hover:-translate-y-1 hover:shadow-md transition-all ${
                                                        hasBoth
                                                            ? (isCorrect ? 'border-green-300' : 'border-red-300')
                                                            : 'border-gray-200'
                                                    }`}
                                                >
                                                    {/* Image area */}
                                                    <div className="relative h-48 bg-gray-100">
                                                        <LogImage src={log.image_path} />

                                                        {/* Confidence */}
                                                        <span className="absolute bottom-2 right-2 bg-[#006600]/90 text-white text-xs font-semibold px-2 py-0.5 rounded-full">
                                                            {(Number(log.confidence) || 0).toFixed(1)}%
                                                        </span>

                                                        {/* Correct / wrong badge */}
                                                        {hasBoth && (
                                                            <span className={`absolute top-2 left-2 text-xs font-bold px-2 py-0.5 rounded-full ${
                                                                isCorrect ? 'bg-green-600/90 text-white' : 'bg-red-600/90 text-white'
                                                            }`}>
                                                                {isCorrect ? 'ถูกต้อง' : 'ผิดพลาด'}
                                                            </span>
                                                        )}
                                                    </div>

                                                    {/* Detail */}
                                                    <div className="p-4 bg-white">
                                                        <p className="font-semibold text-gray-800 text-sm">{log.disease_name || '—'}</p>
                                                        {log.ai_predicted_disease && (
                                                            <p className={`text-xs font-medium mt-1 ${isCorrect ? 'text-green-600' : 'text-red-600'}`}>
                                                                AI: {log.ai_predicted_disease}
                                                            </p>
                                                        )}
                                                        <p className="text-xs text-gray-400 mt-1.5">
                                                            {new Date(log.created_at).toLocaleString('th-TH')}
                                                        </p>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>

                                    {/* View more */}
                                    {hasMore && (
                                        <div className="flex justify-center mt-6">
                                            <button
                                                onClick={() => handleViewMore(activeTab)}
                                                className="border-2 border-[#006600] text-[#006600] hover:bg-[#006600] hover:text-white font-semibold text-sm px-8 py-2.5 rounded-full transition-colors"
                                            >
                                                ดูเพิ่มเติม ({tabLogs.length - visibleCounts[activeTab]} รายการที่เหลือ)
                                            </button>
                                        </div>
                                    )}
                                </>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default PredictionLogs;
