'use server'
import { Db, MongoClient, ObjectId } from "mongodb";
import { getWeek } from "date-fns";

export interface BalanceDoc {
    createdAt: number;
    updatedAt: number;
    balance: number;
    offset: number;
}

export interface IncomeDoc {
    amount: number;
    description: string;
    type: string;
    createdAt: number;
}

export interface UserDoc {
    username: string;
    passwordHash: string;
    totpSecret: string;
}

export interface Timeframe {
    period?: string;
    from?: string;
    to?: string;
    timestampFrom?: number;
}

export interface CategorySpend {
    spend: number;
    limit: number;
}

export interface SpendSummary {
    totalSpend: number;
    other: number;
    categories: Record<string, CategorySpend>;
}


export type ActionResult = { ok: true } | { ok: false; message: string };

const url = process.env['MongoDbUrl'];
let client: MongoClient | undefined;

export async function getDatabase(): Promise<Db> {
    if (!client) {
        client = new MongoClient(url!);
        await client.connect();
    }
    const db = client.db("finances");
    return db
}

function timeframeToDateFilter(timeframe: Timeframe): { $gte: number; $lt?: number } {
    if (timeframe.from && timeframe.to) {
        const from = Math.floor(new Date(timeframe.from).setHours(0));
        const to = Math.floor(new Date(timeframe.to).setHours(24));
        return { $gte: from, $lt: to };
    } else if (timeframe.timestampFrom) {
        const from = new Date(timeframe.timestampFrom).getTime();
        const to = new Date().getTime();
        return { $gte: from, $lt: to };
    } else {
        throw new Error('Period, cutoff point, or from/to must be specified in the timeframe.');
    }
}

function parseTagFilter(tags: RawTags | null | undefined): string[] {
    if (tags && tags.length > 0) {
        const parsed: Array<TagifyTag | string> = typeof tags === 'string' ? JSON.parse(tags) : tags;
        return parsed.map((tag) => (typeof tag === 'string' ? tag : tag.value).trim().toLowerCase());
    }
    return [];
}

export async function getSpend(timeframe: Timeframe, tags: RawTags | null, categories: string[]): Promise<number> {

    const db = await getDatabase();

    const findObj = { date: timeframeToDateFilter(timeframe) };
    const tagFilter = parseTagFilter(tags);

    const output = await db.collection<ReceiptDoc>("receipts").find(findObj).toArray();

    const spend = output.reduce((acc, currentItem) => {
        if (categories.length === 0 || categories.includes(currentItem.category)) {
            if (currentItem.type === 'extended') {
                const items = currentItem.items ?? [];
                const filteredItems: ReceiptItem[] = [];

                for (const item of items) {
                    const itemTags = currentItem.tags.concat(item.tags);
                    if (tagFilter.every(tag => itemTags.includes(tag))) {
                        filteredItems.push(item);
                    }
                }

                acc += filteredItems.reduce((acc, curr) => acc += curr.amount, 0);
            } else {
                if (tagFilter.every(tag => currentItem.tags.includes(tag))) {
                    acc += currentItem.amount;
                }
            }
        }
        return acc
    }, 0)

    return spend;
};

async function getSpendByCategory(envVar: string, findObj: Record<string, unknown>): Promise<SpendSummary> {
    const categoriesJson = process.env[envVar] || '';
    const categories: Record<string, number> = JSON.parse(categoriesJson);

    const categoryNames = Object.keys(categories);

    const spendObject = categoryNames.reduce<Record<string, CategorySpend>>((acc, curr) => {
        acc[curr] = {
            spend: 0,
            limit: categories[curr]
        }
        return acc
    }, {});

    const db = await getDatabase();

    const receipts = await db.collection<ReceiptDoc>("receipts").find(findObj).toArray();

    const output: SpendSummary = {
        totalSpend: 0,
        other: 0,
        categories: {}
    }

    output.categories = receipts.reduce((acc, curr) => {
        const { amount, category, type } = curr;

        if (type != 'mandatory') {
            output.totalSpend += amount;

            if (!category || !categoryNames.includes(category) || category === 'Jiné') {
                output.other += amount;
            } else {
                acc[category].spend += amount;
            }
        }

        return acc
    }, spendObject);

    return output
}

