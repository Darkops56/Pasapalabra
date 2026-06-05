// Configuración de las URLs para la API backend y el servidor de WebSockets (Socket.IO).
// Si cambias el puerto en el servidor (server/index.js), edita este archivo.

const BACKEND_PORT = '10000';
const HOST = 'https://pasapalabra-1.onrender.com';

export const API_BASE_URL = `http://${HOST}:${BACKEND_PORT}`;
export const SOCKET_URL = `http://${HOST}:${BACKEND_PORT}`;
