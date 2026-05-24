const BAN_SEARCH_URL = 'https://api-adresse.data.gouv.fr/search/';
const NOMINATIM_SEARCH_URL = 'https://nominatim.openstreetmap.org/search';

const buildConciseLabel = ({ line1, postalCode, city, country = 'France' }) => {
  const parts = [line1].filter(Boolean);
  const locality = [postalCode, city].filter(Boolean).join(' ').trim();
  if (locality) parts.push(locality);
  else if (country && country !== 'France') parts.push(country);
  return parts.join(', ');
};

const mapBanFeature = (feature, index) => {
  const properties = feature?.properties || {};
  const coordinates = feature?.geometry?.coordinates || [];
  const line1 = String(properties.name || '').trim()
    || [properties.housenumber, properties.street].filter(Boolean).join(' ').trim();
  const city = String(properties.city || properties.locality || '').trim();
  const postalCode = String(properties.postcode || '').trim();
  const label = String(properties.label || '').trim()
    || buildConciseLabel({ line1, postalCode, city });

  return {
    id: String(properties.id || properties.label || `ban_${index}`),
    label,
    line1,
    line2: '',
    city,
    postalCode,
    country: 'France',
    latitude: typeof coordinates[1] === 'number' ? coordinates[1] : Number(coordinates[1]) || null,
    longitude: typeof coordinates[0] === 'number' ? coordinates[0] : Number(coordinates[0]) || null,
  };
};

const mapNominatimItem = (item) => {
  const address = item.address || {};
  const line1 = [address.house_number, address.road].filter(Boolean).join(' ').trim()
    || String(item.display_name || '').split(',')[0]?.trim()
    || '';
  const city = address.city || address.town || address.village || address.municipality || '';
  const postalCode = address.postcode || address.postal_code || '';
  return {
    id: String(item.place_id || item.osm_id || item.display_name),
    label: buildConciseLabel({
      line1,
      postalCode,
      city,
      country: address.country || 'France',
    }),
    line1,
    line2: '',
    city,
    postalCode,
    country: address.country || 'France',
    latitude: item.lat ? Number(item.lat) : null,
    longitude: item.lon ? Number(item.lon) : null,
  };
};

const searchFrenchBanAddresses = async (query) => {
  const url = new URL(BAN_SEARCH_URL);
  url.searchParams.set('q', query);
  url.searchParams.set('limit', '6');
  url.searchParams.set('autocomplete', '1');

  const response = await fetch(url, {
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) {
    throw new Error('BAN_ADDRESS_SEARCH_UNAVAILABLE');
  }

  const payload = await response.json();
  const features = Array.isArray(payload?.features) ? payload.features : [];
  return features.map(mapBanFeature).filter((item) => item.line1 || item.label);
};

const searchNominatimAddresses = async (query) => {
  const url = new URL(NOMINATIM_SEARCH_URL);
  url.searchParams.set('format', 'json');
  url.searchParams.set('addressdetails', '1');
  url.searchParams.set('limit', '6');
  url.searchParams.set('q', query);
  url.searchParams.set('countrycodes', 'fr');

  const response = await fetch(url, {
    headers: {
      'Accept-Language': 'fr',
      'User-Agent': 'Greffio/1.0 (contact@willentreprises.com)',
    },
  });
  if (!response.ok) {
    throw new Error('NOMINATIM_ADDRESS_SEARCH_UNAVAILABLE');
  }

  const payload = await response.json();
  return (Array.isArray(payload) ? payload : []).map(mapNominatimItem).filter((item) => item.line1 || item.label);
};

export const searchAddresses = async (query) => {
  const q = String(query || '').trim();
  if (q.length < 3) return [];

  try {
    const banResults = await searchFrenchBanAddresses(q);
    if (banResults.length) return banResults;
  } catch (_error) {
    // fallback below
  }

  return searchNominatimAddresses(q);
};
