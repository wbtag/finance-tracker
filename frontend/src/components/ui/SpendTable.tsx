import { Fragment } from "react"

interface SpendTableProps {
    source: Record<string, CategorySpend>;
    other: number;
};

interface CategorySpend {
    spend: number;
    limit: number;
};

export default function SpendTable({ source, other }: SpendTableProps) {

    const rows = Object.entries(source)
        .sort((a,b) => b[1]?.limit - a[1].limit);

    return (
        <table className="w-80">
            <thead>
                <tr>
                    <th className="px-4 py-2 border-b font-medium min-w-[150px]">Kategorie</th>
                    <th className="px-4 py-2 border-b font-medium min-w-[150px]">Útrata</th>
                </tr>
            </thead>
            <tbody>
                {rows.map(([category, { spend, limit }]) => {
                    const over = spend > limit;
                    const progress = limit > 0 ? Math.min(spend / limit, 1) : spend > 0 ? 1 : 0;
                    return (
                        <Fragment key={category}>
                            <tr>
                                <td className="px-4 pt-4">{category}</td>
                                <td className={`px-4 pt-4 text-right tabular-nums`}>
                                    <span className={`${over ? "text-red-500/80" : ""}`}>
                                        {spend}/{limit} Kč
                                    </span>
                                </td>
                            </tr>
                            <tr>
                                <td colSpan={2} className="px-4 pt-1 pb-2">
                                    <div
                                        className="h-[1px] mt-2 w-full rounded-full bg-white/10 overflow-hidden"
                                        role="progressbar"
                                        aria-label={`${category}: útrata vůči limitu`}
                                        aria-valuenow={spend}
                                        aria-valuemin={0}
                                        aria-valuemax={limit}
                                    >
                                        <div
                                            className={`h-full rounded-full transition-[width] duration-300 ${over ? "bg-red-500/70" : "bg-white/50"}`}
                                            style={{ width: `${progress * 100}%` }}
                                        />
                                    </div>
                                </td>
                            </tr>
                        </Fragment>
                    );
                })}
                <tr>
                    <td className="px-4 py-4">Jiné</td>
                    <td className="px-4 py-4 text-right tabular-nums">{other} Kč</td>
                </tr>
            </tbody>
        </table>
    )
}
