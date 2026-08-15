// theme-engine.js - Karni Pro Central Theme Engine v2
// Single source of truth: users/{uid}/storeSettings/theme
// Fallback: users/{uid}/storeTheme
// Compatible with GitHub Pages ES Module

export const THEMES = {
  classic: {
    label: "Classic",
    colors: { primary:"#10B981", secondary:"#111827", accent:"#059669", background:"#F8FAFC", card:"#FFFFFF", text:"#111827", muted:"#6B7280" },
    layout: "grid", cardStyle: "rounded", borderRadius: "16px", header: "standard",
    layoutConfig: { productColumns:2, borderRadius:"16px" },
    header: { style:"standard", showLogo:true, showStoreName:true },
    productCard: { style:"standard", showPrice:true, showStock:true, showButton:true }
  },
  modern: {
    label: "Modern",
    colors: { primary:"#111827", secondary:"#000000", accent:"#FFFFFF", background:"#FFFFFF", card:"#111827", text:"#FFFFFF", muted:"#9CA3AF" },
    layout: "grid", cardStyle: "large", borderRadius: "20px", header: "standard",
    layoutConfig: { productColumns:2, borderRadius:"20px" },
    header: { style:"standard", showLogo:true, showStoreName:true },
    productCard: { style:"modern", showPrice:true, showStock:false, showButton:true }
  },
  minimal: {
    label: "Minimal",
    colors: { primary:"#111827", secondary:"#E5E7EB", accent:"#111827", background:"#FFFFFF", card:"#FFFFFF", text:"#111827", muted:"#9CA3AF" },
    layout: "list", cardStyle: "minimal", borderRadius: "8px", header: "minimal",
    layoutConfig: { productColumns:2, borderRadius:"8px" },
    header: { style:"minimal", showLogo:false, showStoreName:true },
    productCard: { style:"compact", showPrice:true, showStock:false, showButton:false }
  },
  luxe: {
    label: "Luxe",
    colors: { primary:"#b8965e", secondary:"#0a0a0a", accent:"#d4b483", background:"#faf7f0", card:"#FFFFFF", text:"#111827", muted:"#b8965e" },
    layout: "grid", cardStyle: "luxury", borderRadius: "4px", header: "centered",
    layoutConfig: { productColumns:2, borderRadius:"4px" },
    header: { style:"centered", showLogo:true, showStoreName:true },
    productCard: { style:"standard", showPrice:true, showStock:false, showButton:true }
  }
};

export const DEFAULT_THEME = {
  theme: "classic",
  template: "classic",
  primaryColor: "#10B981",
  secondaryColor: "#111827",
  accentColor: "#059669",
  cardStyle: "rounded",
  layout: "grid",
  borderRadius: "16px",
  colors: { primary:"#10B981", secondary:"#111827", accent:"#059669", background:"#F8FAFC", card:"#FFFFFF", text:"#111827", muted:"#6B7280" },
  typography: { fontFamily:"Cairo" },
  layoutConfig: { productColumns:2, borderRadius:"16px" },
  header: { style:"standard", showLogo:true, showStoreName:true },
  hero: { enabled:false, title:"", subtitle:"", image:"" },
  productCard: { style:"standard", showPrice:true, showStock:true, showButton:true },
  updatedAt: ""
};

function deepMerge(target, source){
  const out = JSON.parse(JSON.stringify(target));
  for(const k in source){
    if(source[k] && typeof source[k]==='object' &&!Array.isArray(source[k])){
      out[k] = deepMerge(out[k]||{}, source[k]);
    } else if(source[k]!==undefined){
      out[k]=source[k];
    }
  }
  return out;
}

function normalizeHeader(input){
  // يصلح تعارض header:"standard" vs header:{style:"standard"}
  if(typeof input === 'string'){
    return { style:input, showLogo:true, showStoreName:true };
  }
  if(input && typeof input === 'object'){
    if(input.style) return { style:input.style, showLogo:input.showLogo??true, showStoreName:input.showStoreName??true };
    // إذا كان object قديم بدون style
    return { style:"standard", showLogo:true, showStoreName:true,...input };
  }
  return { style:"standard", showLogo:true, showStoreName:true };
}

function normalizeRadius(input){
  // مصدر موحد: layoutConfig.borderRadius
  if(!input) return "16px";
  if(typeof input === 'string') return input;
  if(input.layoutConfig?.borderRadius) return input.layoutConfig.borderRadius;
  if(input.borderRadius) return input.borderRadius;
  return "16px";
}

