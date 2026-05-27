# Manual de instalación

## 1. Objetivo

Este manual explica cómo instalar y ejecutar Delvo en un entorno local de desarrollo.

Delvo está compuesto por:

- Backend con FastAPI.
- Aplicación web con Next.js.
- Base de datos PostgreSQL.
- Aplicación móvil con Expo y React Native.

La orquestación principal se realiza con Docker Compose.

## 2. Requisitos previos

Antes de comenzar, asegúrate de tener instalado:

- Git.
- Docker Desktop.
- Node.js.
- `pnpm` o `npm`.
- Expo Go (si vas a probar la app móvil en dispositivo físico).
- Emulador Android (opcional).

## 3. Clonar el repositorio

En una terminal, clona el proyecto y accede a su carpeta:

```bash
git clone <URL_DEL_REPOSITORIO>
cd delvo
```

En la raíz encontrarás, entre otros, estos elementos:

- `backend`
- `web`
- `mobile`
- `docs`
- `docker-compose.yml`
- `.env`

## 4. Configurar variables de entorno

Delvo usa un archivo `.env` en la raíz del proyecto.

Este archivo define parámetros críticos, por ejemplo:

- Credenciales de PostgreSQL.
- Clave secreta JWT.
- Configuración de Google Calendar.
- Conexión con Ollama.

No publiques este archivo en repositorios públicos.

## 5. Levantar servicios con Docker Compose

Desde la raíz del proyecto, ejecuta:

```bash
docker compose up --build
```

Este comando:

1. Construye las imágenes necesarias.
2. Inicia PostgreSQL.
3. Inicia el backend cuando la base de datos está disponible.
4. Inicia la aplicación web.

## 6. Comprobar que todo funciona

Cuando el arranque termine:

| Servicio | URL |
|---|---|
| Aplicación web | `http://localhost:31667` |
| Backend API | `http://localhost:30667` |
| PostgreSQL | `localhost:55432` |

Para verificar el backend:

```bash
curl http://localhost:30667/health
```

Si todo es correcto, el endpoint devuelve un estado de salud válido.

También puedes verificar el health de la web en:

```bash
curl http://localhost:31667/api/health
```

## 7. Acceso a documentación de API

La documentación técnica está disponible en:

- `http://localhost:30667/docs`

Puede estar protegida por autenticación básica, según la configuración del `.env`.

## 8. Configurar integración con Google Calendar

Para habilitar la integración:

1. Crea un proyecto en Google Cloud Console.
2. Habilita Google Calendar API.
3. Crea credenciales OAuth 2.0 de tipo aplicación web.
4. Configura el callback con el mismo valor de `GOOGLE_CALLBACK_URL`.
5. Si la app no está verificada, añade tu correo como usuario de prueba en OAuth Consent Screen.

## 9. Configurar funcionalidad de IA (Ollama)

Para usar el asistente inteligente:

1. Instala y ejecuta Ollama.
2. Asegúrate de que el backend puede acceder a Ollama.
3. Descarga modelos necesarios.

Ejemplos habituales:

- Modelo conversacional: `llama3.2`
- Modelo de embeddings: `nomic-embed-text`

Define estos valores en el `.env`.

## 10. Ejecutar la aplicación móvil

La app móvil no se ejecuta en Docker.

En otra terminal:

```bash
cd mobile
pnpm install
pnpm start
```

Si usas `npm`:

```bash
npm install
npx expo start
```

Después:

- Escanea el QR con Expo Go, o
- Abre la app en un emulador Android.

Si quieres usar backend local en móvil, ajusta `BASE_URL` en el cliente API móvil.

## 11. Ejecutar los tests del backend

El backend incluye una suite completa de tests unitarios e de integración. No es necesario tener PostgreSQL activo para ejecutarlos.

Instala las dependencias de test:

```bash
cd backend
pip install -r requirements-test.txt
```

Ejecuta los tests:

```bash
pytest
```

La configuración por defecto está en `pytest.ini`. Los tests se ejecutan con salida detallada (`-v --tb=short`) y las variables de entorno necesarias se inyectan automáticamente, sin necesidad de un archivo `.env`.

## 12. Solución de problemas comunes

Si algo falla, comprueba:

- Docker Desktop está iniciado.
- Los puertos `30667`, `31667` y `55432` están libres.
- El archivo `.env` contiene todas las variables necesarias.

También puedes reiniciar el entorno:

```bash
docker compose down
docker compose up --build
```

## 13. Resumen

La instalación de Delvo consiste en:

1. Configurar `.env`.
2. Levantar servicios con Docker Compose.
3. Verificar backend con `/health`.
4. Abrir la web en navegador.
5. Ejecutar la app móvil con Expo (opcional).
6. Opcionalmente, ejecutar `pytest` en `backend/` para verificar que los tests pasan.
