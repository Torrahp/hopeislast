import React, { useState } from 'react';
import axios from 'axios';
import { HiOutlinePhone } from 'react-icons/hi2';

function RegisterForm({ liffProfile, onRegisterSuccess }) {
    const [phone, setPhone] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const apiPath = import.meta.env.VITE_API_URL;

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (phone.length < 10) {
            alert("กรุณากรอกเบอร์โทรศัพท์ให้ครบ 10 หลัก");
            return;
        }
        setIsSubmitting(true);
        try {
            const response = await axios.post(`${apiPath}/users/register`, {
                user_id:      liffProfile.user_id,
                display_name: liffProfile.display_name,
                picture_url:  liffProfile.picture_url,
                email:        liffProfile.email || '',
                phone_number: phone
            });
            if (response.data.success) onRegisterSuccess(response.data.data);
        } catch (err) {
            console.error("Register Error:", err);
            alert("เกิดข้อผิดพลาดในการลงทะเบียน กรุณาลองใหม่");
            setIsSubmitting(false);
        }
    };

    if (isSubmitting) {
        return (
            <div className="min-h-screen bg-[#006600] flex flex-col items-center justify-center gap-4">
                <div className="ku-spinner" />
                <p className="text-white text-sm font-medium">กำลังบันทึกข้อมูล...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#f3f7f3] flex flex-col">
            {/* Top green section */}
            <div className="bg-[#006600] pt-12 pb-16 px-6 text-center flex flex-col items-center">
                <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center mb-4">
                    <span className="text-white font-bold text-xs">KU</span>
                </div>
                <img
                    src={liffProfile.picture_url}
                    alt="profile"
                    className="w-24 h-24 rounded-full border-4 border-white shadow-lg object-cover mb-3"
                />
                <h2 className="text-white text-xl font-bold">
                    ยินดีต้อนรับคุณ {liffProfile.displayName || liffProfile.display_name}
                </h2>
                <p className="text-green-200 text-sm mt-1">Kasetsart University · Munbot System</p>
            </div>

            {/* White card */}
            <div className="flex-1 bg-white rounded-t-3xl -mt-6 px-6 pt-8 pb-10 shadow-t-lg">
                <h3 className="text-lg font-bold text-gray-800 mb-1">ลงทะเบียนเข้าใช้งาน</h3>
                <p className="text-sm text-gray-500 mb-8">
                    กรุณากรอกเบอร์โทรศัพท์เพื่อยืนยันตัวตนในระบบ
                </p>

                <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                            เบอร์โทรศัพท์
                        </label>
                        <div className="flex items-center gap-3 bg-gray-50 border-2 border-gray-200 rounded-xl px-4 py-3 focus-within:border-[#006600] transition-colors">
                            <HiOutlinePhone className="w-5 h-5 text-gray-400 shrink-0" />
                            <input
                                type="tel"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                                placeholder="08XXXXXXXX"
                                maxLength="10"
                                required
                                className="flex-1 bg-transparent text-lg text-gray-800 outline-none placeholder-gray-400"
                            />
                        </div>
                        <p className="text-xs text-gray-400 mt-1.5 ml-1">ต้องการ 10 หลัก · {phone.length}/10</p>
                    </div>

                    <button
                        type="submit"
                        disabled={phone.length < 10}
                        className="w-full bg-[#006600] hover:bg-[#005500] disabled:bg-gray-300 text-white font-bold py-4 rounded-2xl text-base transition-colors"
                    >
                        ยืนยันข้อมูลและเข้าใช้งาน
                    </button>
                </form>
            </div>
        </div>
    );
}

export default RegisterForm;
