import { getRequestConfig } from "next-intl/server";
import { getConfig } from "@/components/lib/config";

export default getRequestConfig(async () => {
	const locale = getConfig().language;

	return {
		locale,
		messages: (await import(`../messages/${locale}.json`)).default,
	};
});
