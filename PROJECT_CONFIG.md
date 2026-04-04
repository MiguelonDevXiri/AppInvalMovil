# PROJECT_CONFIG.md — Proyecto Inval (Documentación Completa)

> Última actualización: 2026-04-04

---

## 📋 Resumen General

**Inval** es una aplicación de gestión de inspecciones industriales de maquinaria (autocompactadores, compactadores estáticos, rotoprensas, volteadores, contenedores, cajas estáticas, prensas verticales, etc.) para la empresa **INVAL M.S.L.** (Alcácer, Valencia).

El proyecto tiene **DOS partes**:

| Parte | Tecnología | Ruta local |
|-------|-----------|------------|
| **App Móvil** | Expo SDK 54 / React Native 0.81 | `/home/miguel/Documents/Mis proyectos /Prroyecto APP/Inval/` |
| **Panel Web** | Next.js 14.2.5 / React 18 / Tailwind | `/home/miguel/Documents/Mis proyectos /Prroyecto APP/inval-panel/` |

Ambas comparten la **misma base de datos Supabase** y el mismo bucket de Storage.

---

## 🔑 Credenciales y Configuración Central

### Supabase

| Campo | Valor |
|-------|-------|
| **URL** | `https://ywtqtdnqcytbtckkdien.supabase.co` |
| **Anon Key** | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl3dHF0ZG5xY3l0YnRja2tkaWVuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQyNjMzMDcsImV4cCI6MjA4OTgzOTMwN30.mHOkHbqFQX88hjISrU2zGTNiTZWH1Z-6Dk0aTZTnnLk` |
| **Ref** | `ywtqtdnqcytbtckkdien` |
| **Storage Bucket** | `inspection-photos` |

### EAS (Expo Application Services)

| Campo | Valor |
|-------|-------|
| **EAS Project ID** | `94115cab-be44-423b-97f0-598166db678a` |
| **Android Package** | `com.miguelin44.Inval` |

### Vercel (Panel Web)

| Campo | Valor |
|-------|-------|
| **Project ID** | `prj_ioHMzjo4ttihFVsb1DTZVv2zoGVy` |
| **Org ID** | `team_0LAX2f8aNsHM42YlIpV1ilGC` |
| **Project Name** | `inval-panel` |

### Repositorios GitHub

| Parte | Repositorio |
|-------|-------------|
| **App Móvil** | `https://github.com/MiguelonDevXiri/AppInvalMovil.git` |
| **Panel Web** | `https://github.com/MiguelonDevXiri/inval-panel.git` |

---

## 📁 PARTE 1: APP MÓVIL (Expo/React Native)

### Estructura de Carpetas

