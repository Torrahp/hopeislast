import React, { useState, useEffect, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import axios from 'axios';
import L from 'leaflet';

import 'leaflet/dist/leaflet.css';

import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

import {
    HiOutlineMapPin,
    HiOutlineCalendarDays,
    HiOutlineFunnel,
    HiOutlineChevronDown,
    HiOutlineChartBar,
} from 'react-icons/hi2';

let DefaultIcon = L.icon({
    iconUrl: markerIcon,
    shadowUrl: markerShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

const getDiseaseIcon = (diseaseName) => {
    let color = "#64748b";
    switch (diseaseName) {
        case "Healthy": color = "#10b981"; break;
        case "Mosaic Disease": color = "#ef4444"; break;
        case "Bacterial Blight": color = "#f59e0b"; break;
        case "Brown Streak Disease": color = "#8b5cf6"; break;
        default: color = "#64748b";
    }

    const svgIcon = `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="32" height="32">
            <path fill="${color}" d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
            <circle cx="12" cy="9" r="2.5" fill="white" />
        </svg>
    `;

    return L.divIcon({
        html: svgIcon,
        className: "custom-disease-marker",
        iconSize: [32, 32],
        iconAnchor: [16, 32],
        popupAnchor: [0, -32]
    });
};

const today = new Date().toISOString().split('T')[0];

const now = new Date();
const todayStr = now.toISOString().split('T')[0];

const oneMonthAgo = new Date();
oneMonthAgo.setMonth(now.getMonth() - 1);
const lastMonthStr = oneMonthAgo.toISOString().split('T')[0];

const DISEASE_META = {
    "Healthy":              { label: "ปกติ",                   dot: "bg-emerald-500" },
    "Mosaic Disease":       { label: "โรคใบด่าง",              dot: "bg-red-500"     },
    "Bacterial Blight":     { label: "โรคใบไหม้",             dot: "bg-amber-500"   },
    "Brown Streak Disease": { label: "โรคใบจุดสีน้ำตาล",     dot: "bg-violet-500"  },
    "another":              { label: "อื่นๆ",                  dot: "bg-slate-400"   },
};

const MapPage = () => {
    const [allData, setAllData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [areaOptions, setAreaOptions] = useState([]);
    const [statsData, setStatsData] = useState([]);
    const [expandedStats, setExpandedStats] = useState({});
    const [showFilters, setShowFilters] = useState(false);

    const toggleStatExpand = (diseaseName) => {
        setExpandedStats(prev => ({
            ...prev,
            [diseaseName]: !prev[diseaseName]
        }));
    };

    const [filters, setFilters] = useState({
        startDate: lastMonthStr,
        endDate: todayStr,
        province: '',
        district: '',
        subdistrict: '',
        disease: ''
    });

    useEffect(() => {
        const fetchOptions = async () => {
            try {
                const res = await axios.get('/api/survey/area-options');
                if (res.data.success) setAreaOptions(res.data.data);
            } catch (err) { console.error("Error fetching options:", err); }
        };
        fetchOptions();
    }, []);

    const fetchMapData = useCallback(async () => {
        setLoading(true);
        try {
            const res = await axios.get('/api/survey/map-data', {
                params: {
                    start: filters.startDate,
                    end: filters.endDate,
                    province: filters.province,
                    district: filters.district,
                    subdistrict: filters.subdistrict,
                    disease: filters.disease
                }
            });
            if (res.data.success) {
                setAllData(res.data.data);
                setStatsData(res.data.stats);
            }
        } catch (err) { console.error("Error fetching map data:", err); }
        finally { setLoading(false); }
    }, [filters]);

    const getDiseaseColor = (diseaseName) => {
        switch (diseaseName) {
            case "Healthy": return "#10b981";
            case "Mosaic Disease": return "#ef4444";
            case "Bacterial Blight": return "#f59e0b";
            case "Brown Streak Disease": return "#8b5cf6";
            default: return "#e2e8f0";
        }
    };

    useEffect(() => {
        const { startDate, endDate } = filters;
        if ((startDate && endDate) || (!startDate && !endDate)) {
            fetchMapData();
        }
    }, [fetchMapData, filters.startDate, filters.endDate, filters]);

    const provinces = [...new Set(areaOptions.map(item => item.province))];
    const districts = filters.province
        ? [...new Set(areaOptions.filter(item => item.province === filters.province).map(item => item.district))]
        : [];
    const subdistricts = (filters.province && filters.district)
        ? [...new Set(areaOptions.filter(item => item.province === filters.province && item.district === filters.district).map(item => item.subdistrict))]
        : [];

    const selectCls = "w-full bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-700 outline-none focus:border-[#006600] transition-colors disabled:bg-gray-50 disabled:text-gray-400";

    const renderSeverityTable = (diseaseName, ThaiTitle) => {
        if (!statsData || statsData.length === 0) return null;

        const levels = [0, 1, 2, 3, 4, 5];
        let subTotalPlants = 0;
        let subTotalWeighted = 0;

        const rows = levels.map(a => {
            const found = statsData.find(s =>
                s.disease_name?.trim() === diseaseName?.trim() &&
                Number(s.severity) === a
            );
            const b = found ? parseInt(found.total_plants) : 0;
            const ab = a * b;
            subTotalPlants += b;
            subTotalWeighted += ab;
            return { a, b, ab };
        });

        if (subTotalPlants === 0) return null;
        const averageSeverity = (subTotalWeighted / subTotalPlants).toFixed(2);
        const isExpanded = expandedStats[diseaseName];
        const dotColor = DISEASE_META[diseaseName]?.dot || "bg-slate-400";

        return (
            <div key={diseaseName} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                {/* Summary row */}
                <button
                    onClick={() => toggleStatExpand(diseaseName)}
                    className="w-full flex items-center gap-3 px-4 py-3.5 text-left"
                >
                    <span className={`w-3 h-3 rounded-full shrink-0 ${dotColor}`} />
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-800 truncate">{ThaiTitle}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-xs text-gray-500">ทั้งหมด: <b className="text-gray-700">{subTotalPlants}</b> ต้น</span>
                            <span className="text-xs text-[#006600] font-medium bg-[#e6f2e6] px-2 py-0.5 rounded-full">
                                เฉลี่ย {averageSeverity}
                            </span>
                        </div>
                    </div>
                    <HiOutlineChevronDown
                        className={`w-5 h-5 text-gray-400 shrink-0 transition-transform duration-200 ${isExpanded ? 'rotate-180 text-[#006600]' : ''}`}
                    />
                </button>

                {/* Expanded table */}
                {isExpanded && (
                    <div className="border-t border-gray-100 px-4 pb-4 pt-3">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="text-xs text-gray-500 uppercase">
                                    <th className="text-left font-medium pb-2">ระดับ (a)</th>
                                    <th className="text-right font-medium pb-2">จำนวนต้น (b)</th>
                                    <th className="text-right font-medium pb-2">ผลคูณ (a×b)</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {rows.map(row => (
                                    <tr key={row.a} className={row.b > 0 ? 'text-gray-800' : 'text-gray-300'}>
                                        <td className="py-1.5">{row.a}</td>
                                        <td className="py-1.5 text-right">{row.b}</td>
                                        <td className="py-1.5 text-right">{row.ab}</td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot>
                                <tr className="border-t-2 border-gray-200 font-semibold text-[#006600]">
                                    <td colSpan="2" className="pt-2 text-xs">ระดับความรุนแรงเฉลี่ย</td>
                                    <td className="pt-2 text-right">{averageSeverity}</td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-[#f3f7f3] flex flex-col">
            {/* Header */}
            <div className="bg-[#006600] px-4 pt-10 pb-5">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <HiOutlineMapPin className="w-5 h-5 text-white" />
                        <h1 className="text-white font-bold text-lg">แผนที่เฝ้าระวังโรคพืช</h1>
                    </div>
                    <div className="bg-white/20 rounded-full px-3 py-1 text-white text-xs font-medium">
                        {loading ? "กำลังโหลด..." : `${allData.length} จุด`}
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 px-4 pt-4 pb-6 flex flex-col gap-4">

                {/* Filter toggle button */}
                <button
                    onClick={() => setShowFilters(v => !v)}
                    className="flex items-center justify-between w-full bg-white rounded-2xl shadow-sm border border-gray-100 px-4 py-3"
                >
                    <div className="flex items-center gap-2 text-gray-700 font-semibold text-sm">
                        <HiOutlineFunnel className="w-4 h-4 text-[#006600]" />
                        ตัวกรองข้อมูล
                        {(filters.province || filters.disease || filters.startDate !== lastMonthStr) && (
                            <span className="w-2 h-2 rounded-full bg-[#006600]" />
                        )}
                    </div>
                    <HiOutlineChevronDown className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${showFilters ? 'rotate-180' : ''}`} />
                </button>

                {/* Filters panel */}
                {showFilters && (
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 px-4 py-4 flex flex-col gap-4">
                        {/* Date range */}
                        <div>
                            <div className="flex items-center gap-2 mb-2">
                                <HiOutlineCalendarDays className="w-4 h-4 text-[#006600]" />
                                <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">ช่วงเวลา</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <input
                                    type="date"
                                    max={today}
                                    value={filters.startDate}
                                    onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                                    className={`${selectCls} flex-1`}
                                />
                                <span className="text-gray-400 text-sm shrink-0">ถึง</span>
                                <input
                                    type="date"
                                    value={filters.endDate}
                                    max={today}
                                    onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                                    className={`${selectCls} flex-1`}
                                />
                            </div>
                        </div>

                        {/* Area dropdowns */}
                        <div>
                            <div className="flex items-center gap-2 mb-2">
                                <HiOutlineMapPin className="w-4 h-4 text-[#006600]" />
                                <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">พื้นที่</span>
                            </div>
                            <div className="flex flex-col gap-2">
                                <select
                                    value={filters.province}
                                    onChange={e => setFilters({ ...filters, province: e.target.value, district: '', subdistrict: '' })}
                                    className={selectCls}
                                >
                                    <option value="">-- ทุกจังหวัด --</option>
                                    {provinces.map(p => <option key={p} value={p}>{p}</option>)}
                                </select>
                                <select
                                    value={filters.district}
                                    onChange={e => setFilters({ ...filters, district: e.target.value, subdistrict: '' })}
                                    disabled={!filters.province}
                                    className={selectCls}
                                >
                                    <option value="">-- ทุกอำเภอ --</option>
                                    {districts.map(d => <option key={d} value={d}>{d}</option>)}
                                </select>
                                <select
                                    value={filters.subdistrict}
                                    onChange={e => setFilters({ ...filters, subdistrict: e.target.value })}
                                    disabled={!filters.district}
                                    className={selectCls}
                                >
                                    <option value="">-- ทุกตำบล --</option>
                                    {subdistricts.map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                            </div>
                        </div>

                        {/* Disease filter */}
                        <div>
                            <div className="flex items-center gap-2 mb-2">
                                <span className="w-4 h-4 rounded-full shrink-0" style={{ backgroundColor: getDiseaseColor(filters.disease) || '#64748b' }} />
                                <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">ชนิดโรค</span>
                            </div>
                            <select
                                value={filters.disease}
                                onChange={(e) => setFilters({ ...filters, disease: e.target.value })}
                                className={selectCls}
                                style={{ borderLeftWidth: '3px', borderLeftColor: getDiseaseColor(filters.disease) || '#e2e8f0' }}
                            >
                                <option value="">แสดงทุกอาการ (All)</option>
                                <option value="Healthy">ปกติ (Healthy)</option>
                                <option value="Mosaic Disease">โรคใบด่าง (Mosaic)</option>
                                <option value="Bacterial Blight">โรคใบไหม้ (Bacterial Blight)</option>
                                <option value="Brown Streak Disease">โรคใบจุดสีน้ำตาล (Brown Streak)</option>
                            </select>
                        </div>
                    </div>
                )}

                {/* Map */}
                <div className="rounded-2xl overflow-hidden shadow-sm border border-gray-100" style={{ height: '380px' }}>
                    <MapContainer center={[13.7367, 100.5231]} zoom={6} style={{ height: '100%', width: '100%' }}>
                        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

                        {allData.map((plot) => {
                            const jitter = () => (Math.random() - 0.5) * 0.0001;
                            const uniqueKey = plot.image_id || `rec-${plot.record_id}`;

                            return (
                                <Marker
                                    key={uniqueKey}
                                    position={[
                                        parseFloat(plot.latitude) + jitter(),
                                        parseFloat(plot.longitude) + jitter()
                                    ]}
                                    icon={getDiseaseIcon(plot.disease_name)}
                                >
                                    <Popup>
                                        <div style={{ minWidth: '160px' }}>
                                            {plot.image_path && (
                                                <img
                                                    src={`/uploads/${plot.image_path}`}
                                                    alt="plant"
                                                    style={{ width: '100%', borderRadius: '8px', marginBottom: '8px' }}
                                                />
                                            )}
                                            <h4 style={{ color: getDiseaseColor(plot.disease_name), margin: '0 0 4px 0', fontSize: '13px', fontWeight: '700' }}>
                                                {plot.disease_name || 'ไม่ระบุโรค'}
                                            </h4>
                                            <p style={{ color: '#374151', margin: '2px 0', fontSize: '12px' }}>
                                                <b>แปลง:</b> {plot.plot_name}
                                            </p>
                                            <p style={{ color: '#374151', margin: '2px 0', fontSize: '12px' }}>
                                                <b>วันที่:</b> {new Date(plot.survey_date).toLocaleDateString('th-TH')}
                                            </p>
                                            <div style={{ marginTop: '6px', padding: '4px 8px', background: '#f1f5f9', textAlign: 'center', borderRadius: '6px', color: '#374151', fontSize: '12px' }}>
                                                ระดับความรุนแรง: <b>{plot.severity}</b>
                                            </div>
                                        </div>
                                    </Popup>
                                </Marker>
                            );
                        })}
                    </MapContainer>
                </div>

                {/* Legend */}
                <div className="flex flex-wrap gap-2">
                    {Object.entries(DISEASE_META).map(([key, { label, dot }]) => (
                        <div key={key} className="flex items-center gap-1.5 bg-white rounded-full px-3 py-1.5 shadow-sm border border-gray-100 text-xs text-gray-700">
                            <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${dot}`} />
                            {label}
                        </div>
                    ))}
                </div>

                {/* Stats section */}
                {statsData && statsData.length > 0 && (
                    <div>
                        <div className="flex items-center gap-2 mb-3">
                            <HiOutlineChartBar className="w-4 h-4 text-[#006600]" />
                            <h2 className="text-sm font-bold text-gray-700">สถิติความรุนแรง</h2>
                        </div>
                        <div className="flex flex-col gap-2">
                            {renderSeverityTable("Healthy", "ต้นที่ปกติ")}
                            {renderSeverityTable("Mosaic Disease", "โรคใบด่าง")}
                            {renderSeverityTable("Bacterial Blight", "โรคใบไหม้")}
                            {renderSeverityTable("Brown Streak Disease", "โรคใบจุดสีน้ำตาล")}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default MapPage;
