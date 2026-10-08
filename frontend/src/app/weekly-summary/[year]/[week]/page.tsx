import WeekDetail from "@/components/interfaces/WeekDetail";
import { serverRequest } from "@/components/lib/serverRequest";
import { fetchCategoriesAndTags } from "@/components/lib/fetchCategoriesAndTags";
import { Receipt } from "@/app/types/receipt";

export default async function WeekDetailPage({ params }: { params: Promise<{ year: string; week: string }> }) {

    const { week, year } = await params;

    const [[categories, tags], receipts] = await Promise.all([
        fetchCategoriesAndTags(),
        serverRequest<Receipt[]>(`weekly-summary/${year}/${week}/`)
    ]);

    return (
        <div>
            <WeekDetail
                receipts={receipts}
                categories={categories}
                tags={tags}
                week={week}
                year={year}
            />
        </div>
    )
}