```
Inval/
├── app/
│   ├── _layout.tsx                         # Layout raíz (Expo Router)
│   └── (tabs)/
│       ├── _layout.tsx                     # Tab navigator layout
│       ├── index.tsx                       # Pantalla principal (home)
│       ├── login.tsx                       # Login (selección de técnico + PIN)
│       ├── machine-type-selection.tsx       # Selección tipo de máquina
│       ├── new-machine.tsx                 # Formulario nueva máquina
│       ├── machine-list.tsx                # Lista de máquinas (inspecciones)
│       ├── checklist.tsx                   # Checklist de inspección
│       ├── photos.tsx                      # Fotos generales (A1-A4)
│       ├── comments.tsx                    # Comentarios con fotos
│       ├── report.tsx                      # Vista y compartir informe PDF
│       ├── exit-machine-list.tsx           # Lista de máquinas (inspección salida)
│       ├── exit-inspection.tsx             # Inspección de salida
│       ├── exit-photos.tsx                 # Fotos de salida (D1-D4)
│       ├── exit-management.tsx             # Gestión inspección de salida
│       ├── acteco-report-form.tsx          # Formulario urgencia ACTECO
│       ├── acteco-general-photo.tsx        # Fotos generales urgencia
│       ├── acteco-averia-form.tsx          # Descripción avería urgencia
│       ├── acteco-averia-photo.tsx         # Fotos avería urgencia
│       ├── acteco-solucion-materiales.tsx  # Solución + materiales urgencia
│       ├── acteco-final-form.tsx           # Firmas urgencia
│       ├── acteco-report-view.tsx          # Vista informe urgencia
│       ├── acteco-inspections-list.tsx     # Lista de urgencias
│       ├── averia-machine-form.tsx         # Form máquina (módulo averías)
│       ├── averia-defects-form.tsx         # Averías detectadas
│       ├── averia-solucion-form.tsx        # Solución averías
│       ├── averia-materiales-form.tsx      # Materiales averías
│       ├── averia-final-form.tsx           # Firmas averías
│       ├── averia-report-view.tsx          # Vista informe averías
│       └── averia-inspections-list.tsx     # Lista averías
├── components/
│   ├── ChecklistItem.tsx                   # Componente ítem del checklist
│   ├── PhotoCapture.jsx                    # Captura de fotos
│   ├── MachineCard.jsx                     # Tarjeta de máquina
│   ├── machine-list.tsx                    # Componente lista máquinas
│   └── (componentes boilerplate Expo)
├── constants/
│   ├── Colors.ts                           # Paleta de colores y tema visual
│   └── theme.ts                            # Tema adicional
├── data/
│   ├── checklistData.ts                    # Datos legacy checklist
│   ├── machineChecklists.ts                # Checklists por tipo de máquina
│   └── machineTypes.ts                     # Tipos de máquina
├── hooks/
│   ├── useColorScheme.ts / .web.ts
│   └── useThemeColor.ts
├── utils/
│   ├── supabase.ts                         # Cliente Supabase (con AsyncStorage)
│   ├── storage.ts                          # CRUD máquinas, checklists, fotos (Supabase)
│   ├── photoUpload.ts                      # Upload/delete fotos en Supabase Storage
│   ├── reportGenerator.ts                  # Generación PDF inspección entrada (HTML→PDF)
│   ├── exitReportGenerator.ts              # Generación PDF inspección salida
│   ├── actecoReportGenerator.ts            # Generación PDF urgencias ACTECO
│   ├── averiasReportGenerator.ts           # Generación PDF averías
│   ├── actecoStorage.ts                    # Storage legacy ACTECO (AsyncStorage)
│   ├── actecoInspectionStorage.ts          # CRUD urgencias ACTECO (Supabase)
│   ├── averiasInspectionStorage.ts         # CRUD averías (Supabase)
│   └── imageLoader.ts                      # Utilidades imágenes
├── sql/
│   ├── exit-inspection.sql                 # SQL tablas inspección salida
│   ├── exit-checks-comment.sql             # ALTER añade comment a exit_checks
│   └── averias.sql                         # SQL tablas módulo averías
├── scripts/
│   └── reset-project.js                    # Script reset proyecto Expo
├── assets/images/                          # Iconos, splash, etc.
├── app.json                                # Configuración Expo
├── eas.json                                # Configuración EAS Build
├── package.json
├── tsconfig.json
└── .expo/
```

### Dependencias Principales (package.json)

| Paquete | Versión | Propósito |
|---------|---------|-----------|
| `expo` | ~54.0.30 | Framework |
| `react-native` | 0.81.5 | Runtime |
| `expo-router` | ~6.0.21 | Navegación file-based |
| `@supabase/supabase-js` | ^2.99.3 | Backend/DB |
| `@react-native-async-storage/async-storage` | ^2.2.0 | Storage local + auth Supabase |
| `expo-image-picker` | ^17.0.10 | Captura de fotos |
| `expo-image-manipulator` | ^14.0.8 | Redimensionar/comprimir imágenes |
| `expo-print` | ^15.0.8 | Generación de PDFs (HTML→PDF) |
| `expo-sharing` | ^14.0.8 | Compartir archivos |
| `expo-file-system` | ^19.0.21 | Acceso a archivos |
| `jszip` | ^3.10.1 | Empaquetar PDF+fotos en ZIP |
| `base64-arraybuffer` | ^1.0.2 | Conversión para upload a Supabase |
| `react-native-paper` | ^5.14.5 | Componentes UI |
| `expo-linear-gradient` | ~15.0.8 | Gradientes visuales |
| `react-native-webview` | 13.15.0 | WebView (firmas, etc.) |
| `react-native-reanimated` | ~4.1.1 | Animaciones |

### Configuración EAS (eas.json)

```json
{
  "cli": { "version": ">= 16.28.0", "appVersionSource": "remote" },
  "build": {
    "development": { "developmentClient": true, "distribution": "internal" },
    "preview": { "distribution": "internal", "android": { "buildType": "apk" } },
    "production": { "autoIncrement": true }
  }
}
```

