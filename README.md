# imodify

CLI para optimización y manipulación de imágenes por lotes. Esta herramienta permite redimensionar, convertir formatos, aplicar filtros y optimizar imágenes de manera rápida y eficiente utilizando Sharp.

## Instalación

Para instalar la herramienta globalmente en tu sistema:

```bash
npm install -g imodify-cli
```

O para ejecutarla directamente sin instalación (usando npx):

```bash
npx imodify-cli <argumentos>
```

## Uso

La sintaxis básica es:

```bash
imodify [ficheros|patrón] [opciones]
```

Puedes usar **O** una lista de ficheros **O** un patrón, no mezclados, siempre en el directorio actual (sin subdirectorios ni `**`):

```bash
imodify img1.png img2.png --format webp   # lista
imodify "*.png" --format webp             # patrón (con comillas en PowerShell)
imodify "*" -w 800                        # todas las imágenes (-w --width --ancho)
imodify "foto (1).jpg" "foto 2.png"       # con espacios/paréntesis, usa comillas
```

Si no indicas argumentos, equivale a `*` (todas). `*` incluye todas las imágenes soportadas del directorio actual (jpg, png, webp, avif, tiff, gif).

### Ejemplos

**Optimizar todas las imágenes JPG en la carpeta actual y convertirlas a WebP:**
```bash
imodify "*.jpg" --format webp
```

**Optimizar lista explícita de ficheros:**
```bash
imodify img1.png img2.png --format webp
```

**Redimensionar imágenes a 800px de ancho manteniendo la proporción:**
```bash
imodify "*" --width 800
```

**Crear miniaturas de 150x150 (recorte inteligente) y eliminar metadatos:**
```bash
imodify "*.png" --width 150 --height 150 --smart --clearexif
```

**Convertir a escala de grises y aumentar el brillo:**
```bash
imodify "foto.jpg" --grayscale --brightness 1.2
```

**Eliminar fondo con IA (manteniendo transparencia):**
```bash
imodify "avatar.jpg" --removebg --format png
```
*Si eliges un formato sin canal alfa (como JPG), el fondo eliminado se mostrará como un color sólido.*

## Opciones Disponibles

| Opción | Alias | Descripción | Ejemplo |
|--------|-------|-------------|---------|
| `-w, --width, --ancho` | | Ancho en píxeles (entero >0). Solo ancho => inside (proporcional); con --height y sin --fit => fill (estira) | `-w 800` |
| `-h, --height, --alto` | | Alto en píxeles (entero >0) | `-h 600` |
| `--fit` | | Estrategia (requiere ancho/alto): cover=rellena y recorta, contain=con barras, inside=proporcional sin deformar, fill=estira exacta. Por defecto: inside si un lado, fill si ambos. Prioridad: --smart > --fit | `--fit cover` |
| `--smart` | | Recorte inteligente con atención (requiere -w/--width/--ancho y -h/--height/--alto). Fuerza cover+atención, anula --fit. Se ignora si falta ancho o alto | `--smart` |
| `--format` | `-f` | Formato de salida (`jpg`, `png`, `webp`, `avif`) | `-f webp` |
| `--quality` | `-q` | Calidad (1-100) | `-q 80` |
| `--clearexif` | | Eliminar metadatos EXIF | `--clearexif` |
| `--rename` | | Patrón de renombrado para los archivos de salida | `--rename "foto"` |
| `--blur` | | Aplicar desenfoque con radio específico | `--blur 5` |
| `--sharpen` | | Aplicar filtro de enfoque | `--sharpen` |
| `--grayscale` | | Convertir a escala de grises | `--grayscale` |
| `--brightness` | | Ajustar brillo (0.5 oscurecer, 1.5 aclarar) | `--brightness 1.1` |
| `--saturation` | | Ajustar saturación (0 grises, 2 vívido) | `--saturation 0.5` |
| `--normalize` | | Normalizar contraste de la imagen | `--normalize` |
| `--rotate` | | Rotar imagen (90, 180, 270) | `--rotate 90` |
| `--flip` | | Voltear verticalmente | `--flip` |
| `--flop` | | Voltear horizontalmente | `--flop` |
| `--removebg` | `-b` | Elimina el fondo de la imagen usando IA. **Nota:** Requiere formatos como PNG o WebP para mantener la transparencia. | `--removebg` |

