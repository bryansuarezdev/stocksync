// ============================================================
// StockSync Multi — Lógica principal
// ============================================================

let stockData = null, catData = null;
const sucResults = {}, skuLists = {};

// --- Inicialización ---
document.getElementById('header-date').textContent =
  new Date().toLocaleDateString('es-CL', {weekday:'long', year:'numeric', month:'long', day:'numeric'});

document.getElementById('umbral').addEventListener('input', function(){
  const v = parseInt(this.value) || 1;
  document.getElementById('umbral-badge').textContent = 'stock < ' + v + ' → off';
  if(stockData && catData) runSync();
});

// --- Drag & Drop / File upload ---
function setupDrop(dropId, fileId, fnameId, key){
  const drop = document.getElementById(dropId), inp = document.getElementById(fileId);
  drop.addEventListener('dragover', e => { e.preventDefault(); drop.classList.add('drag-over'); });
  drop.addEventListener('dragleave', () => drop.classList.remove('drag-over'));
  drop.addEventListener('drop', e => {
    e.preventDefault(); drop.classList.remove('drag-over');
    const f = e.dataTransfer.files[0];
    if(f) loadFile(f, fnameId, key, drop);
  });
  inp.addEventListener('change', () => { if(inp.files[0]) loadFile(inp.files[0], fnameId, key, drop); });
}
setupDrop('drop-stock', 'file-stock', 'fname-stock', 'stock');
setupDrop('drop-cat',   'file-cat',   'fname-cat',   'cat');

// --- Lectura de archivos ---
function loadFile(file, fnameId, key, drop){
  document.getElementById(fnameId).textContent = file.name;
  drop.classList.add('loaded');
  const reader = new FileReader();
  reader.onload = e => {
    const wb = XLSX.read(e.target.result, {type:'array'});
    const ws = wb.Sheets[wb.SheetNames[0]];
    const raw = XLSX.utils.sheet_to_json(ws, {header:1, defval:''});
    if(key === 'stock') stockData = parseMasterStock(raw);
    else                catData   = parseCatalog(raw);
    document.getElementById('btn-sync').disabled = !(stockData && catData);
  };
  reader.readAsArrayBuffer(file);
}

// --- Parsers ---
function parseMasterStock(rows){
  let hr = -1;
  for(let i = 0; i < rows.length; i++){
    if(rows[i].includes('SKU') && rows[i].includes('Stock') && rows[i].includes('Sucursal')){
      hr = i; break;
    }
  }
  if(hr === -1) return null;
  const h = rows[hr].map(c => String(c).trim());
  const iSKU = h.indexOf('SKU'), iStock = h.indexOf('Stock'), iSuc = h.indexOf('Sucursal');
  const map = {};
  for(let i = hr + 1; i < rows.length; i++){
    const r = rows[i];
    const sku   = String(r[iSKU] || '').trim();
    const suc   = String(r[iSuc] || '').trim().toUpperCase();
    const stock = parseInt(r[iStock]) || 0;
    if(!sku || sku === 'undefined' || suc === 'BODEGA') continue;
    if(!map[suc]) map[suc] = {};
    map[suc][sku] = stock;
  }
  return map;
}

function parseCatalog(rows){
  let hr = -1;
  for(let i = 0; i < rows.length; i++){
    const r = rows[i].map(c => String(c).toLowerCase());
    if(r.includes('sku') && r.includes('name')){ hr = i; break; }
  }
  if(hr === -1) return null;
  const h = rows[hr].map(c => String(c).trim().toLowerCase());
  const iS = h.indexOf('sku'), iN = h.indexOf('name');
  const list = [];
  for(let i = hr + 1; i < rows.length; i++){
    const r = rows[i];
    const sku  = String(r[iS] || '').trim();
    const name = String(r[iN] || '').trim();
    if(sku) list.push({sku, name});
  }
  return list;
}

