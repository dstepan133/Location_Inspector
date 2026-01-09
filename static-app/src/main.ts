import './style.css';
import L from 'leaflet';
// @ts-ignore
import 'leaflet.markercluster/dist/leaflet.markercluster.js';
import companiesRaw from './companies.json';
import { Company } from './types.ts';

// Fix for default marker icons in webpack/vite
import iconUrl from 'leaflet/dist/images/marker-icon.png';
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png';
import shadowUrl from 'leaflet/dist/images/marker-shadow.png';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: iconRetinaUrl,
  iconUrl: iconUrl,
  shadowUrl: shadowUrl,
});

// State
let allCompanies: Company[] = companiesRaw as unknown as Company[];
let filteredCompanies: Company[] = [...allCompanies];
let currentFilter: string = 'all';
let currentPinSize: string = 'small';
let map: L.Map;
let markers: any; // MarkerClusterGroup
let linesLayer: L.LayerGroup;
let debounceTimer: ReturnType<typeof setTimeout>;

// DOM Elements
const searchInput = document.getElementById('search') as HTMLInputElement;
const searchNameOnlyCheck = document.getElementById('searchNameOnly') as HTMLInputElement;
const pinSizeSelect = document.getElementById('pinSizeSelect') as HTMLSelectElement;
const sortSelect = document.getElementById('sortSelect') as HTMLSelectElement;
const resultsList = document.getElementById('results') as HTMLUListElement;
const loader = document.getElementById('loader') as HTMLDivElement;
const applyFiltersBtn = document.getElementById('applyFiltersBtn') as HTMLButtonElement;
const viewTableBtn = document.getElementById('viewTableBtn') as HTMLButtonElement;
const tableModal = document.getElementById('tableModal') as HTMLDivElement;
const closeTableModalBtn = document.getElementById('closeTableModal') as HTMLSpanElement;
const minEloInput = document.getElementById('minEloInput') as HTMLInputElement;
const minAreaInput = document.getElementById('minAreaInput') as HTMLInputElement;
const continentSelect = document.getElementById('continentSelect') as HTMLSelectElement;
const countrySelect = document.getElementById('countrySelect') as HTMLSelectElement;

// Initialize
function init() {
  map = L.map('map').setView([48.2082, 16.3738], 6);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors'
  }).addTo(map);

  // @ts-ignore
  markers = L.markerClusterGroup({ disableClusteringAtZoom: 12, maxClusterRadius: 35 });
  map.addLayer(markers);

  linesLayer = L.layerGroup().addTo(map);

  // Initial Load
  applyFiltersAndRender();

  // Listeners
  // Listeners
  setupListeners();

  // Populate Location Dropdowns
  populateLocationFilters();
}

function populateLocationFilters() {
  const continents = new Set<string>();
  const countries = new Set<string>();

  allCompanies.forEach(c => {
    if (c.continent) continents.add(c.continent);
    if (c.input_country) countries.add(c.input_country);
  });

  // safe sort
  const sortedContinents = Array.from(continents).sort();
  const sortedCountries = Array.from(countries).sort();

  sortedContinents.forEach(c => {
    const opt = document.createElement('option');
    opt.value = c;
    opt.innerText = c;
    continentSelect.appendChild(opt);
  });

  sortedCountries.forEach(c => {
    const opt = document.createElement('option');
    opt.value = c;
    opt.innerText = c;
    countrySelect.appendChild(opt);
  });
}

