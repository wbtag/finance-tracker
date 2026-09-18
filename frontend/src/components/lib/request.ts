function getCookie(name: string): string {
    return document.cookie.match(new RegExp(`(^|; )${name}=([^;]*)`))?.[2] ?? '';
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
        if (response.status === 401 || response.status === 403) {
            if (config?.redirectOnAuthError === false) {
                const body = await response.json().catch(() => null);
                throw new Error(body?.detail ?? response.statusText);
            }
            window.location.href = `/login`;
            return null;
        }
        throw new Error(response.statusText);
    }
    if (response.status != 204) {
        return await response.json();
    } else {
        return null
    }
}
