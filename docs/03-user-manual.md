# Manual de usuario

## 1. Introducción

Este manual describe cómo usar Delvo desde la perspectiva del usuario final.

Delvo permite centralizar:

- Tareas.
- Reuniones.
- Eventos.
- Notas.
- Asistencia inteligente con IA.

La aplicación está disponible en versión web y móvil.

## 2. Registro e inicio de sesión

### 2.1 Registro

Si no tienes cuenta:

1. Abre la pantalla de autenticación.
2. Introduce nombre, correo electrónico y contraseña.
3. Completa el registro.

La contraseña debe cumplir los requisitos definidos por el sistema.

### 2.2 Inicio de sesión

Si ya tienes cuenta:

1. Introduce correo electrónico y contraseña.
2. Accede a la aplicación.

Gestión de sesión:

- Web: sesión mediante cookies seguras.
- Móvil: sesión mediante tokens almacenados en la app.

## 3. Navegación general

Tras iniciar sesión, accedes al área principal:

- En web: navegación lateral.
- En móvil: navegación adaptada a pantalla pequena.

Desde ahí puedes consultar y editar toda tu información.

## 4. Dashboard

El dashboard muestra una vista resumida de:

- Tareas.
- Reuniones próximas.
- Eventos recientes.
- Notas.

Se recomienda usar esta pantalla como punto de control diario.

## 5. Gestión de tareas

En la sección de tareas puedes:

- Crear tareas.
- Editarlas.
- Eliminarlas.

Campos habituales:

- Título.
- Descripción (opcional).
- Fecha límite.
- Hora.
- Prioridad (`baja`, `media`, `alta`).
- Estado (`pendiente`, `en progreso`, `completada`).

## 6. Gestión de reuniones

La sección de reuniones permite registrar encuentros planificados.

Datos principales:

- Título.
- Fecha.
- Hora.
- Duración.
- Ubicación.
- Participantes.
- Estado (`programada`, `completada`, `cancelada`).

## 7. Gestión de eventos

Los eventos sirven para actividades puntuales que no encajan como tarea o reunión.

Campos habituales:

- Título.
- Descripción.
- Fecha.
- Hora.
- Ubicación.
- Tipo de evento.

Si Google Calendar está conectado, algunos eventos pueden sincronizarse.

## 8. Gestión de notas

La sección de notas permite guardar información rápida.

Acciones disponibles:

- Crear notas con título y contenido.
- Editar notas.
- Consultar notas.
- Archivar notas.

## 9. Planificador (app móvil)

La pantalla de Planificador en la aplicación móvil ofrece una vista de calendario mensual con el detalle de los elementos del día seleccionado.

Funcionalidades disponibles:

- Navegar entre meses con los controles de cabecera.
- Ver todas las tareas, reuniones, eventos y notas de un día concreto.
- Filtrar tareas por estado: `Todo`, `Pendientes`, `Completadas`.
- Crear nuevos elementos pulsando el botón `+`.
- Editar o eliminar cualquier elemento directamente desde la lista.
- Colores de prioridad en tareas: rojo (alta), naranja (media), verde (baja).

## 10. Calendario

El calendario ofrece una vista temporal de la actividad.

Puede mostrar:

- Tareas.
- Reuniones.
- Eventos de Delvo.
- Eventos de Google Calendar (si hay integración activa).

## 11. Integración con Google Calendar

Para conectar Google Calendar:

1. Ve a configuración.
2. Selecciona conectar cuenta de Google.
3. Completa el flujo OAuth y acepta permisos.

Después, Delvo puede:

- Importar eventos en un rango temporal.
- Consultar eventos de Google Calendar.
- Permitir edición en determinados casos.

## 12. Asistente inteligente

Desde el chat, puedes escribir instrucciones en lenguaje natural.

Ejemplos de uso:

- Crear una tarea.
- Consultar eventos próximos.
- Pedir ayuda sobre tu planificación.

Características:

- Soporte en espanol e inglés.
- Posible uso de base de conocimiento local con RAG.
- Las conversaciones se guardan en la base de datos y son accesibles desde web y móvil.

## 12b. Historial de conversaciones

Delvo guarda el historial completo de tus conversaciones con el asistente.

- En la **app web**, puedes acceder a conversaciones anteriores desde la pantalla del asistente.
- En la **app móvil**, el chat carga el historial de la conversación activa al abrirla.
- Puedes eliminar conversaciones desde la interfaz.

Esto permite continuar una conversación aunque cambies de dispositivo o cierres la sesión.

## 13. Uso en aplicación móvil

La experiencia general es equivalente a la web, con interfaz adaptada.

Incluye:

- Inicio de sesión.
- Consulta y edición de información.
- Calendario.
- Chat.
- Configuración.

Si el token de acceso caduca, la app intenta renovarlo automáticamente con el token de refresco.

## 14. Cierre de sesión y seguridad

Si la sesión expira por completo, deberás iniciar sesión de nuevo.

Para cerrar sesión manualmente:

1. Abre opciones de usuario o configuración.
2. Selecciona cerrar sesión.

Esto elimina credenciales activas y protege tu cuenta, especialmente en equipos compartidos.

## 15. Recomendaciones de uso diario

Flujo sugerido:

1. Revisa dashboard y calendario al comenzar el día.
2. Actualiza el estado de tareas.
3. Anade reuniones y eventos nuevos.
4. Usa el asistente para acciones rápidas.

## 16. Resumen

Delvo unifica productividad y planificación en una sola plataforma.

Desde web o móvil puedes gestionar tareas, reuniones, eventos y notas, sincronizar Google Calendar y apoyarte en IA para trabajar con más rapidez.