## Licencia

ISC

---

# imodify (English)

CLI for batch image optimization and manipulation. This tool allows you to resize, convert formats, apply filters, and optimize images quickly and efficiently using Sharp.

## Installation

To install the tool globally on your system:

```bash
npm install -g imodify-cli
```

Or to run it directly without installation (using npx):

```bash
npx imodify-cli <arguments>
```

## Usage

The basic syntax is:

```bash
imodify [files|pattern] [options]
```

Use **either** a file list **OR** a pattern, not mixed, always in current directory (no subdirectories or `**`):

```bash
imodify img1.png img2.png --format webp   # list
imodify "*.png" --format webp             # pattern (with quotes in PowerShell)
imodify "*" -w 800                        # all images (-w --width --ancho)
imodify "photo (1).jpg" "photo 2.png"     # with spaces/parens, use quotes
```

If no arguments are provided, it defaults to `*` (all). `*` includes all supported images in current directory (jpg, png, webp, avif, tiff, gif).

### Examples

**Optimize all JPG images in the current folder and convert them to WebP:**
```bash
imodify "*.jpg" --format webp
```

**Optimize explicit file list:**
```bash
imodify img1.png img2.png --format webp
```

**Resize images to 800px width maintaining aspect ratio:**
```bash
imodify "*" --width 800
```

**Create 150x150 thumbnails (smart crop) and remove metadata:**
```bash
imodify "*.png" --width 150 --height 150 --smart --clearexif
```

**Convert to grayscale and increase brightness:**
```bash
imodify "photo.jpg" --grayscale --brightness 1.2
```

**Remove background with AI (keeping transparency):**
```bash
imodify "avatar.jpg" --removebg --format png
```
*If you choose a format without an alpha channel (like JPG), the removed background will appear as a solid color.*

## Available Options

| Option | Alias | Description | Example |
|--------|-------|-------------|---------|
| `-w, --width, --ancho` | | Width in pixels (integer >0). Alone => inside (proportional); with --height and no --fit => fill (stretch) | `-w 800` |
| `-h, --height, --alto` | | Height in pixels (integer >0) | `-h 600` |
| `--fit` | | Resize strategy (requires width/height): cover=fill & crop, contain=fit + bars, inside=proportional no stretch, fill=stretch exact. Defaults: inside if one side, fill if both. Priority: --smart > --fit | `--fit cover` |
| `--smart` | | Smart crop attention (requires -w/--width/--ancho and -h/--height/--alto). Forces cover+attention, overrides --fit. Ignored if width or height missing | `--smart` |
| `--format` | `-f` | Output format (`jpg`, `png`, `webp`, `avif`) | `-f webp` |
| `--quality` | `-q` | Quality (1-100) | `-q 80` |
| `--clearexif` | | Remove EXIF metadata | `--clearexif` |
| `--rename` | | Rename pattern for output files | `--rename "photo"` |
| `--blur` | | Apply blur with specific radius | `--blur 5` |
| `--sharpen` | | Apply sharpen filter | `--sharpen` |
| `--grayscale` | | Convert to grayscale | `--grayscale` |
| `--brightness` | | Adjust brightness (e.g., 0.5 to darken, 1.5 to brighten) | `--brightness 1.1` |
| `--saturation` | | Adjust saturation (e.g., 0 for grayscale, 2 for vivid) | `--saturation 0.5` |
| `--normalize` | | Normalize image contrast | `--normalize` |
| `--rotate` | | Rotate image (90, 180, 270) | `--rotate 90` |
| `--flip` | | Flip vertically | `--flip` |
| `--flop` | | Flop horizontally | `--flop` |
| `--removebg` | `-b` | Remove image background using AI. **Note:** Requires formats like PNG or WebP to maintain transparency. | `--removebg` |

## License

ISC