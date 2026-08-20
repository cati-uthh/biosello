const API_PRODUCCION = 'https://biosello-backend.vercel.app/api';

const urlConfigurada = String(process.env.EXPO_PUBLIC_API_BASE_URL || '').trim();

export const API_BASE_URL = (urlConfigurada || API_PRODUCCION).replace(/\/$/, '');
