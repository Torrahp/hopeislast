import React, { useState, useEffect } from 'react';
import adminApi from '../services/adminApi';

const ROLE_META = {
    'Plant Pathologist': { label: 'นักโรคพืช', bg: 'bg-green-100 text-green-800' },
    admin:               { label: 'Admin',      bg: 'bg-purple-100 text-purple-800' },
    user:                { label: 'เกษตรกร',   bg: 'bg-yellow-100 text-yellow-800' },
};

const Avatar = ({ src, name }) => {
    const [err, setErr] = useState(false);
    const initials = name?.slice(0, 2).toUpperCase() || '??';

    if (src && !err) {
        return (
            <img
                src={src}
                alt={name}
                onError={() => setErr(true)}
                className="w-10 h-10 rounded-full object-cover border-2 border-green-200"
            />
        );
    }
    return (
        <div className="w-10 h-10 rounded-full bg-[#006600] flex items-center justify-center text-white text-xs font-bold border-2 border-green-200">
            {initials}
        </div>
    );
};

const UserManagement = () => {
    const [users, setUsers]           = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading]       = useState(true);

    const fetchUsers = async () => {
        try {
            const res = await adminApi.get('/members');
            setUsers(res.data.data);
        } catch (err) {
            console.error('Error fetching users:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchUsers(); }, []);

    const toggleRole = async (userId, currentRole) => {
        const newRole = currentRole === 'user' ? 'Plant Pathologist' : 'user';
        const newLabel = newRole === 'user' ? 'เกษตรกร' : 'นักโรคพืช';
        if (!window.confirm(`ยืนยันการเปลี่ยนสิทธิ์เป็น ${newLabel}?`)) return;
        try {
            await adminApi.put('/change-role', {
                target_user_id: userId,
                new_role: newRole,
            });
            fetchUsers();
        } catch (err) {
            alert('ไม่สามารถเปลี่ยนสิทธิ์ได้', err);
        }
    };

    const filteredUsers = users.filter(u =>
        u.display_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.phone_number?.includes(searchTerm) ||
        u.email?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="min-h-screen bg-[#f3f7f3] py-8 px-4">
            <div className="max-w-screen-xl mx-auto">

                {/* Page header */}
                <div className="mb-6">
                    <h1 className="text-2xl font-bold text-[#006600]">จัดการสมาชิก</h1>
                    <p className="text-gray-500 text-sm mt-1">Kasetsart University · Munbot Plant Disease System</p>
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-gray-100">

                    {/* Toolbar */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-6 py-5 border-b border-gray-100">
                        <div className="flex items-center gap-3">
                            <span className="text-gray-800 font-semibold">สมาชิกในระบบ</span>
                            <span className="bg-[#e6f2e6] text-[#006600] text-xs font-bold px-2.5 py-1 rounded-full">
                                {filteredUsers.length} รายการ
                            </span>
                        </div>
                        <div className="relative w-full sm:w-72">
                            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                            <input
                                type="text"
                                placeholder="ค้นหาชื่อ, อีเมล, หรือเบอร์โทร..."
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:border-[#006600] focus:ring-2 focus:ring-green-100"
                            />
                        </div>
                    </div>

                    {/* Table */}
                    {loading ? (
                        <div className="py-20 text-center text-gray-400 text-sm">กำลังโหลดข้อมูล...</div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
                                        <th className="text-left px-6 py-3 font-semibold">สมาชิก</th>
                                        <th className="text-left px-6 py-3 font-semibold">เบอร์โทรศัพท์</th>
                                        <th className="text-left px-6 py-3 font-semibold">อีเมล</th>
                                        <th className="text-center px-6 py-3 font-semibold">สถานะสิทธิ์</th>
                                        <th className="text-center px-6 py-3 font-semibold">การจัดการ</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {filteredUsers.length > 0 ? filteredUsers.map(user => {
                                        const meta = ROLE_META[user.role] || ROLE_META.user;
                                        const canToggle = user.role !== 'admin';
                                        return (
                                            <tr key={user.user_id} className="hover:bg-gray-50 transition-colors">
                                                {/* Avatar + name */}
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <Avatar src={user.picture_url} name={user.display_name} />
                                                        <div>
                                                            <p className="font-semibold text-gray-800">{user.display_name}</p>
                                                            <p className="text-xs text-gray-400 font-mono truncate max-w-[140px]">{user.user_id}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-gray-600">{user.phone_number || '—'}</td>
                                                <td className="px-6 py-4 text-gray-600">{user.email || '—'}</td>
                                                <td className="px-6 py-4 text-center">
                                                    <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${meta.bg}`}>
                                                        {meta.label}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    {canToggle ? (
                                                        <button
                                                            onClick={() => toggleRole(user.user_id, user.role)}
                                                            className={`px-4 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                                                                user.role === 'user'
                                                                    ? 'border-green-600 text-green-700 hover:bg-green-600 hover:text-white'
                                                                    : 'border-yellow-500 text-yellow-700 hover:bg-yellow-500 hover:text-white'
                                                            }`}
                                                        >
                                                            {user.role === 'user' ? 'อนุมัติ → นักโรคพืช' : 'ลด → เกษตรกร'}
                                                        </button>
                                                    ) : (
                                                        <span className="text-xs text-gray-400">—</span>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    }) : (
                                        <tr>
                                            <td colSpan="5" className="py-16 text-center text-gray-400">ไม่พบข้อมูลผู้ใช้งาน</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default UserManagement;
