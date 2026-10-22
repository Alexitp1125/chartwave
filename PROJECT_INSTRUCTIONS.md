# Chartwave — instrucciones del proyecto

Sigue `dev-conventions`. Aquí solo va lo propio de esta app.

## Resumen

| | |
|---|---|
| App | **Chartwave**: generador de gráficas 3D. La v1 es solo el donut. |
| Subdominio | `chartwave.alexitp1125.com` |
| Repo | `chartwave` en GitHub (antes `graphic-generator`, renombrado el 2026-10-21). Licencia MIT para el código. |
| Prefijo CSS | `cw-` |
| Estado | **v1 (donut 3D) desplegada** en https://chartwave.alexitp1125.com (2026-10-21). **v1.1 (instalable, §11) probada en la PC y en despliegue (2026-10-21).** |
| En el hub | Tarjeta "3D Donut Chart": pasa a Chartwave / *Live* en el chat del hub. |

**Dónde estoy:** v1 en producción; v1.1 probada en la PC, se sube y se despliega el 2026-10-21. La fuente de verdad es
`C:\dev\chartwave` (PC de casa) y GitHub.

**v1.1, instalable como app (`CONVENTIONS.md` §11) — hecho:**

- Icono: Rako con un mini donut detrás, fondo aguamarina (`app-icon.svg`, opción A de la demo, aprobada).
  De él salen `icon-maskable-512.png` y `apple-touch-icon.png` (180 px, opacos).
- `manifest.webmanifest` según §11.1; `sw.js`, `offline.html` y `js/app-shell.js` copiados tal cual de `dev-conventions/pwa/`.
- `App.razor` según §11.3. Clave del tema en `localStorage`: `theme` (antes `cw-theme`).
- Barra: Instalar, Atrás (fuera de `/` y `/donut`), Compartir y Recargar (solo instalada), diálogo de iPhone, zonas
  seguras y enlace al hub con `target="_blank" rel="noopener"`. En el teléfono el enlace al hub baja al final de la página.
- Probado en Chromium con una copia estática de la barra: manifiesto e *Installability* sin errores, service worker
  activo, página sin conexión, botón Instalar (con un `beforeinstallprompt` simulado), Compartir (copia y aviso), tema
  y `theme-color`, de 320 a 1280 px sin desbordes.

**Qué sigue:**

1. Tras el despliegue, comprobar según §11.8: Android (Chrome y Brave), iPhone (Safari) y PC (Chrome o Edge).
   Instalada: Atrás, Compartir, Recargar, sin conexión y zonas seguras.
2. Instalar desde el hub (§11.7): todavía no. Una página no puede instalar otra hasta que `<install>` salga en estable
   (Chrome 158, previsto para el 17-nov-2026). Lo decide el chat del hub; por parte de Chartwave ya está listo
   (`id` en el manifiesto).
3. Después: candidatas para la v1.2, compartir por enlace (estado en la URL) y etiquetas legibles en el móvil.

**Pendiente menor:** el `Dockerfile` repite `ENV ASPNETCORE_URLS=http://+:8080`, que la imagen de .NET ya trae como
`HTTP_PORTS=8080` (el log avisa "Overriding HTTP_PORTS"). Funciona igual. Si se quita, quitarlo en todas las apps a la
vez (viene del `Dockerfile` de referencia del hub).

## Primera prueba

1. Abrir `Chartwave.sln` y ejecutar el perfil `http` (o `dotnet run --project Chartwave`). Se abre en `http://localhost:5080`.
2. Comprobar que existe `Chartwave.Client/wwwroot/js/donut-chart.js`, generado al compilar desde
   `Interop/donut-chart.ts`, y que `http://localhost:5080/js/donut-chart.js` responde.
3. En la página: Ejemplo → la gráfica se dibuja; hover → tooltip; sliders; cambiar el color; PNG/JPG; tema; EN/ES.
4. `http://localhost:5080/no-existe` → 404 con Rako.
5. Hacer *Rebuild* (no solo *Build*) y repetir el punto 2: comprueba que el JS compilado no duplica los static web assets.
6. App instalable: DevTools → Application → Manifest sin errores (iconos visibles, *Installability* sin avisos) y
   Service workers con `sw.js` activo. Instalar desde el botón de la barra o el de la barra de direcciones: en la
   ventana de la app salen Compartir y Recargar (y Atrás en `/no-existe`). Network → Offline + recargar → página sin
   conexión con Rako.

## Decisiones de esta app

