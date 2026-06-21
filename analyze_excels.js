// Script de análisis temporal — verifica que los Excel son compatibles con StockSync
const XLSX = require('./xlsx_node.js') || (() => { throw new Error('Need xlsx'); })();
const fs = require('fs');
const path = require('path');

const stockPath = path.join(__dirname, 'Stock-actual_Todas-las-sucursales_14-05-2026.xlsx');
const catPath = path.join(__dirname, 'products.xlsx');

console.log('=== ANÁLISIS DE ARCHIVOS EXCEL PARA STOCKSYNC ===\n');

// --- Analizar archivo de Stock (Bsale) ---
console.log('--- 1. ARCHIVO DE STOCK (Bsale) ---');
console.log('Archivo:', path.basename(stockPath));
console.log('Tamaño:', (fs.statSync(stockPath).size / 1024 / 1024).toFixed(2), 'MB');

const wbStock = XLSX.readFile(stockPath);
console.log('Hojas:', wbStock.SheetNames.join(', '));

const wsStock = wbStock.Sheets[wbStock.SheetNames[0]];
const stockRows = XLSX.utils.sheet_to_json(wsStock, { header: 1, defval: '' });
console.log('Total filas:', stockRows.length);

// Buscar header
let stockHeaderRow = -1;
for (let i = 0; i < Math.min(stockRows.length, 20); i++) {
  const row = stockRows[i].map(c => String(c).trim());
  if (row.includes('SKU') && row.includes('Stock') && row.includes('Sucursal')) {
    stockHeaderRow = i;
    break;
  }
}

if (stockHeaderRow === -1) {
  console.log('ERROR: No se encontró la fila de encabezados (SKU, Stock, Sucursal)');
  console.log('Primeras 10 filas:');
  for (let i = 0; i < Math.min(10, stockRows.length); i++) {
    console.log(`  Fila ${i}:`, stockRows[i].slice(0, 8).map(c => String(c).trim()));
  }
} else {
  console.log('Header encontrado en fila:', stockHeaderRow);
  const headers = stockRows[stockHeaderRow].map(c => String(c).trim());
  console.log('Columnas:', headers.join(' | '));

  const iSKU = headers.indexOf('SKU');
  const iStock = headers.indexOf('Stock');
  const iSuc = headers.indexOf('Sucursal');

  // Contar sucursales y SKUs
  const sucursales = {};
  let totalRows = 0;
  for (let i = stockHeaderRow + 1; i < stockRows.length; i++) {
    const r = stockRows[i];
    const sku = String(r[iSKU] || '').trim();
    const suc = String(r[iSuc] || '').trim().toUpperCase();
    const stock = parseInt(r[iStock]) || 0;
    if (!sku || sku === 'undefined' || suc === 'BODEGA') continue;
    if (!sucursales[suc]) sucursales[suc] = { count: 0, totalStock: 0 };
    sucursales[suc].count++;
    sucursales[suc].totalStock += stock;
    totalRows++;
  }

  console.log('\nSucursales encontradas en Bsale:');
  const ORDEN_PYA = [
    { bsale: 'COLINA', display: 'Colina' },
    { bsale: 'CURICO', display: 'Curicó' },
    { bsale: 'ESMERALDA', display: 'Esmeralda' },
    { bsale: 'BALMACEDA', display: 'La Serena (Balmaceda)' },
    { bsale: 'EL MILAGRO', display: 'La Serena II (El Milagro)' },
    { bsale: 'MACHALI', display: 'Machalí' },
    { bsale: 'QUILLOTA', display: 'Quillota' },
    { bsale: 'RANCAGUA', display: 'Rancagua' },
    { bsale: 'SAN FELIPE', display: 'San Felipe' },
    { bsale: 'SAN LORENZO', display: 'San Lorenzo' },
  ];

  const expectedNames = ORDEN_PYA.map(s => s.bsale);
  
  Object.keys(sucursales).sort().forEach(suc => {
    const match = expectedNames.includes(suc) ? '✅' : '⚠️ NO en ORDEN_PYA';
    console.log(`  ${match} ${suc}: ${sucursales[suc].count} SKUs, stock total: ${sucursales[suc].totalStock}`);
  });

  // Verificar si hay sucursales en ORDEN_PYA que NO están en el Excel
  console.log('\nVerificación cruzada (ORDEN_PYA vs Excel):');
  ORDEN_PYA.forEach(s => {
    if (sucursales[s.bsale]) {
      console.log(`  ✅ ${s.display} (${s.bsale}) — encontrada con ${sucursales[s.bsale].count} productos`);
    } else {
      console.log(`  ❌ ${s.display} (${s.bsale}) — NO encontrada en el Excel`);
    }
  });

  console.log(`\nTotal registros procesables: ${totalRows}`);
}

// --- Analizar archivo de Catálogo (PedidosYa) ---
console.log('\n--- 2. ARCHIVO DE CATÁLOGO (PedidosYa) ---');
console.log('Archivo:', path.basename(catPath));
console.log('Tamaño:', (fs.statSync(catPath).size / 1024).toFixed(1), 'KB');

const wbCat = XLSX.readFile(catPath);
console.log('Hojas:', wbCat.SheetNames.join(', '));

const wsCat = wbCat.Sheets[wbCat.SheetNames[0]];
const catRows = XLSX.utils.sheet_to_json(wsCat, { header: 1, defval: '' });
console.log('Total filas:', catRows.length);