// --- Sincronización principal ---
function runSync(){
  if(!stockData || !catData) return;
  const umbral = parseInt(document.getElementById('umbral').value) || 2;

  // Orden y nombres según PedidosYa — Actualizado según imagen
  const ORDEN_PYA = [
    { bsale: 'COLINA',      display: 'Colina' },
    { bsale: 'CURICO',      display: 'Curicó' },
    { bsale: 'ESMERALDA',   display: 'Esmeralda' },
    { bsale: 'BALMACEDA',   display: 'La Serena (Balmaceda)' },
    { bsale: 'EL MILAGRO',  display: 'La Serena II (El Milagro)' },
    { bsale: 'MACHALI',     display: 'Machalí' },
    { bsale: 'QUILLOTA',    display: 'Quillota' },
    { bsale: 'RANCAGUA',    display: 'Rancagua' },
    { bsale: 'SAN FELIPE',  display: 'San Felipe' },
    { bsale: 'SAN LORENZO', display: 'San Lorenzo' },
  ];

  // Solo incluir las que existen en el archivo de stock
  const sucursales = ORDEN_PYA.filter(s => stockData[s.bsale]);
  const displayName = {};
  sucursales.forEach(s => displayName[s.bsale] = s.display);
  Object.keys(sucResults).forEach(k => delete sucResults[k]);
  Object.keys(skuLists).forEach(k => delete skuLists[k]);

  let totalActivar = 0, totalDesactivar = 0, totalCritico = 0, totalListos = 0;

  sucursales.forEach(s => {
    const suc = s.bsale;
    const stockSuc = stockData[suc];
    const activar = [], desactivar = [], critico = [], listos = [];

    for(const prod of catData){
      const stock = stockSuc[prod.sku] !== undefined ? stockSuc[prod.sku] : null;
      if(stock === null) continue;
      if(stock >= umbral){
        activar.push({...prod, stock});
        listos.push(prod.sku);
      } else {
        desactivar.push({...prod, stock});
      }
      if(stock === 1) critico.push({...prod, stock});
    }

    sucResults[suc] = {activar, desactivar, critico, total: catData.length, display: s.display};
    skuLists[suc]   = {activar: activar.map(p => p.sku), desactivar: desactivar.map(p => p.sku)};
    totalActivar    += activar.length;
    totalDesactivar += desactivar.length;
    totalCritico    += critico.length;
    totalListos     += listos.length;
  });

  const avgListos = Math.round(totalListos / sucursales.length);
  const pct = Math.round((totalListos / (catData.length * sucursales.length)) * 100);

  // Actualizar resumen comercial
  document.getElementById('val-listos').textContent = avgListos;
  document.getElementById('sub-listos').textContent =
    `por sucursal · ${catData.length} productos en catálogo · ${sucursales.length} sucursales`;
  document.getElementById('pct-label').textContent = pct + '%';

  const bar = document.getElementById('catalog-bar');
  bar.style.width = pct + '%';
  bar.className = 'catalog-bar-fill' + (pct < 40 ? ' low' : pct < 70 ? ' mid' : '');

  document.getElementById('cs-activar').textContent    = totalActivar;
  document.getElementById('cs-desactivar').textContent = totalDesactivar;
  document.getElementById('cs-critico').textContent    = totalCritico;

  // Tarjetas de resumen global
  document.getElementById('summary-global').innerHTML = `
    <div class="stat-card green"><div class="s-label">Total activar</div><div class="s-value">${totalActivar}</div></div>
    <div class="stat-card red"><div class="s-label">Total desactivar</div><div class="s-value">${totalDesactivar}</div></div>
    <div class="stat-card orange"><div class="s-label">Stock crítico</div><div class="s-value">${totalCritico}</div></div>
    <div class="stat-card gray"><div class="s-label">Sucursales</div><div class="s-value">${sucursales.length}</div></div>`;

  // Tabla resumen global
  const tbody = document.getElementById('tbody-global');
  tbody.innerHTML = '';
  sucursales.forEach(s => {
    const suc = s.bsale;
    const d = sucResults[suc];
    const listos = d.activar.length;
    const pctSuc = Math.round((listos / d.total) * 100);
    tbody.innerHTML += `<tr>
      <td style="font-family:'Syne',sans-serif;font-weight:600">${s.display}</td>
      <td class="mono">${d.total}</td>
      <td>${d.activar.length > 0 ? `<span class="pill pill-green">+${d.activar.length}</span>` : `<span class="pill pill-gray">0</span>`}</td>
      <td>${d.desactivar.length > 0 ? `<span class="pill pill-red">-${d.desactivar.length}</span>` : `<span class="pill pill-gray">0</span>`}</td>
      <td><strong style="color:var(--green)">${listos}</strong> <span style="color:var(--muted);font-size:11px">(${pctSuc}%)</span></td>
      <td>${d.critico.length > 0 ? `<span class="pill pill-orange">${d.critico.length}</span>` : `<span class="pill pill-gray">0</span>`}</td>
    </tr>`;
  });

  // Tabs y paneles por sucursal
  const tabsEl = document.getElementById('suc-tabs');
  const panelsEl = document.getElementById('suc-panels');
  tabsEl.innerHTML = '';
  panelsEl.innerHTML = '';

  sucursales.forEach((s, idx) => {
    const suc = s.bsale;
    const d = sucResults[suc];

    const tab = document.createElement('div');
    tab.className = 'suc-tab' + (idx === 0 ? ' active' : '');
    tab.setAttribute('data-suc', suc);
    tab.innerHTML = `${s.display}
      ${d.activar.length > 0 ? `<span class="tab-pill tab-green">+${d.activar.length}</span>` : ''}
      ${d.desactivar.length > 0 ? `<span class="tab-pill tab-red">-${d.desactivar.length}</span>` : ''}`;
    tab.onclick = () => switchTab(suc);
    tabsEl.appendChild(tab);

    const panel = document.createElement('div');
    panel.className = 'suc-panel' + (idx === 0 ? ' active' : '');
    panel.id = 'panel-' + suc;
    panel.innerHTML = buildPanel(suc, d, umbral);
    panelsEl.appendChild(panel);
  });

  document.getElementById('results').classList.add('visible');
  document.getElementById('results').scrollIntoView({behavior:'smooth', block:'start'});
}

