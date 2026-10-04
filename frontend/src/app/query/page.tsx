import Query from "@/components/interfaces/Query";
import { getConfig } from "@/components/lib/config";
import { fetchCategoriesAndTags } from "@/components/lib/fetchCategoriesAndTags";

export default async function ReceiptPage() {

    const [ categories, tags ] = await fetchCategoriesAndTags();
    const { fiscalMonthStart, sundayWeekStart } = getConfig();

    return (
        <>
            <div>
                <Query
                    fiscalMonthStart={fiscalMonthStart}
                    sundayWeekStart={sundayWeekStart}
                    categories={categories}
                    tags={tags}
                />
            </div>
        </>
    )
}
