import React, { useState } from 'react';
import { useStore } from '@/src/store';
import { ChefHat, Loader2, AlertCircle, Delete } from 'lucide-react';

export const Login: React.FC = () => {
    const { signIn } = useStore();
    const [pin, setPin] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleNumberClick = (num: string) => {
        if (pin.length < 8) {
            setPin(prev => prev + num);
            setError(null);
        }
    };

    const handleDelete = () => {
        setPin(prev => prev.slice(0, -1));
        setError(null);
    };

    const handleClear = () => {
        setPin('');
        setError(null);
    };

    const handleLogin = async () => {
        if (pin.length !== 8) {
            setError('กรุณากรอกรหัสพนักงานให้ครบ 8 หลัก');
            return;
        }

        setIsLoading(true);
        setError(null);

        // Security Adapter: Map 8-digit PIN to secure backend email/password
        const loginEmail = `mellowoven.${pin}@gmail.com`;
        const loginPassword = pin;

        try {
            await signIn(loginEmail, loginPassword);
        } catch (err: any) {
            console.error(err);
            setError('รหัสผ่านไม่ถูกต้อง หรือยังไม่มีสิทธิ์เข้าใช้งาน');
            setPin(''); // Clear PIN on failure
        } finally {
            setIsLoading(false);
        }
    };

    // Auto-login when 8 digits are entered (Optional, but manual button is safer)
    // We will use a prominent manual button

    return (
        <div className="min-h-screen bg-gradient-to-br from-cafe-50 to-amber-50 flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-sm rounded-[2rem] shadow-xl overflow-hidden border border-cafe-100">
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
                        <p className="text-cafe-300 text-sm">เข้าสู่ระบบพนักงาน</p>
                    </div>
                </div>

                {/* Numpad Form */}
                <div className="p-6">
                    {/* PIN Display */}
                    <div className="mb-6 flex justify-center gap-3">
                        {[...Array(8)].map((_, i) => (
                            <div
                                key={i}
                                className={`w-6 h-6 rounded-full transition-all duration-300 flex items-center justify-center
                                    ${pin.length > i 
                                        ? 'bg-cafe-900 text-white' 
                                        : 'bg-cafe-100 border border-cafe-200'}`}
                            >
                                {pin.length > i && <span className="w-2.5 h-2.5 bg-white rounded-full"></span>}
                            </div>
                        ))}
                    </div>

                    {error && (
                        <div className="mb-4 bg-red-50 text-red-600 px-4 py-3 rounded-xl flex items-start gap-3 text-xs font-medium animate-pulse">
                            <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
                            <p>{error}</p>
                        </div>
                    )}

                    {/* Numpad Grid */}
                    <div className="grid grid-cols-3 gap-3 mb-6">
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                            <button
                                key={num}
                                onClick={() => handleNumberClick(num.toString())}
                                disabled={isLoading}
                                className="h-16 rounded-2xl bg-cafe-50 hover:bg-cafe-100 active:bg-cafe-200 text-cafe-900 font-bold text-2xl transition-all shadow-sm active:scale-95 disabled:opacity-50"
                            >
                                {num}
                            </button>
                        ))}
                        
                        <button
                            onClick={handleClear}
                            disabled={isLoading || pin.length === 0}
                            className="h-16 rounded-2xl bg-gray-50 hover:bg-gray-100 active:bg-gray-200 text-gray-600 font-bold text-lg transition-all shadow-sm active:scale-95 disabled:opacity-50"
                        >
                            C
                        </button>
                        <button
                            onClick={() => handleNumberClick('0')}
                            disabled={isLoading}
                            className="h-16 rounded-2xl bg-cafe-50 hover:bg-cafe-100 active:bg-cafe-200 text-cafe-900 font-bold text-2xl transition-all shadow-sm active:scale-95 disabled:opacity-50"
                        >
                            0
                        </button>
                        <button
                            onClick={handleDelete}
                            disabled={isLoading || pin.length === 0}
                            className="h-16 rounded-2xl bg-red-50 hover:bg-red-100 active:bg-red-200 text-red-600 font-bold text-lg transition-all shadow-sm active:scale-95 flex items-center justify-center disabled:opacity-50"
                        >
                            <Delete size={24} />
                        </button>
                    </div>

                    <button
                        onClick={handleLogin}
                        disabled={isLoading || pin.length !== 8}
                        className="w-full bg-cafe-900 text-white py-4 rounded-2xl font-bold shadow-lg shadow-cafe-200 hover:bg-cafe-800 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
                </div>
            </div>
        </div>
    );
};