function setupListeners() {
  const triggerUpdate = () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => applyFiltersAndRender(), 300);
  };

  searchInput.addEventListener('input', triggerUpdate);
  minEloInput.addEventListener('change', () => applyFiltersAndRender());
  minAreaInput.addEventListener('change', () => applyFiltersAndRender());
  continentSelect.addEventListener('change', () => applyFiltersAndRender());
  countrySelect.addEventListener('change', () => applyFiltersAndRender());

  searchNameOnlyCheck.addEventListener('change', () => applyFiltersAndRender());

  pinSizeSelect.addEventListener('change', (e) => {
    currentPinSize = (e.target as HTMLSelectElement).value;
    renderMap(filteredCompanies);
  });

  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      (e.target as HTMLElement).classList.add('active');
      currentFilter = (e.target as HTMLElement).getAttribute('data-filter') || 'all';
      applyFiltersAndRender();
    });
  });

  applyFiltersBtn.addEventListener('click', () => applyFiltersAndRender());
  sortSelect.addEventListener('change', () => {
    sortData();
    renderList(filteredCompanies);
  });

  viewTableBtn.addEventListener('click', openTableModal);
  closeTableModalBtn.addEventListener('click', closeTableModal);
  window.onclick = (event) => {
    if (event.target == tableModal) closeTableModal();
  };

  // Table sort listeners
  document.querySelectorAll('th[data-sort]').forEach(th => {
    th.addEventListener('click', (e) => {
      const field = (e.target as HTMLElement).getAttribute('data-sort');
      if (field) {
        // Determine direction (toggle) - simplified here to just reuse sortSelect logic or implement separate table sort
        // Ideally sync with sortSelect or just re-sort array for table view
        // For static app simplicity, let's just sort the main array and re-render table
        sortData(field);
        renderTable(filteredCompanies);
      }
    });
  });
}

// Logic: Filter
function applyFiltersAndRender(nameExact: string | null = null, openPopupId: number | null = null) {
  loader.style.display = 'block';

  // Set search box if nameExact passed
  if (nameExact) {
    searchInput.value = nameExact;
    currentFilter = 'all'; // Reset status filter often preferred when exact matching
    // Reset buttons visual
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    document.querySelector('.filter-btn[data-filter="all"]')?.classList.add('active');
  }

  const query = searchInput.value.toLowerCase().trim();
  const isNameOnly = searchNameOnlyCheck.checked;

  // 1. Base Filter (Search)
  let temp = allCompanies.filter(c => {
    if (nameExact) return c.name === nameExact; // Exact match override
    if (!query) return true;

    // Comma separated OR logic
    const parts = query.split(',');
    return parts.some(part => {
      const terms = part.trim().split(/\s+/);
      // AND logic for terms within a part
      return terms.every(term => {
        if (term === '') return true;
        const nameMatch = c.name.toLowerCase().includes(term);
        if (isNameOnly) return nameMatch;
        const addrMatch = c.full_address.toLowerCase().includes(term);
        return nameMatch || addrMatch;
      });
    });
  });

  // 2. Status Filter
  if (currentFilter === 'true') temp = temp.filter(c => c.verification.verified);
  if (currentFilter === 'false') temp = temp.filter(c => !c.verification.verified); // Includes mismatch error

  // 3. Advanced Filters (Type & Relevance)
  // Read checkboxes
  const checkedTypes = Array.from(document.querySelectorAll('.filter-type:checked')).map(cb => (cb as HTMLInputElement).value);
  const checkedRel = Array.from(document.querySelectorAll('.filter-relevance:checked')).map(cb => (cb as HTMLInputElement).value);

  if (checkedTypes.length > 0) {
    temp = temp.filter(c => {
      if (!c.classification_type) return false;
      // Simple string includes check since types are loose strings
      return checkedTypes.some(t => c.classification_type.toLowerCase().includes(t));
    });
  }

  if (checkedRel.length > 0) {
    temp = temp.filter(c => {
      const rel = (c.classification_relevance || '').toLowerCase();
      return checkedRel.includes(rel);
    });
  }

  // 4. Metric Filters
  const minElo = parseFloat(minEloInput.value);
  if (!isNaN(minElo)) {
    temp = temp.filter(c => (c.elo_rating || 0) >= minElo);
  }

  const minArea = parseFloat(minAreaInput.value);
  if (!isNaN(minArea)) {
    temp = temp.filter(c => (c.estimated_area || 0) >= minArea);
  }

  // 5. Location Filters
  const cont = continentSelect.value;
  if (cont && cont !== 'all') {
    temp = temp.filter(c => c.continent === cont);
  }

  const country = countrySelect.value;
  if (country && country !== 'all') {
    temp = temp.filter(c => c.input_country === country);
  }

  filteredCompanies = temp;

  sortData(); // Apply current sort
  renderList(filteredCompanies);
  renderMap(filteredCompanies, openPopupId);

  loader.style.display = 'none';

  // Zoom Logic
  if (openPopupId) {
    const target = filteredCompanies.find(c => c.id == openPopupId);
    if (target && target.lat && target.lon) {
      map.flyTo([target.lat, target.lon], 16, { duration: 1.5 });
    }
  } else if (nameExact && filteredCompanies.length > 0) {
    // Create bounds
    const group = L.featureGroup(filteredCompanies.map(c => L.marker([c.lat, c.lon])));
    if (group.getLayers().length > 0) {
      map.flyTo(group.getBounds().getCenter(), 12);
      map.fitBounds(group.getBounds().pad(0.1));
    }
  }
}

