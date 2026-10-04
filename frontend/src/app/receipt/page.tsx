import NewReceipt from "@/components/interfaces/NewReceipt";
import { fetchCategoriesAndTags } from "@/components/lib/fetchCategoriesAndTags";

export default async function ReceiptPage() {

    const [categories, tags] = await fetchCategoriesAndTags();

    return (
        <>
            <div>
                <NewReceipt categories={categories} tags={tags} />
            </div>
        </>
    )
}
