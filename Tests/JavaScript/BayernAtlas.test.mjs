import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import test from 'node:test';

import {
  BASE_LAYER_OPTIONS,
  ICON_PROXY_URL,
  ITEM_SELECT_EVENT,
  BayernAtlasMap,
  circleToPolygon,
  claimMapElements,
  createLayerOptions,
  getBaseLayerOptions,
  getCategoryLayerDefinitions,
  getCoordinateCenter,
  getItemCategoryKeys,
  getItemCoordinates,
  itemToFeature,
  normalizeBoolean,
  normalizeCoordinate,
  normalizeDimension,
  pointsToKml,
  probeIcon,
} from '../../Resources/Public/JavaScript/BayernAtlas.js';

test('package has no maps2 dependency', () => {
  const packageDirectory = new URL('../../', import.meta.url);
  const composer = JSON.parse(
    readFileSync(new URL('composer.json', packageDirectory), 'utf8'),
  );

  assert.equal(composer.name, 'elementareteilchen/bayernatlas-fluid');
  assert.equal(composer.require.php, '^8.2');
  assert.equal(composer.require['typo3/cms-core'], '^13.4 || ^14.3');
  assert.equal(composer.require['typo3fluid/fluid'], '^4.3 || ^5.3.1');
  assert.equal(composer.require['jweiland/maps2'], undefined);
  assert.equal(existsSync(new URL('ext_emconf.php', packageDirectory)), false);
});

test('global Fluid component has a small explicit interface', () => {
  const packageDirectory = new URL('../../', import.meta.url);
  const component = readFileSync(
    new URL('Resources/Private/Components/Map/Map.html', packageDirectory),
    'utf8',
  );
  const localConfiguration = readFileSync(
    new URL('ext_localconf.php', packageDirectory),
    'utf8',
  );

  for (const argument of ['id', 'items', 'configuration']) {
    assert.match(component, new RegExp(`<f:argument name="${argument}"`));
  }

  assert.equal((component.match(/<f:argument /g) || []).length, 3);
  assert.match(component, /items -> f:format\.json\(\)/);
  assert.match(component, /configuration -> f:format\.json\(\)/);
  assert.doesNotMatch(component, /maps2/i);
  assert.doesNotMatch(component, /cluster/i);
  assert.match(localConfiguration, /\['namespaces'\]\['baf'\]/);
});

test('reserves map dimensions before JavaScript initializes', () => {
  const packageDirectory = new URL('../../', import.meta.url);
  const component = readFileSync(
    new URL('Resources/Private/Components/Map/Map.html', packageDirectory),
    'utf8',
  );
  const styles = readFileSync(
    new URL('Resources/Public/Css/BayernAtlas.css', packageDirectory),
    'utf8',
  );

  assert.match(component, /bafv:normalizeDimension\(value: configuration\.width, fallback: '100%'\)/);
  assert.match(component, /bafv:normalizeDimension\(value: configuration\.height, fallback: '560px'\)/);
  assert.match(component, /style="width: \{mapWidth\}; height: \{mapHeight\};"/);
  assert.doesNotMatch(component, /style="[^"]*\{configuration\.(?:width|height)\}/);
  assert.match(styles, /width: 100%;/);
  assert.match(styles, /height: 560px;/);
});

test('normalizes boolean and dimension values from Fluid', () => {
  assert.equal(normalizeBoolean('1'), true);
  assert.equal(normalizeBoolean('false'), false);
  assert.equal(normalizeBoolean('', true), true);
  assert.equal(normalizeDimension(560, '100%'), '560px');
  assert.equal(normalizeDimension('75vh', '100%'), '75vh');
});

test('normalizes valid coordinate pairs', () => {
  assert.deepEqual(normalizeCoordinate(['11.5', '48.1']), [11.5, 48.1]);
  assert.equal(normalizeCoordinate([11.5]), null);
  assert.equal(normalizeCoordinate(['invalid', 48.1]), null);
});