| Decisión | Por qué |
|---|---|
| v1 = solo el donut. Fuera: otros tipos, guardar, compartir por enlace, CSV, SVG, animaciones, `.Tests`. | Bicicleta antes que Porsche. Compartir por enlace (estado en la URL, sin base de datos) es candidata a v1.1. |
| Solo host + `.Client`; sin `.Shared`, `.Data` ni `.Application`. | No hay datos ni servidor que consultar (`CONVENTIONS.md` §1.2). |
| Solo se registra **WebAssembly** (no Server). La página del generador es `InteractiveWebAssembly`; layout, 404 y 500 son SSR. | Todo pasa en el navegador: sin circuitos de SignalR en el droplet de 2 GB y sin lag en los sliders. Añadir Server son dos líneas en `Program.cs`. |
| El formulario no usa `EditForm`. La validación es del ViewModel (`IsValid`, valor ≥ 0) y `maxlength` en los inputs. | No hay "enviar": la gráfica es en vivo. `EditForm` + `DataAnnotations` no valida filas de una lista sin el validador experimental de .NET 10. |
| Nombres con `oninput`; números con `onchange` (al salir del campo, Enter o flechas). | `oninput` en `type="number"` pelea con valores a medio escribir ("1.", "-"). |
| `DonutChartViewModel` se convierte a `DonutChartOptions` con un operador implícito (como el `Details` de las convenciones). | Es el contrato con TypeScript. C# formatea los textos (idioma, sufijo) y TS solo dibuja. |
| Interop con `IJSRuntime` + módulo ES importado (`IJSObjectReference`), no `[JSImport]`. | Funciona igual en prerender, Server y WASM, y acepta `ElementReference`. `[JSImport]` es solo WASM. |
| TypeScript 7 con `Microsoft.TypeScript.MSBuild` **7.0.1**; el `.js` generado no se sube a Git. | Una sola fuente de verdad (`.ts`). La 7 trae su compilador nativo (Go) para Windows y Linux, así que el `Dockerfile` no necesita Node. |
| En `Chartwave.Client.csproj`: `EnableTypeScriptNuGetTarget=true`, `TypeScriptTarget` vacío y el target `AddTypeScriptOutputToStaticWebAssets`. | (1) Sin la primera propiedad, Visual Studio carga también su TypeScript clásico (`Microsoft SDKs\TypeScript`), que busca un compilador "7.0" y falla con "No compiler was found". El paquete 6.x la ponía solo; el 7 no. (2) Sin vaciar `TypeScriptTarget`, el paquete pasa `--target ES2020` y se impone al `tsconfig.json`. (3) El SDK recoge los static web assets antes de compilar el TS: en un build limpio (Docker) el `.js` daba 404. El target compila antes y lo añade a `Content` ([dotnet/sdk#52301](https://github.com/dotnet/sdk/issues/52301)). |
| Dibujo por capas: sombra, paredes interiores, paredes exteriores y tapas. Sin caras de corte. Cada pared con un degradado continuo, y relleno + trazo con la misma pintura. | Las porciones se tocan, así que las caras de corte nunca se ven; pintarlas daba el efecto "transparente". Las franjas de tono plano y el antialiasing entre vecinas daban rayas. Por capas no hace falta ordenar porciones. |
| Colores de las porciones: paleta base de la marca en `SlicePalette.cs`. Colores del canvas: leídos de las variables CSS del tema activo. | La paleta base es fija según `DECISIONS.md`. El canvas no lleva ningún color escrito a mano y se redibuja solo al cambiar el tema. |
| Idioma: solo la cookie de cultura; sin ella, inglés (no se usa `Accept-Language`). El cambio de idioma recarga la página (`data-enhance-nav="false"`). | Inglés por defecto (convención). WASM fija su cultura al arrancar, así que hay que reiniciarlo. |
| La cultura de WASM se pasa con `Blazor.start({ webAssembly: { applicationCulture } })`, leída de `<html lang>`. | Así WASM carga los recursos de `es` desde el arranque. .NET 10 además conserva por defecto la cultura del servidor (`UseCultureFromServer`). |
| Tema con `js/theme.js` (JS plano en el host, `localStorage` `theme`; hasta la v1.1 era `cw-theme`). | Son 30 líneas en una barra SSR; no justifica TypeScript ni interactividad en el host. La clave es la común de §11.3: `offline.html` la lee. Quien ya eligió tema antes de la v1.1 vuelve una vez al oscuro. |
| v1 desplegada sin §11 (instalable); va en la v1.1. | La regla llegó el mismo día. Necesitaba el icono propio de la app (diseño con demo) y pruebas de instalación reales; se hizo igual con Mixtape. |
| Icono de app: Rako con un donut de tres porciones detrás (crema, violeta y rosa, como la paleta base), fondo aguamarina. | El detalle pequeño de §11.2 dice qué hace la app. El aguamarina no lo usan el hub ni Mixtape. Todo dentro del círculo seguro del 80 %. Para cambiarlo: editar `app-icon.svg` y volver a sacar los dos PNG. |
| Botones de la app: Atrás, Compartir y Recargar sin borde; el del tema sigue siendo el círculo. Orden: Instalar, hub, idioma, tema, Compartir, Recargar. | El círculo marca el control que se usa en el navegador; los de la app son secundarios. Se mantiene el orden de la v1 y lo nuevo va en los extremos. |
| Teléfonos: el texto CHARTWAVE se oculta (queda Rako) hasta 420 px si se ve Instalar, y hasta 460 px en la app instalada. | Medido en Chromium con Jost: a esos anchos el nombre se pisa con los botones. Mixtape usa 400 px, pero su nombre es más corto. |
| Sin `UseHttpsRedirection` ni HSTS. | El TLS y la redirección a HTTPS los hace Caddy. |
| Sin carpeta `DependencyInjection/` todavía. | Solo hay `AddLocalization()`; se crea cuando haya servicios propios. |

## Objetivo a largo plazo: el motor como librería

Chartwave no es solo esta página. El objetivo es un **motor de gráficas reutilizable**: algo que reciba
instrucciones (datos y opciones) y devuelva la gráfica de varias formas (en un canvas, como imagen...), para usarlo
en otras apps sin empezar de cero. Se distribuiría como paquete JS (`.min.js` / npm), como paquete NuGet, o ambos,
y se iría ampliando con cada uso.

**Todavía no se construye** (bicicleta antes que Porsche). Mientras tanto, para no cerrar esa puerta:

- `Interop/donut-chart.ts` no depende de Blazor: recibe `DonutChartOptions` y dibuja. Es la semilla del paquete JS.
- `DonutChartInterop` + `DonutChartOptions` son la semilla del paquete NuGet: una Razor Class Library con un
  componente tipo `<DonutChart Options="..." />`.
- Regla: lo propio de la app (ViewModel, idioma, textos de la página) no entra en el motor; llega por las opciones.
- Lo primero que habría que cambiar al extraerlo: el motor lee los colores del tema de las variables CSS de la marca
  (`readTheme`). En una librería esos colores entrarían por las opciones, con la marca como valor por defecto.
- Momento de extraerlo: cuando llegue el segundo tipo de gráfica o la primera otra app que lo necesite.

## Trampas conocidas

- **`SharedResource`**: no activar *Custom Tool* (`ResXFileCodeGenerator`) en los `.resx`. Generaría otra clase
  `SharedResource` y chocaría con la clase marcadora.
- **Números en CSS**: con cultura `es`, `66.7.ToString()` da `"66,7"`, que no es CSS válido. Para estilos, usar siempre
  `CultureInfo.InvariantCulture` (ver `TotalBarWidth`).
- **Al cambiar la versión de TypeScript**, probar con *Clean + Rebuild* y abrir
  `/js/donut-chart.js`. El target `AddTypeScriptOutputToStaticWebAssets` depende de los
  targets `SetTscExecutable` y `RunTscCompile` del paquete 7.x; si un paquete futuro los renombra, el build lo dirá.
- **Rutas del `wwwroot` de `.Client`**: se sirven desde la raíz del sitio (`/js/donut-chart.js`), no desde
  `/_content/Chartwave.Client/` (ese prefijo es para Razor Class Libraries). Ojo con repetir nombres entre el
  `wwwroot` del host y el del `.Client`: comparten la raíz.
- **El canvas siempre está en el DOM** (se oculta con `cw-hidden`). Si se quita con `@if`, el módulo TS se queda con un
  canvas que ya no existe.
- **`sw.js`, `offline.html` y `js/app-shell.js` no se editan aquí**: son copias de `dev-conventions/pwa/`. Si algo
  cambia, se cambia allí y se vuelve a copiar.
- **Reglas de la barra con `:has()`** (ocultar el nombre en teléfonos) están en `app.css`, no en `MainLayout.razor.css`,
  para que el aislamiento de CSS no reescriba el selector.
- **Móvil**: el canvas mide 800 × 540 lógicos y se escala; en pantallas estrechas las etiquetas quedan pequeñas.
  Pendiente para después de la v1.

## Bitácora

### 2026-10-21 — PC del trabajo

- Acordados el nombre (Chartwave), el subdominio, el prefijo `cw-` y el alcance de la v1.
- Creada la solución en `C:\dev\charts`: host + `.Client`, `Dockerfile` (8080), barra con Rako, favicon, 404/500 con
  Rako, `tokens.css` v3 y EN/ES.
- Portado el prototipo: ViewModel en C#, dibujo y exportación en `Interop/donut-chart.ts`.
- Probado aquí: el TS compila con TypeScript 7 en modo estricto, y el dibujo (temas, hover, exportación 3200 × 2160 y
  móvil) se probó en Chromium con una página de prueba.
- Primer build en la PC: el C# compiló; la app arrancó (barra, idioma, tema, formulario). Dos problemas de TypeScript:
  - Con el paquete 7.0.1, Visual Studio cargaba su TypeScript clásico → "No compiler was found". Se probó la 6.0.3
    (funciona) y se volvió a la 7.0.1 con `EnableTypeScriptNuGetTarget=true`.
  - `donut-chart.js` daba 404: existía en el disco pero no estaba registrado como static web asset. Se añadió el
    target que compila antes de que el SDK los recoja. El `Dockerfile` ya no instala Node.
  - Seguía el 404: la ruta del módulo era `/_content/Chartwave.Client/js/...` y la buena es `/js/...` (el manifiesto
    del host ya tenía el JS registrado tras el Clean, así que el target funciona).
- Quitado el contorno de foco del `h1` (lo pone `FocusOnNavigate`), como en la plantilla de .NET.
- Probado en la PC: la v1 funciona (Ejemplo, sliders, leyenda, descargas).
- Dibujo v2 (con demo antes/después aprobada): sin caras de corte, paredes con degradado continuo, sin rayas entre
  porciones, sombra en anillo y separadores finos. El JS generado es el mismo con TypeScript 6 y 7.
- Apuntado el objetivo a largo plazo: el motor como librería reutilizable (JS y/o NuGet).
- Fin de la sesión: zip `chartwave-2026-10-21.zip` (sin `bin`, `obj`, `.vs` ni el JS generado) para llevarlo a casa.

### 2026-10-21 — PC de casa, primer despliegue

- Repo renombrado de `graphic-generator` a `chartwave`; el código entra en `C:\dev\chartwave`. Se conservan el
  `LICENSE` (MIT) y el `.gitignore` de GitHub, fusionado con el nuestro.
- Leído el requisito nuevo de `dev-conventions` (§11, apps instalables). Se deja para la v1.1 (lista arriba).
- Quitado el `apple-touch-icon` (`favicon-180.png` ya no está en la marca).
- Añadida la app a `server-infra`: servicio `chartwave` en el compose y `chartwave.alexitp1125.com` en el Caddyfile.
- **Desplegada.** Health check previo: disco al 23 %, 1,3 GB de RAM libre. Build en el droplet: 121 s, con TypeScript 7
  en Linux sin Node. Caddy recreado y certificado de Let's Encrypt a la primera. Comprobado en el servidor:
  `wwwroot/js/donut-chart.js` publicado (con `.br` y `.gz`) y HTTP 200 por HTTPS.
- Avisos del log, inofensivos: claves de DataProtection sin persistir (no hay login ni formularios que las usen) y
  "Overriding HTTP_PORTS" (ver *Pendiente menor*).

### 2026-10-21 — PC de casa, v1.1 (instalable)

- Icono: tres propuestas (aguamarina, atardecer, orquídea) con Rako y un mini donut; aprobada la A (aguamarina). El
  donut se movió a la derecha para que Rako no lo tape y quede dentro de la zona segura.
- Manifiesto, iconos, archivos de `pwa/`, `App.razor`, clave del tema, barra con los botones de la app, diálogo de
  iPhone, pie con el enlace al hub en el teléfono y zonas seguras. Nueve textos nuevos en los `.resx` (EN/ES).
- Probado en Chromium sobre una copia estática (aquí no hay .NET): ver la lista de *Dónde estoy*. El modo instalada no
  se puede emular en Chromium sin ventana; se probó reescribiendo la *media query*.
- Probada en la PC: todo bien. Commit `feat: Chartwave v1.1, installable app` y despliegue igual que la v1 (Caddy sin
  cambios).
