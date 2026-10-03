import WeekDetail from "@/components/interfaces/WeekDetail";

export default async function WeekDetailPage({ params }: { params: Promise<{ year: string; week: string }> }) {

    const { week, year } = await params;

    return (
        <div>
            <WeekDetail week={week} year={year} />
        </div>
    )
}