test('reads coordinates from all supported item types', () => {
  assert.deepEqual(getItemCoordinates({
    type: 'point',
    coordinates: [11.5, 48.1],
  }), [[11.5, 48.1]]);

  assert.deepEqual(getItemCoordinates({
    type: 'line',
    coordinates: [[11.5, 48.1], [11.6, 48.2]],
  }), [[11.5, 48.1], [11.6, 48.2]]);
});

test('centers the initial view on the coordinate extent', () => {
  assert.deepEqual(getCoordinateCenter([
    [10, 40],
    [14, 50],
    [11, 48],
  ], [9, 39]), [12, 45]);

  assert.deepEqual(getCoordinateCenter([], [9, 39]), [9, 39]);
});

test('uses arbitrary category IDs and deduplicates assignments', () => {
  assert.deepEqual(getItemCategoryKeys({
    categories: [{ id: 'history' }, { id: 'history' }, { id: 21 }],
  }), ['category-history', 'category-21']);
  assert.deepEqual(getItemCategoryKeys({}), ['uncategorized']);
});

test('builds sorted category layers', () => {
  assert.deepEqual(getCategoryLayerDefinitions([
    {
      categories: [
        { id: 'democracy', title: 'Demokratie', sorting: 20 },
        { id: 'memory', title: 'Erinnerung', sorting: 10 },
      ],
    },
    { categories: [{ id: 'democracy', title: 'Demokratie', sorting: 20 }] },
    {},
  ]), [
    { key: 'category-memory', label: 'Erinnerung', sorting: 10 },
    { key: 'category-democracy', label: 'Demokratie', sorting: 20 },
    { key: 'uncategorized', label: 'Uncategorized', sorting: Number.MAX_SAFE_INTEGER },
  ]);
});

test('converts line items to GeoJSON', () => {
  const feature = itemToFeature({
    id: 'route-1',
    title: 'Route',
    type: 'line',
    coordinates: [[11.5, 48.1], [11.6, 48.2]],
  });

  assert.equal(feature.geometry.type, 'LineString');
  assert.deepEqual(feature.geometry.coordinates[1], [11.6, 48.2]);
  assert.equal(feature.properties.itemId, 'route-1');
});

test('closes polygon item rings', () => {
  const feature = itemToFeature({
    id: 'area-1',
    type: 'polygon',
    coordinates: [
      [11.5, 48.1],
      [11.6, 48.1],
      [11.6, 48.2],
    ],
  });

  assert.deepEqual(
    feature.geometry.coordinates[0][0],
    feature.geometry.coordinates[0].at(-1),
  );
});

test('converts circle items to polygon features', () => {
  const feature = itemToFeature({
    id: 'radius-1',
    type: 'circle',
    coordinates: [11.5, 48.1],
    radius: 250,
  });

  assert.equal(feature.geometry.type, 'Polygon');
  assert.equal(feature.geometry.coordinates[0].length, 65);
  assert.equal(itemToFeature({
    id: 'invalid',
    type: 'circle',
    coordinates: [11.5, 48.1],
    radius: 0,
  }), null);
});

test('creates a closed circle approximation', () => {
  const ring = circleToPolygon(11.5, 48.1, 250, 16);

  assert.equal(ring.length, 17);
  assert.deepEqual(ring[0], ring.at(-1));
});

test('keeps custom base layers and label settings', () => {
  assert.ok(BASE_LAYER_OPTIONS.some((option) => option.id === 'GEORESOURCE_WEB'));
  assert.deepEqual(getBaseLayerOptions('custom-layer')[0], {
    id: 'custom-layer',
    label: 'custom-layer',
  });
  assert.equal(createLayerOptions({ showLabels: '0' }, '#123456').displayFeatureLabels, false);
});

