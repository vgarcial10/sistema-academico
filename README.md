# Sistema Académico UMG

Proyecto académico con backend en Node.js, base de datos SQL Server, frontend y reportes.

## Setup

### 1. Backend
```bash
cd backend
npm install
npm run dev
```

### 2. SQL Server (Docker)
```bash
docker run -d \
  --name sqlserver \
  -e 'ACCEPT_EULA=Y' \
  -e 'SA_PASSWORD=Proyecto@2025' \
  -p 1433:1433 \
  mcr.microsoft.com/mssql/server:2022-latest
```

### 3. Frontend (React + Vite + MUI)
```bash
cd frontend
cp .env.example .env   # ajusta VITE_API_URL si la API no esta en localhost
npm install
npm run dev            # servidor de desarrollo en http://localhost:5173
```

Para produccion (servir con Apache en el Ubuntu Desktop):
```bash
cd frontend
npm run build          # genera la carpeta dist/
# luego apunta el DocumentRoot de Apache a frontend/dist
```

> Nota: el frontend lee la URL de la API desde `frontend/.env` (`VITE_API_URL`).
> En el mismo equipo usa `http://localhost:3000/api`; desde otra maquina de la red,
> usa la IP del Ubuntu (p.ej. `http://192.168.1.50:3000/api`).

#### Exportacion de reportes (PDF y Excel)
Las pantallas de listados (Estudiantes, Cursos, Secciones), Auditoria y Reportes incluyen
botones para exportar la tabla actual a **Excel** (`.xlsx`) y **PDF**. La generacion ocurre
en el navegador (sin tocar el backend) usando `xlsx`, `jspdf` y `jspdf-autotable`.

## Agente de IA (Groq)

El sistema incluye un asistente de IA ("Asistente IA" en el menu, y dentro del perfil del
estudiante) que responde en lenguaje natural sobre notas, asistencia, alertas y reportes.

Usa un patron de **agente con herramientas (function calling)**: el modelo decide que consulta
ejecutar y el backend corre los procedimientos almacenados reales, de modo que las respuestas
quedan ancladas a datos verdaderos (no inventa calificaciones).

Configuracion (en `backend/.env`):
```bash
GROQ_API_KEY=tu_api_key_aqui   # gratis en https://console.groq.com/keys
GROQ_MODEL=llama-3.3-70b-versatile
```
Si `GROQ_API_KEY` esta vacia, el asistente cae a un modo por reglas (sin LLM). La API key vive
solo en el backend, nunca en el frontend.

## Credenciales
- Usuario BD: `sa`
- Password: `Proyecto@2025`
- Server: `localhost,1433`

### Usuarios de prueba (contrasena: `clave123`)
- `admin@miumg.edu.gt` (Administrador)
- `mlopez@miumg.edu.gt` (Docente)
- `amorales@miumg.edu.gt` (Estudiante)
