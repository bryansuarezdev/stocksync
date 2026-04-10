# StockSync Multi

> Herramienta interna para sincronizar el stock entre **Bsale** y **PedidosYa** en todas las sucursales de forma rápida y visual.

---

## 📋 ¿Qué es StockSync?

StockSync nació con un propósito simple: **automatizar y facilitar la revisión de stock** entre el sistema de inventario (Bsale) y la plataforma de delivery (PedidosYa).

Antes de esta herramienta, el proceso de verificar qué productos activar o desactivar en cada sucursal de PedidosYa se hacía de forma manual, lo cual tomaba tiempo y era propenso a errores. StockSync reemplaza ese flujo con un análisis automático que toma segundos.

### La lógica es simple

```
stock ≥ umbral  →  ACTIVAR en PedidosYa
stock < umbral  →  DESACTIVAR en PedidosYa
```

El estado actual del producto en PedidosYa no importa — StockSync siempre indica qué debería estar activo basándose únicamente en el stock real de Bsale.

---

## 📊 Impacto en el negocio

| Métrica | Resultado |
|---|---|
| **Ingresos** | +13% al maximizar y mejorar los catálogos de cada sucursal |
| **Cancelaciones por stock** | -5% al mantener desactivados los productos sin stock real |
| **Tiempo de gestión** | De un proceso manual largo a un análisis en segundos |

---

## 🚀 ¿Cómo se usa?

### Requisitos

- Un navegador web moderno (Chrome, Edge, Firefox)
- El archivo Excel de stock exportado desde Bsale (todas las sucursales)
- El archivo Excel de catálogo exportado desde PedidosYa (cualquier sucursal como base)

### Pasos

1. **Abrir** `index.html` en el navegador (o acceder a la URL de GitHub Pages si está desplegado)
2. **Subir el Excel de Bsale** — el archivo de stock actual con todas las sucursales (`Stock-actual_Todas-las-sucursales_FECHA.xlsx`)
3. **Subir el Excel de PedidosYa** — el catálogo base de cualquier sucursal (`products_SUCURSAL.xlsx`)
4. **Hacer clic en "Analizar todas las sucursales"**
5. **Revisar los resultados** — copiar los SKUs directamente para pegarlos en el Manager de PedidosYa

### Configuración del umbral

El umbral mínimo (por defecto: 2) define cuántas unidades necesita un producto para considerarse "activo". Si el stock es menor al umbral, el producto se marca para desactivar.

---

## 🏗️ Estructura del proyecto

```
StockSync/
├── index.html             → HTML principal (requerido por GitHub Pages)
├── stocksync_multi.css    → Estilos (diseño, colores, componentes)
├── stocksync_multi.js     → Lógica (parsers, sincronización, UI)
└── README.md              → Este archivo
```

### Dependencias externas (CDN)

- **[SheetJS (xlsx)](https://sheetjs.com/)** — Lectura y parseo de archivos Excel directamente en el navegador
- **Google Fonts** — DM Sans, DM Mono, Syne

> No requiere servidor, base de datos ni instalación. Todo corre 100% en el navegador del usuario.

---

## 🌐 Despliegue en GitHub Pages

La app está pensada para correr online sin ningún build ni servidor:

1. Sube los 4 archivos al repositorio en GitHub (rama `main`)
2. Ve a **Settings → Pages**
3. Selecciona la rama `main` y carpeta `/ (root)` → **Save**
4. GitHub Pages publicará la app en:
   ```
   https://<tu-usuario>.github.io/<nombre-del-repo>/
   ```

> El archivo `index.html` es detectado automáticamente por GitHub Pages como punto de entrada.

---

## 🏢 Sucursales soportadas

| Sucursal (Bsale) | Nombre en PedidosYa |
|---|---|
| COLINA | Colina |
| CURICO | Curicó |
| ESMERALDA | Esmeralda |
| BALMACEDA | La Serena (Balmaceda) |
| EL MILAGRO | La Serena II (El Milagro) |
| RANCAGUA | Rancagua |
| SAN FELIPE | San Felipe |
| SAN LORENZO | San Lorenzo |
| QUILLOTA | Quillota — *próximamente* |
| MACHALI | Machalí — *próximamente* |

---

## 🗺️ Roadmap — Próximas mejoras

### 🔄 Integración con APIs de Bsale y PedidosYa
Automatizar completamente el flujo de stock conectándose directamente a las APIs de ambas plataformas, eliminando la necesidad de exportar y subir archivos Excel manualmente.

### 📦 Lista de sustitución de productos
Aumentar el catálogo de PedidosYa creando una lista de sustitución: cuando un producto se queda sin stock, proponer automáticamente un producto alternativo para mantener la oferta activa.

### 📱 App de comprobación de stock físico
Crear una app web simple para que los asesores de cada sucursal puedan verificar el stock físico real desde su celular o tablet, cruzando los datos con lo que reporta Bsale.

---

## 🛠️ Stack técnico

- **HTML5** — Estructura semántica
- **CSS3** — Variables CSS, diseño responsive, dark mode
- **JavaScript (Vanilla)** — Sin frameworks, lógica pura
- **SheetJS** — Procesamiento de Excel en el navegador

---

## 👤 Autor

Desarrollado por **[Bryan Suarez](https://github.com/bryansuarezdev)**.
