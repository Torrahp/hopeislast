import React, { useState, useEffect, useRef } from 'react';
import adminApi from '../services/adminApi';

const CLASS_NAMES = ['Healthy', 'Mosaic Disease', 'Bacterial Blight', 'Brown Streak Disease'];
const MIN_IMAGES_WARNING = 50;

function formatBytes(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function ProgressBar({ percent, indeterminate = false, label, sublabel }) {
    return (
        <div className="space-y-1">
            <div className="flex justify-between items-center text-xs text-gray-600">
                <span>{label}</span>
                {!indeterminate && <span className="font-medium">{percent}%</span>}
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
                {indeterminate ? (
                    <div className="h-full w-1/3 bg-[#006600] rounded-full animate-[indeterminate_1.4s_ease-in-out_infinite]"
                        style={{ animation: 'indeterminate 1.4s ease-in-out infinite' }} />
                ) : (
                    <div
                        className="h-full bg-[#006600] rounded-full transition-all duration-300"
                        style={{ width: `${Math.min(percent, 100)}%` }}
                    />
                )}
            </div>
            {sublabel && <p className="text-xs text-gray-400">{sublabel}</p>}
            <style>{`
                @keyframes indeterminate {
                    0%   { transform: translateX(-100%); }
                    100% { transform: translateX(400%); }
                }
            `}</style>
        </div>
    );
}

export default function ModelManagement() {
    const [stats, setStats] = useState([]);
    const [statsTotal, setStatsTotal] = useState(0);
    const [models, setModels] = useState([]);
    const [notes, setNotes] = useState('');
    const [selectedFile, setSelectedFile] = useState(null);
    const [uploadProgress, setUploadProgress] = useState(null);
    const [activating, setActivating] = useState(null);
    const [downloadProgress, setDownloadProgress] = useState(null);
    const [toast, setToast] = useState(null);
    const fileInputRef = useRef();

    const showToast = (message, type = 'success') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3500);
    };

    const fetchStats = async () => {
        try {
            const res = await adminApi.get('/export-dataset/stats');
            setStats(res.data.data);
            setStatsTotal(res.data.total);
        } catch {
            setStats([]);
        }
    };

    const fetchModels = async () => {
        try {
            const res = await adminApi.get('/models');
            setModels(res.data.data);
        } catch {
            setModels([]);
        }
    };

    useEffect(() => {
        fetchStats();
        fetchModels();
    }, []);

    const handleDownload = async () => {
        setDownloadProgress({ phase: 'preparing', loaded: 0, total: 0 });
        try {
            const res = await adminApi.get('/export-dataset', {
                responseType: 'blob',
                onDownloadProgress: (e) => {
                    setDownloadProgress({
                        phase: 'downloading',
                        loaded: e.loaded,
                        total: e.total || 0,
                    });
                },
            });
            const url = URL.createObjectURL(res.data);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'training_dataset.zip';
            a.click();
            URL.revokeObjectURL(url);
            showToast('ดาวน์โหลด Dataset สำเร็จ');
        } catch (err) {
            const msg = err.response?.data?.message || 'ดาวน์โหลดล้มเหลว';
            showToast(msg, 'error');
        } finally {
            setDownloadProgress(null);
        }
    };

    const handleUpload = async (e) => {
        e.preventDefault();
        if (!selectedFile) return showToast('กรุณาเลือกไฟล์ .pth', 'error');
        setUploadProgress({ percent: 0 });
        const form = new FormData();
        form.append('model', selectedFile);
        form.append('notes', notes);
        try {
            await adminApi.post('/upload-model', form, {
                headers: { 'Content-Type': 'multipart/form-data' },
                onUploadProgress: (e) => {
                    const percent = e.total ? Math.round((e.loaded / e.total) * 100) : 0;
                    setUploadProgress({ percent });
                },
            });
            showToast('Upload model สำเร็จ');
            setSelectedFile(null);
            setNotes('');
            if (fileInputRef.current) fileInputRef.current.value = '';
            fetchModels();
        } catch (err) {
            showToast(err.response?.data?.message || 'Upload ล้มเหลว', 'error');
        } finally {
            setUploadProgress(null);
        }
    };

    const handleActivate = async (model) => {
        if (!window.confirm(`ต้องการ Activate model "${model.original_name}" ใช่หรือไม่?\nAI Service จะโหลด model ใหม่ (~1-2 วินาที)`)) return;
        setActivating(model.model_id);
        try {
            await adminApi.put(`/models/${model.model_id}/activate`);
            showToast(`Activate "${model.original_name}" สำเร็จ`);
            fetchModels();
        } catch (err) {
            showToast(err.response?.data?.message || 'Activate ล้มเหลว', 'error');
        } finally {
            setActivating(null);
        }
    };

    const handleDelete = async (model) => {
        if (!window.confirm(`ต้องการลบ model "${model.original_name}" ใช่หรือไม่?`)) return;
        try {
            await adminApi.delete(`/models/${model.model_id}`);
            showToast('ลบ model สำเร็จ');
            fetchModels();
        } catch (err) {
            showToast(err.response?.data?.message || 'ลบล้มเหลว', 'error');
        }
    };

    const getStatCount = (name) => {
        const row = stats.find((s) => s.disease_name === name);
        return row ? parseInt(row.count) : 0;
    };

    return (
        <div className="max-w-screen-xl mx-auto px-4 py-8 space-y-8">

            {/* Toast */}
            {toast && (
                <div className={`fixed top-4 right-4 z-50 px-5 py-3 rounded-lg shadow-lg text-white text-sm font-medium transition-all ${toast.type === 'error' ? 'bg-red-600' : 'bg-green-600'}`}>
                    {toast.message}
                </div>
            )}

            <h1 className="text-2xl font-bold text-gray-800">จัดการ Model AI</h1>

            {/* Section A: Dataset Export */}
            <section className="bg-white rounded-xl shadow p-6 space-y-4">
                <h2 className="text-lg font-semibold text-gray-700">Export Training Dataset</h2>
                <p className="text-sm text-gray-500">Export รูปภาพที่มี Expert Label พร้อม labels.csv เพื่อนำไป Train model ภายนอก</p>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {CLASS_NAMES.map((name) => {
                        const count = getStatCount(name);
                        const low = count < MIN_IMAGES_WARNING;
                        return (
                            <div key={name} className={`rounded-lg border p-3 text-center ${low ? 'border-amber-300 bg-amber-50' : 'border-gray-200 bg-gray-50'}`}>
                                <p className="text-xs text-gray-500 mb-1 leading-tight">{name}</p>
                                <p className={`text-2xl font-bold ${low ? 'text-amber-600' : 'text-green-700'}`}>{count}</p>
                                {low && <p className="text-xs text-amber-500 mt-1">รูปน้อย</p>}
                            </div>
                        );
                    })}
                </div>

                <div className="flex items-center gap-3 flex-wrap">
                    <span className="text-sm text-gray-600">รูปภาพทั้งหมดที่มี label: <strong>{statsTotal}</strong> รูป</span>
                    {stats.some((s) => parseInt(s.count) < MIN_IMAGES_WARNING) && (
                        <span className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded-full">
                            ⚠ มี class ที่มีรูปน้อยกว่า {MIN_IMAGES_WARNING} รูป ผลการ train อาจไม่ดี
                        </span>
                    )}
                </div>

                {downloadProgress ? (
                    <div className="space-y-2">
                        <ProgressBar
                            indeterminate={downloadProgress.phase === 'preparing' || downloadProgress.total === 0}
                            percent={downloadProgress.total > 0 ? Math.round((downloadProgress.loaded / downloadProgress.total) * 100) : 0}
                            label={downloadProgress.phase === 'preparing' ? 'กำลังสร้าง ZIP...' : 'กำลังดาวน์โหลด...'}
                            sublabel={downloadProgress.loaded > 0 ? `ได้รับข้อมูลแล้ว ${formatBytes(downloadProgress.loaded)}${downloadProgress.total > 0 ? ` / ${formatBytes(downloadProgress.total)}` : ''}` : null}
                        />
                    </div>
                ) : (
                    <button
                        onClick={handleDownload}
                        disabled={statsTotal === 0}
                        className="bg-[#006600] hover:bg-[#005500] disabled:bg-gray-400 text-white px-5 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                    >
                        Download Dataset (ZIP + CSV)
                    </button>
                )}
            </section>

            {/* Section B: Upload Model */}
            <section className="bg-white rounded-xl shadow p-6 space-y-4">
                <h2 className="text-lg font-semibold text-gray-700">Upload Model ใหม่</h2>
                <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                    ⚠ Model ต้องเป็น ViT-B/16 architecture, 4 classes (Healthy / Mosaic / Bacterial Blight / Brown Streak) เท่านั้น
                </p>

                <form onSubmit={handleUpload} className="space-y-3">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">ไฟล์ .pth</label>
                        <input
                            type="file"
                            accept=".pth"
                            ref={fileInputRef}
                            onChange={(e) => setSelectedFile(e.target.files[0] || null)}
                            className="block w-full text-sm text-gray-600 file:mr-3 file:py-1.5 file:px-4 file:rounded file:border-0 file:text-sm file:font-medium file:bg-[#006600] file:text-white hover:file:bg-[#005500]"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">หมายเหตุ (optional)</label>
                        <input
                            type="text"
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="เช่น Trained 2026-04-22, epoch 30, acc 92%"
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#006600]"
                        />
                    </div>
                    {uploadProgress ? (
                        <ProgressBar
                            percent={uploadProgress.percent}
                            label={uploadProgress.percent < 100 ? `กำลัง Upload... ${uploadProgress.percent}%` : 'กำลังบันทึก...'}
                            sublabel={selectedFile ? `${selectedFile.name} (${formatBytes(selectedFile.size)})` : null}
                        />
                    ) : (
                        <button
                            type="submit"
                            disabled={!selectedFile}
                            className="bg-[#006600] hover:bg-[#005500] disabled:bg-gray-400 text-white px-5 py-2 rounded-lg text-sm font-medium transition-colors"
                        >
                            Upload Model
                        </button>
                    )}
                </form>
            </section>

            {/* Section C: Model List */}
            <section className="bg-white rounded-xl shadow p-6 space-y-4">
                <h2 className="text-lg font-semibold text-gray-700">รายการ Model ในระบบ</h2>

                {models.length === 0 ? (
                    <p className="text-sm text-gray-400 text-center py-6">ยังไม่มี model ในระบบ</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b text-left text-gray-500 text-xs uppercase tracking-wide">
                                    <th className="pb-2 pr-4">ชื่อไฟล์ (original)</th>
                                    <th className="pb-2 pr-4">หมายเหตุ</th>
                                    <th className="pb-2 pr-4">Upload เมื่อ</th>
                                    <th className="pb-2 pr-4">สถานะ</th>
                                    <th className="pb-2">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {models.map((m) => (
                                    <tr key={m.model_id} className="hover:bg-gray-50">
                                        <td className="py-3 pr-4">
                                            <p className="font-medium text-gray-800">{m.original_name}</p>
                                            <p className="text-xs text-gray-400">{m.filename}</p>
                                        </td>
                                        <td className="py-3 pr-4 text-gray-500">{m.notes || '—'}</td>
                                        <td className="py-3 pr-4 text-gray-500 whitespace-nowrap">
                                            {new Date(m.uploaded_at).toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'short' })}
                                        </td>
                                        <td className="py-3 pr-4">
                                            {m.is_active ? (
                                                <span className="inline-flex items-center gap-1 bg-green-100 text-green-700 text-xs font-semibold px-2.5 py-1 rounded-full">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse inline-block" />
                                                    Active
                                                </span>
                                            ) : (
                                                <span className="text-xs text-gray-400">—</span>
                                            )}
                                        </td>
                                        <td className="py-3 flex items-center gap-2">
                                            <button
                                                onClick={() => handleActivate(m)}
                                                disabled={m.is_active || activating === m.model_id}
                                                className="text-xs bg-[#006600] hover:bg-[#005500] disabled:bg-gray-300 text-white px-3 py-1 rounded-md transition-colors"
                                            >
                                                {activating === m.model_id ? 'กำลัง...' : 'Activate'}
                                            </button>
                                            <button
                                                onClick={() => handleDelete(m)}
                                                disabled={m.is_active}
                                                className="text-xs bg-red-50 hover:bg-red-100 disabled:opacity-40 text-red-600 border border-red-200 px-3 py-1 rounded-md transition-colors"
                                            >
                                                ลบ
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>
        </div>
    );
}
