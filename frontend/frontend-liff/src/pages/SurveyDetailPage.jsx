import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import Swal from 'sweetalert2';
// eslint-disable-next-line no-unused-vars
import { motion, AnimatePresence } from 'framer-motion';
import {
    HiOutlineMapPin,
    HiOutlineClipboardDocument,
    HiOutlineSun,
    HiOutlineBeaker,
    HiOutlineCamera,
    HiOutlineArrowDownTray,
    HiOutlineSparkles,
    HiOutlineTrash,
    HiOutlinePlus,
    HiOutlineXMark,
} from 'react-icons/hi2';

/* ── Disease selector config ─────────────────────────────────── */
const DISEASE_CONFIG = {
    'Healthy':              { hex: '#059669', glow: 'rgba(5,150,105,0.28)',   bg: 'linear-gradient(135deg,#f0fdf4,#dcfce7)', label: 'ปกติ (Healthy)'                    },
    'Mosaic Disease':       { hex: '#dc2626', glow: 'rgba(220,38,38,0.28)',   bg: 'linear-gradient(135deg,#fff5f5,#fee2e2)', label: 'โรคใบด่าง (Mosaic)'               },
    'Bacterial Blight':     { hex: '#d97706', glow: 'rgba(217,119,6,0.28)',   bg: 'linear-gradient(135deg,#fffbeb,#fef3c7)', label: 'โรคใบไหม้ (Bacterial Blight)'    },
    'Brown Streak Disease': { hex: '#7c3aed', glow: 'rgba(124,58,237,0.28)', bg: 'linear-gradient(135deg,#faf5ff,#ede9fe)', label: 'โรคใบจุดสีน้ำตาล (Brown Streak)' },
    'another':              { hex: '#475569', glow: 'rgba(71,85,105,0.18)',  bg: 'linear-gradient(135deg,#f8fafc,#f1f5f9)', label: 'อื่นๆ (Another)'                   },
};