- **Version actual app:** 1.1.2 (definida en app.json)
- **Scheme:** `inval`
- **New Architecture:** habilitada
- **Typed Routes + React Compiler:** habilitados (experiments)

---

## 📁 PARTE 2: PANEL WEB (Next.js)

### Estructura de Carpetas

```
inval-panel/
├── src/
│   ├── app/
│   │   ├── layout.tsx                      # Layout global
│   │   ├── page.tsx                        # Landing / redirect
│   │   ├── globals.css                     # Estilos globales (Tailwind)
│   │   ├── login/
│   │   │   └── page.tsx                    # Login (admin + PIN desde Supabase)
│   │   └── (dashboard)/
│   │       ├── layout.tsx                  # Layout dashboard (sidebar, auth)
│   │       ├── dashboard/
│   │       │   └── page.tsx                # Dashboard principal
│   │       ├── inspecciones/
│   │       │   ├── page.tsx                # Lista de inspecciones
│   │       │   └── [id]/page.tsx           # Detalle inspección
│   │       ├── urgencias/
│   │       │   ├── page.tsx                # Lista urgencias ACTECO
│   │       │   └── [id]/page.tsx           # Detalle urgencia
│   │       └── averias/
│   │           ├── page.tsx                # Lista averías
│   │           └── [id]/page.tsx           # Detalle avería
│   └── lib/
│       ├── supabase.ts                     # Cliente Supabase (env vars)
│       ├── auth.ts                         # Sesión en localStorage
│       └── checklistData.ts                # Checklists (copia de la app)
├── public/
│   ├── logo-inval.png                      # Logo empresa
│   └── hero-prensa.jpg                     # Imagen hero
├── .env.local                              # Variables de entorno (Supabase)
├── .vercel/project.json                    # Config Vercel
├── next.config.mjs
├── tailwind.config.ts
├── postcss.config.mjs
├── tsconfig.json
└── package.json
```

### Dependencias Principales (package.json)

| Paquete | Versión | Propósito |
|---------|---------|-----------|
| `next` | 14.2.5 | Framework web |
| `react` / `react-dom` | ^18 | UI |
| `@supabase/supabase-js` | ^2.100.0 | Backend/DB |
| `lucide-react` | ^1.6.0 | Iconos |
| `tailwindcss` | ^3.4.1 | CSS utility-first |

### Variables de Entorno (.env.local)

