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
imodify [patrón] [opciones]
```

Es obligatorio especificar un patrón o nombres de archivos. Si no se indican argumentos, se mostrará la ayuda.

Para procesar todos los archivos del directorio actual, usa `*`. Recuerda usar comillas si el patrón contiene caracteres especiales o espacios (ej. `"*.jpg"`).

### Ejemplos

**Optimizar todas las imágenes JPG en la carpeta actual y convertirlas a WebP:**
```bash
imodify "*.jpg" --format webp
```

**Redimensionar imágenes a 800px de ancho manteniendo la proporción:**
```bash
imodify "*" --w 800
```

**Crear miniaturas de 150x150 (recorte inteligente) y eliminar metadatos:**
```bash
imodify "*.png" --w 150 --h 150 --smart --noexif
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
| `--w` | | Ancho en píxeles | `--w 800` |
| `--h` | | Alto en píxeles | `--h 600` |
| `--fit` | | Estrategia de ajuste: `cover` (llena y recorta), `fill` (estira/deforma), `inside` (proporcional) o `contain` (añade barras). | `--fit cover` |
| `--smart` | | Recorte inteligente basado en atención (requiere ancho y alto) | `--smart` |
| `--format` | `-f` | Formato de salida (`jpg`, `png`, `webp`, `avif`) | `-f webp` |
| `--quality` | `-q` | Calidad (1-100) | `-q 80` |
| `--noexif` | | Eliminar metadatos EXIF | `--noexif` |
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
imodify [pattern] [options]
```

You must specify a file pattern or filenames. If no arguments are provided, the help menu is displayed.

To process all files in the current directory, use `*`. Remember to use quotes if the pattern contains special characters or spaces (e.g., `"*.jpg"`).

### Examples

**Optimize all JPG images in the current folder and convert them to WebP:**
```bash
imodify "*.jpg" --format webp
```

**Resize images to 800px width maintaining aspect ratio:**
```bash
imodify "*" --w 800
```

**Create 150x150 thumbnails (smart crop) and remove metadata:**
```bash
imodify "*.png" --w 150 --h 150 --smart --noexif
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
| `--w` | | Width in pixels | `--w 800` |
| `--h` | | Height in pixels | `--h 600` |
| `--fit` | | Resize strategy: `cover` (fill & crop), `fill` (stretch), `inside` (proportional) or `contain` (adds bars). | `--fit cover` |
| `--smart` | | Smart crop based on attention (requires width and height) | `--smart` |
| `--format` | `-f` | Output format (`jpg`, `png`, `webp`, `avif`) | `-f webp` |
| `--quality` | `-q` | Quality (1-100) | `-q 80` |
| `--noexif` | | Remove EXIF metadata | `--noexif` |
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