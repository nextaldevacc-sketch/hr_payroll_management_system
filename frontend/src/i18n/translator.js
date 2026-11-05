export function resolveNestedKey(obj, path) {
  if (!obj || typeof obj !== 'object') return undefined;
  const parts = path.split('.');
  let curr = obj;
  for (const p of parts) {
    if (curr && typeof curr === 'object' && p in curr) {
      curr = curr[p];
    } else {
      return undefined;
    }
  }
  return curr;
}

export function translate(translations, language, key, paramsOrFallback = {}, maybeParams) {
  let params = {};
  let fallbackDefault = null;

  if (paramsOrFallback && typeof paramsOrFallback === 'object') {
    params = paramsOrFallback;
  } else if (typeof paramsOrFallback === 'string') {
    fallbackDefault = paramsOrFallback;
    if (maybeParams && typeof maybeParams === 'object') {
      params = maybeParams;
    }
  }

  let val;

  // 1. Plural support if count is provided
  if (typeof params.count === 'number') {
    const pluralSuffix = params.count === 1 ? '_one' : '_other';
    const pluralKey = `${key}${pluralSuffix}`;
    val = resolveNestedKey(translations[language], pluralKey);
    if (val === undefined && language !== 'en') {
      val = resolveNestedKey(translations.en, pluralKey);
    }
  }

  // 2. Base key in current language
  if (val === undefined) {
    val = resolveNestedKey(translations[language], key);
  }

  // 3. Fallback to English
  if (val === undefined && language !== 'en') {
    val = resolveNestedKey(translations.en, key);
  }

  // 4. Fallback default string or key
  if (val === undefined) {
    val = fallbackDefault !== null ? fallbackDefault : key;
  }

  // 5. Interpolate {{param}} tokens
  if (typeof val === 'string') {
    return val.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, token) => {
      return params[token] !== undefined ? String(params[token]) : `{{${token}}}`;
    });
  }

  return val;
}

