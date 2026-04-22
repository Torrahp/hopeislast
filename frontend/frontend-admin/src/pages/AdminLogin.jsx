import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { HiOutlineEye, HiOutlineEyeOff } from 'react-icons/hi';

const AdminLogin = ({ onLoginSuccess }) => {
    const [email, setEmail]               = useState('');
    const [password, setPassword]         = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading]       = useState(false);
    const [error, setError]               = useState('');
    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');
        try {
            const res = await axios.post('http://localhost:5000/api/admin/login', { email, password });
            if (res.data.success) {
                localStorage.setItem('adminToken', res.data.token);
                if (onLoginSuccess) onLoginSuccess();
                navigate('/admin/users');
            }
        } catch (err) {
            setError(err.response?.data?.message || 'อีเมลหรือรหัสผ่านไม่ถูกต้อง');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#f3f7f3] flex flex-col items-center justify-center px-4">

            {/* Card */}
            <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden">

                {/* Header stripe */}
                <div className="bg-[#006600] px-8 py-8 text-center">
                    {/* KU emblem placeholder */}
                    <div className="mx-auto w-20 h-20 rounded-full bg-white flex items-center justify-center shadow-md mb-4">
                        <span className="text-[#006600] font-extrabold text-3xl leading-none">KU</span>
                    </div>
                    <h1 className="text-white text-xl font-bold leading-snug">Munbot</h1>
                    <p className="text-green-200 text-sm mt-1">ระบบจัดการโรคพืชมันสำปะหลัง</p>
                    <p className="text-green-300 text-xs mt-0.5">Kasetsart University</p>
                </div>

                {/* Form */}
                <div className="px-8 py-8">
                    <h2 className="text-[#006600] font-semibold text-lg mb-6 text-center">เข้าสู่ระบบผู้ดูแล</h2>

                    {error && (
                        <div className="mb-4 flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
                            <svg className="w-4 h-4 mt-0.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleLogin} className="flex flex-col gap-5">
                        {/* Email */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5" htmlFor="email">
                                อีเมล
                            </label>
                            <input
                                id="email"
                                type="email"
                                placeholder="admin@ku.th"
                                value={email}
                                onChange={e => { setEmail(e.target.value); if (error) setError(''); }}
                                required
                                className={`w-full px-4 py-2.5 rounded-lg border text-sm outline-none transition-colors
                                    ${error
                                        ? 'border-red-400 focus:border-red-500 focus:ring-2 focus:ring-red-100'
                                        : 'border-gray-300 focus:border-[#006600] focus:ring-2 focus:ring-green-100'
                                    }`}
                            />
                        </div>

                        {/* Password */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5" htmlFor="password">
                                รหัสผ่าน
                            </label>
                            <div className={`flex items-center rounded-lg border transition-colors overflow-hidden
                                ${error
                                    ? 'border-red-400 focus-within:border-red-500 focus-within:ring-2 focus-within:ring-red-100'
                                    : 'border-gray-300 focus-within:border-[#006600] focus-within:ring-2 focus-within:ring-green-100'
                                }`}>
                                <input
                                    id="password"
                                    type={showPassword ? 'text' : 'password'}
                                    placeholder="ระบุรหัสผ่านของคุณ"
                                    value={password}
                                    onChange={e => { setPassword(e.target.value); if (error) setError(''); }}
                                    required
                                    className="flex-1 px-4 py-2.5 text-sm outline-none bg-transparent"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(v => !v)}
                                    aria-label="Toggle password visibility"
                                    className="px-3 text-gray-400 hover:text-[#006600] transition-colors"
                                >
                                    {showPassword ? <HiOutlineEyeOff size={18} /> : <HiOutlineEye size={18} />}
                                </button>
                            </div>
                        </div>

                        {/* Submit */}
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full bg-[#006600] hover:bg-[#005500] disabled:bg-gray-400 text-white font-semibold py-2.5 rounded-lg text-sm transition-colors"
                        >
                            {isLoading ? 'กำลังตรวจสอบ...' : 'เข้าสู่ระบบ'}
                        </button>
                    </form>
                </div>
            </div>

            {/* Footer */}
            <p className="mt-6 text-xs text-gray-400">
                © {new Date().getFullYear()} Kasetsart University · Munbot Plant Disease System
            </p>
        </div>
    );
};

export default AdminLogin;
