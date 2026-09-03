const EARTH_RADIUS_METERS = 6378137;
const MAP_SELECTOR = '.bayernatlas-fluid';
const UNCATEGORIZED_LAYER_KEY = 'uncategorized';

export const ITEM_SELECT_EVENT = 'bayernatlas:item-select';

export const BASE_LAYER_OPTIONS = Object.freeze([
  { id: 'GEORESOURCE_WEB', label: 'Web map', translationKey: 'baseLayerWeb' },
  { id: 'GEORESOURCE_WEB_GRAY', label: 'Web map grayscale', translationKey: 'baseLayerWebGray' },
  { id: 'GEORESOURCE_AERIAL', label: 'Aerial image with labels', translationKey: 'baseLayerAerial' },
  { id: 'GEORESOURCE_HISTORIC', label: 'Historic map', translationKey: 'baseLayerHistoric' },
  { id: 'GEORESOURCE_TOPOGRAPHIC', label: 'Topographic map', translationKey: 'baseLayerTopographic' },
  { id: 'GEORESOURCE_WEB_VECTOR', label: 'Vector web map', translationKey: 'baseLayerVector' },
  { id: 'GEORESOURCE_WEB_VECTOR_GRAY', label: 'Vector web map grayscale', translationKey: 'baseLayerVectorGray' },
]);

export const DEFAULT_TRANSLATIONS = Object.freeze({
  ariaLabel: 'BayernAtlas map',
  uncategorized: 'Uncategorized',
  loading: 'Loading information...',
  error: 'The information could not be loaded.',
  baseLayerWeb: 'Web map',
  baseLayerWebGray: 'Web map grayscale',
  baseLayerAerial: 'Aerial image with labels',
  baseLayerHistoric: 'Historic map',
  baseLayerTopographic: 'Topographic map',
  baseLayerVector: 'Vector web map',
  baseLayerVectorGray: 'Vector web map grayscale',
});

export function normalizeBoolean(value, fallback = true) {
  if (value === undefined || value === null || value === '') {
    return fallback;
  }

  if (typeof value === 'boolean') {
    return value;
  }

  return !['0', 'false', 'no', 'off'].includes(String(value).toLowerCase());
}

export function normalizeDimension(value, fallback) {
  const normalized = String(value || fallback);

  return /^\d+(\.\d+)?$/.test(normalized)
    ? `${normalized}px`
    : normalized;
}

export function normalizeCoordinate(coordinate) {
  if (!Array.isArray(coordinate) || coordinate.length !== 2) {
    return null;
  }

  const normalized = coordinate.map(Number);

  return normalized.every(Number.isFinite) ? normalized : null;
}

export function getItemCoordinates(item) {
  if (item.type === 'line' || item.type === 'polygon') {
    return Array.isArray(item.coordinates)
      ? item.coordinates.map(normalizeCoordinate).filter(Boolean)
      : [];
  }

  const coordinate = normalizeCoordinate(item.coordinates);

  return coordinate ? [coordinate] : [];
}

export function getCoordinateCenter(coordinates, fallback) {
  const validCoordinates = coordinates
    .map(normalizeCoordinate)
    .filter(Boolean);

  if (validCoordinates.length === 0) {
    return [...fallback];
  }

  const longitudes = validCoordinates.map((coordinate) => coordinate[0]);
  const latitudes = validCoordinates.map((coordinate) => coordinate[1]);

  return [
    (Math.min(...longitudes) + Math.max(...longitudes)) / 2,
    (Math.min(...latitudes) + Math.max(...latitudes)) / 2,
  ];
}

export function getBaseLayerOptions(configuredLayer) {
  const options = BASE_LAYER_OPTIONS.map((option) => ({ ...option }));

  if (configuredLayer && !options.some((option) => option.id === configuredLayer)) {
    options.unshift({ id: configuredLayer, label: configuredLayer });
  }

  return options;
}

export function getItemCategoryKeys(item) {
  const keys = [];
  const categories = Array.isArray(item.categories) ? item.categories : [];

  categories.forEach((category) => {
    const id = String(category.id ?? '').trim();
    const key = id ? `category-${id}` : null;

    if (key && !keys.includes(key)) {
      keys.push(key);
    }
  });

  return keys.length > 0 ? keys : [UNCATEGORIZED_LAYER_KEY];
}

