# Sistema Académico

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

## Credenciales
- Usuario BD: `sa`
- Password: `Proyecto@2025`
- Server: `localhost,1433`
