const EFFORT_SUFFIX = /-(extra-high|xhigh|minimal|none|low|medium|high|max)$/;

export function parseCursorModel(value) {
  const raw = String(value || '').trim();
  const match = raw.match(/^([^\[\]]+)(?:\[([^\[\]]*)\])?$/);
  if (!match) throw new Error(`Invalid Cursor model: ${raw}`);
  const params = new Map();
  if (match[2] !== undefined) {
    for (const item of match[2].split(',')) {
      const pair = item.trim().match(/^([a-z_]+)=([^=,]+)$/);
      if (!pair || params.has(pair[1])) throw new Error(`Invalid Cursor model parameter: ${item}`);
      params.set(pair[1], pair[2].trim());
    }
  }
  let family = match[1];
  const fast = family.endsWith('-fast');
  if (fast) family = family.slice(0, -5);
  const thinking = family.endsWith('-thinking');
  if (thinking) family = family.slice(0, -9);
  const effortMatch = family.match(EFFORT_SUFFIX);
  const effort = effortMatch?.[1].replace('extra-high', 'xhigh') || null;
  if (effortMatch) family = family.slice(0, -effortMatch[0].length);
  if (thinking) family += '-thinking';
  if (params.has('fast') && !['true', 'false'].includes(params.get('fast'))) {
    throw new Error('Cursor fast must be true or false');
  }
  return {
    raw, base: match[1], family, params,
    effort: params.get('effort') || effort,
    fast: params.has('fast') ? params.get('fast') === 'true' : fast,
  };
}

export function cursorModelFamily(value) {
  const parsed = parseCursorModel(value);
  // Context and other explicit parameters stay separate from the catalog variants.
  const dimensions = [...parsed.params].filter(([key]) => !['effort', 'fast'].includes(key));
  return parsed.family + (dimensions.length ? `[${dimensions.map(([key, val]) => `${key}=${val}`).join(',')}]` : '');
}

export function decorateCursorModelCatalog(catalog) {
  const models = catalog.models || [];
  return {
    ...catalog,
    models: models.map((model) => {
      const family = cursorModelFamily(model.slug);
      const variants = models.filter((entry) => cursorModelFamily(entry.slug) === family);
      return {
        ...model,
        cursorFamily: family,
        defaultReasoningLevel: parseCursorModel(model.slug).effort,
        supportedReasoningLevels: [...new Set(variants.map((entry) => parseCursorModel(entry.slug).effort).filter(Boolean))],
        supportsFast: variants.some((entry) => parseCursorModel(entry.slug).fast),
      };
    }),
  };
}

export function groupCursorModelCatalog(catalog) {
  const decorated = decorateCursorModelCatalog(catalog);
  const groups = new Map();
  for (const model of decorated.models) {
    if (groups.has(model.cursorFamily)) continue;
    const variants = decorated.models.filter((entry) => entry.cursorFamily === model.cursorFamily);
    const preferred = variants.find((entry) => !/\b(?:Extra High|Minimal|None|Low|Medium|High|Max|Fast)\b/.test(entry.displayName)) || model;
    groups.set(model.cursorFamily, {
      ...preferred,
      displayName: String(preferred.displayName || preferred.slug).replace(/\s+(?:Extra High|Minimal|None|Low|Medium|High|Max|Fast)\b/g, '').replace(/\s+\(default\)$/, ''),
      cursorAliases: variants.map((entry) => entry.slug),
      cursorVariants: variants.map((entry) => entry.slug),
    });
  }
  return { ...decorated, models: [...groups.values()] };
}

export function resolveCursorModel(value, catalog, { effort = null, fast = null } = {}) {
  const parsed = parseCursorModel(value || 'auto');
  if (effort === null && fast === null && !parsed.params.has('effort') && !parsed.params.has('fast')) return value;
  if (catalog.error) throw new Error(`Cursor model catalog unavailable: ${catalog.error}`);
  const familyModels = (catalog.models || []).filter((entry) => parseCursorModel(entry.slug).family === parsed.family);
  const plainVariants = familyModels.filter((entry) => !parseCursorModel(entry.slug).params.size);
  const variants = plainVariants.length ? plainVariants
    : familyModels.filter((entry) => cursorModelFamily(entry.slug) === cursorModelFamily(parsed.raw));
  if (!variants.length) throw new Error(`Cannot configure effort/fast for Cursor model ${parsed.raw}: model not in CLI catalog`);
  const defaultVariant = variants.find((entry) => entry.slug === parsed.base)
    || variants.find((entry) => !/\b(?:Extra High|Minimal|None|Low|Medium|High|Max|Fast)\b/.test(entry.displayName))
    || variants[0];
  const targetEffort = effort ?? parsed.effort ?? parseCursorModel(defaultVariant.slug).effort;
  const targetFast = fast ?? parsed.fast;
  const match = variants.find((entry) => {
    const candidate = parseCursorModel(entry.slug);
    return candidate.effort === targetEffort && candidate.fast === targetFast;
  });
  if (!match) {
    throw new Error(`Cursor model ${parsed.family} does not support effort=${targetEffort || 'default'}, fast=${targetFast}. Choose a supported combination or reset the overrides to default.`);
  }
  if (parsed.params.size) {
    if (effort !== null) parsed.params.set('effort', effort);
    if (fast !== null) parsed.params.set('fast', String(fast));
    return `${parsed.base}[${[...parsed.params].map(([key, val]) => `${key}=${val}`).join(',')}]`;
  }
  return match.slug;
}
