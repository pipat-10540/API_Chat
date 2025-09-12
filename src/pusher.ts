import Pusher from "pusher";

// Ensure environment variables are loaded (dotenv/config is imported in index.ts)
const {
	PUSHER_APP_ID,
	PUSHER_KEY,
	PUSHER_SECRET,
	PUSHER_CLUSTER,
} = process.env;

// Optional: simple runtime validation to help during development
function requireEnv(name: string, value: string | undefined): string {
	if (!value) {
		throw new Error(`Missing required env var: ${name}`);
	}
	return value;
}

export const pusher = new Pusher({
	appId: requireEnv("PUSHER_APP_ID", PUSHER_APP_ID),
	key: requireEnv("PUSHER_KEY", PUSHER_KEY),
	secret: requireEnv("PUSHER_SECRET", PUSHER_SECRET),
	cluster: PUSHER_CLUSTER || "ap1",
	useTLS: true,
});

export default pusher;

