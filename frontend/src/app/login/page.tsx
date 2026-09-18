'use client';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useStateHandler } from "@/components/lib/useStateHandler";
import { Input } from "@/components/ui/elements/formElements";
import { request } from '@/components/lib/request';

export default function LoginPage() {

    const stateHandler = useStateHandler({
        username: '',
        password: '',
    });

    const { formData } = stateHandler;
    const router = useRouter();
    const [error, setError] = useState('');
    const [checking, setChecking] = useState(true);

    useEffect(() => {
        request('session/').then(session => {
            if (session.verified) {
                router.replace('/');
            } else if (session.authenticated) {
                router.replace('/login/verify');
            } else {
                setChecking(false);
            }
        });
    }, [router]);

    const handleLogin = async (e: any) => {
        e.preventDefault();
        setError('');

        try {
            await request('login/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            }, undefined, { redirectOnAuthError: false });
        } catch (err: any) {
            setError(err.message);
            return;
        }

        router.push('/login/verify');
    };

    if (checking) return null;

    return (
        <div className="flex items-center justify-center min-h-screen">
            <div className="w-full max-w-sm p-6 rounded bg-transparent">
                <h1 className="text-xl font-bold mb-4 text-gray-900 dark:text-gray-100">Přihlášení</h1>
                <form onSubmit={handleLogin} className="flex flex-col gap-3">
                    <Input
                        label="Uživatelské jméno"
                        type="text"
                        name="username"
                        value={formData.username}
                        handler={stateHandler}
                    />
                    <Input
                        label="Heslo"
                        type="password"
                        name="password"
                        value={formData.password}
                        handler={stateHandler}
                    />
                    {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
                    <button className="button" type="submit">Přihlásit se</button>
                </form>
            </div>
        </div>
    );
}