// --- Generador de paneles por sucursal ---
function buildPanel(suc, d, umbral){
  const label = d.display || suc;

  return `
  <div class="result-section green-section">
    <div class="section-header">
      <div class="section-header-left">
        <div class="section-dot"></div>
        <span class="section-title">Activar en PedidosYa — ${label}</span>
        <span class="section-badge">${d.activar.length}</span>
      </div>
      <button class="btn-copy" id="copy-activar-${suc}" onclick="copySKUs('${suc}','activar')">Copiar SKUs</button>
    </div>
    <div class="section-hint">Stock ≥ ${umbral} en Bsale. Pegar en Manager → Estado → Activar productos.</div>
    <div class="sku-wrap">
      <div class="sku-label">SKUs listos para pegar</div>
      <div class="sku-box">${(skuLists[suc]?.activar || []).join('\n') || '(ninguno)'}</div>
    </div>
    <button class="collapse-toggle" onclick="toggleC('act-${suc}',this)"><span>Ver detalle de productos</span><span class="arrow">▼</span></button>
    <div class="collapsible" id="act-${suc}">
      <div class="table-wrap"><table><thead><tr><th>SKU</th><th>Nombre</th><th>Stock Bsale</th></tr></thead>
      <tbody>${buildRows(d.activar, umbral)}</tbody></table></div>
    </div>
  </div>

  <div class="result-section red-section">
    <div class="section-header">
      <div class="section-header-left">
        <div class="section-dot"></div>
        <span class="section-title">Desactivar en PedidosYa — ${label}</span>
        <span class="section-badge">${d.desactivar.length}</span>
      </div>
      <button class="btn-copy" id="copy-desactivar-${suc}" onclick="copySKUs('${suc}','desactivar')">Copiar SKUs</button>
    </div>
    <div class="section-hint">Stock < ${umbral} en Bsale. Pegar en Manager → Estado → Desactivar productos.</div>
    <div class="sku-wrap">
      <div class="sku-label">SKUs listos para pegar</div>
      <div class="sku-box">${(skuLists[suc]?.desactivar || []).join('\n') || '(ninguno)'}</div>
    </div>
    <button class="collapse-toggle" onclick="toggleC('des-${suc}',this)"><span>Ver detalle de productos</span><span class="arrow">▼</span></button>
    <div class="collapsible" id="des-${suc}">
      <div class="table-wrap"><table><thead><tr><th>SKU</th><th>Nombre</th><th>Stock Bsale</th></tr></thead>
      <tbody>${buildRows(d.desactivar, umbral)}</tbody></table></div>
    </div>
  </div>

  <div class="result-section orange-section">
    <div class="section-header">
      <div class="section-header-left">
        <div class="section-dot"></div>
        <span class="section-title">Stock crítico — pedir reposición a bodega</span>
        <span class="section-badge">${d.critico.length}</span>
      </div>
    </div>
    <div class="section-hint">1 unidad exacta en Bsale. Están dentro de los activos pero si se vende esa unidad se desactivan solos.</div>
    <button class="collapse-toggle" onclick="toggleC('crit-${suc}',this)"><span>Ver productos críticos</span><span class="arrow">▼</span></button>
    <div class="collapsible" id="crit-${suc}">
      <div class="table-wrap"><table><thead><tr><th>SKU</th><th>Nombre</th><th>Stock Bsale</th></tr></thead>
      <tbody>${buildRows(d.critico, umbral)}</tbody></table></div>
    </div>
  </div>`;
}

