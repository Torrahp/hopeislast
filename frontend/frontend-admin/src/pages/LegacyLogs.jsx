import React, { useState, useEffect, useCallback } from 'react';
import adminApi from '../services/adminApi';

/* ── helpers ──────────────────────────────────────────────────── */
const DISEASE_STYLE = {
    'healthy':              { text: 'text-emerald-700', bg: 'bg-emerald-500',  badge: 'bg-emerald-500/90' },
    'mosaic disease':       { text: 'text-red-700',     bg: 'bg-red-500',      badge: 'bg-red-500/90'     },
    'bacterial blight':     { text: 'text-amber-700',   bg: 'bg-amber-500',    badge: 'bg-amber-500/90'   },
    'brown streak disease': { text: 'text-violet-700',  bg: 'bg-violet-500',   badge: 'bg-violet-500/90'  },
    'another':              { text: 'text-gray-600',    bg: 'bg-gray-500',     badge: 'bg-gray-500/90'    },
};
const getDiseaseStyle = (name) =>
    DISEASE_STYLE[name?.toLowerCase()] ??
    { text: 'text-gray-600', bg: 'bg-gray-500', badge: 'bg-gray-500/90' };

const DISEASE_OPTIONS = ['all', 'Healthy', 'Mosaic Disease', 'Bacterial Blight', 'Brown Streak Disease', 'another'];

const toDateStr = (d) => d.toISOString().split('T')[0];
const getDefaultDates = () => {
    const to = new Date(), from = new Date();
    from.setDate(from.getDate() - 7);
    return { from: toDateStr(from), to: toDateStr(to) };
};
const resolveImgSrc = (raw) => {
    if (!raw) return null;
    return /^https?:\/\//i.test(raw) ? raw : `data:image/jpeg;base64,${raw}`;
};

/* ── Full-size modal ──────────────────────────────────────────── */
const FullModal = ({ log, onClose }) => {
    const src = resolveImgSrc(log.image_base64);
    const ds  = getDiseaseStyle(log.disease_name);
    const conf = log.confidence_score != null ? Math.round(log.confidence_score) : null;

    return (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
             onClick={onClose}>
            <div className="relative max-w-2xl w-full flex flex-col items-center gap-3"
                 onClick={e => e.stopPropagation()}>

                {/* close */}
                <button onClick={onClose}
                        className="absolute -top-10 right-0 text-white/70 hover:text-white text-sm transition-colors">
                    ✕ ปิด
                </button>

                {/* image */}
                {src ? (
                    <img src={src} alt={`log-${log.log_id}`}
                         className="w-full rounded-2xl shadow-2xl object-contain max-h-[75vh]" />
                ) : (
                    <div className="w-full h-64 rounded-2xl bg-gray-800 flex items-center justify-center text-gray-500">
                        ไม่มีรูปภาพ
                    </div>
                )}

                {/* meta strip */}
                <div className="w-full bg-white/10 backdrop-blur-sm rounded-xl px-5 py-3 flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-3">
                        <span className={`text-xs font-bold text-white px-3 py-1 rounded-full ${ds.badge}`}>
                            {log.disease_name || 'ไม่ระบุ'}
                        </span>
                        {conf !== null && (
                            <span className="text-xs text-white/80 font-medium">Confidence {conf}%</span>
                        )}
                    </div>
                    <div className="text-right">
                        <p className="text-xs text-white/60">Log #{log.log_id}</p>
                        <p className="text-xs text-white/80">
                            {new Date(log.created_at).toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'short' })}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

