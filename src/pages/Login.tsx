import React, { useState } from 'react';
import { useStore } from '@/src/store';
import { ChefHat, Lock, Mail, Loader2, AlertCircle } from 'lucide-react';

export const Login: React.FC = () => {
    const { signIn } = useStore();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        // Allow login with Username (auto-append domain)
        let loginEmail = email;
        if (!email.includes('@')) {
            loginEmail = `${email}@mellowoven.com`;
        }

        try {
            await signIn(loginEmail, password);
        } catch (err: any) {
            console.error(err);
            setError('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-cafe-50 to-amber-50 flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-md rounded-3xl shadow-xl overflow-hidden border border-cafe-100">
                {/* Header */}
                <div className="bg-cafe-900 p-8 text-center relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-full opacity-10">
                        <div className="absolute top-0 left-0 w-20 h-20 bg-white rounded-full blur-2xl transform -translate-x-10 -translate-y-10"></div>
                        <div className="absolute bottom-0 right-0 w-32 h-32 bg-amber-500 rounded-full blur-3xl transform translate-x-10 translate-y-10"></div>
                    </div>

                    <div className="relative z-10 flex flex-col items-center">
                        <div className="w-16 h-16 bg-white/10 backdrop-blur-sm rounded-2xl flex items-center justify-center mb-4 shadow-lg border border-white/20">
                            <ChefHat size={32} className="text-amber-400" />
                        </div>
                        <h1 className="text-2xl font-bold text-white mb-1">Mellow Oven</h1>
                        <p className="text-cafe-300 text-sm">Bakery Management System</p>
                    </div>
                </div>

                {/* Form */}
                <div className="p-8">
                    <h2 className="text-xl font-bold text-cafe-900 mb-6 text-center">เข้าสู่ระบบ</h2>

                    {error && (
                        <div className="mb-6 bg-red-50 border border-red-100 text-red-600 px-4 py-3 rounded-xl flex items-start gap-3 text-sm">
                            <AlertCircle size={18} className="mt-0.5 flex-shrink-0" />
                            <p>{error}</p>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-1">
                            <label className="text-sm font-medium text-cafe-700 ml-1">ชื่อผู้ใช้ หรือ อีเมล (Username/Email)</label>
                            <div className="relative">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-cafe-400" size={18} />
                                <input
                                    type="text"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full pl-12 pr-4 py-3 bg-cafe-50 border border-cafe-200 rounded-xl focus:ring-2 focus:ring-cafe-500 focus:border-transparent outline-none transition-all"
                                    placeholder="เช่น Pond40744"
                                />
                            </div>
                        </div>

                        <div className="space-y-1">
                            <label className="text-sm font-medium text-cafe-700 ml-1">รหัสผ่าน</label>
                            <div className="relative">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-cafe-400" size={18} />
                                <input
                                    type="password"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full pl-12 pr-4 py-3 bg-cafe-50 border border-cafe-200 rounded-xl focus:ring-2 focus:ring-cafe-500 focus:border-transparent outline-none transition-all"
                                    placeholder="••••••••"
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full bg-cafe-900 text-white py-3.5 rounded-xl font-bold shadow-lg shadow-cafe-200 hover:bg-cafe-800 active:scale-[0.98] transition-all disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2"
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 size={20} className="animate-spin" />
                                    กำลังเข้าสู่ระบบ...
                                </>
                            ) : (
                                'เข้าสู่ระบบ'
                            )}
                        </button>
                    </form>

                    <div className="mt-8 text-center">
                        <p className="text-xs text-cafe-400">
                            © 2024 Mellow Oven. All rights reserved.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};