function sortData(fieldOverride?: string) {
  const sortVal = fieldOverride || sortSelect.value;

  filteredCompanies.sort((a, b) => {
    if (sortVal === 'name') return a.name.localeCompare(b.name);
    if (sortVal === 'type') return (a.classification_type || '').localeCompare(b.classification_type || '');
    if (sortVal === 'relevance') {
      const map = { 'high': 3, 'medium': 2, 'low': 1, '': 0, 'unknown': 0 };
      const valA = (map as any)[(a.classification_relevance || '').toLowerCase()] || 0;
      const valB = (map as any)[(b.classification_relevance || '').toLowerCase()] || 0;
      return valB - valA;
    }
    if (sortVal === 'ucoin') return (a.ucoin_id || '').localeCompare(b.ucoin_id || '');
    if (sortVal === 'elo') return (b.elo_rating || 0) - (a.elo_rating || 0);
    if (sortVal === 'area') return (b.estimated_area || 0) - (a.estimated_area || 0);
    if (sortVal === 'address') return (a.full_address || '').localeCompare(b.full_address || '');
    if (sortVal === 'status') {
      // Verified > Mismatch > Unchecked
      const getScore = (item: Company) => {
        if (item.verification.verified) return 3;
        if (item.verification.distance_error > 1000) return 1;
        return 2;
      };
      return getScore(b) - getScore(a);
    }
    return 0;
  });
}

// Renderers
function renderList(data: Company[]) {
  resultsList.innerHTML = '';

  // Count
  const countDiv = document.createElement('div');
  countDiv.style.padding = '10px 15px';
  countDiv.style.fontSize = '12px';
  countDiv.style.color = '#666';
  countDiv.innerText = `Showing ${data.length} results`;
  resultsList.appendChild(countDiv);

  data.slice(0, 100).forEach(c => {
    const li = document.createElement('li');
    li.className = 'company-item';

    // Badges
    let badgeHtml = '';
    if (c.verification.verified) badgeHtml += '<span class="badge badge-verified">Verified</span> ';
    else if (c.verification.distance_error > 1000) badgeHtml += '<span class="badge badge-error">Mismatch</span> ';
    else if (c.verification.geo_lat) badgeHtml += '<span class="badge badge-warning">Unchecked</span> ';

    badgeHtml += getRelevanceBadge(c.classification_relevance);
    const iconClass = getIconClass(c.classification_type);

    li.innerHTML = `
            <div class="company-name">
                <i class="fas ${iconClass}" style="color: #666; margin-right:5px; width:15px; text-align:center;"></i>
                ${c.name} 
            </div>
            <div style="margin-bottom:5px;">${badgeHtml}</div>
            <div class="company-address">${c.full_address}</div>
            <div class="company-meta">
                <span>${c.classification_type || 'Unknown'}</span>
                <button class="filter-btn-inline" style="padding: 2px 6px; font-size:10px; border:1px solid #ccc; background:#fff; cursor:pointer;">Show All Locations</button>
            </div>
        `;

    // Click handlers
    const btn = li.querySelector('button');
    if (btn) {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        applyFiltersAndRender(c.name);
      });
    }

    li.addEventListener('click', () => {
      // Zoom to specific
      applyFiltersAndRender(c.name, c.id);
    });

    resultsList.appendChild(li);
  });
}