/* ── Custom disease selector with glow micro-animation ───────── */
const DiseaseSelector = ({ value, onChange }) => {
    const cfg = DISEASE_CONFIG[value] ?? DISEASE_CONFIG['another'];
    return (
        <div
            className="relative rounded-xl overflow-hidden"
            style={{ boxShadow: `0 0 0 2px ${cfg.hex}, 0 4px 16px ${cfg.glow}` }}
        >
            <AnimatePresence mode="wait">
                <motion.div
                    key={value}
                    initial={{ opacity: 0, scale: 0.97 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.97 }}
                    transition={{ duration: 0.18, ease: 'easeOut' }}
                    className="flex items-center gap-3 px-4 py-3.5 pointer-events-none select-none"
                    style={{ background: cfg.bg }}
                >
                    <motion.span
                        key={`dot-${value}`}
                        initial={{ scale: 0.4 }}
                        animate={{ scale: 1 }}
                        transition={{ duration: 0.25, type: 'spring', stiffness: 320 }}
                        className="w-3.5 h-3.5 rounded-full shrink-0"
                        style={{ background: cfg.hex, boxShadow: `0 0 10px ${cfg.hex}99` }}
                    />
                    <span className="text-sm font-bold" style={{ color: cfg.hex }}>{cfg.label}</span>
                    <span className="ml-auto text-xs" style={{ color: cfg.hex, opacity: 0.6 }}>▼</span>
                </motion.div>
            </AnimatePresence>
            <select
                value={value}
                onChange={onChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            >
                {Object.entries(DISEASE_CONFIG).map(([k, v]) => (
                    <option key={k} value={k}>{v.label}</option>
                ))}
            </select>
        </div>
    );
};

/* ── Section banner ──────────────────────────────────────────── */
const SectionHeader = ({ icon: Icon, title }) => (
    <div
        className="flex items-center gap-2.5 px-4 py-3 rounded-xl mb-4 mt-6 first:mt-0"
        style={{ background: 'linear-gradient(135deg, #006600 0%, #004d00 100%)' }}
    >
        <Icon className="w-5 h-5 text-white shrink-0" />
        <h2 className="text-white font-bold text-sm tracking-wide">{title}</h2>
    </div>
);

/* ── Input + Label wrapper ───────────────────────────────────── */
const Field = ({ label, required, children }) => (
    <div className="flex flex-col gap-1.5 mb-4">
        <label className="text-sm font-semibold text-gray-700">
            {label}{required && <span className="text-red-500 ml-1">*</span>}
        </label>
        {children}
    </div>
);

const inputCls = "w-full px-4 py-3 text-base text-gray-800 border-2 border-gray-200 rounded-xl outline-none focus:border-[#006600] focus:shadow-[0_0_0_3px_rgba(0,102,0,0.1)] transition-all bg-white";

/* ── Main component ──────────────────────────────────────────── */
const SurveyDetailPage = ({ user, isEdit = false, isNewRecord = false }) => {
    const navigate = useNavigate();
    const { plotId } = useParams();
    const today = new Date().toISOString().split('T')[0];
    const [isOtherSpecies, setIsOtherSpecies] = useState(false);
    const commonSpecies = ["ระยอง 5", "ระยอง 72", "เกษตร 50"];

    const handleSpeciesSelect = (species) => {
        setIsOtherSpecies(false);
        setPlotData({ ...plotData, plant_species: species });
    };

    const [isOtherSoil, setIsOtherSoil] = useState(false);
    const commonSoilTypes = ["ดินร่วนปนทราย", "ดินทราย", "ดินเหนียวสีแดง", "ดินเหนียวสีดำ"];

    const handleSoilSelect = (soil) => {
        setIsOtherSoil(false);
        setPlotData({ ...plotData, soil_type: soil });
    };

    const [area, setArea] = useState({ rai: "", ngan: "", wah: "" });

    const handleAreaChange = (field, value) => {
        let val = value.replace(/[^0-9.]/g, "");
        if ((val.split(".").length - 1) > 1) return;
        if (val !== "") {
            const numVal = parseFloat(val);
            if (field === 'ngan' && numVal > 3) return;
            if (field === 'wah' && numVal > 99.9) return;
        }
        const updatedArea = { ...area, [field]: val };
        setArea(updatedArea);
        const r = updatedArea.rai || "0";
        const n = updatedArea.ngan || "0";
        const w = updatedArea.wah || "0";
        setPlotData({ ...plotData, space: `${r} ไร่ ${n} งาน ${w} ตารางวา` });
    };

    const [plotData, setPlotData] = useState({
        plot_name: "",
        latitude: "", longitude: "", province: "", district: "", locality: "",
        plant_date: "", weed_names: [""], herbicide_names: [""],
        plant_species: "", space: "", soil_type: "", adjacent_plants_name: [""]
    });

    const [surveyImages, setSurveyImages] = useState([]);
    const [isUploading, setIsUploading] = useState(false);
    const [loadingData, setLoadingData] = useState(false);
    const [predictingIndices, setPredictingIndices] = useState([]);

    const Toast = Swal.mixin({
        toast: true, position: 'top-end',
        showConfirmButton: false, timer: 2000, timerProgressBar: true,
    });

    const handlePredict = async (index, imagePath) => {
        setPredictingIndices(prev => [...prev, index]);
        try {
            const res = await axios.post('/api/survey/predict', { imagePath });
            if (res.data.success) {
                const { disease, severity, confidence } = res.data.prediction;
                const updated = [...surveyImages];
                updated[index].disease_name = disease;
                updated[index].ai_predicted_disease = disease;
                updated[index].severity = severity || 0;
                updated[index].confidence = confidence;
                setSurveyImages(updated);
                Toast.fire({ icon: 'success', title: 'วิเคราะห์เสร็จสิ้น' });
            }
        } catch (err) {
            console.error("AI Error:", err);
            Swal.fire({ icon: 'error', title: 'AI ขัดข้อง', text: 'ไม่สามารถวิเคราะห์ได้ในขณะนี้', confirmButtonColor: '#006600' });
        } finally {
            setPredictingIndices(prev => prev.filter(i => i !== index));
        }
    };

    const plantAge = plotData.plant_date
        ? Math.ceil(Math.abs(new Date() - new Date(plotData.plant_date)) / (1000 * 60 * 60 * 24))
        : 0;

    const fetchExistingPlot = useCallback(async () => {
        if ((!isEdit && !isNewRecord) || !plotId) return;
        setLoadingData(true);
        try {
            const res = await axios.get(`/api/survey/details/${plotId}`);
            if (res.data.success) {
                const data = res.data.data;
                setPlotData({
                    record_id: data.record_id,
                    plot_name: data.plot_name || "",
                    latitude: data.latitude, longitude: data.longitude,
                    province: data.province, district: data.district, locality: data.locality,
                    plant_date: data.plant_date ? new Date(data.plant_date).toISOString().split('T')[0] : "",
                    weed_names: data.weeds?.length > 0 ? data.weeds : [""],
                    herbicide_names: data.herbicides?.length > 0 ? data.herbicides : [""],
                    adjacent_plants_name: data.adjacent_plants?.length > 0 ? data.adjacent_plants : [""],
                    plant_species: data.plant_species || "",
                    space: data.space || "",
                    soil_type: data.soil_type || ""
                });
                if (isNewRecord) {
                    setSurveyImages([]);
                } else if (isEdit) {
                    setSurveyImages(data.images.map(img => ({
                        image_path: img.image_path,
                        disease_name: img.disease_name,
                        ai_predicted_disease: img.ai_predicted_disease || img.disease_name,
                        severity: img.severity,
                        plant_count: img.plant_count,
                        confidence: img.confidence || 0
                    })));
                }
                if (data.space) {
                    const parts = data.space.match(/\d+/g);
                    if (parts && parts.length >= 3)
                        setArea({ rai: parts[0], ngan: parts[1], wah: parts[2] });
                }
            }
        } catch (err) { console.error("Fetch Error:", err); }
        finally { setLoadingData(false); }
    }, [isEdit, isNewRecord, plotId]);

    useEffect(() => { fetchExistingPlot(); }, [fetchExistingPlot]);

    const getLocation = () => {
        if (navigator.geolocation) {
            setIsUploading(true);
            navigator.geolocation.getCurrentPosition(async (pos) => {
                const lat = pos.coords.latitude.toFixed(6);
                const lon = pos.coords.longitude.toFixed(6);
                try {
                    const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}&accept-language=th`);
                    const data = await res.json();
                    if (data.address) {
                        const a = data.address;
                        const clean = (s) => s ? s.replace(/จังหวัด|อำเภอ|ตำบล|เขต|แขวง/g, "").trim() : "";
                        setPlotData(prev => ({
                            ...prev,
                            latitude: lat, longitude: lon,
                            province: clean(a.province),
                            district: clean(a.county || a.district),
                            locality: clean(a.city_district || a.town || a.suburb || a.village)
                        }));
                    }
                } catch (e) { console.error("Geocoding Error:", e); }
                setIsUploading(false);
            }, () => {
                Swal.fire('GPS ปิดอยู่', 'กรุณาเปิด GPS บนอุปกรณ์ของคุณ', 'warning');
                setIsUploading(false);
            });
        }
    };

    const handleRemoveImage = async (index, fileName) => {
        const result = await Swal.fire({
            title: 'ลบรูปภาพนี้?', text: "รูปภาพจะถูกลบออกจากเซิร์ฟเวอร์ทันที",
            icon: 'warning', showCancelButton: true,
            confirmButtonColor: '#ef4444', confirmButtonText: 'ยืนยันการลบ', cancelButtonText: 'ยกเลิก'
        });
        if (result.isConfirmed) {
            try {
                const res = await axios.delete(`/api/survey/${fileName}`);
                if (res.data.success) {
                    setSurveyImages(prev => prev.filter((_, i) => i !== index));
                    Toast.fire({ icon: 'success', title: 'ลบรูปภาพแล้ว' });
                }
            } catch (err) { Swal.fire('ผิดพลาด', 'ไม่สามารถลบไฟล์ได้', err.message); }
        }
    };

    const handleDynamicChange = (index, name, value) => {
        const updatedArray = [...plotData[name]];
        updatedArray[index] = value;
        setPlotData({ ...plotData, [name]: updatedArray });
    };

    const addField = (name) => setPlotData({ ...plotData, [name]: [...plotData[name], ""] });
    const removeField = (index, name) => {
        if (plotData[name].length > 1)
            setPlotData({ ...plotData, [name]: plotData[name].filter((_, i) => i !== index) });
    };

    const handleImageUpload = async (e) => {
        const files = Array.from(e.target.files);
        if (files.length === 0) return;
        setIsUploading(true);
        const formData = new FormData();
        files.forEach(file => formData.append('image', file));
        try {
            const res = await axios.post('/api/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
            if (res.data.success) {
                const newEntries = res.data.data.map(file => ({
                    image_path: file.filename,
                    disease_name: "Healthy",
                    ai_predicted_disease: "Didn't predict",
                    severity: 0, plant_count: 1, confidence: 0
                }));
                setSurveyImages(prev => [...prev, ...newEntries]);
            }
        } catch (err) { Swal.fire('อัปโหลดล้มเหลว', 'เกิดข้อผิดพลาดในการส่งไฟล์', err.message); }
        finally { setIsUploading(false); }
    };

    const updateImageDetail = (index, field, value) => {
        const updated = [...surveyImages];
        updated[index][field] = value;
        setSurveyImages(updated);
    };

    const handleFinalSave = async () => {
        if (!plotData.plot_name.trim())    return Swal.fire('ข้อมูลไม่ครบ', 'กรุณาระบุชื่อแปลง', 'info');
        if (!plotData.latitude)            return Swal.fire('ข้อมูลไม่ครบ', 'กรุณาระบุพิกัดแปลง', 'info');
        if (!plotData.plant_date)          return Swal.fire('ข้อมูลไม่ครบ', 'กรุณาระบุวันที่เริ่มปลูก', 'info');
        if (!plotData.plant_species.trim()) return Swal.fire('ข้อมูลไม่ครบ', 'กรุณาระบุพันธุ์พืช', 'info');
        if (surveyImages.length === 0)     return Swal.fire('ไม่มีรูปภาพ', 'กรุณาอัปโหลดรูปภาพสำรวจอย่างน้อย 1 รูป', 'info');

        Swal.fire({ title: 'กำลังบันทึกข้อมูล...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });

        const payload = {
            ...plotData,
            user_id: user?.user_id || user?.userId,
            images: surveyImages,
            is_edit: isNewRecord ? false : isEdit,
            plot_id: plotId,
            record_id: isNewRecord ? null : plotData.record_id
        };

        try {
            const res = await axios.post('/api/survey/save-full-survey', payload);
            if (res.data.success) {
                await Swal.fire({ icon: 'success', title: isEdit ? 'อัปเดตสำเร็จ!' : 'บันทึกสำเร็จ!', timer: 2000, showConfirmButton: false });
                navigate('/');
            }
        } catch (err) {
            Swal.fire('บันทึกล้มเหลว', err.response?.data?.message || 'ติดต่อเซิร์ฟเวอร์ไม่ได้', 'error');
        }
    };

    /* ── Loading state ── */
    if (loadingData) return (
        <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-[#f3f7f3]">
            <div className="ku-spinner" />
            <p className="text-sm text-gray-500">กำลังดึงข้อมูลเดิม...</p>
        </div>
    );

    /* ─────────────────────────────────────────────────────── */
    return (
        <div className="min-h-screen bg-[#f3f7f3]">

            {/* Page header */}
            <div className="px-4 pt-10 pb-5 flex items-center gap-3" style={{ background: 'linear-gradient(160deg, #006600 0%, #004d00 100%)' }}>
                <img
                    src={user?.picture_url || "https://placehold.jp/50x50.png"}
                    alt="profile"
                    className="w-10 h-10 rounded-full border-2 border-white/50 object-cover"
                />
                <div>
                    <p className="text-green-200 text-xs">คุณ {user?.display_name || 'ผู้ใช้งาน'}</p>
                    <h1 className="text-white font-bold text-base leading-tight">
                        {isEdit ? "แก้ไขข้อมูลแปลง" : isNewRecord ? "สำรวจโรครอบใหม่" : "สร้างแปลงพืชใหม่"}
                    </h1>
                </div>
            </div>

            {/* Form body — padded for save bar (≈5rem) + bottom nav (≈4rem) */}
            <div className="px-4 pt-5" style={{ paddingBottom: 'calc(9rem + env(safe-area-inset-bottom))' }}>

                {/* ── SECTION 1: Location ── */}
                <SectionHeader icon={HiOutlineMapPin} title="พิกัดและที่ตั้งแปลง" />

                <Field label="ตำแหน่ง GPS" required>
                    <div className="flex gap-2">
                        <input type="text" placeholder="Latitude" value={plotData.latitude} readOnly
                            className={`${inputCls} flex-1 bg-gray-50 text-gray-500`} />
                        <input type="text" placeholder="Longitude" value={plotData.longitude} readOnly
                            className={`${inputCls} flex-1 bg-gray-50 text-gray-500`} />
                    </div>
                    <button
                        type="button"
                        onClick={getLocation}
                        disabled={isUploading}
                        className="w-full flex items-center justify-center gap-2 bg-[#006600] hover:bg-[#005500] disabled:bg-gray-400 text-white font-semibold py-3.5 rounded-xl mt-2 transition-colors border-0 outline-none"
                    >
                        <HiOutlineMapPin className="w-5 h-5" />
                        {isUploading ? "กำลังระบุตำแหน่ง..." : "รับตำแหน่ง GPS อัตโนมัติ"}
                    </button>
                </Field>

                <div className="grid grid-cols-3 gap-2 mb-4">
                    {[
                        { key: 'province', label: 'จังหวัด', placeholder: 'ระบุจังหวัด' },
                        { key: 'district', label: 'อำเภอ',   placeholder: 'ระบุอำเภอ'   },
                        { key: 'locality', label: 'ตำบล',    placeholder: 'ระบุตำบล'    },
                    ].map(({ key, label, placeholder }) => (
                        <div key={key} className="flex flex-col gap-1">
                            <label className="text-xs font-semibold text-gray-600">{label}</label>
                            <input
                                type="text"
                                value={plotData[key]}
                                onChange={e => setPlotData({ ...plotData, [key]: e.target.value })}
                                placeholder={placeholder}
                                className="w-full px-3 py-2.5 text-sm text-gray-800 border-2 border-gray-200 rounded-xl outline-none focus:border-[#006600] transition-colors bg-white"
                            />
                        </div>
                    ))}
                </div>

                <Field label="ชื่อแปลงพืช" required>
                    <input type="text" value={plotData.plot_name}
                        onChange={e => setPlotData({ ...plotData, plot_name: e.target.value })}
                        placeholder="เช่น แปลงมันสำปะหลัง หน้าบ้าน"
                        className={inputCls} />
                </Field>

                {/* ── SECTION 2: Planting ── */}
                <SectionHeader icon={HiOutlineSun} title="รายละเอียดการปลูก" />

                <Field label="วันที่เริ่มปลูก" required>
                    <input type="date" value={plotData.plant_date}
                        onChange={e => setPlotData({ ...plotData, plant_date: e.target.value })}
                        max={today} className={inputCls} />
                    {plantAge > 0 && (
                        <p className="text-xs text-[#006600] font-semibold mt-1 ml-1">
                            อายุพืช: {plantAge} วัน
                        </p>
                    )}
                </Field>

                <Field label="พันธุ์พืช" required>
                    <div className="flex flex-wrap gap-2 mb-2">
                        {commonSpecies.map(s => (
                            <button
                                key={s} type="button"
                                onClick={() => handleSpeciesSelect(s)}
                                className={`px-4 py-2.5 rounded-full text-sm font-semibold border-2 transition-colors border-0 outline-none ${
                                    plotData.plant_species === s && !isOtherSpecies
                                        ? 'bg-[#006600] text-white border-[#006600]'
                                        : 'bg-white text-gray-700 border border-gray-200'
                                }`}
                            >{s}</button>
                        ))}
                        <button
                            type="button"
                            onClick={() => { setIsOtherSpecies(true); setPlotData({ ...plotData, plant_species: "" }); }}
                            className={`px-4 py-2.5 rounded-full text-sm font-semibold border-2 transition-colors border-0 outline-none ${
                                isOtherSpecies
                                    ? 'bg-[#006600] text-white'
                                    : 'bg-white text-gray-700 border border-gray-200'
                            }`}
                        >อื่นๆ</button>
                    </div>
                    {(isOtherSpecies || (!commonSpecies.includes(plotData.plant_species) && plotData.plant_species !== "")) && (
                        <input
                            type="text"
                            value={plotData.plant_species}
                            onChange={e => setPlotData({ ...plotData, plant_species: e.target.value })}
                            placeholder="ระบุชื่อพันธุ์พืชของคุณ"
                            autoFocus
                            className={inputCls}
                        />
                    )}
                </Field>

                <Field label="ขนาดพื้นที่/ระยะปลูก" required>
                    <div className="grid grid-cols-3 gap-2">
                        {[
                            { field: 'rai',  label: 'ไร่',           mode: 'numeric',  max: undefined },
                            { field: 'ngan', label: 'งาน (0-3)',      mode: 'numeric',  max: 1         },
                            { field: 'wah',  label: 'ตร.ว. (0-99.9)', mode: 'decimal',  max: 4         },
                        ].map(({ field, label, mode, max }) => (
                            <div key={field} className="flex flex-col gap-1">
                                <label className="text-xs text-gray-500 text-center">{label}</label>
                                <input
                                    type="text"
                                    inputMode={mode}
                                    value={area[field]}
                                    onChange={e => handleAreaChange(field, e.target.value)}
                                    placeholder="0"
                                    maxLength={max}
                                    className="w-full px-3 py-3 text-center text-base font-semibold text-gray-800 border-2 border-gray-200 rounded-xl outline-none focus:border-[#006600] transition-colors bg-white"
                                />
                            </div>
                        ))}
                    </div>
                </Field>

                <Field label="ชนิดดิน" required>
                    <div className="flex flex-wrap gap-2 mb-2">
                        {commonSoilTypes.map(s => (
                            <button
                                key={s} type="button"
                                onClick={() => handleSoilSelect(s)}
                                className={`px-4 py-2.5 rounded-full text-sm font-semibold border-2 transition-colors border-0 outline-none ${
                                    plotData.soil_type === s && !isOtherSoil
                                        ? 'bg-[#006600] text-white border-[#006600]'
                                        : 'bg-white text-gray-700 border border-gray-200'
                                }`}
                            >{s}</button>
                        ))}
                        <button
                            type="button"
                            onClick={() => { setIsOtherSoil(true); setPlotData({ ...plotData, soil_type: "" }); }}
                            className={`px-4 py-2.5 rounded-full text-sm font-semibold border-2 transition-colors border-0 outline-none ${
                                isOtherSoil
                                    ? 'bg-[#006600] text-white'
                                    : 'bg-white text-gray-700 border border-gray-200'
                            }`}
                        >อื่นๆ</button>
                    </div>
                    {(isOtherSoil || (!commonSoilTypes.includes(plotData.soil_type) && plotData.soil_type !== "")) && (
                        <input
                            type="text"
                            value={plotData.soil_type}
                            onChange={e => setPlotData({ ...plotData, soil_type: e.target.value })}
                            placeholder="ระบุชนิดดินของคุณ"
                            autoFocus
                            className={inputCls}
                        />
                    )}
                </Field>

                {/* ── SECTION 3: Environment ── */}
                <SectionHeader icon={HiOutlineBeaker} title="ข้อมูลสิ่งแวดล้อม" />

                {[
                    { label: "วัชพืชที่พบ / ศัตรูพืช", name: "weed_names"          },
                    { label: "สารเคมี / ปุ๋ย",          name: "herbicide_names"    },
                    { label: "พืชข้างเคียง",             name: "adjacent_plants_name" },
                ].map(field => (
                    <div key={field.name} className="mb-4">
                        <label className="text-sm font-semibold text-gray-700 mb-2 block">{field.label}</label>
                        <div className="flex flex-wrap gap-2 mb-2">
                            {plotData[field.name].map((val, idx) => val.trim() && (
                                <span key={idx} className="inline-flex items-center gap-1 bg-[#e6f2e6] text-[#006600] text-sm px-3 py-1.5 rounded-full font-medium">
                                    {val}
                                    <button type="button" onClick={() => removeField(idx, field.name)}
                                        className="border-0 outline-none bg-transparent p-0 ml-0.5 text-[#006600] hover:text-red-600">
                                        <HiOutlineXMark className="w-3.5 h-3.5" />
                                    </button>
                                </span>
                            ))}
                        </div>
                        {plotData[field.name].map((val, idx) => (
                            <div key={idx} className="flex gap-2 mb-2">
                                <input
                                    type="text"
                                    value={val}
                                    onChange={e => handleDynamicChange(idx, field.name, e.target.value)}
                                    placeholder={`ระบุ${field.label}`}
                                    className={`${inputCls} flex-1`}
                                />
                                {plotData[field.name].length > 1 && (
                                    <button type="button" onClick={() => removeField(idx, field.name)}
                                        className="w-11 h-11 flex items-center justify-center rounded-xl bg-red-50 text-red-500 border-0 outline-none shrink-0">
                                        <HiOutlineXMark className="w-5 h-5" />
                                    </button>
                                )}
                            </div>
                        ))}
                        <button type="button" onClick={() => addField(field.name)}
                            className="flex items-center gap-1.5 text-sm text-[#006600] font-semibold border border-[#006600]/30 bg-[#e6f2e6] px-4 py-2 rounded-xl border-0 outline-none">
                            <HiOutlinePlus className="w-4 h-4" />
                            เพิ่มรายการ
                        </button>
                    </div>
                ))}

                {/* ── SECTION 4: Survey Images ── */}
                <SectionHeader icon={HiOutlineCamera} title="การสำรวจโรค" />

                {/* Upload zone */}
                <label className={`flex flex-col items-center justify-center gap-3 border-2 border-dashed rounded-2xl p-8 mb-5 cursor-pointer transition-colors ${
                    isUploading
                        ? 'border-gray-300 bg-gray-50'
                        : 'border-[#006600]/40 bg-[#e6f2e6]/50 hover:bg-[#e6f2e6]'
                }`}>
                    {isUploading ? (
                        <>
                            <div className="ku-spinner" />
                            <p className="text-sm text-gray-500 font-medium">กำลังอัปโหลด...</p>
                        </>
                    ) : (
                        <>
                            <div className="w-14 h-14 rounded-full bg-[#006600]/10 flex items-center justify-center">
                                <HiOutlineCamera className="w-7 h-7 text-[#006600]" />
                            </div>
                            <div className="text-center">
                                <p className="text-sm font-bold text-[#006600]">แตะเพื่อเพิ่มรูปภาพ</p>
                                <p className="text-xs text-gray-400 mt-0.5">รองรับหลายรูปพร้อมกัน</p>
                            </div>
                        </>
                    )}
                    <input type="file" multiple accept="image/*" onChange={handleImageUpload} hidden disabled={isUploading} />
                </label>

                {/* Image cards */}
                <div className="flex flex-col gap-4">
                    <AnimatePresence>
                    {surveyImages.map((img, index) => {
                        const isPredicting = predictingIndices.includes(index);
                        return (
                            <motion.div
                                key={img.image_path}
                                initial={{ opacity: 0, y: 20, scale: 0.97 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.18 } }}
                                transition={{ duration: 0.3, ease: 'easeOut', delay: index * 0.05 }}
                                className="bg-white rounded-2xl border border-gray-100 shadow-md overflow-hidden"
                            >
                                {/* Thumbnail + AI button */}
                                <div className="relative">
                                    <img
                                        src={`/uploads/${img.image_path}`}
                                        alt="preview"
                                        className="w-full h-52 object-cover"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => handlePredict(index, img.image_path)}
                                        disabled={isPredicting}
                                        className="absolute bottom-3 right-3 flex items-center gap-1.5 bg-[#006600]/90 hover:bg-[#006600] disabled:bg-gray-500 text-white text-xs font-bold px-3 py-2 rounded-full shadow transition-colors border-0 outline-none"
                                    >
                                        <HiOutlineSparkles className="w-4 h-4" />
                                        {isPredicting ? "วิเคราะห์..." : "วิเคราะห์ AI"}
                                    </button>
                                </div>

                                {/* Controls */}
                                <div className="p-4 flex flex-col gap-3">
                                    {/* Disease + confidence */}
                                    <div>
                                        <div className="flex items-center justify-between mb-2">
                                            <label className="text-sm font-bold text-gray-800">โรคที่พบ</label>
                                            {img.confidence > 0 && (
                                                <motion.span
                                                    key={img.confidence}
                                                    initial={{ opacity: 0, scale: 0.85 }}
                                                    animate={{ opacity: 1, scale: 1 }}
                                                    className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${
                                                        img.confidence > 80
                                                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                                            : 'bg-red-50 text-red-600 border border-red-200'
                                                    }`}
                                                >
                                                    มั่นใจ {img.confidence}%
                                                </motion.span>
                                            )}
                                        </div>
                                        <DiseaseSelector
                                            value={img.disease_name}
                                            onChange={e => updateImageDetail(index, 'disease_name', e.target.value)}
                                        />
                                    </div>

                                    {/* Plant count */}
                                    <div>
                                        <label className="text-sm font-semibold text-gray-700 mb-1.5 block">จำนวนต้นที่พบ</label>
                                        <input
                                            type="number"
                                            min="1"
                                            value={img.plant_count}
                                            onChange={e => updateImageDetail(index, 'plant_count', e.target.value === '' ? '' : parseInt(e.target.value))}
                                            className="w-full px-4 py-3 text-base text-gray-800 border-2 border-gray-200 rounded-xl outline-none focus:border-[#006600] transition-colors bg-white"
                                        />
                                    </div>

                                    {/* Severity */}
                                    <div>
                                        <div className="flex items-center justify-between mb-2">
                                            <label className="text-sm font-semibold text-gray-700">ความรุนแรง</label>
                                            <span className="text-lg font-bold text-[#006600]">{img.severity} / 5</span>
                                        </div>
                                        <input
                                            type="range" min="0" max="5"
                                            value={img.severity}
                                            onChange={e => updateImageDetail(index, 'severity', parseInt(e.target.value))}
                                            className="w-full h-2 rounded-full outline-none"
                                        />
                                        <div className="flex justify-between text-xs text-gray-400 mt-1">
                                            <span>ไม่พบ</span><span>รุนแรงมาก</span>
                                        </div>
                                    </div>

                                    {/* Delete */}
                                    <button
                                        type="button"
                                        onClick={() => handleRemoveImage(index, img.image_path)}
                                        className="flex items-center justify-center gap-2 w-full text-sm font-semibold text-red-600 bg-red-50 py-3 rounded-xl border border-red-200 border-0 outline-none hover:bg-red-100 transition-colors"
                                    >
                                        <HiOutlineTrash className="w-4 h-4" />
                                        ลบรูปนี้
                                    </button>
                                </div>
                            </motion.div>
                        );
                    })}
                    </AnimatePresence>
                </div>
            </div>

            {/* ── Fixed bottom save bar — floats above the App bottom nav ── */}
            <div
                className="fixed left-0 right-0 bg-white border-t border-gray-200 px-4 pt-3 pb-3 z-[60] shadow-[0_-4px_16px_rgba(0,0,0,0.10)]"
                style={{ bottom: 'calc(4rem + env(safe-area-inset-bottom))' }}
            >
                <motion.button
                    type="button"
                    onClick={handleFinalSave}
                    whileTap={{ scale: 0.98 }}
                    className="w-full flex items-center justify-center gap-2 text-white font-bold py-4 rounded-2xl text-base border-0 outline-none shadow-lg"
                    style={{ background: 'linear-gradient(135deg, #006600 0%, #004d00 100%)' }}
                >
                    <HiOutlineArrowDownTray className="w-5 h-5" />
                    {isEdit ? "อัปเดตข้อมูลแปลง" : isNewRecord ? "บันทึกการสำรวจ" : "บันทึกข้อมูลทั้งหมด"}
                </motion.button>
            </div>
        </div>
    );
};

export default SurveyDetailPage;