/* ── Image Card ───────────────────────────────────────────────── */
const LogCard = ({ log, onClick }) => {
    const [imgErr, setImgErr] = useState(false);
    const src  = resolveImgSrc(log.image_base64);
    const ds   = getDiseaseStyle(log.disease_name);
    const conf = log.confidence_score != null ? Math.round(log.confidence_score) : null;
    const confColor = conf === null ? '' : conf >= 80 ? 'text-green-300' : conf >= 50 ? 'text-amber-300' : 'text-red-300';

    return (
        <button onClick={onClick}
                className="group relative rounded-2xl overflow-hidden shadow-md hover:shadow-xl
                           transition-all duration-200 hover:-translate-y-1 bg-gray-100 aspect-square focus:outline-none">

            {/* image */}
            {src && !imgErr ? (
                <img src={src} alt={`log-${log.log_id}`}
                     onError={() => setImgErr(true)}
                     className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
            ) : (
                <div className="w-full h-full flex items-center justify-center bg-gray-200">
                    <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                </div>
            )}

            {/* top-right: confidence */}
            {conf !== null && (
                <div className="absolute top-2 right-2 bg-black/50 backdrop-blur-sm rounded-full px-2 py-0.5">
                    <span className={`text-xs font-bold ${confColor}`}>{conf}%</span>
                </div>
            )}

            {/* bottom overlay — slides up on hover */}
            <div className="absolute inset-x-0 bottom-0 translate-y-full group-hover:translate-y-0
                            transition-transform duration-200 ease-out
                            bg-gradient-to-t from-black/80 via-black/50 to-transparent
                            pt-8 pb-3 px-3">
                <span className={`inline-block text-xs font-bold text-white px-2.5 py-0.5 rounded-full mb-1 ${ds.badge}`}>
                    {log.disease_name || 'ไม่ระบุ'}
                </span>
                <p className="text-white/70 text-xs leading-tight">
                    {new Date(log.created_at).toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'short' })}
                </p>
            </div>

            {/* always-visible: disease name bottom-left (when not hovering) */}
            <div className="absolute bottom-2 left-2 group-hover:opacity-0 transition-opacity duration-150">
                <span className={`inline-flex items-center gap-1 text-xs font-bold text-white px-2 py-0.5 rounded-full ${ds.badge}`}>
                    <span className="w-1.5 h-1.5 rounded-full bg-white/70 shrink-0" />
                    {log.disease_name || 'ไม่ระบุ'}
                </span>
            </div>
        </button>
    );
};

