// theme-engine.js - Karni Pro Theme Engine v1
// Modular, lightweight, no framework

export const THEMES = {
  classic: {
    label: "Classic",
    colors: { primary: "#10B981", secondary: "#111827", background: "#F8FAFC", card: "#FFFFFF", text: "#111827", muted: "#6B7280" },
    typography: { fontFamily: "Cairo" },
    layout: { productColumns: 2, borderRadius: "16px" },
    header: { style: "standard", showLogo: true, showStoreName: true },
    hero: { enabled: false, title: "", subtitle: "", image: "" },
    productCard: { style: "standard", showPrice: true, showStock: true, showButton: true }
  },
  modern: {
    label: "Modern",
    colors: { primary: "#111827", secondary: "#000000", background: "#FFFFFF", card: "#111827", text: "#FFFFFF", muted: "#9CA3AF" },
    typography: { fontFamily: "Cairo" },
    layout: { productColumns: 2, borderRadius: "20px" },
    header: { style: "standard", showLogo: true, showStoreName: true },
    hero: { enabled: false, title: "", subtitle: "", image: "" },
    productCard: { style: "modern", showPrice: true, showStock: false, showButton: true }
  },
  minimal: {
    label: "Minimal",
    colors: { primary: "#111827", secondary: "#111827", background: "#FFFFFF", card: "#FFFFFF", text: "#111827", muted: "#9CA3AF" },
    typography: { fontFamily: "Cairo" },
    layout: { productColumns: 2, borderRadius: "8px" },
    header: { style: "minimal", showLogo: false, showStoreName: true },
    hero: { enabled: false, title: "", subtitle: "", image: "" },
    productCard: { style: "compact", showPrice: true, showStock: false, showButton: false }
  },
  luxe: {
    label: "Luxe",
    colors: { primary: "#b8965e", secondary: "#0a0a0a", background: "#faf7f0", card: "#FFFFFF", text: "#111827", muted: "#b8965e" },
    typography: { fontFamily: "Cairo" },
    layout: { productColumns: 2, borderRadius: "4px" },
    header: { style: "centered", showLogo: true, showStoreName: true },
    hero: { enabled: false, title: "COLLECTION PRIVÉE", subtitle: "Luxury curated for you", image: "" },
    productCard: { style: "standard", showPrice: true, showStock: false, showButton: true }
  }
};

export const DEFAULT_THEME = {
  template: "classic",
  colors: { primary: "#10B981", secondary: "#111827", background: "#F8FAFC", card: "#FFFFFF", text: "#111827", muted: "#6B7280" },
  typography: { fontFamily: "Cairo" },
  layout: { productColumns: 2, borderRadius: "16px" },
  header: { style: "standard", showLogo: true, showStoreName: true },
  hero: { enabled: false, title: "", subtitle: "", image: "" },
  productCard: { style: "standard", showPrice: true, showStock: true, showButton: true },
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

export const ThemeEngine = {
  _current: null,
  _db: null,

  setDB(db){ this._db=db; },

  getDefaults(){ return JSON.parse(JSON.stringify(DEFAULT_THEME)); },

  getTemplatePreset(name){
    const preset = THEMES[name] || THEMES.classic;
    return deepMerge(this.getDefaults(), { template: name,...preset });
  },

  getCurrent(){ return this._current? JSON.parse(JSON.stringify(this._current)) : this.getDefaults(); },

  normalize(settings){
    let base = this.getDefaults();
    if(settings?.template && THEMES[settings.template]){
      base = deepMerge(base, THEMES[settings.template]);
      base.template = settings.template;
    }
    return deepMerge(base, settings||{});
  },

  apply(settings){
    const theme = this.normalize(settings);
    this._current = theme;
    const r = document.documentElement;
    r.style.setProperty('--theme-primary', theme.colors.primary);
    r.style.setProperty('--theme-secondary', theme.colors.secondary);
    r.style.setProperty('--theme-background', theme.colors.background);
    r.style.setProperty('--theme-card', theme.colors.card);
    r.style.setProperty('--theme-text', theme.colors.text);
    r.style.setProperty('--theme-muted', theme.colors.muted);
    r.style.setProperty('--theme-radius', theme.layout.borderRadius);
    r.setAttribute('data-theme', theme.template);
    r.setAttribute('data-header', theme.header.style);
    r.setAttribute('data-card-style', theme.productCard.style);
    r.setAttribute('data-columns', theme.layout.productColumns);
    document.body.style.fontFamily = `'${theme.typography.fontFamily}', sans-serif`;
    document.body.style.background = theme.colors.background;
    return theme;
  },

  applyTemplate(name){
    const preset = this.getTemplatePreset(name);
    return this.apply(preset);
  },

  reset(){
    return this.apply(this.getDefaults());
  },

  async load(uid){
    if(!this._db){
      const mod = await import("./firebase.js");
      this._db = mod.db;
    }
    try{
      const { ref, get } = await import("https://www.gstatic.com/firebasejs/12.0.0/firebase-database.js");
      const snap = await get(ref(this._db, `users/${uid}/storeSettings/theme`));
      if(snap.exists()){
        const data = snap.val();
        const merged = this.normalize(data);
        this._current = merged;
        return merged;
      }
    }catch(e){ console.error('[ThemeEngine] load error', e); }
    const def = this.getDefaults();
    this._current = def;
    return def;
  },

  async save(uid, settings){
    if(!this._db){
      const mod = await import("./firebase.js");
      this._db = mod.db;
    }
    const { ref, set } = await import("https://www.gstatic.com/firebasejs/12.0.0/firebase-database.js");
    const toSave = this.normalize(settings);
    toSave.updatedAt = new Date().toISOString();
    await set(ref(this._db, `users/${uid}/storeSettings/theme`), toSave);
    this._current = toSave;
    return toSave;
  }
};