export async function getWeeklySpendByCategory(): Promise<SpendSummary> {
    const date = new Date();
    const week = getWeek(date);

    return await getSpendByCategory('WeeklySpendCategories', { week: { $eq: week } });
}

export async function getMonthlySpendByCategory(): Promise<SpendSummary> {
    const nowDate = new Date();
    const day = nowDate.getDate();

    const fiscalMonthStart = parseInt(process.env['NEXT_PUBLIC_FiscalMonthStart'] || '') || 8;

    const from = new Date();
    from.setDate(fiscalMonthStart);

    if (day < fiscalMonthStart) {
        from.setMonth(from.getMonth() - 1);
    }

    const ts = from.setHours(0, 0, 0, 0);

    return await getSpendByCategory('MonthlySpendCategories', { date: { $gte: ts } });
}

export async function getTags(): Promise<string[]> {
    const db = await getDatabase();

    const output = await db.collection<ReceiptDoc>("receipts").aggregate<{ uniqueTags: string[] }>([
        { $unwind: "$tags" },
        { $group: { _id: null, uniqueTags: { $addToSet: "$tags" } } },
        { $project: { _id: 0, uniqueTags: 1 } }
    ]).toArray();

    return output[0].uniqueTags;
};

export async function getReceipts(timeframe: Timeframe, tags: RawTags | null, categories: string[], offset?: number, limit?: number): Promise<Receipt[]> {
    const db = await getDatabase();

    const findObj = { date: timeframeToDateFilter(timeframe) };
    const tagFilter = parseTagFilter(tags);

    const receipts = await db.collection<ReceiptDoc>("receipts").find(findObj).sort({ date: -1 }).toArray()

    const output = receipts.reduce<Receipt[]>((acc, currentItem) => {
        if (categories.length === 0 || categories.includes(currentItem.category)) {
            if (currentItem.type === 'extended') {
                const { _id, items, amount, date, ...receipt } = currentItem;
                let filteredItems: ReceiptItem[] = [];

                if (tagFilter.length > 0) {
                    for (const item of items ?? []) {
                        const itemTags = currentItem.tags.concat(item.tags);
                        if (tagFilter.every(tag => itemTags.includes(tag))) {
                            filteredItems.push(item);
                        }
                    }
                } else {
                    filteredItems = items ?? [];
                }

                const filteredAmount = filteredItems.reduce((acc, curr) => acc += curr.amount, 0);

                if (filteredItems.length > 0) {
                    acc.push({
                        id: _id.toHexString(),
                        date: new Date(date).toISOString().split('T')[0],
                        ...receipt,
                        items: filteredItems,
                        amount: filteredAmount
                    })
                }
            } else {
                const { _id, date, ...receipt } = currentItem;
                if (tagFilter.length === 0 || tagFilter.every(tag => currentItem.tags.includes(tag))) {
                    acc.push({
                        id: _id.toHexString(),
                        date: new Date(date).toISOString().split('T')[0],
                        ...receipt
                    });
                }
            }
        }

        return acc
    }, []);

    return output
}

export async function getSpendByWeek(year: number | string): Promise<WeekSpend[]> {
    const db = await getDatabase();

    const spendByWeek = await db.collection<ReceiptDoc>("receipts").aggregate<WeekSpend>([
        {
            $match: {
                year: { $eq: parseInt(String(year)) }
            }
        },
        {
            $group: {
                _id: { $max: "$week" },
                amount: { $sum: "$amount" },
                date: { $max: "$date" }
            }
        },
        { $sort: { date: -1 } },
        {
            $project: {
                _id: 1,
                amount: 1,
            }
        },
        { $skip: 0 },
        { $limit: 20 }
    ]).toArray();

    return spendByWeek
}

export async function getWeeklySpendDetail(week: number | string, year: number | string): Promise<Receipt[]> {
    const db = await getDatabase();
    const receipts = await db.collection<ReceiptDoc>("receipts").find({ year: parseInt(String(year)), week: parseInt(String(week)) }).toArray();

    const output = receipts.reduce<Receipt[]>((acc, curr) => {
        const { _id, ...receipt } = curr;
        acc.push({
            id: _id.toHexString(),
            ...receipt
        });
        return acc;
    }, []);

    return output
}