/* ── Main Page ────────────────────────────────────────────────── */
export default function LegacyLogs() {
    const defaults = getDefaultDates();

    const [logs, setLogs]         = useState([]);
    const [loading, setLoading]   = useState(true);
    const [disease, setDisease]   = useState('all');
    const [dateFrom, setDateFrom] = useState(defaults.from);
    const [dateTo, setDateTo]     = useState(defaults.to);
    const [modalLog, setModalLog] = useState(null);
    const [page, setPage]         = useState(1);

    const PAGE_SIZE = 60;

    const fetchLogs = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (disease !== 'all') params.set('disease', disease);
            if (dateFrom) params.set('date_from', dateFrom);
            if (dateTo)   params.set('date_to', dateTo);
            const res = await adminApi.get(`/legacy-logs?${params}`);
            if (res.data.success) setLogs(res.data.data);
        } catch {
            setLogs([]);
        } finally {
            setLoading(false);
        }
    }, [disease, dateFrom, dateTo]);

    useEffect(() => { fetchLogs(); }, [fetchLogs]);
    useEffect(() => { setPage(1); }, [disease, dateFrom, dateTo]);

    const totalPages = Math.ceil(logs.length / PAGE_SIZE);
    const paged      = logs.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

    /* stats */
    const diseaseCounts = logs.reduce((acc, l) => {
        const k = l.disease_name || 'ไม่ระบุ';
        acc[k] = (acc[k] || 0) + 1;
        return acc;
    }, {});

    const isFiltered = disease !== 'all' || dateFrom !== defaults.from || dateTo !== defaults.to;

    return (
        <div className="max-w-screen-xl mx-auto px-4 py-8 space-y-6">

            {modalLog && <FullModal log={modalLog} onClose={() => setModalLog(null)} />}

            {/* Header */}
            <div className="flex items-start justify-between flex-wrap gap-3">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">รูปการวิเคราะห์โรค</h1>
                    <p className="text-sm text-gray-500 mt-0.5">
                        {loading ? 'กำลังโหลด...' : `${logs.length.toLocaleString()} รายการ`}
                    </p>
                </div>
            </div>

            {/* Stats */}
            {!loading && logs.length > 0 && (
                <div className="flex flex-wrap gap-2">
                    {Object.entries(diseaseCounts).sort((a, b) => b[1] - a[1]).map(([name, count]) => {
                        const ds = getDiseaseStyle(name);
                        return (
                            <button key={name}
                                    onClick={() => setDisease(disease === name ? 'all' : name)}
                                    className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-semibold transition-all
                                        ${disease === name ? `${ds.badge} text-white border-transparent shadow` : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'}`}>
                                <span className={`w-2 h-2 rounded-full ${ds.bg}`} />
                                {name}
                                <span className="font-bold">{count}</span>
                            </button>
                        );
                    })}
                </div>
            )}

            {/* Filters */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex flex-wrap gap-4 items-end">
                <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">วันที่เริ่มต้น</label>
                    <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
                           className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#006600]" />
                </div>
                <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">วันที่สิ้นสุด</label>
                    <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
                           className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#006600]" />
                </div>
                <div className="min-w-44">
                    <label className="block text-xs font-medium text-gray-500 mb-1">โรค</label>
                    <select value={disease} onChange={e => setDisease(e.target.value)}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#006600]">
                        {DISEASE_OPTIONS.map(d => (
                            <option key={d} value={d}>{d === 'all' ? 'ทุกโรค' : d}</option>
                        ))}
                    </select>
                </div>
                {isFiltered && (
                    <button onClick={() => { setDisease('all'); setDateFrom(defaults.from); setDateTo(defaults.to); }}
                            className="px-4 py-2 text-sm text-gray-500 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                        รีเซ็ต
                    </button>
                )}
            </div>

            {/* Grid */}
            {loading ? (
                <div className="flex flex-col items-center justify-center py-24 gap-3 text-gray-400">
                    <div className="w-10 h-10 border-2 border-[#006600] border-t-transparent rounded-full animate-spin" />
                    <p className="text-sm">กำลังโหลดรูปภาพ...</p>
                </div>
            ) : logs.length === 0 ? (
                <div className="text-center py-24 text-gray-400">
                    <svg className="w-16 h-16 mx-auto mb-3 text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1}
                              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <p className="text-sm">ไม่พบรูปภาพในช่วงวันที่นี้</p>
                </div>
            ) : (
                <>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                        {paged.map(log => (
                            <LogCard key={log.log_id} log={log} onClick={() => setModalLog(log)} />
                        ))}
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="flex items-center justify-between pt-2">
                            <p className="text-xs text-gray-500">
                                หน้า {page} / {totalPages} ({logs.length.toLocaleString()} รูป)
                            </p>
                            <div className="flex items-center gap-1">
                                <button onClick={() => setPage(p => Math.max(1, p - 1))}
                                        disabled={page === 1}
                                        className="px-3 py-1.5 text-xs rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-white bg-white shadow-sm transition-colors">
                                    ←
                                </button>
                                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                    const p = Math.max(1, Math.min(page - 2, totalPages - 4)) + i;
                                    return (
                                        <button key={p} onClick={() => setPage(p)}
                                                className={`w-8 h-8 text-xs rounded-lg border transition-colors shadow-sm ${
                                                    p === page ? 'bg-[#006600] text-white border-[#006600]' : 'bg-white border-gray-200 hover:bg-gray-50'
                                                }`}>
                                            {p}
                                        </button>
                                    );
                                })}
                                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                        disabled={page === totalPages}
                                        className="px-3 py-1.5 text-xs rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-white bg-white shadow-sm transition-colors">
                                    →
                                </button>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