let catHeaderRow = -1;
for (let i = 0; i < Math.min(catRows.length, 20); i++) {
  const r = catRows[i].map(c => String(c).toLowerCase().trim());
  if (r.includes('sku') && r.includes('name')) {
    catHeaderRow = i;
    break;
  }
}

if (catHeaderRow === -1) {
  console.log('ERROR: No se encontró la fila de encabezados (sku, name)');
  console.log('Primeras 10 filas:');
  for (let i = 0; i < Math.min(10, catRows.length); i++) {
    console.log(`  Fila ${i}:`, catRows[i].slice(0, 8).map(c => String(c).trim()));
  }
} else {
  console.log('Header encontrado en fila:', catHeaderRow);
  const headers = catRows[catHeaderRow].map(c => String(c).trim());
  console.log('Columnas:', headers.join(' | '));

  const iS = headers.map(c => c.toLowerCase()).indexOf('sku');
  const iN = headers.map(c => c.toLowerCase()).indexOf('name');

  let skuCount = 0;
  const sampleProducts = [];
  for (let i = catHeaderRow + 1; i < catRows.length; i++) {
    const r = catRows[i];
    const sku = String(r[iS] || '').trim();
    const name = String(r[iN] || '').trim();
    if (sku) {
      skuCount++;
      if (sampleProducts.length < 5) sampleProducts.push({ sku, name });
    }
  }

  console.log(`Total productos en catálogo: ${skuCount}`);
  console.log('\nMuestra de productos:');
  sampleProducts.forEach(p => console.log(`  SKU: ${p.sku} — ${p.name}`));
}

// --- Simulación de sincronización ---
if (stockHeaderRow !== -1 && catHeaderRow !== -1) {
  console.log('\n--- 3. SIMULACIÓN DE SINCRONIZACIÓN (umbral = 2) ---');
  const umbral = 2;
  
  // Rebuild stock data
  const headersStock = stockRows[stockHeaderRow].map(c => String(c).trim());
  const iSKU = headersStock.indexOf('SKU');
  const iStock = headersStock.indexOf('Stock');
  const iSuc = headersStock.indexOf('Sucursal');
  
  const stockMap = {};
  for (let i = stockHeaderRow + 1; i < stockRows.length; i++) {
    const r = stockRows[i];
    const sku = String(r[iSKU] || '').trim();
    const suc = String(r[iSuc] || '').trim().toUpperCase();
    const stock = parseInt(r[iStock]) || 0;
    if (!sku || sku === 'undefined' || suc === 'BODEGA') continue;
    if (!stockMap[suc]) stockMap[suc] = {};
    stockMap[suc][sku] = stock;
  }

  // Rebuild catalog
  const headersCat = catRows[catHeaderRow].map(c => String(c).trim().toLowerCase());
  const iS = headersCat.indexOf('sku');
  const iN = headersCat.indexOf('name');
  const catalog = [];
  for (let i = catHeaderRow + 1; i < catRows.length; i++) {
    const r = catRows[i];
    const sku = String(r[iS] || '').trim();
    const name = String(r[iN] || '').trim();
    if (sku) catalog.push({ sku, name });
  }

  const ORDEN_PYA = [
    { bsale: 'COLINA', display: 'Colina' },
    { bsale: 'CURICO', display: 'Curicó' },
    { bsale: 'ESMERALDA', display: 'Esmeralda' },
    { bsale: 'BALMACEDA', display: 'La Serena (Balmaceda)' },
    { bsale: 'EL MILAGRO', display: 'La Serena II (El Milagro)' },
    { bsale: 'MACHALI', display: 'Machalí' },
    { bsale: 'QUILLOTA', display: 'Quillota' },
    { bsale: 'RANCAGUA', display: 'Rancagua' },
    { bsale: 'SAN FELIPE', display: 'San Felipe' },
    { bsale: 'SAN LORENZO', display: 'San Lorenzo' },
  ];

  const sucursales = ORDEN_PYA.filter(s => stockMap[s.bsale]);
  let totalActivar = 0, totalDesactivar = 0, totalCritico = 0;

  sucursales.forEach(s => {
    const stockSuc = stockMap[s.bsale];
    let activar = 0, desactivar = 0, critico = 0, noMatch = 0;

    for (const prod of catalog) {
      const stock = stockSuc[prod.sku] !== undefined ? stockSuc[prod.sku] : null;
      if (stock === null) { noMatch++; continue; }
      if (stock >= umbral) activar++;
      else desactivar++;
      if (stock === 1) critico++;
    }

    console.log(`  ${s.display}: activar=${activar} | desactivar=${desactivar} | crítico=${critico} | sin match=${noMatch}`);
    totalActivar += activar;
    totalDesactivar += desactivar;
    totalCritico += critico;
  });

  console.log(`\n  TOTALES: activar=${totalActivar} | desactivar=${totalDesactivar} | crítico=${totalCritico}`);
  console.log(`  Sucursales procesadas: ${sucursales.length}/${ORDEN_PYA.length}`);
  
  const avgListos = Math.round(totalActivar / sucursales.length);
  const pct = Math.round((totalActivar / (catalog.length * sucursales.length)) * 100);
  console.log(`  Promedio productos activos por sucursal: ${avgListos}`);
  console.log(`  Cobertura promedio del catálogo: ${pct}%`);
}

console.log('\n=== FIN DEL ANÁLISIS ===');
