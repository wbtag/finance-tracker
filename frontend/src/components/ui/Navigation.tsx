"use client";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Navigation({ appName }: { appName: string }) {
	const [open, setOpen] = useState(false);

	return (
		<>
			<DesktopNavigation appName={appName} />
			<MobileNavigation
				onClick={() => setOpen(!open)}
				open={open}
				setOpen={setOpen}
				appName={appName}
			/>
		</>
	);
}

interface MobileNavigationProps {
	onClick: () => void;
	open: boolean;
	setOpen: (open: boolean) => void;
	appName: string;
}

function MobileNavigation({
	onClick,
	open,
	setOpen,
	appName,
}: MobileNavigationProps) {
	const path = usePathname();

	if (path.includes("login")) {
		return null;
	}

	return (
		<>
			<div className="md:hidden">
				<button onClick={onClick} className="p-4">
					<Menu size={24} />
				</button>
				<aside
					className={`absolute top-0 left-0 z-50 h-full w-full transform bg-[#09002f] pt-4 pr-2 pl-8 transition-transform duration-300 ${open ? "translate-x-0" : "-translate-x-full"}`}
					onClick={(e) => e.stopPropagation()}
				>
					<div className="flex flex-row items-center pb-2">
						<h2 className="w-100 text-xl font-semibold text-white/90">
							{appName}
						</h2>
						<div className="flex justify-end">
							<button onClick={() => setOpen(false)} className="p-2">
								<X size={24} />
							</button>
						</div>
					</div>
					<ul className="flex flex-col gap-4 text-lg text-white/80">
						<li>
							<Link href="/" onClick={() => setOpen(false)}>
								Přehled
							</Link>
						</li>
						<li>
							<Link href="/receipt" onClick={() => setOpen(false)}>
								Nová útrata
							</Link>
						</li>
						<li>
							<Link href="/query" onClick={() => setOpen(false)}>
								Detail útrat
							</Link>
						</li>
						<li>
							<Link href="/weekly-summary" onClick={() => setOpen(false)}>
								Týdenní přehled
							</Link>
						</li>
						<li>
							<Link href="/balance" onClick={() => setOpen(false)}>
								Zůstatek
							</Link>
						</li>
					</ul>
				</aside>
			</div>
		</>
	);
}

function DesktopNavigation({ appName }: { appName: string }) {
	const path = usePathname();

	if (path.includes("login")) {
		return null;
	}

	return (
		<>
			<nav className="hidden items-center border-b-1 border-white/40 p-4 shadow md:flex">
				<h1 className="pr-2 pl-6 text-xl font-semibold text-white/90">
					{appName}
				</h1>
				<ul className="flex gap-10 pl-20 text-white/80">
					<li>
						<Link href="/">Přehled</Link>
					</li>
					<li>
						<Link href="/receipt">Nová útrata</Link>
					</li>
					<li>
						<Link href="/query">Detail útrat</Link>
					</li>
					<li>
						<Link href="/weekly-summary">Týdenní přehled</Link>
					</li>
					<li>
						<Link href="/balance">Zůstatek</Link>
					</li>
				</ul>
			</nav>
		</>
	);
}
