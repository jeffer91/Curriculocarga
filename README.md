# Curriculocarga

Aplicación web para que los **coordinadores de carrera** construyan, revisen y completen fichas individuales de análisis por nivel de Construcción Curricular Continua (CCC).

## Arquitectura

- **Cloudflare Pages**: interfaz web y Pages Functions.
- **Repaso-Fire / Realtime Database**: **solo lectura** para validar que la cédula corresponda a un coordinador y conocer `carrerasACargo`.
- **curriculo-ddfcd / Cloud Firestore**: fuente curricular y almacenamiento de fichas, borradores, versiones y correcciones.
- **Firebase Storage**: versiones PDF definitivas de las fichas.

Repaso-Fire nunca se modifica desde esta aplicación.

## Flujo

1. El coordinador ingresa su cédula.
2. Se consultan en Repaso-Fire su rol y sus carreras asignadas.
3. Solo aparecen las carreras asignadas que existen en `curriculo-ddfcd`.
4. Se selecciona carrera, nivel y período.
5. Al crear la ficha se congela la versión de la malla vigente y las materias de ese nivel.
6. La ficha se autoguarda.
7. En cada materia se muestra el CCC actual: PEA Base, Unidades y Actividades.
8. El coordinador puede descargar los tres Excel reconstruidos desde Firestore. Todas sus celdas se generan como texto.
9. Las correcciones del CCC se guardan primero como borrador. Al pulsar **Aplicar corrección CCC** se crea una nueva versión oficial en `materia_versiones`, se registra el cambio en `materia_cambios` y se actualizan `materias`, `pea_base`, `pea_unidades` y `pea_actividades`.
10. El PDF definitivo solo se genera cuando la ficha está 100 % completa y se archiva por versión en Firebase Storage.

## Colecciones nuevas utilizadas

La aplicación conserva las colecciones curriculares existentes y añade únicamente almacenamiento de trabajo:

- `ficha_borradores`: una ficha en progreso por carrera + nivel + período.
- `ccc_borradores`: correcciones CCC todavía no aplicadas.
- `ficha_generaciones`: metadatos y contenido estructurado de cada PDF definitivo generado.

Las colecciones existentes `materia_versiones` y `materia_cambios` se siguen utilizando para el historial curricular, manteniendo el esquema de la app principal `curriculo`.

## Configuración de Cloudflare Pages

### Build

- Framework preset: **None**
- Build command: dejar vacío
- Build output directory: `public`
- Functions directory: `functions` (Cloudflare la detecta automáticamente)

Para desarrollo local:

```bash
npx wrangler pages dev public
```

## Variables y secretos de Cloudflare

Variables normales:

```text
CURRICULO_PROJECT_ID=curriculo-ddfcd
CURRICULO_STORAGE_BUCKET=curriculo-ddfcd.firebasestorage.app
REPASO_DATABASE_URL=https://repaso-fire-d8ceb-default-rtdb.firebaseio.com
```

Secretos obligatorios para escribir de forma protegida en Firestore/Storage:

```text
CURRICULO_SERVICE_ACCOUNT_EMAIL=<client_email de una cuenta de servicio de curriculo-ddfcd>
CURRICULO_PRIVATE_KEY=<private_key PEM de esa cuenta de servicio>
```

La cuenta de servicio debe tener permisos para Firestore y Storage en el proyecto `curriculo-ddfcd`.

### Lectura de Repaso-Fire

Si las reglas actuales de Realtime Database permiten lectura de `docentes-registrados`, no hace falta un secreto adicional. Si la lectura requiere autorización, configurar:

```text
REPASO_DATABASE_TOKEN=<token de solo lectura autorizado para Repaso-Fire>
```

No se implementa ninguna escritura hacia Repaso-Fire.

## Seguridad funcional

- Cada operación vuelve a validar la cédula contra Repaso-Fire.
- El Worker comprueba que la carrera solicitada esté en `carrerasACargo`.
- Firestore no se escribe directamente desde el navegador.
- Una ficha queda bloqueada a otra sesión durante 15 minutos y el bloqueo se renueva con cada guardado.
- El backend vuelve a verificar que la ficha esté completa antes de archivar un PDF definitivo.

## Excel CCC

Los archivos originales no están almacenados en Firebase. La aplicación reconstruye los Excel a partir de la información estructurada:

- `pea_base`
- `pea_unidades`
- `pea_actividades`

Estructuras de salida:

### PEA Base

`codigoComponente`, `ordenComponente`, `descripcionComponente`, `descripcionComponente2`, `descripcionComponente3`.

### PEA Unidades

`ordenComponente`, `descripcionComponente`.

### PEA Actividades

`nivel`, `mecanismo`, `tema`, `descripcion`.

Todas las celdas se escriben como texto.
