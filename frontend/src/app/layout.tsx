import "@yaireo/tagify/dist/tagify.css";
import "./globals.css";
import React from "react";
import Navigation from "@/components/ui/Navigation";
import { getConfig } from "@/components/lib/config";
import { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";

export const dynamic = "force-dynamic";

export function generateMetadata(): Metadata {
	return {
		title: getConfig().appName,
		description: "",
	};
}

export default function RootLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<html lang="cs">
			<body style={{ backgroundColor: "#09002f" }}>
				<NextIntlClientProvider>
					<Navigation appName={getConfig().appName} />
					{children}
				</NextIntlClientProvider>
			</body>
		</html>
	);
}