export function getCategoryLayerDefinitions(items, uncategorizedLabel = 'Uncategorized') {
  const categories = new Map();
  let hasUncategorizedItems = false;

  items.forEach((item) => {
    const itemCategories = Array.isArray(item.categories) ? item.categories : [];
    const categoryKeys = getItemCategoryKeys(item);

    if (categoryKeys[0] === UNCATEGORIZED_LAYER_KEY) {
      hasUncategorizedItems = true;

      return;
    }

    itemCategories.forEach((category) => {
      const id = String(category.id ?? '').trim();
      const key = id ? `category-${id}` : null;

      if (!key || categories.has(key)) {
        return;
      }

      categories.set(key, {
        key,
        label: String(category.title || id),
        sorting: Number(category.sorting) || 0,
      });
    });
  });

  const definitions = [...categories.values()].sort((first, second) => (
    first.sorting - second.sorting
    || first.label.localeCompare(second.label, 'de')
  ));

  if (hasUncategorizedItems) {
    definitions.push({
      key: UNCATEGORIZED_LAYER_KEY,
      label: uncategorizedLabel,
      sorting: Number.MAX_SAFE_INTEGER,
    });
  }

  return definitions;
}

export function circleToPolygon(longitude, latitude, radius, segments = 64) {
  const coordinates = [];
  const latitudeRadians = latitude * Math.PI / 180;

  for (let index = 0; index <= segments; index += 1) {
    const angle = index / segments * Math.PI * 2;
    const latitudeOffset = radius / EARTH_RADIUS_METERS * Math.sin(angle);
    const longitudeOffset = radius
      / (EARTH_RADIUS_METERS * Math.cos(latitudeRadians))
      * Math.cos(angle);

    coordinates.push([
      longitude + longitudeOffset * 180 / Math.PI,
      latitude + latitudeOffset * 180 / Math.PI,
    ]);
  }

  return coordinates;
}

export function itemToFeature(item) {
  const properties = {
    label: item.title || '',
    itemId: String(item.id),
  };

  if (item.type === 'line') {
    return {
      type: 'Feature',
      properties,
      geometry: {
        type: 'LineString',
        coordinates: getItemCoordinates(item),
      },
    };
  }

  if (item.type === 'polygon') {
    const ring = getItemCoordinates(item);

    if (ring.length > 0) {
      const first = ring[0];
      const last = ring[ring.length - 1];

      if (first[0] !== last[0] || first[1] !== last[1]) {
        ring.push([...first]);
      }
    }

    return {
      type: 'Feature',
      properties,
      geometry: {
        type: 'Polygon',
        coordinates: [ring],
      },
    };
  }

  if (item.type === 'circle') {
    const coordinate = normalizeCoordinate(item.coordinates);
    const radius = Number(item.radius);

    if (!coordinate || !Number.isFinite(radius) || radius <= 0) {
      return null;
    }

    return {
      type: 'Feature',
      properties,
      geometry: {
        type: 'Polygon',
        coordinates: [[...circleToPolygon(coordinate[0], coordinate[1], radius)]],
      },
    };
  }

  return null;
}

export function createLayerOptions(configuration, color) {
  return {
    zoomToExtent: false,
    displayFeatureLabels: normalizeBoolean(configuration.showLabels, true),
    style: { baseColor: color },
  };
}

export function claimMapElements(root) {
  const elements = [];

  root.querySelectorAll(MAP_SELECTOR).forEach((element) => {
    if (element.dataset.bayernAtlasInitialized === '1') {
      return;
    }

    element.dataset.bayernAtlasInitialized = '1';
    elements.push(element);
  });

  return elements;
}

export class BayernAtlasMap {
  constructor(element) {
    this.element = element;
    this.items = this.parseJson(element.dataset.items, []);
    this.configuration = this.parseJson(element.dataset.configuration, {});
    this.translations = Object.fromEntries(
      Object.entries(DEFAULT_TRANSLATIONS).map(([key, fallback]) => {
        const datasetKey = `translation${key.charAt(0).toUpperCase()}${key.slice(1)}`;

        return [key, element.dataset[datasetKey] || fallback];
      }),
    );
    this.itemsById = new Map(this.items.map((item) => [String(item.id), item]));
    this.pointItems = [];
    this.geometryLayers = [];
    this.categoryLayers = [];
    this.categoryVisibility = new Map();
    this.baseLayerId = null;
    this.infoElement = element.querySelector('.bayernatlas-fluid__info');
    this.infoContentElement = element.querySelector('.bayernatlas-fluid__info-content');
    this.infoCloseButton = element.querySelector('.bayernatlas-fluid__info-close');
    this.lastFocusedElement = null;
    this.layerControlElement = element.querySelector('.bayernatlas-fluid__layers');
    this.baseLayerSelect = element.querySelector('[data-role="base-layer"]');
    this.categoryLayerList = element.querySelector('[data-role="category-layers"]');
    this.map = document.createElement('bayern-atlas');

    this.prepareContainer();
    this.registerInfoCloseButton();
    this.map.addEventListener('baLoad', () => this.initializeMap(), { once: true });
    this.element.prepend(this.map);
  }