```
NEXT_PUBLIC_SUPABASE_URL=https://ywtqtdnqcytbtckkdien.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Autenticación (Panel Web)

- Login basado en tabla `technicians` de Supabase
- Solo usuarios con `role: "admin"` pueden acceder al panel
- Sesión almacenada en `localStorage` (key: `inval_session`)
- Campos: `technicianId`, `technicianName`, `role`

### Secciones del Panel

1. **Dashboard** — Vista general
2. **Inspecciones** — Lista y detalle de inspecciones de entrada/salida
3. **Urgencias** — Lista y detalle de inspecciones ACTECO (urgencias)
4. **Averías** — Lista y detalle de inspecciones de averías

---

## 🗄️ Base de Datos (Supabase)

### Tablas Principales

#### Módulo Inspecciones (entrada/salida)

| Tabla | Descripción |
|-------|-------------|
| `machines` | Máquinas inspeccionadas (datos cliente, máquina, estado inspección) |
| `machine_comments` | Comentarios con fotos por máquina |
| `checklist_results` | Resultados del checklist (ok/fail/na/cant + comentario) |
| `checklist_photos` | Fotos asociadas a ítems del checklist |
| `machine_photos` | Fotos generales de máquina (posiciones: front/back/left/right → A1-A4) |
| `exit_checks` | Comprobaciones de inspección de salida (verified, photo, comment) |
| `exit_photos` | Fotos de salida (posiciones: d1/d2/d3/d4 → D1-D4) |
| `technicians` | Técnicos/usuarios (name, pin, role) |

#### Módulo Urgencias (ACTECO)

| Tabla | Descripción |
|-------|-------------|
| `acteco_inspections` | Inspección de urgencia (datos cliente, máquina, avería, solución, firmas) |
| `acteco_photos` | Fotos generales y de avería (photo_type: general/averia) |
| `acteco_materials` | Materiales utilizados (name, quantity) |

#### Módulo Averías

| Tabla | Descripción |
|-------|-------------|
| `averias_inspections` | Inspección de avería (datos cliente, máquina, solución, firmas) |
| `averias_defects` | Cada avería individual detectada |
| `averias_defect_photos` | Fotos de cada avería individual |
| `averias_photos` | Fotos generales y de solución (photo_type: general/solucion) |
| `averias_materials` | Materiales utilizados (name, quantity, reference) |

### Campos Clave en `machines`

```
id (UUID PK), name, machine_type, brand, model, serial_number, license_plate,
client_name, client_type, location, reviewed_by, date, notes,
inspection_status ('entrada' | 'salida' | ...),
pdf_url, exit_pdf_url,
created_at
```

### Row Level Security (RLS)

- RLS **habilitado** en todas las tablas
- Políticas: `FOR ALL USING (true) WITH CHECK (true)` → acceso público total via anon key
- No hay autenticación Supabase Auth; la auth es custom (tabla `technicians` + PIN)

### Storage

- **Bucket:** `inspection-photos`
- **Estructura de carpetas en Storage:**
  - `inspecciones/{cliente}_{matricula}/general/` — Fotos generales A1-A4
  - `inspecciones/{cliente}_{matricula}/checklist/` — Fotos checklist
  - `inspecciones/{cliente}_{matricula}/comentarios/` — Fotos comentarios
  - `inspecciones/{cliente}_{matricula}/exit_checks/` — Fotos comprobaciones salida
  - `inspecciones/{cliente}_{matricula}/salida/` — Fotos salida D1-D4
  - `inspecciones/{cliente}_{matricula}/informe_*.pdf` — PDF entrada
  - `inspecciones/{cliente}_{matricula}/informe_salida_*.pdf` — PDF salida
  - `urgencias/{ubicacion}_{fecha}/` — Fotos y PDF urgencias ACTECO
  - `averias/{ubicacion}_{fecha}/` — Fotos y PDF averías

---

## 🔄 Flujos de la App

### 1. Flujo de Inspección de Entrada

```
Login → Selección tipo máquina → Nueva máquina (datos) →
Fotos generales (A1-A4) → Checklist (por tipo) → Comentarios con fotos →
Generar PDF → Compartir ZIP (PDF + imágenes) + Upload PDF a Supabase
```

### 2. Flujo de Inspección de Salida

```
Login → Lista máquinas (estado: entrada) → Seleccionar máquina →
Comprobación ítems checklist (verified/pendiente + foto + comment) →
Fotos salida (D1-D4) → Generar PDF salida → Upload a Supabase
→ Estado máquina cambia a "salida"
```

### 3. Flujo de Urgencias (ACTECO)

```
Login → Nuevo informe urgencia → Datos cliente/máquina →
Fotos generales (hasta 4) → Aviso avería + Avería detectada + Causa →
Fotos avería → Solución (sí/no) + Observaciones + Materiales →
Firmas (técnico + cliente) → Generar PDF → Compartir + Upload a Supabase
```

### 4. Flujo de Averías

```
Login → Nuevo informe avería → Datos cliente/máquina →
Fotos generales → Averías detectadas (lista dinámica, cada una con fotos) →
Intervención/Solución + Fotos solución → Materiales (name, qty, reference) →
Firmas (técnico + cliente) → Generar PDF → Compartir + Upload a Supabase
```

---

## 📄 Generación de PDFs

### Tecnología

- **expo-print** (`Print.printToFileAsync`) — Convierte HTML a PDF
- **expo-sharing** — Comparte el archivo generado
- **jszip** — Empaqueta PDF + imágenes originales en .zip

### Archivos generadores

| Generador | Archivo | Output |
|-----------|---------|--------|
| Inspección entrada | `utils/reportGenerator.ts` | ZIP (PDF + fotos) |
| Inspección salida | `utils/exitReportGenerator.ts` | PDF subido a Supabase |
| Urgencia ACTECO | `utils/actecoReportGenerator.ts` | PDF compartido + subido |
| Averías | `utils/averiasReportGenerator.ts` | PDF compartido + subido |

### Proceso general

1. Se genera HTML con estilos inline (plantilla A4 profesional con logo, colores corporativos azul/naranja)
2. Las fotos se convierten a base64 (redimensionadas a 300-800px, compresión 0.4-0.5)
3. `Print.printToFileAsync({ html, width: 595, height: 842 })` → genera PDF A4
4. Para inspecciones de entrada: se crea ZIP con PDF + imágenes originales renombradas
5. Se sube el PDF a Supabase Storage y se guarda la URL en la tabla correspondiente (`pdf_url`, `exit_pdf_url`)

### Nomenclatura archivos

- Entrada: `{Cliente}_{TipoMáquina}_{Matrícula}.pdf` / `.zip`
- Salida: `informe_salida_{Cliente}_{Matrícula}.pdf`
- Urgencias: `{CLIENTE}_URGENCIAS_{Ubicación}_{Fecha}_{Hora}.pdf`
- Averías: `{CLIENTE}_AVERIAS_{Ubicación}_{Fecha}_{Hora}.pdf`

### Diseño PDF

- Header con gradiente azul oscuro (#0a1f3d → #1a4a85)
- Logo empresa en badge circular blanco
- Acentos naranja (#e87a20)
- Tarjetas info cliente/máquina en 2 columnas
- Fotos generales en grid 2x2
- Checklist en tabla con pills de estado (ok=verde, fail=naranja, na=gris, cant=purple)
- Fotos de evidencia inline
- Footer con datos empresa y aviso LOPD
- Marca de agua con logo al 4% opacidad

---

## 🏗️ Tipos de Máquina y Checklists

### Tipos definidos (`data/machineTypes.ts`)

| ID | Nombre | Abreviatura |
|----|--------|-------------|
| `autocompactador` | Autocompactadores | AC |
| `compactador-estatico` | Compactador Estático | CE |
| `rotoprensa` | Rotoprensas | RT |
| `volteador` | Volteadores | V |
| `contenedor` | Contenedores | C |
| `caja-estatica` | Caja Estática | CJ |
| `prensa-vertical` | Prensa Vertical | PV |
| `otros` | Otros | O |

### Checklists por tipo (`data/machineChecklists.ts`)

Cada tipo tiene categorías específicas. Ejemplo para **Autocompactadores**:

- **General** (24 ítems): ganchos, suelo, vigas, rodillos, puerta descarga, chapa/pintura, tolva, pegatinas, teflones, goma estanca, etc.
- **Electricidad**: botoneras, paros de emergencia, cuadro eléctrico, final de carrera, etc.
- **Hidráulica**: grupo hidráulico, mangueras, cilindros, aceite, etc.

Estados posibles por ítem: `ok` | `fail` | `na` | `cant` (con comentario de motivo)

---

## 🔐 Autenticación

### App Móvil

- Tabla `technicians` en Supabase
- Selección de técnico de una lista → introducir PIN
- Sesión guardada en `AsyncStorage` (key: `currentTechnician`)
- Todos los técnicos pueden usar la app
- No usa Supabase Auth (solo la DB directa)

### Panel Web

- Misma tabla `technicians`, pero **solo `role: "admin"`**
- Selección de admin de lista → introducir PIN
- Sesión en `localStorage` (key: `inval_session`)

---

## 🚀 Deploy

### App Móvil

- **EAS Build** (Expo Application Services)
- Perfiles: `development` (dev client), `preview` (APK), `production` (auto-increment)
- Package Android: `com.miguelin44.Inval`
- No hay iOS configurado (solo `supportsTablet: true`)

### Panel Web

- **Vercel** — Deploy automático desde GitHub
- Proyecto: `inval-panel`
- Variables de entorno configuradas en Vercel (NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY)

### Base de Datos

- **Supabase** (hosted) — Plan no especificado
- Proyecto ref: `ywtqtdnqcytbtckkdien`

---

## 📦 Servicios Externos

| Servicio | Uso | Proveedor |
|----------|-----|-----------|
| Base de datos | PostgreSQL (tablas, RLS) | Supabase |
| Storage de fotos/PDFs | Object storage (bucket `inspection-photos`) | Supabase Storage |
| Auth | Custom (tabla technicians + PIN) | Supabase DB |
| Hosting web | Deploy panel Next.js | Vercel |
| Build móvil | Compilación Android APK/AAB | EAS (Expo) |
| Repositorio | Código fuente | GitHub |

---

## 🔧 Migración AsyncStorage → Supabase

La app originalmente usaba **AsyncStorage** local. Se migró a Supabase con funciones de migración automática:

- `storage.ts` → `migrateFromAsyncStorage()` — Migra máquinas, checklists, fotos
- `actecoInspectionStorage.ts` → `migrateActecoFromAsyncStorage()` — Migra urgencias ACTECO
- IDs viejos (no-UUID) se convierten a UUID v4 durante la migración
- Datos legacy se eliminan de AsyncStorage tras migrar exitosamente
- `actecoStorage.ts` todavía existe como legacy (solo AsyncStorage, sin Supabase)

---

## 📌 Notas Técnicas

- **Cache**: Máquinas y urgencias ACTECO se cachean 30 segundos en memoria
- **Fotos**: Se redimensionan antes de subir (máx 800px para PDF, compresión JPEG 0.4-0.5)
- **Nombres de archivo en Storage**: Se sanitizan (sin acentos, caracteres especiales → underscores)
- **Firmas**: Se capturan como imágenes (base64/URI), se procesan igual que fotos
- **PDF exitoso**: Se guarda URL pública en la tabla de la máquina/inspección
- **Borrado en cascada**: Al borrar máquina/inspección, se borran tanto las filas DB (CASCADE) como los archivos en Storage
- **Orientación**: App bloqueada a `portrait`
- **React Compiler**: Habilitado experimentalmente

---

## 🚀 Cómo Arrancar en Local

### App Móvil (Expo)

```bash
# 1. Ir al directorio del proyecto
cd "/home/miguel/Documents/Mis proyectos /Prroyecto APP/Inval"

