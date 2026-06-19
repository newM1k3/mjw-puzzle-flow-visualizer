import PocketBase from 'pocketbase';

export const pocketBaseUrl = import.meta.env.VITE_POCKETBASE_URL || 'https://immersive-kit.pockethost.io';
export const isPocketBaseConfigured = Boolean(import.meta.env.VITE_POCKETBASE_URL);

export const pb = new PocketBase(pocketBaseUrl);

export default pb;