export async function createNewReceipt(formData: NewReceiptInput): Promise<ActionResult> {
    if (formData.receiptType && formData.date) {

        const currentDate = new Date();
        let receiptDate = new Date(formData.date);

        if (
            receiptDate.getDate() === currentDate.getDate() &&
            receiptDate.getMonth() === currentDate.getMonth() &&
            receiptDate.getFullYear() === currentDate.getFullYear()
        ) {
            receiptDate = currentDate;
        }

        const receiptDateTimestamp = receiptDate.getTime();

        const week = getWeek(receiptDate, { weekStartsOn: 0 });
        let year = receiptDate.getFullYear();

        if (receiptDate.getMonth() === 11 && week === 1) {
            year = receiptDate.getFullYear() + 1;
        }

        const dateCreated = Date.now();

        const { tags, amount, description, category } = formData;
        const tagJson: Array<TagifyTag | string> = typeof tags === 'string' ? JSON.parse(tags) : tags ?? [];

        if (category && amount && description) {

            const cleanedTags: string[] = [];

            for (const tag of tagJson) {
                const cleanedTag = (typeof tag === 'string' ? tag : tag.value).trim().toLowerCase();
                cleanedTags.push(cleanedTag);
            };

            const typeSafeAmount = typeof amount === 'number' ? amount : parseInt(amount);

            const body: Omit<ReceiptDoc, '_id'> = {
                type: formData.receiptType,
                category,
                date: receiptDateTimestamp,
                dateCreated,
                week,
                year,
                tags: cleanedTags,
                amount: typeSafeAmount,
                description
            };

            if (formData.receiptType === 'extended') {

                const items = formData.items ?? [];

                if (items.length > 0) {

                    body.items = [];

                    for (const item of items) {

                        if (typeof item.tags === 'object') {
                            return {
                                ok: false,
                                message: 'Ke každé položce v rozšířené útratě musí být uvedena alespoň jedna značka.'
                            }
                        }

                        if (item.amount === 0) {
                            return {
                                ok: false,
                                message: 'Ke každé položce v rozšířené útratě musí být uvedena částka.'
                            }
                        }

                        const itemTagJson: TagifyTag[] = JSON.parse(item.tags);
                        const itemTags = itemTagJson.map(({ value }) => value.trim().toLowerCase());

                        const itemAmount = typeof item.amount === 'number' ? item.amount : parseInt(item.amount);

                        body.items.push({
                            amount: itemAmount,
                            tags: itemTags,
                        })
                    };
                }
            }

            const db = await getDatabase();
            await db.collection<ReceiptDoc>("receipts").insertOne(body as ReceiptDoc);

            return {
                ok: true
            }
        } else {
            return {
                ok: false,
                message: 'Kategorie, datum, částka a popis jsou povinné parametry.'
            }
        }
    } else {
        return {
            ok: false,
            message: 'Server neobdržel data v očekávaném formátu'
        }
    };
};

export async function updateReceipt(formData: UpdateReceiptInput): Promise<ActionResult> {

    const { id, amount, description, category, type, date, items } = formData;
    const rawTags: RawTags = formData.tags ? formData.tags : [];
    const parsedTags: Array<TagifyTag | string> = typeof rawTags === "string" ? JSON.parse(rawTags) : rawTags;

    const tags = parsedTags.reduce<string[]>((acc, curr) => {
        const tag = typeof curr === 'string' ? curr : curr.value;
        acc.push(tag.trim().toLowerCase());
        return acc;
    }, []);

    if (category && amount && description) {

        const typeSafeAmount = typeof amount === 'number' ? amount : parseInt(amount);

        const body: Partial<Omit<ReceiptDoc, '_id'>> = {
            date: new Date(date).getTime(),
            category,
            tags,
            amount: typeSafeAmount,
            description
        };

        if (type === 'extended') {

            let amountSum = 0;

            if (items && items.length > 0) {

                const bodyItems: ReceiptItem[] = [];
                body.items = bodyItems;

                for (const item of items) {

                    if (Array.isArray(item.tags) && item.tags.length === 0) {
                        return {
                            ok: false,
                            message: 'Ke každé položce v rozšířené útratě musí být uvedena alespoň jedna značka.'
                        }
                    }

                    if (item.amount === 0) {
                        return {
                            ok: false,
                            message: 'Ke každé položce v rozšířené útratě musí být uvedena částka.'
                        }
                    }

                    let itemTags: string[];

                    try {
                        const tagJson: TagifyTag[] = JSON.parse(item.tags as string);
                        itemTags = tagJson.map(({ value }) => value.trim().toLowerCase());
                    } catch (e) {
                        itemTags = item.tags as string[];
                    }

                    const itemAmount = typeof item.amount === 'number' ? item.amount : parseInt(item.amount);
                    amountSum += itemAmount;

                    bodyItems.push({
                        amount: itemAmount,
                        tags: itemTags,
                    });
                };
            }

            if (typeSafeAmount != amountSum) {
                return {
                    ok: false,
                    message: 'Součet hodnot položek se musí rovnat celkové hodnotě účtenky.'
                }
            }
        }

        const db = await getDatabase();
        await db.collection<ReceiptDoc>("receipts").updateOne(
            { _id: new ObjectId(id) },
            { $set: body }
        )

        return {
            ok: true
        }
    } else {
        return {
            ok: false,
            message: 'Kategorie, datum, částka a popis jsou povinné parametry.'
        }
    };
}

