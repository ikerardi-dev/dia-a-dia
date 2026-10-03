# Día a Día

App personal de retos diarios: tareas con puntos, calendario que se reorganiza
según tu horario, comodín semanal, tienda de recompensas y muro de méritos.
Todo funciona dentro del móvil: el "backend" es SQLite en el propio teléfono.

## Estructura

```
src/
  backend/        Base de datos, reglas y servicios (no sabe nada de React)
    db/           Esquema, migraciones y adaptadores (Android o navegador)
    repositories/ Consultas SQL, una por tabla
    services/     Lógica: planificador, cierre de días, comodín, recompensas...
    api.js        Lo único que usa el frontend
  views/          Las cinco pantallas
  components/     Piezas reutilizables
  forms/          Formularios y ajustes
  hooks/          Carga de datos, reloj, avisos
  lib/            Formatos, catálogos de iconos, avisos del sistema
  styles/         CSS separado por zonas
android/          Proyecto Android generado por Capacitor
scripts/          Pruebas del backend y creación de la clave de firma
```

## Desarrollo en el navegador

```bash
npm install
npm run test:backend   # pruebas del backend
npm run dev            # abre la app en el navegador (los avisos solo van en el APK)
```

## Generar el APK

Necesitas Node 22 o superior.

### Opción A: Android Studio (la más sencilla)

1. Instala Android Studio.
2. En la carpeta del proyecto:
   ```bash
   npm install
   npm run android:sync
   npm run android:open
   ```
3. En Android Studio: **Build > Build App Bundle(s) / APK(s) > Build APK(s)**.
4. El APK queda en `android/app/build/outputs/apk/debug/app-debug.apk`.

Genera siempre el APK desde el mismo ordenador: así se firma con la misma
clave y puedes instalar versiones nuevas encima sin perder tus datos.

### Opción B: GitHub Actions (sin instalar Android Studio)

1. Sube el proyecto a un repositorio de GitHub (rama `dev`).
2. Crea tu clave de firma una sola vez: `bash scripts/create-keystore.sh`
3. En el repositorio: **Settings > Secrets and variables > Actions** y crea:
   - `ANDROID_KEYSTORE_BASE64`: el texto largo que muestra el script
   - `ANDROID_KEYSTORE_PASSWORD`: tu contraseña
4. Cada `push` a `dev` (o a `main`) genera el APK. Lo descargas en la pestaña **Actions**,
   dentro de la ejecución, en el apartado **Artifacts**.

Sin esos secretos el APK se genera igual, pero cada vez con una clave distinta:
para actualizar tendrías que desinstalar y perderías los datos.

Guarda `diaadia.jks` y la contraseña fuera del repositorio (están en `.gitignore`).

## Instalar en el móvil

1. Pasa el APK al móvil y ábrelo.
2. Android pedirá permiso para instalar apps de origen desconocido: acéptalo.
3. Al abrir la app, ve a **Tareas > Ajustes > Avisos > Activar**.

## Después de cambiar código

```bash
npm run android:sync
```
y vuelve a generar el APK. Tus datos se conservan al instalar encima.

## Ramas

- **`dev`**: la versión actual. Aquí van los cambios y de aquí sale el APK que se instala.
- **`main`**: va siempre una versión por detrás. Cuando sale una versión nueva en `dev`,
  `main` se actualiza hasta la anterior.
