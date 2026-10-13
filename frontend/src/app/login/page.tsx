"use client";
import { useRouter } from "next/navigation";
import { type SubmitEvent, useEffect, useState } from "react";
import { useStateHandler } from "@/components/lib/useStateHandler";
import { request } from "@/components/lib/request";
import type { SessionDTO } from "@/app/types/session";

export default function LoginPage() {
	const stateHandler = useStateHandler({
		username: "",
		password: "",
	});

	const { formData, handleInput } = stateHandler;
	const router = useRouter();
	const [error, setError] = useState("");
	const [checking, setChecking] = useState(true);

	useEffect(() => {
		request<SessionDTO>("session/").then((session) => {
			if (session.verified) {
				router.replace("/");
			} else if (session.authenticated) {
				router.replace("/login/verify");
			} else {
				setChecking(false);
			}
		});
	}, [router]);

	const handleLogin = async (e: SubmitEvent<HTMLFormElement>) => {
		e.preventDefault();
		setError("");

		try {
			await request(
				"login/",
				{
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify(formData),
				},
				undefined,
				{ redirectOnAuthError: false },
			);
		} catch (err) {
			setError(err instanceof Error ? err.message : String(err));
			return;
		}

		router.push("/login/verify");
	};

	if (checking) return null;

	return (
		<div className="flex min-h-screen items-center justify-center">
			<div className="w-full max-w-sm rounded bg-transparent p-6">
				<h1 className="mb-4 text-xl font-bold text-gray-900 dark:text-gray-100">
					Přihlášení
				</h1>
				<form onSubmit={handleLogin} className="flex flex-col gap-3">
					<input
						className="rounded border bg-white px-3 py-2 dark:bg-gray-800 dark:text-gray-100"
						name="username"
						placeholder="Uživatelské jméno"
						value={formData.username}
						onChange={handleInput}
					/>
					<input
						className="rounded border bg-white px-3 py-2 dark:bg-gray-800 dark:text-gray-100"
						name="password"
						type="password"
						placeholder="Heslo"
						value={formData.password}
						onChange={handleInput}
					/>
					{error && (
						<p className="text-sm text-red-600 dark:text-red-400">{error}</p>
					)}
					<button className="button" type="submit">
						Přihlásit se
					</button>
				</form>
			</div>
		</div>
	);
}
