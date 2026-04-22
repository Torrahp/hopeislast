import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import adminApi from '../services/adminApi';
import { MdArrowDropDown, MdClose } from 'react-icons/md';

/* ── Colour maps ─────────────────────────────────────────────── */
const DISEASE_STYLE = {
    'healthy':              { text: 'text-emerald-700', bg: 'bg-emerald-50',  dot: 'bg-emerald-500', border: 'border-emerald-200' },
    'mosaic disease':       { text: 'text-red-700',     bg: 'bg-red-50',      dot: 'bg-red-500',     border: 'border-red-200'     },
    'bacterial blight':     { text: 'text-amber-700',   bg: 'bg-amber-50',    dot: 'bg-amber-500',   border: 'border-amber-200'   },
    'brown streak disease': { text: 'text-violet-700',  bg: 'bg-violet-50',   dot: 'bg-violet-500',  border: 'border-violet-200'  },
};
const getDiseaseStyle = (name) =>
    DISEASE_STYLE[name?.toLowerCase()] ?? { text: 'text-gray-600', bg: 'bg-gray-50', dot: 'bg-gray-400', border: 'border-gray-200' };

/* ── Small helpers ───────────────────────────────────────────── */
const TagList = ({ items, chipCls }) => {
    if (!items?.length) return <span className="text-xs text-gray-400">—</span>;
    return (
        <div className="flex flex-wrap gap-1.5">
            {items.map((item, i) => (
                <span key={i} className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${chipCls}`}>
                    {item}
                </span>
            ))}
        </div>
    );
};

const SeverityBar = ({ value }) => (
    <div className="flex items-center gap-1">
        {[1,2,3,4,5].map(n => (
            <span key={n} className={`w-2.5 h-2.5 rounded-sm ${n <= value ? 'bg-red-500' : 'bg-gray-200'}`} />
        ))}
        <span className="text-xs text-gray-500 ml-1">{value}/5</span>
    </div>
);

/* ── Insight Card ────────────────────────────────────────────── */
const InsightCard = ({ rec }) => {
    const diseases   = rec.diseases   ?? [];
    const adjPlants  = rec.adj_plants ?? [];
    const weeds      = rec.weeds_list ?? [];
    const herbs      = rec.herbs_list ?? [];

    const hasFactors = adjPlants.length || weeds.length || herbs.length || rec.soil_type || rec.plant_species;

    return (
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
            {/* Card header */}
            <div className="flex items-center justify-between px-5 py-3 bg-gray-50 border-b border-gray-100">
                <div className="flex items-center gap-3">
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                        วันที่สำรวจ
                    </span>
                    <span className="text-sm font-bold text-gray-800">
                        {new Date(rec.survey_date).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })}
                    </span>
                </div>
                <span className="text-xs text-gray-400">Record #{rec.record_id}</span>
            </div>

            <div className="p-5">
                {/* ── Two-column insight layout ── */}
                <div className="flex flex-col lg:flex-row gap-4">

                    {/* LEFT — Disease findings */}
                    <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-[#006600] uppercase tracking-wide mb-3">
                            โรคที่ตรวจพบ
                        </p>

                        {diseases.length === 0 ? (
                            <p className="text-xs text-gray-400">ไม่มีข้อมูล</p>
                        ) : (
                            <div className="space-y-2">
                                {diseases.map((dis, i) => {
                                    const ds = getDiseaseStyle(dis.disease_name);
                                    return (
                                        <div key={i} className={`rounded-lg border p-3 ${ds.bg} ${ds.border}`}>
                                            <div className="flex items-center gap-2 mb-2">
                                                <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${ds.dot}`} />
                                                <span className={`text-sm font-bold ${ds.text}`}>{dis.disease_name}</span>
                                            </div>
                                            <div className="grid grid-cols-3 gap-2 text-xs text-gray-600">
                                                <div>
                                                    <p className="text-gray-400 mb-0.5">จำนวนต้น</p>
                                                    <p className="font-semibold">{dis.total_plants} ต้น</p>
                                                </div>
                                                <div>
                                                    <p className="text-gray-400 mb-0.5">ความรุนแรงเฉลี่ย</p>
                                                    <SeverityBar value={Math.round(dis.avg_severity)} />
                                                </div>
                                                <div>
                                                    <p className="text-gray-400 mb-0.5">AI Confidence</p>
                                                    <p className="font-semibold">{dis.avg_confidence ?? '—'}%</p>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Connector arrow (desktop only) */}
                    {hasFactors && (
                        <div className="hidden lg:flex flex-col items-center justify-center px-2 gap-1 shrink-0">
                            <div className="h-12 w-px bg-gray-200" />
                            <svg className="w-5 h-5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                            </svg>
                            <div className="h-12 w-px bg-gray-200" />
                        </div>
                    )}

                    {/* RIGHT — Environmental / associated factors */}
                    {hasFactors && (
                        <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-3">
                                ปัจจัยแวดล้อมที่เกี่ยวข้อง
                            </p>

                            <div className="space-y-3">
                                {/* Plot context */}
                                <div className="flex flex-wrap gap-3">
                                    {rec.plant_species && (
                                        <div className="text-xs bg-white border border-gray-200 rounded-lg px-3 py-2">
                                            <span className="text-gray-400">พืชหลัก · </span>
                                            <span className="font-semibold text-gray-700">{rec.plant_species}</span>
                                        </div>
                                    )}
                                    {rec.soil_type && (
                                        <div className="text-xs bg-white border border-gray-200 rounded-lg px-3 py-2">
                                            <span className="text-gray-400">ดิน · </span>
                                            <span className="font-semibold text-gray-700">{rec.soil_type}</span>
                                        </div>
                                    )}
                                    {rec.plant_age && (
                                        <div className="text-xs bg-white border border-gray-200 rounded-lg px-3 py-2">
                                            <span className="text-gray-400">วันเริ่มปลูก · </span>
                                            <span className="font-semibold text-gray-700">
                                                {new Date(rec.plant_age).toLocaleDateString('th-TH')}
                                            </span>
                                        </div>
                                    )}
                                </div>

                                {/* Adjacent plants */}
                                {adjPlants.length > 0 && (
                                    <div>
                                        <p className="text-xs text-gray-400 mb-1.5">พืชข้างเคียง</p>
                                        <TagList items={adjPlants} chipCls="bg-green-100 text-green-800" />
                                    </div>
                                )}

                                {/* Weeds */}
                                {weeds.length > 0 && (
                                    <div>
                                        <p className="text-xs text-gray-400 mb-1.5">วัชพืช</p>
                                        <TagList items={weeds} chipCls="bg-amber-100 text-amber-800" />
                                    </div>
                                )}

                                {/* Herbicides */}
                                {herbs.length > 0 && (
                                    <div>
                                        <p className="text-xs text-gray-400 mb-1.5">สารเคมีที่ใช้</p>
                                        <TagList items={herbs} chipCls="bg-blue-100 text-blue-800" />
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* View images button */}
                <div className="mt-4 pt-4 border-t border-gray-100">
                    <button
                        onClick={() => rec._onViewImages(rec.record_id)}
                        className="inline-flex items-center gap-2 bg-[#006600] hover:bg-[#005500] text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors"
                    >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        ดูรูปภาพ 
                    </button>
                </div>
            </div>
        </div>
    );
};

/* ── Survey image modal ─────────────────────────────────────── */
const SurveyModal = ({ images, onClose }) => (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                <div>
                    <h3 className="font-bold text-gray-800 text-lg">รูปภาพและผลการวิเคราะห์</h3>
                    <p className="text-xs text-gray-400 mt-0.5">เปรียบเทียบผล Expert Label vs AI Prediction</p>
                </div>
                <button onClick={onClose} className="text-gray-400 hover:text-gray-700 p-1 transition-colors">
                    <MdClose size={22} />
                </button>
            </div>
            <div className="overflow-y-auto p-6">
                {images.length === 0 ? (
                    <p className="text-center text-gray-400 py-12">ไม่พบข้อมูลรูปภาพ</p>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                        {images.map((img, i) => {
                            const expertStyle = getDiseaseStyle(img.disease_name);
                            const aiStyle     = getDiseaseStyle(img.ai_predicted_disease);
                            const hasBoth = img.disease_name && img.ai_predicted_disease;
                            const match   = hasBoth && img.disease_name?.toLowerCase() === img.ai_predicted_disease?.toLowerCase();
                            return (
                                <div key={i} className={`rounded-xl border-2 overflow-hidden shadow-sm ${hasBoth ? (match ? 'border-green-300' : 'border-red-300') : 'border-gray-200'}`}>
                                    <div className="relative h-48 bg-gray-100">
                                        <img src={`http://localhost:5000/uploads/${img.image_path}`} alt="survey" className="w-full h-full object-cover" />
                                        <span className="absolute bottom-2 right-2 bg-black/70 text-white text-xs font-semibold px-2 py-0.5 rounded-full">
                                            {(img.confidence || 0).toFixed(1)}%
                                        </span>
                                    </div>
                                    <div className="p-4 space-y-2.5 bg-white">
                                        <div>
                                            <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Expert Label</p>
                                            <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${expertStyle.bg} ${expertStyle.text}`}>
                                                <span className={`w-2 h-2 rounded-full ${expertStyle.dot}`} />
                                                {img.disease_name || '—'}
                                            </div>
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">AI Prediction</p>
                                            {img.ai_predicted_disease ? (
                                                <div className="flex items-center gap-2">
                                                    <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${aiStyle.bg} ${aiStyle.text}`}>
                                                        <span className={`w-2 h-2 rounded-full ${aiStyle.dot}`} />
                                                        {img.ai_predicted_disease}
                                                    </div>
                                                    {hasBoth && (
                                                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${match ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                            {match ? '✓ ถูกต้อง' : '✗ ผิดพลาด'}
                                                        </span>
                                                    )}
                                                </div>
                                            ) : (
                                                <span className="text-xs text-gray-400">ไม่มีข้อมูล</span>
                                            )}
                                        </div>
                                        <div className="flex items-center justify-between text-xs text-gray-500">
                                            <span>ความรุนแรง</span>
                                            <SeverityBar value={img.severity ?? 0} />
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    </div>
);

/* ── Searchable dropdown ─────────────────────────────────────── */
const SearchableSelect = ({ name, value, options, placeholder = 'ค้นหา...', onChange, disabled = false, activeCls = '', baseCls = '' }) => {
    const [query, setQuery] = useState('');
    const [open, setOpen]   = useState(false);
    const [pos, setPos]     = useState({ top: 0, left: 0, width: 0 });
    const wrapRef           = useRef(null);

    const calcPos = () => {
        if (!wrapRef.current) return;
        const r = wrapRef.current.getBoundingClientRect();
        setPos({ top: r.bottom + window.scrollY + 4, left: r.left + window.scrollX, width: r.width });
    };

    useEffect(() => {
        const close = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false); };
        document.addEventListener('mousedown', close);
        return () => document.removeEventListener('mousedown', close);
    }, []);

    useEffect(() => {
        if (!open) return;
        window.addEventListener('scroll', calcPos, true);
        window.addEventListener('resize', calcPos);
        return () => { window.removeEventListener('scroll', calcPos, true); window.removeEventListener('resize', calcPos); };
    }, [open]);

    const allFiltered = options.filter(o => o.toLowerCase().includes(query.toLowerCase()));
    const filtered    = allFiltered.slice(0, 10);

    const select = (v) => { onChange({ target: { name, value: v } }); setOpen(false); setQuery(''); };

    const openMenu = () => { calcPos(); setOpen(true); setQuery(''); };

    return (
        <div ref={wrapRef}>
            <div className={`flex items-center border rounded-xl px-3 py-2.5 transition-all ${disabled ? 'opacity-40 cursor-not-allowed bg-gray-100 border-gray-200' : open ? 'border-[#006600] ring-2 ring-green-100 bg-white' : value ? activeCls : baseCls}`}>
                <input
                    type="text"
                    value={open ? query : (value || '')}
                    placeholder={disabled ? '— เลือกระดับก่อนหน้า' : placeholder}
                    disabled={disabled}
                    onFocus={openMenu}
                    onChange={e => setQuery(e.target.value)}
                    className="flex-1 text-sm bg-transparent outline-none min-w-0 placeholder:text-gray-400"
                />
                {value && !disabled ? (
                    <button onMouseDown={e => { e.preventDefault(); select(''); }} className="text-gray-300 hover:text-red-400 transition-colors ml-1 shrink-0">
                        <MdClose size={14} />
                    </button>
                ) : (
                    <MdArrowDropDown size={18} className={`text-gray-400 shrink-0 transition-transform duration-150 ${open ? 'rotate-180' : ''}`} />
                )}
            </div>

            {open && !disabled && createPortal(
                <ul style={{ position: 'absolute', top: pos.top, left: pos.left, width: pos.width, zIndex: 9999 }}
                    className="bg-white border border-gray-200 rounded-xl shadow-xl overflow-y-auto max-h-56">
                    <li onMouseDown={() => select('')}
                        className={`px-3 py-2 text-sm cursor-pointer ${!value ? 'bg-[#e6f2e6] text-[#006600] font-semibold' : 'text-gray-400 hover:bg-gray-50'}`}>
                        ทั้งหมด
                    </li>
                    {filtered.length === 0
                        ? <li className="px-3 py-2 text-sm text-gray-400 italic">ไม่พบ "{query}"</li>
                        : filtered.map(o => (
                            <li key={o} onMouseDown={() => select(o)}
                                className={`px-3 py-2 text-sm cursor-pointer ${value === o ? 'bg-[#e6f2e6] text-[#006600] font-semibold' : 'text-gray-700 hover:bg-green-50'}`}>
                                {o}
                            </li>
                        ))
                    }
                    {allFiltered.length > 10 && (
                        <li className="px-3 py-2 text-xs text-gray-400 bg-gray-50 border-t border-gray-100">
                            พิมพ์เพื่อค้นหาเพิ่มเติม ({allFiltered.length} รายการ)
                        </li>
                    )}
                </ul>,
                document.body
            )}
        </div>
    );
};

/* ── Main page ───────────────────────────────────────────────── */
const PlotManagement = () => {
    const [plots, setPlots]                     = useState([]);
    const [selectedSurveys, setSelectedSurveys] = useState(null);
    const [expandedPlot, setExpandedPlot]       = useState(null);
    const [recordDetails, setRecordDetails]     = useState({});
    const [loadingRecords, setLoadingRecords]   = useState(false);
    const [loading, setLoading]                 = useState(true);
    const todayStr    = new Date().toISOString().split('T')[0];
    const oneMonthAgo = new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString().split('T')[0];
    const defaultFilters = { search: '', plotName: '', province: '', district: '', locality: '', disease: '', adjPlant: '', weed: '', herbicide: '', dateFrom: oneMonthAgo, dateTo: todayStr };

    const [filters, setFilters]       = useState(defaultFilters);
    const [filterOpen, setFilterOpen] = useState(true);

    const resetFilters = () => setFilters(defaultFilters);

    const fetchPlots = async () => {
        try {
            const res = await adminApi.get('/all');
            if (res.data.success) setPlots(res.data.data);
        } catch (err) {
            console.error('Error fetching plots:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchPlots(); }, []);

    const viewSurveys = async (recordId) => {
        try {
            const res = await adminApi.get(`/survey-images/${recordId}`);
            if (res.data.success) setSelectedSurveys(res.data.data);
        } catch (err) {
            alert('ไม่สามารถดึงรูปภาพได้', err);
        }
    };

    const toggleExpand = async (plotId) => {
        if (expandedPlot === plotId) { setExpandedPlot(null); return; }
        setExpandedPlot(plotId);
        if (!recordDetails[plotId]) {
            setLoadingRecords(true);
            try {
                const res = await adminApi.get(`/plot-records/${plotId}`);
                if (res.data.success)
                    setRecordDetails(prev => ({ ...prev, [plotId]: res.data.data }));
            } catch (err) {
                console.error('Error fetching records:', err);
            } finally {
                setLoadingRecords(false);
            }
        }
    };

    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        setFilters(prev => {
            const next = { ...prev, [name]: value };
            if (name === 'province') { next.district = ''; next.locality = ''; }
            if (name === 'district') { next.locality = ''; }
            return next;
        });
    };

    const filteredPlots = plots.filter(plot => {
        const matchesOwner     = plot.owner_name?.toLowerCase().includes(filters.search.toLowerCase()) || plot.plot_id.toString().includes(filters.search);
        const matchesPlotName  = plot.plot_name?.toLowerCase().includes(filters.plotName.toLowerCase());
        const matchesProvince  = filters.province  === '' || plot.province  === filters.province;
        const matchesDistrict  = filters.district  === '' || plot.district  === filters.district;
        const matchesLocality  = filters.locality  === '' || plot.locality  === filters.locality;
        const matchesDisease   = filters.disease   === '' || (plot.latest_diseases ?? []).some(d => d?.toLowerCase() === filters.disease.toLowerCase());
        const matchesAdjPlant  = filters.adjPlant  === '' || (plot.all_adj_plants  ?? []).some(v => v?.toLowerCase() === filters.adjPlant.toLowerCase());
        const matchesWeed      = filters.weed      === '' || (plot.all_weeds       ?? []).some(v => v?.toLowerCase() === filters.weed.toLowerCase());
        const matchesHerbicide = filters.herbicide === '' || (plot.all_herbicides  ?? []).some(v => v?.toLowerCase() === filters.herbicide.toLowerCase());
        const plotDate = plot.latest_survey_date ? new Date(plot.latest_survey_date) : null;
        const matchesDateFrom  = !filters.dateFrom || (plotDate && plotDate >= new Date(filters.dateFrom));
        const matchesDateTo    = !filters.dateTo   || (plotDate && plotDate <= new Date(filters.dateTo));
        return matchesOwner && matchesPlotName && matchesProvince && matchesDistrict && matchesLocality && matchesDisease && matchesAdjPlant && matchesWeed && matchesHerbicide && matchesDateFrom && matchesDateTo;
    });

    const uniqueProvinces  = [...new Set(plots.map(p => p.province))].filter(Boolean).sort();
    const uniqueDistricts  = [...new Set(plots.filter(p => !filters.province || p.province === filters.province).map(p => p.district))].filter(Boolean).sort();
    const uniqueLocalities = [...new Set(plots.filter(p => (!filters.province || p.province === filters.province) && (!filters.district || p.district === filters.district)).map(p => p.locality))].filter(Boolean).sort();
    const uniqueDiseases   = [...new Set(plots.flatMap(p => p.latest_diseases ?? []))].filter(Boolean).sort();
    const uniqueAdjPlants  = [...new Set(plots.flatMap(p => p.all_adj_plants  ?? []))].filter(Boolean).sort();
    const uniqueWeeds      = [...new Set(plots.flatMap(p => p.all_weeds       ?? []))].filter(Boolean).sort();
    const uniqueHerbicides = [...new Set(plots.flatMap(p => p.all_herbicides  ?? []))].filter(Boolean).sort();

    return (
        <div className="min-h-screen bg-[#f3f7f3] py-8 px-4">
            <div className="max-w-screen-xl mx-auto">

                {/* Page header */}
                <div className="mb-5">
                    <h1 className="text-2xl font-bold text-[#006600]">การจัดการแปลงและผลสำรวจ</h1>
                    <p className="text-gray-500 text-sm mt-1">Kasetsart University · Munbot Plant Disease System</p>
                </div>

                {/* Filter section */}
                {(() => {
                    const LABELS = { search: 'ผู้บันทึก', plotName: 'ชื่อแปลง', province: 'จังหวัด', district: 'อำเภอ', locality: 'ตำบล', disease: 'ชนิดโรค', adjPlant: 'พืชใกล้เคียง', weed: 'ศัตรูพืช', herbicide: 'สารเคมี', dateFrom: 'บันทึกตั้งแต่', dateTo: 'บันทึกถึง' };
                    const activeChips = Object.entries(filters).filter(([k, v]) => v !== defaultFilters[k]);
                    const hasActive   = activeChips.length > 0;
                    const removeFilter = (k) => setFilters(prev => ({ ...prev, [k]: defaultFilters[k] }));

                    const base = "w-full text-sm rounded-xl px-3 py-2.5 border outline-none transition-all focus:ring-2 focus:ring-green-100";
                    const fCls = (k) => `${base} ${filters[k] !== defaultFilters[k] ? 'border-[#006600]/60 bg-[#f4fbf4] text-gray-800 focus:border-[#006600]' : 'border-gray-200 bg-gray-50 text-gray-700 focus:border-[#006600] focus:bg-white'}`;

                    const SectionDivider = ({ icon, label }) => (
                        <div className="flex items-center gap-2 mt-5 mb-3">
                            <span className="text-base leading-none">{icon}</span>
                            <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">{label}</span>
                            <div className="flex-1 h-px bg-gray-100" />
                        </div>
                    );

                    const Field = ({ fkey, label, children }) => (
                        <div>
                            <label className={`block text-xs font-semibold mb-1.5 transition-colors ${filters[fkey] !== defaultFilters[fkey] ? 'text-[#006600]' : 'text-gray-400'}`}>
                                {label}
                            </label>
                            {children}
                        </div>
                    );

                    return (
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 mb-4 overflow-hidden">

                            {/* ── Header / toggle ── */}
                            <button onClick={() => setFilterOpen(o => !o)}
                                className="w-full flex items-center justify-between px-6 py-4 hover:bg-gray-50/60 transition-colors text-left">
                                <div className="flex items-center gap-2.5">
                                    <svg className="w-4 h-4 text-[#006600] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L13 13.414V19a1 1 0 01-.553.894l-4 2A1 1 0 017 21v-7.586L3.293 6.707A1 1 0 013 6V4z" />
                                    </svg>
                                    <span className="text-sm font-semibold text-gray-700">ตัวกรอง</span>
                                    {hasActive && (
                                        <span className="text-xs bg-[#e6f2e6] text-[#006600] font-bold px-2.5 py-0.5 rounded-full">
                                            {activeChips.length} ใช้งานอยู่
                                        </span>
                                    )}
                                </div>
                                <div className="flex items-center gap-4">
                                    <span className="text-sm text-gray-400 hidden sm:block">
                                        แสดง <span className={`font-bold ${filteredPlots.length === 0 && hasActive ? 'text-red-500' : 'text-[#006600]'}`}>{filteredPlots.length}</span> จาก {plots.length} แปลง
                                    </span>
                                    <MdArrowDropDown size={22} className="text-gray-400"
                                        style={{ transform: filterOpen ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.2s' }} />
                                </div>
                            </button>

                            {/* ── Body ── */}
                            {filterOpen && (
                                <div className="px-6 pb-5 border-t border-gray-50">

                                    {/* Location */}
                                    <SectionDivider icon="📍" label="ที่ตั้ง" />
                                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                                        <Field fkey="search" label="ผู้บันทึก">
                                            <input type="text" name="search" placeholder="ค้นหาชื่อ..." value={filters.search} onChange={handleFilterChange} className={fCls('search')} />
                                        </Field>
                                        <Field fkey="plotName" label="ชื่อแปลง">
                                            <input type="text" name="plotName" placeholder="ค้นหาชื่อ..." value={filters.plotName} onChange={handleFilterChange} className={fCls('plotName')} />
                                        </Field>
                                        <Field fkey="province" label="จังหวัด">
                                            <SearchableSelect name="province" value={filters.province} options={uniqueProvinces} placeholder="ค้นหาจังหวัด..." onChange={handleFilterChange} activeCls="border-[#006600]/60 bg-[#f4fbf4]" baseCls="border-gray-200 bg-gray-50" />
                                        </Field>
                                        <Field fkey="district" label="อำเภอ">
                                            <SearchableSelect name="district" value={filters.district} options={uniqueDistricts} placeholder="ค้นหาอำเภอ..." onChange={handleFilterChange} disabled={uniqueDistricts.length === 0} activeCls="border-[#006600]/60 bg-[#f4fbf4]" baseCls="border-gray-200 bg-gray-50" />
                                        </Field>
                                        <Field fkey="locality" label="ตำบล">
                                            <SearchableSelect name="locality" value={filters.locality} options={uniqueLocalities} placeholder="ค้นหาตำบล..." onChange={handleFilterChange} disabled={uniqueLocalities.length === 0} activeCls="border-[#006600]/60 bg-[#f4fbf4]" baseCls="border-gray-200 bg-gray-50" />
                                        </Field>
                                    </div>

                                    {/* Disease & environment */}
                                    <SectionDivider icon="🌿" label="โรคและสิ่งแวดล้อม" />
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                        <Field fkey="disease" label="ชนิดโรค">
                                            <SearchableSelect name="disease" value={filters.disease} options={uniqueDiseases} placeholder="ค้นหาโรค..." onChange={handleFilterChange} activeCls="border-[#006600]/60 bg-[#f4fbf4]" baseCls="border-gray-200 bg-gray-50" />
                                        </Field>
                                        <Field fkey="adjPlant" label="พืชใกล้เคียง">
                                            <SearchableSelect name="adjPlant" value={filters.adjPlant} options={uniqueAdjPlants} placeholder="ค้นหาพืช..." onChange={handleFilterChange} activeCls="border-[#006600]/60 bg-[#f4fbf4]" baseCls="border-gray-200 bg-gray-50" />
                                        </Field>
                                        <Field fkey="weed" label="ศัตรูพืช / วัชพืช">
                                            <SearchableSelect name="weed" value={filters.weed} options={uniqueWeeds} placeholder="ค้นหาศัตรูพืช..." onChange={handleFilterChange} activeCls="border-[#006600]/60 bg-[#f4fbf4]" baseCls="border-gray-200 bg-gray-50" />
                                        </Field>
                                        <Field fkey="herbicide" label="สารเคมี">
                                            <SearchableSelect name="herbicide" value={filters.herbicide} options={uniqueHerbicides} placeholder="ค้นหาสารเคมี..." onChange={handleFilterChange} activeCls="border-[#006600]/60 bg-[#f4fbf4]" baseCls="border-gray-200 bg-gray-50" />
                                        </Field>
                                    </div>

                                    {/* Date range */}
                                    <SectionDivider icon="📅" label="วันที่บันทึกล่าสุด" />
                                    <div className={`inline-flex items-center gap-2 border rounded-xl px-4 py-2 transition-all ${(filters.dateFrom !== defaultFilters.dateFrom || filters.dateTo !== defaultFilters.dateTo) ? 'border-[#006600]/60 bg-[#f4fbf4]' : 'border-gray-200 bg-gray-50'}`}>
                                        <svg className="w-3.5 h-3.5 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                        </svg>
                                        <input type="date" name="dateFrom" value={filters.dateFrom} onChange={handleFilterChange}
                                            className="text-sm bg-transparent border-none outline-none text-gray-700" />
                                        <span className="text-gray-300 font-light px-1">→</span>
                                        <input type="date" name="dateTo" value={filters.dateTo} onChange={handleFilterChange}
                                            className="text-sm bg-transparent border-none outline-none text-gray-700" />
                                    </div>

                                    {/* Active filter chips */}
                                    {hasActive && (
                                        <div className="mt-5 pt-4 border-t border-gray-100">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className="text-xs text-gray-400 font-medium shrink-0">กรองด้วย:</span>
                                                {activeChips.map(([k, v]) => (
                                                    <button key={k} onClick={() => removeFilter(k)}
                                                        className="group flex items-center gap-1.5 text-xs bg-[#e6f2e6] text-[#005500] px-2.5 py-1 rounded-full font-medium hover:bg-red-50 hover:text-red-600 transition-colors">
                                                        <span className="text-[#006600]/60 group-hover:text-red-400">{LABELS[k]}:</span>
                                                        <span>{v}</span>
                                                        <MdClose size={11} className="opacity-50 group-hover:opacity-100" />
                                                    </button>
                                                ))}
                                                <button onClick={resetFilters}
                                                    className="text-xs text-gray-400 hover:text-red-500 underline underline-offset-2 transition-colors ml-1">
                                                    ล้างทั้งหมด
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Collapsed state */}
                            {!filterOpen && (
                                <div className="px-6 pb-3 pt-0 border-t border-gray-50 flex items-center justify-between flex-wrap gap-2">
                                    <span className="text-sm text-gray-400 sm:hidden">
                                        แสดง <span className="font-bold text-[#006600]">{filteredPlots.length}</span> จาก {plots.length} แปลง
                                    </span>
                                    {hasActive ? (
                                        <div className="flex flex-wrap gap-1.5 pt-2">
                                            {activeChips.slice(0, 4).map(([k, v]) => (
                                                <span key={k} className="text-xs bg-[#e6f2e6] text-[#006600] px-2.5 py-1 rounded-full font-medium">
                                                    {LABELS[k]}: {v}
                                                </span>
                                            ))}
                                            {activeChips.length > 4 && (
                                                <span className="text-xs text-gray-400 px-2 py-1">+{activeChips.length - 4} อื่นๆ</span>
                                            )}
                                        </div>
                                    ) : (
                                        <span className="text-xs text-gray-400 pt-2">ไม่มีตัวกรอง</span>
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })()}

                <div className="bg-white rounded-2xl shadow-sm border border-gray-100">

                    {/* Toolbar */}
                    <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100">
                        <span className="text-gray-800 font-semibold">แปลงทั้งหมด</span>
                        <span className="bg-[#e6f2e6] text-[#006600] text-xs font-bold px-2.5 py-1 rounded-full">
                            {plots.length} แปลง
                        </span>
                    </div>

                    {/* Table */}
                    {loading ? (
                        <div className="py-20 text-center text-gray-400 text-sm">กำลังโหลดข้อมูล...</div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
                                        <th className="text-left px-6 py-3 font-semibold">ชื่อแปลง / ID</th>
                                        <th className="text-left px-6 py-3 font-semibold">ผู้บันทึก / ที่ตั้ง</th>
                                        <th className="text-left px-6 py-3 font-semibold">ประเภทดิน / เนื้อที่</th>
                                        <th className="text-center px-6 py-3 font-semibold">จำนวนสำรวจ</th>
                                        <th className="text-center px-6 py-3 font-semibold">Insight</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {filteredPlots.length === 0 ? (
                                        <tr>
                                            <td colSpan="5" className="py-16 text-center text-gray-400">ไม่พบข้อมูล</td>
                                        </tr>
                                    ) : filteredPlots.map(plot => (
                                        <React.Fragment key={plot.plot_id}>
                                            <tr className="hover:bg-gray-50 transition-colors">
                                                <td className="px-6 py-4">
                                                    <p className="font-semibold text-gray-800">{plot.plot_name}</p>
                                                    <p className="text-xs text-gray-400 font-mono mt-0.5">ID: {plot.plot_id}</p>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <p className="font-medium text-gray-700">{plot.owner_name}</p>
                                                    <p className="text-xs text-gray-400 mt-0.5">
                                                        {[plot.province, plot.district, plot.locality].filter(Boolean).join(', ')}
                                                    </p>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex flex-col gap-1.5">
                                                        {plot.soil_type ? (
                                                            <span className="text-xs bg-amber-50 text-amber-700 border border-amber-200 px-2.5 py-1 rounded-full font-medium w-fit">
                                                                {plot.soil_type}
                                                            </span>
                                                        ) : (
                                                            <span className="text-xs text-gray-400">—</span>
                                                        )}
                                                        {plot.space ? (
                                                            <span className="text-xs text-gray-500">{plot.space} ไร่</span>
                                                        ) : null}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <span className="bg-blue-50 text-blue-700 text-xs font-semibold px-3 py-1 rounded-full">
                                                        {plot.survey_count} ครั้ง
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <button
                                                        onClick={() => toggleExpand(plot.plot_id)}
                                                        className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                                                            expandedPlot === plot.plot_id
                                                                ? 'bg-[#006600] text-white border-[#006600]'
                                                                : 'bg-white text-gray-600 border-gray-300 hover:border-[#006600] hover:text-[#006600]'
                                                        }`}
                                                    >
                                                        ดู Insight
                                                        <MdArrowDropDown size={16}
                                                            style={{ transform: expandedPlot === plot.plot_id ? 'rotate(180deg)' : 'rotate(0)', transition: '0.25s' }}
                                                        />
                                                    </button>
                                                </td>
                                            </tr>

                                            {/* Expanded insight panel */}
                                            {expandedPlot === plot.plot_id && (
                                                <tr>
                                                    <td colSpan="5" className="bg-[#f8fbf8] px-6 py-5">

                                                        {/* Panel header */}
                                                        <div className="flex items-center gap-2 mb-4">
                                                            <span className="w-1 h-5 bg-[#006600] rounded-full" />
                                                            <h4 className="text-sm font-bold text-[#006600]">
                                                                Disease–Environment Insight · {plot.plot_name}
                                                            </h4>
                                                            {plot.soil_type && (
                                                                <span className="ml-2 text-xs bg-amber-50 text-amber-700 border border-amber-200 px-2.5 py-0.5 rounded-full">
                                                                    ดิน: {plot.soil_type}
                                                                </span>
                                                            )}
                                                        </div>

                                                        {/* Disease Timeline */}
                                                        {(plot.disease_timeline ?? []).length > 0 && (
                                                            <div className="mb-4 p-4 bg-white rounded-xl border border-gray-200">
                                                                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
                                                                    ประวัติการระบาดของโรค
                                                                </p>
                                                                <div className="space-y-2">
                                                                    {plot.disease_timeline.map((dt, i) => {
                                                                        const ds = getDiseaseStyle(dt.disease_name);
                                                                        const fmt = d => new Date(d).toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' });
                                                                        const isSameDay = dt.first_seen === dt.last_seen;
                                                                        return (
                                                                            <div key={i} className={`flex items-center justify-between px-3 py-2 rounded-lg border ${ds.bg} ${ds.border}`}>
                                                                                <div className="flex items-center gap-2">
                                                                                    <span className={`w-2 h-2 rounded-full shrink-0 ${ds.dot}`} />
                                                                                    <span className={`text-xs font-semibold ${ds.text}`}>{dt.disease_name}</span>
                                                                                </div>
                                                                                <div className="flex items-center gap-2 text-xs text-gray-500">
                                                                                    <span>เริ่ม <span className="font-medium text-gray-700">{fmt(dt.first_seen)}</span></span>
                                                                                    {!isSameDay && (
                                                                                        <>
                                                                                            <span className="text-gray-300">→</span>
                                                                                            <span>ล่าสุด <span className="font-medium text-gray-700">{fmt(dt.last_seen)}</span></span>
                                                                                        </>
                                                                                    )}
                                                                                </div>
                                                                            </div>
                                                                        );
                                                                    })}
                                                                </div>
                                                            </div>
                                                        )}

                                                        {loadingRecords ? (
                                                            <p className="text-gray-400 text-sm">กำลังโหลด...</p>
                                                        ) : (recordDetails[plot.plot_id] || []).length > 0 ? (
                                                            <div className="space-y-4">
                                                                {recordDetails[plot.plot_id].map(rec => (
                                                                    <InsightCard
                                                                        key={rec.record_id}
                                                                        rec={{ ...rec, _onViewImages: viewSurveys }}
                                                                    />
                                                                ))}
                                                            </div>
                                                        ) : (
                                                            <p className="text-gray-400 text-sm text-center py-8">
                                                                ยังไม่มีบันทึกการสำรวจในระบบ
                                                            </p>
                                                        )}
                                                    </td>
                                                </tr>
                                            )}
                                        </React.Fragment>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            {/* Modal */}
            {selectedSurveys && (
                <SurveyModal images={selectedSurveys} onClose={() => setSelectedSurveys(null)} />
            )}
        </div>
    );
};

export default PlotManagement;
