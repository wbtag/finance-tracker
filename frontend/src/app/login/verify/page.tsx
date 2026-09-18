'use client';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { request } from '@/components/lib/request';

export default function VerificationPage() {

    const [code, setCode] = useState('');
    const [error, setError] = useState('');
    const [checking, setChecking] = useState(true);

    const router = useRouter();

    useEffect(() => {
        request('session/').then(session => {
            if (session.verified) {
                router.replace('/');
            } else if (!session.authenticated) {
                router.replace('/login');
            } else {
                setChecking(false);
            }
        });
    }, [router]);

    const handleVerification = async (e: any) => {
        e.preventDefault();
        setError('');

        try {
            await request('login/verify/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code }),
            }, undefined, { redirectOnAuthError: false });
        } catch (err: any) {
            setError(err.message);
            return;
        }

        router.push('/');
    };

    if (checking) return null;

    return (
        <div className="flex items-center justify-center min-h-screen">
            <div className="w-full max-w-sm p-6 rounded bg-transparent">
                <h1 className="text-xl font-bold mb-4 text-gray-900 dark:text-gray-100">Ověření přihlášení</h1>
                <form onSubmit={handleVerification} className="flex flex-col gap-3">
                    <input className="border px-3 py-2 rounded bg-white dark:bg-gray-800 dark:text-gray-100" placeholder="Ověřovací kód" value={code} onChange={e => setCode(e.target.value)} />
                    {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
                    <button className="button" type="submit">Odeslat</button>
                </form>
            </div>
        </div>
    );
}
