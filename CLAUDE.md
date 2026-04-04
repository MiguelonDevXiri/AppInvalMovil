# Inval — App Movil de Inspecciones Industriales

## Proyecto
App movil para técnicos de INVAL March S.L. (mantenimiento de maquinaria industrial de reciclaje). Los técnicos registran inspecciones, urgencias y averías desde el campo. Los datos se ven después en el panel web (inval-panel).

## Stack
- **Framework:** Expo SDK 54 + React Native 0.81 + React 19
- **Navegación:** expo-router (file-based routing)
- **UI:** react-native-paper, expo-linear-gradient
- **Animaciones:** react-native-reanimated 4.1
- **Base de datos:** Supabase (PostgreSQL) — COMPARTIDA con inval-panel
  - **Ref ID:** `ywtqtdnqcytbtckkdien`
  - **URL:** `https://ywtqtdnqcytbtckkdien.supabase.co`
  - **Cliente:** `utils/supabase.ts`
- **PDFs:** expo-print (genera informes PDF desde la app)
- **Imágenes:** expo-image, expo-image-picker, expo-image-manipulator
- **Almacenamiento local:** AsyncStorage
- **Lenguaje:** TypeScript 5.9
- **Git remote:** https://github.com/MiguelonDevXiri/AppInvalMovil.git

## Estructura
```
app/           # Pantallas (expo-router)
utils/         # Supabase client y utilidades
assets/        # Iconos, splash, imágenes
scripts/       # Scripts de utilidad
```

## Tablas Supabase principales
Las mismas que inval-panel: `machines`, `checklist_results`, `machine_photos`, `checklist_photos`, `exit_checks`, `exit_photos`, `acteco_inspections`, `acteco_photos`, `acteco_materials`, `averias_inspections`, `averias_defects`, `averias_defect_photos`, `averias_photos`, `averias_materials`, `technicians`.

## Skills relevantes
- **vercel-react-native-skills** — Aplicar SIEMPRE. Esta app tiene listas complejas, animaciones con Reanimated, image handling, y navegación con tabs. Todas las reglas aplican directamente.
- **supabase** — Para gestión de tablas, RLS, storage y queries
- **web-design-guidelines** — NO aplica (es app nativa)
- **deploy-to-vercel** — NO aplica (es app movil)
- **react-best-practices** — Aplican reglas de React general (hooks, state, memo) pero NO las de Next.js

## Convenciones
- Idioma del código: español para nombres de negocio, inglés para código técnico
- Supabase client en `utils/supabase.ts`
- Esta app ESCRIBE datos que el panel web (inval-panel) solo LEE
- Los PDFs se generan aquí, no en el panel web