# 2. Instalar dependencias
npm install

# 3. Arrancar el servidor de desarrollo
npx expo start
```

**Opciones de ejecución:**

| Comando | Qué hace |
|---------|----------|
| `npx expo start` | Arranca Metro bundler (escanea QR con Expo Go) |
| `npx expo start --android` | Arranca y abre en emulador Android |
| `npx expo start --tunnel` | Usa ngrok tunnel (útil si el móvil no está en la misma red) |

**Requisitos previos:**

- Node.js v18+ (recomendado v22)
- npm o yarn
- Expo Go instalado en el móvil (Android) para desarrollo rápido
- O un dev client construido con `eas build --profile development`

**Variables de entorno:** No se necesitan. Las credenciales de Supabase están **hardcodeadas** directamente en `utils/supabase.ts` (URL y anon key). Esto es una deuda técnica — ver sección de mejoras.

**Probar en el móvil:**

1. Ejecuta `npx expo start`
2. Escanea el QR con la app Expo Go (Android)
3. Si no conecta, prueba `npx expo start --tunnel` (requiere `@expo/ngrok`, ya instalado)

### Panel Web (Next.js)

```bash
# 1. Ir al directorio del panel
cd "/home/miguel/Documents/Mis proyectos /Prroyecto APP/inval-panel"

