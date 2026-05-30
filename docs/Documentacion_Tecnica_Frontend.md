# Documentación Técnica - Frontend y Extensiones

**Sistema Académico Integrado**
Universidad Mariano Gálvez de Guatemala - Base de Datos 2

Este documento registra el trabajo realizado en la capa de presentación (frontend en React)
y las extensiones asociadas: exportación de reportes a PDF/Excel y el agente de IA. Complementa
la documentación técnica general del proyecto (base de datos y backend).

---

## 1. Resumen

Se construyó el frontend completo del sistema en **React (Vite + Material UI)**, consumiendo la
API REST del backend (Node.js + Express) con autenticación **JWT** y control de acceso por rol.
Adicionalmente se implementaron dos requerimientos: **exportación de reportes a PDF y Excel**
(generada en el navegador) y un **agente de IA** con function calling anclado a los procedimientos
almacenados.

### Stack del frontend
- **React 18** con **Vite** (bundler y servidor de desarrollo).
- **Material UI (MUI)** para componentes (tablas, formularios, layout).
- **React Router** para navegación.
- **Axios** para las llamadas HTTP, con interceptores.
- **Context API** para el estado de autenticación.
- **xlsx**, **jspdf**, **jspdf-autotable** para exportación de reportes.

---

## 2. Estructura del proyecto (frontend)

```
frontend/
  index.html
  package.json
  vite.config.js
  .env / .env.example         # VITE_API_URL
  src/
    main.jsx                  # Punto de entrada: ThemeProvider + Router + AuthProvider
    App.jsx                   # Definición de rutas
    theme.js                  # Tema de MUI
    api/
      client.js               # Instancia axios + interceptores (token y 401)
      auth.js                 # login() y helper de errores
      catalogos.js            # estudiantes, cursos, secciones, asignaciones, actividades, roles
      operaciones.js          # POST: notas, asistencia, registro de usuario
      reportes.js             # Reportes de notas y asistencia
      perfil.js               # Perfil del estudiante y consulta al agente IA
      auditoria.js            # Bitácora de auditoría
    context/
      AuthContext.jsx         # token, usuario, login/logout, hasRole, persistencia
    routes/
      ProtectedRoute.jsx      # Exige sesión y, opcionalmente, rol
    config/
      menu.js                 # Items del menú filtrados por rol
    components/
      Layout.jsx              # AppBar + Drawer + menú por rol
      DataTablePage.jsx       # Tabla genérica (buscador, recarga, exportación)
      ChatIA.jsx              # Chat reutilizable del asistente
    pages/
      Login.jsx, Dashboard.jsx,
      Estudiantes.jsx, Cursos.jsx, Secciones.jsx,
      Notas.jsx, Asistencia.jsx, Reportes.jsx,
      Perfil.jsx, Auditoria.jsx, RegistroUsuario.jsx,
      Asistente.jsx, Placeholder.jsx
    utils/
      exportar.js             # exportarExcel() y exportarPDF()
```

---

## 3. Arquitectura y flujo

El frontend es una SPA (Single Page Application) que se comunica con el backend exclusivamente
por HTTP/JSON. La URL base se define en una sola variable de entorno (`VITE_API_URL`).

### 3.1 Autenticación (JWT)
1. El usuario inicia sesión en `Login` -> `POST /api/auth/login`.
2. El backend valida con `sp_Login` y devuelve un **token JWT** y los datos del usuario
   (`id_usuario`, `id_rol`, `nombre_rol`, `nombre_completo`).
3. El token y el usuario se guardan en `localStorage` (`AuthContext`).
4. En cada petición protegida, un **interceptor de Axios** agrega la cabecera
   `Authorization: Bearer <token>`.
5. Si el backend responde **401**, otro interceptor limpia la sesión y redirige a `/login`.

### 3.2 Control de acceso por rol
- `ProtectedRoute` exige sesión y, opcionalmente, un rol permitido.
- El menú (`config/menu.js`) muestra solo las opciones del rol actual.
- Importante: el control en el frontend es de **experiencia de usuario**; la seguridad real la
  impone el backend con `requireRole`.

| Rol | Acceso |
|-----|--------|
| Administrador | Todo: catálogos, notas, asistencia, reportes, auditoría, registro de usuarios |
| Docente | Catálogos, registro de notas/asistencia, reportes |
| Estudiante | Su perfil, notas, asistencia y asistente IA |
| Reportes | Reportes |

---

## 4. Pantallas implementadas

| Pantalla | Ruta | Endpoint(s) | Rol |
|----------|------|-------------|-----|
| Login | `/login` | `POST /api/auth/login` | Público |
| Dashboard | `/` | - | Todos |
| Estudiantes | `/estudiantes` | `GET /api/estudiantes` | Admin, Docente |
| Cursos | `/cursos` | `GET /api/cursos` | Admin, Docente |
| Secciones | `/secciones` | `GET /api/secciones` | Admin, Docente |
| Registro de Notas | `/notas` | `GET /api/secciones`, `/api/asignaciones/:id`, `/api/actividades/:id`, `POST /api/notas` | Admin, Docente |
| Registro de Asistencia | `/asistencia` | `GET /api/asignaciones/:id`, `POST /api/asistencia` | Admin, Docente |
| Reportes | `/reportes` | `GET /api/reportes/notas/:id`, `/api/reportes/asistencia/:id` | Admin, Docente, Reportes |
| Mi Perfil | `/perfil` | `GET /api/perfil/:id`, `POST /api/ai/consulta` | Estudiante |
| Asistente IA | `/asistente` | `POST /api/ai/consulta` | Todos |
| Registrar Usuario | `/usuarios/nuevo` | `GET /api/roles`, `POST /api/auth/register` | Admin |
| Auditoría | `/auditoria` | `GET /api/auditoria` | Admin |

