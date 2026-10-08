'use server'

import { serverRequest } from "@/components/lib/serverRequest";

export async function fetchCategoriesAndTags() {
    return await Promise.all([
        serverRequest<string[]>('categories/'),
        serverRequest<string[]>('tags/')
    ]);
}