/**
 * Génère server/statuts/catalogs/tribunalCommerceCatalog.json
 * à partir de l'API geo.gouv.fr (toutes les communes FR + COM)
 * et d'un rattachement au tribunal de commerce le plus proche du département.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_PATH = path.join(__dirname, '..', 'server', 'statuts', 'catalogs', 'tribunalCommerceCatalog.json');

const DEPARTMENTS = [
  ...Array.from({ length: 95 }, (_, i) => String(i + 1).padStart(2, '0')),
  '2A', '2B',
  '971', '972', '973', '974', '975', '976', '977', '978', '984', '986', '987', '988', '989',
];

const normalizeCommuneKey = (value) => (
  String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[''`]/g, ' ')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
);

const corsicaDept = (code) => {
  if (code.startsWith('20')) {
    const num = Number(code.slice(0, 5));
    return Number.isFinite(num) && num >= 20200 ? '2B' : '2A';
  }
  return null;
};

const resolveDepartmentCode = (postalCode, codeDepartement) => {
  const dept = String(codeDepartement || '').trim();
  if (dept) return dept;
  const pc = String(postalCode || '').trim();
  if (!pc) return null;
  if (/^97[1-9]/.test(pc)) return pc.slice(0, 3);
  const corsica = corsicaDept(pc);
  if (corsica) return corsica;
  if (/^75/.test(pc)) return '75';
  return pc.slice(0, 2);
};

const haversineKm = (a, b) => {
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.min(1, Math.sqrt(h)));
};

const fetchJson = async (url) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} ${url}`);
  return res.json();
};

const geocodeTribunalCity = async (city, departmentHint = null) => {
  const params = new URLSearchParams({
    nom: city,
    fields: 'nom,code,codeDepartement,centre',
    limit: '12',
    boost: 'population',
  });
  if (departmentHint) params.set('codeDepartement', departmentHint);
  const rows = await fetchJson(`https://geo.api.gouv.fr/communes?${params}`);
  const key = normalizeCommuneKey(city);
  const exact = rows.find((row) => normalizeCommuneKey(row.nom) === key);
  const pick = exact || rows[0];
  if (!pick?.centre?.coordinates) return null;
  return {
    city,
    lat: pick.centre.coordinates[1],
    lon: pick.centre.coordinates[0],
    insee: pick.code,
    department: pick.codeDepartement,
  };
};

/** Tribunaux de commerce sièges par département (plusieurs si ressort multiple). */
const DEPARTMENT_TRIBUNAL_SEATS = {
  '01': ['Bourg-en-Bresse'],
  '02': ['Saint-Quentin'],
  '03': ['Cusset'],
  '04': ['Manosque'],
  '05': ['Gap'],
  '06': ['Nice', 'Grasse'],
  '07': ['Aubenas'],
  '08': ['Sedan'],
  '09': ['Foix'],
  '10': ['Troyes'],
  '11': ['Carcassonne'],
  '12': ['Rodez'],
  '13': ['Marseille', 'Aix-en-Provence', 'Salon-de-Provence'],
  '14': ['Caen', 'Lisieux'],
  '15': ['Aurillac'],
  '16': ['Angoulême'],
  '17': ['Saintes', 'La Rochelle'],
  '18': ['Bourges'],
  '19': ['Brive-la-Gaillarde'],
  '21': ['Dijon'],
  '22': ['Saint-Brieuc'],
  '23': ['Guéret'],
  '24': ['Périgueux', 'Bergerac'],
  '25': ['Besançon', 'Pontarlier'],
  '26': ['Valence', 'Romans-sur-Isère'],
  '27': ['Évreux'],
  '28': ['Chartres'],
  '29': ['Brest', 'Quimper'],
  '30': ['Nîmes', 'Béziers'],
  '31': ['Toulouse', 'Castres'],
  '32': ['Auch'],
  '33': ['Bordeaux', 'Libourne'],
  '34': ['Montpellier', 'Béziers'],
  '35': ['Rennes', 'Saint-Malo'],
  '36': ['Châteauroux'],
  '37': ['Tours'],
  '38': ['Grenoble', 'Vienne'],
  '39': ['Lons-le-Saunier', 'Dole'],
  '40': ['Dax', 'Mont-de-Marsan'],
  '41': ['Blois'],
  '42': ['Saint-Étienne', 'Roanne'],
  '43': ['Le Puy-en-Velay'],
  '44': ['Nantes', 'Saint-Nazaire'],
  '45': ['Orléans'],
  '46': ['Cahors'],
  '47': ['Agen'],
  '48': ['Mende'],
  '49': ['Angers', 'Saumur'],
  '50': ['Cherbourg', 'Coutances'],
  '51': ['Reims', 'Châlons-en-Champagne'],
  '52': ['Chaumont'],
  '53': ['Laval', 'Mayenne'],
  '54': ['Nancy', 'Briey'],
  '55': ['Bar-le-Duc'],
  '56': ['Vannes', 'Lorient'],
  '57': ['Metz', 'Thionville', 'Sarreguemines'],
  '58': ['Nevers'],
  '59': ['Lille', 'Dunkerque', 'Valenciennes', 'Douai'],
  '60': ['Beauvais', 'Compiègne'],
  '61': ['Alençon'],
  '62': ['Boulogne-sur-Mer', 'Arras', 'Béthune'],
  '63': ['Clermont-Ferrand', 'Riom'],
  '64': ['Pau', 'Bayonne'],
  '65': ['Tarbes'],
  '66': ['Perpignan'],
  '67': ['Strasbourg', 'Saverne', 'Sélestat'],
  '68': ['Colmar', 'Mulhouse'],
  '69': ['Lyon', 'Villefranche-sur-Saône'],
  '70': ['Vesoul'],
  '71': ['Chalon-sur-Saône', 'Mâcon'],
  '72': ['Le Mans', 'La Flèche'],
  '73': ['Chambéry', 'Albertville'],
  '74': ['Annecy', 'Thonon-les-Bains'],
  '75': ['Paris'],
  '76': ['Rouen', 'Le Havre', 'Dieppe'],
  '77': ['Melun', 'Meaux'],
  '78': ['Versailles'],
  '79': ['Niort', 'Bressuire'],
  '80': ['Amiens', 'Abbeville'],
  '81': ['Albi', 'Castres'],
  '82': ['Montauban'],
  '83': ['Toulon', 'Draguignan'],
  '84': ['Avignon', 'Carpentras'],
  '85': ['La Roche-sur-Yon', 'Les Sables-d\'Olonne'],
  '86': ['Poitiers', 'Châtellerault'],
  '87': ['Limoges'],
  '88': ['Épinal', 'Saint-Dié-des-Vosges'],
  '89': ['Auxerre', 'Sens'],
  '90': ['Belfort'],
  '91': ['Evry'],
  '92': ['Nanterre'],
  '93': ['Bobigny'],
  '94': ['Créteil'],
  '95': ['Pontoise'],
  '2A': ['Ajaccio'],
  '2B': ['Bastia'],
  '971': ['Basse-Terre', 'Pointe-à-Pitre'],
  '972': ['Fort-de-France'],
  '973': ['Cayenne'],
  '974': ['Saint-Denis'],
  '975': ['Saint-Pierre-et-Miquelon'],
  '976': ['Mamoudzou'],
  '977': ['Saint-Barthélemy'],
  '978': ['Saint-Martin'],
  '986': ['Wallis-et-Futuna'],
  '987': ['Papeete'],
  '988': ['Nouméa'],
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const main = async () => {
  console.log('Géocodage des sièges de tribunaux de commerce…');
  const uniqueSeatCities = [...new Set(Object.values(DEPARTMENT_TRIBUNAL_SEATS).flat())];
  const seatCoords = new Map();
  for (const city of uniqueSeatCities) {
    const geo = await geocodeTribunalCity(city);
    if (geo) seatCoords.set(city, geo);
    else console.warn(`  ⚠ siège non géocodé : ${city}`);
    await sleep(80);
  }

  const departmentSeatCoords = {};
  for (const [dept, seats] of Object.entries(DEPARTMENT_TRIBUNAL_SEATS)) {
    departmentSeatCoords[dept] = seats
      .map((city) => seatCoords.get(city))
      .filter(Boolean);
  }

  const communesByInsee = {};
  const attachmentsByDeptAndName = {};
  const seats = [...uniqueSeatCities].sort((a, b) => a.localeCompare(b, 'fr'));
  let total = 0;

  console.log('Téléchargement des communes par département…');
  for (const dept of DEPARTMENTS) {
    let rows = [];
    try {
      rows = await fetchJson(
        `https://geo.api.gouv.fr/communes?codeDepartement=${encodeURIComponent(dept)}&fields=nom,code,codesPostaux,codeDepartement,centre&format=json&geometry=centre`,
      );
    } catch (error) {
      console.warn(`  ⚠ département ${dept} : ${error.message}`);
      continue;
    }

    for (const commune of rows) {
      const coords = commune.centre?.coordinates;
      if (!coords) continue;
      const point = { lat: coords[1], lon: coords[0] };
      const deptCode = resolveDepartmentCode(commune.codesPostaux?.[0], commune.codeDepartement);
      const seatList = departmentSeatCoords[deptCode] || departmentSeatCoords[dept] || [];
      const nameKey = normalizeCommuneKey(commune.nom);
      let tribunal = seatList[0]?.city || null;

      const ownSeat = seatList.find((s) => normalizeCommuneKey(s.city) === nameKey);
      if (ownSeat) {
        tribunal = ownSeat.city;
      } else if (seatList.length > 1) {
        let best = seatList[0];
        let bestDist = Infinity;
        seatList.forEach((seat) => {
          const dist = haversineKm(point, seat);
          if (dist < bestDist) {
            bestDist = dist;
            best = seat;
          }
        });
        tribunal = best.city;
      } else if (seatList.length === 1) {
        tribunal = seatList[0].city;
      }

      if (!tribunal) continue;

      communesByInsee[commune.code] = tribunal;
      attachmentsByDeptAndName[`${deptCode}:${nameKey}`] = tribunal;
      total += 1;
    }
    console.log(`  ${dept} : ${rows.length} communes`);
    await sleep(120);
  }

  const departments = {};
  for (const [dept, seatList] of Object.entries(DEPARTMENT_TRIBUNAL_SEATS)) {
    departments[dept] = seatList[0];
  }

  const catalog = {
    version: new Date().toISOString().slice(0, 10),
    description: 'Rattachement exhaustif communes FR/COM → tribunal de commerce (geo.api.gouv.fr + proximité géographique).',
    source: 'geo.api.gouv.fr + Greffio build script',
    stats: {
      communes: total,
      seats: seats.length,
      departments: Object.keys(departments).length,
    },
    seats,
    departments,
    departmentTribunalSeats: DEPARTMENT_TRIBUNAL_SEATS,
    communesByInsee,
    attachmentsByDeptAndName,
  };

  fs.writeFileSync(OUT_PATH, `${JSON.stringify(catalog)}\n`, 'utf8');
  const sizeMb = (fs.statSync(OUT_PATH).size / (1024 * 1024)).toFixed(2);
  console.log(`\n✓ ${total} communes écrites dans ${OUT_PATH} (${sizeMb} Mo)`);
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