export async function deleteReceipt(id: string): Promise<ActionResult> {
    if (id) {
        try {
            const db = await getDatabase();
            await db.collection<ReceiptDoc>("receipts").deleteOne(
                { _id: new ObjectId(id) }
            )

            return {
                ok: true
            }
        } catch (e) {
            const message = e instanceof Error ? e.message : String(e);
            return {
                ok: false,
                message: `Při mazání účtenky došlo k chybě: ${message}`
            }
        }
    } else {
        return {
            ok: false,
            message: 'Při mazání účtenky došlo k chybě: Chybné ID účtenky'
        }
    }
}

export async function getBalance(balanceOnly: true): Promise<number>;
export async function getBalance(balanceOnly?: false): Promise<BalanceData>;
export async function getBalance(balanceOnly?: boolean): Promise<number | BalanceData> {
    const db = await getDatabase();

    const latestBalanceRecord = await db.collection<BalanceDoc>("balances")
        .find({}, { sort: { createdAt: -1 }, limit: 1 })
        .toArray();

    if (latestBalanceRecord[0]) {
        const { createdAt, balance } = latestBalanceRecord[0];

        const spend = await getSpend({ timestampFrom: createdAt }, null, []);
        const income = await getIncome({ timestampFrom: createdAt });

        if (balanceOnly) {
            return balance + income - spend;
        } else {
            return {
                lastBalance: balance,
                lastBalanceDate: createdAt,
                estimatedBalance: balance + income - spend,
                spendSinceLastBalance: spend,
                incomeSinceLastBalance: income
            }
        }
    } else {
        if (balanceOnly) {
            return 0;
        } else {
            return {
                lastBalance: 0,
                lastBalanceDate: 0,
                estimatedBalance: 0,
                spendSinceLastBalance: 0,
                incomeSinceLastBalance: 0
            }
        }
    }
}

export async function logNewBalance(balance: number | string, expectedBalance: number): Promise<BalanceData> {

    const numericBalance = typeof balance === 'string' ? parseInt(balance) : balance;

    const body: BalanceDoc = {
        createdAt: Date.now(),
        updatedAt: Date.now(),
        balance: numericBalance,
        offset: numericBalance - expectedBalance
    };

    const db = await getDatabase();
    await db.collection<BalanceDoc>("balances").insertOne(body);

    return {
        lastBalance: body.balance,
        lastBalanceDate: new Date(),
        estimatedBalance: body.balance,
        spendSinceLastBalance: 0
    }
}

export async function logIncome(formData: { amount: number | string; description: string; type: string }): Promise<void> {
    const db = await getDatabase();

    const { description, type } = formData;
    const amount = typeof formData.amount === 'string' ? parseInt(formData.amount) : formData.amount;

    await db.collection<IncomeDoc>("income").insertOne({
        amount,
        description,
        type,
        createdAt: Date.now()
    })
}

export async function getIncome(timeframe: Timeframe): Promise<number> {
    const db = await getDatabase();

    const findObj = { createdAt: timeframeToDateFilter(timeframe) };

    const output = await db.collection<IncomeDoc>("income").find(findObj).toArray();

    const income = output.reduce((acc, currentItem) => acc + currentItem.amount, 0)

    return income;
}

export async function getYears(): Promise<number[]> {
    const db = await getDatabase();
    return await db.collection<ReceiptDoc>("receipts").distinct("year");
}
