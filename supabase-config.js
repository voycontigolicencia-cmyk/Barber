/* ================================================================
   BARBERÍA PRO — supabase-config.js
   Configuración y cliente de Supabase
   
   ⚠️ INSTRUCCIONES:
   1. Ve a https://supabase.com/dashboard → tu proyecto → Settings → API
   2. Copia la URL del proyecto y la anon key
   3. Reemplaza los valores abajo
   ================================================================ */

// ══════════════════════════════════════════════════════════════════
// CONFIGURACIÓN SUPABASE
// ══════════════════════════════════════════════════════════════════

const SUPABASE_URL = 'https://znitsnhfesbapyobcwvo.supabase.co';  // ← Reemplaza
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpuaXRzbmhmZXNiYXB5b2Jjd3ZvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU4NDAyNzgsImV4cCI6MjA5MTQxNjI3OH0.ThKUoM5ojRzINh_ItH7Mvp-sBb8on--xG8iCTDgTLK0';  // ← Reemplaza con tu anon key

// Token para acciones admin (debe coincidir con el que configures en Edge Functions)
const ADMIN_TOKEN = 'barberia-pro-2025-secret';

// ══════════════════════════════════════════════════════════════════
// CONFIGURACIÓN DEL NEGOCIO
// ══════════════════════════════════════════════════════════════════

const CONFIG = {
  nombre:     'Barbería Pro',
  email:      'from: 'Barbería Pro <anything@chaukul.resend.app>',
  telefono:   '+56 9 1234 5678',
  direccion:  'Calle Ejemplo 123, Santiago',
  horario:    'Lun–Sáb: 9:00 – 20:00',
  whatsapp:   'https://wa.me/56912345678',
  instagram:  'https://instagram.com/barberiapro',
  mapsUrl:    'https://maps.app.goo.gl/TU_LINK',
  lat:        -33.4569,
  lng:        -70.6483,
  timezone:   'America/Santiago',
  
  // Horarios del negocio
  horaApertura: 9,
  horaCierre:   20,
  slotMinutos:  15,
  
  // Logo (opcional - sube a postimg.cc o similar)
  logoUrl: ''
};

// Estados de reserva
const ESTADOS = {
  CONFIRMADA:  'Confirmada',
  CANCELADA:   'Cancelada',
  COMPLETADA:  'Completada',
  PENDIENTE:   'Pendiente'
};

// ══════════════════════════════════════════════════════════════════
// INICIALIZACIÓN DEL CLIENTE SUPABASE
// ══════════════════════════════════════════════════════════════════

// Verificar que la librería está cargada
if (typeof supabase === 'undefined') {
  console.error('❌ Supabase SDK no cargado. Asegúrate de incluir el script antes de este archivo.');
}

// Crear cliente (usando nombre diferente para evitar colisión)
const db = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

console.log('✅ Supabase configurado:', SUPABASE_URL);

// ══════════════════════════════════════════════════════════════════
// API - SERVICIOS
// ══════════════════════════════════════════════════════════════════