test('claims each map element only once', () => {
  const first = { dataset: {} };
  const second = { dataset: {} };
  const root = {
    querySelectorAll(selector) {
      assert.equal(selector, '.bayernatlas-fluid');

      return [first, second];
    },
  };

  assert.deepEqual(claimMapElements(root), [first, second]);
  assert.deepEqual(claimMapElements(root), []);
});

test('item selection is a cancelable public event', () => {
  assert.equal(ITEM_SELECT_EVENT, 'bayernatlas:item-select');

  const source = readFileSync(
    new URL('../../Resources/Public/JavaScript/BayernAtlas.js', import.meta.url),
    'utf8',
  );

  assert.match(source, /cancelable: true/);
  assert.match(source, /showInfo:/);
  assert.match(source, /showLoading:/);
  assert.match(source, /showError:/);
});

test('uses stable marker IDs and omits labels when labels are disabled', () => {
  const calls = [];
  const context = {
    configuration: { showLabels: '0' },
    map: {
      addMarker(coordinate, options) {
        calls.push({ coordinate, options });

        return options.id;
      },
    },
  };

  BayernAtlasMap.prototype.addPoint.call(context, {
    id: 67,
    title: 'Maximilianeum',
    coordinates: [11.59452, 48.13617],
  });

  assert.deepEqual(calls, [{
    coordinate: [11.59452, 48.13617],
    options: { id: 'item-67' },
  }]);
});

test('resolves point and geometry selections from example BayernAtlas payloads', () => {
  const fixtures = ['point', 'geometry'];
  const selectedItems = [];
  const context = {
    itemsById: new Map([
      ['67', { id: 67, title: 'Maximilianeum' }],
      ['route-1', { id: 'route-1', title: 'Route' }],
    ]),
    selectItem(item) {
      selectedItems.push(item.id);
    },
  };

  fixtures.forEach((fixture) => {
    const detail = JSON.parse(readFileSync(
      new URL(`../Fixtures/BaFeatureSelect/${fixture}.json`, import.meta.url),
      'utf8',
    ));

    BayernAtlasMap.prototype.handleFeatureSelect.call(context, { detail });
  });

  assert.deepEqual(selectedItems, [67, 'route-1']);
});

test('clears all markers owned by the BayernAtlas element in one call', () => {
  let clearCalls = 0;
  const context = {
    pointLayerId: null,
    map: {
      clearMarkers() {
        clearCalls += 1;
      },
    },
  };

  BayernAtlasMap.prototype.clearPointMarkers.call(context);

  assert.equal(clearCalls, 1);
});

test('renders visible points directly as BayernAtlas markers', () => {
  const renderedItems = [];
  let clearCalls = 0;
  const context = {
    pointsReady: true,
    pointItems: [{ id: 1 }, { id: 2 }],
    isItemVisible: (item) => item.id === 1,
    hasAvailableIcon: () => false,
    clearPointMarkers() {
      clearCalls += 1;
    },
    addPoint(item) {
      renderedItems.push(item.id);
    },
    addIconPoints() {},
  };

  BayernAtlasMap.prototype.renderPointMarkers.call(context);
  context.pointsReady = false;
  BayernAtlasMap.prototype.renderPointMarkers.call(context);

  assert.equal(clearCalls, 1);
  assert.deepEqual(renderedItems, [1]);
  assert.equal(BayernAtlasMap.prototype.handleClusterSelect, undefined);
});

test('category visibility uses OR semantics', () => {
  const context = {
    categoryVisibility: new Map([
      ['category-history', false],
      ['category-memory', true],
    ]),
  };
  const item = { categories: [{ id: 'history' }, { id: 'memory' }] };

  assert.equal(BayernAtlasMap.prototype.isItemVisible.call(context, item), true);
  context.categoryVisibility.set('category-memory', false);
  assert.equal(BayernAtlasMap.prototype.isItemVisible.call(context, item), false);
});

