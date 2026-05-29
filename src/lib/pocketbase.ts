import PocketBase from 'pocketbase';

export const pocketBaseUrl = import.meta.env.VITE_POCKETBASE_URL as string | undefined;
export const isPocketBaseConfigured = Boolean(pocketBaseUrl);

const pb = isPocketBaseConfigured ? new PocketBase(pocketBaseUrl) : null;

export default pb;
