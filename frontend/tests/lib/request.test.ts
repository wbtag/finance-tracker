import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { request } from "@/components/lib/request";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let response: Record<string, any> | null = {};
let status = 200;
let ok = true;

const settleState = (promise: Promise<unknown>, timeout = 50) =>
	Promise.race([
		promise.then(
			() => "settled",
			() => "settled",
		),
		new Promise((resolve) => setTimeout(() => resolve("pending"), timeout)),
	]);

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const fetchMock = vi.fn((_url: string, _options?: RequestInit) =>
	Promise.resolve({
		ok,
		status,
		json: () => Promise.resolve(response),
	}),
);

beforeEach(() => {
	status = 200;
	ok = true;
	response = {
		param: "test",
	};
	fetchMock.mockClear();
	vi.stubGlobal("fetch", fetchMock);
	vi.stubGlobal("location", { href: "" });
});

afterEach(() => {
	vi.unstubAllGlobals();
});

describe("request", () => {
	it("returns json on valid response", async () => {
		response = {
			param: "test",
		};
		const data = await request("test/endpoint");
		expect(data).to.deep.equal(response);
	});
	it("returns null on 204 response", async () => {
		response = {
			param: "test",
		};
		status = 204;
		const data = await request("test/endpoint");
		expect(data).to.deep.equal(null);
	});
	it.each([
		{ code: 401, error: 'Unauthorized' },
		{ code: 403, error: 'Forbidden' },
	])('redirects to login and never settles on $code response', async ({ code, error }) => {
		response = { error };
		ok = false;
		status = code;
		expect(await settleState(request('test/endpoint'))).toBe('pending');
		expect(window.location.href).toBe('/login');
	});
	it('encodes query parameters', async () => {
		await request('test/endpoint', { method: 'GET' }, {
			origin: 'test function',
			page: 2
		});
		const [url] = fetchMock.mock.calls[0];
		expect(url).toEqual("/api/test/endpoint?origin=test%20function&page=2");
	});
	it("strips trailing slash from url", async () => {
		await request("test/endpoint/");
		const [url] = fetchMock.mock.calls[0];
		expect(url.endsWith("/")).not.toBe(true);
	});
	it("sends csrf header only on non-GET requests", async () => {
		await request("test/endpoint", { method: "GET" });
		await request("test/endpoint", { method: "POST" });
		const getOptions = fetchMock.mock.calls[0][1];
		const postOptions = fetchMock.mock.calls[1][1];

		expect(getOptions!.headers).not.toBeDefined();
		expect(postOptions!.headers).toBeDefined();
		expect(Object.keys(postOptions!.headers!)).to.include("X-CSRFToken");
	});
	it("throws instead of redirecting on 401 response when redirectOnAuthError is false", async () => {
		response = {
			error: "Unauthorized",
		};
		ok = false;
		status = 401;
		await expect(
			request("test/endpoint", undefined, undefined, {
				redirectOnAuthError: false,
			}),
		).rejects.toThrow("Unauthorized");
		expect(window.location.href).toBe("");
	});
	it("throws on CSRF failure", async () => {
		response = {
			detail: "CSRF Failed: test error",
		};
		status = 403;
		ok = false;
		await expect(request("test/endpoint")).rejects.toThrow(
			"CSRF Failed: test error",
		);
		expect(window.location.href).toBe("");
	});
	it("throws on non-auth client failure", async () => {
		status = 404;
		ok = false;
		response = {
			detail: "Not found",
		};
		await expect(request("test/endpoint")).rejects.toThrow("Not found");
	});
	it("throws on server failure", async () => {
		status = 500;
		ok = false;
		response = {
			detail: "Internal Server Error",
		};
		await expect(request("test/endpoint")).rejects.toThrow(
			"Internal Server Error",
		);
	});
	it("flattens complex error messages", async () => {
		status = 500;
		ok = false;
		response = {
			detail: "Bad Request",
			error: [
				"Amount must be a positive integer",
				"Description must not be empty",
			],
			request_id: "123",
		};
		await expect(request("test/endpoint")).rejects.toThrow(
			"Bad Request\nAmount must be a positive integer\nDescription must not be empty\nrequest_id: 123",
		);
	});
});
