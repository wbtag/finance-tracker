import { defineConfig } from "cypress";
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { execFileSync } from 'child_process';
import { createHmac } from 'crypto';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const TOTP_STEP_MS = 30_000;

// RFC 6238 code for a hex key, as django-otp's TOTPDevice computes it (SHA-1, 6 digits).
const totp = (hexKey, counter) => {
	const message = Buffer.alloc(8);
	message.writeBigUInt64BE(BigInt(counter));
	const hmac = createHmac('sha1', Buffer.from(hexKey, 'hex')).update(message).digest();
	const offset = hmac[hmac.length - 1] & 0xf;
	return String((hmac.readUInt32BE(offset) & 0x7fffffff) % 1_000_000).padStart(6, '0');
};

// django-otp rejects a code whose time step was already used, so consecutive logins must step forward.
let lastTotpCounter = -1;

export default defineConfig({
	e2e: {
		baseUrl: 'http://localhost:3000',
		setupNodeEvents(on, config) {
			config.env = { ...config.env, TEST_USER_PASSWORD: process.env.TEST_USER_PASSWORD };
			// Must match the API's OTP_REQUIRED, which is read from the same environment / .env.
			config.expose = {
				...config.expose,
				OTP_REQUIRED: /^(true|1|yes|on)$/i.test(process.env.OTP_REQUIRED ?? ''),
			};
			on('task', {
				resetDatabase() {
					execFileSync('pnpm', ['--dir', '..', 'db:reset:e2e'], {
						stdio: 'pipe',
					});
					// The device is recreated by the seed, with no used time steps.
					lastTotpCounter = -1;

					return null;
				},
				async totpCode() {
					const key = process.env.TEST_USER_TOTP_KEY;
					if (!key) {
						throw new Error('The TEST_USER_TOTP_KEY environment variable is not set.');
					}

					const counter = Math.max(Math.floor(Date.now() / TOTP_STEP_MS), lastTotpCounter + 1);
					// The device accepts one step of drift; wait if even that is used up.
					const waitMs = (counter - 1) * TOTP_STEP_MS - Date.now();
					if (waitMs > 0) {
						await new Promise((resolve) => setTimeout(resolve, waitMs));
					}

					lastTotpCounter = counter;
					return totp(key, counter);
				},
			});
			return config;
		},
	},
});
