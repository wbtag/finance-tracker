export interface CategorySpend {
    spend: number;
    limit: number;
}

export interface SpendDTO {
    balance: number;
    weekly_spend: number;
    monthly_spend: number;
    weekly_spend_categories: Record<string, CategorySpend>;
    monthly_spend_categories: Record<string, CategorySpend>;
    other: {
        week: number;
        month: number;
    };
}

export interface WeekSpendDTO {
    number: number;
    amount: number;
}