# 2. Instalar dependencias
npm install

# 3. Crear archivo .env.local (si no existe)
cat > .env.local << 'EOF'
NEXT_PUBLIC_SUPABASE_URL=https://ywtqtdnqcytbtckkdien.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl3dHF0ZG5xY3l0YnRja2tkaWVuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQyNjMzMDcsImV4cCI6MjA4OTgzOTMwN30.mHOkHbqFQX88hjISrU2zGTNiTZWH1Z-6Dk0aTZTnnLk
EOF

# 4. Arrancar en modo desarrollo
npm run dev
```

El panel estará disponible en `http://localhost:3000`. Login solo con técnicos con `role: "admin"`.

---

## 📊 Estado Actual del Proyecto

### ✅ Qué funciona

- **Inspección de entrada completa**: datos máquina → fotos generales → checklist por tipo → comentarios → PDF → compartir ZIP → upload a Supabase
- **Inspección de salida completa**: seleccionar máquina con estado "entrada" → verificar ítems → fotos salida → PDF → upload
- **Urgencias ACTECO completas**: formulario completo → fotos → avería/causa → solución/materiales → firmas → PDF → upload
- **Averías completas**: formulario → averías dinámicas con fotos → solución → materiales → firmas → PDF → upload
- **Panel web funcional**: dashboard + listas + detalles de inspecciones, urgencias y averías
- **Login por PIN** en ambas plataformas (app: todos los técnicos, panel: solo admins)
- **Generación de PDF** profesional con logo, colores corporativos, fotos embebidas
- **Migración AsyncStorage → Supabase** automática
- **Borrado en cascada** (DB + Storage)
- **Deploy**: App vía EAS Build (Android APK/AAB), Panel en Vercel