  parseJson(value, fallback) {
    try {
      return value ? JSON.parse(value) : fallback;
    } catch (error) {
      console.error('bayernatlas-fluid: invalid JSON data', error);

      return fallback;
    }
  }

  translate(key, replacements = {}) {
    return Object.entries(replacements).reduce(
      (text, [placeholder, value]) => text.replaceAll(`{${placeholder}}`, String(value)),
      this.translations[key] || DEFAULT_TRANSLATIONS[key] || key,
    );
  }

  prepareContainer() {
    const fallbackCenter = normalizeCoordinate(this.configuration.center) || [11.5, 48.8];
    const center = getCoordinateCenter(this.getAllCoordinates(), fallbackCenter);

    this.element.style.width = normalizeDimension(this.configuration.width, '100%');
    this.element.style.height = normalizeDimension(this.configuration.height, '560px');

    this.map.setAttribute('l', this.configuration.baseLayer || 'GEORESOURCE_WEB');
    this.map.setAttribute('z', String(this.configuration.zoom || 12));
    this.map.setAttribute('ec_srid', '4326');
    this.map.setAttribute('c', center.join(','));
    this.map.setAttribute('aria-label', this.configuration.ariaLabel || this.translate('ariaLabel'));
  }

  registerInfoCloseButton() {
    this.infoCloseButton?.addEventListener('click', () => {
      this.hideInfo();
      this.map.clearHighlights?.();
    });

    this.infoElement?.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        this.hideInfo();
        this.map.clearHighlights?.();
      }
    });
  }

  initializeMap() {
    this.baseLayerId = this.map.layers?.[0] || null;
    this.categoryLayers = getCategoryLayerDefinitions(
      this.items,
      this.translate('uncategorized'),
    );
    this.categoryLayers.forEach((layer) => this.categoryVisibility.set(layer.key, true));
    this.pointItems = this.items.filter((item) => item.type === 'point');

    this.items.forEach((item) => {
      if (item.type !== 'point') {
        this.addGeometry(item);
      }
    });

    this.renderPointMarkers();
    this.map.addEventListener('baFeatureSelect', (event) => this.handleFeatureSelect(event));

    this.initializeLayerControl();
    this.element.classList.add('bayernatlas-fluid--ready');
  }

  addPoint(item) {
    const coordinate = normalizeCoordinate(item.coordinates);

    if (!coordinate) {
      return;
    }

    const markerOptions = { id: `item-${String(item.id)}` };

    if (normalizeBoolean(this.configuration.showLabels, true) && item.title) {
      markerOptions.label = String(item.title);
    }

    this.map.addMarker(coordinate, markerOptions);
  }

  renderPointMarkers() {
    const visiblePointItems = this.pointItems.filter((item) => this.isItemVisible(item));
    this.clearPointMarkers();

    visiblePointItems.forEach((item) => this.addPoint(item));
  }

  clearPointMarkers() {
    this.map.clearMarkers();
  }

  addGeometry(item) {
    const feature = itemToFeature(item);

    if (!feature) {
      return;
    }

    const layerId = this.map.addLayer(
      JSON.stringify(feature),
      createLayerOptions(this.configuration, item.color || '#0b6b45'),
    );

    this.geometryLayers.push({
      id: layerId,
      item,
    });
  }

  initializeLayerControl() {
    if (
      !normalizeBoolean(this.configuration.showLayerControl, false)
      || !this.layerControlElement
      || !this.baseLayerSelect
      || !this.categoryLayerList
    ) {
      return;
    }

    const configuredBaseLayer = this.configuration.baseLayer || 'GEORESOURCE_WEB';

    getBaseLayerOptions(configuredBaseLayer).forEach(({ id, label, translationKey }) => {
      const option = document.createElement('option');
      option.value = id;
      option.textContent = translationKey ? this.translate(translationKey) : label;
      this.baseLayerSelect.append(option);
    });

    this.baseLayerSelect.value = configuredBaseLayer;
    this.baseLayerSelect.addEventListener('change', () => {
      this.changeBaseLayer(this.baseLayerSelect.value);
    });

    this.categoryLayers.forEach((layer) => {
      this.addLayerToggle(layer.label, true, (visible) => {
        this.setCategoryLayerVisible(layer.key, visible);
      });
    });

    this.layerControlElement.hidden = false;
  }

  addLayerToggle(label, checked, onChange) {
    const wrapper = document.createElement('label');
    const input = document.createElement('input');
    const text = document.createElement('span');

    input.type = 'checkbox';
    input.checked = checked;
    input.addEventListener('change', () => onChange(input.checked));
    text.textContent = label;
    wrapper.append(input, text);
    this.categoryLayerList.append(wrapper);
  }

  changeBaseLayer(geoResourceId) {
    const currentLayerId = this.baseLayerId || this.map.layers?.[0];

    if (currentLayerId) {
      this.map.removeLayer(currentLayerId);
    }

    this.baseLayerId = this.map.addLayer(geoResourceId, { zIndex: 0 });
  }

  setCategoryLayerVisible(key, visible) {
    this.categoryVisibility.set(key, visible);

    this.geometryLayers.forEach((layer) => {
      this.map.modifyLayer(layer.id, {
        visible: this.isItemVisible(layer.item),
      });
    });

    this.renderPointMarkers();
  }

  isItemVisible(item) {
    return getItemCategoryKeys(item).some(
      (key) => this.categoryVisibility.get(key) !== false,
    );
  }

  getAllCoordinates() {
    return this.items.flatMap(getItemCoordinates);
  }

  handleFeatureSelect(event) {
    const selectedFeature = event.detail?.features?.[0];

    if (!selectedFeature) {
      return;
    }

    const properties = selectedFeature.properties || {};
    const markerId = String(properties.id || '');
    const pointItemId = markerId.startsWith('item-') ? markerId.slice(5) : '';
    const itemId = String(properties.itemId || pointItemId);
    const item = this.itemsById.get(itemId);

    if (item) {
      this.selectItem(item);
    }
  }

  selectItem(item) {
    const selectionEvent = new CustomEvent(ITEM_SELECT_EVENT, {
      bubbles: true,
      cancelable: true,
      detail: {
        item,
        showInfo: (content) => this.showInfo(content),
        showLoading: (message) => this.showLoading(message),
        showError: (message) => this.showError(message),
        hideInfo: () => this.hideInfo(),
      },
    });

    this.element.dispatchEvent(selectionEvent);

    if (!selectionEvent.defaultPrevented && item.content) {
      this.showInfo(item.content);
    }
  }

  showInfo(content) {
    if (!this.infoElement || !this.infoContentElement) {
      return;
    }

    this.infoContentElement.innerHTML = String(content || '');
    this.openInfo();
    this.infoElement.removeAttribute('aria-busy');
  }

  showLoading(message = this.translate('loading')) {
    if (!this.infoElement || !this.infoContentElement) {
      return;
    }

    this.infoContentElement.textContent = message;
    this.openInfo();
    this.infoElement.setAttribute('aria-busy', 'true');
  }

  showError(message = this.translate('error')) {
    if (!this.infoElement || !this.infoContentElement) {
      return;
    }

    this.infoContentElement.textContent = message;
    this.openInfo();
    this.infoElement.removeAttribute('aria-busy');
  }

  openInfo() {
    if (!this.infoElement) {
      return;
    }

    const wasHidden = this.infoElement.hidden;

    if (wasHidden && typeof document !== 'undefined') {
      this.lastFocusedElement = document.activeElement;
    }

    this.infoElement.hidden = false;

    if (wasHidden) {
      this.infoCloseButton?.focus();
    }
  }

  hideInfo() {
    if (this.infoElement) {
      this.infoElement.hidden = true;
      this.infoElement.removeAttribute('aria-busy');
    }

    const focusTarget = this.lastFocusedElement;
    this.lastFocusedElement = null;

    focusTarget?.focus?.();
  }
}

export function initializeMaps(root = document) {
  const maps = [];

  claimMapElements(root).forEach((element) => {
    try {
      maps.push(new BayernAtlasMap(element));
    } catch (error) {
      delete element.dataset.bayernAtlasInitialized;
      console.error('bayernatlas-fluid: map initialization failed', error);
    }
  });

  return maps;
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => initializeMaps(), { once: true });
  } else {
    initializeMaps();
  }
}