const API = {
  
  // ─────────────────────────────────────────────────────────────────
  // SERVICIOS
  // ─────────────────────────────────────────────────────────────────
  
  async getServicios() {
    try {
      const { data, error } = await db
        .from('servicios')
        .select('*')
        .eq('activo', true)
        .order('categoria', { ascending: true });
      
      if (error) throw error;
      
      // Mapear nombres de columnas para compatibilidad
      return data.map(s => ({
        id:           s.id,
        nombre:       s.nombre,
        duracion:     s.duracion_min,
        precio:       s.precio,
        categoria:    s.categoria,
        requiereSkill: s.requiere_skill || '',
        esSesion:     s.es_sesion,
        maxSesiones:  s.max_sesiones,
        descripcion:  s.descripcion
      }));
    } catch (e) {
      console.error('Error getServicios:', e);
      return [];
    }
  },
  
  // ─────────────────────────────────────────────────────────────────
  // EMPLEADOS
  // ─────────────────────────────────────────────────────────────────
  
  async getEmpleados() {
    try {
      const { data, error } = await db
        .from('empleados')
        .select('*')
        .eq('activo', true)
        .order('nombre', { ascending: true });
      
      if (error) throw error;
      
      return data.map(e => ({
        id:          e.id,
        nombre:      e.nombre,
        email:       e.email,
        skills:      e.skills || [],
        activo:      e.activo,
        color:       e.color || '#6B7280',
        foto:        e.foto_url || '',
        descripcion: e.descripcion || ''
      }));
    } catch (e) {
      console.error('Error getEmpleados:', e);
      return [];
    }
  },
  
  // ─────────────────────────────────────────────────────────────────
  // DISPONIBILIDAD
  // ─────────────────────────────────────────────────────────────────
  
  async getDisponibilidad(fecha, servicioID) {
    try {
      // 1. Obtener servicio
      const servicios = await this.getServicios();
      const servicio = servicios.find(s => s.id === servicioID);
      if (!servicio) return { ok: false, error: 'Servicio no encontrado' };
      
      // 2. Obtener empleados (filtrar por skill si es necesario)
      let empleados = await this.getEmpleados();
      if (servicio.requiereSkill) {
        empleados = empleados.filter(e => 
          e.skills.includes(servicio.requiereSkill)
        );
      }
      
      // 3. Calcular día de la semana
      const fechaObj = new Date(fecha + 'T12:00:00');
      const diaSemana = fechaObj.getDay();
      
      // 4. Obtener horarios de todos los empleados para ese día
      const { data: horarios, error: errHorarios } = await db
        .from('horarios')
        .select('*')
        .eq('dia_semana', diaSemana)
        .eq('disponible', true);
      
      if (errHorarios) throw errHorarios;
      
      // 5. Obtener reservas activas para esa fecha
      const { data: reservas, error: errReservas } = await db
        .from('reservas')
        .select('*')
        .eq('fecha', fecha)
        .neq('estado', ESTADOS.CANCELADA);
      
      if (errReservas) throw errReservas;
      
      // 6. Calcular slots disponibles para cada empleado
      const resultado = {};
      
      for (const emp of empleados) {
        const horario = horarios.find(h => h.empleado_id === emp.id);
        if (!horario) continue;
        
        const reservasEmp = reservas.filter(r => r.empleado_id === emp.id);
        const slots = this._calcularSlots(
          horario.hora_inicio,
          horario.hora_fin,
          servicio.duracion,
          reservasEmp
        );
        
        resultado[emp.id] = {
          empleado: emp,
          slots: slots,
          hayDisponibilidad: slots.some(s => s.disponible)
        };
      }
      
      return { ok: true, servicio, fecha, empleados: resultado };
      
    } catch (e) {
      console.error('Error getDisponibilidad:', e);
      return { ok: false, error: e.message };
    }
  },
  
  // Calcular slots disponibles
  _calcularSlots(horaInicio, horaFin, duracionServicio, reservas) {
    const slots = [];
    const inicio = this._horaAMinutos(horaInicio);
    const fin = this._horaAMinutos(horaFin);
    
    for (let mins = inicio; mins < fin; mins += CONFIG.slotMinutos) {
      const slotInicio = this._minutosAHora(mins);
      const slotFin = this._minutosAHora(mins + duracionServicio);
      
      // Verificar que el slot cabe en el horario
      if (mins + duracionServicio > fin) break;
      
      // Verificar conflictos con reservas existentes
      const libre = !reservas.some(r => {
        const rInicio = this._horaAMinutos(r.hora_inicio);
        const rFin = this._horaAMinutos(r.hora_fin);
        return mins < rFin && (mins + duracionServicio) > rInicio;
      });
      
      slots.push({
        horaInicio: slotInicio,
        horaFin: slotFin,
        disponible: libre
      });
    }
    
    return slots;
  },
  
  _horaAMinutos(hora) {
    if (!hora) return 0;
    const str = String(hora).replace(/:\d{2}$/, ''); // Quitar segundos si hay
    const [h, m] = str.split(':').map(Number);
    return h * 60 + (m || 0);
  },
  
  _minutosAHora(mins) {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  },
  
  // ─────────────────────────────────────────────────────────────────
  // CREAR RESERVA
  // ─────────────────────────────────────────────────────────────────
  
  async crearReserva(payload) {
    try {
      // 1. Validar payload
      const validacion = this._validarPayload(payload);
      if (validacion) return { ok: false, error: validacion };
      
      // 2. Obtener servicio y empleado
      const servicios = await this.getServicios();
      const servicio = servicios.find(s => s.id === payload.servicioID);
      if (!servicio) return { ok: false, error: 'Servicio no encontrado' };
      
      const empleados = await this.getEmpleados();
      const empleado = empleados.find(e => e.id === payload.empleadoID);
      if (!empleado) return { ok: false, error: 'Barbero no encontrado' };
      
      // 3. Verificar skill
      if (servicio.requiereSkill && !empleado.skills.includes(servicio.requiereSkill)) {
        return { ok: false, error: 'El barbero seleccionado no realiza este servicio' };
      }
      
      // 4. Verificar disponibilidad (doble check)
      const horaFin = this._minutosAHora(
        this._horaAMinutos(payload.horaInicio) + servicio.duracion
      );
      
      const { data: conflictos } = await db
        .from('reservas')
        .select('id')
        .eq('empleado_id', payload.empleadoID)
        .eq('fecha', payload.fecha)
        .neq('estado', ESTADOS.CANCELADA)
        .or(`hora_inicio.lt.${horaFin},hora_fin.gt.${payload.horaInicio}`);
      
      if (conflictos && conflictos.length > 0) {
        return { ok: false, error: 'El horario ya no está disponible. Elige otro.' };
      }
      
      // 5. Insertar reserva
      const reservaData = {
        nombre_cliente:   payload.nombre.trim(),
        email:            payload.email.toLowerCase().trim(),
        telefono:         payload.telefono || '',
        servicio_id:      servicio.id,
        servicio_nombre:  servicio.nombre,
        empleado_id:      empleado.id,
        empleado_nombre:  empleado.nombre,
        fecha:            payload.fecha,
        hora_inicio:      payload.horaInicio,
        hora_fin:         horaFin,
        duracion_min:     servicio.duracion,
        precio:           servicio.precio,
        notas:            payload.notas || '',
        sesion_num:       parseInt(payload.sesionNum) || 1,
        sesiones_totales: servicio.esSesion ? servicio.maxSesiones : 1,
        estado:           ESTADOS.CONFIRMADA
      };
      
      const { data, error } = await db
        .from('reservas')
        .insert(reservaData)
        .select()
        .single();
      
      if (error) throw error;
      
      // 6. Actualizar/crear cliente en CRM
      await this._upsertCliente(payload.nombre, payload.email, payload.telefono, servicio.precio);
      
      // 7. Enviar notificaciones (via Edge Function)
      this._enviarNotificaciones('nueva_reserva', data);
      
      // 8. Formatear respuesta para compatibilidad
      const reserva = {
        id:              data.id,
        nombre:          data.nombre_cliente,
        email:           data.email,
        telefono:        data.telefono,
        servicioID:      data.servicio_id,
        servicioNombre:  data.servicio_nombre,
        empleadoID:      data.empleado_id,
        empleadoNombre:  data.empleado_nombre,
        fecha:           data.fecha,
        horaInicio:      data.hora_inicio,
        horaFin:         data.hora_fin,
        duracion:        data.duracion_min,
        precio:          data.precio,
        notas:           data.notas,
        sesionNum:       data.sesion_num,
        sesionesTotales: data.sesiones_totales
      };
      
      return { ok: true, reservaID: data.id, reserva };
      
    } catch (e) {
      console.error('Error crearReserva:', e);
      return { ok: false, error: 'Error al crear la reserva: ' + e.message };
    }
  },
  
  _validarPayload(p) {
    if (!p) return 'Datos vacíos';
    if (!p.nombre || p.nombre.trim().length < 2) return 'Nombre inválido';
    if (!p.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(p.email)) return 'Email inválido';
    if (!p.servicioID) return 'Servicio requerido';
    if (!p.empleadoID) return 'Barbero requerido';
    if (!p.fecha) return 'Fecha requerida';
    if (!p.horaInicio) return 'Hora requerida';
    
    const fechaReserva = new Date(p.fecha + 'T' + p.horaInicio + ':00');
    if (fechaReserva < new Date()) return 'No puedes reservar en una fecha pasada';
    
    return null;
  },
  
  // ─────────────────────────────────────────────────────────────────
  // CANCELAR RESERVA
  // ─────────────────────────────────────────────────────────────────
  
  async cancelarReserva(reservaID, canceladoPor = 'cliente') {
    try {
      // 1. Verificar que existe
      const { data: reserva, error: errBuscar } = await db
        .from('reservas')
        .select('*')
        .eq('id', reservaID)
        .single();
      
      if (errBuscar || !reserva) {
        return { ok: false, error: 'Reserva no encontrada' };
      }
      
      if (reserva.estado === ESTADOS.CANCELADA) {
        return { ok: false, error: 'La reserva ya está cancelada' };
      }
      
      // 2. Actualizar estado
      const { error: errUpdate } = await db
        .from('reservas')
        .update({ 
          estado: ESTADOS.CANCELADA,
          cancelado_por: canceladoPor
        })
        .eq('id', reservaID);
      
      if (errUpdate) throw errUpdate;
      
      // 3. Enviar notificaciones
      this._enviarNotificaciones('cancelacion', reserva);
      
      return { ok: true };
      
    } catch (e) {
      console.error('Error cancelarReserva:', e);
      return { ok: false, error: e.message };
    }
  },
  
  // ─────────────────────────────────────────────────────────────────
  // CRM - CLIENTES
  // ─────────────────────────────────────────────────────────────────
  
  async _upsertCliente(nombre, email, telefono, precio) {
    try {
      email = email.toLowerCase().trim();
      
      // Verificar si existe
      const { data: cliente } = await db
        .from('clientes')
        .select('*')
        .eq('email', email)
        .single();
      
      if (cliente) {
        // Actualizar existente
        const totalReservas = (cliente.total_reservas || 0) + 1;
        const montoTotal = (cliente.monto_total || 0) + precio;
        const etiqueta = totalReservas >= 10 ? '⭐ VIP' : 
                        totalReservas >= 3 ? '🔁 Frecuente' : '🆕 Nuevo';
        
        await db
          .from('clientes')
          .update({
            total_reservas: totalReservas,
            monto_total: montoTotal,
            etiqueta: etiqueta,
            ultima_visita: new Date().toISOString()
          })
          .eq('email', email);
      } else {
        // Crear nuevo
        await db
          .from('clientes')
          .insert({
            email,
            nombre,
            telefono: telefono || '',
            total_reservas: 1,
            monto_total: precio,
            etiqueta: '🆕 Nuevo',
            ultima_visita: new Date().toISOString()
          });
      }
    } catch (e) {
      console.warn('Error upsertCliente:', e);
    }
  },
  
  // ─────────────────────────────────────────────────────────────────
  // NOTIFICACIONES (llama a Edge Function)
  // ─────────────────────────────────────────────────────────────────
  
  async _enviarNotificaciones(tipo, reserva) {
    try {
      // Las notificaciones se manejan via Edge Function
      // para mantener seguras las credenciales de Slack/Email
      await fetch(`${SUPABASE_URL}/functions/v1/notificaciones`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({ tipo, reserva, config: CONFIG })
      });
    } catch (e) {
      console.warn('Error enviando notificaciones:', e);
      // No fallar la reserva si las notificaciones fallan
    }
  },
  
  // ─────────────────────────────────────────────────────────────────
  // FUNCIONES ADMIN (requieren token)
  // ─────────────────────────────────────────────────────────────────
  
  async getDashboard() {
    try {
      const hoy = new Date().toISOString().split('T')[0];
      
      // Reservas de hoy
      const { data: reservasHoy } = await db
        .from('reservas')
        .select('*')
        .eq('fecha', hoy)
        .neq('estado', ESTADOS.CANCELADA)
        .order('hora_inicio', { ascending: true });
      
      // Próximas reservas
      const { data: proximas } = await db
        .from('reservas')
        .select('*')
        .gte('fecha', hoy)
        .neq('estado', ESTADOS.CANCELADA)
        .order('fecha', { ascending: true })
        .order('hora_inicio', { ascending: true })
        .limit(20);
      
      // Empleados y servicios
      const empleados = await this.getEmpleados();
      const servicios = await this.getServicios();
      
      // Stats
      const stats = this._calcularStats(reservasHoy || []);
      
      return {
        ok: true,
        fecha: hoy,
        stats,
        reservasHoy: this._formatearReservas(reservasHoy || []),
        proximas: this._formatearReservas(proximas || []),
        empleados,
        servicios
      };
      
    } catch (e) {
      console.error('Error getDashboard:', e);
      return { ok: false, error: e.message };
    }
  },
  
  _calcularStats(reservas) {
    return {
      totalHoy: reservas.length,
      confirmadas: reservas.filter(r => r.estado === ESTADOS.CONFIRMADA).length,
      completadas: reservas.filter(r => r.estado === ESTADOS.COMPLETADA).length,
      canceladas: reservas.filter(r => r.estado === ESTADOS.CANCELADA).length,
      ingresoEstimado: reservas
        .filter(r => r.estado !== ESTADOS.CANCELADA)
        .reduce((sum, r) => sum + (r.precio || 0), 0)
    };
  },
  
  _formatearReservas(reservas) {
    return reservas.map(r => ({
      id:              r.id,
      nombre:          r.nombre_cliente,
      email:           r.email,
      telefono:        r.telefono,
      servicioID:      r.servicio_id,
      servicioNombre:  r.servicio_nombre,
      empleadoID:      r.empleado_id,
      empleadoNombre:  r.empleado_nombre,
      fecha:           r.fecha,
      horaInicio:      r.hora_inicio,
      horaFin:         r.hora_fin,
      duracion:        r.duracion_min,
      estado:          r.estado,
      precio:          r.precio,
      notas:           r.notas
    }));
  },
  
  async getReservasPorDia(fecha) {
    try {
      const { data, error } = await db
        .from('reservas')
        .select('*')
        .eq('fecha', fecha)
        .neq('estado', ESTADOS.CANCELADA)
        .order('hora_inicio', { ascending: true });
      
      if (error) throw error;
      return this._formatearReservas(data || []);
    } catch (e) {
      console.error('Error getReservasPorDia:', e);
      return [];
    }
  },
  
  async actualizarEstado(reservaID, estado) {
    try {
      const { error } = await db
        .from('reservas')
        .update({ estado })
        .eq('id', reservaID);
      
      if (error) throw error;
      return { ok: true };
    } catch (e) {
      console.error('Error actualizarEstado:', e);
      return { ok: false, error: e.message };
    }
  },
  
  async cancelarAdmin(reservaID) {
    return this.cancelarReserva(reservaID, 'admin');
  }
};

// Hacer disponible globalmente
window.API = API;
window.CONFIG = CONFIG;
window.ESTADOS = ESTADOS;
