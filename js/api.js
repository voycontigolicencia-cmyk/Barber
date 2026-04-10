/* ================================================================
   BARBERÍA PRO — js/api.js
   ⚠️ EDITA ESTAS LÍNEAS antes de subir a GitHub
   ================================================================ */

const API_URL   = 'https://script.google.com/macros/s/AKfycbw8EBOzpaUymqrjMPbixF5Deb4X2S9vM9uw8yobYC9yAkc0dmOzKGbU3FB9yrdhvdMWzQ/exec';
const API_TOKEN = 'barberia-pro-2025-secret';

// Logo: sube tu imagen en https://postimg.cc y pega la URL directa aquí
const LOGO_URL       = ''; // ← ej: 'https://i.postimg.cc/L5G6DhYh/Barber.png'
const NEGOCIO_NOMBRE = 'Barbería Pro2';

async function apiGet(accion, params) {
  try {
    const qs  = new URLSearchParams({ accion, ...params }).toString();
    const res = await fetch(`${API_URL}?${qs}`);
    return res.json();
  } catch(e) { return { ok:false, error:e.message }; }
}

async function apiPost(accion, params) {
  try {
    const res = await fetch(API_URL, {
      method:  'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body:    JSON.stringify({ accion, ...params })
    });
    return res.json();
  } catch(e) { return { ok:false, error:e.message }; }
}

async function apiAdmin(accion, params) {
  try {
    const res = await fetch(API_URL, {
      method:  'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body:    JSON.stringify({ accion, token: API_TOKEN, ...params })
    });
    return res.json();
  } catch(e) { return { ok:false, error:e.message }; }
}

const API = {
  getServicios:      ()             => apiGet('getServicios', {}),
  getEmpleados:      ()             => apiGet('getEmpleados', {}),
  getDisponibilidad: (fecha, srvID) => apiGet('getDisponibilidad', { fecha, servicioID: srvID }),
  crearReserva:      (payload)      => apiPost('crearReserva', { payload }),
  cancelarReserva:   (reservaID)    => apiPost('cancelarReserva', { reservaID, canceladoPor:'cliente' }),
  getDashboard:      ()             => apiAdmin('getDashboard', {}),
  getReservasPorDia: (fecha)        => apiAdmin('getReservasPorDia', { params:{ fecha } }),
  actualizarEstado:  (rID, estado)  => apiAdmin('actualizarEstado', { params:{ reservaID:rID, estado } }),
  cancelarAdmin:     (reservaID)    => apiAdmin('cancelarReserva', { reservaID, canceladoPor:'admin' }),
};