// --- Generador de filas de tabla ---
function buildRows(rows, umbral){
  if(!rows.length) return `<tr><td colspan="3" class="empty">Ningún producto</td></tr>`;
  return [...rows].sort((a, b) => a.name.localeCompare(b.name)).map(r => `
    <tr>
      <td class="mono">${r.sku}</td>
      <td>${r.name}</td>
      <td>${stockPill(r.stock, umbral)}</td>
    </tr>`).join('');
}

// --- Pill de stock con color ---
function stockPill(stock, umbral){
  if(stock === 0) return `<span class="pill pill-red">0</span>`;
  if(stock === 1) return `<span class="pill pill-orange">1 — crítico</span>`;
  if(stock < umbral) return `<span class="pill pill-yellow">${stock}</span>`;
  return `<span class="pill pill-green">${stock}</span>`;
}

// --- Cambio de tabs ---
function switchTab(suc){
  document.querySelectorAll('.suc-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.suc-panel').forEach(p => p.classList.remove('active'));
  document.querySelector(`.suc-tab[data-suc="${suc}"]`).classList.add('active');
  document.getElementById('panel-' + suc).classList.add('active');
}

// --- Copiar SKUs al clipboard ---
function copySKUs(suc, type){
  const list = skuLists[suc]?.[type] || [];
  if(!list.length) return;
  navigator.clipboard.writeText(list.join('\n')).then(() => {
    const btn = document.getElementById(`copy-${type}-${suc}`);
    if(!btn) return;
    const orig = btn.textContent;
    btn.textContent = '✓ Copiado';
    btn.classList.add('copied');
    setTimeout(() => { btn.textContent = orig; btn.classList.remove('copied'); }, 2000);
  });
}

// --- Toggle de secciones colapsables ---
function toggleC(id, btn){
  document.getElementById(id).classList.toggle('open');
  btn.classList.toggle('open');
}