test('Fluid assets have stable identifiers for TYPO3 13 and 14', () => {
  for (const suffix of ['html', 'fluid.html']) {
    const partial = readFileSync(
      new URL(`../../Resources/Private/Partials/BayernAtlas/LoadAssets.${suffix}`, import.meta.url),
      'utf8',
    );

    assert.match(partial, /identifier="bayernatlas-fluid-css"/);
    assert.match(partial, /identifier="bayernatlas-fluid-component"/);
    assert.match(partial, /identifier="bayernatlas-fluid-integration"/);
  }
});

test('frontend labels are provided through XLIFF translations', () => {
  const packageDirectory = new URL('../../', import.meta.url);
  const english = readFileSync(
    new URL('Resources/Private/Language/locallang.xlf', packageDirectory),
    'utf8',
  );
  const german = readFileSync(
    new URL('Resources/Private/Language/de.locallang.xlf', packageDirectory),
    'utf8',
  );
  const component = readFileSync(
    new URL('Resources/Private/Components/Map/Map.html', packageDirectory),
    'utf8',
  );
  const source = readFileSync(
    new URL('Resources/Public/JavaScript/BayernAtlas.js', packageDirectory),
    'utf8',
  );

  for (const key of [
    'map.ariaLabel',
    'map.layers',
    'map.baseLayer',
    'map.categories',
    'map.uncategorized',
    'map.loading',
    'map.error',
    'map.closeInformation',
  ]) {
    assert.match(english, new RegExp(`id="${key.replace('.', '\\.')}"`));
    assert.match(german, new RegExp(`id="${key.replace('.', '\\.')}"`));
  }

  assert.match(component, /f:translate/);
  assert.doesNotMatch(component, />Ebenen</);
  assert.doesNotMatch(source, /Information wird geladen|Orte anzeigen|Ohne Kategorie/);
});

test('moves focus into the information dialog and restores it on close', () => {
  const originalDocument = globalThis.document;
  let closeButtonFocusCalls = 0;
  let sourceFocusCalls = 0;
  const sourceElement = {
    focus() {
      sourceFocusCalls += 1;
    },
  };
  const context = {
    infoElement: {
      hidden: true,
      removeAttribute() {},
    },
    infoContentElement: { innerHTML: '' },
    infoCloseButton: {
      focus() {
        closeButtonFocusCalls += 1;
      },
    },
    lastFocusedElement: null,
    openInfo: BayernAtlasMap.prototype.openInfo,
  };

  globalThis.document = { activeElement: sourceElement };

  try {
    BayernAtlasMap.prototype.showInfo.call(context, '<p>Information</p>');
    BayernAtlasMap.prototype.hideInfo.call(context);
  } finally {
    globalThis.document = originalDocument;
  }

  assert.equal(closeButtonFocusCalls, 1);
  assert.equal(sourceFocusCalls, 1);
  assert.equal(context.infoElement.hidden, true);
});

test('closes the information dialog with Escape', () => {
  const listeners = {};
  const calls = [];
  const context = {
    infoCloseButton: {
      addEventListener(name, listener) {
        listeners[`button:${name}`] = listener;
      },
    },
    infoElement: {
      addEventListener(name, listener) {
        listeners[`dialog:${name}`] = listener;
      },
    },
    hideInfo() {
      calls.push('hide');
    },
    map: {
      clearHighlights() {
        calls.push('clear');
      },
    },
  };

  BayernAtlasMap.prototype.registerInfoCloseButton.call(context);
  listeners['dialog:keydown']({
    key: 'Escape',
    preventDefault() {
      calls.push('prevent');
    },
  });

  assert.deepEqual(calls, ['prevent', 'hide', 'clear']);
});