### Notas de diseño
- Los listados usan un componente genérico `DataTablePage` con buscador, recarga y exportación.
- Los formularios de Notas/Asistencia siguen el flujo: elegir Sección -> cargar estudiantes
  inscritos (por `id_asignacion`) y actividades -> registrar.
- Todos los estados de carga y error se manejan para que la interfaz no quede congelada.

---

## 5. Exportación de reportes (PDF y Excel)

La generación ocurre en el **navegador** (no requiere cambios en el backend), usando los datos ya
cargados en pantalla.

- **Excel**: `xlsx` (SheetJS) convierte las filas a `.xlsx`.
- **PDF**: `jspdf` + `jspdf-autotable` generan una tabla con encabezado y fecha.
- La utilidad `src/utils/exportar.js` expone `exportarExcel()` y `exportarPDF()`, reutilizadas en:
  - Listados y Auditoría (vía `DataTablePage`).
  - Página de Reportes (por pestaña: Notas y Asistencia).

Justificación de la decisión: los reportes son tabulares y los datos ya están en el frontend, por
lo que la generación en el cliente es la opción más simple, ligera y sin tocar el backend. La
alternativa (generación en servidor con ExcelJS/Puppeteer) se reservaría para documentos con
diseño corporativo o exportaciones masivas.

---

## 6. Agente de IA (Groq + function calling)

### 6.1 Objetivo
Permitir consultas en lenguaje natural sobre notas, asistencia, alertas y reportes, con respuestas
**ancladas a datos reales** (sin inventar calificaciones).

### 6.2 Arquitectura
Patrón de **agente con herramientas (function calling)**:
1. El frontend envía la pregunta a `POST /api/ai/consulta`.
2. El backend (`src/aiAgent.js`) la envía al modelo de **Groq** junto con la definición de
   herramientas disponibles.
3. El modelo decide qué herramienta usar; el backend ejecuta la **consulta/procedimiento real**
   contra SQL Server y devuelve el resultado al modelo.
4. El modelo redacta la respuesta final en lenguaje natural usando esos datos.

### 6.3 Herramientas expuestas
`buscar_estudiante`, `perfil_estudiante`, `promedio_estudiante`, `asistencia_estudiante`,
`alertas_estudiante`, `listar_secciones`, `reporte_notas_seccion`, `reporte_asistencia_seccion`.

Restricción de seguridad: si el rol es **Estudiante**, las herramientas se fuerzan a su propio
`id_estudiante` y se bloquean los reportes de sección.

### 6.4 Configuración
En `backend/.env`:
```
GROQ_API_KEY=...           # gratis en https://console.groq.com/keys
GROQ_MODEL=llama-3.3-70b-versatile
```
- La API key vive **solo en el backend**, nunca en el frontend.
- Si `GROQ_API_KEY` está vacía, el endpoint cae a un modo por reglas (palabras clave) que ya existía.

### 6.5 Interfaz
- Componente reutilizable `ChatIA` (burbujas, sugerencias y estado "Pensando...").
- Página global **Asistente IA** (todos los roles) y el chat embebido en **Mi Perfil**.

---

## 7. Cambios realizados en el backend

Aunque el frontend fue lo principal, se hicieron adiciones necesarias en `backend/src/server.js`:

1. **Nuevo endpoint** `GET /api/asignaciones/:id_seccion`: devuelve los estudiantes inscritos en
   una sección con su `id_asignacion`. Es indispensable porque `sp_RegistrarNota` y
   `sp_RegistrarAsistencia` operan por `id_asignacion`, y antes no existía forma de obtenerlo.
2. **Agente de IA**: nuevo archivo `backend/src/aiAgent.js` y modificación de `/api/ai/consulta`
   para usar el agente cuando hay `GROQ_API_KEY` (con fallback por reglas).
3. **Dependencia** `groq-sdk` agregada a `backend/package.json`.
4. **`backend/.env.example`** creado para documentar las variables de entorno.

---

## 8. Despliegue

### Desarrollo
```bash
# Backend
cd backend && npm install && npm run dev      # http://localhost:3000

# Frontend
cd frontend && npm install && npm run dev     # http://localhost:5173
```

### Producción (Apache en el Ubuntu Desktop)
```bash
cd frontend
npm run build          # genera frontend/dist/
# apuntar el DocumentRoot de Apache a frontend/dist
```
La URL de la API se configura en `frontend/.env` (`VITE_API_URL`): `localhost` si todo está en el
mismo equipo, o la IP del Ubuntu si se accede desde otra máquina.

---

## 9. Pendientes y notas para el equipo

1. **Reiniciar el backend** tras instalar `groq-sdk` y agregar el endpoint de asignaciones, para
   que ambos queden activos en el servidor.
2. **Bug de nombre de procedimiento**: `server.js` llama a `sp_RegisUsuario` en el registro de
   usuarios, pero en la base de datos el procedimiento se llama `sp_RegistrarUsuario`. Hay que
   igualar los nombres para que el registro funcione con la API real.
3. Para usar el asistente con IA real se necesita una `GROQ_API_KEY` en `backend/.env`.
4. Las credenciales y la API key no se versionan (están en `.env`, ignorado por git).

---

## 10. Credenciales de prueba

Contraseña para todos: `clave123`

| Correo | Rol |
|--------|-----|
| admin@miumg.edu.gt | Administrador |
| mlopez@miumg.edu.gt | Docente |
| amorales@miumg.edu.gt | Estudiante |

*Fin del documento.*