function renderMap(data: Company[], openPopupId: number | null = null) {
  markers.clearLayers();
  linesLayer.clearLayers();
  const markerList: any[] = [];
  const connectionLines: any[] = [];

  data.forEach(c => {
    if (c.lat && c.lon) {
      let iconColor = '#3388ff';
      let statusText = 'Unverified';
      if (c.verification.verified) {
        iconColor = '#28a745';
        statusText = 'Verified';
      } else if (c.verification.distance_error > 1000) {
        iconColor = '#dc3545';
        statusText = 'Mismatch';
      }

      const typeIcon = createCustomIcon(iconColor, c.classification_type);
      const marker = L.marker([c.lat, c.lon], { title: c.name, icon: typeIcon });

      let distInfo = '';
      if (c.verification.distance_error > 1000) {
        const distKm = (c.verification.distance_error / 1000).toFixed(2);
        distInfo = `<br><div style="margin-top:5px; color:#dc3545; font-weight:bold; font-size:11px;">⚠️ Mismatch: ~${distKm}km discrepancy</div>`;
      }

      const relevanceHtml = getRelevanceBadge(c.classification_relevance);
      let popupContent = `
                <div style="min-width: 200px">
                    <b>${c.name}</b><br>
                    <div style="font-size:11px; margin-bottom:5px;">
                        <a href="https://creditLab.erste-group.net/company/${c.ucoin_id || ''}/esg" target="_blank" style="color:#007bff; text-decoration:none;" id="popup-link-${c.id}">
                            Ucoin ID: ${c.ucoin_id || 'N/A'} <i class="fas fa-external-link-alt" style="font-size:10px;"></i>
                        </a>
                    </div>
                    <div style="margin:5px 0">${relevanceHtml} <span class="badge" style="background:${iconColor}; color:white">${statusText}</span></div>
                    <div style="margin-bottom:5px; font-style:italic; font-size:0.9em; color:#555;">${c.classification_description || ''}</div>
                    ${distInfo}
                    <i class="fas ${getIconClass(c.classification_type)}"></i> ${c.classification_type || 'Unknown Type'}<br>
                    <br>
                    <small>Source Data Location</small><br>
                    ${c.full_address}<br>
                    <hr>
                    <button id="popup-filter-btn-${c.id}">Find all "${c.name}" locations</button>
                </div>
            `;

      // Mismatch Visuals
      if (c.verification.distance_error > 1000 && c.verification.geo_lat && c.verification.geo_lon) {
        const correctedIcon = createCustomIcon('#ffc107', c.classification_type);
        const correctedMarker = L.marker([c.verification.geo_lat, c.verification.geo_lon], {
          title: `${c.name} (Geocoded)`,
          icon: correctedIcon
        });
        const distKm = (c.verification.distance_error / 1000).toFixed(2);
        correctedMarker.bindPopup(`
                     <b>${c.name}</b><br>
                     <small>📍 Geocoded Address Location</small><br>
                     (Approx. ${distKm}km away from source)<br>
                     <br>
                     <i>${c.full_address}</i>
                 `);
        markerList.push(correctedMarker);

        const line = L.polyline([[c.lat, c.lon], [c.verification.geo_lat, c.verification.geo_lon]], {
          color: 'red', weight: 2, opacity: 0.6, dashArray: '5, 10'
        });
        connectionLines.push(line);

        popupContent += `
                    <br>⚠️ <b>Location Mismatch!</b><br>
                    Distance: ${distKm} km<br>
                 `;
      }

      marker.bindPopup(popupContent);
      marker.on('popupopen', () => {
        // Attach listener to button inside popup
        const btn = document.getElementById(`popup-filter-btn-${c.id}`);
        if (btn) {
          btn.onclick = () => applyFiltersAndRender(c.name);
        }
        // Stop propagation on link
        const link = document.getElementById(`popup-link-${c.id}`);
        if (link) {
          link.onclick = (e) => e.stopPropagation();
        }
      });

      marker.bindTooltip(`
                <div style="text-align:center">
                    <b>${c.name}</b><br>
                    ${c.classification_type || 'Unknown'}<br>
                    ${c.classification_relevance || 'Unknown'} Importance
                </div>
            `, { direction: 'top', offset: [0, -20] });

      // Click -> Filter/Zoom logic
      marker.on('click', () => {
        if (searchInput.value !== c.name) {
          // If not already filtered to this, filter it? 
          // Or just zoom? 
          // User requested "Zoom In" behavior. 
          // If we just want to select it, we can.
          // But usually clicking a pin should NOT aggressively refilter unless requested.
          // But the previous app logic did filter.
          // Let's keep existing logic: Filter by company if not already.
          applyFiltersAndRender(c.name, c.id);
        }
      });

      markerList.push(marker);

      if (openPopupId && c.id == openPopupId) {
        setTimeout(() => marker.openPopup(), 300);
      }
    }
  });

  markers.addLayers(markerList);
  connectionLines.forEach(l => linesLayer.addLayer(l));
}

