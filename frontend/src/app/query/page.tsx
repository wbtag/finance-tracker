import Query from "@/components/interfaces/Query";

export default async function ReceiptPage({ searchParams }: { searchParams: Promise<{ period?: string }> }) {

    const params = await searchParams;

    return (
        <>
            <div>
                <Query period={params.period} />
            </div>
        </>
    )
}