export const ThemeEngine = {
  _current: null,
  _db: null,

  setDB(db){ this._db = db; },

  getDefaultTheme(){ return JSON.parse(JSON.stringify(DEFAULT_THEME)); },
  getDefaults(){ return this.getDefaultTheme(); }, // alias

  getCurrent(){ return this._current? JSON.parse(JSON.stringify(this._current)) : this.getDefaultTheme(); },

  normalize(raw){
    let base = this.getDefaultTheme();
    const themeName = raw?.theme || raw?.template || "classic";
    const preset = THEMES[themeName] || THEMES.classic;
    // ادمج preset
    base = deepMerge(base, {...preset, theme:themeName, template:themeName });

    // دعم الحقول القديمة المسطحة
    if(raw?.primaryColor) base.colors.primary = raw.primaryColor;
    if(raw?.secondaryColor) base.colors.secondary = raw.secondaryColor;
    if(raw?.accentColor) base.colors.accent = raw.accentColor;
    if(raw?.cardStyle) base.cardStyle = raw.cardStyle;
    if(raw?.layout) base.layout = raw.layout;

    // ادمج البيانات الواردة
    const merged = deepMerge(base, raw||{});

    // توحيد header
    merged.header = normalizeHeader(merged.header);
    // توحيد borderRadius
    const unifiedRadius = normalizeRadius(merged);
    merged.borderRadius = unifiedRadius;
    merged.layoutConfig = merged.layoutConfig || {};
    merged.layoutConfig.borderRadius = unifiedRadius;
    // توحيد theme/template
    merged.theme = merged.theme || merged.template || themeName;
    merged.template = merged.theme;
    // توحيد الألوان المسطحة
    merged.primaryColor = merged.colors.primary;
    merged.secondaryColor = merged.colors.secondary;
    merged.accentColor = merged.colors.accent;

    return merged;
  },

  applyTheme(raw){
    const t = this.normalize(raw);
    this._current = t;
    const r = document.documentElement;
    r.style.setProperty('--theme-primary', t.colors.primary);
    r.style.setProperty('--theme-secondary', t.colors.secondary);
    r.style.setProperty('--theme-accent', t.colors.accent);
    r.style.setProperty('--theme-background', t.colors.background);
    r.style.setProperty('--theme-card', t.colors.card);
    r.style.setProperty('--theme-text', t.colors.text);
    r.style.setProperty('--theme-muted', t.colors.muted);
    r.style.setProperty('--theme-radius', t.layoutConfig.borderRadius);
    r.setAttribute('data-theme', t.theme);
    r.setAttribute('data-theme-card', t.cardStyle);
    r.setAttribute('data-theme-layout', t.layout);
    document.body.style.background = t.colors.background;
    document.body.style.fontFamily = `'${t.typography.fontFamily}', sans-serif`;
    return t;
  },

  // aliases
  apply(raw){ return this.applyTheme(raw); },
  renderPreview(raw){ return this.applyTheme(raw); },

  async loadTheme(uid){
    if(!this._db){
      try{ const m = await import("./firebase.js"); this._db = m.db; }catch(e){}
    }
    if(!this._db) return this._current = this.getDefaultTheme();

    const { ref, get } = await import("https://www.gstatic.com/firebasejs/12.0.0/firebase-database.js");

    // 1. المصدر الأساسي
    try{
      const snap = await get(ref(this._db, `users/${uid}/storeSettings/theme`));
      if(snap.exists()){
        return this._current = this.normalize(snap.val());
      }
    }catch(e){ console.warn('[ThemeEngine] storeSettings/theme read failed', e); }

    // 2. Fallback للتوافق
    try{
      const snap2 = await get(ref(this._db, `users/${uid}/storeTheme`));
      if(snap2.exists()){
        return this._current = this.normalize(snap2.val());
      }
    }catch(e){ console.warn('[ThemeEngine] storeTheme read failed', e); }

    // 3. Default
    return this._current = this.getDefaultTheme();
  },

  async load(uid){ return this.loadTheme(uid); },

  async saveTheme(uid, raw){
    if(!this._db){
      const m = await import("./firebase.js");
      this._db = m.db;
    }
    const { ref, set } = await import("https://www.gstatic.com/firebasejs/12.0.0/firebase-database.js");
    const toSave = this.normalize(raw);
    toSave.updatedAt = new Date().toISOString();

    // المصدر الأساسي
    await set(ref(this._db, `users/${uid}/storeSettings/theme`), toSave);

    // للتوافق مع البيانات القديمة - لا نحذفه
    await set(ref(this._db, `users/${uid}/storeTheme`), {
      theme: toSave.theme,
      primaryColor: toSave.colors.primary,
      secondaryColor: toSave.colors.secondary,
      accentColor: toSave.colors.accent,
      cardStyle: toSave.cardStyle,
      layout: toSave.layout,
      borderRadius: toSave.layoutConfig.borderRadius,
      colors: toSave.colors,
      layoutConfig: toSave.layoutConfig,
      header: toSave.header,
      hero: toSave.hero,
      productCard: toSave.productCard,
      updatedAt: toSave.updatedAt
    });

    this._current = toSave;
    return toSave;
  },

  async save(uid, raw){ return this.saveTheme(uid, raw); }
};
