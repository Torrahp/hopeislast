import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';

const NAV_LINKS = [
    { to: '/admin/users',   label: 'จัดการสมาชิก' },
    { to: '/admin/plots',   label: 'ข้อมูลการสำรวจ' },
    { to: '/admin/logs',    label: 'รูปการสำรวจโรค' },
    { to: '/admin/models',       label: 'จัดการ Model AI' },
    { to: '/admin/legacy-logs',  label: 'รูปการวิเคราะห์โรค' },
];

const Navbar = ({ onLogout }) => {
    const navigate = useNavigate();
    const [menuOpen, setMenuOpen] = useState(false);

    const handleLogout = () => {
        if (window.confirm('คุณต้องการออกจากระบบใช่หรือไม่?')) {
            localStorage.removeItem('adminToken');
            if (onLogout) onLogout();
            navigate('/admin/login', { replace: true });
        }
    };

    return (
        <header className="bg-[#006600] shadow-lg sticky top-0 z-50">
            <div className="max-w-screen-xl mx-auto px-4">
                <div className="flex items-center justify-between h-16">

                    {/* Brand */}
                    <div className="flex items-center gap-3 shrink-0">
                        <div className="w-9 h-9 rounded-full bg-white flex items-center justify-center shadow">
                            <span className="text-[#006600] font-bold text-sm leading-none">KU</span>
                        </div>
                        <div className="leading-tight">
                            <p className="text-white font-bold text-sm leading-none">Munbot Admin</p>
                            <p className="text-green-200 text-xs leading-none mt-0.5">Kasetsart University</p>
                        </div>
                    </div>

                    {/* Desktop nav */}
                    <nav className="hidden md:flex items-center gap-1">
                        {NAV_LINKS.map(({ to, label }) => (
                            <NavLink
                                key={to}
                                to={to}
                                className={({ isActive }) =>
                                    `px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                                        isActive
                                            ? 'bg-white text-[#006600] shadow-sm'
                                            : 'text-green-100 hover:bg-[#005500] hover:text-white'
                                    }`
                                }
                            >
                                {label}
                            </NavLink>
                        ))}
                    </nav>

                    {/* Desktop logout */}
                    <button
                        onClick={handleLogout}
                        className="hidden md:flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white border border-white/30 px-4 py-1.5 rounded-full text-sm font-medium transition-colors"
                    >
                        ออกจากระบบ
                    </button>

                    {/* Mobile hamburger */}
                    <button
                        className="md:hidden text-white p-2 rounded-md"
                        onClick={() => setMenuOpen(v => !v)}
                        aria-label="Toggle menu"
                    >
                        {menuOpen ? (
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        ) : (
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                            </svg>
                        )}
                    </button>
                </div>

                {/* Mobile menu */}
                {menuOpen && (
                    <div className="md:hidden pb-3 flex flex-col gap-1">
                        {NAV_LINKS.map(({ to, label }) => (
                            <NavLink
                                key={to}
                                to={to}
                                onClick={() => setMenuOpen(false)}
                                className={({ isActive }) =>
                                    `px-4 py-2 rounded-md text-sm font-medium ${
                                        isActive ? 'bg-white text-[#006600]' : 'text-green-100 hover:bg-[#005500]'
                                    }`
                                }
                            >
                                {label}
                            </NavLink>
                        ))}
                        <button
                            onClick={handleLogout}
                            className="mt-1 text-left px-4 py-2 rounded-md text-sm text-red-300 hover:bg-[#005500]"
                        >
                            ออกจากระบบ
                        </button>
                    </div>
                )}
            </div>
        </header>
    );
};

export default Navbar;
