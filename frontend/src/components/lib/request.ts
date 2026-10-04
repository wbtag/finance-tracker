function getCookie(name: string): string {
    return document.cookie.match(new RegExp(`(^|; )${name}=([^;]*)`))?.[2] ?? '';
}

function collectMessages(value: unknown): string[] {
    if (typeof value === 'string') return [value];
    if (Array.isArray(value)) return value.flatMap(collectMessages);
    if (value && typeof value === 'object') return Object.values(value).flatMap(collectMessages);
    return [];
}

function errorMessage(body: unknown, fallback: string): string {
    if (!body || typeof body !== 'object' || Array.isArray(body)) return fallback;
    const messages = Object.entries(body).flatMap(([field, value]) =>
        collectMessages(value).map((message) =>
            ['detail', 'error', 'non_field_errors'].includes(field) ? message : `${field}: ${message}`
        )
    );
    return messages.length > 0 ? messages.join('\n') : fallback;
}

type RequestConfig = {
    redirectOnAuthError?: boolean;
};

export async function request(path: string, requestOptions?: RequestInit, query?: Record<string,string|number>, config?: RequestConfig): Promise<any> {
    if (requestOptions && requestOptions?.method != 'GET') {
        requestOptions.headers = {
            ...(requestOptions.headers as Record<string, string>),
            'Content-Type': 'application/json',
            'X-CSRFToken': getCookie('csrftoken'),
        };
    }

    let url = `/api/${path.replace(/\/(?=\?|$)/, '')}`;

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
        const body = await response.json().catch(() => null);
        const csrfFailure = typeof body?.detail === 'string' && body.detail.startsWith('CSRF Failed');
        if ((response.status === 401 || response.status === 403) && !csrfFailure && config?.redirectOnAuthError !== false) {
            // eslint-disable-next-line @next/next/no-location-assign-relative-destination
            window.location.href = `/login`;
            return new Promise(() => {});
        }
        throw new Error(errorMessage(body, response.statusText));
    }
    if (response.status != 204) {
        return await response.json();
    } else {
        return null
    }
}