### ⚠️ Deuda técnica y cosas a mejorar

| Área | Detalle |
|------|---------|
| **Credenciales hardcodeadas** | `utils/supabase.ts` tiene URL y anon key directamente en el código. Debería usar variables de entorno (`expo-constants` + `app.json` extras o `.env`) |
| **Archivo legacy `actecoStorage.ts`** | Todavía existe el storage basado en AsyncStorage para ACTECO. Ya migrado a Supabase en `actecoInspectionStorage.ts`, pero el archivo viejo sigue ahí. Se puede eliminar si no hay referencias activas |
| **RLS abierto** | Las políticas RLS son `USING (true) WITH CHECK (true)` → cualquiera con la anon key puede leer/escribir todo. Funciona, pero en producción debería restringirse |
| **Sin Supabase Auth** | La autenticación es custom (tabla + PIN). No hay tokens JWT de usuario → no se puede hacer RLS granular |
| **Sin tests** | No hay tests unitarios ni de integración |
| **Sin `.env`** | La app móvil no usa archivo `.env` — todo hardcodeado |
| **Sin validación de formularios robusta** | Los formularios dependen del estado local sin librería de validación (no Zod, no Yup) |
| **`checklistData.ts` duplicado** | Existe tanto en la app (`data/`) como en el panel (`src/lib/`). Cambios en uno hay que replicarlos manualmente en el otro |

### 🐛 Bugs conocidos

- No se han detectado FIXMEs ni TODOs activos en el código fuente (fuera de `node_modules`)
- El único comentario relevante es "Limpiar archivo temporal" en `reportGenerator.ts` (línea 1514), que es una operación normal del flujo de PDF

---

## 🛠️ Cómo Seguir Mejorando — Próximos Pasos

### Prioridad alta

1. **Mover credenciales a variables de entorno** — Usar `expo-constants` con `app.json > extra` o `app.config.js` con `process.env`. Evita tener la anon key en el código fuente público
2. **Eliminar `actecoStorage.ts`** — Confirmar que no hay imports activos y borrarlo. Es código legacy muerto
3. **Endurecer RLS** — Crear políticas reales en Supabase (al menos limitar escritura a roles conocidos). Ahora mismo cualquier persona con la anon key puede borrar datos
4. **Compartir tipos y datos entre app y panel** — Extraer `checklistData`, tipos de máquina, y tipos TypeScript a un paquete compartido (monorepo con workspaces, o un repo de tipos)

### Prioridad media

5. **Validación de formularios** — Integrar Zod o Yup para validar datos antes de guardar
6. **Tests básicos** — Al menos tests de las funciones de `storage.ts`, `photoUpload.ts`, y generadores de PDF
7. **Manejo de errores offline** — La app asume conexión. Añadir cola de reintentos o feedback cuando falla la red
8. **Notificaciones** — Push notifications cuando se asigna una inspección o se completa un informe
9. **Roles más granulares** — Ahora solo hay "técnico" y "admin". Podría haber "supervisor", "cliente readonly", etc.

### Prioridad baja / nice-to-have

10. **iOS** — Solo hay config Android. Publicar en App Store requiere cuenta Apple Developer + config en `app.json`
11. **Modo oscuro** — `userInterfaceStyle: "automatic"` está activo pero no hay estilos dark reales
12. **Optimización de imágenes** — Las fotos se comprimen a 0.4-0.5 JPEG, pero podrían cachearse localmente para evitar re-descargas
13. **Historial / auditoría** — Registrar quién editó qué y cuándo (campos `updated_by`, `updated_at`)
14. **Exportación masiva** — Descargar todos los informes de un periodo desde el panel web

---

## 👨‍💻 Guía para un Dev Nuevo

### Requisitos del entorno

- **Node.js** v18+ (recomendado v22)
- **npm** (viene con Node)
- **Git** para clonar los repos
- **Expo Go** (Android) para probar la app en el móvil
- **Cuenta Supabase** — ya está creada, pero necesitas acceso al dashboard: https://supabase.com/dashboard/project/ywtqtdnqcytbtckkdien

### Setup inicial

