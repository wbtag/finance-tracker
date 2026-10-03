import Image from "next/image";

interface CategoryPickerProps {
    categories: string[];
    activeCategories: string[];
    setActiveCategories: (categories: string[]) => void;
}

export default function CategoryPicker({ categories, activeCategories, setActiveCategories }: CategoryPickerProps) {

    const handleCategoryInput = (category: string) => {
        const updatedCategories = activeCategories.includes(category) ?
            activeCategories.filter((cat) => cat != category)
            : [...activeCategories, category];
        setActiveCategories(updatedCategories);
    };

    const handleSelectAllCategories = () => {
        const updatedCategories =
            activeCategories.length < categories.length ? categories : [];
        setActiveCategories(updatedCategories);
    };

    return (
        <>
            <div className="flex flex-wrap gap-1 justify-center pt-2">
                {
                    categories.map((category) => (
                        <button
                            type="button"
                            key={category}
                            onClick={() => handleCategoryInput(category)}
                            onDoubleClick={handleSelectAllCategories}
                            className={`button ${activeCategories.includes(category) ?
                                "button--active" : ""}`}
                        >{category}</button>
                    ))
                }
                <button className="cursor-pointer pl-2" onClick={handleSelectAllCategories}>
                    <Image
                        src={activeCategories.length != categories.length ?
                            '/icons/check-circle.svg' : '/icons/circle-xmark.svg'}
                        alt="Select all" width={15} height={15} />
                </button>
            </div>
        </>
    )
}