test('renders custom icons in one escaped KML document', () => {
  const icon = {
    url: '/icons/p.png?a=1&b=2',
    width: 30,
    height: 30,
    originalWidth: 60,
    originalHeight: 60,
    anchorX: 15,
    anchorY: 30,
  };
  const kml = pointsToKml([
    { id: 67, title: 'P & H <test>', coordinates: [12, 49], icon },
    { id: 68, title: 'Bus', coordinates: [12.1, 49.1], icon },
    { id: 69, coordinates: [12, 49], icon: { url: 'javascript:alert(1)' } },
  ], 'https://example.test/visit');

  assert.equal((kml.match(/<Placemark /g) || []).length, 2);
  assert.match(kml, /id="item-67"/);
  assert.match(kml, /id="item-68"/);
  assert.match(kml, /P &amp; H &lt;test&gt;/);
  assert.match(kml, /https:\/\/example\.test\/icons\/p\.png\?a=1&amp;b=2/);
  assert.match(kml, /<scale>0\.5<\/scale>/);
  assert.match(kml, /hotSpot x="0\.5" y="0"/);
  assert.equal(pointsToKml([{ coordinates: [12, 49] }], 'https://example.test/'), null);
});

test('checks icons through the BayernAtlas proxy', async () => {
  const images = [];
  const createImage = () => {
    const image = {};
    images.push(image);

    return image;
  };

  const loaded = probeIcon('https://example.test/p.png', createImage);
  images[0].onload();
  const failed = probeIcon('https://local.test/p.png', createImage);
  images[1].onerror();
  const timedOut = probeIcon('https://example.test/slow.png', createImage, 1);

  assert.equal(
    images[0].src,
    `${ICON_PROXY_URL}?url=${encodeURIComponent('https://example.test/p.png')}`,
  );
  assert.deepEqual(await Promise.all([loaded, failed, timedOut]), [true, false, false]);
});

test('renders reachable icons as one layer and other points as markers', () => {
  const markers = [];
  const layers = [];
  const icon = (name) => ({ url: `https://example.test/${name}.png` });
  const context = Object.assign(Object.create(BayernAtlasMap.prototype), {
    pointsReady: true,
    pointLayerId: null,
    configuration: { showLabels: '0' },
    element: { ownerDocument: { baseURI: 'https://example.test/' } },
    iconAvailability: new Map([
      ['https://example.test/public.png', true],
      ['https://example.test/private.png', false],
    ]),
    pointItems: [
      { id: 1, coordinates: [12, 49], icon: icon('public') },
      { id: 2, coordinates: [12.1, 49], icon: icon('public') },
      { id: 3, coordinates: [12.2, 49], icon: icon('private') },
      { id: 4, coordinates: [12.3, 49] },
    ],
    isItemVisible: () => true,
    map: {
      clearMarkers() {},
      addMarker: (coordinate, options) => markers.push(options.id),
      addLayer(data, options) {
        layers.push({ data, options });

        return 'icons';
      },
    },
  });

  context.renderPointMarkers();

  assert.deepEqual(markers, ['item-3', 'item-4']);
  assert.equal(layers.length, 1);
  assert.equal((layers[0].data.match(/<Placemark /g) || []).length, 2);
  assert.deepEqual(layers[0].options, { zoomToExtent: false, displayFeatureLabels: false });
  assert.equal(context.pointLayerId, 'icons');
});

test('removes the icon layer before filtering and selects icon placemarks', () => {
  const removed = [];
  const selected = [];
  const context = {
    pointLayerId: 'icons',
    itemsById: new Map([['67', { id: 67 }]]),
    selectItem: (item) => selected.push(item.id),
    map: { clearMarkers() {}, removeLayer: (id) => removed.push(id) },
  };

  BayernAtlasMap.prototype.handleFeatureSelect.call(context, {
    detail: { features: [{ properties: { id: 'item-67', name: 'Parkhaus' } }] },
  });
  BayernAtlasMap.prototype.clearPointMarkers.call(context);

  assert.deepEqual(selected, [67]);
  assert.deepEqual(removed, ['icons']);
  assert.equal(context.pointLayerId, null);
});