```bash
# Clonar repos
git clone https://github.com/MiguelonDevXiri/AppInvalMovil.git Inval
git clone https://github.com/MiguelonDevXiri/inval-panel.git

# App móvil
cd Inval && npm install && npx expo start

# Panel web (en otra terminal)
cd inval-panel && npm install && npm run dev
```

### Conectar con Supabase

- **Dashboard**: https://supabase.com/dashboard/project/ywtqtdnqcytbtckkdien
- **Tablas**: Table Editor → ver todas las tablas documentadas arriba
- **Storage**: Storage → bucket `inspection-photos`
- **SQL Editor**: Para ejecutar scripts de `sql/` o modificar tablas
- La **anon key** ya está en el código (ver `utils/supabase.ts` en la app y `.env.local` en el panel)
- **No se usa Supabase Auth** — la autenticación es custom con la tabla `technicians`

### Flujo de desarrollo típico

1. **Arranca la app** con `npx expo start` → escanea QR con Expo Go
2. **Haz cambios** en el código → hot reload automático
3. **Prueba los flujos completos**: crear máquina → hacer inspección → generar PDF → verificar en Supabase que los datos y fotos se subieron
4. **Verifica en el panel**: abre `localhost:3000` → login como admin → comprueba que las inspecciones aparecen
5. **Commit y push** → el panel se deploya automáticamente en Vercel

### Estructura de navegación (Expo Router)

La app usa **file-based routing** con Expo Router:
- `app/_layout.tsx` → Layout raíz
- `app/(tabs)/_layout.tsx` → Tab navigator (barra inferior)
- Cada archivo `.tsx` en `app/(tabs)/` es una pantalla
- La navegación entre pantallas es con `router.push('/nombre-pantalla')` pasando parámetros por query string

### Cómo añadir una pantalla nueva

1. Crear `app/(tabs)/mi-pantalla.tsx`
2. Exportar un componente React por defecto
3. Navegar con `router.push('/mi-pantalla?param=valor')`
4. Leer params con `useLocalSearchParams()`

### Cómo añadir un tipo de máquina nuevo

1. Añadir entrada en `data/machineTypes.ts`
2. Añadir checklist en `data/machineChecklists.ts`
3. **Replicar** el checklist en `inval-panel/src/lib/checklistData.ts`

### Cómo hacer un build Android

```bash
# APK de prueba (para instalar directo)
npx eas build --platform android --profile preview

# Build de producción (AAB para Play Store)
npx eas build --platform android --profile production
```

---

## 🔗 Relación entre App Móvil y Panel Web

### Qué comparten

| Recurso | Detalle |
|---------|---------|
| **Base de datos Supabase** | Mismas tablas, mismo proyecto, misma URL |
| **Storage bucket** | Mismo bucket `inspection-photos` para fotos y PDFs |
| **Tabla `technicians`** | Mismos usuarios, la app filtra todos, el panel filtra `role: "admin"` |
| **Datos de checklist** | Misma lógica, pero duplicada en `data/machineChecklists.ts` (app) y `src/lib/checklistData.ts` (panel) |

### Cómo se conectan

```
┌─────────────────┐         ┌─────────────────────────┐
│   App Móvil      │         │      Panel Web           │
│  (Expo/RN)       │         │    (Next.js/Vercel)      │
│                  │         │                          │
│  - Crea datos    │────────▶│  - Lee datos             │
│  - Sube fotos    │  Supabase  │  - Muestra listas     │
│  - Genera PDFs   │◀────────│  - Detalle inspecciones  │
│  - Técnicos      │  (DB +  │  - Solo admins           │
│                  │ Storage) │                          │
└─────────────────┘         └─────────────────────────┘
```

**Flujo real:**
1. El **técnico** usa la app móvil en campo para hacer inspecciones
2. Los datos (máquinas, checklists, fotos, PDFs) se suben a **Supabase** en tiempo real
3. El **administrador** abre el panel web para ver las inspecciones, urgencias y averías con sus detalles y fotos
4. El panel es **solo lectura** — no crea ni edita inspecciones, solo las visualiza

### Independencia

- Cada proyecto tiene su propio `package.json`, repo GitHub, y deploy
- No hay monorepo ni paquetes compartidos — son proyectos independientes que apuntan a la misma DB
- Los cambios en la estructura de la DB afectan a ambos y hay que actualizarlos por separado
- Los scripts SQL de migración están en `sql/` dentro de la app móvil (no del panel)
