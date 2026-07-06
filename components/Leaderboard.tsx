
import React, { useEffect, useState } from 'react';
import { UserProfile } from '../types';
import { Crown, TrendingUp, Loader2, AlertTriangle } from 'lucide-react';
import { getLeaderboard, LeaderboardItem } from '../services/apiService';

interface Props {
    user: UserProfile;
}

const avatarClasses = ['bg-pink-400', 'bg-blue-400', 'bg-amber-400', 'bg-emerald-400', 'bg-purple-400'];

const Leaderboard: React.FC<Props> = ({ user }) => {
    const [items, setItems] = useState<LeaderboardItem[]>([]);
    const [me, setMe] = useState<LeaderboardItem | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        getLeaderboard(20)
            .then((data) => {
                if (cancelled) return;
                setItems(data.items);
                setMe(data.me);
                setError('');
            })
            .catch((err) => {
                if (!cancelled) setError(err instanceof Error ? err.message : 'دریافت رتبه‌بندی ناموفق بود.');
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });
        return () => { cancelled = true; };
    }, []);

    const rows = items.length > 0 ? items : (me ? [me] : []);

    return (
        <div className="h-full bg-slate-50 p-4 md:p-8 overflow-y-auto">
            <div className="max-w-2xl mx-auto">
                <div className="text-center mb-10 animate-scale-in">
                    <div className="w-20 h-20 bg-gradient-to-b from-yellow-300 to-yellow-600 rounded-full mx-auto mb-4 flex items-center justify-center shadow-xl shadow-yellow-200 animate-float">
                        <Crown size={40} className="text-white" fill="currentColor" />
                    </div>
                    <h1 className="text-3xl font-black text-slate-800 animate-fade-in-up delay-100">تالار مشاهیر</h1>
                    <p className="text-slate-500 font-bold animate-fade-in-up delay-200">رتبه‌بندی واقعی کاربران از سرور</p>
                </div>

                <div className="bg-white rounded-[2rem] shadow-xl border border-slate-100 overflow-hidden animate-fade-in-up delay-300">
                    {loading && (
                        <div className="p-10 flex items-center justify-center gap-3 text-slate-500 font-bold">
                            <Loader2 className="animate-spin" /> در حال دریافت رتبه‌بندی...
                        </div>
                    )}

                    {!loading && error && (
                        <div className="p-10 flex items-center justify-center gap-3 text-red-500 font-bold">
                            <AlertTriangle /> {error}
                        </div>
                    )}

                    {!loading && !error && rows.map((u, idx) => (
                        <div
                            key={`${u.rank}-${u.name}`}
                            style={{ animationDelay: `${300 + (idx * 100)}ms` }}
                            className={`flex items-center gap-4 p-6 border-b last:border-b-0 transition-all hover:bg-slate-50 animate-slide-in-right ${u.isMe ? 'bg-violet-50 border-l-4 border-l-violet-500' : ''}`}
                        >
                            <div className="w-8 font-black text-xl text-slate-400 text-center">
                                {u.rank === 1 ? <span className="text-3xl animate-pop delay-500">🥇</span> : u.rank === 2 ? <span className="text-2xl">🥈</span> : u.rank === 3 ? <span className="text-2xl">🥉</span> : u.rank}
                            </div>

                            <div className={`w-12 h-12 rounded-full ${avatarClasses[idx % avatarClasses.length]} shadow-md flex items-center justify-center font-bold text-white transform transition-transform hover:scale-110`}>
                                {(u.name || user.name).charAt(0)}
                            </div>

                            <div className="flex-1">
                                <h3 className={`font-bold ${u.isMe ? 'text-violet-700' : 'text-slate-800'}`}>
                                    {u.name} {u.isMe && '(شما)'}
                                </h3>
                                <div className="text-xs font-medium text-slate-400">{u.levelTitle} • سطح {u.levelNumber}</div>
                            </div>

                            <div className="text-right">
                                <div className="font-black text-lg text-slate-700">{u.totalXp.toLocaleString('fa-IR')} XP</div>
                                {u.rank <= 3 && (
                                    <div className="flex justify-end items-center gap-1 text-xs font-bold text-emerald-500 animate-pulse">
                                        <TrendingUp size={12} className="rtl:scale-x-[-1]" /> پیشتاز
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}

                    {!loading && !error && rows.length === 0 && (
                        <div className="p-10 text-center text-slate-500 font-bold">هنوز داده‌ای برای رتبه‌بندی ثبت نشده است.</div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Leaderboard;