// Helpers
function createCustomIcon(color: string, type: string) {
  const iconClass = getIconClass(type);
  let s = 1;
  if (currentPinSize === 'medium') s = 1.6;
  if (currentPinSize === 'large') s = 2.2;

  const baseFontSize = 22 * s;
  const w = 44 * s;
  const h = 55 * s;
  const anchorX = 22 * s;
  const anchorY = 50 * s;
  const popupY = -45 * s;
  const transY = -3 * s;
  const innerScale = 0.7;

  return L.divIcon({
    className: 'custom-icon',
    html: `<span class="fa-stack" style="font-size: ${baseFontSize}px;">
                <i class="fas fa-map-marker fa-stack-2x" style="color: ${color}; filter: drop-shadow(2px 2px 2px rgba(0,0,0,0.3));"></i>
                <i class="fas ${iconClass} fa-stack-1x fa-inverse" style="transform: translateY(${transY}px) scale(${innerScale});"></i>
               </span>`,
    iconSize: [w, h],
    iconAnchor: [anchorX, anchorY],
    popupAnchor: [0, popupY],
    tooltipAnchor: [0, popupY] // @ts-ignore
  });
}

function getIconClass(type: string): string {
  if (!type) return 'fa-map-marker-alt';
  const t = type.toLowerCase();
  if (t.includes('store')) return 'fa-shopping-cart';
  if (t.includes('logis')) return 'fa-truck';
  if (t.includes('office')) return 'fa-briefcase';
  if (t.includes('head')) return 'fa-building';
  if (t.includes('product')) return 'fa-industry';
  if (t.includes('stor')) return 'fa-warehouse';
  if (t.includes('research')) return 'fa-flask';
  if (t.includes('project')) return 'fa-hard-hat';
  return 'fa-map-marker-alt';
}

function getRelevanceBadge(relevance: string): string {
  if (!relevance) return '';
  const lower = relevance.toLowerCase();
  if (lower === 'high') return '<span class="badge badge-relevance-high">High ($$$)</span>';
  if (lower === 'medium') return '<span class="badge badge-relevance-medium">Medium ($$)</span>';
  if (lower === 'low') return '<span class="badge badge-relevance-low">Low ($)</span>';
  return '';
}

// Modal Helpers
function openTableModal() {
  renderTable(filteredCompanies);
  tableModal.style.display = "block";
}
function closeTableModal() {
  tableModal.style.display = "none";
}
function renderTable(data: Company[]) {
  const tbody = document.getElementById('tableBody');
  if (!tbody) return;
  tbody.innerHTML = '';
  const countSpan = document.getElementById('tableCount');
  if (countSpan) countSpan.innerText = String(data.length);

  data.forEach(c => {
    const tr = document.createElement('tr');
    const relevance = getRelevanceBadge(c.classification_relevance);
    tr.style.cursor = 'pointer';
    tr.onclick = () => {
      closeTableModal();
      applyFiltersAndRender(c.name, c.id);
    };
    tr.innerHTML = `
            <td><b>${c.name}</b></td>
            <td>
                <a href="https://creditLab.erste-group.net/company/${c.ucoin_id || ''}/esg" target="_blank" onclick="event.stopPropagation()">
                    ${c.ucoin_id || '-'}
                </a>
            </td>
            <td>${relevance} <span style="font-size:11px; color:#666;">${c.classification_relevance}</span></td>
            <td>${c.classification_type || '-'}</td>
            <td>${c.elo_rating ? c.elo_rating.toFixed(2) : '-'}</td>
            <td>${c.estimated_area ? c.estimated_area.toFixed(1) : '-'}</td>
            <td>${c.full_address}</td>
            <td>${c.verification.verified
        ? '<span style="color:green">Verified</span>'
        : (c.verification.distance_error > 1000
          ? `<span style="color:red; font-weight:bold;">Mismatch</span><div style="font-size:10px; color:#dc3545;">~${(c.verification.distance_error / 1000).toFixed(2)}km error</div>`
          : '<span style="color:orange">Unchecked</span>')
      }</td>
        `;
    tbody.appendChild(tr);
  });
}

// Run
init();
