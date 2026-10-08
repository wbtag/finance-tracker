import 'server-only'
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export async function serverRequest<T = unknown>(path: string): Promise<T> {
    const res = await fetch(`${process.env.API_URL ?? 'http://localhost:8000'}/${path}`, {
        headers: { cookie: (await cookies()).toString() },  // forward Django session
        cache: 'no-store',
    });
    if (res.status === 401 || res.status === 403) redirect('/login');
    if (!res.ok) throw new Error(res.statusText);
    return res.json();
}