export async function request(path: string, requestOptions?: RequestInit, query?: Record<string,string|number>): Promise<any> {
    if (requestOptions && requestOptions?.method != 'GET') {
        requestOptions!.headers = requestOptions!.headers || {};
        requestOptions!.headers['Content-Type'] = 'application/json';
    }

    let url = `${process.env['NEXT_PUBLIC_API_URL']}/${path}`;

    if (query) {
        url += '?';
        const params = [];
        for (const [key, value] of Object.entries(query)) {
            params.push(`${key}=${encodeURIComponent(value)}`);
        }
        url += params.join('&');
    }

    const response = await fetch(url, requestOptions);
    if (!response.ok) {
        throw new Error(response.statusText);
    }
    if (response.status != 204) {
        return await response.json();
    } else {
        return null
    }
}