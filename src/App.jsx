import { useState, useEffect, useMemo, useRef } from "react";
import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL, SUPABASE_ANON_KEY, AFFILIATE } from "./feira-config";

// ═════════════════════════════════════════════════════════════════════
// SUPABASE CLIENT
// ═════════════════════════════════════════════════════════════════════
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ═════════════════════════════════════════════════════════════════════
// BRAND TOKENS
// ═════════════════════════════════════════════════════════════════════
const C = {
  graphite: "#1A1F2A", graphiteDeep: "#0F1218",
  sand: "#F5F3EF", linen: "#E8E4DC", linenDim: "#DCD6CB",
  sage: "#A8C97A", sageDeep: "#8FB35F",
  stone: "#6B7280", stoneSoft: "#8A8680",
  terracota: "#C8754A",
  ink: "#2C2F3A", inkSoft: "#3D424F",
  danger: "#C84A4A",
};

// Cores para avatares de membros (rotaciona por user_id)
const AVATAR_COLORS = [
  "#A8C97A", "#C8754A", "#7AAEC9", "#C97AB7",
  "#C9B17A", "#7AC9A0", "#9C7AC9", "#C97A8B",
];

function avatarColorFor(userId) {
  if (!userId) return C.stone;
  const seed = userId.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  return AVATAR_COLORS[seed % AVATAR_COLORS.length];
}

function initialFor(name, email) {
  if (name && name.trim()) return name.trim()[0].toUpperCase();
  if (email) return email[0].toUpperCase();
  return "?";
}

// ═════════════════════════════════════════════════════════════════════
// CATEGORIAS
// ═════════════════════════════════════════════════════════════════════
const CATEGORIES = [
  { id:"hortifruti", label:"Hortifruti", emoji:"🥦", keywords:["alface","tomate","cenoura","batata","cebola","alho","limão","limao","banana","maçã","maca","uva","abacate","espinafre","brócolis","brocolis","couve","pepino","pimentão","pimentao","quiabo","abobrinha","abobora","beterraba","rabanete","mandioca","aipim","macaxeira","chuchu","berinjela","jiló","jilo","gengibre","manga","mamão","mamao","melão","melao","melancia","abacaxi","ananas","morango","pera","pêra","ameixa","kiwi","goiaba","caju","maracuja","maracujá","milho verde","quiabos","verdura","fruta","legume"] },
  { id:"laticinios", label:"Laticínios", emoji:"🥛", keywords:["leite","queijo","iogurte","iog ","manteiga","requeijão","requeijao","creme de leite","creme leite","creme ric","creme ricot","nata","ovos","ovo","ricota","mussarela","muçarela","minas","coalho","parmesão","parmesao","cheddar","provolone","danone","yakult","achocolatado","achoc","ach ","chocolate em pó","choc em po","choc po","lacteo","leite po","leite em po","ovomaltine","nesquik","toddy"] },
  { id:"carnes", label:"Carnes", emoji:"🥩", keywords:["carne","frango","fgo","fgo ","peixe","tilapia","linguiça","linguica","ling ","salsicha","bacon","presunto","bife","costela","filé","file","filezinho","filé de","patinho","picanha","alcatra","salmão","salmao","atum","camarão","camarao","peito de","coxa","sobrecoxa","sassami","carne moida","carne moída","cha de dentro","chã de dentro","contrafilé","contrafile","maminha","fraldinha","aperitivo","peru","chester","mortadela","salame","peito"] },
  { id:"padaria", label:"Padaria", emoji:"🍞", keywords:["pão","pao","bolo","biscoito","bolacha","torrada","croissant","broa","farinha","panetone","rosca","sonho","salgadinho","pão de queijo","pao de queijo"] },
  { id:"limpeza", label:"Limpeza", emoji:"🧹", keywords:["sabão","sabao","detergente","desinfetante","cloro","multiuso","esponja","vassoura","rodo","pano","amaciante","limpador","papel higiênico","papel higienico","papel toalha","alvejante","veja","ype","ypê","minuano","omo","ariel","brilhante","saco de lixo","lustra moveis"] },
  { id:"higiene", label:"Higiene", emoji:"🧴", keywords:["shampoo","xampu","condicionador","sabonete","creme rosto","desodorante","absorvente","fralda","escova","pasta de dente","creme dental","perfume","hidratante","colônia","colonia","spray","loção","locao","talco","barbeador","fio dental","cotonete","algodão","algodao","gillette","colgate","oral b"] },
  { id:"bebidas", label:"Bebidas", emoji:"🧃", keywords:["suco","refrigerante","refrig","coca","pepsi","fanta","guaraná","guarana","sprite","água ","agua ","cerveja","cerv","heineken","skol","brahma","budweiser","stella","corona","vinho","café","cafe","chá","energético","energetico","red bull","monster","drink","whisky","whiskey","vodka","cachaça","cachaca","gin","tequila","champagne","espumante","nat one","del valle","do bem","limonada","matte"] },
  { id:"congelados", label:"Congelados", emoji:"🧊", keywords:["pizza","lasanha","sorvete","hambúrguer","hamburguer","nuggets","empanado","congelado","kibe","quibe","esfiha","pão de alho","pao de alho"] },
  { id:"mercearia", label:"Mercearia", emoji:"🛒", keywords:["arroz","feijão","feijao","macarrão","macarrao","azeite","óleo","oleo","açúcar","acucar","molho","extrato","sardinha","milho","ervilha","vinagre","ketchup","maionese","mostarda","tempero","caldo","fermento","gelatina","açaí","acai","tapioca","fubá","fuba","amido","granola","aveia","cereal","cereais","goma","goma masc","mentos","bala","chiclete","doce","chocolate","amendoim","castanha","passas","azeitona"] },
  { id:"outros", label:"Outros", emoji:"📦", keywords:[] },
];

// Ordem específica de avaliação para evitar conflitos de keywords
// (ex: "suco de laranja" deve cair em bebidas, não em hortifruti)
const CATEGORY_PRIORITY_ORDER = ["bebidas","laticinios","carnes","padaria","congelados","limpeza","higiene","mercearia","hortifruti"];

// Chave normalizada para agrupar items por nome (sem acentos, lowercase, trim)
// Usada para calcular preço médio do histórico e match de nomes.
function itemPriceKey(name) {
  if (!name) return "";
  return (name || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function guessCategory(name) {
  const lower = name.toLowerCase();
  // Avalia categorias na ordem prioritária para evitar conflitos
  // (ex: "Suco de laranja" cai em bebidas antes de hortifruti)
  for (const catId of CATEGORY_PRIORITY_ORDER) {
    const cat = CATEGORIES.find(c => c.id === catId);
    if (cat && cat.keywords.some(k => lower.includes(k))) return cat.id;
  }
  return "outros";
}

// ═════════════════════════════════════════════════════════════════════
// NORMALIZAÇÃO DE NOMES (dicionários e helpers globais)
// Usados tanto pela importação de NF quanto pela importação de texto.
// ═════════════════════════════════════════════════════════════════════

// Embalagens que devem ser removidas do início do nome
// Ex: "01 pote de manteiga" → remove "pote de" → "manteiga"
const PACKAGING_PREFIXES = [
  "pote", "potes",
  "pacote", "pacotes", "pct",
  "caixa", "caixas", "cx",
  "garrafa", "garrafas",
  "lata", "latas",
  "saco", "sacos",
  "sachê", "sache", "sachet", "sachês", "saches",
  "duzia", "dúzia", "duzias", "dúzias", "dz",
  "pedaço", "pedaco", "pedaços", "pedacos",
  "bandeja", "bandejas",
  "frasco", "frascos",
  "tubo", "tubos",
  "fardo", "fardos",
];

// Remove embalagem no início + conector "de/do/da" (uma ou duas vezes)
// "01 pote de manteiga" (qty já extraída) → "manteiga"
// "01 pacote Açúcar" → "Açúcar"
function stripPackagingPrefix(text) {
  if (!text) return "";
  let working = text.trim();
  let changed = true;
  // Roda até estabilizar (caso tenha "01 pacote de caixa de"...)
  while (changed) {
    changed = false;
    const lower = working.toLowerCase();
    for (const pkg of PACKAGING_PREFIXES) {
      // Match "pacote " ou "pacote de " no início
      const reWithDe = new RegExp(`^${pkg}\\s+(de|do|da|dos|das)\\s+`, "i");
      const reAlone = new RegExp(`^${pkg}\\s+`, "i");
      if (reWithDe.test(working)) {
        working = working.replace(reWithDe, "");
        changed = true;
        break;
      } else if (reAlone.test(working)) {
        working = working.replace(reAlone, "");
        changed = true;
        break;
      }
    }
  }
  return working.trim();
}

// Dicionário de sinônimos: termos da NF → termos do dia a dia
// ORDEM IMPORTA: termos com 2 palavras (ex "beb lac") devem vir antes de palavras simples
const synonymsDict = {
  // ─── Termos compostos (devem vir PRIMEIRO) ───
  "beb lac": "bebida láctea",         // "Beb Lac Zer" → "Bebida Láctea Zero"
  "sab barra": "sabonete barra",      // "Sab Barra Antibac" → "Sabonete Barra Antibac"
  "goma masc": "goma de mascar",      // "Goma Masc Mentos" → "Goma de Mascar Mentos"
  "ovo verm": "ovo", "ovo bra": "ovo",
  "vermelho c": "",
  "pao f orig": "pão francês",
  "minas p": "minas padrão",
  "minas padrao": "minas padrão",

  // ─── Categorias e tipos de produto ───
  "fgo": "frango", "fg": "frango",
  "iog": "iogurte",
  "cerv": "cerveja",
  "refrig": "refrigerante",
  "achoc": "achocolatado", "ach": "achocolatado",
  "choc": "chocolate",
  "qa": "", "qj": "queijo",
  "ling": "linguiça",
  "mant": "manteiga",
  "filezinho": "filé",
  "file": "filé",
  "pao": "pão",
  "beb": "bebida",
  "sab": "sabonete",
  "ricot": "ricota",
  "tilapia": "tilapia",
  "macarrao": "macarrão",
  "maca": "maçã",            // "Maca Turma Monica" → "Maçã"
  "temp": "tempero",         // "Temp Cebola Alho" → "Tempero Cebola Alho"
  "lrnj": "laranja", "lrj": "laranja",
  "flocao": "flocão",        // "Flocao Novo Milho" → "Flocão Novo Milho"
  "aveia": "aveia",
  "pimentao": "pimentão",    // "Pimentao Vermelho" → "Pimentão Vermelho"
  "limao": "limão",
  "feijao": "feijão",
  "leitao": "leitão",
  "agriao": "agrião",

  // ─── Descritores ───
  "antibac": "antibacteriano",  // "Sab Barra Antibac"
  "se": "sem",                  // "Uva Se Crf" → "Uva Sem Crf"
  "zer": "zero",                // "Beb Lac Zer" → "Bebida Láctea Zero"
  "lac": "",                    // (já incorporado em "beb lac")
  "nat": "natural",
  "trad": "tradicional",
  "int": "integral",
  "fino": "fino",
  "novo": "novo",
  "padrao": "padrão",
  "alcool": "álcool",
  "verde": "verde",
  "amarelo": "amarelo",

  // ─── Marcas (mantém capitalizado) ───
  "sad": "Sadia",
  "dan": "Danone",
  "presid": "President",
  "ovomaltine": "Ovomaltine",
  "nestle": "Nestlé",
  "betania": "Betânia",
  "crf": "Carrefour",
  "ferrero": "Ferrero",
  "nutella": "Nutella",
  "mentos": "Mentos",
  "heineken": "Heineken",
  "coca": "Coca",
  "cola": "Cola",
  "natura": "Natura",
  "tsonia": "",      // marca pouco conhecida que polui

  // ─── Stopwords (palavras vazias) ───
  "manjar": "",
  "minhoto": "",
  "granel": "",
  "extra": "",
  "aperitivo": "",
  "cong": "",
  "pet": "",
  "sleek": "",
  "al": "",
  "fr": "",
  "millano": "",
  "incol": "",
  "bom": "",
  "beef": "",
  "bra": "",
  "verm": "",
  "tir": "",
  "n": "",
  "sol": "",
  "em": "",
  "de": "",
  "do": "",
  "da": "",
  "para": "",
  "com": "",
  "sem": "",
  "c": "",
  "p": "",
  "po": "pó",
  "kg": "", "g": "", "ml": "", "lt": "", "un": "",
};
// Remove acentos (Á → A, ç → c)
const removeAccents = s => (s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "");

// Normaliza: lower, sem acentos, sem caracteres não alfabéticos
const normalize = s =>
  removeAccents(s || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

// Aplica sinônimos: substitui termos abreviados da NF pelos amigáveis
// Ordena por número de palavras (descendente) para garantir que "beb lac"
// seja aplicado antes de "beb" (evita match parcial errado)
const sortedSynonyms = Object.entries(synonymsDict).sort(
  (a, b) => b[0].split(" ").length - a[0].split(" ").length
);
const expandSynonyms = s => {
  let result = " " + normalize(s) + " ";
  for (const [abbr, full] of sortedSynonyms) {
    const re = new RegExp(`\\s${abbr}\\s`, "g");
    result = result.replace(re, ` ${full} `);
  }
  return result.replace(/\s+/g, " ").trim();
};

const friendlyStopwords = new Set([
  "kg", "g", "ml", "lt", "l", "un", "und", "unid",
  "pt", "pct", "cx", "fr", "fardo",
  "granel", "extra", "natural", "tradicional",
  "200g", "500g", "400g", "300g", "1kg", "100g", "150g", "250g", "1l", "2l",
  // Descritores comuns que não ajudam na lista
  "aperitivo", "cong", "pet", "sleek", "al", "fr", "po",
  "tir", "bra", "verm", "bom", "beef",
  // Partículas (mantemos "de", "sem" porque são importantes em alguns nomes)
  "do", "da", "dos", "das", "em", "para", "com", "ou", "no", "na",
  "a", "o", "as", "os", "e", "n", "c", "p", "sol",
]);
// ─── BASE DE PALAVRAS GENÉRICAS ────────────────────────────────
const productBases = {
  // ─── Limpeza ───
  "detergente":   { cat: "limpeza", desc: ["neutro","limao","limão","biodegradavel","biodegradável","gel"] },
  "sabao":        { cat: "limpeza", desc: ["po","pó","liquido","líquido","barra","coco","glicerina","neutro"] },
  "sabão":        { cat: "limpeza", desc: ["po","pó","liquido","líquido","barra","coco","glicerina","neutro"] },
  "sabonete":     { cat: "higiene", desc: ["barra","liquido","líquido","antibacteriano","hidratante","glicerina"] },
  "amaciante":    { cat: "limpeza", desc: ["concentrado"] },
  "desinfetante": { cat: "limpeza", desc: [] },
  "alvejante":    { cat: "limpeza", desc: ["sem","com","cloro"] },
  "agua sanitaria": { cat: "limpeza", desc: [] },
  "água sanitária": { cat: "limpeza", desc: [] },
  "lustra":       { cat: "limpeza", desc: [] },
  "limpa":        { cat: "limpeza", desc: ["vidro","piso","fogao","fogão"] },
  "esponja":      { cat: "limpeza", desc: [] },
  "papel":        { cat: "limpeza", desc: ["higienico","higiênico","toalha","aluminio","alumínio"] },
  "guardanapo":   { cat: "limpeza", desc: [] },

  // ─── Higiene pessoal ───
  "shampoo":      { cat: "higiene", desc: [] },
  "condicionador":{ cat: "higiene", desc: [] },
  "creme dental": { cat: "higiene", desc: [] },
  "pasta de dente":{ cat: "higiene", desc: [] },
  "escova":       { cat: "higiene", desc: ["dental","cabelo"] },
  "desodorante":  { cat: "higiene", desc: ["aerosol","aerossol","roll"] },
  "fralda":       { cat: "higiene", desc: [] },
  "absorvente":   { cat: "higiene", desc: [] },

  // ─── Bebidas ───
  "vinho":        { cat: "bebidas", desc: ["tinto","branco","rose","rosé","seco","suave","argentino","chileno","portugues","português","malbec","cabernet","merlot","sauvignon","carmenere","syrah","tannat","verde"] },
  "cerveja":      { cat: "bebidas", desc: ["pilsen","ipa","lager","sem","com","alcool","álcool","zero","puro","malte"] },
  "refrigerante": { cat: "bebidas", desc: ["zero","diet","light","cola","guarana","guaraná","limao","limão"] },
  "suco":         { cat: "bebidas", desc: ["laranja","uva","abacaxi","manga","natural","integral","caju","maracuja","maracujá"] },
  "agua":         { cat: "bebidas", desc: ["mineral","gas","gás","sem","com"] },
  "água":         { cat: "bebidas", desc: ["mineral","gas","gás","sem","com"] },
  "energetico":   { cat: "bebidas", desc: [] },
  "energético":   { cat: "bebidas", desc: [] },
  "vodka":        { cat: "bebidas", desc: [] },
  "whisky":       { cat: "bebidas", desc: [] },
  "cachaca":      { cat: "bebidas", desc: [] },
  "cachaça":      { cat: "bebidas", desc: [] },

  // ─── Laticínios ───
  "leite":        { cat: "laticinios", desc: ["integral","desnatado","semi","semidesnatado","condensado","po","pó"] },
  "iogurte":      { cat: "laticinios", desc: ["natural","integral","desnatado","grego","morango","frutas"] },
  "queijo":       { cat: "laticinios", desc: ["mussarela","muçarela","muss","prato","minas","parmesao","parmesão","ralado","par","fresco","branco","coalho"] },
  "manteiga":     { cat: "laticinios", desc: ["sem","com","sal"] },
  "margarina":    { cat: "laticinios", desc: [] },
  "requeijao":    { cat: "laticinios", desc: ["cremoso","light"] },
  "requeijão":    { cat: "laticinios", desc: ["cremoso","light"] },
  "creme":        { cat: "laticinios", desc: ["leite","ricota"] },
  "ricota":       { cat: "laticinios", desc: [] },
  "bebida lactea":{ cat: "laticinios", desc: ["zero","integral","morango","chocolate"] },
  "bebida láctea":{ cat: "laticinios", desc: ["zero","integral","morango","chocolate"] },

  // ─── Carnes / Frios ───
  "frango":       { cat: "carnes", desc: ["peito","coxa","sobrecoxa","asa","file","filé","inteiro","passarinho"] },
  "carne":        { cat: "carnes", desc: ["moida","moída","picanha","alcatra","patinho","contrafile","contrafilé"] },
  "linguica":     { cat: "carnes", desc: ["calabresa","toscana","portuguesa"] },
  "linguiça":     { cat: "carnes", desc: ["calabresa","toscana","portuguesa"] },
  "presunto":     { cat: "carnes", desc: ["fatiado","cozido"] },
  "mortadela":    { cat: "carnes", desc: [] },
  "salsicha":     { cat: "carnes", desc: [] },
  "bacon":        { cat: "carnes", desc: [] },
  "peixe":        { cat: "carnes", desc: [] },
  "tilapia":      { cat: "carnes", desc: ["filé","file"] },
  "salmao":       { cat: "carnes", desc: [] },
  "salmão":       { cat: "carnes", desc: [] },
  "cha de dentro":{ cat: "carnes", desc: [] },
  "chã de dentro":{ cat: "carnes", desc: [] },
  "ovo":          { cat: "laticinios", desc: ["branco","vermelho","codorna"] },

  // ─── Hortifruti (sempre genérico, fruta = nome da fruta) ───
  "tomate":       { cat: "hortifruti", desc: ["italiano","cereja"] },
  "cebola":       { cat: "hortifruti", desc: ["roxa","branca"] },
  "alho":         { cat: "hortifruti", desc: [] },
  "batata":       { cat: "hortifruti", desc: ["doce","inglesa","baroa","palha"] },
  "cenoura":      { cat: "hortifruti", desc: [] },
  "banana":       { cat: "hortifruti", desc: ["prata","nanica","pacovan"] },
  "maca":         { cat: "hortifruti", desc: ["verde","vermelha","gala"] },
  "maçã":         { cat: "hortifruti", desc: ["verde","vermelha","gala"] },
  "laranja":      { cat: "hortifruti", desc: ["pera","lima"] },
  "tangerina":    { cat: "hortifruti", desc: [] },
  "limao":        { cat: "hortifruti", desc: ["taiti","siciliano"] },
  "limão":        { cat: "hortifruti", desc: ["taiti","siciliano"] },
  "uva":          { cat: "hortifruti", desc: ["sem","com","semente","verde","rosé","rose","italia","itália"] },
  "abacate":      { cat: "hortifruti", desc: [] },
  "mamao":        { cat: "hortifruti", desc: [] },
  "mamão":        { cat: "hortifruti", desc: [] },
  "manga":        { cat: "hortifruti", desc: ["palmer","tommy"] },
  "abacaxi":      { cat: "hortifruti", desc: [] },
  "melancia":     { cat: "hortifruti", desc: [] },
  "melao":        { cat: "hortifruti", desc: [] },
  "melão":        { cat: "hortifruti", desc: [] },
  "morango":      { cat: "hortifruti", desc: [] },
  "alface":       { cat: "hortifruti", desc: [] },
  "couve":        { cat: "hortifruti", desc: ["flor"] },
  "brocolis":     { cat: "hortifruti", desc: [] },
  "brócolis":     { cat: "hortifruti", desc: [] },
  "pimentao":     { cat: "hortifruti", desc: ["verde","vermelho","amarelo"] },
  "pimentão":     { cat: "hortifruti", desc: ["verde","vermelho","amarelo"] },
  "quiabo":       { cat: "hortifruti", desc: [] },
  "abobrinha":    { cat: "hortifruti", desc: [] },
  "salada":       { cat: "hortifruti", desc: ["verao","verão"] },
  "agriao":       { cat: "hortifruti", desc: [] },
  "agrião":       { cat: "hortifruti", desc: [] },
  "salsinha":     { cat: "hortifruti", desc: [] },
  "salsa":        { cat: "hortifruti", desc: [] },
  "cebolinha":    { cat: "hortifruti", desc: [] },
  "coentro":      { cat: "hortifruti", desc: [] },
  "alecrim":      { cat: "hortifruti", desc: ["desidratado"] },

  // ─── Padaria / Mercearia ───
  "pao":          { cat: "padaria", desc: ["frances","francês","forma","integral"] },
  "pão":          { cat: "padaria", desc: ["frances","francês","forma","integral"] },
  "biscoito":     { cat: "mercearia", desc: ["maisena","cream","cracker","recheado","rosquinha","agua","água","sal"] },
  "bolacha":      { cat: "mercearia", desc: [] },
  "torrada":      { cat: "padaria", desc: [] },
  "bolo":         { cat: "padaria", desc: [] },
  "macarrao":     { cat: "mercearia", desc: ["instantaneo","instantâneo","espaguete","penne","parafuso"] },
  "macarrão":     { cat: "mercearia", desc: ["instantaneo","instantâneo","espaguete","penne","parafuso"] },
  "arroz":        { cat: "mercearia", desc: ["branco","integral","parboilizado"] },
  "feijao":       { cat: "mercearia", desc: ["preto","carioca","fradinho"] },
  "feijão":       { cat: "mercearia", desc: ["preto","carioca","fradinho"] },
  "farinha":      { cat: "mercearia", desc: ["trigo","mandioca","milho","rosca"] },
  "fuba":         { cat: "mercearia", desc: [] },
  "fubá":         { cat: "mercearia", desc: [] },
  "flocao":       { cat: "mercearia", desc: ["milho","arroz"] },
  "flocão":       { cat: "mercearia", desc: ["milho","arroz"] },
  "aveia":        { cat: "mercearia", desc: ["flocos","fino","grosso","grossa"] },
  "azeite":       { cat: "mercearia", desc: ["oliva","extra","virgem"] },
  "oleo":         { cat: "mercearia", desc: ["soja","girassol","milho","canola"] },
  "óleo":         { cat: "mercearia", desc: ["soja","girassol","milho","canola"] },
  "vinagre":      { cat: "mercearia", desc: ["alcool","álcool","maca","maçã","branco"] },
  "sal":          { cat: "mercearia", desc: ["refinado","grosso","rosa"] },
  "acucar":       { cat: "mercearia", desc: ["refinado","cristal","mascavo","demerara"] },
  "açúcar":       { cat: "mercearia", desc: ["refinado","cristal","mascavo","demerara"] },
  "cafe":         { cat: "mercearia", desc: ["po","pó","graos","grãos","capsula","cápsula"] },
  "café":         { cat: "mercearia", desc: ["po","pó","graos","grãos","capsula","cápsula"] },
  "cha":          { cat: "mercearia", desc: ["preto","verde","camomila","mate"] },
  "chá":          { cat: "mercearia", desc: ["preto","verde","camomila","mate"] },
  "achocolatado": { cat: "mercearia", desc: ["po","pó","liquido","líquido"] },
  "chocolate":    { cat: "mercearia", desc: ["po","pó","ao","leite","amargo","branco"] },
  "ketchup":      { cat: "mercearia", desc: [] },
  "maionese":     { cat: "mercearia", desc: [] },
  "mostarda":     { cat: "mercearia", desc: [] },
  "molho":        { cat: "mercearia", desc: ["tomate","barbecue","soja"] },
  "geleia":       { cat: "mercearia", desc: ["morango","damasco"] },
  "tempero":      { cat: "mercearia", desc: ["cebola","alho","completo","verde"] },
  "ervilha":      { cat: "mercearia", desc: [] },
  "milho":        { cat: "mercearia", desc: ["verde"] },
  "atum":         { cat: "mercearia", desc: ["ralado","posta"] },
  "sardinha":     { cat: "mercearia", desc: [] },
  "extrato":      { cat: "mercearia", desc: ["tomate"] },

  // ─── Snacks / Doces ───
  "goma de mascar":{ cat: "mercearia", desc: [] },
  "bala":         { cat: "mercearia", desc: [] },
  "pirulito":     { cat: "mercearia", desc: [] },
  "barra":        { cat: "mercearia", desc: ["cereal","chocolate"] },
  "chips":        { cat: "mercearia", desc: [] },
  "batata palha": { cat: "mercearia", desc: [] },
  "granola":      { cat: "mercearia", desc: [] },
  "cereal":       { cat: "mercearia", desc: ["matinal"] },
  "amendoim":     { cat: "mercearia", desc: ["torrado","salgado"] },
  "castanha":     { cat: "mercearia", desc: ["caju","para","pará"] },
};

const brandsAndNoise = new Set([
  "carrefour","crf","sadia","danone","president","ovomaltine","nestle","nestlé",
  "betania","betânia","heineken","coca","cola","ferrero","nutella","mentos",
  "vitarel","brilux","indaia","indaiá","brilhante","ype","ypê","minuano",
  "pick","ni","par","ralad","muss","fat","tto","arg","chi","fm","cru","pq",
  "min","ag","arg","chi",
]);
const canonicalNames = {
  "agua": "Água",
  "água": "Água",
  "acucar": "Açúcar",
  "açucar": "Açúcar",
  "açúcar": "Açúcar",
  "pao": "Pão",
  "pão": "Pão",
  "pao frances": "Pão Francês",
  "pão francês": "Pão Francês",
  "macarrao": "Macarrão",
  "macarrão": "Macarrão",
  "feijao": "Feijão",
  "feijão": "Feijão",
  "limao": "Limão",
  "limão": "Limão",
  "mamao": "Mamão",
  "mamão": "Mamão",
  "melao": "Melão",
  "melão": "Melão",
  "salmao": "Salmão",
  "salmão": "Salmão",
  "pimentao": "Pimentão",
  "pimentão": "Pimentão",
  "agriao": "Agrião",
  "agrião": "Agrião",
  "fuba": "Fubá",
  "fubá": "Fubá",
  "flocao": "Flocão",
  "flocão": "Flocão",
  "maca": "Maçã",
  "maçã": "Maçã",
  "cafe": "Café",
  "café": "Café",
  "cha": "Chá",
  "chá": "Chá",
  "oleo": "Óleo",
  "óleo": "Óleo",
  "agua sanitaria": "Água Sanitária",
  "água sanitária": "Água Sanitária",
  "ricota": "Ricota",
  "linguica": "Linguiça",
  "linguiça": "Linguiça",
  "requeijao": "Requeijão",
  "requeijão": "Requeijão",
  "cha de dentro": "Chã de Dentro",
  "chã de dentro": "Chã de Dentro",
  "alcool": "Álcool",
  "álcool": "Álcool",
  "bebida lactea": "Bebida Láctea",
  "bebida láctea": "Bebida Láctea",
  "frances": "Francês",
  "francês": "Francês",
  "energetico": "Energético",
  "energético": "Energético",
  "cachaca": "Cachaça",
  "cachaça": "Cachaça",
  "brocolis": "Brócolis",
  "brócolis": "Brócolis",
  "padrao": "Padrão",
  "padrão": "Padrão",
  "muçarela": "Muçarela",
  "mussarela": "Mussarela",
  "parmesao": "Parmesão",
  "parmesão": "Parmesão",
  "instantaneo": "Instantâneo",
  "instantâneo": "Instantâneo",
  "verao": "Verão",
  "verão": "Verão",
  "biodegradavel": "Biodegradável",
  "biodegradável": "Biodegradável",
  "higienico": "Higiênico",
  "higiênico": "Higiênico",
  "aluminio": "Alumínio",
  "alumínio": "Alumínio",
  "portugues": "Português",
  "português": "Português",
  "italia": "Itália",
  "itália": "Itália",
  "rose": "Rosé",
  "rosé": "Rosé",
  "fogao": "Fogão",
  "fogão": "Fogão",
  "po": "Pó",
  "pó": "Pó",
  "graos": "Grãos",
  "grãos": "Grãos",
  "capsula": "Cápsula",
  "cápsula": "Cápsula",
  "maracuja": "Maracujá",
  "maracujá": "Maracujá",
  "guarana": "Guaraná",
  "guaraná": "Guaraná",
  "liquido": "Líquido",
  "líquido": "Líquido",
  "moida": "Moída",
  "moída": "Moída",
  "contrafile": "Contrafilé",
  "contrafilé": "Contrafilé",
  "file": "Filé",
  "filé": "Filé",
  "gas": "Gás",
  "gás": "Gás",
};
// Capitaliza usando mapa canônico (mantém acentos)
const capitalizeCanonical = (word) => {
  if (!word) return word;
  const norm = word.toLowerCase();
  if (canonicalNames[norm]) return canonicalNames[norm];
  return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
};

// Gera nome amigável GENÉRICO a partir de um nome cru de NF
// Estratégia: encontra a palavra-base (ex: "detergente") e opcionalmente
// adiciona 1 descritor relevante (ex: "neutro"). Ignora marca.
const makeFriendlyName = (rawName) => {
  if (!rawName) return "";

  // 1. Aplica sinônimos
  const expanded = expandSynonyms(rawName);
  const normalized = normalize(expanded);

  // 2. Busca primeiro a palavra-base mais longa (ex: "bebida lactea" antes de "bebida")
  const baseKeys = Object.keys(productBases).sort((a, b) => b.length - a.length);
  let foundBase = null;
  let baseInfo = null;
  for (const base of baseKeys) {
    // Verifica se a base aparece como palavra inteira (não dentro de outra)
    const pattern = new RegExp(`(^|\\s)${base.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(\\s|$)`, "i");
    if (pattern.test(normalized)) {
      foundBase = base;
      baseInfo = productBases[base];
      break;
    }
  }

  // 3. Se encontrou base → monta nome com base + 1 descritor opcional
  if (foundBase && baseInfo) {
    const tokens = normalized.split(" ").filter(Boolean);
    // Procura primeiro descritor relevante que apareça (e não seja a própria base)
    const validDescs = baseInfo.desc || [];
    let foundDesc = null;
    for (const t of tokens) {
      if (foundBase.includes(t)) continue;  // já é parte da base
      if (validDescs.some(d => d.toLowerCase() === t.toLowerCase())) {
        foundDesc = t;
        break;
      }
    }

    // Usa nome canônico (com acentos) se existir
    const baseDisplay = foundBase.split(" ").map(capitalizeCanonical).join(" ");
    if (foundDesc) {
      const descDisplay = capitalizeCanonical(foundDesc);
      return `${baseDisplay} ${descDisplay}`;
    }
    return baseDisplay;
  }

  // 4. FALLBACK: se não encontrou nenhuma palavra-base, usa o algoritmo antigo
  // (remove códigos, partículas, marcas, capitaliza)
  const words = normalized.split(" ").filter(w => {
    if (!w || w.length < 2) return false;
    if (friendlyStopwords.has(w.toLowerCase())) return false;
    if (brandsAndNoise.has(w.toLowerCase())) return false;
    if (/^\w{0,4}\d+\w*$/.test(w)) return false;
    if (w.length === 1) return false;
    return true;
  });
  const particles = new Set(["de", "do", "da", "dos", "das", "sem", "com", "para", "em"]);
  let significantCount = 0;
  const result = [];
  for (const w of words) {
    const isParticle = particles.has(w.toLowerCase());
    if (!isParticle) {
      if (significantCount >= 2) break;  // só 2 palavras quando cai no fallback
      significantCount++;
    }
    result.push(isParticle
      ? w.toLowerCase()
      : capitalizeCanonical(w)
    );
  }
  while (result.length > 0 && particles.has(result[0].toLowerCase())) result.shift();
  while (result.length > 0 && particles.has(result[result.length - 1].toLowerCase())) result.pop();
  return result.join(" ") || rawName;  // último fallback: nome cru
};

const guessCategoryFromFriendly = (friendlyName) => {
  if (!friendlyName) return null;
  const norm = normalize(friendlyName);
  const baseKeys = Object.keys(productBases).sort((a, b) => b.length - a.length);
  for (const base of baseKeys) {
    const pattern = new RegExp(`(^|\\s)${base.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(\\s|$)`, "i");
    if (pattern.test(norm)) return productBases[base].cat;
  }
  return null;
};


// ═════════════════════════════════════════════════════════════════════
// PARSER DE TEXTO IMPORTADO (Apple Notes, Google Keep, WhatsApp, etc)
// Cada linha = 1 item potencial.
// Detecta: bullets, números, quantidades, unidades, estado (marcado/desmarcado)
// Usa makeFriendlyName global para normalização (mesma lógica da NF)
// ═════════════════════════════════════════════════════════════════════

// Detecta unidade no texto e retorna { qty, unit, rest }
// Ex: "2 kg arroz" → { qty: "2", unit: "kg", rest: "arroz" }
// Ex: "5 bananas" → { qty: "5", unit: "un", rest: "bananas" }
function extractQtyAndUnit(text) {
  if (!text) return { qty: "1", unit: "un", rest: "" };
  const working = text.trim();
  // Padrões com unidade explícita
  const unitPatterns = [
    { regex: /^(\d+(?:[.,]\d+)?)\s*(kg|kilo|kilos)\b\s*(.*)/i, unit: "kg" },
    { regex: /^(\d+(?:[.,]\d+)?)\s*(g|gr|gramas?)\b\s*(.*)/i, unit: "g" },
    { regex: /^(\d+(?:[.,]\d+)?)\s*(l|litro|litros)\b\s*(.*)/i, unit: "l" },
    { regex: /^(\d+(?:[.,]\d+)?)\s*(ml|mililitros?)\b\s*(.*)/i, unit: "ml" },
    { regex: /^(\d+(?:[.,]\d+)?)\s*(un|unid|unidades?)\b\s*(.*)/i, unit: "un" },
    { regex: /^(\d+(?:[.,]\d+)?)\s*(cx|caixas?)\b\s*(.*)/i, unit: "cx" },
    { regex: /^(\d+(?:[.,]\d+)?)\s*(pct|pacotes?)\b\s*(.*)/i, unit: "pct" },
    { regex: /^(\d+(?:[.,]\d+)?)\s*(dz|duzias?|dúzias?)\b\s*(.*)/i, unit: "dz" },
  ];
  for (const p of unitPatterns) {
    const m = working.match(p.regex);
    if (m) return { qty: m[1].replace(",", "."), unit: p.unit, rest: m[3].trim() };
  }
  // Padrão: "5 bananas" (número solto = un)
  const numFirst = working.match(/^(\d+(?:[.,]\d+)?)\s+(.+)/);
  if (numFirst) return { qty: numFirst[1].replace(",", "."), unit: "un", rest: numFirst[2].trim() };
  // Padrão: "banana x2" / "leite x 3"
  const xPattern = working.match(/^(.+?)\s*[xX×]\s*(\d+)\s*$/);
  if (xPattern) return { qty: xPattern[2], unit: "un", rest: xPattern[1].trim() };
  return { qty: "1", unit: "un", rest: working };
}

// Detecta se uma linha está marcada como concluida no texto original
function detectChecked(line) {
  if (!line) return { checked: false, rest: line };
  const checkedPattern = /^[\s\-•*►→]*(✓|✔|☑|\[\s*[xX✓]\s*\])\s*(.*)/;
  const m = line.match(checkedPattern);
  if (m) return { checked: true, rest: m[2].trim() };
  const uncheckedPattern = /^[\s\-•*►→]*(□|☐|\[\s*\])\s*(.*)/;
  const m2 = line.match(uncheckedPattern);
  if (m2) return { checked: false, rest: m2[2].trim() };
  return { checked: false, rest: line };
}

// Remove bullets, números de lista, e caracteres decorativos do início
function stripBullets(line) {
  if (!line) return "";
  let result = line.replace(/^[\s•\-*►→◦·‣]+/, "");
  result = result.replace(/^(\d+)([.)\-:])\s+/, "");
  return result.trim();
}

// Remove conectores que sobram após extrair quantidade
function stripLeadingConnectors(text) {
  if (!text) return "";
  return text.replace(/^(de|do|da|dos|das)\s+/i, "").trim();
}

// Parser principal: recebe texto e retorna array de itens detectados
// Aplica makeFriendlyName e guessCategoryFromFriendly globais
function parseImportedList(text) {
  if (!text || typeof text !== "string") return [];
  const lines = text.split(/\r?\n/);
  const items = [];

  for (let line of lines) {
    if (!line || !line.trim()) continue;

    // 1. Detecta se está marcado como comprado
    const { checked, rest: afterCheck } = detectChecked(line);

    // 2. Remove bullets e numeração
    let cleaned = stripBullets(afterCheck);
    if (!cleaned) continue;

    // 3. Remove emojis decorativos no início
    cleaned = cleaned.replace(/^[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]+\s*/u, "").trim();
    if (!cleaned) continue;

    // 4. Linhas com 1 caractere só ou só números são ignoradas
    if (cleaned.length < 2 || /^\d+$/.test(cleaned)) continue;

    // 5. Linhas que parecem títulos/seções (terminam em ":") são puladas
    if (cleaned.endsWith(":") && cleaned.length < 40) continue;

    // 6. Extrai quantidade e unidade
    const { qty, unit, rest } = extractQtyAndUnit(cleaned);

    // 7. Remove conectores ("de", "do", "da") que sobraram
    let afterConnector = stripLeadingConnectors(rest);

    // 8. Remove embalagens ("pote de", "pacote", "caixa de", etc)
    afterConnector = stripPackagingPrefix(afterConnector);

    // 9. Remove conectores novamente (caso "pacote de" tenha deixado conector)
    afterConnector = stripLeadingConnectors(afterConnector);

    // 10. Se ficou vazio ou muito curto, pula
    if (!afterConnector || afterConnector.length < 2) continue;

    // 11. Aplica makeFriendlyName GLOBAL (mesma lógica da NF)
    // Resultado: "manteiga" → "Manteiga", "cafe" → "Café", "pedaço de charque" → "Charque"
    const friendlyName = makeFriendlyName(afterConnector) || afterConnector;

    // 12. Categoria pela base ou fallback
    const category = guessCategoryFromFriendly(friendlyName) || guessCategory(afterConnector);

    items.push({
      name: friendlyName,
      qty,
      unit,
      category,
      done: checked,
      _originalLine: line.trim(),
    });
  }

  return items;
}

const LIST_ICONS = ["🛒","🏗️","🏠","🎁","🐾","💊","📚","🌿","🧺","⚽"];
const STORES = [
  { id:"ml", label:"Mercado Livre", short:"Mercado Livre", emoji:"🛍️" },
  { id:"amazon", label:"Amazon", short:"Amazon", emoji:"📦" },
];

// ═════════════════════════════════════════════════════════════════════
// HELPERS
// ═════════════════════════════════════════════════════════════════════
function amazonSearchUrl(name) {
  const tag = AFFILIATE.amazon || "";
  const q = encodeURIComponent(name);
  return tag ? `https://www.amazon.com.br/s?k=${q}&tag=${tag}` : `https://www.amazon.com.br/s?k=${q}`;
}

function mlSearchUrl(name) {
  return `https://lista.mercadolivre.com.br/${encodeURIComponent(name)}`;
}

// Gera token único para link de convite (16 caracteres alfanuméricos)
// Validador de email com regex razoável (não pretende ser perfeito,
// mas pega 99% dos casos errados - melhor que apenas verificar "@")
function isValidEmail(email) {
  if (!email || typeof email !== "string") return false;
  const trimmed = email.trim();
  if (trimmed.length < 5 || trimmed.length > 254) return false;
  // Regex prática: algo@algo.algo (não permite espaços, vírgulas, etc)
  return /^[^\s@,;]+@[^\s@,;]+\.[^\s@,;]{2,}$/.test(trimmed);
}

function generateInviteToken() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // sem 0/O/I/1 (confunde)
  // Usa crypto.getRandomValues para tokens criptograficamente seguros
  // (Math.random NÃO é seguro para tokens de acesso)
  let token = "";
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    const arr = new Uint8Array(16);
    crypto.getRandomValues(arr);
    for (let i = 0; i < 16; i++) {
      token += chars[arr[i] % chars.length];
    }
  } else {
    // Fallback (browsers muito antigos) — não deve acontecer
    for (let i = 0; i < 16; i++) {
      token += chars[Math.floor(Math.random() * chars.length)];
    }
  }
  return token;
}

// ═════════════════════════════════════════════════════════════════════
// LOGO — Listou
// ═════════════════════════════════════════════════════════════════════
// O ícone do app é o "O" com check sage — recortado do nome.
// O wordmark usa Fraunces (serif) com o "o" estilizado como círculo
// contendo um check sage.

function ListouLogo({ size = 32, color = C.graphite, accent = C.sage }) {
  // "O com check" — funciona em qualquer tamanho de 16px a 200px
  return (
    <svg width={size} height={size} viewBox="0 0 60 60">
      <circle cx="30" cy="30" r="22" fill="none" stroke={color} strokeWidth="4"/>
      <path d="M20 30 L27 37 L41 22" fill="none" stroke={accent} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

// Wordmark "Listou" com o "o" estilizado como círculo contendo o check sage.
// É um inline-SVG pra garantir alinhamento perfeito do "o" especial com o resto do texto.
function ListouLockup({ color = C.graphite, accent = C.sage, size = 1 }) {
  // Escala todos os elementos proporcionalmente
  const fontSize = 32 * size;
  const oSize = 11 * size;  // raio do "o" especial
  const oStroke = 2.5 * size;
  return (
    <div style={{ display:"inline-flex", alignItems:"center", fontFamily:"'Fraunces', Georgia, serif", fontWeight:500, fontSize, color, letterSpacing:"-0.5px", lineHeight:1 }}>
      <span>List</span>
      {/* "o" especial: círculo com check sage no lugar da letra */}
      <span style={{ display:"inline-flex", alignItems:"center", justifyContent:"center", width: oSize*2.4, height: oSize*2.4, marginLeft: 1*size, marginRight: 1*size }}>
        <svg width={oSize*2.4} height={oSize*2.4} viewBox="0 0 30 30" style={{ display:"block" }}>
          <circle cx="15" cy="15" r="11" fill="none" stroke={color} strokeWidth={oStroke}/>
          <path d="M10 15 L13.5 18.5 L21 11" fill="none" stroke={accent} strokeWidth={oStroke} strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </span>
      <span>u</span>
    </div>
  );
}

// Aliases para compatibilidade — todos os usos existentes de FeiraLogo/FeiraLockup
// continuam funcionando sem precisar substituir um por um pelo código.
const FeiraLogo = ListouLogo;
const FeiraLockup = ListouLockup;

// ═════════════════════════════════════════════════════════════════════
// AVATAR (círculo com inicial)
// ═════════════════════════════════════════════════════════════════════
function Avatar({ name, email, userId, size = 24, fontSize = 11 }) {
  const bg = avatarColorFor(userId);
  const initial = initialFor(name, email);
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%",
      background: bg, color: "#fff",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize, fontWeight: 600, fontFamily: "'DM Sans',sans-serif",
      flexShrink: 0, border: `2px solid ${C.sand}`
    }}>
      {initial}
    </div>
  );
}

function AvatarStack({ members, max = 3, size = 22 }) {
  const visible = members.slice(0, max);
  const extra = members.length - max;
  return (
    <div style={{ display: "flex", alignItems: "center" }}>
      {visible.map((m, i) => (
        <div key={m.user_id} style={{ marginLeft: i === 0 ? 0 : -7 }}>
          <Avatar name={m.name} email={m.email} userId={m.user_id} size={size} fontSize={10} />
        </div>
      ))}
      {extra > 0 && (
        <div style={{
          marginLeft: -7,
          width: size, height: size, borderRadius: "50%",
          background: C.linen, color: C.stone,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 10, fontWeight: 600, border: `2px solid ${C.sand}`,
          fontFamily: "'DM Sans',sans-serif"
        }}>
          +{extra}
        </div>
      )}
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════
// SHARED STYLES
// ═════════════════════════════════════════════════════════════════════
const inp = {
  padding:"12px 14px", background:C.linen, border:`1px solid ${C.linenDim}`,
  borderRadius:10, color:C.graphite, fontSize:15, outline:"none", boxSizing:"border-box", width:"100%",
  fontFamily:"'DM Sans', sans-serif"
};

// ═════════════════════════════════════════════════════════════════════
// CEP HELPER
// ═════════════════════════════════════════════════════════════════════
async function fetchCep(cepValue) {
  const cleaned = cepValue.replace(/\D/g, "");
  if (cleaned.length !== 8) return null;
  try {
    const res = await fetch(`https://viacep.com.br/ws/${cleaned}/json/`);
    const data = await res.json();
    return data.erro ? null : data;
  } catch { return null; }
}

function formatCep(v) {
  let digits = v.replace(/\D/g, "").slice(0, 8);
  return digits.length > 5 ? digits.slice(0,5) + "-" + digits.slice(5) : digits;
}

// ═════════════════════════════════════════════════════════════════════
// AUTH SCREEN
// ═════════════════════════════════════════════════════════════════════
// ═════════════════════════════════════════════════════════════════════
// NEW PASSWORD SCREEN (recuperação de senha)
// Mostrada quando o usuário clica no link enviado por email
// ═════════════════════════════════════════════════════════════════════
function NewPasswordScreen({ onDone }) {
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const handleSave = async () => {
    if (!password) { setError("Digite a nova senha"); return; }
    if (password.length < 6) { setError("Senha precisa ter pelo menos 6 caracteres"); return; }
    if (password !== passwordConfirm) { setError("As senhas não coincidem"); return; }
    setLoading(true); setError(null);
    try {
      const { error: e } = await supabase.auth.updateUser({ password });
      if (e) throw e;
      setSuccess(true);
      // Após 2s, sinaliza pro App principal voltar pro fluxo normal
      setTimeout(() => { if (onDone) onDone(); }, 2200);
    } catch (e) {
      // Tradução de mensagens comuns do Supabase para PT
      const rawMsg = String(e.message || "");
      const translations = {
        "New password should be different from the old password": "A nova senha precisa ser diferente da anterior",
        "Password should be at least 6 characters": "A senha precisa ter pelo menos 6 caracteres",
        "Password is too weak": "A senha está muito fraca. Use letras, números e símbolos",
        "Auth session missing": "Sua sessão expirou. Solicite um novo link de recuperação",
        "Invalid token": "Link inválido ou expirado. Solicite um novo",
        "Token has expired": "Link expirado. Solicite um novo",
        "User not found": "Conta não encontrada",
      };
      let translated = null;
      for (const [en, pt] of Object.entries(translations)) {
        if (rawMsg.toLowerCase().includes(en.toLowerCase())) {
          translated = pt;
          break;
        }
      }
      setError(translated || "Não foi possível redefinir a senha. Tente solicitar um novo link.");
    }
    setLoading(false);
  };

  return (
    <div style={{ minHeight:"100vh",background:C.sand,display:"flex",alignItems:"center",justifyContent:"center",padding:"20px",fontFamily:"'DM Sans',sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:wght@400;500;600&family=DM+Sans:wght@400;500;600&display=swap');
      `}</style>
      <div style={{ width:"100%",maxWidth:420,background:"#fff",borderRadius:20,padding:"32px 26px",boxShadow:"0 10px 40px rgba(0,0,0,0.06)" }}>
        <div style={{ display:"flex",alignItems:"center",justifyContent:"center",marginBottom:18 }}>
          <ListouLockup />
        </div>

        {success ? (
          <>
            <div style={{ display:"flex",alignItems:"center",justifyContent:"center",marginBottom:14 }}>
              <div style={{ width:60,height:60,borderRadius:"50%",background:`${C.sage}33`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:30 }}>
                ✓
              </div>
            </div>
            <h2 style={{ color:C.graphite,fontSize:22,fontFamily:"'Fraunces',serif",fontWeight:500,textAlign:"center",marginBottom:8,letterSpacing:"-0.3px" }}>
              Senha alterada!
            </h2>
            <p style={{ color:C.stone,fontSize:13,lineHeight:1.5,textAlign:"center",marginBottom:6 }}>
              Sua nova senha já está ativa. Estamos te redirecionando...
            </p>
          </>
        ) : (
          <>
            <h2 style={{ color:C.graphite,fontSize:22,fontFamily:"'Fraunces',serif",fontWeight:500,textAlign:"center",marginBottom:6,letterSpacing:"-0.3px" }}>
              Criar nova senha
            </h2>
            <p style={{ color:C.stone,fontSize:13,lineHeight:1.5,textAlign:"center",marginBottom:24 }}>
              Defina uma nova senha para acessar sua conta.
            </p>

            <div style={{ marginBottom:14 }}>
              <label style={{ display:"block",fontSize:11,color:C.stone,textTransform:"uppercase",letterSpacing:1.2,fontWeight:600,marginBottom:6 }}>
                Nova senha
              </label>
              <input
                type="password"
                value={password}
                onChange={(e)=>setPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                autoFocus
                style={{ width:"100%",padding:"12px",background:"#FAF8F4",border:`1px solid ${C.linenDim}`,borderRadius:11,color:C.graphite,fontSize:15,outline:"none",boxSizing:"border-box" }}
              />
            </div>

            <div style={{ marginBottom:error?6:18 }}>
              <label style={{ display:"block",fontSize:11,color:C.stone,textTransform:"uppercase",letterSpacing:1.2,fontWeight:600,marginBottom:6 }}>
                Confirmar nova senha
              </label>
              <input
                type="password"
                value={passwordConfirm}
                onChange={(e)=>setPasswordConfirm(e.target.value)}
                placeholder="Digite novamente"
                style={{ width:"100%",padding:"12px",background:"#FAF8F4",border:`1px solid ${C.linenDim}`,borderRadius:11,color:C.graphite,fontSize:15,outline:"none",boxSizing:"border-box" }}
                onKeyDown={(e)=>{ if(e.key==="Enter") handleSave(); }}
              />
            </div>

            {error && (
              <p style={{ color:C.danger,fontSize:12,marginBottom:14 }}>
                {error}
              </p>
            )}

            <button
              onClick={handleSave}
              disabled={loading}
              style={{ width:"100%",padding:"14px",background:C.graphite,border:"none",borderRadius:12,color:C.sand,fontWeight:500,cursor:loading?"wait":"pointer",fontSize:15,opacity:loading?0.7:1 }}
            >
              {loading?"Salvando...":"Salvar nova senha"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════
// AUTH SCREEN
// ═════════════════════════════════════════════════════════════════════
function AuthScreen({ pendingInviteToken }) {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [cep, setCep] = useState("");
  const [cepLoading, setCepLoading] = useState(false);
  const [cepInfo, setCepInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [emailSent, setEmailSent] = useState(false);
  // LGPD: aceite dos Termos e Política — obrigatório no signup
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  // Recuperação de senha: estados separados
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetLoading, setResetLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [resetError, setResetError] = useState(null);
  const [resendCountdown, setResendCountdown] = useState(0);  // segundos restantes pra reenviar

  // Efeito: decrementa o contador a cada segundo
  useEffect(() => {
    if (resendCountdown <= 0) return;
    const t = setTimeout(() => setResendCountdown(s => s - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCountdown]);

  // Reinicia contador toda vez que um novo email é enviado
  useEffect(() => {
    if (resetSent) setResendCountdown(60);
  }, [resetSent]);

  const handleSendResetEmail = async () => {
    const trimmed = resetEmail.trim().toLowerCase();
    if (!trimmed) { setResetError("Digite seu email"); return; }
    if (!isValidEmail(trimmed)) { setResetError("Email inválido"); return; }
    setResetLoading(true); setResetError(null);
    try {
      const { error: e } = await supabase.auth.resetPasswordForEmail(trimmed, {
        redirectTo: window.location.origin + window.location.pathname,
      });
      if (e) throw e;
      setResetSent(true);
    } catch (e) {
      setResetError(e.message || "Não foi possível enviar o email. Tente novamente.");
    }
    setResetLoading(false);
  };

  // Reenviar o email de recuperação (mesmo email)
  const handleResend = async () => {
    if (resendCountdown > 0 || resetLoading) return;
    setResetLoading(true);
    try {
      const { error: e } = await supabase.auth.resetPasswordForEmail(resetEmail.trim().toLowerCase(), {
        redirectTo: window.location.origin + window.location.pathname,
      });
      if (e) throw e;
      // Reinicia o contador
      setResendCountdown(60);
    } catch (e) {
      setResetError(e.message || "Não foi possível reenviar. Tente em alguns minutos.");
    }
    setResetLoading(false);
  };

  const closeResetModal = () => {
    setShowResetModal(false);
    setResetEmail("");
    setResetSent(false);
    setResetError(null);
    setResetLoading(false);
    setResendCountdown(0);
  };

  const handleCepChange = async (v) => {
    const formatted = formatCep(v);
    setCep(formatted);
    const digits = formatted.replace(/\D/g, "");
    if (digits.length === 8) {
      setCepLoading(true);
      const info = await fetchCep(digits);
      setCepInfo(info);
      setCepLoading(false);
    } else {
      setCepInfo(null);
    }
  };

  // Traduz mensagens comuns do Supabase para PT-BR
  const translateAuthError = (rawMsg) => {
    const msg = String(rawMsg || "").toLowerCase();
    if (msg.includes("invalid login credentials")) return "Email ou senha incorretos";
    if (msg.includes("email not confirmed")) return "Confirme seu email antes de entrar. Verifique sua caixa de entrada.";
    if (msg.includes("user already registered")) return "Já existe uma conta com esse email. Tente fazer login.";
    if (msg.includes("password should be at least")) return "A senha precisa ter pelo menos 6 caracteres";
    if (msg.includes("password is too weak")) return "Senha muito fraca. Use letras, números e símbolos.";
    if (msg.includes("invalid email")) return "Email inválido";
    if (msg.includes("network") || msg.includes("failed to fetch")) return "Sem conexão. Verifique sua internet.";
    if (msg.includes("rate limit") || msg.includes("too many requests")) return "Muitas tentativas. Aguarde alguns minutos e tente novamente.";
    if (msg.includes("user not found")) return "Conta não encontrada";
    return rawMsg || "Erro inesperado. Tente novamente.";
  };

  const handleSignup = async () => {
    // Normalização: email lowercase + trim, name trim. Evita inconsistências.
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedName = name.trim();

    if (!normalizedEmail || !password || !normalizedName || !cep) { setError("Preencha todos os campos"); return; }
    if (!isValidEmail(normalizedEmail)) { setError("Email inválido"); return; }
    if (password.length < 6) { setError("Senha precisa ter pelo menos 6 caracteres"); return; }
    if (normalizedName.length < 2) { setError("Digite seu nome completo"); return; }
    if (!acceptedTerms) { setError("Você precisa aceitar os Termos e a Política para criar uma conta"); return; }
    setLoading(true); setError(null);
    try {
      const { data, error: signErr } = await supabase.auth.signUp({
        email: normalizedEmail,
        password,
        options: { data: { name: normalizedName } }
      });
      if (signErr) throw signErr;
      if (data.user) {
        // Tenta gravar dados completos no profile (trigger já criou básico).
        // Se falhar (rede, race), tenta uma vez mais — esses dados são importantes
        // (CEP e principalmente terms_accepted_at por compliance LGPD).
        const profilePayload = {
          id: data.user.id,
          name: normalizedName,
          email: normalizedEmail,
          cep,
          city: cepInfo?.localidade || null,
          state: cepInfo?.uf || null,
          street: cepInfo?.logradouro || null,
          neighborhood: cepInfo?.bairro || null,
          // LGPD: registrar momento exato e versão dos termos aceitos
          terms_accepted_at: new Date().toISOString(),
          terms_version_accepted: "v1.0",
        };
        let { error: pErr } = await supabase.from("profiles").upsert(profilePayload);
        if (pErr) {
          console.warn("[signup] upsert do profile falhou, tentando de novo:", pErr);
          // Retry uma vez
          const retry = await supabase.from("profiles").upsert(profilePayload);
          if (retry.error) {
            console.error("[signup] upsert do profile falhou no retry:", retry.error);
            // Não bloqueia o signup — o profile básico já foi criado pelo trigger.
            // O usuário pode atualizar CEP depois nas Configurações.
          }
        }
      }
      if (data.session) window.location.reload();
      else setEmailSent(true);
    } catch (e) { setError(translateAuthError(e.message)); }
    setLoading(false);
  };

  const handleLogin = async () => {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || !password) { setError("Preencha email e senha"); return; }
    if (!isValidEmail(normalizedEmail)) { setError("Email inválido"); return; }
    setLoading(true); setError(null);
    try {
      const { error: loginErr } = await supabase.auth.signInWithPassword({ email: normalizedEmail, password });
      if (loginErr) throw loginErr;
    } catch (e) {
      setError(translateAuthError(e.message));
    }
    setLoading(false);
  };

  const handleOAuth = async (provider) => {
    setError(null);
    try {
      const { error: oerr } = await supabase.auth.signInWithOAuth({
        provider, options: { redirectTo: window.location.origin + window.location.pathname + window.location.search }
      });
      if (oerr) throw oerr;
    } catch (e) { setError(translateAuthError(e.message)); }
  };

  if (emailSent) {
    return (
      <div style={{ minHeight:"100vh",background:C.sand,display:"flex",alignItems:"center",justifyContent:"center",padding:"24px",fontFamily:"'DM Sans',sans-serif" }}>
        <div style={{ maxWidth:380,textAlign:"center" }}>
          <div style={{ display:"flex",alignItems:"center",justifyContent:"center",marginBottom:18 }}>
            <div style={{ width:64,height:64,borderRadius:"50%",background:`${C.sage}33`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:30 }}>
              📧
            </div>
          </div>
          <h2 style={{ fontFamily:"'Fraunces',serif",fontSize:24,fontWeight:500,color:C.graphite,marginBottom:10,letterSpacing:"-0.3px" }}>Confirme seu email</h2>
          <p style={{ color:C.stone,fontSize:14,lineHeight:1.6 }}>
            Enviamos um link de confirmação para<br />
            <strong style={{ color:C.graphite }}>{email.trim().toLowerCase()}</strong>
          </p>
          <p style={{ color:C.stoneSoft,fontSize:12,marginTop:16,lineHeight:1.6 }}>
            Toque no link recebido para ativar sua conta. Depois volte aqui e faça login.
          </p>
          <p style={{ color:C.stoneSoft,fontSize:11,marginTop:14,lineHeight:1.5,fontStyle:"italic" }}>
            Não recebeu? Verifique sua caixa de spam.
          </p>
          <button onClick={()=>{setEmailSent(false);setMode("login");setError(null);}} style={{ marginTop:24,padding:"12px 24px",background:C.graphite,color:C.sand,border:"none",borderRadius:11,fontSize:14,fontWeight:500,cursor:"pointer",fontFamily:"'DM Sans',sans-serif" }}>Voltar para login</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight:"100vh",background:C.sand,fontFamily:"'DM Sans',sans-serif",maxWidth:480,margin:"0 auto",padding:"60px 22px 40px" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:wght@400;500;600&family=DM+Sans:wght@400;500;600&display=swap');
        *{margin:0;padding:0;box-sizing:border-box}
        input::placeholder{color:${C.stoneSoft}}
      `}</style>

      <div style={{ display:"flex",flexDirection:"column",alignItems:"center",marginBottom:36 }}>
        <ListouLockup size={1.3} />
        <p style={{ color:C.stone,fontSize:13,marginTop:14 }}>Listou. Economizou.</p>
      </div>

      {pendingInviteToken && (
        <div style={{ background:`${C.sage}22`,border:`1px solid ${C.sage}55`,borderRadius:11,padding:"12px 14px",marginBottom:20,textAlign:"center" }}>
          <p style={{ color:C.inkSoft,fontSize:13,lineHeight:1.5 }}>
            👋 Você foi convidado para uma lista compartilhada!<br/>
            <strong style={{ color:C.graphite }}>Faça login ou crie conta para aceitar.</strong>
          </p>
        </div>
      )}

      <div style={{ display:"flex",gap:6,marginBottom:24,padding:4,background:C.linen,borderRadius:12 }}>
        <button onClick={()=>{setMode("login");setError(null);setAcceptedTerms(false);}} style={{ flex:1,padding:"10px",borderRadius:9,background:mode==="login"?C.sand:"transparent",color:mode==="login"?C.graphite:C.stone,border:"none",fontWeight:500,fontSize:14,cursor:"pointer",fontFamily:"'DM Sans',sans-serif",boxShadow:mode==="login"?"0 1px 3px rgba(0,0,0,0.06)":"none" }}>Entrar</button>
        <button onClick={()=>{setMode("signup");setError(null);}} style={{ flex:1,padding:"10px",borderRadius:9,background:mode==="signup"?C.sand:"transparent",color:mode==="signup"?C.graphite:C.stone,border:"none",fontWeight:500,fontSize:14,cursor:"pointer",fontFamily:"'DM Sans',sans-serif",boxShadow:mode==="signup"?"0 1px 3px rgba(0,0,0,0.06)":"none" }}>Criar conta</button>
      </div>

      <div style={{ display:"flex",flexDirection:"column",gap:8,marginBottom: mode==="signup" ? 4 : 18 }}>
        <button onClick={()=>handleOAuth("google")} style={{ padding:"12px",background:"#fff",border:`1px solid ${C.linenDim}`,borderRadius:11,color:C.graphite,fontSize:14,fontWeight:500,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:10,fontFamily:"'DM Sans',sans-serif" }}>
          <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
          Continuar com Google
        </button>
      </div>

      {mode === "signup" && (
        <p style={{ color:C.stoneSoft, fontSize:10.5, lineHeight:1.5, textAlign:"center", marginBottom:18, fontFamily:"'DM Sans',sans-serif" }}>
          Ao continuar com Google, você aceita os{" "}
          <a href="https://feira-wheat.vercel.app/termos.html" target="_blank" rel="noopener noreferrer" style={{ color:C.sageDeep, textDecoration:"underline", textUnderlineOffset:2 }}>Termos</a>
          {" "}e a{" "}
          <a href="https://feira-wheat.vercel.app/privacidade.html" target="_blank" rel="noopener noreferrer" style={{ color:C.sageDeep, textDecoration:"underline", textUnderlineOffset:2 }}>Política de Privacidade</a>.
        </p>
      )}

      <div style={{ display:"flex",alignItems:"center",gap:10,margin:"6px 0 18px" }}>
        <div style={{ flex:1,height:1,background:C.linenDim }} />
        <span style={{ color:C.stoneSoft,fontSize:11 }}>ou com email</span>
        <div style={{ flex:1,height:1,background:C.linenDim }} />
      </div>

      <div style={{ display:"flex",flexDirection:"column",gap:10 }}>
        {mode==="signup" && (
          <input style={inp} placeholder="Seu nome" value={name} onChange={e=>setName(e.target.value)} maxLength={60} autoComplete="name" />
        )}
        <input style={inp} placeholder="Email" type="email" value={email} onChange={e=>setEmail(e.target.value)} autoComplete="email" maxLength={120} />
        <input style={inp} placeholder="Senha" type="password" value={password} onChange={e=>setPassword(e.target.value)} autoComplete={mode==="login"?"current-password":"new-password"} maxLength={72} />
        {mode==="signup" && (
          <>
            <input style={inp} placeholder="CEP (00000-000)" value={cep} onChange={e=>handleCepChange(e.target.value)} inputMode="numeric" pattern="[0-9]*" type="tel" maxLength={9} autoComplete="postal-code" />
            {cepLoading && <p style={{ color:C.stoneSoft,fontSize:12,paddingLeft:4 }}>Buscando endereço...</p>}
            {cepInfo && (
              <div style={{ background:`${C.sage}22`,border:`1px solid ${C.sage}55`,borderRadius:9,padding:"10px 12px" }}>
                <p style={{ color:C.inkSoft,fontSize:12,lineHeight:1.5 }}>
                  📍 {cepInfo.logradouro}{cepInfo.bairro?`, ${cepInfo.bairro}`:""}<br />
                  <strong>{cepInfo.localidade} — {cepInfo.uf}</strong>
                </p>
              </div>
            )}
          </>
        )}
      </div>

      {error && (
        <div style={{ background:`${C.danger}15`,border:`1px solid ${C.danger}55`,borderRadius:9,padding:"10px 12px",marginTop:14 }}>
          <p style={{ color:C.danger,fontSize:13 }}>{error}</p>
        </div>
      )}

      {/* LGPD: aceite obrigatório de Termos e Privacidade (só no signup) */}
      {mode === "signup" && (
        <div style={{ display:"flex", alignItems:"flex-start", gap:9, marginTop:16, cursor:"pointer" }} onClick={() => setAcceptedTerms(v => !v)}>
          <div
            role="checkbox"
            aria-checked={acceptedTerms}
            style={{
              width:18, height:18, borderRadius:4,
              background: acceptedTerms ? C.sage : "transparent",
              border: `1.5px solid ${acceptedTerms ? C.sage : C.linenDim}`,
              display:"flex", alignItems:"center", justifyContent:"center",
              flexShrink:0, marginTop:2,
              transition:"all 0.15s ease"
            }}
          >
            {acceptedTerms && (
              <svg width="11" height="11" viewBox="0 0 12 12">
                <path d="M2.5 6 L5 8.5 L9.5 3.5" fill="none" stroke={C.graphite} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            )}
          </div>
          <label style={{ fontSize:12, color:C.stone, lineHeight:1.5, cursor:"pointer", fontFamily:"'DM Sans',sans-serif" }}>
            Li e aceito os{" "}
            <a
              href="https://feira-wheat.vercel.app/termos.html"
              onClick={(e)=>{ e.stopPropagation(); }}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color:C.sageDeep, textDecoration:"underline", textUnderlineOffset:2 }}
            >
              Termos de Uso
            </a>
            {" "}e a{" "}
            <a
              href="https://feira-wheat.vercel.app/privacidade.html"
              onClick={(e)=>{ e.stopPropagation(); }}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color:C.sageDeep, textDecoration:"underline", textUnderlineOffset:2 }}
            >
              Política de Privacidade
            </a>
            .
          </label>
        </div>
      )}

      <button onClick={mode==="login"?handleLogin:handleSignup} disabled={loading} style={{ width:"100%",padding:"14px",background:C.graphite,border:"none",borderRadius:12,color:C.sand,fontWeight:500,cursor:loading?"wait":"pointer",fontSize:15,marginTop:18,fontFamily:"'DM Sans',sans-serif",opacity:loading?0.7:1 }}>
        {loading?"Aguarde...":(mode==="login"?"Entrar":"Criar conta")}
      </button>

      {mode==="login" && (
        <button
          onClick={()=>{setShowResetModal(true); setResetEmail(email); setResetError(null); setResetSent(false);}}
          style={{
            width:"100%", padding:"10px", marginTop:10,
            background:"transparent", border:"none",
            color:C.stone, fontSize:13, cursor:"pointer",
            fontFamily:"'DM Sans',sans-serif",
            textDecoration:"underline", textUnderlineOffset:3
          }}
        >
          Esqueci minha senha
        </button>
      )}

      {/* Modal de recuperação de senha */}
      {showResetModal && (
        <div style={{ position:"fixed",top:0,bottom:0,left:0,right:0,background:"rgba(15,18,24,0.65)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",backdropFilter:"blur(4px)",padding:"0 16px" }} onClick={closeResetModal}>
          <div style={{ background:C.sand,borderRadius:18,width:"100%",maxWidth:420,padding:"24px",boxShadow:"0 10px 40px rgba(0,0,0,0.25)" }} onClick={e=>e.stopPropagation()}>
            {!resetSent ? (
              <>
                <h3 style={{ color:C.graphite,fontSize:22,fontFamily:"'Fraunces',serif",fontWeight:500,letterSpacing:"-0.3px",marginBottom:8 }}>
                  Recuperar senha
                </h3>
                <p style={{ color:C.stone,fontSize:13,lineHeight:1.5,marginBottom:18,fontFamily:"'DM Sans',sans-serif" }}>
                  Digite seu email cadastrado. Vamos te enviar um link para criar uma nova senha.
                </p>
                <input
                  type="email"
                  value={resetEmail}
                  onChange={(e)=>setResetEmail(e.target.value)}
                  placeholder="seu@email.com"
                  autoFocus
                  style={{
                    width:"100%", padding:"12px",
                    background:"#FAF8F4", border:`1px solid ${C.linenDim}`, borderRadius:11,
                    color:C.graphite, fontSize:15, fontFamily:"'DM Sans',sans-serif",
                    outline:"none", marginBottom:resetError?6:14, boxSizing:"border-box"
                  }}
                  onKeyDown={(e)=>{ if(e.key==="Enter") handleSendResetEmail(); }}
                />
                {resetError && (
                  <p style={{ color:C.danger, fontSize:12, marginBottom:14, fontFamily:"'DM Sans',sans-serif" }}>
                    {resetError}
                  </p>
                )}
                <div style={{ display:"flex", gap:8 }}>
                  <button
                    onClick={closeResetModal}
                    disabled={resetLoading}
                    style={{
                      flex:1, padding:"12px",
                      background:C.linen, border:`1px solid ${C.linenDim}`, borderRadius:11,
                      color:C.stone, fontSize:14, cursor:resetLoading?"wait":"pointer",
                      fontFamily:"'DM Sans',sans-serif"
                    }}
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleSendResetEmail}
                    disabled={resetLoading}
                    style={{
                      flex:2, padding:"12px",
                      background:C.graphite, border:"none", borderRadius:11,
                      color:C.sand, fontSize:14, fontWeight:500,
                      cursor:resetLoading?"wait":"pointer",
                      fontFamily:"'DM Sans',sans-serif", opacity:resetLoading?0.7:1
                    }}
                  >
                    {resetLoading?"Enviando...":"Enviar link"}
                  </button>
                </div>
              </>
            ) : (
              <>
                <div style={{ display:"flex", alignItems:"center", justifyContent:"center", marginBottom:14 }}>
                  <div style={{ width:54, height:54, borderRadius:"50%", background:`${C.sage}33`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:26 }}>
                    📧
                  </div>
                </div>
                <h3 style={{ color:C.graphite,fontSize:20,fontFamily:"'Fraunces',serif",fontWeight:500,textAlign:"center",marginBottom:8 }}>
                  Verifique seu email
                </h3>
                <p style={{ color:C.stone,fontSize:13,lineHeight:1.5,textAlign:"center",marginBottom:18,fontFamily:"'DM Sans',sans-serif" }}>
                  Enviamos um link para <strong>{resetEmail}</strong>. Toque nele e crie uma nova senha.
                </p>

                {/* Bloco de reenvio com contador */}
                <div style={{ textAlign:"center", marginBottom:18, fontFamily:"'DM Sans',sans-serif" }}>
                  <p style={{ color:C.stoneSoft,fontSize:11,lineHeight:1.5,marginBottom:6 }}>
                    Não recebeu? Verifique a caixa de spam.
                  </p>
                  {resendCountdown > 0 ? (
                    <p style={{ color:C.stoneSoft,fontSize:11 }}>
                      Reenviar em <strong style={{ color:C.stone }}>{resendCountdown}s</strong>
                    </p>
                  ) : (
                    <button
                      onClick={handleResend}
                      disabled={resetLoading}
                      style={{
                        background:"none", border:"none",
                        color:C.sageDeep, fontSize:12, fontWeight:600,
                        cursor:resetLoading?"wait":"pointer",
                        textDecoration:"underline", textUnderlineOffset:3,
                        padding:0, fontFamily:"'DM Sans',sans-serif"
                      }}
                    >
                      {resetLoading?"Reenviando...":"Reenviar email"}
                    </button>
                  )}
                  {resetError && (
                    <p style={{ color:C.danger,fontSize:11,marginTop:6 }}>{resetError}</p>
                  )}
                </div>

                <button
                  onClick={closeResetModal}
                  style={{
                    width:"100%", padding:"12px",
                    background:C.graphite, border:"none", borderRadius:11,
                    color:C.sand, fontSize:14, fontWeight:500, cursor:"pointer",
                    fontFamily:"'DM Sans',sans-serif"
                  }}
                >
                  Entendi
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════
// MODAL SHELL
// ═════════════════════════════════════════════════════════════════════
function Modal({ onClose, title, children, footer }) {
  // Fix para teclado iOS: ajusta altura disponível quando teclado abre
  // (sem isso, footer fica atrás do teclado no Safari iOS)
  const [keyboardOffset, setKeyboardOffset] = useState(0);

  useEffect(() => {
    if (typeof window === "undefined" || !window.visualViewport) return;
    const handleResize = () => {
      // Diferença entre altura da janela e do viewport visível = altura do teclado
      const offset = window.innerHeight - window.visualViewport.height;
      setKeyboardOffset(offset > 50 ? offset : 0);  // só ajusta se for "grande" (teclado)
    };
    window.visualViewport.addEventListener("resize", handleResize);
    window.visualViewport.addEventListener("scroll", handleResize);
    return () => {
      if (window.visualViewport) {
        window.visualViewport.removeEventListener("resize", handleResize);
        window.visualViewport.removeEventListener("scroll", handleResize);
      }
    };
  }, []);

  return (
    <div style={{ position:"fixed",top:0,bottom:0,left:0,right:0,background:"rgba(15,18,24,0.65)",zIndex:1000,display:"flex",alignItems:"flex-start",justifyContent:"center",backdropFilter:"blur(4px)",padding:"0 12px" }} onClick={onClose}>
      <div style={{ background:C.sand,borderRadius:18,marginTop:"max(24px, env(safe-area-inset-top))",marginBottom:`max(24px, ${keyboardOffset}px, env(safe-area-inset-bottom))`,width:"100%",maxWidth:460,maxHeight:`calc(100% - 48px - ${keyboardOffset}px)`,display:"flex",flexDirection:"column",animation:"slideDown 0.25s ease",boxShadow:"0 10px 40px rgba(0,0,0,0.25)",overflow:"hidden",transition:"max-height 0.2s ease, margin-bottom 0.2s ease" }} onClick={e=>e.stopPropagation()}>
        <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",padding:"18px 20px 14px",borderBottom:`1px solid ${C.linen}`,flexShrink:0 }}>
          <h3 style={{ color:C.graphite,fontSize:19,fontFamily:"'Fraunces',serif",fontWeight:500,letterSpacing:"-0.3px" }}>{title}</h3>
          <button onClick={onClose} style={{ background:"none",border:"none",color:C.stoneSoft,fontSize:20,cursor:"pointer",padding:4 }}>✕</button>
        </div>
        <div style={{ padding:"18px 20px",overflowY:"auto",flex:1,WebkitOverflowScrolling:"touch" }}>{children}</div>
        {footer && (
          <div style={{ padding:"14px 20px 20px",borderTop:`1px solid ${C.linen}`,flexShrink:0,background:C.sand }}>
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════
// CATEGORY PICKER
// ═════════════════════════════════════════════════════════════════════
function CategoryPicker({ current, onChange, onClose }) {
  return (
    <Modal onClose={onClose} title="Categoria">
      <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:8 }}>
        {CATEGORIES.map(c => (
          <button key={c.id} onClick={() => { onChange(c.id); onClose(); }} style={{ padding:"13px",borderRadius:11,background:current===c.id?C.graphite:C.linen,border:`1px solid ${current===c.id?C.graphite:C.linenDim}`,color:current===c.id?C.sand:C.ink,fontSize:13,fontWeight:500,cursor:"pointer",textAlign:"left",display:"flex",alignItems:"center",gap:9,fontFamily:"'DM Sans',sans-serif" }}>
            <span style={{ fontSize:18 }}>{c.emoji}</span> {c.label}
          </button>
        ))}
      </div>
    </Modal>
  );
}

// ═════════════════════════════════════════════════════════════════════
// SHARE MODAL — gerenciar membros e convidar
// ═════════════════════════════════════════════════════════════════════
function ShareModal({ list, currentUserId, onClose }) {
  const [members, setMembers] = useState([]);
  const [invites, setInvites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("members"); // members, invite_email, invite_link

  // Convite por email
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("editor");
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteMessage, setInviteMessage] = useState(null);

  // Convite por link
  const [linkRole, setLinkRole] = useState("editor");
  const [generatedLink, setGeneratedLink] = useState(null);
  const [linkCopied, setLinkCopied] = useState(false);

  const myRole = members.find(m => m.user_id === currentUserId)?.role;
  const isOwner = myRole === "owner";

  const loadMembers = async () => {
    setLoading(true);
    // Busca members + dados de profile (name, email)
    const { data: mems } = await supabase
      .from("list_members")
      .select("user_id, role, joined_at")
      .eq("list_id", list.id);

    if (mems && mems.length > 0) {
      const userIds = mems.map(m => m.user_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, name, email")
        .in("id", userIds);

      const enriched = mems.map(m => {
        const p = profiles?.find(pf => pf.id === m.user_id);
        return { ...m, name: p?.name || "", email: p?.email || "" };
      });
      setMembers(enriched);
    }

    // Busca convites pendentes (não aceitos)
    const { data: invs } = await supabase
      .from("list_invites")
      .select("id, email, token, role, expires_at, accepted_at, created_at")
      .eq("list_id", list.id)
      .is("accepted_at", null);
    setInvites(invs || []);

    setLoading(false);
  };

  useEffect(() => { loadMembers(); }, [list.id]);

  const handleInviteByEmail = async () => {
    const e = inviteEmail.trim().toLowerCase();
    if (!e) {
      setInviteMessage({ type: "error", text: "Digite o email da pessoa" });
      return;
    }
    if (!isValidEmail(e)) {
      setInviteMessage({ type: "error", text: "Email inválido. Confira se está escrito corretamente." });
      return;
    }
    // Não pode convidar a si mesmo (busca email atual via auth)
    const { data: { user } } = await supabase.auth.getUser();
    if (user?.email && e === user.email.toLowerCase()) {
      setInviteMessage({ type: "error", text: "Você não pode se convidar." });
      return;
    }
    setInviteLoading(true); setInviteMessage(null);

    // Verifica se já é membro
    const { data: existingProfile } = await supabase
      .from("profiles")
      .select("id, name")
      .eq("email", e)
      .maybeSingle();

    if (existingProfile) {
      const alreadyMember = members.some(m => m.user_id === existingProfile.id);
      if (alreadyMember) {
        setInviteMessage({ type: "error", text: "Esta pessoa já é membro desta lista" });
        setInviteLoading(false);
        return;
      }
      // Adiciona direto como membro
      const { error: errInsert } = await supabase
        .from("list_members")
        .insert({ list_id: list.id, user_id: existingProfile.id, role: inviteRole, invited_by: currentUserId });
      if (errInsert) {
        setInviteMessage({ type: "error", text: "Erro ao adicionar: " + errInsert.message });
      } else {
        setInviteMessage({ type: "success", text: `${existingProfile.name || e} foi adicionado(a) como ${roleLabel(inviteRole)}!` });
        setInviteEmail("");
        loadMembers();
      }
    } else {
      // Pessoa não tem conta — cria convite pendente por email
      const { error: errInvite } = await supabase
        .from("list_invites")
        .insert({ list_id: list.id, email: e, role: inviteRole, invited_by: currentUserId });
      if (errInvite) {
        setInviteMessage({ type: "error", text: "Erro: " + errInvite.message });
      } else {
        setInviteMessage({ type: "success", text: `Convite enviado para ${e}. Quando ela criar conta no Listou com este email, será adicionada automaticamente.` });
        setInviteEmail("");
        loadMembers();
      }
    }
    setInviteLoading(false);
  };

  const handleGenerateLink = async () => {
    setInviteLoading(true);
    const token = generateInviteToken();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24h
    const { error } = await supabase
      .from("list_invites")
      .insert({ list_id: list.id, token, role: linkRole, expires_at: expiresAt, invited_by: currentUserId });

    if (error) {
      setInviteMessage({ type: "error", text: "Erro: " + error.message });
    } else {
      const baseUrl = window.location.origin + window.location.pathname;
      const link = `${baseUrl}?invite=${token}`;
      setGeneratedLink(link);
      loadMembers();
    }
    setInviteLoading(false);
  };

  const handleCopyLink = () => {
    if (!generatedLink) return;
    navigator.clipboard.writeText(generatedLink);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
  };

  const handleChangeRole = async (userId, newRole) => {
    await supabase
      .from("list_members")
      .update({ role: newRole })
      .eq("list_id", list.id)
      .eq("user_id", userId);
    loadMembers();
  };

  const handleRemoveMember = async (userId, isMe = false) => {
    const msg = isMe ? "Tem certeza que deseja sair desta lista?" : "Remover este membro da lista?";
    if (!window.confirm(msg)) return;
    await supabase
      .from("list_members")
      .delete()
      .eq("list_id", list.id)
      .eq("user_id", userId);
    if (isMe) onClose();
    else loadMembers();
  };

  const handleCancelInvite = async (inviteId) => {
    if (!window.confirm("Cancelar este convite?")) return;
    await supabase.from("list_invites").delete().eq("id", inviteId);
    loadMembers();
  };

  return (
    <Modal onClose={onClose} title={`Compartilhar "${list.name}"`}>
      {/* Tabs */}
      <div style={{ display:"flex",gap:6,marginBottom:18,padding:4,background:C.linen,borderRadius:11 }}>
        <button onClick={()=>setActiveTab("members")} style={{ flex:1,padding:"8px",borderRadius:8,background:activeTab==="members"?C.sand:"transparent",color:activeTab==="members"?C.graphite:C.stone,border:"none",fontSize:12,fontWeight:500,cursor:"pointer",fontFamily:"'DM Sans',sans-serif" }}>
          👥 Membros ({members.length})
        </button>
        {isOwner && (
          <>
            <button onClick={()=>setActiveTab("invite_email")} style={{ flex:1,padding:"8px",borderRadius:8,background:activeTab==="invite_email"?C.sand:"transparent",color:activeTab==="invite_email"?C.graphite:C.stone,border:"none",fontSize:12,fontWeight:500,cursor:"pointer",fontFamily:"'DM Sans',sans-serif" }}>
              ✉️ Email
            </button>
            <button onClick={()=>setActiveTab("invite_link")} style={{ flex:1,padding:"8px",borderRadius:8,background:activeTab==="invite_link"?C.sand:"transparent",color:activeTab==="invite_link"?C.graphite:C.stone,border:"none",fontSize:12,fontWeight:500,cursor:"pointer",fontFamily:"'DM Sans',sans-serif" }}>
              🔗 Link
            </button>
          </>
        )}
      </div>

      {/* TAB: MEMBROS */}
      {activeTab === "members" && (
        <div>
          {loading ? (
            <p style={{ color:C.stoneSoft,fontSize:13,textAlign:"center",padding:"20px" }}>Carregando...</p>
          ) : (
            <>
              {/* ═══ EMPTY STATE #5: lista nunca compartilhada (só você) ═══ */}
              {/* Aparece quando há 1 membro (você) e 0 convites pendentes — incentiva o compartilhamento */}
              {members.length === 1 && invites.length === 0 && isOwner && (
                <div style={{ background:`${C.sage}15`, border:`1px solid ${C.sage}33`, borderRadius:13, padding:"14px 16px", marginBottom:14 }}>
                  <p style={{ color:C.graphite, fontSize:13, fontWeight:500, marginBottom:6 }}>
                    👋 Que tal compartilhar?
                  </p>
                  <p style={{ color:C.stone, fontSize:12, lineHeight:1.55 }}>
                    Convide alguém da sua família ou amigos pra construírem a lista juntos. As alterações aparecem em tempo real pra todos.
                  </p>
                  <div style={{ display:"flex", gap:8, marginTop:12 }}>
                    <button
                      onClick={()=>setActiveTab("invite_email")}
                      style={{
                        background:C.graphite, color:C.sand,
                        border:"none", borderRadius:9,
                        padding:"8px 13px", fontSize:12, fontWeight:500,
                        cursor:"pointer", fontFamily:"'DM Sans',sans-serif", flex:1
                      }}
                    >
                      ✉️ Por email
                    </button>
                    <button
                      onClick={()=>setActiveTab("invite_link")}
                      style={{
                        background:"transparent", color:C.graphite,
                        border:`1px solid ${C.linenDim}`, borderRadius:9,
                        padding:"8px 13px", fontSize:12,
                        cursor:"pointer", fontFamily:"'DM Sans',sans-serif", flex:1
                      }}
                    >
                      🔗 Por link
                    </button>
                  </div>
                </div>
              )}

              {members.map(m => (
                <div key={m.user_id} style={{ display:"flex",alignItems:"center",gap:11,padding:"10px 0",borderBottom:`1px solid ${C.linen}` }}>
                  <Avatar name={m.name} email={m.email} userId={m.user_id} size={36} fontSize={14} />
                  <div style={{ flex:1,minWidth:0 }}>
                    <p style={{ color:C.graphite,fontSize:14,fontWeight:500,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",fontFamily:"'DM Sans',sans-serif" }}>
                      {m.name || m.email}{m.user_id === currentUserId ? " (você)" : ""}
                    </p>
                    <p style={{ color:C.stoneSoft,fontSize:11 }}>{m.email}</p>
                  </div>
                  {isOwner && m.user_id !== currentUserId ? (
                    <select
                      value={m.role}
                      onChange={e=>handleChangeRole(m.user_id, e.target.value)}
                      style={{ padding:"5px 8px",fontSize:11,background:C.linen,border:`1px solid ${C.linenDim}`,borderRadius:7,color:C.ink,fontFamily:"'DM Sans',sans-serif",cursor:"pointer" }}
                    >
                      <option value="owner">👑 Dono</option>
                      <option value="editor">✏️ Editor</option>
                      <option value="viewer">👀 Viewer</option>
                    </select>
                  ) : (
                    <span style={{ fontSize:11,color:C.stone,padding:"5px 8px",background:C.linen,borderRadius:7 }}>
                      {m.role === "owner" ? "👑 Dono" : m.role === "editor" ? "✏️ Editor" : "👀 Viewer"}
                    </span>
                  )}
                  {(isOwner || m.user_id === currentUserId) && (
                    <button onClick={()=>handleRemoveMember(m.user_id, m.user_id === currentUserId)} style={{ background:"none",border:"none",color:C.stoneSoft,fontSize:14,cursor:"pointer",padding:4 }} title={m.user_id === currentUserId ? "Sair da lista" : "Remover membro"}>
                      {m.user_id === currentUserId ? "🚪" : "✕"}
                    </button>
                  )}
                </div>
              ))}

              {/* Convites pendentes */}
              {invites.length > 0 && (
                <>
                  <p style={{ color:C.stone,fontSize:10,textTransform:"uppercase",letterSpacing:1.5,marginTop:18,marginBottom:8 }}>Convites pendentes</p>
                  {invites.map(inv => (
                    <div key={inv.id} style={{ display:"flex",alignItems:"center",gap:11,padding:"10px 0",borderBottom:`1px solid ${C.linen}` }}>
                      <div style={{ width:36,height:36,borderRadius:"50%",background:C.linen,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16 }}>
                        {inv.email ? "✉️" : "🔗"}
                      </div>
                      <div style={{ flex:1,minWidth:0 }}>
                        <p style={{ color:C.graphite,fontSize:13,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",fontFamily:"'DM Sans',sans-serif" }}>
                          {inv.email || `Link: ${inv.token.slice(0, 8)}...`}
                        </p>
                        <p style={{ color:C.stoneSoft,fontSize:11 }}>
                          {roleLabel(inv.role)} · {inv.expires_at ? `expira em ${formatExpiresIn(inv.expires_at)}` : "aguardando aceite"}
                        </p>
                      </div>
                      {isOwner && (
                        <button onClick={()=>handleCancelInvite(inv.id)} style={{ background:"none",border:"none",color:C.stoneSoft,fontSize:14,cursor:"pointer",padding:4 }}>✕</button>
                      )}
                    </div>
                  ))}
                </>
              )}
            </>
          )}
        </div>
      )}

      {/* TAB: CONVITE POR EMAIL */}
      {activeTab === "invite_email" && isOwner && (
        <div>
          <p style={{ color:C.inkSoft,fontSize:13,marginBottom:14,lineHeight:1.5 }}>
            Envie um email para compartilhar sua lista.
          </p>
          <p style={{ color:C.stone,fontSize:11,marginBottom:6,textTransform:"uppercase",letterSpacing:1 }}>Email</p>
          <input
            style={inp}
            placeholder="email@exemplo.com"
            value={inviteEmail}
            onChange={e=>setInviteEmail(e.target.value)}
            type="email"
            autoFocus
          />

          <p style={{ color:C.stone,fontSize:11,marginTop:14,marginBottom:6,textTransform:"uppercase",letterSpacing:1 }}>Permissão</p>
          <div style={{ display:"flex",flexDirection:"column",gap:6 }}>
            <RoleOption value="editor" current={inviteRole} onChange={setInviteRole} title="✏️ Editor" desc="Adicionar, marcar como comprado e editar itens" />
            <RoleOption value="viewer" current={inviteRole} onChange={setInviteRole} title="👀 Visualizador" desc="Apenas ver a lista, sem fazer alterações" />
            <RoleOption value="owner" current={inviteRole} onChange={setInviteRole} title="👑 Dono" desc="Tudo, incluindo gerenciar membros e excluir lista" />
          </div>

          {inviteMessage && (
            <div style={{
              background: inviteMessage.type === "error" ? `${C.danger}15` : `${C.sage}22`,
              border: `1px solid ${inviteMessage.type === "error" ? C.danger : C.sage}55`,
              borderRadius:9, padding:"10px 12px", marginTop:14
            }}>
              <p style={{ color: inviteMessage.type === "error" ? C.danger : C.inkSoft, fontSize:13,lineHeight:1.5 }}>{inviteMessage.text}</p>
            </div>
          )}

          <button
            onClick={handleInviteByEmail}
            disabled={inviteLoading}
            style={{ width:"100%",padding:"13px",background:C.graphite,border:"none",borderRadius:11,color:C.sand,fontWeight:500,cursor:inviteLoading?"wait":"pointer",fontSize:14,marginTop:16,fontFamily:"'DM Sans',sans-serif",opacity:inviteLoading?0.7:1 }}
          >
            {inviteLoading ? "Aguarde..." : "Enviar convite"}
          </button>
        </div>
      )}

      {/* TAB: CONVITE POR LINK */}
      {activeTab === "invite_link" && isOwner && (
        <div>
          <p style={{ color:C.inkSoft,fontSize:13,marginBottom:14,lineHeight:1.5 }}>
            Gere um link para compartilhar sua lista.
          </p>

          <p style={{ color:C.stone,fontSize:11,marginBottom:6,textTransform:"uppercase",letterSpacing:1 }}>Permissão</p>
          <div style={{ display:"flex",flexDirection:"column",gap:6 }}>
            <RoleOption value="editor" current={linkRole} onChange={setLinkRole} title="✏️ Editor" desc="Adicionar, marcar como comprado e editar itens" />
            <RoleOption value="viewer" current={linkRole} onChange={setLinkRole} title="👀 Visualizador" desc="Apenas ver a lista, sem fazer alterações" />
          </div>

          {!generatedLink ? (
            <button
              onClick={handleGenerateLink}
              disabled={inviteLoading}
              style={{ width:"100%",padding:"13px",background:C.graphite,border:"none",borderRadius:11,color:C.sand,fontWeight:500,cursor:inviteLoading?"wait":"pointer",fontSize:14,marginTop:16,fontFamily:"'DM Sans',sans-serif",opacity:inviteLoading?0.7:1 }}
            >
              {inviteLoading ? "Gerando..." : "🔗 Gerar link de convite"}
            </button>
          ) : (
            <div style={{ marginTop:16 }}>
              <p style={{ color:C.sageDeep,fontSize:12,fontWeight:600,marginBottom:8 }}>✓ Link gerado! Válido por 24 horas.</p>
              <div style={{ background:C.linen,border:`1px solid ${C.linenDim}`,borderRadius:9,padding:"12px",fontSize:11,color:C.ink,wordBreak:"break-all",fontFamily:"monospace",marginBottom:10 }}>
                {generatedLink}
              </div>
              <button
                onClick={handleCopyLink}
                style={{ width:"100%",padding:"12px",background:linkCopied?C.sage:C.graphite,border:"none",borderRadius:10,color:linkCopied?C.graphite:C.sand,fontWeight:600,cursor:"pointer",fontSize:13,fontFamily:"'DM Sans',sans-serif" }}
              >
                {linkCopied ? "✓ Link copiado!" : "📋 Copiar link"}
              </button>
              <button
                onClick={()=>setGeneratedLink(null)}
                style={{ width:"100%",padding:"10px",background:"transparent",border:"none",color:C.stone,fontSize:12,cursor:"pointer",marginTop:6,fontFamily:"'DM Sans',sans-serif" }}
              >
                Gerar outro link
              </button>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}

function RoleOption({ value, current, onChange, title, desc }) {
  const selected = current === value;
  return (
    <button
      onClick={()=>onChange(value)}
      style={{
        padding:"10px 12px",borderRadius:9,
        background:selected?`${C.sage}22`:C.linen,
        border:`1px solid ${selected?C.sage:C.linenDim}`,
        textAlign:"left",cursor:"pointer",fontFamily:"'DM Sans',sans-serif",width:"100%"
      }}
    >
      <p style={{ color:C.graphite,fontSize:13,fontWeight:500 }}>{title}</p>
      <p style={{ color:C.stone,fontSize:11,marginTop:2,lineHeight:1.4 }}>{desc}</p>
    </button>
  );
}

function roleLabel(role) {
  return role === "owner" ? "Dono" : role === "editor" ? "Editor" : "Visualizador";
}

function formatExpiresIn(iso) {
  const ms = new Date(iso) - new Date();
  if (ms <= 0) return "expirado";
  const hours = Math.floor(ms / (1000 * 60 * 60));
  if (hours < 1) return `${Math.floor(ms / (1000 * 60))} min`;
  return `${hours}h`;
}

// ═════════════════════════════════════════════════════════════════════
// ACCEPT INVITE SCREEN — quando alguém abre o link de convite
// ═════════════════════════════════════════════════════════════════════
function AcceptInviteScreen({ token, currentUserId, onAccepted, onCancel }) {
  const [loading, setLoading] = useState(true);
  const [invite, setInvite] = useState(null);
  const [list, setList] = useState(null);
  const [error, setError] = useState(null);
  const [accepting, setAccepting] = useState(false);

  useEffect(() => {
    loadInvite();
  }, [token]);

  const loadInvite = async () => {
    setLoading(true); setError(null);
    const { data: inv } = await supabase
      .from("list_invites")
      .select("*")
      .eq("token", token)
      .maybeSingle();

    if (!inv) {
      setError("Convite não encontrado ou já utilizado");
      setLoading(false);
      return;
    }
    if (inv.accepted_at) {
      setError("Este convite já foi utilizado");
      setLoading(false);
      return;
    }
    if (inv.expires_at && new Date(inv.expires_at) < new Date()) {
      setError("Este convite expirou");
      setLoading(false);
      return;
    }

    setInvite(inv);

    const { data: l } = await supabase
      .from("lists")
      .select("id, name, icon")
      .eq("id", inv.list_id)
      .maybeSingle();
    setList(l);

    setLoading(false);
  };

  const handleAccept = async () => {
    setAccepting(true);
    // Verifica se já é membro
    const { data: existing } = await supabase
      .from("list_members")
      .select("id")
      .eq("list_id", invite.list_id)
      .eq("user_id", currentUserId)
      .maybeSingle();

    if (!existing) {
      const { error: errInsert } = await supabase
        .from("list_members")
        .insert({ list_id: invite.list_id, user_id: currentUserId, role: invite.role, invited_by: invite.invited_by });
      if (errInsert) {
        setError("Erro ao aceitar: " + errInsert.message);
        setAccepting(false);
        return;
      }
    }

    // Marca convite como aceito
    await supabase
      .from("list_invites")
      .update({ accepted_at: new Date().toISOString(), accepted_by: currentUserId })
      .eq("id", invite.id);

    onAccepted(invite.list_id);
  };

  if (loading) {
    return (
      <div style={{ minHeight:"100vh",background:C.sand,display:"flex",alignItems:"center",justifyContent:"center" }}>
        <div style={{ width:40,height:40,border:`3px solid ${C.linenDim}`,borderTop:`3px solid ${C.sage}`,borderRadius:"50%",animation:"spin 0.8s linear infinite" }} />
      </div>
    );
  }

  return (
    <div style={{ minHeight:"100vh",background:C.sand,fontFamily:"'DM Sans',sans-serif",maxWidth:480,margin:"0 auto",padding:"60px 22px 40px",textAlign:"center" }}>
      <ListouLogo size={48} />
      <h2 style={{ fontFamily:"'Fraunces',serif",fontSize:24,fontWeight:500,color:C.graphite,marginTop:24,marginBottom:14 }}>Convite</h2>

      {error ? (
        // ═══ EMPTY STATE #10: convite inválido/expirado/usado ═══
        // Detecta tipo de erro pra mostrar ícone e mensagem adequados
        <>
          <div style={{ textAlign:"center", marginBottom:18 }}>
            <div style={{ fontSize:46, marginBottom:14, opacity:0.85 }}>
              {error.includes("expirou") ? "⏰" :
               error.includes("já foi utilizado") ? "✓" :
               "🔗"}
            </div>
            <h3 style={{ fontFamily:"'Fraunces',serif", fontSize:20, fontWeight:500, color:C.graphite, marginBottom:8, letterSpacing:"-0.3px" }}>
              {error.includes("expirou") ? "Convite expirado" :
               error.includes("já foi utilizado") ? "Convite já usado" :
               "Convite inválido"}
            </h3>
            <p style={{ color:C.stone, fontSize:13, lineHeight:1.55, marginBottom:6 }}>
              {error.includes("expirou") ?
                "Este convite passou do prazo de 24 horas." :
               error.includes("já foi utilizado") ?
                "Este convite já foi aceito por alguém." :
                "Este convite não foi encontrado ou pode ter sido cancelado."}
            </p>
            <p style={{ color:C.stoneSoft, fontSize:12, lineHeight:1.5, marginTop:14 }}>
              Peça pra pessoa que te convidou enviar um novo link.
            </p>
          </div>
          <button onClick={onCancel} style={{ width:"100%", padding:"13px 24px",background:C.graphite,color:C.sand,border:"none",borderRadius:11,fontSize:14,fontWeight:500,cursor:"pointer",fontFamily:"'DM Sans',sans-serif" }}>
            Voltar para o app
          </button>
        </>
      ) : (
        <>
          <p style={{ color:C.inkSoft,fontSize:14,lineHeight:1.6,marginBottom:20 }}>
            Você foi convidado para participar da lista:
          </p>
          <div style={{ background:C.linen,borderRadius:14,padding:"20px",marginBottom:20 }}>
            <div style={{ fontSize:36,marginBottom:8 }}>{list?.icon || "🛒"}</div>
            <h3 style={{ fontFamily:"'Fraunces',serif",fontSize:20,fontWeight:500,color:C.graphite,marginBottom:6 }}>
              {list?.name || "Lista compartilhada"}
            </h3>
            <p style={{ color:C.stone,fontSize:12 }}>
              Permissão: <strong>{roleLabel(invite.role)}</strong>
            </p>
          </div>

          <div style={{ display:"flex",gap:8 }}>
            <button onClick={onCancel} style={{ flex:1,padding:"13px",background:C.linen,border:`1px solid ${C.linenDim}`,borderRadius:11,color:C.stone,cursor:"pointer",fontSize:14,fontFamily:"'DM Sans',sans-serif" }}>
              Recusar
            </button>
            <button onClick={handleAccept} disabled={accepting} style={{ flex:2,padding:"13px",background:C.graphite,border:"none",borderRadius:11,color:C.sand,fontWeight:500,cursor:accepting?"wait":"pointer",fontSize:15,fontFamily:"'DM Sans',sans-serif",opacity:accepting?0.7:1 }}>
              {accepting ? "Aguarde..." : "Aceitar e entrar"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════
// ITEM DETAIL MODAL
// ═════════════════════════════════════════════════════════════════════
function ItemDetailModal({ item, enabledStores, onClose, onMarkPurchased, onUpdateItem, onMergeItems, canEdit, existingItems = [] }) {
  const activeStores = STORES.filter(s => enabledStores.includes(s.id));
  const [tab, setTab] = useState(activeStores[0]?.id || "ml");

  const [storePrice, setStorePrice] = useState("");
  const [storeError, setStoreError] = useState(null);

  // Edição de campos do item (nome, quantidade, unidade)
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(item.name || "");
  const [editQty, setEditQty] = useState(String(item.qty || "1"));
  const [editUnit, setEditUnit] = useState(item.unit || "un");
  const [editError, setEditError] = useState(null);

  const startEdit = () => {
    setEditName(item.name || "");
    setEditQty(String(item.qty || "1"));
    setEditUnit(item.unit || "un");
    setEditError(null);
    setIsEditing(true);
  };

  const cancelEdit = () => {
    setIsEditing(false);
    setEditError(null);
  };

  // Modal de confirmação quando edição gera duplicata
  // editConflict: { existing, sameUnit, mergedQty }
  const [editConflict, setEditConflict] = useState(null);

  // Normaliza um nome pra comparação (lowercase, sem acentos, trim)
  const normalizeForCompare = (s) =>
    (s || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();

  // Soma quantidades, mantendo formato (inteiro vs decimal)
  const sumQuantities = (q1, q2) => {
    const n1 = parseFloat(String(q1).replace(",", ".")) || 0;
    const n2 = parseFloat(String(q2).replace(",", ".")) || 0;
    const total = n1 + n2;
    if (Number.isInteger(n1) && Number.isInteger(n2)) return String(total);
    return total.toFixed(3).replace(/\.?0+$/, "");
  };

  const saveEdit = () => {
    const trimmedName = editName.trim();
    if (!trimmedName) {
      setEditError("O nome não pode ficar vazio");
      return;
    }
    if (trimmedName.length < 2) {
      setEditError("O nome precisa ter pelo menos 2 caracteres");
      return;
    }
    if (trimmedName.length > 80) {
      setEditError("Nome muito longo (máx 80 caracteres)");
      return;
    }
    // Verifica se o nome tem pelo menos uma letra (não pode ser só números/símbolos)
    if (!/[a-záàâãéèêíïóôõöúçñA-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ]/i.test(trimmedName)) {
      setEditError("O nome precisa ter pelo menos uma letra");
      return;
    }
    const newUnit = editUnit.trim() || "un";

    // Detecta se a edição cria duplicata com outro item da lista
    // (mesmo nome normalizado, exclui o próprio item, só itens não comprados)
    const normalized = normalizeForCompare(trimmedName);
    const conflict = (existingItems || []).find(it =>
      it.id !== item.id &&
      !it.done &&
      normalizeForCompare(it.name) === normalized
    );

    if (conflict) {
      // Achou outro item com mesmo nome → mostra modal de confirmação
      const sameUnit = (conflict.unit || "un") === newUnit;
      setEditConflict({
        existing: conflict,
        sameUnit,
        mergedQty: sameUnit ? sumQuantities(conflict.qty, editQty.trim() || "1") : null,
      });
      return;
    }

    // Sem conflito → segue normal
    const updates = {
      name: trimmedName,
      qty: editQty.trim() || "1",
      unit: newUnit,
    };
    if (onUpdateItem) onUpdateItem(updates);
    setIsEditing(false);
  };

  // Quando usuário confirma mescla (unidades iguais)
  const handleMergeConfirm = async () => {
    if (!editConflict || !editConflict.sameUnit || !onMergeItems) return;
    // Pede ao pai pra fazer: atualizar qty do item existente + deletar o atual
    await onMergeItems({
      keepId: editConflict.existing.id,
      keepName: editConflict.existing.name,  // preserva nome do item que fica
      removeId: item.id,
      newQty: editConflict.mergedQty,
    });
    // Fecha tudo
    setEditConflict(null);
    setIsEditing(false);
    onClose();
  };

  const formatBRL = (v) => {
    const digits = v.replace(/\D/g, "");
    if (!digits) return "";
    const num = parseInt(digits, 10) / 100;
    return num.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const handleSearchOnly = (productUrl) => {
    try { window.open(productUrl, "_blank", "noopener,noreferrer"); } catch {}
    onClose();
  };

  const handleMarkAndOpen = (productUrl, storeId) => {
    try { window.open(productUrl, "_blank", "noopener,noreferrer"); } catch {}
    if (canEdit) onMarkPurchased(storeId, null);
    onClose();
  };

  const handleStoreSubmit = () => {
    const cleaned = storePrice.replace(/\./g, "").replace(",", ".");
    const num = parseFloat(cleaned);
    if (isNaN(num) || num <= 0) { setStoreError("Digite um valor válido"); return; }
    onMarkPurchased("store", num);
    onClose();
  };

  const tabs = [
    ...activeStores.map(s => ({ id: s.id, label: s.short, emoji: s.emoji })),
    { id: "store", label: "Loja", emoji: "🏪" }
  ];

  let footer;
  if (isEditing) {
    // Durante edição, os botões ficam dentro do form, não no footer
    footer = null;
  } else if (tab === "store" && canEdit) {
    footer = (
      <div style={{ display:"flex",gap:8 }}>
        <button onClick={onClose} style={{ flex:1,padding:"13px",background:C.linen,border:`1px solid ${C.linenDim}`,borderRadius:11,color:C.stone,cursor:"pointer",fontSize:14,fontFamily:"'DM Sans',sans-serif" }}>Voltar</button>
        <button onClick={handleStoreSubmit} style={{ flex:2,padding:"13px",background:C.graphite,border:"none",borderRadius:11,color:C.sand,fontWeight:500,cursor:"pointer",fontSize:15,fontFamily:"'DM Sans',sans-serif" }}>Marcar como comprado</button>
      </div>
    );
  } else {
    footer = (
      <button onClick={onClose} style={{ width:"100%",padding:"13px",background:C.linen,border:`1px solid ${C.linenDim}`,borderRadius:11,color:C.stone,cursor:"pointer",fontSize:14,fontFamily:"'DM Sans',sans-serif" }}>
        Voltar
      </button>
    );
  }

  // Título do modal: nome do item + botão de editar (se canEdit)
  const titleNode = (
    <div style={{ display:"flex", alignItems:"center", gap:8, minWidth:0, flex:1 }}>
      <span style={{ overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
        {item.name}
      </span>
      {canEdit && !isEditing && (
        <button
          onClick={startEdit}
          title="Editar item"
          style={{
            background:C.linen, border:`1px solid ${C.linenDim}`, borderRadius:8,
            width:30, height:30, fontSize:13, cursor:"pointer",
            display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0,
            color:C.stone
          }}
        >
          ✏️
        </button>
      )}
    </div>
  );

  return (
    <>
    <Modal onClose={onClose} title={titleNode} footer={footer}>
      {/* Formulário de edição (substitui o conteúdo principal quando ativo) */}
      {isEditing ? (
        <div>
          <div style={{ marginBottom:14 }}>
            <label style={{ display:"block", fontSize:11, color:C.stone, textTransform:"uppercase", letterSpacing:1.2, fontWeight:600, marginBottom:6 }}>
              Nome do item
            </label>
            <input
              type="text"
              value={editName}
              onChange={(e)=>setEditName(e.target.value)}
              maxLength={80}
              autoFocus
              style={{
                width:"100%", padding:"11px 12px",
                background:"#FAF8F4", border:`1px solid ${C.linenDim}`, borderRadius:10,
                color:C.graphite, fontSize:15, fontFamily:"'DM Sans',sans-serif",
                outline:"none"
              }}
              onFocus={(e)=>e.target.style.borderColor = C.sage}
              onBlur={(e)=>e.target.style.borderColor = C.linenDim}
            />
          </div>

          <div style={{ display:"flex", gap:10, marginBottom:14 }}>
            <div style={{ flex:1 }}>
              <label style={{ display:"block", fontSize:11, color:C.stone, textTransform:"uppercase", letterSpacing:1.2, fontWeight:600, marginBottom:6 }}>
                Quantidade
              </label>
              <input
                type="text"
                inputMode="decimal"
                value={editQty}
                onChange={(e)=>setEditQty(e.target.value)}
                style={{
                  width:"100%", padding:"11px 12px",
                  background:"#FAF8F4", border:`1px solid ${C.linenDim}`, borderRadius:10,
                  color:C.graphite, fontSize:15, fontFamily:"'DM Sans',sans-serif",
                  outline:"none"
                }}
              />
            </div>
            <div style={{ flex:1 }}>
              <label style={{ display:"block", fontSize:11, color:C.stone, textTransform:"uppercase", letterSpacing:1.2, fontWeight:600, marginBottom:6 }}>
                Unidade
              </label>
              <select
                value={editUnit}
                onChange={(e)=>setEditUnit(e.target.value)}
                style={{
                  width:"100%", padding:"11px 12px",
                  background:"#FAF8F4", border:`1px solid ${C.linenDim}`, borderRadius:10,
                  color:C.graphite, fontSize:15, fontFamily:"'DM Sans',sans-serif",
                  outline:"none", cursor:"pointer"
                }}
              >
                <option value="un">un (unidade)</option>
                <option value="kg">kg (quilograma)</option>
                <option value="g">g (grama)</option>
                <option value="l">l (litro)</option>
                <option value="ml">ml (mililitro)</option>
                <option value="cx">cx (caixa)</option>
                <option value="pct">pct (pacote)</option>
                <option value="dz">dz (dúzia)</option>
              </select>
            </div>
          </div>

          {editError && (
            <p style={{ color:C.danger, fontSize:12, marginBottom:12, fontFamily:"'DM Sans',sans-serif" }}>
              {editError}
            </p>
          )}

          <div style={{ display:"flex", gap:8 }}>
            <button
              onClick={cancelEdit}
              style={{
                flex:1, padding:"12px",
                background:C.linen, border:`1px solid ${C.linenDim}`, borderRadius:11,
                color:C.stone, fontSize:14, cursor:"pointer",
                fontFamily:"'DM Sans',sans-serif"
              }}
            >
              Cancelar
            </button>
            <button
              onClick={saveEdit}
              style={{
                flex:2, padding:"12px",
                background:C.graphite, border:"none", borderRadius:11,
                color:C.sand, fontSize:14, fontWeight:500, cursor:"pointer",
                fontFamily:"'DM Sans',sans-serif"
              }}
            >
              Salvar alterações
            </button>
          </div>
        </div>
      ) : (
      <>
      <div style={{ display:"flex",gap:6,marginBottom:18 }}>
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={()=>setTab(t.id)}
            style={{
              flex:1, padding:"11px 6px", borderRadius:10,
              background: tab===t.id ? C.graphite : C.linen,
              border:`1px solid ${tab===t.id ? C.graphite : C.linenDim}`,
              color: tab===t.id ? C.sand : C.ink,
              fontSize:12, fontWeight:500, cursor:"pointer",
              fontFamily:"'DM Sans',sans-serif",
              display:"flex", flexDirection:"column", alignItems:"center", gap:3
            }}
          >
            <span style={{ fontSize:18 }}>{t.emoji}</span>
            <span style={{ fontSize:11 }}>{t.label}</span>
          </button>
        ))}
      </div>

      {tab === "store" && (
        <div>
          {!canEdit && (
            <div style={{ background:`${C.terracota}15`,border:`1px solid ${C.terracota}55`,borderRadius:9,padding:"10px 12px",marginBottom:14 }}>
              <p style={{ color:C.terracota,fontSize:13 }}>Você não tem permissão para editar esta lista.</p>
            </div>
          )}
          <p style={{ color:C.inkSoft,fontSize:13,marginBottom:14,lineHeight:1.5 }}>
            Digite quanto você pagou por este item na loja física.
          </p>
          <p style={{ color:C.stone,fontSize:11,marginBottom:6,textTransform:"uppercase",letterSpacing:1 }}>Valor pago (R$)</p>
          <input
            style={{ ...inp, fontSize:22, fontWeight:500, fontFamily:"'Fraunces',serif", opacity: canEdit ? 1 : 0.5 }}
            placeholder="0,00"
            value={storePrice}
            onChange={e => canEdit && setStorePrice(formatBRL(e.target.value))}
            inputMode="numeric" pattern="[0-9]*" type="tel"
            disabled={!canEdit}
            autoFocus={canEdit}
          />
          {storeError && (
            <div style={{ background:`${C.danger}15`,border:`1px solid ${C.danger}55`,borderRadius:9,padding:"10px 12px",marginTop:12 }}>
              <p style={{ color:C.danger,fontSize:13 }}>{storeError}</p>
            </div>
          )}
        </div>
      )}

      {tab === "amazon" && (
        <div>
          <div style={{ background:C.linen,borderRadius:14,border:`1px solid ${C.linenDim}`,padding:"18px",textAlign:"center",marginBottom:12 }}>
            <div style={{ fontSize:42, marginBottom:8 }}>📦</div>
            <h4 style={{ fontFamily:"'Fraunces',serif",fontSize:18,fontWeight:500,color:C.graphite,marginBottom:6 }}>Buscar na Amazon</h4>
            <p style={{ color:C.inkSoft,fontSize:13,lineHeight:1.5,marginBottom:14 }}>
              Veja todas as opções para <strong>{item.name}</strong> direto no site da Amazon.
            </p>
            <button
              onClick={()=>handleSearchOnly(amazonSearchUrl(item.name))}
              style={{ width:"100%", padding:"13px", borderRadius:10, fontWeight:600, fontSize:14, background:C.sage, color:C.graphite, border:"none", cursor:"pointer", fontFamily:"'DM Sans',sans-serif", marginBottom:canEdit?8:0 }}
            >
              🔍 Buscar na Amazon
            </button>
            {canEdit && (
              <button
                onClick={()=>handleMarkAndOpen(amazonSearchUrl(item.name), "amazon")}
                style={{ width:"100%", padding:"11px", borderRadius:10, fontWeight:500, fontSize:13, background:"transparent", color:C.stone, border:`1px solid ${C.linenDim}`, cursor:"pointer", fontFamily:"'DM Sans',sans-serif" }}
              >
                ✓ Buscar e marcar como comprado
              </button>
            )}
          </div>
        </div>
      )}

      {tab === "ml" && (
        <div>
          <div style={{ background:C.linen,borderRadius:14,border:`1px solid ${C.linenDim}`,padding:"18px",textAlign:"center",marginBottom:12 }}>
            <div style={{ fontSize:42, marginBottom:8 }}>🛍️</div>
            <h4 style={{ fontFamily:"'Fraunces',serif",fontSize:18,fontWeight:500,color:C.graphite,marginBottom:6 }}>Buscar no Mercado Livre</h4>
            <p style={{ color:C.inkSoft,fontSize:13,lineHeight:1.5,marginBottom:14 }}>
              Veja todas as opções para <strong>{item.name}</strong> direto no site.
            </p>
            <button
              onClick={()=>handleSearchOnly(mlSearchUrl(item.name))}
              style={{ width:"100%", padding:"13px", borderRadius:10, fontWeight:600, fontSize:14, background:C.sage, color:C.graphite, border:"none", cursor:"pointer", fontFamily:"'DM Sans',sans-serif", marginBottom:canEdit?8:0 }}
            >
              🔍 Buscar no Mercado Livre
            </button>
            {canEdit && (
              <button
                onClick={()=>handleMarkAndOpen(mlSearchUrl(item.name), "ml")}
                style={{ width:"100%", padding:"11px", borderRadius:10, fontWeight:500, fontSize:13, background:"transparent", color:C.stone, border:`1px solid ${C.linenDim}`, cursor:"pointer", fontFamily:"'DM Sans',sans-serif" }}
              >
                ✓ Buscar e marcar como comprado
              </button>
            )}
          </div>
        </div>
      )}
      </>
      )}
    </Modal>

    {/* Modal de confirmação quando edição gera duplicata */}
    {editConflict && (
      <div
        style={{ position:"fixed",top:0,bottom:0,left:0,right:0,background:"rgba(15,18,24,0.65)",zIndex:1100,display:"flex",alignItems:"center",justifyContent:"center",backdropFilter:"blur(4px)",padding:"0 16px" }}
        onClick={()=>setEditConflict(null)}
      >
        <div
          style={{ background:C.sand,borderRadius:18,width:"100%",maxWidth:380,padding:"22px 22px 18px",boxShadow:"0 10px 40px rgba(0,0,0,0.25)" }}
          onClick={e=>e.stopPropagation()}
        >
          <div style={{ display:"flex",alignItems:"center",justifyContent:"center",marginBottom:12 }}>
            <div style={{ width:48,height:48,borderRadius:"50%",background:`${C.sage}33`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22 }}>
              ⚠️
            </div>
          </div>

          {editConflict.sameUnit ? (
            // Cenário 1: Unidades iguais → oferece juntar
            <>
              <h3 style={{ color:C.graphite,fontSize:18,fontFamily:"'Fraunces',serif",fontWeight:500,textAlign:"center",marginBottom:6,letterSpacing:"-0.3px" }}>
                Já existe esse item na lista
              </h3>
              <p style={{ color:C.stone,fontSize:13,lineHeight:1.5,textAlign:"center",marginBottom:18,fontFamily:"'DM Sans',sans-serif" }}>
                Você já tem <strong style={{ color:C.graphite }}>{editConflict.existing.name}</strong>{" "}
                <span style={{ color:C.stoneSoft }}>({editConflict.existing.qty} {editConflict.existing.unit})</span>.
              </p>

              <button
                onClick={handleMergeConfirm}
                style={{
                  width:"100%", padding:"13px", marginBottom:8,
                  background:C.sage, border:"none", borderRadius:11,
                  color:C.graphite, fontSize:14, fontWeight:600, cursor:"pointer",
                  fontFamily:"'DM Sans',sans-serif"
                }}
              >
                ➕ Juntar os dois ({editConflict.mergedQty} {editConflict.existing.unit})
              </button>

              <button
                onClick={()=>setEditConflict(null)}
                style={{
                  width:"100%", padding:"11px",
                  background:"transparent", border:`1px solid ${C.linenDim}`, borderRadius:11,
                  color:C.stone, fontSize:13, fontWeight:500, cursor:"pointer",
                  fontFamily:"'DM Sans',sans-serif"
                }}
              >
                Cancelar edição
              </button>
            </>
          ) : (
            // Cenário 2: Unidades diferentes → aviso, sem juntar
            <>
              <h3 style={{ color:C.graphite,fontSize:18,fontFamily:"'Fraunces',serif",fontWeight:500,textAlign:"center",marginBottom:6,letterSpacing:"-0.3px" }}>
                Mesmo nome, unidade diferente
              </h3>
              <p style={{ color:C.stone,fontSize:13,lineHeight:1.5,textAlign:"center",marginBottom:6,fontFamily:"'DM Sans',sans-serif" }}>
                Você já tem <strong style={{ color:C.graphite }}>{editConflict.existing.name}</strong>{" "}
                <span style={{ color:C.stoneSoft }}>({editConflict.existing.qty} {editConflict.existing.unit})</span>.
              </p>
              <p style={{ color:C.stoneSoft,fontSize:12,lineHeight:1.5,textAlign:"center",marginBottom:18,fontFamily:"'DM Sans',sans-serif" }}>
                Não posso juntar automaticamente porque misturar unidades diferentes ({editConflict.existing.unit} e {editUnit}) pode causar confusão. Ajuste as unidades pra ficarem iguais e tente de novo.
              </p>

              <button
                onClick={()=>setEditConflict(null)}
                style={{
                  width:"100%", padding:"12px",
                  background:C.graphite, border:"none", borderRadius:11,
                  color:C.sand, fontSize:14, fontWeight:500, cursor:"pointer",
                  fontFamily:"'DM Sans',sans-serif"
                }}
              >
                Entendi
              </button>
            </>
          )}
        </div>
      </div>
    )}
    </>
  );
}

// ═════════════════════════════════════════════════════════════════════
// ITEM ROW
// ═════════════════════════════════════════════════════════════════════
function ItemRow({ item, onToggle, onOpen, onCategoryChange, onDelete, canEdit, priceHint }) {
  const [showCatPicker, setShowCatPicker] = useState(false);
  const cat = CATEGORIES.find(c => c.id === item.category) || CATEGORIES[9];

  return (
    <>
      <div
        style={{
          display:"flex",alignItems:"center",gap:11,padding:"13px 13px",
          background:item.done?C.linen:"#FAF8F4",
          borderRadius:14,marginBottom:8,
          border:`1px solid ${item.done?C.linenDim:C.linen}`,
          opacity:item.done?0.7:1,transition:"all 0.2s",cursor:"pointer"
        }}
        onClick={onOpen}
      >
        <button
          onClick={(e)=>{ e.stopPropagation(); if (canEdit) onToggle(); }}
          disabled={!canEdit}
          style={{
            width:26,height:26,borderRadius:7,flexShrink:0,
            background:item.done?C.sage:"transparent",
            border:`1.5px solid ${item.done?C.sage:C.stoneSoft}`,
            cursor:canEdit?"pointer":"not-allowed",fontSize:13,display:"flex",alignItems:"center",justifyContent:"center",
            color:C.graphite,fontWeight:700,transition:"all 0.2s",opacity:canEdit?1:0.5
          }}
        >{item.done?"✓":""}</button>

        <div style={{ flex:1,minWidth:0 }}>
          <p style={{ fontWeight:500,fontSize:15,color:item.done?C.stone:C.graphite,textDecoration:item.done?"line-through":"none",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",fontFamily:"'DM Sans',sans-serif" }}>{item.name}</p>
          <p style={{ color:C.stoneSoft,fontSize:11,marginTop:1 }}>
            {item.qty} {item.unit}
            {item.done && item.bought_at ? ` · ✓ ${item.bought_at === "store" ? "Loja" : STORES.find(s=>s.id===item.bought_at)?.short}` : ""}
            {!item.done && priceHint && priceHint.avg > 0 ? (
              <span style={{ color:C.sageDeep, marginLeft:4 }}>
                · ~R$ {priceHint.avg.toFixed(2).replace(".",",")}/{priceHint.unit || "un"}
              </span>
            ) : ""}
          </p>
        </div>

        <button
          onClick={(e)=>{ e.stopPropagation(); if (canEdit) setShowCatPicker(true); }}
          disabled={!canEdit}
          title="Categoria"
          style={{
            background:C.linen,border:`1px solid ${C.linenDim}`,borderRadius:8,
            width:34,height:34,fontSize:16,cursor:canEdit?"pointer":"default",
            display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0
          }}
        >{cat.emoji}</button>

        {canEdit && (
          <button
            onClick={(e)=>{ e.stopPropagation(); onDelete(); }}
            style={{ background:"none",border:"none",color:C.stoneSoft,fontSize:14,cursor:"pointer",padding:"0 2px" }}
          >✕</button>
        )}
      </div>

      {showCatPicker && <CategoryPicker current={item.category} onChange={onCategoryChange} onClose={()=>setShowCatPicker(false)} />}
    </>
  );
}

// ═════════════════════════════════════════════════════════════════════
// ADD ITEM MODAL
// ═════════════════════════════════════════════════════════════════════
function AddItemModal({ onAdd, onClose, existingItems = [], onIncrementItem, onUpdateRawItem, initialMode = "manual" }) {
  const [name, setName] = useState("");
  const [qty, setQty] = useState("1");
  const [unit, setUnit] = useState("un");
  const [note, setNote] = useState("");
  const [category, setCategory] = useState(null);
  const [showCatPicker, setShowCatPicker] = useState(false);
  // Modal de confirmação quando detecta item duplicado
  const [duplicateItem, setDuplicateItem] = useState(null);

  // ─── IMPORTAÇÃO DE TEXTO ─────────────────────────────────────────
  const [mode, setMode] = useState(initialMode);  // "manual" | "import"
  const [importText, setImportText] = useState("");
  // Cada item do preview: { name, qty, unit, category, done, _selected }
  // _selected = se vai ser importado (checkbox lateral)
  const [importPreview, setImportPreview] = useState([]);
  const [importStep, setImportStep] = useState("input");  // "input" | "preview"

  const handleParse = () => {
    if (!importText.trim()) return;
    const parsed = parseImportedList(importText);

    // Detecta duplicatas com itens existentes na lista
    // Para cada item parsed, busca match (nome normalizado + unidade igual)
    // Se achar, adiciona _duplicateOf com referência ao item da lista
    const normalizeForCompare = (s) =>
      (s || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .trim();

    const enriched = parsed.map(p => {
      const normName = normalizeForCompare(p.name);
      const existing = (existingItems || []).find(it =>
        !it.done &&
        normalizeForCompare(it.name) === normName &&
        (it.unit || "un") === p.unit
      );
      return {
        ...p,
        _selected: true,
        _duplicateOf: existing || null,  // referência ao item já na lista (ou null)
      };
    });

    setImportPreview(enriched);
    setImportStep("preview");
  };

  const togglePreviewSelected = (idx) => {
    setImportPreview(prev => prev.map((it, i) =>
      i === idx ? { ...it, _selected: !it._selected } : it
    ));
  };

  const togglePreviewDone = (idx) => {
    setImportPreview(prev => prev.map((it, i) =>
      i === idx ? { ...it, done: !it.done } : it
    ));
  };

  const updatePreviewName = (idx, newName) => {
    setImportPreview(prev => prev.map((it, i) =>
      i === idx ? { ...it, name: newName } : it
    ));
  };

  // Soma quantidades, mantendo formato (inteiro vs decimal)
  const sumQty = (q1, q2) => {
    const n1 = parseFloat(String(q1).replace(",", ".")) || 0;
    const n2 = parseFloat(String(q2).replace(",", ".")) || 0;
    const total = n1 + n2;
    if (Number.isInteger(n1) && Number.isInteger(n2)) return String(total);
    return total.toFixed(3).replace(/\.?0+$/, "");
  };

  const handleConfirmImport = async () => {
    const toImport = importPreview.filter(it => it._selected && it.name.trim());
    if (toImport.length === 0) return;

    for (const it of toImport) {
      if (it._duplicateOf) {
        // É duplicata → soma quantidade no item existente
        // Usa onUpdateRawItem (não fecha modal) em vez de onIncrementItem
        const newQty = sumQty(it._duplicateOf.qty, it.qty);
        if (onUpdateRawItem) {
          await onUpdateRawItem(it._duplicateOf.id, { qty: newQty });
        }
      } else {
        // É item novo → adiciona normalmente
        await onAdd({
          name: it.name.trim(),
          qty: it.qty,
          unit: it.unit,
          category: it.category,
          note: "",
          done: it.done,
        });
      }
    }
    onClose();
  };

  const selectedCount = importPreview.filter(it => it._selected).length;
  const duplicateCount = importPreview.filter(it => it._selected && it._duplicateOf).length;
  const newCount = selectedCount - duplicateCount;

  const effectiveCategory = category || (name.trim() ? guessCategory(name.trim()) : "outros");
  const catObj = CATEGORIES.find(c => c.id === effectiveCategory) || CATEGORIES[9];
  const isSuggested = !category && name.trim();

  // Normaliza um nome pra comparação (lowercase, sem acentos, trim)
  const normalizeForCompare = (s) =>
    (s || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();

  const handle = () => {
    const trimmedName = name.trim();
    if (!trimmedName) return;

    // Detecta duplicata exata (case insensitive, sem acentos)
    // Só procura em itens ainda não comprados (done=false)
    // E só considera duplicata se a UNIDADE também for igual
    // (ex: "Banana 2 un" + "Banana 0,5 kg" = não é duplicata, é compra diferente)
    const normalized = normalizeForCompare(trimmedName);
    const duplicate = (existingItems || []).find(it =>
      !it.done &&
      normalizeForCompare(it.name) === normalized &&
      (it.unit || "un") === unit
    );

    if (duplicate) {
      // Mostra modal de confirmação em vez de adicionar direto
      setDuplicateItem(duplicate);
      return;
    }

    onAdd({ name: trimmedName, qty, unit, category: effectiveCategory, note });
    onClose();
  };

  // Calcula nova quantidade somando a quantidade atual + a digitada agora
  const calculateIncrementedQty = (existing) => {
    const existingQty = parseFloat(String(existing.qty).replace(",", ".")) || 0;
    const addingQty = parseFloat(String(qty).replace(",", ".")) || 0;
    const total = existingQty + addingQty;
    // Se ambos são inteiros, mantém inteiro; senão, mostra com 3 decimais (kg, etc)
    if (Number.isInteger(existingQty) && Number.isInteger(addingQty)) {
      return String(total);
    }
    return total.toFixed(3).replace(/\.?0+$/, "");
  };

  const handleIncrement = () => {
    if (!duplicateItem || !onIncrementItem) return;
    const newQty = calculateIncrementedQty(duplicateItem);
    onIncrementItem(duplicateItem, newQty);
    // onIncrementItem já fecha o modal (chama setShowAdd(false))
  };

  const handleAddAnyway = () => {
    // Usuário escolheu adicionar como item separado mesmo assim
    onAdd({ name: name.trim(), qty, unit, category: effectiveCategory, note });
    onClose();
  };

  return (
    <>
      <Modal
        onClose={onClose}
        title="Novo item"
        footer={
          mode === "manual" ? (
            <div style={{ display:"flex",gap:8 }}>
              <button onClick={onClose} style={{ flex:1,padding:"13px",background:C.linen,border:`1px solid ${C.linenDim}`,borderRadius:11,color:C.stone,cursor:"pointer",fontSize:14,fontFamily:"'DM Sans',sans-serif" }}>Cancelar</button>
              <button onClick={handle} style={{ flex:2,padding:"13px",background:C.graphite,border:"none",borderRadius:11,color:C.sand,fontWeight:500,cursor:"pointer",fontSize:15,fontFamily:"'DM Sans',sans-serif" }}>Adicionar</button>
            </div>
          ) : importStep === "input" ? (
            <div style={{ display:"flex",gap:8 }}>
              <button onClick={onClose} style={{ flex:1,padding:"13px",background:C.linen,border:`1px solid ${C.linenDim}`,borderRadius:11,color:C.stone,cursor:"pointer",fontSize:14,fontFamily:"'DM Sans',sans-serif" }}>Cancelar</button>
              <button
                onClick={handleParse}
                disabled={!importText.trim()}
                style={{ flex:2,padding:"13px",background:C.graphite,border:"none",borderRadius:11,color:C.sand,fontWeight:500,cursor:importText.trim()?"pointer":"not-allowed",fontSize:15,fontFamily:"'DM Sans',sans-serif",opacity:importText.trim()?1:0.5 }}
              >
                Detectar itens
              </button>
            </div>
          ) : (
            <div style={{ display:"flex",gap:8 }}>
              <button onClick={()=>setImportStep("input")} style={{ flex:1,padding:"13px",background:C.linen,border:`1px solid ${C.linenDim}`,borderRadius:11,color:C.stone,cursor:"pointer",fontSize:14,fontFamily:"'DM Sans',sans-serif" }}>Voltar</button>
              <button
                onClick={handleConfirmImport}
                disabled={selectedCount === 0}
                style={{ flex:2,padding:"13px",background:C.graphite,border:"none",borderRadius:11,color:C.sand,fontWeight:500,cursor:selectedCount>0?"pointer":"not-allowed",fontSize:15,fontFamily:"'DM Sans',sans-serif",opacity:selectedCount>0?1:0.5 }}
              >
                Importar {selectedCount} {selectedCount === 1 ? "item" : "itens"}
              </button>
            </div>
          )
        }
      >
        {/* Tabs: Manual vs Importar */}
        <div style={{ display:"flex",gap:4,background:C.linen,padding:3,borderRadius:11,marginBottom:14 }}>
          <button
            onClick={()=>setMode("manual")}
            style={{
              flex:1, padding:"9px 6px", borderRadius:9, border:"none",
              background: mode === "manual" ? C.sand : "transparent",
              color: mode === "manual" ? C.graphite : C.stone,
              fontSize:13, fontWeight: mode === "manual" ? 600 : 500,
              cursor:"pointer", fontFamily:"'DM Sans',sans-serif",
              boxShadow: mode === "manual" ? "0 1px 3px rgba(0,0,0,0.06)" : "none"
            }}
          >
            Manual
          </button>
          <button
            onClick={()=>setMode("import")}
            style={{
              flex:1, padding:"9px 6px", borderRadius:9, border:"none",
              background: mode === "import" ? C.sand : "transparent",
              color: mode === "import" ? C.graphite : C.stone,
              fontSize:13, fontWeight: mode === "import" ? 600 : 500,
              cursor:"pointer", fontFamily:"'DM Sans',sans-serif",
              boxShadow: mode === "import" ? "0 1px 3px rgba(0,0,0,0.06)" : "none"
            }}
          >
            Importar de texto
          </button>
        </div>

        {mode === "manual" ? (
        <div style={{ display:"flex",flexDirection:"column",gap:9 }}>
          <input style={inp} placeholder="Nome do item" value={name} onChange={e=>setName(e.target.value)} autoFocus onKeyDown={e=>e.key==="Enter"&&handle()} maxLength={80} />

          {name.trim() && (
            <button
              onClick={()=>setShowCatPicker(true)}
              style={{
                display:"flex",alignItems:"center",gap:10,padding:"10px 12px",
                background:`${C.sage}22`,border:`1px solid ${C.sage}55`,borderRadius:9,
                cursor:"pointer",textAlign:"left",fontFamily:"'DM Sans',sans-serif",width:"100%"
              }}
            >
              <span style={{ fontSize:18 }}>{catObj.emoji}</span>
              <div style={{ flex:1 }}>
                <p style={{ color:C.stoneSoft,fontSize:10,textTransform:"uppercase",letterSpacing:1,marginBottom:2 }}>
                  {isSuggested ? "Categoria sugerida" : "Categoria"}
                </p>
                <p style={{ color:C.inkSoft,fontSize:13,fontWeight:500 }}>{catObj.label}</p>
              </div>
              <span style={{ color:C.stone,fontSize:11 }}>Alterar →</span>
            </button>
          )}

          <div style={{ display:"flex",gap:7 }}>
            <input style={{ ...inp,width:"30%" }} placeholder="Qtd" value={qty} onChange={e=>setQty(e.target.value)} inputMode="numeric" />
            <select style={{ ...inp,flex:1 }} value={unit} onChange={e=>setUnit(e.target.value)}>
              {["un","kg","g","L","ml","cx","pct","dz"].map(u=><option key={u}>{u}</option>)}
            </select>
          </div>
          <input style={inp} placeholder="Observação (opcional)" value={note} onChange={e=>setNote(e.target.value)} maxLength={200} />
        </div>
        ) : importStep === "input" ? (
          // ─── Modo importação: input do texto ───
          <div>
            <p style={{ color:C.inkSoft, fontSize:13, lineHeight:1.5, marginBottom:12, fontFamily:"'DM Sans',sans-serif" }}>
              Cole sua lista de qualquer app (Apple Notes, Google Keep, WhatsApp, etc).
            </p>
            <textarea
              value={importText}
              onChange={(e)=>setImportText(e.target.value)}
              placeholder={"Ex:\n• 2 bananas\n- leite\n1 kg arroz\n☐ ovos\n✓ pão"}
              autoFocus
              style={{
                width:"100%", minHeight:160, padding:"11px 12px",
                background:"#FAF8F4", border:`1px solid ${C.linenDim}`, borderRadius:11,
                color:C.graphite, fontSize:14, fontFamily:"'DM Sans',sans-serif",
                outline:"none", resize:"vertical", boxSizing:"border-box", lineHeight:1.5
              }}
            />
            <p style={{ color:C.stoneSoft, fontSize:11, lineHeight:1.5, marginTop:8, fontFamily:"'DM Sans',sans-serif" }}>
              💡 O app detecta automaticamente quantidades (ex: "2 kg arroz"), itens marcados como concluídos (✓, [x]), bullets e numeração.
            </p>
          </div>
        ) : (
          // ─── Modo importação: preview ───
          <div>
            {importPreview.length === 0 ? (
              // ═══ EMPTY STATE #8: texto colado mas nada detectado ═══
              <div style={{ padding:"32px 18px 20px", textAlign:"center" }}>
                <div style={{ fontSize:42, marginBottom:14, opacity:0.85 }}>🤔</div>
                <h3 style={{ fontFamily:"'Fraunces',serif", fontSize:18, fontWeight:500, color:C.graphite, marginBottom:8, letterSpacing:"-0.3px" }}>
                  Não identifiquei itens
                </h3>
                <p style={{ color:C.stone, fontSize:13, lineHeight:1.55, marginBottom:16, fontFamily:"'DM Sans',sans-serif" }}>
                  O texto colado não parece ter uma lista de produtos. Tente:
                </p>
                <div style={{ background:`${C.sage}15`, border:`1px solid ${C.sage}33`, borderRadius:11, padding:"12px 14px", textAlign:"left", maxWidth:280, marginLeft:"auto", marginRight:"auto" }}>
                  <p style={{ color:C.stone, fontSize:11.5, lineHeight:1.6, fontFamily:"'DM Sans',sans-serif" }}>
                    • Um item por linha<br/>
                    • Ex: "2kg arroz" ou "leite x3"<br/>
                    • Frases ou textos longos não funcionam
                  </p>
                </div>
                <button
                  onClick={()=>setImportStep("input")}
                  style={{
                    marginTop:18,
                    background:C.graphite, color:C.sand,
                    border:"none", borderRadius:11,
                    padding:"11px 22px", fontSize:13, fontWeight:500,
                    cursor:"pointer", fontFamily:"'DM Sans',sans-serif"
                  }}
                >
                  ← Voltar e editar
                </button>
              </div>
            ) : (
              <>
                <p style={{ color:C.inkSoft, fontSize:13, marginBottom: duplicateCount > 0 ? 8 : 12, fontFamily:"'DM Sans',sans-serif" }}>
                  Encontrei <strong>{importPreview.length}</strong> {importPreview.length === 1 ? "item" : "itens"}.
                  Desmarque o que não quiser importar.
                </p>

                {/* Aviso de duplicatas */}
                {duplicateCount > 0 && (
                  <div style={{
                    background:"#FFF4E0",
                    border:"1px solid #F0CC8E",
                    borderRadius:9,
                    padding:"9px 11px",
                    marginBottom:12,
                    display:"flex",
                    alignItems:"flex-start",
                    gap:8,
                    fontFamily:"'DM Sans',sans-serif"
                  }}>
                    <span style={{ fontSize:14, flexShrink:0, marginTop:1 }}>⚠️</span>
                    <p style={{ color:"#7A5400", fontSize:12, lineHeight:1.45 }}>
                      <strong>{duplicateCount}</strong> {duplicateCount === 1 ? "item já está" : "itens já estão"} na lista. As quantidades serão somadas automaticamente.
                    </p>
                  </div>
                )}

                <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                  {importPreview.map((it, idx) => {
                    const isDup = !!it._duplicateOf;
                    const summedQty = isDup ? sumQty(it._duplicateOf.qty, it.qty) : null;
                    return (
                    <div
                      key={idx}
                      style={{
                        display:"flex", alignItems:"center", gap:10,
                        padding:"9px 11px",
                        background: !it._selected ? C.linenDim : (isDup ? "#FFFAEF" : "#FAF8F4"),
                        border: isDup && it._selected ? "1px solid #F0CC8E" : `1px solid ${C.linenDim}`,
                        borderRadius:9,
                        opacity: it._selected ? 1 : 0.5,
                        fontFamily:"'DM Sans',sans-serif"
                      }}
                    >
                      {/* Checkbox: importar ou não */}
                      <button
                        onClick={()=>togglePreviewSelected(idx)}
                        style={{
                          width:22, height:22, borderRadius:5,
                          background: it._selected ? C.sage : C.sand,
                          border:`1.5px solid ${it._selected ? C.sage : C.linenDim}`,
                          display:"flex", alignItems:"center", justifyContent:"center",
                          cursor:"pointer", flexShrink:0, padding:0
                        }}
                      >
                        {it._selected && <span style={{ color:C.graphite, fontSize:13, fontWeight:700 }}>✓</span>}
                      </button>
                      {/* Nome (editável inline) + badge de duplicata embaixo */}
                      <div style={{ flex:1, minWidth:0 }}>
                        <input
                          type="text"
                          value={it.name}
                          onChange={(e)=>updatePreviewName(idx, e.target.value)}
                          style={{
                            width:"100%", padding:"4px 6px",
                            background:"transparent", border:"none",
                            color:C.graphite, fontSize:14,
                            textDecoration: it.done ? "line-through" : "none",
                            opacity: it.done ? 0.6 : 1,
                            outline:"none",
                            fontFamily:"'DM Sans',sans-serif"
                          }}
                        />
                        {isDup && it._selected && (
                          <p style={{
                            color:"#7A5400", fontSize:10.5, marginLeft:6, marginTop:1,
                            fontFamily:"'DM Sans',sans-serif"
                          }}>
                            já tem {it._duplicateOf.qty} {it._duplicateOf.unit} → vai virar {summedQty} {it._duplicateOf.unit}
                          </p>
                        )}
                      </div>
                      {/* Qtd + Unidade */}
                      <span style={{ color:C.stoneSoft, fontSize:12, whiteSpace:"nowrap", flexShrink:0 }}>
                        {it.qty} {it.unit}
                      </span>
                      {/* Estado: comprado ou não (toggle) */}
                      <button
                        onClick={()=>togglePreviewDone(idx)}
                        title={it.done ? "Marcado como comprado (clique para desmarcar)" : "Não comprado (clique para marcar)"}
                        style={{
                          background:"transparent", border:"none",
                          fontSize:14, cursor:"pointer", padding:"4px 6px", flexShrink:0
                        }}
                      >
                        {it.done ? "☑️" : "⬜"}
                      </button>
                    </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        )}
      </Modal>

      {showCatPicker && (
        <CategoryPicker current={effectiveCategory} onChange={(cid)=>setCategory(cid)} onClose={()=>setShowCatPicker(false)} />
      )}

      {/* Modal de confirmação quando detecta duplicata */}
      {duplicateItem && (
        <div
          style={{ position:"fixed",top:0,bottom:0,left:0,right:0,background:"rgba(15,18,24,0.65)",zIndex:1100,display:"flex",alignItems:"center",justifyContent:"center",backdropFilter:"blur(4px)",padding:"0 16px" }}
          onClick={()=>setDuplicateItem(null)}
        >
          <div
            style={{ background:C.sand,borderRadius:18,width:"100%",maxWidth:380,padding:"22px 22px 18px",boxShadow:"0 10px 40px rgba(0,0,0,0.25)" }}
            onClick={e=>e.stopPropagation()}
          >
            <div style={{ display:"flex",alignItems:"center",justifyContent:"center",marginBottom:12 }}>
              <div style={{ width:48,height:48,borderRadius:"50%",background:`${C.sage}33`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22 }}>
                ⚠️
              </div>
            </div>
            <h3 style={{ color:C.graphite,fontSize:18,fontFamily:"'Fraunces',serif",fontWeight:500,textAlign:"center",marginBottom:6,letterSpacing:"-0.3px" }}>
              Item já está na lista
            </h3>
            <p style={{ color:C.stone,fontSize:13,lineHeight:1.5,textAlign:"center",marginBottom:18,fontFamily:"'DM Sans',sans-serif" }}>
              Você já tem <strong style={{ color:C.graphite }}>{duplicateItem.name}</strong> na sua lista <span style={{ color:C.stoneSoft }}>({duplicateItem.qty} {duplicateItem.unit})</span>.
            </p>

            <button
              onClick={handleIncrement}
              style={{
                width:"100%", padding:"13px", marginBottom:8,
                background:C.sage, border:"none", borderRadius:11,
                color:C.graphite, fontSize:14, fontWeight:600, cursor:"pointer",
                fontFamily:"'DM Sans',sans-serif"
              }}
            >
              ➕ Aumentar para {calculateIncrementedQty(duplicateItem)} {duplicateItem.unit}
            </button>

            <button
              onClick={handleAddAnyway}
              style={{
                width:"100%", padding:"11px", marginBottom:8,
                background:"transparent", border:`1px solid ${C.linenDim}`, borderRadius:11,
                color:C.stone, fontSize:13, fontWeight:500, cursor:"pointer",
                fontFamily:"'DM Sans',sans-serif"
              }}
            >
              Adicionar como novo item
            </button>

            <button
              onClick={()=>setDuplicateItem(null)}
              style={{
                width:"100%", padding:"10px",
                background:"transparent", border:"none",
                color:C.stoneSoft, fontSize:12, cursor:"pointer",
                fontFamily:"'DM Sans',sans-serif"
              }}
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </>
  );
}

// ═════════════════════════════════════════════════════════════════════
// ADD LIST MODAL
// ═════════════════════════════════════════════════════════════════════
function AddListModal({ onAdd, onClose }) {
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("🛒");
  const handle = () => { if (!name.trim()) return; onAdd({ name:name.trim(), icon }); onClose(); };

  return (
    <Modal
      onClose={onClose}
      title="Nova lista"
      footer={
        <div style={{ display:"flex",gap:8 }}>
          <button onClick={onClose} style={{ flex:1,padding:"13px",background:C.linen,border:`1px solid ${C.linenDim}`,borderRadius:11,color:C.stone,cursor:"pointer",fontSize:14,fontFamily:"'DM Sans',sans-serif" }}>Cancelar</button>
          <button onClick={handle} style={{ flex:2,padding:"13px",background:C.graphite,border:"none",borderRadius:11,color:C.sand,fontWeight:500,cursor:"pointer",fontSize:15,fontFamily:"'DM Sans',sans-serif" }}>Criar</button>
        </div>
      }
    >
      <input style={{ ...inp,marginBottom:16 }} placeholder="Nome da lista" value={name} onChange={e=>setName(e.target.value)} autoFocus onKeyDown={e=>e.key==="Enter"&&handle()} maxLength={50} />
      <p style={{ color:C.stone,fontSize:10,textTransform:"uppercase",letterSpacing:1.5,marginBottom:10 }}>Ícone</p>
      <div style={{ display:"flex",gap:7,flexWrap:"wrap" }}>
        {LIST_ICONS.map(i=>(
          <button key={i} onClick={()=>setIcon(i)} style={{ fontSize:20,width:42,height:42,borderRadius:10,background:icon===i?C.graphite:C.linen,border:`1px solid ${icon===i?C.graphite:C.linenDim}`,cursor:"pointer" }}>{i}</button>
        ))}
      </div>
    </Modal>
  );
}

// ═════════════════════════════════════════════════════════════════════
// SCREEN: LISTS
// ═════════════════════════════════════════════════════════════════════
function ScreenLists({ lists, listCounts, listMembers, onOpen, onAdd, onDelete, profile, currentUserId }) {
  const [showAdd, setShowAdd] = useState(false);
  const firstName = profile?.name?.split(" ")[0] || "";
  const isEmpty = lists.length === 0;

  return (
    <div style={{ paddingBottom:84 }}>
      <div style={{ position:"sticky",top:0,zIndex:10,background:C.sand,padding:"44px 18px 14px",display:"flex",justifyContent:"space-between",alignItems:"center",borderBottom:`1px solid ${C.linen}` }}>
        <ListouLockup size={0.85} />
        {profile?.name && <p style={{ color:C.stone,fontSize:12,fontFamily:"'DM Sans',sans-serif" }}>Olá, {firstName}</p>}
      </div>

      {isEmpty ? (
        // ═══ EMPTY STATE #1: nenhuma lista criada ═══
        // Primeiro contato do usuário — onboarding visual + CTA grande
        <div style={{ padding:"36px 24px 0", textAlign:"center" }}>
          {/* Ícone grande */}
          <div style={{ fontSize:54, marginBottom:18, opacity:0.85 }}>🛒</div>

          {/* Saudação personalizada */}
          <h2 style={{ fontFamily:"'Fraunces',serif", fontSize:24, fontWeight:500, color:C.graphite, marginBottom:10, letterSpacing:"-0.3px", lineHeight:1.25 }}>
            {firstName ? `Bem-vindo, ${firstName}!` : "Bem-vindo ao Listou!"}
          </h2>

          {/* Subtítulo explicativo */}
          <p style={{ color:C.stone, fontSize:14, lineHeight:1.55, marginBottom:28, maxWidth:300, marginLeft:"auto", marginRight:"auto" }}>
            Crie sua primeira lista pra organizar as compras, importar notas fiscais e economizar.
          </p>

          {/* CTA principal */}
          <button
            onClick={()=>setShowAdd(true)}
            style={{
              background:C.graphite, color:C.sand,
              border:"none", borderRadius:13,
              padding:"15px 32px", fontSize:15, fontWeight:500,
              cursor:"pointer", fontFamily:"'DM Sans',sans-serif",
              boxShadow:"0 2px 12px rgba(26,31,42,0.15)",
              display:"inline-flex", alignItems:"center", gap:10
            }}
          >
            <span style={{ fontSize:18, color:C.sage, lineHeight:1 }}>+</span>
            Criar primeira lista
          </button>

          {/* Dica adicional */}
          <div style={{ marginTop:36, padding:"16px 18px", background:`${C.sage}15`, border:`1px solid ${C.sage}33`, borderRadius:13, textAlign:"left", maxWidth:340, marginLeft:"auto", marginRight:"auto" }}>
            <p style={{ color:C.graphite, fontSize:12, lineHeight:1.55, marginBottom:6, fontWeight:500 }}>
              💡 Você sabia?
            </p>
            <p style={{ color:C.stone, fontSize:12, lineHeight:1.55 }}>
              Você pode compartilhar listas com sua família, importar notas fiscais pra ver o histórico de preços e descobrir onde compra mais barato.
            </p>
          </div>
        </div>
      ) : (
        // ═══ LISTA NORMAL: tem listas criadas ═══
        <>
          <div style={{ padding:"0 14px 8px" }}>
            <p style={{ color:C.stone,fontSize:10,textTransform:"uppercase",letterSpacing:1.8,fontWeight:500,marginBottom:12,paddingLeft:4 }}>Minhas listas</p>
          </div>

          <div style={{ padding:"0 14px",display:"flex",flexDirection:"column",gap:9 }}>
            {lists.map((list,idx) => {
              const counts = listCounts[list.id] || { done:0, total:0 };
              const pct = counts.total ? Math.round((counts.done/counts.total)*100) : 0;
              const members = listMembers[list.id] || [];
              const isShared = members.length > 1;
              const myRole = members.find(m => m.user_id === currentUserId)?.role;
              const isOwner = myRole === "owner";

              return (
                <div key={list.id} style={{ animation:`fadeIn 0.3s ease ${idx*0.05}s both` }}>
                  <div onClick={()=>onOpen(list)} style={{ background:"#FAF8F4",borderRadius:16,padding:"16px",cursor:"pointer",border:`1px solid ${C.linen}` }}>
                    <div style={{ display:"flex",alignItems:"center",gap:13 }}>
                      <div style={{ width:46,height:46,borderRadius:12,background:C.linen,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,flexShrink:0 }}>{list.icon}</div>
                      <div style={{ flex:1,minWidth:0 }}>
                        <div style={{ display:"flex",alignItems:"center",gap:8,marginBottom:3 }}>
                          <p style={{ fontWeight:500,fontSize:16,color:C.graphite,fontFamily:"'DM Sans',sans-serif",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{list.name}</p>
                          {isShared && <AvatarStack members={members} max={3} size={20} />}
                        </div>
                        <p style={{ color:C.stone,fontSize:12 }}>
                          {counts.total===0?"Lista vazia":`${counts.done}/${counts.total} comprados`}
                          {!isOwner && myRole && <span> · {roleLabel(myRole)}</span>}
                        </p>
                        {counts.total>0 && <div style={{ height:3,background:C.linen,borderRadius:3,marginTop:7 }}><div style={{ height:"100%",width:`${pct}%`,background:C.sage,borderRadius:3,transition:"width 0.4s" }} /></div>}
                      </div>
                      {isOwner && (
                        <button onClick={e=>{e.stopPropagation();onDelete(list.id)}} style={{ background:"none",border:"none",color:C.stoneSoft,fontSize:14,cursor:"pointer",padding:6 }}>✕</button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            <button onClick={()=>setShowAdd(true)} style={{ background:"transparent",border:`1.5px dashed ${C.linenDim}`,borderRadius:16,padding:"17px",cursor:"pointer",color:C.stone,fontSize:14,display:"flex",alignItems:"center",justifyContent:"center",gap:8,fontFamily:"'DM Sans',sans-serif" }}>
              <span style={{ fontSize:18,color:C.sage }}>+</span> Nova lista
            </button>
          </div>
        </>
      )}

      {showAdd && <AddListModal onAdd={async list=>{await onAdd(list);setShowAdd(false)}} onClose={()=>setShowAdd(false)} />}
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════
// SCREEN: LIST DETAIL
// ═════════════════════════════════════════════════════════════════════
function ScreenListDetail({ list, items, members, currentUserId, onBack, enabledStores, onAddItem, onToggleItem, onDeleteItem, onChangeCategory, onMarkPurchased, onToggleAll, onRefresh, onRegisterPurchase, onUpdateItem, priceHints = {} }) {
  const [showAdd, setShowAdd] = useState(false);
  const [initialAddMode, setInitialAddMode] = useState("manual");  // "manual" | "import"
  const [openItem, setOpenItem] = useState(null);
  const [showShare, setShowShare] = useState(false);
  const [filter, setFilter] = useState("todos");
  const [sortBy, setSortBy] = useState("categoria");

  const myRole = members.find(m => m.user_id === currentUserId)?.role;
  const canEdit = myRole === "owner" || myRole === "editor";
  const isOwner = myRole === "owner";
  const isShared = members.length > 1;

  // Polling para sincronização (a cada 12 segundos)
  // Usa ref pra evitar recriar o interval quando onRefresh muda de identidade
  const onRefreshRef = useRef(onRefresh);
  useEffect(() => { onRefreshRef.current = onRefresh; }, [onRefresh]);
  useEffect(() => {
    const interval = setInterval(() => {
      if (onRefreshRef.current) onRefreshRef.current();
    }, 12000);
    return () => clearInterval(interval);
  }, []);

  const done = items.filter(i=>i.done).length, total = items.length;
  const progress = total ? Math.round((done/total)*100) : 0;
  const activeStores = STORES.filter(s=>enabledStores.includes(s.id));

  const filterTabs = [
    { v:"todos", l:"Todos" },
    { v:"pendentes", l:"Pendentes" },
    ...activeStores.map(s=>({ v:s.id, l:s.short })),
    { v:"store", l:"Loja física" },
    { v:"comprados", l:"Comprados" },
  ];

  const filteredAndSorted = (() => {
    let result = items.filter(i=>{
      if (filter==="todos") return true;
      if (filter==="pendentes") return !i.done;
      if (filter==="comprados") return i.done;
      return i.done && i.bought_at === filter;
    });

    const sortFn = {
      ordem: (a, b) => new Date(a.created_at) - new Date(b.created_at),
      categoria: (a, b) => {
        const ca = CATEGORIES.findIndex(c => c.id === a.category);
        const cb = CATEGORIES.findIndex(c => c.id === b.category);
        if (ca !== cb) return ca - cb;
        return a.name.localeCompare(b.name, "pt-BR");
      },
      alfabetica: (a, b) => a.name.localeCompare(b.name, "pt-BR"),
    }[sortBy];

    result = [...result].sort(sortFn);

    if (filter === "todos") {
      result.sort((a, b) => {
        if (a.done === b.done) return 0;
        return a.done ? 1 : -1;
      });
    }

    return result;
  })();

  const allDone = total > 0 && done === total;

  return (
    <div style={{ paddingBottom:100 }}>
      <div style={{ position:"sticky",top:0,zIndex:10,padding:"40px 16px 14px",background:C.linen,borderBottom:`1px solid ${C.linenDim}` }}>
        <button onClick={onBack} style={{ background:"none",border:"none",color:C.stone,fontSize:13,cursor:"pointer",marginBottom:12,display:"flex",alignItems:"center",gap:5,fontFamily:"'DM Sans',sans-serif" }}>← Voltar</button>
        <div style={{ display:"flex",alignItems:"center",gap:12,marginBottom:13 }}>
          <div style={{ width:46,height:46,borderRadius:12,background:C.sand,display:"flex",alignItems:"center",justifyContent:"center",fontSize:24 }}>{list.icon}</div>
          <div style={{ flex:1,minWidth:0 }}>
            <div style={{ display:"flex",alignItems:"center",gap:10 }}>
              <h2 style={{ fontFamily:"'Fraunces',serif",fontSize:24,fontWeight:500,color:C.graphite,letterSpacing:"-0.3px",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{list.name}</h2>
              {isShared && <AvatarStack members={members} max={3} size={22} />}
            </div>
            <p style={{ color:C.stone,fontSize:12,marginTop:1 }}>
              {done}/{total} comprados
              {!isOwner && myRole && ` · ${roleLabel(myRole)}`}
            </p>
          </div>
          <button
            onClick={()=>setShowShare(true)}
            title="Compartilhar lista"
            style={{ background:C.sand,border:`1px solid ${C.linenDim}`,borderRadius:10,padding:"8px 11px",cursor:"pointer",fontSize:14,fontFamily:"'DM Sans',sans-serif",display:"flex",alignItems:"center",gap:5 }}
          >
            👥 {isShared ? members.length : ""}
          </button>
        </div>
        {total>0 && <div style={{ height:4,background:C.linenDim,borderRadius:4 }}><div style={{ height:"100%",width:`${progress}%`,borderRadius:4,background:C.sage,transition:"width 0.5s" }} /></div>}
      </div>

      {canEdit && onRegisterPurchase && (
        <div style={{ padding:"12px 14px 0" }}>
          <button
            onClick={()=>onRegisterPurchase()}
            style={{
              width:"100%", padding:"12px 14px",
              background:`${C.sage}22`, border:`1px solid ${C.sage}55`, borderRadius:11,
              color:C.graphite, fontSize:13, fontWeight:500, cursor:"pointer",
              fontFamily:"'DM Sans',sans-serif",
              display:"flex", alignItems:"center", justifyContent:"center", gap:8
            }}
          >
            🧾 <span>Registrar compra desta lista</span>
          </button>
        </div>
      )}

      {total > 0 && (
        <div style={{ display:"flex",gap:8,padding:"12px 14px 4px",alignItems:"center" }}>
          <select
            value={sortBy}
            onChange={e=>setSortBy(e.target.value)}
            style={{ flex:1, padding:"7px 10px", background:C.linen, border:`1px solid ${C.linenDim}`, borderRadius:9, color:C.ink, fontSize:12, fontFamily:"'DM Sans',sans-serif", outline:"none", cursor:"pointer" }}
          >
            <option value="categoria">📂 Por categoria</option>
            <option value="ordem">↕ Ordem de criação</option>
            <option value="alfabetica">🔤 Ordem alfabética</option>
          </select>
          {canEdit && (
            <button
              onClick={()=>onToggleAll(!allDone)}
              style={{ padding:"7px 13px", borderRadius:9, flexShrink:0, background: allDone ? C.linen : C.graphite, border:`1px solid ${allDone ? C.linenDim : C.graphite}`, color: allDone ? C.ink : C.sand, fontSize:12, fontWeight:500, cursor:"pointer", fontFamily:"'DM Sans',sans-serif" }}
            >
              {allDone ? "Desmarcar todos" : "Marcar todos"}
            </button>
          )}
        </div>
      )}

      <div style={{ display:"flex",gap:6,padding:"8px 14px 4px",overflowX:"auto" }}>
        {filterTabs.map(({v,l})=>(
          <button key={v} onClick={()=>setFilter(v)} style={{ padding:"6px 13px",borderRadius:18,flexShrink:0,background:filter===v?C.graphite:"transparent",border:`1px solid ${filter===v?C.graphite:C.linenDim}`,color:filter===v?C.sand:C.stone,fontSize:12,fontWeight:500,cursor:"pointer",fontFamily:"'DM Sans',sans-serif" }}>{l}</button>
        ))}
      </div>

      <div style={{ padding:"6px 14px" }}>
        {filteredAndSorted.length===0 && (
          items.length === 0 ? (
            // ═══ EMPTY STATE #2: lista realmente vazia ═══
            // Lista criada mas sem nenhum item — primeiro uso da lista
            <div style={{ textAlign:"center", padding:"42px 22px 30px" }}>
              <div style={{ fontSize:46, marginBottom:14, opacity:0.85 }}>📝</div>
              <h3 style={{ fontFamily:"'Fraunces',serif", fontSize:20, fontWeight:500, color:C.graphite, marginBottom:8, letterSpacing:"-0.3px" }}>
                Sua lista está pronta
              </h3>
              <p style={{ color:C.stone, fontSize:13, lineHeight:1.55, marginBottom:24, maxWidth:280, marginLeft:"auto", marginRight:"auto" }}>
                Adicione itens manualmente ou cole sua lista de uma só vez.
              </p>
              {canEdit && (
                <div style={{ display:"flex", flexDirection:"column", gap:9, maxWidth:240, marginLeft:"auto", marginRight:"auto" }}>
                  <button
                    onClick={()=>setShowAdd(true)}
                    style={{
                      background:C.graphite, color:C.sand,
                      border:"none", borderRadius:12,
                      padding:"13px 18px", fontSize:14, fontWeight:500,
                      cursor:"pointer", fontFamily:"'DM Sans',sans-serif",
                      display:"flex", alignItems:"center", justifyContent:"center", gap:8
                    }}
                  >
                    <span style={{ fontSize:16, color:C.sage, lineHeight:1 }}>+</span>
                    Adicionar item
                  </button>
                  <button
                    onClick={()=>{ setInitialAddMode("import"); setShowAdd(true); }}
                    style={{
                      background:"transparent", color:C.graphite,
                      border:`1px solid ${C.linenDim}`, borderRadius:12,
                      padding:"12px 18px", fontSize:13,
                      cursor:"pointer", fontFamily:"'DM Sans',sans-serif"
                    }}
                  >
                    📋 Importar lista de texto
                  </button>
                </div>
              )}
            </div>
          ) : (
            // ═══ EMPTY STATE #6: filtro sem resultado ═══
            // Lista tem itens, mas o filtro atual não mostra nenhum
            <div style={{ textAlign:"center", padding:"40px 22px 24px", color:C.stoneSoft }}>
              <div style={{ fontSize:34, marginBottom:10, opacity:0.6 }}>
                {filter === "comprados" ? "✓" : filter === "pendentes" ? "🛒" : "🔍"}
              </div>
              <p style={{ color:C.graphite, fontSize:14, fontWeight:500, marginBottom:6 }}>
                {filter === "comprados" ? "Nenhum item comprado ainda" :
                 filter === "pendentes" ? "Tudo comprado!" :
                 "Nenhum item nesse filtro"}
              </p>
              <p style={{ color:C.stone, fontSize:12, lineHeight:1.5, marginBottom:14 }}>
                {filter === "comprados" ? "Marque um item como comprado pra vê-lo aqui." :
                 filter === "pendentes" ? "Você marcou todos os itens. Parabéns! 🎉" :
                 "Tente outro filtro."}
              </p>
              <button
                onClick={()=>setFilter("todos")}
                style={{
                  background:"transparent",
                  border:`1px solid ${C.linenDim}`,
                  borderRadius:9, padding:"7px 14px",
                  color:C.graphite, fontSize:12,
                  cursor:"pointer", fontFamily:"'DM Sans',sans-serif"
                }}
              >
                Ver todos os itens
              </button>
            </div>
          )
        )}
        {filteredAndSorted.map(item=>(
          <ItemRow
            key={item.id}
            item={item}
            canEdit={canEdit}
            onToggle={()=>onToggleItem(item)}
            onOpen={()=>setOpenItem(item)}
            onDelete={()=>onDeleteItem(item.id)}
            onCategoryChange={(cid)=>onChangeCategory(item.id,cid)}
            priceHint={priceHints[itemPriceKey(item.name)]}
          />
        ))}
      </div>

      {canEdit && (
        <button onClick={()=>setShowAdd(true)} style={{ position:"fixed",bottom:80,right:16,width:54,height:54,borderRadius:"50%",background:C.sage,border:"none",fontSize:26,cursor:"pointer",boxShadow:`0 6px 20px ${C.sage}66, 0 2px 6px rgba(26,31,42,0.15)`,display:"flex",alignItems:"center",justifyContent:"center",color:C.graphite,fontWeight:600,zIndex:100 }}>+</button>
      )}

      {showAdd && (
        <AddItemModal
          onAdd={async item=>{await onAddItem(item);setShowAdd(false);setInitialAddMode("manual");}}
          onClose={()=>{setShowAdd(false);setInitialAddMode("manual");}}
          existingItems={items}
          initialMode={initialAddMode}
          onIncrementItem={async (existingItem, newQtyStr) => {
            if (onUpdateItem) {
              await onUpdateItem(existingItem.id, { qty: newQtyStr });
            }
            setShowAdd(false);
            setInitialAddMode("manual");
          }}
          onUpdateRawItem={async (itemId, updates) => {
            // Versão "raw" usada na importação em lote: não fecha modal
            if (onUpdateItem) {
              await onUpdateItem(itemId, updates);
            }
          }}
        />
      )}
      {openItem && (
        <ItemDetailModal
          item={openItem}
          enabledStores={enabledStores}
          canEdit={canEdit}
          existingItems={items}
          onClose={()=>setOpenItem(null)}
          onMarkPurchased={(storeId, price)=>onMarkPurchased(openItem, storeId, price)}
          onUpdateItem={(updates)=>{
            // Atualiza local imediatamente e propaga para a tela pai
            const updated = { ...openItem, ...updates };
            setOpenItem(updated);
            if (onUpdateItem) onUpdateItem(openItem.id, updates);
          }}
          onMergeItems={async ({ keepId, keepName, removeId, newQty }) => {
            // Mescla: atualiza qty no item que fica + apaga o item editado
            if (onUpdateItem) await onUpdateItem(keepId, { qty: newQty });
            if (onDeleteItem) await onDeleteItem(removeId);
          }}
        />
      )}
      {showShare && <ShareModal list={list} currentUserId={currentUserId} onClose={()=>{setShowShare(false); onRefresh();}} />}
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════
// SCREEN: HISTORY
// ═════════════════════════════════════════════════════════════════════
function ScreenHistory({ history, invoices = [], onDeleteRecord, onDeleteMany, onDeleteInvoice, onRegisterPurchase }) {
  const [view, setView] = useState("compras"); // "compras" | "itens"
  const [storeFilter, setStoreFilter] = useState("all");
  const [sortBy, setSortBy] = useState("data");
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [expandedInvoices, setExpandedInvoices] = useState(new Set());

  const fmtDate = (iso) => iso ? new Date(iso).toLocaleDateString("pt-BR",{day:"2-digit",month:"2-digit",year:"2-digit"}) : "—";
  const fmtTime = (iso) => iso ? new Date(iso).toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"}) : "";
  const labelFor = (storeId) => storeId === "store" ? "Loja física" : (STORES.find(s=>s.id===storeId)?.label || "—");
  const emojiFor = (storeId) => storeId === "store" ? "🏪" : (STORES.find(s=>s.id===storeId)?.emoji || "🛒");

  // ─── Agrupar histórico por NF (invoice_id) e itens avulsos
  const groupedByInvoice = (() => {
    const byInvoice = new Map();
    const avulsos = [];
    for (const h of history) {
      if (h.invoice_id) {
        if (!byInvoice.has(h.invoice_id)) byInvoice.set(h.invoice_id, []);
        byInvoice.get(h.invoice_id).push(h);
      } else {
        avulsos.push(h);
      }
    }
    // Junta com dados das NFs
    const groups = invoices
      .filter(inv => byInvoice.has(inv.id))
      .map(inv => ({
        type: "invoice",
        id: inv.id,
        invoice: inv,
        items: byInvoice.get(inv.id) || [],
      }));
    // Adiciona avulsos como "compras avulsas" (uma por dia, agrupadas)
    const avulsosByDate = new Map();
    for (const av of avulsos) {
      const dateKey = (av.purchased_at || "").split("T")[0] + "_" + (av.store || "store");
      if (!avulsosByDate.has(dateKey)) avulsosByDate.set(dateKey, []);
      avulsosByDate.get(dateKey).push(av);
    }
    for (const [key, items] of avulsosByDate.entries()) {
      groups.push({
        type: "avulso",
        id: "avulso_" + key,
        items,
        date: items[0]?.purchased_at,
        store: items[0]?.store,
      });
    }
    // Ordena por data desc
    groups.sort((a, b) => {
      const da = a.type === "invoice" ? a.invoice.issued_at : a.date;
      const db = b.type === "invoice" ? b.invoice.issued_at : b.date;
      return new Date(db) - new Date(da);
    });
    return groups;
  })();

  const toggleExpanded = (id) => {
    setExpandedInvoices(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const filteredAndSorted = (() => {
    let result = storeFilter==="all" ? history : history.filter(i=>i.store===storeFilter);
    const sortFn = {
      data: (a, b) => new Date(b.purchased_at) - new Date(a.purchased_at),
      alfabetica: (a, b) => (a.item_name||"").localeCompare(b.item_name||"", "pt-BR"),
      categoria: (a, b) => {
        const ca = CATEGORIES.findIndex(c => c.id === a.category);
        const cb = CATEGORIES.findIndex(c => c.id === b.category);
        if (ca !== cb) return ca - cb;
        return new Date(b.purchased_at) - new Date(a.purchased_at);
      },
    }[sortBy];
    return [...result].sort(sortFn);
  })();

  const toggleSelect = (id) => setSelectedIds(prev => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  const visibleIds = filteredAndSorted.map(i => i.id);
  const allSelected = visibleIds.length > 0 && visibleIds.every(id => selectedIds.has(id));
  const toggleAll = () => {
    if (allSelected) setSelectedIds(prev => { const next = new Set(prev); visibleIds.forEach(id => next.delete(id)); return next; });
    else setSelectedIds(prev => { const next = new Set(prev); visibleIds.forEach(id => next.add(id)); return next; });
  };
  const handleDeleteSelected = async () => {
    if (selectedIds.size === 0) return;
    if (!window.confirm(`Apagar ${selectedIds.size} ${selectedIds.size === 1 ? "registro" : "registros"} do histórico?`)) return;
    await onDeleteMany([...selectedIds]);
    setSelectedIds(new Set());
  };

  const hasSelection = selectedIds.size > 0;

  return (
    <div style={{ paddingBottom: hasSelection ? 140 : 84 }}>
      <div style={{ position:"sticky",top:0,zIndex:10,background:C.sand,padding:"44px 18px 14px",borderBottom:`1px solid ${C.linen}` }}>
        <p style={{ color:C.stone,fontSize:10,textTransform:"uppercase",letterSpacing:1.8,fontWeight:500,marginBottom:6 }}>Histórico</p>
        <h2 style={{ fontFamily:"'Fraunces',serif",fontSize:26,fontWeight:500,color:C.graphite,letterSpacing:"-0.5px" }}>Compras realizadas</h2>
      </div>

      {/* Switch de visão: Por compras / Itens */}
      {history.length > 0 && (
        <div style={{ display:"flex", gap:6, padding:"0 14px 10px" }}>
          <button
            onClick={()=>setView("compras")}
            style={{
              flex:1, padding:"9px 10px", borderRadius:10,
              background: view === "compras" ? C.graphite : C.linen,
              border:`1px solid ${view === "compras" ? C.graphite : C.linenDim}`,
              color: view === "compras" ? C.sand : C.stone,
              fontSize:12, fontWeight:500, cursor:"pointer",
              fontFamily:"'DM Sans',sans-serif"
            }}
          >
            🧾 Por compras
          </button>
          <button
            onClick={()=>setView("itens")}
            style={{
              flex:1, padding:"9px 10px", borderRadius:10,
              background: view === "itens" ? C.graphite : C.linen,
              border:`1px solid ${view === "itens" ? C.graphite : C.linenDim}`,
              color: view === "itens" ? C.sand : C.stone,
              fontSize:12, fontWeight:500, cursor:"pointer",
              fontFamily:"'DM Sans',sans-serif"
            }}
          >
            📋 Por itens
          </button>
        </div>
      )}

      {/* ─── VISÃO POR COMPRAS (default) ─── */}
      {view === "compras" && (
        <div style={{ padding:"0 14px" }}>
          {groupedByInvoice.length === 0 ? (
            // ═══ EMPTY STATE #3: Histórico "Por compras" vazio ═══
            // Educa o usuário sobre o valor + 2 CTAs (escanear ou colar)
            history.length === 0 && invoices.length === 0 ? (
              <div style={{ textAlign:"center", padding:"42px 22px 30px" }}>
                <div style={{ fontSize:46, marginBottom:14, opacity:0.85 }}>🧾</div>
                <h3 style={{ fontFamily:"'Fraunces',serif", fontSize:20, fontWeight:500, color:C.graphite, marginBottom:8, letterSpacing:"-0.3px" }}>
                  Comece seu histórico
                </h3>
                <p style={{ color:C.stone, fontSize:13, lineHeight:1.55, marginBottom:24, maxWidth:300, marginLeft:"auto", marginRight:"auto" }}>
                  Registre uma compra ou importe sua nota fiscal eletrônica pra acompanhar seus gastos e descobrir onde economizar.
                </p>
                <div style={{ display:"flex", flexDirection:"column", gap:9, maxWidth:240, marginLeft:"auto", marginRight:"auto" }}>
                  <button
                    onClick={()=>onRegisterPurchase && onRegisterPurchase()}
                    style={{
                      background:C.graphite, color:C.sand,
                      border:"none", borderRadius:12,
                      padding:"13px 18px", fontSize:14, fontWeight:500,
                      cursor:"pointer", fontFamily:"'DM Sans',sans-serif",
                      display:"flex", alignItems:"center", justifyContent:"center", gap:8
                    }}
                  >
                    🧾 Registrar primeira compra
                  </button>
                </div>

                <div style={{ marginTop:30, padding:"14px 16px", background:`${C.sage}15`, border:`1px solid ${C.sage}33`, borderRadius:12, textAlign:"left", maxWidth:340, marginLeft:"auto", marginRight:"auto" }}>
                  <p style={{ color:C.graphite, fontSize:12, lineHeight:1.55, marginBottom:6, fontWeight:500 }}>
                    💡 Para que serve o histórico?
                  </p>
                  <p style={{ color:C.stone, fontSize:11.5, lineHeight:1.55 }}>
                    Ver seus gastos por loja, descobrir aumentos de preço e prever quanto vai gastar nas próximas compras.
                  </p>
                </div>
              </div>
            ) : (
              // Tem histórico mas filtro/condição não mostra nada
              <div style={{ textAlign:"center", padding:"42px 22px 24px", color:C.stoneSoft }}>
                <div style={{ fontSize:34, marginBottom:10, opacity:0.6 }}>🔍</div>
                <p style={{ color:C.graphite, fontSize:14, fontWeight:500, marginBottom:6 }}>
                  Nada por aqui ainda
                </p>
                <p style={{ color:C.stone, fontSize:12, lineHeight:1.5 }}>
                  Ajuste o filtro acima ou registre uma nova compra.
                </p>
              </div>
            )
          ) : groupedByInvoice.map(group => {
            const isExpanded = expandedInvoices.has(group.id);
            const isInvoice = group.type === "invoice";
            const inv = isInvoice ? group.invoice : null;
            const items = group.items;
            const totalCalc = items.reduce((s, i) => s + (Number(i.price) || 0), 0);
            const totalDisplay = isInvoice ? Number(inv.total_amount || totalCalc) : totalCalc;

            const headerBg = isExpanded ? C.linen : "#FAF8F4";
            const dateIso = isInvoice ? inv.issued_at : group.date;

            return (
              <div key={group.id} style={{ marginBottom:8, background:headerBg, borderRadius:13, border:`1px solid ${C.linen}`, overflow:"hidden", transition:"background 0.15s" }}>
                {/* Cabeçalho clicável */}
                <div
                  onClick={()=>toggleExpanded(group.id)}
                  style={{
                    display:"flex", alignItems:"center", gap:12, padding:"13px 14px",
                    cursor:"pointer"
                  }}
                >
                  <div style={{ width:42, height:42, borderRadius:10, background:C.sand, display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, flexShrink:0 }}>
                    {isInvoice ? "🧾" : emojiFor(group.store)}
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <p style={{ fontWeight:500, fontSize:14, color:C.graphite, fontFamily:"'DM Sans',sans-serif", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                      {isInvoice
                        ? (inv.store_name || "Compra")
                        : `${labelFor(group.store)} · ${fmtDate(group.date)}`
                      }
                    </p>
                    <p style={{ color:C.stone, fontSize:11, marginTop:1 }}>
                      {fmtDate(dateIso)}{fmtTime(dateIso) && ` às ${fmtTime(dateIso)}`}
                      {" · "}
                      {items.length} {items.length === 1 ? "item" : "itens"}
                      {totalDisplay > 0 && ` · R$ ${totalDisplay.toFixed(2).replace(".",",")}`}
                    </p>
                  </div>
                  <span style={{ color:C.stoneSoft, fontSize:14, transition:"transform 0.2s", transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)" }}>›</span>
                </div>

                {/* Itens expandidos */}
                {isExpanded && (
                  <div style={{ padding:"4px 14px 12px", borderTop:`1px solid ${C.linenDim}` }}>
                    {items.map(item => (
                      <div key={item.id} style={{ display:"flex", alignItems:"center", gap:10, padding:"8px 0", borderBottom:`1px solid ${C.linen}` }}>
                        <div style={{ width:30, height:30, borderRadius:8, background:C.sand, display:"flex", alignItems:"center", justifyContent:"center", fontSize:14, flexShrink:0 }}>
                          {(CATEGORIES.find(c => c.id === item.category) || CATEGORIES[9]).emoji}
                        </div>
                        <div style={{ flex:1, minWidth:0 }}>
                          <p style={{ color:C.ink, fontSize:13, fontFamily:"'DM Sans',sans-serif", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                            {item.item_name}
                          </p>
                          <p style={{ color:C.stoneSoft, fontSize:11, marginTop:1 }}>
                            {item.qty} {item.unit}
                            {item.price ? ` · R$ ${Number(item.price).toFixed(2).replace(".",",")}` : ""}
                          </p>
                        </div>
                        <button
                          onClick={()=>{ if (window.confirm("Apagar este item do histórico?")) onDeleteRecord(item.id); }}
                          style={{ background:"none", border:"none", color:C.stoneSoft, fontSize:14, cursor:"pointer", padding:6, flexShrink:0 }}
                          title="Apagar este item"
                        >✕</button>
                      </div>
                    ))}
                    {/* Botão apagar a compra inteira */}
                    <button
                      onClick={()=>{
                        if (isInvoice) {
                          if (window.confirm(`Apagar esta compra (${inv.store_fantasy || inv.store_name || "NF"}) e os ${items.length} itens do histórico?`)) {
                            onDeleteInvoice(inv.id);
                          }
                        } else {
                          // Grupo avulso — apaga todos os ids do grupo
                          if (window.confirm(`Apagar esta compra avulsa e os ${items.length} itens do histórico?`)) {
                            onDeleteMany(items.map(i => i.id));
                          }
                        }
                      }}
                      style={{
                        width:"100%", marginTop:10, padding:"9px",
                        background:"transparent", border:`1px solid ${C.danger}55`,
                        borderRadius:9, color:C.danger, fontSize:12, fontWeight:500,
                        cursor:"pointer", fontFamily:"'DM Sans',sans-serif"
                      }}
                    >
                      Apagar compra inteira
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ─── VISÃO POR ITENS (lista corrida) ─── */}
      {view === "itens" && (
        <>
          {history.length > 0 && (
            <div style={{ display:"flex",gap:8,padding:"0 14px 10px",alignItems:"center" }}>
              <select value={sortBy} onChange={e=>setSortBy(e.target.value)} style={{ flex:1, padding:"7px 10px", background:C.linen, border:`1px solid ${C.linenDim}`, borderRadius:9, color:C.ink, fontSize:12, fontFamily:"'DM Sans',sans-serif", outline:"none", cursor:"pointer" }}>
                <option value="data">📅 Data de compra</option>
                <option value="alfabetica">🔤 Ordem alfabética</option>
                <option value="categoria">📂 Por categoria</option>
              </select>
              <button onClick={toggleAll} style={{ padding:"7px 13px", borderRadius:9, flexShrink:0, background: allSelected ? C.linen : C.graphite, border:`1px solid ${allSelected ? C.linenDim : C.graphite}`, color: allSelected ? C.ink : C.sand, fontSize:12, fontWeight:500, cursor:"pointer", fontFamily:"'DM Sans',sans-serif" }}>
                {allSelected ? "Desmarcar todos" : "Selecionar todos"}
              </button>
            </div>
          )}

          <div style={{ display:"flex",gap:6,padding:"0 14px 10px",overflowX:"auto" }}>
            {[{id:"all",l:"Todas"},{id:"ml",l:"🛍️ Mercado Livre"},{id:"amazon",l:"📦 Amazon"},{id:"store",l:"🏪 Loja física"}].map(({id,l})=>(
              <button key={id} onClick={()=>setStoreFilter(id)} style={{ padding:"7px 13px",borderRadius:18,flexShrink:0,background:storeFilter===id?C.graphite:"transparent",border:`1px solid ${storeFilter===id?C.graphite:C.linenDim}`,color:storeFilter===id?C.sand:C.stone,fontSize:12,fontWeight:500,cursor:"pointer",fontFamily:"'DM Sans',sans-serif" }}>{l}</button>
            ))}
          </div>

          <div style={{ padding:"0 14px" }}>
            {filteredAndSorted.length===0 ? (
              history.length === 0 ? (
                // ═══ EMPTY STATE #4: histórico totalmente vazio (vista Por itens) ═══
                <div style={{ textAlign:"center", padding:"42px 22px 30px" }}>
                  <div style={{ fontSize:46, marginBottom:14, opacity:0.85 }}>📊</div>
                  <h3 style={{ fontFamily:"'Fraunces',serif", fontSize:20, fontWeight:500, color:C.graphite, marginBottom:8, letterSpacing:"-0.3px" }}>
                    Nenhum item comprado ainda
                  </h3>
                  <p style={{ color:C.stone, fontSize:13, lineHeight:1.55, marginBottom:18, maxWidth:300, marginLeft:"auto", marginRight:"auto" }}>
                    Marque itens como comprados nas suas listas ou importe uma nota fiscal pra começar a acompanhar.
                  </p>
                </div>
              ) : (
                // Tem histórico mas filtro/busca não mostra nada
                <div style={{ textAlign:"center", padding:"42px 22px 24px", color:C.stoneSoft }}>
                  <div style={{ fontSize:34, marginBottom:10, opacity:0.6 }}>🔍</div>
                  <p style={{ color:C.graphite, fontSize:14, fontWeight:500, marginBottom:6 }}>
                    Nenhum item encontrado
                  </p>
                  <p style={{ color:C.stone, fontSize:12, lineHeight:1.5, marginBottom:14 }}>
                    Tente outro filtro ou outra busca.
                  </p>
                  {storeFilter !== "all" && (
                    <button
                      onClick={()=>setStoreFilter("all")}
                      style={{
                        background:"transparent",
                        border:`1px solid ${C.linenDim}`,
                        borderRadius:9, padding:"7px 14px",
                        color:C.graphite, fontSize:12,
                        cursor:"pointer", fontFamily:"'DM Sans',sans-serif"
                      }}
                    >
                      Limpar filtro
                    </button>
                  )}
                </div>
              )
            ) : (
              filteredAndSorted.map((item)=>{
                const isSelected = selectedIds.has(item.id);
                return (
                  <div key={item.id} style={{ background: isSelected ? `${C.sage}22` : "#FAF8F4", borderRadius:13, padding:"13px 14px", marginBottom:8, border:`1px solid ${isSelected ? C.sage : C.linen}`, display:"flex", alignItems:"center", gap:12, transition:"background 0.15s" }}>
                    <input type="checkbox" checked={isSelected} onChange={()=>toggleSelect(item.id)} style={{ width:18,height:18,accentColor:C.sage,cursor:"pointer",margin:0,flexShrink:0 }} />
                    <div style={{ width:38,height:38,borderRadius:10,background:C.linen,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0 }}>{emojiFor(item.store)}</div>
                    <div style={{ flex:1,minWidth:0 }}>
                      <p style={{ fontWeight:500,fontSize:14,color:C.graphite,marginBottom:2,fontFamily:"'DM Sans',sans-serif" }}>{item.item_name}</p>
                      <p style={{ color:C.stone,fontSize:11 }}>
                        {item.qty} {item.unit} · {labelFor(item.store)} · {fmtDate(item.purchased_at)}
                        {item.price ? ` · R$ ${Number(item.price).toFixed(2).replace(".", ",")}` : ""}
                      </p>
                    </div>
                    <button onClick={()=>{ if (window.confirm("Apagar este registro do histórico?")) onDeleteRecord(item.id); }} style={{ background:"none",border:"none",color:C.stoneSoft,fontSize:14,cursor:"pointer",padding:6,flexShrink:0 }} title="Apagar">✕</button>
                  </div>
                );
              })
            )}
          </div>
        </>
      )}

      {hasSelection && (
        <div style={{ position:"fixed", bottom:56, left:"50%", transform:"translateX(-50%)", width:"100%", maxWidth:480, padding:"12px 16px", background:C.sand, borderTop:`1px solid ${C.linen}`, display:"flex", alignItems:"center", justifyContent:"space-between", gap:12, zIndex:150, boxShadow:"0 -4px 20px rgba(0,0,0,0.06)" }}>
          <p style={{ color:C.ink, fontSize:13, fontFamily:"'DM Sans',sans-serif" }}>
            <strong>{selectedIds.size}</strong> {selectedIds.size === 1 ? "selecionado" : "selecionados"}
          </p>
          <button onClick={handleDeleteSelected} disabled={selectedIds.size === 0} style={{ padding:"10px 18px", borderRadius:11, background: selectedIds.size === 0 ? C.linen : C.danger, border:"none", color: selectedIds.size === 0 ? C.stoneSoft : "#fff", fontSize:13, fontWeight:600, cursor: selectedIds.size === 0 ? "not-allowed" : "pointer", fontFamily:"'DM Sans',sans-serif" }}>
            Apagar selecionados
          </button>
        </div>
      )}

      {onRegisterPurchase && !hasSelection && (
        <button
          onClick={()=>onRegisterPurchase()}
          title="Registrar compra avulsa"
          style={{
            position:"fixed", bottom:80, right:16,
            width:54, height:54, borderRadius:"50%",
            background:C.sage, border:"none",
            fontSize:24, cursor:"pointer",
            boxShadow:`0 6px 20px ${C.sage}66, 0 2px 6px rgba(26,31,42,0.15)`,
            display:"flex", alignItems:"center", justifyContent:"center",
            zIndex:100
          }}
        >
          🧾
        </button>
      )}
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════
// SCREEN: SETTINGS
// ═════════════════════════════════════════════════════════════════════
function ScreenSettings({ profile, onSave, onLogout, onDeleteAccount }) {
  const [name, setName] = useState(profile?.name||"");
  const [cep, setCep] = useState(profile?.cep||"");
  const [cepInfo, setCepInfo] = useState(profile?.city ? { logradouro: profile.street || "", bairro: profile.neighborhood || "", localidade: profile.city, uf: profile.state || "" } : null);
  const [cepLoading, setCepLoading] = useState(false);
  const [maxDays, setMaxDays] = useState(profile?.max_delivery_days||7);
  const [enabledStores, setEnabledStores] = useState(profile?.enabled_stores||["ml","amazon"]);
  const [notifications, setNotifications] = useState(profile?.notifications_enabled!==false);

  // Sincroniza states sempre que o profile for atualizado (ex: após carregar do Supabase)
  useEffect(() => {
    if (profile) {
      setName(profile.name || "");
      setCep(profile.cep || "");
      setCepInfo(profile.city ? {
        logradouro: profile.street || "",
        bairro: profile.neighborhood || "",
        localidade: profile.city,
        uf: profile.state || ""
      } : null);
      setMaxDays(profile.max_delivery_days || 7);
      setEnabledStores(profile.enabled_stores || ["ml","amazon"]);
      setNotifications(profile.notifications_enabled !== false);
    }
  }, [profile?.id, profile?.name, profile?.cep, profile?.city]);

  const toggleStore = (id) => setEnabledStores(prev=>prev.includes(id)?prev.filter(s=>s!==id):[...prev,id]);

  const handleCepChange = async (v) => {
    const formatted = formatCep(v);
    setCep(formatted);
    const digits = formatted.replace(/\D/g, "");
    if (digits.length === 8) {
      setCepLoading(true);
      const info = await fetchCep(digits);
      setCepInfo(info);
      setCepLoading(false);
    } else setCepInfo(null);
  };

  const handleSave = () => {
    onSave({ name, cep, city: cepInfo?.localidade || null, state: cepInfo?.uf || null, street: cepInfo?.logradouro || null, neighborhood: cepInfo?.bairro || null, max_delivery_days: maxDays, enabled_stores: enabledStores, notifications_enabled: notifications });
  };

  const Section = ({ title, children }) => (
    <div style={{ marginBottom:22 }}>
      <p style={{ color:C.stone,fontSize:10,textTransform:"uppercase",letterSpacing:1.8,fontWeight:500,marginBottom:9,paddingLeft:4 }}>{title}</p>
      <div style={{ background:"#FAF8F4",borderRadius:14,overflow:"hidden",border:`1px solid ${C.linen}` }}>{children}</div>
    </div>
  );
  const Row = ({ label, children, last }) => (
    <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",padding:"14px 16px",borderBottom:last?"none":`1px solid ${C.linen}` }}>
      <p style={{ color:C.ink,fontSize:14,fontFamily:"'DM Sans',sans-serif" }}>{label}</p>
      {children}
    </div>
  );
  const Toggle = ({ on, onToggle }) => (
    <button onClick={onToggle} style={{ width:42,height:24,borderRadius:12,background:on?C.sage:C.linenDim,border:"none",cursor:"pointer",position:"relative",transition:"background 0.2s" }}>
      <div style={{ width:18,height:18,borderRadius:"50%",background:C.sand,position:"absolute",top:3,left:on?21:3,transition:"left 0.2s",boxShadow:"0 1px 2px rgba(0,0,0,0.15)" }} />
    </button>
  );

  return (
    <div style={{ paddingBottom:84 }}>
      <div style={{ position:"sticky",top:0,zIndex:10,background:C.sand,padding:"44px 18px 18px",borderBottom:`1px solid ${C.linen}` }}>
        <p style={{ color:C.stone,fontSize:10,textTransform:"uppercase",letterSpacing:1.8,fontWeight:500,marginBottom:6 }}>Conta</p>
        <h2 style={{ fontFamily:"'Fraunces',serif",fontSize:26,fontWeight:500,color:C.graphite,letterSpacing:"-0.5px" }}>Configurações</h2>
      </div>

      <div style={{ padding:"0 14px" }}>
        <Section title="Dados cadastrais">
          <div style={{ padding:"14px 16px",borderBottom:`1px solid ${C.linen}` }}>
            <p style={{ color:C.stone,fontSize:11,marginBottom:6 }}>Nome</p>
            <input style={inp} placeholder="Seu nome" value={name} onChange={e=>setName(e.target.value)} maxLength={60} />
          </div>
          <div style={{ padding:"14px 16px",borderBottom:`1px solid ${C.linen}` }}>
            <p style={{ color:C.stone,fontSize:11,marginBottom:6 }}>Email</p>
            <input style={{ ...inp,background:C.linen,color:C.stone }} value={profile?.email||""} disabled />
          </div>
          <div style={{ padding:"14px 16px" }}>
            <p style={{ color:C.stone,fontSize:11,marginBottom:6 }}>CEP</p>
            <input style={inp} placeholder="00000-000" value={cep} onChange={e=>handleCepChange(e.target.value)} inputMode="numeric" pattern="[0-9]*" type="tel" />
            {cepLoading && <p style={{ color:C.stoneSoft,fontSize:12,marginTop:8 }}>Buscando endereço...</p>}
            {cepInfo && (
              <div style={{ background:`${C.sage}22`,border:`1px solid ${C.sage}55`,borderRadius:9,padding:"10px 12px",marginTop:10 }}>
                <p style={{ color:C.inkSoft,fontSize:12,lineHeight:1.5 }}>
                  📍 {cepInfo.logradouro}{cepInfo.bairro?`, ${cepInfo.bairro}`:""}<br />
                  <strong>{cepInfo.localidade} — {cepInfo.uf}</strong>
                </p>
              </div>
            )}
          </div>
        </Section>

        <Section title="Plataformas">
          {STORES.map((s,i)=>(
            <Row key={s.id} label={`${s.emoji}  ${s.label}`} last={i===STORES.length-1}>
              <Toggle on={enabledStores.includes(s.id)} onToggle={()=>toggleStore(s.id)} />
            </Row>
          ))}
        </Section>

        <Section title="Preferências de entrega">
          <div style={{ padding:"14px 16px" }}>
            <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10 }}>
              <p style={{ color:C.ink,fontSize:14,fontFamily:"'DM Sans',sans-serif" }}>Prazo máximo</p>
              <span style={{ color:C.graphite,fontWeight:500,fontSize:14,fontFamily:"'Fraunces',serif" }}>{maxDays} dias</span>
            </div>
            <input type="range" min={1} max={30} value={maxDays} onChange={e=>setMaxDays(Number(e.target.value))} style={{ width:"100%",accentColor:C.sage }} />
          </div>
        </Section>

        <Section title="App">
          <Row label="Notificações" last={true}>
            <Toggle on={notifications} onToggle={()=>setNotifications(n=>!n)} />
          </Row>
        </Section>

        <button onClick={handleSave} style={{ width:"100%",padding:"14px",background:C.graphite,border:"none",borderRadius:13,color:C.sand,fontWeight:500,cursor:"pointer",fontSize:15,marginBottom:10,fontFamily:"'DM Sans',sans-serif" }}>Salvar configurações</button>
        <button onClick={onLogout} style={{ width:"100%",padding:"13px",background:"transparent",border:`1px solid ${C.linenDim}`,borderRadius:13,color:C.danger,fontWeight:500,cursor:"pointer",fontSize:14,marginBottom:14,fontFamily:"'DM Sans',sans-serif" }}>Sair da conta</button>

        {/* Seção: Sobre o Listou — links legais */}
        <div style={{ marginTop:20, marginBottom:14 }}>
          <p style={{ color:C.stone,fontSize:10,textTransform:"uppercase",letterSpacing:1.2,fontWeight:600,marginBottom:8,fontFamily:"'DM Sans',sans-serif" }}>
            Sobre o Listou
          </p>
          <div style={{ display:"flex", flexDirection:"column", gap:0, background:C.linen, borderRadius:13, overflow:"hidden", border:`1px solid ${C.linenDim}` }}>
            <a
              href="https://feira-wheat.vercel.app/termos.html"
              target="_blank"
              rel="noopener noreferrer"
              style={{ padding:"13px 14px", color:C.graphite, fontSize:14, textDecoration:"none", borderBottom:`1px solid ${C.linenDim}`, display:"flex", justifyContent:"space-between", alignItems:"center", fontFamily:"'DM Sans',sans-serif" }}
            >
              <span>Termos de Uso</span>
              <span style={{ color:C.stoneSoft, fontSize:13 }}>↗</span>
            </a>
            <a
              href="https://feira-wheat.vercel.app/privacidade.html"
              target="_blank"
              rel="noopener noreferrer"
              style={{ padding:"13px 14px", color:C.graphite, fontSize:14, textDecoration:"none", display:"flex", justifyContent:"space-between", alignItems:"center", fontFamily:"'DM Sans',sans-serif" }}
            >
              <span>Política de Privacidade</span>
              <span style={{ color:C.stoneSoft, fontSize:13 }}>↗</span>
            </a>
          </div>
        </div>

        {/* Zona de perigo: Excluir conta */}
        <div style={{ marginTop:14, marginBottom:14 }}>
          <button
            onClick={onDeleteAccount}
            style={{
              width:"100%", padding:"12px",
              background:"transparent", border:`1px solid ${C.danger}55`,
              borderRadius:13, color:C.danger, fontWeight:500,
              cursor:"pointer", fontSize:13,
              fontFamily:"'DM Sans',sans-serif"
            }}
          >
            Excluir minha conta
          </button>
          <p style={{ color:C.stoneSoft, fontSize:10.5, marginTop:6, lineHeight:1.45, textAlign:"center", fontFamily:"'DM Sans',sans-serif" }}>
            Esta ação é permanente e remove todos os seus dados (LGPD).
          </p>
        </div>

        <div style={{ display:"flex",alignItems:"center",justifyContent:"center",gap:8,padding:"14px",border:`1px solid ${C.linen}`,borderRadius:13 }}>
          <ListouLogo size={20} color={C.stoneSoft} accent={C.stoneSoft} />
          <p style={{ color:C.stoneSoft,fontSize:11,fontFamily:"'Fraunces',serif",fontStyle:"italic" }}>Listou · versão beta</p>
        </div>
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════
// BOTTOM NAV
// ═════════════════════════════════════════════════════════════════════
function BottomNav({ tab, setTab }) {
  const items = [
    { id:"lists", label:"Listas", emoji:"🛒" },
    { id:"history", label:"Histórico", emoji:"📋" },
    { id:"settings", label:"Conta", emoji:"⚙️" },
  ];
  return (
    <div style={{ flexShrink:0,width:"100%",background:C.sand,borderTop:`1px solid ${C.linen}`,display:"flex",zIndex:200,paddingBottom:"env(safe-area-inset-bottom)" }}>
      {items.map(it=>(
        <button key={it.id} onClick={()=>setTab(it.id)} style={{ flex:1,padding:"10px 4px 10px",background:"none",border:"none",cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:3 }}>
          <span style={{ fontSize:19,opacity:tab===it.id?1:0.55,transition:"opacity 0.15s" }}>{it.emoji}</span>
          <span style={{ fontSize:10,color:tab===it.id?C.graphite:C.stoneSoft,fontWeight:tab===it.id?500:400,fontFamily:"'DM Sans',sans-serif" }}>{it.label}</span>
          {tab===it.id && <div style={{ width:14,height:2,background:C.sage,borderRadius:1 }} />}
        </button>
      ))}
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════
// REGISTER PURCHASE MODAL — escolha do método de registro
// ═════════════════════════════════════════════════════════════════════
function RegisterPurchaseModal({ onClose, onChooseMethod }) {
  const Option = ({ emoji, title, desc, available, onClick }) => (
    <button
      onClick={available ? onClick : undefined}
      disabled={!available}
      style={{
        width:"100%", padding:"16px 14px", marginBottom:10,
        background: available ? C.linen : C.linenDim,
        border:`1px solid ${available ? C.linenDim : C.linenDim}`,
        borderRadius:13, cursor: available ? "pointer" : "not-allowed",
        display:"flex", alignItems:"center", gap:14,
        textAlign:"left", fontFamily:"'DM Sans',sans-serif",
        opacity: available ? 1 : 0.55
      }}
    >
      <div style={{ fontSize:30, flexShrink:0 }}>{emoji}</div>
      <div style={{ flex:1, minWidth:0 }}>
        <p style={{ color:C.graphite, fontSize:15, fontWeight:500, marginBottom: desc ? 2 : 0 }}>
          {title} {!available && <span style={{ fontSize:10, color:C.stone, fontWeight:400 }}>· em breve</span>}
        </p>
        {desc && <p style={{ color:C.stone, fontSize:12, lineHeight:1.4 }}>{desc}</p>}
      </div>
      {available && <span style={{ color:C.stone, fontSize:18 }}>›</span>}
    </button>
  );

  return (
    <Modal
      onClose={onClose}
      title="Registrar compra"
      footer={
        <button onClick={onClose} style={{ width:"100%",padding:"13px",background:C.linen,border:`1px solid ${C.linenDim}`,borderRadius:11,color:C.stone,cursor:"pointer",fontSize:14,fontFamily:"'DM Sans',sans-serif" }}>
          Cancelar
        </button>
      }
    >
      <p style={{ color:C.inkSoft,fontSize:13,marginBottom:16,lineHeight:1.5 }}>
        Escolha como deseja registrar sua compra:
      </p>

      <Option
        emoji="📷"
        title="Escanear QR Code"
        available={true}
        onClick={() => onChooseMethod("scan")}
      />
      <Option
        emoji="🔗"
        title="Colar link ou chave"
        available={true}
        onClick={() => onChooseMethod("paste")}
      />
      <Option
        emoji="📸"
        title="Foto do cupom"
        available={false}
      />
    </Modal>
  );
}

// ═════════════════════════════════════════════════════════════════════
// QR SCANNER MODAL — câmera + html5-qrcode (carregado via CDN)
// ═════════════════════════════════════════════════════════════════════
function QRScannerModal({ onClose, onDetected, onFallbackPaste, onClearError, loading, error }) {
  const containerId = "qr-scanner-container";
  const [status, setStatus] = useState("loading"); // loading | scanning | error | confirming
  const [errorMsg, setErrorMsg] = useState("");
  const [detectedUrl, setDetectedUrl] = useState(null);
  const scannerRef = useRef(null);
  const isProcessingRef = useRef(false);

  // Carrega a biblioteca html5-qrcode via CDN (uma vez)
  useEffect(() => {
    let cancelled = false;

    const loadLibrary = async () => {
      // Se já estiver carregado, segue direto
      if (window.Html5Qrcode) {
        if (!cancelled) initScanner();
        return;
      }

      // Carrega o script da CDN
      try {
        await new Promise((resolve, reject) => {
          const script = document.createElement("script");
          script.src = "https://cdn.jsdelivr.net/npm/html5-qrcode@2.3.8/html5-qrcode.min.js";
          script.async = true;
          script.onload = resolve;
          script.onerror = () => reject(new Error("Falha ao carregar biblioteca do scanner"));
          document.head.appendChild(script);
        });

        if (!cancelled) initScanner();
      } catch (err) {
        if (!cancelled) {
          setStatus("error");
          setErrorMsg("Não consegui carregar o scanner. Verifique sua conexão.");
        }
      }
    };

    const initScanner = async () => {
      if (!window.Html5Qrcode) {
        setStatus("error");
        setErrorMsg("Biblioteca do scanner não disponível");
        return;
      }

      try {
        const Html5Qrcode = window.Html5Qrcode;
        const scanner = new Html5Qrcode(containerId);
        scannerRef.current = scanner;

        // Config full-frame: analisa a tela inteira (igual ao leitor nativo do iPhone)
        // qrbox: undefined → biblioteca analisa o frame completo, não só uma caixa
        const config = {
          fps: 20,                  // 20 FPS = dobro da detecção
          qrbox: undefined,         // sem caixa fixa → analisa tudo
          aspectRatio: 1.7777,      // proporção 16:9 (mais cobertura horizontal)
          disableFlip: false,
          videoConstraints: {
            facingMode: { ideal: "environment" },
            focusMode: { ideal: "continuous" },     // autofocus contínuo
            advanced: [{ focusMode: "continuous" }]
          },
        };

        await scanner.start(
          { facingMode: "environment" },  // câmera traseira
          config,
          (decodedText) => {
            // Sucesso! Tem QR detectado
            if (isProcessingRef.current) return;
            isProcessingRef.current = true;
            handleDetected(decodedText);
          },
          () => {
            // Erro silencioso a cada frame onde não detectou — normal
          }
        );

        // Tenta aplicar zoom 2x após iniciar (alguns dispositivos suportam)
        // Isso ajuda a captar QR codes pequenos como os de cupom fiscal
        try {
          const videoEl = document.querySelector(`#${containerId} video`);
          if (videoEl && videoEl.srcObject) {
            const track = videoEl.srcObject.getVideoTracks()[0];
            if (track) {
              const capabilities = track.getCapabilities ? track.getCapabilities() : {};
              if (capabilities.zoom) {
                // Zoom inicial = 1.5x (ou max suportado se menor)
                const targetZoom = Math.min(1.5, capabilities.zoom.max || 1);
                await track.applyConstraints({
                  advanced: [{ zoom: targetZoom }]
                });
              }
            }
          }
        } catch (zoomErr) {
          // Zoom é opcional, ignora se não suportado
        }

        if (!cancelled) setStatus("scanning");
      } catch (err) {
        console.error("[scanner] erro init:", err);
        if (!cancelled) {
          setStatus("error");
          // Mensagens amigáveis em português baseadas no tipo de erro
          const errString = String(err.message || err.toString());
          if (err.name === "NotAllowedError" || errString.includes("Permission") || errString.includes("not allowed")) {
            setErrorMsg("Permita o acesso à câmera para escanear o QR Code do cupom fiscal.");
          } else if (err.name === "NotFoundError" || errString.includes("not found") || errString.includes("no camera")) {
            setErrorMsg("Não encontramos uma câmera neste aparelho.");
          } else if (err.name === "NotReadableError" || errString.includes("in use")) {
            setErrorMsg("A câmera está sendo usada por outro app. Feche e tente de novo.");
          } else if (err.name === "OverconstrainedError") {
            setErrorMsg("Sua câmera não suporta este modo. Tente colar o link manualmente.");
          } else {
            setErrorMsg("Não foi possível abrir a câmera. Tente colar o link manualmente.");
          }
        }
      }
    };

    const handleDetected = async (decodedText) => {
      // Para o scanner imediatamente pra economizar bateria
      if (scannerRef.current) {
        try { await scannerRef.current.stop(); } catch {}
      }

      // Valida se é URL de NF-e
      const isSefazUrl = /https?:\/\/[^\s]*(\.sefaz\.|\.fazenda\.|nfce|nfe)/i.test(decodedText);

      if (isSefazUrl) {
        // URL SEFAZ — busca direto
        onDetected(decodedText);
      } else {
        // URL suspeita — pede confirmação
        setDetectedUrl(decodedText);
        setStatus("confirming");
      }
    };

    loadLibrary();

    // Cleanup ao desmontar
    return () => {
      cancelled = true;
      if (scannerRef.current) {
        try {
          scannerRef.current.stop().catch(() => {});
        } catch {}
        scannerRef.current = null;
      }
    };
  }, []);

  const confirmSuspiciousUrl = () => {
    if (detectedUrl) onDetected(detectedUrl);
  };

  const rejectSuspiciousUrl = () => {
    setDetectedUrl(null);
    setStatus("scanning");
    isProcessingRef.current = false;
    // Reinicia o scanner com mesma config full-frame
    if (scannerRef.current && window.Html5Qrcode) {
      try {
        scannerRef.current.start(
          { facingMode: "environment" },
          {
            fps: 20,
            qrbox: undefined,
            aspectRatio: 1.7777,
            disableFlip: false,
            videoConstraints: {
              facingMode: { ideal: "environment" },
              focusMode: { ideal: "continuous" },
              advanced: [{ focusMode: "continuous" }]
            },
          },
          (text) => {
            if (isProcessingRef.current) return;
            isProcessingRef.current = true;
            // re-handle
            const isSefazUrl = /https?:\/\/[^\s]*(\.sefaz\.|\.fazenda\.|nfce|nfe)/i.test(text);
            if (isSefazUrl) {
              onDetected(text);
            } else {
              setDetectedUrl(text);
              setStatus("confirming");
            }
          },
          () => {}
        );
      } catch {}
    }
  };

  return (
    <div style={{
      position:"fixed", top:0, bottom:0, left:"50%", transform:"translateX(-50%)",
      width:"100%", maxWidth:480, zIndex: 500,
      background:C.graphite,
      display:"flex", flexDirection:"column",
      fontFamily:"'DM Sans',sans-serif"
    }}>
      {/* Header */}
      <div style={{ flexShrink:0, padding:"40px 16px 14px", background:`${C.graphite}EE`, color:C.sand, display:"flex", alignItems:"center", justifyContent:"space-between", gap:12 }}>
        <h2 style={{ fontFamily:"'Fraunces',serif",fontSize:22,fontWeight:500,letterSpacing:"-0.3px", margin:0 }}>
          Escanear QR Code
        </h2>
        <button onClick={onClose} style={{
          background:`${C.sand}11`,
          border:`1px solid ${C.sand}44`,
          color:C.sand,
          fontSize:13,
          cursor:"pointer",
          padding:"7px 14px",
          borderRadius:20,
          fontFamily:"'DM Sans',sans-serif",
          flexShrink:0
        }}>
          Cancelar
        </button>
      </div>

      {/* Área da câmera */}
      <div style={{ flex:1, position:"relative", overflow:"hidden", background:"#000" }}>
        <div id={containerId} style={{ width:"100%", height:"100%", minHeight:300 }} />

        {/* Overlay de loading */}
        {status === "loading" && (
          <div style={{
            position:"absolute", top:0, left:0, right:0, bottom:0,
            display:"flex", alignItems:"center", justifyContent:"center", flexDirection:"column",
            background:"#000", color:C.sand, padding:20, textAlign:"center"
          }}>
            <div style={{ fontSize:32, marginBottom:14 }}>📷</div>
            <p style={{ fontSize:14 }}>Iniciando câmera...</p>
            <p style={{ fontSize:11, color:`${C.sand}88`, marginTop:6 }}>
              Permita o acesso à câmera quando solicitado
            </p>
          </div>
        )}

        {/* Overlay de erro */}
        {status === "error" && (
          <div style={{
            position:"absolute", top:0, left:0, right:0, bottom:0,
            display:"flex", alignItems:"center", justifyContent:"center", flexDirection:"column",
            background:"#000", color:C.sand, padding:32, textAlign:"center"
          }}>
            <div style={{
              width:64, height:64, borderRadius:"50%",
              background:`${C.sand}11`, border:`1px solid ${C.sand}33`,
              display:"flex", alignItems:"center", justifyContent:"center",
              fontSize:30, marginBottom:20
            }}>
              📷
            </div>
            <h3 style={{
              fontFamily:"'Fraunces',serif", fontSize:20, fontWeight:500,
              marginBottom:10, letterSpacing:"-0.3px"
            }}>
              Câmera indisponível
            </h3>
            <p style={{ fontSize:14, marginBottom:24, lineHeight:1.5, color:`${C.sand}CC`, maxWidth:280 }}>
              {errorMsg}
            </p>
            <button
              onClick={onFallbackPaste}
              style={{
                padding:"13px 24px",
                background:C.sage, border:"none", borderRadius:12,
                color:C.graphite, fontSize:14, fontWeight:600, cursor:"pointer",
                fontFamily:"'DM Sans',sans-serif"
              }}
            >
              Colar link manualmente
            </button>
          </div>
        )}

        {/* Overlay de confirmação (URL não-SEFAZ) */}
        {status === "confirming" && detectedUrl && (
          <div style={{
            position:"absolute", top:0, left:0, right:0, bottom:0,
            display:"flex", alignItems:"center", justifyContent:"center", flexDirection:"column",
            background:"rgba(0,0,0,0.85)", color:C.sand, padding:24, textAlign:"center"
          }}>
            <div style={{ fontSize:36, marginBottom:14 }}>⚠️</div>
            <p style={{ fontSize:14, marginBottom:10, lineHeight:1.5 }}>
              Detectei este QR Code, mas não parece um cupom fiscal:
            </p>
            <div style={{
              background:`${C.sand}22`, padding:"10px 14px", borderRadius:8,
              fontSize:11, color:C.sand, marginBottom:18, maxWidth:"100%",
              overflowWrap:"break-word", wordBreak:"break-all", lineHeight:1.4
            }}>
              {detectedUrl.substring(0, 200)}
              {detectedUrl.length > 200 ? "..." : ""}
            </div>
            <div style={{ display:"flex", gap:10, width:"100%", maxWidth:300 }}>
              <button
                onClick={rejectSuspiciousUrl}
                style={{
                  flex:1, padding:"12px",
                  background:"transparent", border:`1px solid ${C.sand}`, borderRadius:11,
                  color:C.sand, fontSize:13, cursor:"pointer",
                  fontFamily:"'DM Sans',sans-serif"
                }}
              >
                Escanear de novo
              </button>
              <button
                onClick={confirmSuspiciousUrl}
                style={{
                  flex:1, padding:"12px",
                  background:C.sage, border:"none", borderRadius:11,
                  color:C.graphite, fontSize:13, fontWeight:600, cursor:"pointer",
                  fontFamily:"'DM Sans',sans-serif"
                }}
              >
                Tentar mesmo assim
              </button>
            </div>
          </div>
        )}

        {/* Dica enquanto escaneia + indicador pulsante */}
        {status === "scanning" && !loading && !error && (
          <>
            {/* Cantos guia (4 cantos sutis em vez de caixa cheia) */}
            <div style={{
              position:"absolute", top:"50%", left:"50%",
              transform:"translate(-50%, -50%)",
              width:"75%", aspectRatio:"1",
              maxWidth:300, maxHeight:300,
              pointerEvents:"none"
            }}>
              {/* 4 cantos em L */}
              {[
                { top:0, left:0, borderTop:`3px solid ${C.sage}`, borderLeft:`3px solid ${C.sage}` },
                { top:0, right:0, borderTop:`3px solid ${C.sage}`, borderRight:`3px solid ${C.sage}` },
                { bottom:0, left:0, borderBottom:`3px solid ${C.sage}`, borderLeft:`3px solid ${C.sage}` },
                { bottom:0, right:0, borderBottom:`3px solid ${C.sage}`, borderRight:`3px solid ${C.sage}` },
              ].map((style, i) => (
                <div key={i} style={{
                  position:"absolute", width:32, height:32, borderRadius:6,
                  ...style
                }} />
              ))}
            </div>

            {/* Dica embaixo */}
            <div style={{
              position:"absolute", bottom:24, left:0, right:0,
              display:"flex", justifyContent:"center", pointerEvents:"none"
            }}>
              <div style={{
                background:"rgba(0,0,0,0.65)", color:C.sand,
                padding:"9px 16px", borderRadius:20, fontSize:13,
                display:"flex", alignItems:"center", gap:8,
                backdropFilter:"blur(8px)"
              }}>
                <span style={{
                  width:8, height:8, borderRadius:"50%",
                  background:C.sage,
                  animation:"listouPulse 1.4s ease-in-out infinite"
                }} />
                Procurando QR Code…
              </div>
            </div>

            {/* Animação CSS injetada */}
            <style>{`
              @keyframes listouPulse {
                0%, 100% { opacity: 1; transform: scale(1); }
                50% { opacity: 0.5; transform: scale(1.4); }
              }
            `}</style>
          </>
        )}

        {/* Overlay de loading do fetch (após detectar QR) */}
        {loading && (
          <div style={{
            position:"absolute", top:0, left:0, right:0, bottom:0,
            display:"flex", alignItems:"center", justifyContent:"center", flexDirection:"column",
            background:"rgba(0,0,0,0.85)", color:C.sand, padding:24, textAlign:"center"
          }}>
            <div style={{ fontSize:38, marginBottom:14 }}>✨</div>
            <p style={{ fontSize:15, fontWeight:500, marginBottom:6 }}>QR Code detectado!</p>
            <p style={{ fontSize:12, color:`${C.sand}AA` }}>Buscando dados da nota fiscal...</p>
          </div>
        )}

        {/* Overlay de erro do fetch */}
        {error && !loading && (
          <div style={{
            position:"absolute", top:0, left:0, right:0, bottom:0,
            display:"flex", alignItems:"center", justifyContent:"center", flexDirection:"column",
            background:"rgba(0,0,0,0.85)", color:C.sand, padding:24, textAlign:"center"
          }}>
            <div style={{ fontSize:38, marginBottom:14 }}>⚠️</div>
            <p style={{ fontSize:14, marginBottom:18, lineHeight:1.5 }}>{error}</p>
            <div style={{ display:"flex", gap:10, width:"100%", maxWidth:300 }}>
              <button
                onClick={() => {
                  isProcessingRef.current = false;
                  if (onClearError) onClearError();
                  rejectSuspiciousUrl();  // reusa lógica de reinício do scanner
                }}
                style={{
                  flex:1, padding:"12px",
                  background:"transparent", border:`1px solid ${C.sand}`, borderRadius:11,
                  color:C.sand, fontSize:13, cursor:"pointer",
                  fontFamily:"'DM Sans',sans-serif"
                }}
              >
                Escanear de novo
              </button>
              <button
                onClick={onFallbackPaste}
                style={{
                  flex:1, padding:"12px",
                  background:C.sage, border:"none", borderRadius:11,
                  color:C.graphite, fontSize:13, fontWeight:600, cursor:"pointer",
                  fontFamily:"'DM Sans',sans-serif"
                }}
              >
                Colar link
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Footer com fallback */}
      <div style={{ flexShrink:0, padding:"14px 16px", background:C.graphite, borderTop:`1px solid ${C.inkSoft}`, paddingBottom:"calc(14px + env(safe-area-inset-bottom))" }}>
        <button
          onClick={onFallbackPaste}
          style={{
            width:"100%", padding:"12px",
            background:"transparent", border:`1px solid ${C.stoneSoft}`, borderRadius:11,
            color:C.sand, fontSize:13, fontWeight:500, cursor:"pointer",
            fontFamily:"'DM Sans',sans-serif"
          }}
        >
          🔗 Colar link manualmente
        </button>
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════
// PASTE LINK MODAL — colar URL ou chave de acesso
// ═════════════════════════════════════════════════════════════════════
function PasteLinkModal({ onClose, onSubmit, loading }) {
  const [input, setInput] = useState("");
  const [error, setError] = useState(null);

  const handleSubmit = () => {
    const cleaned = input.trim();
    if (!cleaned) {
      setError("Cole um link ou chave de acesso");
      return;
    }

    // Se for só número (chave de acesso 44 dígitos), monta URL
    const onlyDigits = cleaned.replace(/\D/g, "");
    if (onlyDigits.length === 44 && cleaned.indexOf("http") === -1) {
      // Detecta UF a partir da chave
      const uf = onlyDigits.substring(0, 2);
      const ufDomains = {
        "26": "https://nfce.sefaz.pe.gov.br:444/nfce-web/consultarNFCe?p=",
        // Adicionar outros estados aqui no futuro
      };
      const base = ufDomains[uf];
      if (!base) {
        setError(`Estado UF=${uf} ainda não suportado. Por enquanto suportamos: PE.`);
        return;
      }
      // Sem versão/dhEmi/vNF/digestValue — algumas SEFAZ aceitam só a chave
      onSubmit(base + onlyDigits);
      return;
    }

    // Se for URL, valida que é da SEFAZ
    if (!cleaned.startsWith("http")) {
      setError("Cole um link válido (começa com https://)");
      return;
    }
    if (cleaned.indexOf("sefaz") === -1 && cleaned.indexOf("fazenda") === -1) {
      setError("Este link não parece ser de uma SEFAZ. Verifique e tente novamente.");
      return;
    }

    onSubmit(cleaned);
  };

  return (
    <Modal
      onClose={onClose}
      title="Colar link ou chave"
      footer={
        <div style={{ display:"flex",gap:8 }}>
          <button onClick={onClose} disabled={loading} style={{ flex:1,padding:"13px",background:C.linen,border:`1px solid ${C.linenDim}`,borderRadius:11,color:C.stone,cursor:loading?"wait":"pointer",fontSize:14,fontFamily:"'DM Sans',sans-serif" }}>
            Voltar
          </button>
          <button onClick={handleSubmit} disabled={loading} style={{ flex:2,padding:"13px",background:C.graphite,border:"none",borderRadius:11,color:C.sand,fontWeight:500,cursor:loading?"wait":"pointer",fontSize:15,fontFamily:"'DM Sans',sans-serif",opacity:loading?0.7:1 }}>
            {loading ? "Buscando..." : "Buscar nota"}
          </button>
        </div>
      }
    >
      <textarea
        style={{ ...inp, minHeight:90, fontFamily:"monospace", fontSize:11, resize:"vertical" }}
        placeholder="https://nfce.sefaz.pe.gov.br:444/...&#10;ou&#10;26260308845439000550651040004177721339111500"
        value={input}
        onChange={e => { setInput(e.target.value); setError(null); }}
        autoFocus
        disabled={loading}
      />

      {error && (
        <div style={{ background:`${C.danger}15`,border:`1px solid ${C.danger}55`,borderRadius:9,padding:"10px 12px",marginTop:12 }}>
          <p style={{ color:C.danger,fontSize:13 }}>{error}</p>
        </div>
      )}

      <div style={{ background:`${C.sage}15`, border:`1px solid ${C.sage}33`, borderRadius:9, padding:"10px 12px", marginTop:14 }}>
        <p style={{ color:C.inkSoft, fontSize:11, lineHeight:1.5 }}>
          💡 <strong>Dica:</strong> No cupom de papel, a chave aparece como número longo na parte inferior. Você também pode escanear o QR Code com o app da câmera do celular e copiar o link que abrir.
        </p>
      </div>
    </Modal>
  );
}

// ═════════════════════════════════════════════════════════════════════
// INVOICE DUPLICATE MODAL — quando a NF já foi importada
// ═════════════════════════════════════════════════════════════════════
function InvoiceDuplicateModal({ existing, onClose, onViewHistory }) {
  const fmtDate = (iso) => iso ? new Date(iso).toLocaleDateString("pt-BR",{day:"2-digit",month:"short",year:"numeric"}) : "—";
  return (
    <Modal
      onClose={onClose}
      title="Nota já registrada"
      footer={
        <div style={{ display:"flex",gap:8 }}>
          <button onClick={onClose} style={{ flex:1,padding:"13px",background:C.linen,border:`1px solid ${C.linenDim}`,borderRadius:11,color:C.stone,cursor:"pointer",fontSize:14,fontFamily:"'DM Sans',sans-serif" }}>
            Cancelar
          </button>
          <button onClick={onViewHistory} style={{ flex:2,padding:"13px",background:C.graphite,border:"none",borderRadius:11,color:C.sand,fontWeight:500,cursor:"pointer",fontSize:15,fontFamily:"'DM Sans',sans-serif" }}>
            Ver no histórico
          </button>
        </div>
      }
    >
      <div style={{ textAlign:"center", padding:"6px 0 12px" }}>
        <div style={{ fontSize:42, marginBottom:10 }}>🛒</div>
        <p style={{ color:C.inkSoft, fontSize:14, lineHeight:1.5, marginBottom:14 }}>
          Esta nota fiscal já foi registrada anteriormente. Os itens estão no seu histórico.
        </p>
        <div style={{ background:C.linen, borderRadius:11, padding:"14px", textAlign:"left" }}>
          <p style={{ color:C.graphite, fontSize:14, fontWeight:500, marginBottom:4 }}>
            {existing.store_name || "Supermercado"}
          </p>
          <p style={{ color:C.stone, fontSize:12 }}>
            {fmtDate(existing.issued_at)} · {existing.total_items || "?"} itens · R$ {Number(existing.total_amount || 0).toFixed(2).replace(".", ",")}
          </p>
        </div>
      </div>
    </Modal>
  );
}

// ═════════════════════════════════════════════════════════════════════
// INVOICE ITEM EDITOR — editar nome/qtd/unidade/categoria
// ═════════════════════════════════════════════════════════════════════
function InvoiceItemEditor({ item, onSave, onClose }) {
  const [name, setName] = useState(item.name);
  const [qty, setQty] = useState(String(item.qty));
  const [unit, setUnit] = useState(item.unit);
  const [category, setCategory] = useState(item.category);
  const [showCatPicker, setShowCatPicker] = useState(false);
  const catObj = CATEGORIES.find(c => c.id === category) || CATEGORIES[9];

  const handle = () => {
    onSave({
      ...item,
      name: name.trim() || item.name,
      qty: parseFloat(qty.replace(",", ".")) || item.qty,
      unit,
      category,
    });
    onClose();
  };

  return (
    <>
      <Modal
        onClose={onClose}
        title="Editar item"
        footer={
          <div style={{ display:"flex",gap:8 }}>
            <button onClick={onClose} style={{ flex:1,padding:"13px",background:C.linen,border:`1px solid ${C.linenDim}`,borderRadius:11,color:C.stone,cursor:"pointer",fontSize:14,fontFamily:"'DM Sans',sans-serif" }}>Cancelar</button>
            <button onClick={handle} style={{ flex:2,padding:"13px",background:C.graphite,border:"none",borderRadius:11,color:C.sand,fontWeight:500,cursor:"pointer",fontSize:15,fontFamily:"'DM Sans',sans-serif" }}>Salvar</button>
          </div>
        }
      >
        <div style={{ display:"flex",flexDirection:"column",gap:10 }}>
          <div>
            <p style={{ color:C.stone,fontSize:11,marginBottom:6,textTransform:"uppercase",letterSpacing:1 }}>Nome</p>
            <input style={inp} value={name} onChange={e=>setName(e.target.value)} />
          </div>

          <button
            onClick={()=>setShowCatPicker(true)}
            style={{ display:"flex",alignItems:"center",gap:10,padding:"10px 12px",background:`${C.sage}22`,border:`1px solid ${C.sage}55`,borderRadius:9,cursor:"pointer",textAlign:"left",fontFamily:"'DM Sans',sans-serif",width:"100%" }}
          >
            <span style={{ fontSize:18 }}>{catObj.emoji}</span>
            <div style={{ flex:1 }}>
              <p style={{ color:C.stoneSoft,fontSize:10,textTransform:"uppercase",letterSpacing:1,marginBottom:2 }}>Categoria</p>
              <p style={{ color:C.inkSoft,fontSize:13,fontWeight:500 }}>{catObj.label}</p>
            </div>
            <span style={{ color:C.stone,fontSize:11 }}>Alterar →</span>
          </button>

          <div style={{ display:"flex",gap:7 }}>
            <div style={{ width:"35%" }}>
              <p style={{ color:C.stone,fontSize:11,marginBottom:6,textTransform:"uppercase",letterSpacing:1 }}>Qtd</p>
              <input style={inp} value={qty} onChange={e=>setQty(e.target.value)} inputMode="decimal" />
            </div>
            <div style={{ flex:1 }}>
              <p style={{ color:C.stone,fontSize:11,marginBottom:6,textTransform:"uppercase",letterSpacing:1 }}>Unidade</p>
              <select style={inp} value={unit} onChange={e=>setUnit(e.target.value)}>
                {["un","kg","g","L","ml","cx","pct","dz"].map(u=><option key={u}>{u}</option>)}
              </select>
            </div>
          </div>

          <div style={{ background:C.linen, padding:"10px 12px", borderRadius:9, marginTop:4 }}>
            <p style={{ color:C.stoneSoft, fontSize:10, textTransform:"uppercase", letterSpacing:1, marginBottom:3 }}>Valor pago</p>
            <p style={{ color:C.graphite, fontFamily:"'Fraunces',serif", fontSize:18, fontWeight:500 }}>
              R$ {Number(item.total_price).toFixed(2).replace(".",",")}
            </p>
            <p style={{ color:C.stoneSoft, fontSize:10, marginTop:2 }}>
              (não pode ser editado — vem da nota fiscal)
            </p>
          </div>
        </div>
      </Modal>

      {showCatPicker && (
        <CategoryPicker
          current={category}
          onChange={(cid)=>setCategory(cid)}
          onClose={()=>setShowCatPicker(false)}
        />
      )}
    </>
  );
}

// ═════════════════════════════════════════════════════════════════════
// INVOICE PREVIEW SCREEN — preview com cruzamento e edição
// ═════════════════════════════════════════════════════════════════════
function InvoicePreviewScreen({ invoice, items, listItems, listName, onCancel, onConfirm, saving }) {
  // Cada item tem: { ...invoice_item, category (auto), selected (true), in_list_item_id (uuid|null) }
  const [enrichedItems, setEnrichedItems] = useState(() => {
    // Algoritmo de cruzamento inteligente:
    //  1. Normaliza nomes (lowercase, sem acentos, sem caracteres especiais)
    //  2. Aplica sinônimos comuns de NFs (fgo→frango, iog→iogurte, etc)
    //  3. Calcula score de similaridade entre cada par (NF x lista)
    //  4. Resolve conflitos: cada item da lista só pode ser matcheado UMA vez,
    //     com prioridade pro par de maior score
    //  5. Mantém o nome da NF como "nome técnico" mas exibe o nome da lista

    // (As funções makeFriendlyName e guessCategoryFromFriendly foram movidas para escopo global no topo do arquivo)


    // ─── AGRUPAMENTO INTELIGENTE ────────────────────────────────────
    // Agrupa itens duplicados (mesmo EAN, ou mesmo nome amigável quando sem EAN)
    // Soma quantidades, totais e descontos. Mantém preço unitário do primeiro.
    // Razão: o caixa pode bipar o mesmo produto várias vezes; em uma "lista
    // inteligente" faz sentido aparecer 1 linha com qtd consolidada.
    // ESTRATÉGIA: agrupa por NOME AMIGÁVEL GENÉRICO (não por EAN).
    // Isso resolve casos como "Queijo Muss Fat 0.098kg" + "Queijo Muss Fat 0.102kg"
    // que têm EANs diferentes (cada pesagem é um EAN único) mas são o mesmo produto.
    const groupedMap = new Map();
    for (const it of items) {
      const friendlyForGrouping = makeFriendlyName(it.name);
      // Chave de agrupamento: nome amigável genérico normalizado
      const groupKey = `name:${normalize(friendlyForGrouping || it.name)}`;
      if (groupedMap.has(groupKey)) {
        const existing = groupedMap.get(groupKey);
        existing.qty = (Number(existing.qty) || 0) + (Number(it.qty) || 0);
        existing.total_price = (Number(existing.total_price) || 0) + (Number(it.total_price) || 0);
        existing.gross_total = (Number(existing.gross_total) || 0) + (Number(it.gross_total) || Number(it.total_price) || 0);
        existing.discount = (Number(existing.discount) || 0) + (Number(it.discount) || 0);
        existing.merged_count = (existing.merged_count || 1) + 1;
        // Mantém o EAN do primeiro item (informativo)
      } else {
        groupedMap.set(groupKey, { ...it, merged_count: 1 });
      }
    }
    // Substitui items pelo array agrupado (mantém ordem de aparição)
    const groupedItems = Array.from(groupedMap.values());

    // Para cada item da NF, calcula score com cada item da lista
    const candidates = []; // { nfIdx, listIdx, score }
    groupedItems.forEach((it, nfIdx) => {
      const nfTokens = tokenize(it.name);
      (listItems || []).forEach((li, listIdx) => {
        const listTokens = tokenize(li.name);
        const score = scoreMatch(listTokens, nfTokens);
        if (score >= 0.5) candidates.push({ nfIdx, listIdx, score });
      });
    });

    // Ordena candidatos por score (maior primeiro) e atribui sem repetir
    candidates.sort((a, b) => b.score - a.score);
    const usedListIdx = new Set();
    const usedNfIdx = new Set();
    const matches = {}; // nfIdx → listItem
    for (const c of candidates) {
      if (usedListIdx.has(c.listIdx) || usedNfIdx.has(c.nfIdx)) continue;
      matches[c.nfIdx] = listItems[c.listIdx];
      usedListIdx.add(c.listIdx);
      usedNfIdx.add(c.nfIdx);
    }

    return groupedItems.map((it, nfIdx) => {
      const matchedListItem = matches[nfIdx] || null;
      // Se há match → usa o nome da lista (já é amigável)
      // Se NÃO há match → gera nome amigável a partir do nome cru da NF
      const friendlyDisplayName = matchedListItem ? matchedListItem.name : makeFriendlyName(it.name);
      // Categoria: prioridade → match na lista → base genérica → guessCategory (legacy)
      const catFromBase = guessCategoryFromFriendly(friendlyDisplayName);
      return {
        ...it,
        id: `tmp_${it.n}`,
        // Nome técnico (da NF) preservado em invoice_name
        invoice_name: it.name,
        // Nome a EXIBIR (amigável SEMPRE)
        name: friendlyDisplayName || it.name,  // fallback no nome cru se gerador falhar
        category: matchedListItem?.category || catFromBase || guessCategory(it.name),
        selected: true,
        in_list_item_id: matchedListItem?.id || null,
        in_list_item_name: matchedListItem?.name || null,
      };
    });
  });

  const [editing, setEditing] = useState(null);

  // Escolha do destino dos itens quando dentro de uma lista
  // null = usuário ainda não escolheu | "list+history" | "history-only"
  const [targetMode, setTargetMode] = useState(null);
  const requiresChoice = !!listName;  // só exige escolha se está dentro de uma lista
  const choiceMade = !requiresChoice || targetMode !== null;

  const inListItems = enrichedItems.filter(i => i.in_list_item_id);
  const extraItems = enrichedItems.filter(i => !i.in_list_item_id);

  const selectedCount = enrichedItems.filter(i => i.selected).length;
  const selectedTotal = enrichedItems.filter(i => i.selected).reduce((s, i) => s + (Number(i.total_price) || 0), 0);
  const selectedGross = enrichedItems.filter(i => i.selected).reduce((s, i) => s + (Number(i.gross_total) || Number(i.total_price) || 0), 0);
  const selectedDiscount = Math.max(0, selectedGross - selectedTotal);
  const totalDiscountInInvoice = enrichedItems.reduce((s, i) => s + (Number(i.discount) || 0), 0);

  const toggleSelect = (id) => {
    setEnrichedItems(prev => prev.map(i => i.id === id ? { ...i, selected: !i.selected } : i));
  };

  const toggleAll = (val) => {
    setEnrichedItems(prev => prev.map(i => ({ ...i, selected: val })));
  };

  const allSelected = enrichedItems.every(i => i.selected);

  const updateItem = (updated) => {
    setEnrichedItems(prev => prev.map(i => i.id === updated.id ? { ...i, ...updated } : i));
  };

  const fmtDate = (iso) => iso ? new Date(iso).toLocaleDateString("pt-BR",{day:"2-digit",month:"short"}) : "";
  const fmtTime = (iso) => iso ? new Date(iso).toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"}) : "";

  const renderItem = (it) => {
    const cat = CATEGORIES.find(c => c.id === it.category) || CATEGORIES[9];
    return (
      <div
        key={it.id}
        style={{
          display:"flex", alignItems:"center", gap:11, padding:"11px 12px",
          background: it.selected ? "#FAF8F4" : C.linen,
          borderRadius:12, marginBottom:7,
          border:`1px solid ${it.selected ? C.linen : C.linenDim}`,
          opacity: it.selected ? 1 : 0.6,
          transition:"all 0.15s"
        }}
      >
        <button
          onClick={() => toggleSelect(it.id)}
          style={{
            width:24, height:24, borderRadius:7, flexShrink:0,
            background: it.selected ? C.sage : "transparent",
            border:`1.5px solid ${it.selected ? C.sage : C.stoneSoft}`,
            cursor:"pointer", fontSize:12, display:"flex", alignItems:"center", justifyContent:"center",
            color:C.graphite, fontWeight:700
          }}
        >{it.selected ? "✓" : ""}</button>

        <div style={{ flex:1, minWidth:0, cursor:"pointer" }} onClick={() => setEditing(it)}>
          <p style={{ color:C.graphite, fontSize:14, fontWeight:500, fontFamily:"'DM Sans',sans-serif", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
            {it.name}
            {it.merged_count > 1 && (
              <span style={{ marginLeft:6, padding:"1px 6px", background:C.linen, color:C.stone, fontSize:10, borderRadius:4, fontWeight:400 }}>
                ×{it.merged_count} bipados
              </span>
            )}
          </p>
          {it.in_list_item_id && it.invoice_name && it.invoice_name !== it.name && (
            <p style={{ color:C.stoneSoft, fontSize:10, marginTop:1, fontStyle:"italic", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
              📄 {it.invoice_name}
            </p>
          )}
          <p style={{ color:C.stoneSoft, fontSize:11, marginTop:1 }}>
            {Number(it.qty).toLocaleString("pt-BR", { maximumFractionDigits: 3 })} {it.unit}
            {it.unit_price > 0 && ` × R$ ${Number(it.unit_price).toFixed(2).replace(".",",")}`}
            {" = "}
            {it.discount > 0 ? (
              <>
                <span style={{ textDecoration:"line-through", color:C.stoneSoft, marginRight:4 }}>
                  R$ {Number(it.gross_total).toFixed(2).replace(".",",")}
                </span>
                <strong style={{ color:C.sageDeep }}>R$ {Number(it.total_price).toFixed(2).replace(".",",")}</strong>
              </>
            ) : (
              <strong style={{ color:C.ink }}>R$ {Number(it.total_price).toFixed(2).replace(".",",")}</strong>
            )}
          </p>
          {it.discount > 0 && (
            <p style={{ color:C.terracota, fontSize:10, marginTop:2, fontWeight:500 }}>
              💰 Desconto de R$ {Number(it.discount).toFixed(2).replace(".",",")}
            </p>
          )}
        </div>

        <button
          onClick={(e) => { e.stopPropagation(); setEditing(it); }}
          title="Categoria"
          style={{
            background:C.linen, border:`1px solid ${C.linenDim}`, borderRadius:8,
            width:32, height:32, fontSize:15, cursor:"pointer",
            display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0
          }}
        >{cat.emoji}</button>
      </div>
    );
  };

  return (
    <div style={{
      position:"fixed", top:0, bottom:0, left:"50%", transform:"translateX(-50%)",
      width:"100%", maxWidth:480,
      background:C.sand, zIndex: 500,
      display:"flex", flexDirection:"column",
      fontFamily:"'DM Sans',sans-serif"
    }}>
      {/* Container scrollável (header + lista) */}
      <div style={{ flex:1, overflowY:"auto", overflowX:"hidden", paddingBottom: 16, WebkitOverflowScrolling: "touch" }}>
      {/* Header */}
      <div style={{ padding:"40px 16px 14px", background:C.linen }}>
        <button onClick={onCancel} style={{ background:"none",border:"none",color:C.stone,fontSize:13,cursor:"pointer",marginBottom:10,display:"flex",alignItems:"center",gap:5,fontFamily:"'DM Sans',sans-serif" }}>← Cancelar</button>

        <h2 style={{ fontFamily:"'Fraunces',serif",fontSize:22,fontWeight:500,color:C.graphite,letterSpacing:"-0.3px", marginBottom:4 }}>
          Confirmar compra
        </h2>
        <p style={{ color:C.inkSoft, fontSize:13, fontFamily:"'DM Sans',sans-serif" }}>
          {invoice.store_fantasy || invoice.store_name || "Supermercado"}
        </p>
        <p style={{ color:C.stone, fontSize:11, marginTop:2 }}>
          {fmtDate(invoice.issued_at)} {fmtTime(invoice.issued_at) && `às ${fmtTime(invoice.issued_at)}`} · {invoice.total_items || items.length} itens · R$ {Number(invoice.total_amount).toFixed(2).replace(".",",")}
        </p>
        {totalDiscountInInvoice > 0 && (
          <p style={{ color:C.terracota, fontSize:11, marginTop:4, fontWeight:500 }}>
            💰 Você economizou R$ {totalDiscountInInvoice.toFixed(2).replace(".",",")} em descontos
          </p>
        )}

        {listName && (
          <div style={{ marginTop:11, padding:"8px 11px", background:C.sand, borderRadius:8, fontSize:11, color:C.inkSoft }}>
            Vinculando à lista <strong>{listName}</strong>
          </div>
        )}
      </div>

      {/* Botão Marcar/Desmarcar todos */}
      <div style={{ padding:"12px 14px 6px", display:"flex", gap:8, alignItems:"center", justifyContent:"space-between" }}>
        <p style={{ color:C.stone, fontSize:12, fontFamily:"'DM Sans',sans-serif" }}>
          <strong style={{ color:C.graphite }}>{selectedCount}</strong> de {enrichedItems.length} selecionados
        </p>
        <button
          onClick={() => toggleAll(!allSelected)}
          style={{ padding:"6px 12px", borderRadius:8, background:allSelected ? C.linen : C.graphite, border:`1px solid ${allSelected ? C.linenDim : C.graphite}`, color:allSelected ? C.ink : C.sand, fontSize:11, fontWeight:500, cursor:"pointer", fontFamily:"'DM Sans',sans-serif" }}
        >
          {allSelected ? "Desmarcar todos" : "Marcar todos"}
        </button>
      </div>

      {/* Itens cruzados com a lista */}
      {inListItems.length > 0 && (
        <div style={{ padding:"6px 14px 0" }}>
          <p style={{ color:C.sageDeep, fontSize:10, textTransform:"uppercase", letterSpacing:1.5, fontWeight:600, marginBottom:8, paddingLeft:4 }}>
            ✓ Já estão na sua lista ({inListItems.length})
          </p>
          {inListItems.map(renderItem)}
        </div>
      )}

      {/* Itens extras */}
      {extraItems.length > 0 && (
        <div style={{ padding:"12px 14px 0" }}>
          <p style={{ color:C.terracota, fontSize:10, textTransform:"uppercase", letterSpacing:1.5, fontWeight:600, marginBottom:8, paddingLeft:4 }}>
            + {listName ? "Itens extras" : "Itens"} ({extraItems.length})
          </p>
          {extraItems.map(renderItem)}
        </div>
      )}
      </div>{/* fim do container scrollável */}

      {/* Footer fixo no rodapé do overlay */}
      <div style={{ flexShrink:0, padding:"14px 16px", background:C.sand, borderTop:`1px solid ${C.linen}`, boxShadow:"0 -4px 20px rgba(0,0,0,0.06)", paddingBottom:"calc(14px + env(safe-area-inset-bottom))" }}>

        {/* Seletor de destino (só quando dentro de uma lista) */}
        {requiresChoice && (
          <div style={{ marginBottom:12 }}>
            <p style={{ color:C.stone, fontSize:10, textTransform:"uppercase", letterSpacing:1.2, fontWeight:600, marginBottom:8 }}>
              Onde quer registrar?
            </p>
            <div style={{ display:"flex", gap:8 }}>
              <button
                onClick={() => setTargetMode("list+history")}
                style={{
                  flex:1, padding:"11px 8px",
                  background: targetMode === "list+history" ? `${C.sage}33` : C.linen,
                  border:`1.5px solid ${targetMode === "list+history" ? C.sage : C.linenDim}`,
                  borderRadius:10,
                  color: targetMode === "list+history" ? C.graphite : C.stone,
                  fontSize:12, fontWeight:500, cursor:"pointer", textAlign:"left",
                  fontFamily:"'DM Sans',sans-serif",
                  transition:"all 0.15s"
                }}
              >
                <div style={{ fontWeight:600, marginBottom:2, display:"flex", alignItems:"center", gap:5 }}>
                  {targetMode === "list+history" && <span style={{ color:C.sageDeep }}>✓</span>}
                  Adicionar à lista + histórico
                </div>
                <div style={{ fontSize:10, color:C.stoneSoft, lineHeight:1.3 }}>
                  Itens vão pra "{listName}" como comprados e ficam no histórico
                </div>
              </button>
              <button
                onClick={() => setTargetMode("history-only")}
                style={{
                  flex:1, padding:"11px 8px",
                  background: targetMode === "history-only" ? `${C.sage}33` : C.linen,
                  border:`1.5px solid ${targetMode === "history-only" ? C.sage : C.linenDim}`,
                  borderRadius:10,
                  color: targetMode === "history-only" ? C.graphite : C.stone,
                  fontSize:12, fontWeight:500, cursor:"pointer", textAlign:"left",
                  fontFamily:"'DM Sans',sans-serif",
                  transition:"all 0.15s"
                }}
              >
                <div style={{ fontWeight:600, marginBottom:2, display:"flex", alignItems:"center", gap:5 }}>
                  {targetMode === "history-only" && <span style={{ color:C.sageDeep }}>✓</span>}
                  Apenas histórico
                </div>
                <div style={{ fontSize:10, color:C.stoneSoft, lineHeight:1.3 }}>
                  Itens só ficam no histórico, sem mudar a lista
                </div>
              </button>
            </div>
          </div>
        )}

        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:10 }}>
          <p style={{ color:C.stone, fontSize:11, fontFamily:"'DM Sans',sans-serif" }}>Total selecionado</p>
          <p style={{ color:C.graphite, fontSize:18, fontWeight:500, fontFamily:"'Fraunces',serif" }}>
            R$ {selectedTotal.toFixed(2).replace(".",",")}
          </p>
        </div>
        <button
          onClick={() => onConfirm(enrichedItems.filter(i => i.selected), targetMode)}
          disabled={selectedCount === 0 || saving || !choiceMade}
          style={{ width:"100%", padding:"14px", background:(selectedCount === 0 || saving || !choiceMade) ? C.linenDim : C.graphite, border:"none", borderRadius:12, color: (selectedCount === 0 || !choiceMade) ? C.stoneSoft : C.sand, fontWeight:500, cursor:(selectedCount === 0 || saving || !choiceMade) ? "not-allowed" : "pointer", fontSize:15, fontFamily:"'DM Sans',sans-serif" }}
        >
          {saving ? "Salvando..." : selectedCount === 0 ? "Nenhum item selecionado" : !choiceMade ? "Escolha onde registrar" : `Importar ${selectedCount} ${selectedCount === 1 ? "item" : "itens"}`}
        </button>
      </div>

      {editing && (
        <InvoiceItemEditor
          item={editing}
          onSave={updateItem}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════
// MAIN APP
// ═════════════════════════════════════════════════════════════════════
export default function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [lists, setLists] = useState([]);
  const [items, setItems] = useState([]);
  const [history, setHistory] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [activeList, setActiveList] = useState(null);
  const [tab, setTab] = useState("lists");
  const [savedMsg, setSavedMsg] = useState(false);
  // Sistema de toast (mensagens flutuantes de sucesso ou erro)
  // { message, type: "success" | "error" | "info" }
  const [toast, setToast] = useState(null);

  // Mostra um toast por 3 segundos
  const showToast = (message, type = "info") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Wrapper para operações Supabase: mostra erro se falhar
  // Uso: const ok = await safeOp(() => supabase.from(...).insert(...), "Erro ao salvar item");
  const safeOp = async (operation, errorMsg = "Algo deu errado. Tente novamente.") => {
    try {
      const result = await operation();
      if (result?.error) {
        console.error("[safeOp] erro:", result.error);
        showToast(errorMsg, "error");
        return null;
      }
      return result;
    } catch (err) {
      console.error("[safeOp] exceção:", err);
      // Detectar erro de rede
      const isNetworkErr = err.message?.includes("Failed to fetch") || err.message?.includes("NetworkError");
      const msg = isNetworkErr
        ? "Sem conexão. Verifique sua internet e tente de novo."
        : errorMsg;
      showToast(msg, "error");
      return null;
    }
  };
  const [listMembers, setListMembers] = useState({}); // { list_id: [members] }
  const [activeListMembers, setActiveListMembers] = useState([]);
  const [pendingInviteToken, setPendingInviteToken] = useState(null);
  // Flag: usuário veio do link de recuperação de senha (precisa criar nova senha)
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false);

  // ── Estados de registro de compra (NF-e) ───────────────────────────
  // invoiceFlow: null | "choose" | "paste" | "preview"
  const [invoiceFlow, setInvoiceFlow] = useState(null);
  const [invoiceLoading, setInvoiceLoading] = useState(false);
  const [invoiceData, setInvoiceData] = useState(null); // { invoice, items }
  const [invoiceError, setInvoiceError] = useState(null);
  const [duplicateInvoice, setDuplicateInvoice] = useState(null);
  const [invoiceListContext, setInvoiceListContext] = useState(null); // { listId, listName, items }
  const [invoiceSaving, setInvoiceSaving] = useState(false);

  // Detecta token de convite na URL
  useEffect(() => {
    const url = new URL(window.location.href);
    const token = url.searchParams.get("invite");
    if (token) setPendingInviteToken(token);
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session }}) => {
      setSession(session); setLoading(false);
    });
    const { data: { subscription }} = supabase.auth.onAuthStateChange((event, session) => {
      // Quando o usuário clica no link de recuperação de senha, o Supabase
      // dispara o evento PASSWORD_RECOVERY. Marcamos isso pra mostrar a tela
      // de "Definir nova senha" em vez do app normal.
      if (event === "PASSWORD_RECOVERY") {
        setIsPasswordRecovery(true);
      }
      setSession(session);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session?.user) return;
    loadProfile();
    loadLists();
    loadHistory();
    checkPendingEmailInvites();
  }, [session]);

  // Quando usuário cria conta, verifica se tinha convites pendentes pelo email
  const checkPendingEmailInvites = async () => {
    if (!session?.user?.email) return;
    const { data: invites } = await supabase
      .from("list_invites")
      .select("id, list_id, role")
      .eq("email", session.user.email.toLowerCase())
      .is("accepted_at", null);

    if (invites && invites.length > 0) {
      for (const inv of invites) {
        // Adiciona como membro
        await supabase.from("list_members").insert({
          list_id: inv.list_id, user_id: session.user.id, role: inv.role
        }).select().maybeSingle();

        // Marca convite como aceito
        await supabase.from("list_invites").update({
          accepted_at: new Date().toISOString(), accepted_by: session.user.id
        }).eq("id", inv.id);
      }
      loadLists();
    }
  };

  const loadProfile = async () => {
    const { data } = await supabase.from("profiles").select("*").eq("id", session.user.id).single();
    if (data) {
      setProfile(data);
    } else {
      // Profile não existe ainda — provavelmente é primeiro login via OAuth (Google)
      // Cria automaticamente com dados do auth (nome e email)
      const userMetadata = session.user.user_metadata || {};
      const fullName = userMetadata.full_name || userMetadata.name || "";
      const email = session.user.email || "";

      const newProfile = {
        id: session.user.id,
        name: fullName,
        email: email,
        // LGPD: Usuários OAuth aceitam os Termos ao continuar com Google
        // (aviso explícito é mostrado na tela de login antes do click)
        terms_accepted_at: new Date().toISOString(),
        terms_version_accepted: "v1.0",
      };

      const { data: created, error: createErr } = await supabase
        .from("profiles")
        .insert(newProfile)
        .select()
        .single();

      if (createErr) {
        console.error("[loadProfile] erro ao criar profile:", createErr);
        // Fallback: tenta usar dados básicos mesmo sem salvar
        setProfile(newProfile);
      } else if (created) {
        setProfile(created);
      }
    }
  };

  const loadLists = async () => {
    const { data } = await supabase.from("lists").select("*").order("created_at", { ascending: true });
    if (data) {
      setLists(data);
      // Carrega membros de cada lista
      const membersMap = {};
      for (const list of data) {
        const { data: mems } = await supabase
          .from("list_members")
          .select("user_id, role")
          .eq("list_id", list.id);
        if (mems && mems.length > 0) {
          const userIds = mems.map(m => m.user_id);
          const { data: profiles } = await supabase
            .from("profiles")
            .select("id, name, email")
            .in("id", userIds);
          membersMap[list.id] = mems.map(m => {
            const p = profiles?.find(pf => pf.id === m.user_id);
            return { ...m, name: p?.name || "", email: p?.email || "" };
          });
        }
      }
      setListMembers(membersMap);
    }
  };

  const loadHistory = async () => {
    const { data } = await supabase.from("purchase_history").select("*").order("purchased_at", { ascending: false }).limit(200);
    if (data) setHistory(data);
    // Carrega também as NFs importadas
    const { data: invs } = await supabase.from("imported_invoices").select("*").order("imported_at", { ascending: false }).limit(100);
    if (invs) setInvoices(invs);
  };

  // Calcula preço UNITÁRIO médio dos últimos 3 valores pagos para cada item.
  // Usa unit_price (R$/un ou R$/kg) que é comparável entre compras de
  // quantidades diferentes. Fallback pra price/qty para registros antigos.
  const priceHints = useMemo(() => {
    const grouped = {};  // key → [{ unitPrice, unit, date }]
    for (const h of history) {
      if (!h.item_name) continue;
      // Pega unit_price diretamente, ou calcula a partir de price/qty
      let unitPrice = Number(h.unit_price);
      if (!unitPrice || unitPrice <= 0) {
        const qty = Number(String(h.qty || "1").replace(",", "."));
        const price = Number(h.price);
        if (qty > 0 && price > 0) unitPrice = price / qty;
      }
      if (!unitPrice || unitPrice <= 0) continue;
      const key = itemPriceKey(h.item_name);
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push({ unitPrice, unit: h.unit || "un", date: h.purchased_at });
    }
    const hints = {};
    for (const key in grouped) {
      const sorted = grouped[key].sort((a, b) => new Date(b.date) - new Date(a.date));
      const last3 = sorted.slice(0, 3);
      const avg = last3.reduce((s, x) => s + x.unitPrice, 0) / last3.length;
      // Unidade mais frequente nos últimos 3
      const units = last3.map(x => x.unit);
      const unit = units.sort((a,b) => units.filter(v=>v===a).length - units.filter(v=>v===b).length).pop() || "un";
      hints[key] = { avg, unit, count: last3.length, all: grouped[key].length };
    }
    return hints;
  }, [history]);

  useEffect(() => {
    if (!activeList) { setItems([]); setActiveListMembers([]); return; }
    loadItems(activeList.id);
    setActiveListMembers(listMembers[activeList.id] || []);
  }, [activeList, listMembers]);

  const loadItems = async (listId) => {
    const { data } = await supabase.from("items").select("*").eq("list_id", listId).order("created_at", { ascending: true });
    if (data) setItems(data);
  };

  const refreshActiveList = async () => {
    if (!activeList) return;
    await loadItems(activeList.id);
    // Recarrega membros também (caso alguém tenha entrado/saído)
    const { data: mems } = await supabase
      .from("list_members")
      .select("user_id, role")
      .eq("list_id", activeList.id);
    if (mems) {
      const userIds = mems.map(m => m.user_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, name, email")
        .in("id", userIds);
      const enriched = mems.map(m => {
        const p = profiles?.find(pf => pf.id === m.user_id);
        return { ...m, name: p?.name || "", email: p?.email || "" };
      });
      setActiveListMembers(enriched);
      setListMembers(prev => ({ ...prev, [activeList.id]: enriched }));
    }
  };

  const [listCounts, setListCounts] = useState({});
  useEffect(() => {
    if (!session?.user || lists.length === 0) return;
    supabase.from("items").select("list_id, done").then(({ data }) => {
      const counts = {};
      lists.forEach(l => { counts[l.id] = { done:0, total:0 }; });
      (data||[]).forEach(i => {
        if (!counts[i.list_id]) counts[i.list_id] = { done:0, total:0 };
        counts[i.list_id].total++;
        if (i.done) counts[i.list_id].done++;
      });
      setListCounts(counts);
    });
  }, [lists, items, session]);

  const addList = async (list) => {
    const result = await safeOp(
      () => supabase.from("lists").insert({ ...list, user_id: session.user.id }).select().single(),
      "Não foi possível criar a lista. Tente novamente."
    );
    if (result?.data) {
      setLists(prev => [...prev, result.data]);
      // Trigger no banco já cria o member 'owner', mas atualizamos local também
      setTimeout(loadLists, 300);
    }
  };

  const deleteList = async (id) => {
    if (!window.confirm("Excluir esta lista? Todos os membros perderão acesso.")) return;
    const result = await safeOp(
      () => supabase.from("lists").delete().eq("id", id),
      "Não foi possível excluir a lista."
    );
    if (result) {
      setLists(prev => prev.filter(l => l.id !== id));
    }
  };

  const addItem = async (item) => {
    // Se vier com done=true (ex: importação de texto com item marcado),
    // adiciona bought_date pro item aparecer corretamente, mas SEM bought_at
    // (loja) ou preço — porque importação não tem essas informações.
    // Importante: NÃO gera entrada em purchase_history (que requer dados de loja).
    const payload = { ...item, list_id: activeList.id, user_id: session.user.id };
    if (payload.done) {
      payload.bought_date = payload.bought_date || new Date().toISOString();
    }
    const result = await safeOp(
      () => supabase.from("items").insert(payload).select().single(),
      "Não foi possível adicionar o item. Tente novamente."
    );
    if (result?.data) setItems(prev => [...prev, result.data]);
  };

  const toggleItem = async (item) => {
    const newDone = !item.done;
    const result = await safeOp(
      () => supabase.from("items").update({
        done: newDone, bought_at: newDone ? item.bought_at : null, bought_date: newDone ? new Date().toISOString() : null,
      }).eq("id", item.id).select().single(),
      "Não foi possível atualizar o item."
    );
    if (result?.data) setItems(prev => prev.map(i => i.id===item.id ? result.data : i));
    setTimeout(loadHistory, 300);
  };

  const deleteItem = async (id) => {
    const result = await safeOp(
      () => supabase.from("items").delete().eq("id", id),
      "Não foi possível excluir o item."
    );
    if (result) {
      setItems(prev => prev.filter(i => i.id !== id));
    }
  };

  const changeCategory = async (id, category) => {
    const result = await safeOp(
      () => supabase.from("items").update({ category }).eq("id", id).select().single(),
      "Não foi possível alterar a categoria."
    );
    if (result?.data) setItems(prev => prev.map(i => i.id===id ? result.data : i));
  };

  // Atualiza campos editáveis de um item (nome, quantidade, unidade)
  const updateItemFields = async (id, updates) => {
    const allowed = ["name", "qty", "unit"];
    const cleanUpdates = {};
    for (const key of allowed) {
      if (updates[key] !== undefined) cleanUpdates[key] = updates[key];
    }
    if (Object.keys(cleanUpdates).length === 0) return;

    const { data, error } = await supabase
      .from("items")
      .update(cleanUpdates)
      .eq("id", id)
      .select()
      .single();
    if (error) {
      console.error("[updateItemFields] erro:", error);
      return;
    }
    if (data) setItems(prev => prev.map(i => i.id===id ? data : i));
  };

  const markPurchased = async (item, storeId, price) => {
    if (item.done && item.bought_at === storeId) {
      const result = await safeOp(
        () => supabase.from("items").update({ done: false, bought_at: null, bought_date: null, bought_price: null }).eq("id", item.id).select().single(),
        "Não foi possível desmarcar o item."
      );
      if (result?.data) setItems(prev => prev.map(i => i.id===item.id ? result.data : i));
      setTimeout(loadHistory, 300);
      return;
    }
    const result = await safeOp(
      () => supabase.from("items").update({ done: true, bought_at: storeId, bought_date: new Date().toISOString(), bought_price: price ?? null }).eq("id", item.id).select().single(),
      "Não foi possível marcar como comprado."
    );
    if (result?.data) {
      setItems(prev => prev.map(i => i.id===item.id ? result.data : i));
      setTimeout(loadHistory, 500);
    }
  };

  const toggleAllItems = async (markAsDone) => {
    if (!activeList) return;
    const updates = { done: markAsDone };
    if (!markAsDone) { updates.bought_at = null; updates.bought_date = null; updates.bought_price = null; }
    const result = await safeOp(
      () => supabase.from("items").update(updates).eq("list_id", activeList.id).select(),
      "Não foi possível atualizar os itens."
    );
    if (result?.data) setItems(result.data);
    setTimeout(loadHistory, 300);
  };

  // Helper: apaga NFs que ficaram sem nenhum item no histórico
  // (executado após operações de delete em purchase_history)
  const cleanupOrphanInvoices = async (affectedInvoiceIds) => {
    if (!affectedInvoiceIds || affectedInvoiceIds.length === 0) return;
    const uniqueIds = [...new Set(affectedInvoiceIds.filter(Boolean))];
    if (uniqueIds.length === 0) return;

    // Verifica quais invoice_ids ainda têm itens no histórico
    const { data: stillHasItems } = await supabase
      .from("purchase_history")
      .select("invoice_id")
      .in("invoice_id", uniqueIds);

    const stillHasSet = new Set((stillHasItems || []).map(r => r.invoice_id));
    const orphans = uniqueIds.filter(id => !stillHasSet.has(id));

    if (orphans.length > 0) {
      // Apaga as NFs órfãs
      await supabase.from("imported_invoices").delete().in("id", orphans);
      setInvoices(prev => prev.filter(i => !orphans.includes(i.id)));
    }
  };

  const deleteHistoryRecord = async (recordId) => {
    // Pega o invoice_id antes de apagar (pra checar órfã depois)
    const record = history.find(h => h.id === recordId);
    const invoiceId = record?.invoice_id;

    await supabase.from("purchase_history").delete().eq("id", recordId);
    setHistory(prev => prev.filter(h => h.id !== recordId));

    // Limpa NF órfã se for o caso
    if (invoiceId) await cleanupOrphanInvoices([invoiceId]);
  };

  const deleteHistoryMany = async (ids) => {
    // Coleta invoice_ids afetados antes de apagar
    const affectedInvoiceIds = history
      .filter(h => ids.includes(h.id) && h.invoice_id)
      .map(h => h.invoice_id);

    await supabase.from("purchase_history").delete().in("id", ids);
    setHistory(prev => prev.filter(h => !ids.includes(h.id)));

    // Limpa NFs órfãs se for o caso
    if (affectedInvoiceIds.length > 0) await cleanupOrphanInvoices(affectedInvoiceIds);
  };

  // Apaga uma NF inteira (e todos os registros do histórico ligados a ela)
  const deleteInvoiceAndItems = async (invoiceId) => {
    // 1. Apaga registros do histórico ligados a esta NF
    await supabase.from("purchase_history").delete().eq("invoice_id", invoiceId);
    // 2. Apaga a NF
    await supabase.from("imported_invoices").delete().eq("id", invoiceId);
    // 3. Atualiza states locais
    setHistory(prev => prev.filter(h => h.invoice_id !== invoiceId));
    setInvoices(prev => prev.filter(i => i.id !== invoiceId));
  };

  const saveProfile = async (updates) => {
    const result = await safeOp(
      () => supabase.from("profiles").update(updates).eq("id", session.user.id).select().single(),
      "Não foi possível salvar as configurações."
    );
    if (result?.data) {
      setProfile(result.data);
      setSavedMsg(true);
      setTimeout(() => setSavedMsg(false), 2000);
    }
  };

  // ─────────────────────────────────────────────────────────────────
  // FUNÇÕES DE REGISTRO DE COMPRA (NF-e)
  // ─────────────────────────────────────────────────────────────────

  // Abre o fluxo de registro
  const openRegisterPurchase = (listContext = null) => {
    setInvoiceListContext(listContext);
    setInvoiceFlow("choose");
    setInvoiceError(null);
  };

  // Fecha o fluxo
  const closeInvoiceFlow = () => {
    setInvoiceFlow(null);
    setInvoiceData(null);
    setInvoiceError(null);
    setDuplicateInvoice(null);
    setInvoiceListContext(null);
    setInvoiceLoading(false);
    setInvoiceSaving(false);
  };

  // Processa link/chave colado
  const handleInvoiceFetch = async (url) => {
    setInvoiceLoading(true);
    setInvoiceError(null);

    try {
      // 1. Extrai chave de acesso da URL para verificar duplicatas ANTES de chamar a API
      const accessKey = (() => {
        try {
          const u = new URL(url);
          const p = u.searchParams.get("p");
          if (!p) return null;
          const seg = p.split("|")[0] || p;
          const k = seg.replace(/\D/g, "").slice(0, 44);
          return k.length === 44 ? k : null;
        } catch { return null; }
      })();

      if (accessKey && session?.user?.id) {
        const { data: existing } = await supabase
          .from("imported_invoices")
          .select("*")
          .eq("user_id", session.user.id)
          .eq("access_key", accessKey)
          .maybeSingle();

        if (existing) {
          // BUGFIX: fecha o scanner/paste antes de mostrar modal de duplicata
          // Sem isso, scanner fica ativo atrás do modal e trava o app no iOS
          setInvoiceFlow(null);
          setDuplicateInvoice(existing);
          setInvoiceLoading(false);
          return;
        }
      }

      // 2. Chama a função serverless (com timeout pra evitar trava)
      // SEFAZ pode demorar muito ou nunca responder em horários de pico.
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s
      let res, data;
      try {
        res = await fetch("/api/invoice-parse", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url }),
          signal: controller.signal,
        });
        data = await res.json();
      } catch (fetchErr) {
        clearTimeout(timeoutId);
        if (fetchErr.name === "AbortError") {
          setInvoiceError("A consulta à SEFAZ demorou demais. Tente novamente em alguns minutos.");
        } else {
          setInvoiceError("Erro de conexão. Verifique sua internet e tente novamente.");
        }
        setInvoiceLoading(false);
        return;
      }
      clearTimeout(timeoutId);

      if (!res.ok || !data.ok) {
        setInvoiceError(data.error || "Não foi possível processar a nota fiscal.");
        setInvoiceLoading(false);
        return;
      }

      // 3. Sucesso — vai para preview
      setInvoiceData(data);
      setInvoiceFlow("preview");
      setInvoiceLoading(false);
    } catch (err) {
      console.error("[invoice fetch] erro:", err);
      setInvoiceError("Erro de conexão. Verifique sua internet e tente novamente.");
      setInvoiceLoading(false);
    }
  };

  // Confirma a importação de itens selecionados
  const handleInvoiceConfirm = async (selectedItems, targetMode) => {
    if (!session?.user?.id || !invoiceData) return;
    setInvoiceSaving(true);

    // Se está dentro de uma lista, decide o modo:
    //   "list+history" → atualiza/cria itens na lista + adiciona no histórico
    //   "history-only" → só adiciona no histórico, não mexe na lista
    // Se NÃO está dentro de uma lista (compra avulsa), targetMode é null e só vai pra histórico.
    const isListPurchase = !!invoiceListContext?.listId;
    const shouldAddToList = isListPurchase && targetMode === "list+history";

    try {
      const { invoice } = invoiceData;
      const userId = session.user.id;

      // 1. Salva a NF na tabela imported_invoices
      const { data: savedInvoice, error: invErr } = await supabase
        .from("imported_invoices")
        .insert({
          user_id: userId,
          access_key: invoice.access_key,
          store_name: invoice.store_fantasy || invoice.store_name,
          store_cnpj: invoice.store_cnpj,
          store_address: invoice.store_address,
          total_amount: invoice.total_amount,
          total_items: invoice.total_items,
          issued_at: invoice.issued_at,
          state: invoice.state,
          source: "link",
          raw_url: invoice.raw_url,
        })
        .select()
        .single();

      if (invErr) throw invErr;
      const invoiceId = savedInvoice.id;
      const purchasedAt = invoice.issued_at || new Date().toISOString();
      const storeLabel = invoice.store_fantasy || invoice.store_name || "Loja física";

      // 2. Para cada item selecionado:
      //    Sempre vai pro histórico.
      //    Se shouldAddToList: atualiza item existente na lista (matched) ou cria novo já comprado.
      const itemsToInsertHistory = [];
      const itemsToCreateInList = [];

      for (const item of selectedItems) {
        // (a) Se vamos adicionar à lista E o item já está na lista, atualiza
        if (shouldAddToList && item.in_list_item_id) {
          await supabase.from("items").update({
            done: true,
            bought_at: "store",
            bought_date: purchasedAt,
            bought_price: item.total_price,
            unit_price: item.unit_price,
            invoice_id: invoiceId,
            category: item.category,
          }).eq("id", item.in_list_item_id);
        }

        // (b) Se vamos adicionar à lista E o item NÃO está na lista, cria item novo já comprado
        if (shouldAddToList && !item.in_list_item_id) {
          itemsToCreateInList.push({
            list_id: invoiceListContext.listId,
            user_id: userId,
            name: item.name,
            qty: String(item.qty),
            unit: item.unit,
            category: item.category,
            done: true,
            bought_at: "store",
            bought_date: purchasedAt,
            bought_price: item.total_price,
            unit_price: item.unit_price,
            invoice_id: invoiceId,
          });
        }

        // (c) Sempre adiciona ao histórico (nome AMIGÁVEL — UX prioridade)
        itemsToInsertHistory.push({
          user_id: userId,
          item_name: item.name,  // nome amigável (mesmo da lista se matched, ou da NF se extra)
          qty: String(item.qty),
          unit: item.unit,
          category: item.category,
          store: "store",
          price: item.total_price,       // total pago (para totais e relatórios)
          unit_price: item.unit_price,   // preço unitário (para sugestões e comparação)
          purchased_at: purchasedAt,
          invoice_id: invoiceId,
        });
      }

      // Cria os itens novos na lista em batch
      if (itemsToCreateInList.length > 0) {
        const { error: itemsErr } = await supabase.from("items").insert(itemsToCreateInList);
        if (itemsErr) console.warn("Erro ao criar itens na lista:", itemsErr);
      }

      if (itemsToInsertHistory.length > 0) {
        const { error: histErr } = await supabase.from("purchase_history").insert(itemsToInsertHistory);
        if (histErr) console.warn("Erro ao salvar histórico:", histErr);
      }

      // 3. Recarrega dados
      await loadHistory();
      if (invoiceListContext?.listId === activeList?.id && activeList) {
        await loadItems(activeList.id);
      }

      // 4. Fecha o fluxo e mostra confirmação
      const totalImported = selectedItems.length;
      const totalValue = selectedItems.reduce((s, i) => s + (Number(i.total_price) || 0), 0);
      closeInvoiceFlow();
      setSavedMsg(true);
      setTimeout(() => setSavedMsg(false), 3000);

      // Vai pra aba histórico se foi compra avulsa OU se escolheu "só histórico"
      if (!invoiceListContext || targetMode === "history-only") {
        setTab("history");
      }
    } catch (err) {
      console.error("[invoice confirm] erro:", err);
      alert("Erro ao salvar: " + (err.message || "tente novamente"));
      setInvoiceSaving(false);
    }
  };

  // Ver no histórico (caso de NF duplicada)
  const handleViewDuplicateInHistory = () => {
    closeInvoiceFlow();
    setActiveList(null);
    setTab("history");
  };

  const handleLogout = async () => {
    if (!window.confirm("Tem certeza que deseja sair?")) return;
    await supabase.auth.signOut();
    setSession(null); setProfile(null); setLists([]); setItems([]);
  };

  // LGPD Art. 18, VI: direito de exclusão dos dados
  // Apaga TODA a conta + todos os dados (cascade no banco cuida do resto)
  const handleDeleteAccount = async () => {
    // Confirmação dupla pra evitar exclusão acidental
    const first = window.confirm(
      "ATENÇÃO: você está prestes a excluir sua conta.\n\n" +
      "Isso vai apagar PERMANENTEMENTE:\n" +
      "• Todas as suas listas e itens\n" +
      "• Seu histórico de compras\n" +
      "• Notas fiscais importadas\n" +
      "• Convites enviados e recebidos\n\n" +
      "Esta ação NÃO pode ser desfeita.\n\n" +
      "Tem certeza que deseja continuar?"
    );
    if (!first) return;
    const second = window.confirm(
      "Última confirmação: excluir realmente sua conta?\n\n" +
      "Clique OK para apagar tudo."
    );
    if (!second) return;

    // Chama a RPC delete_user_account() que apaga o usuário do auth.users.
    // O on delete cascade nas tabelas cuida do resto.
    const { error: rpcErr } = await supabase.rpc("delete_user_account");
    if (rpcErr) {
      console.error("[deleteAccount] erro:", rpcErr);
      showToast("Não foi possível excluir agora. Tente novamente em alguns minutos.", "error");
      return;
    }
    // Após exclusão, faz signOut local pra limpar tudo
    await supabase.auth.signOut();
    setSession(null); setProfile(null); setLists([]); setItems([]);
    // Recarrega a página pra estado completamente limpo
    setTimeout(() => window.location.reload(), 200);
  };

  // Aceitou convite — limpa URL e entra na lista
  const handleInviteAccepted = (listId) => {
    setPendingInviteToken(null);
    window.history.replaceState({}, "", window.location.pathname);
    loadLists().then(() => {
      const list = lists.find(l => l.id === listId);
      if (list) setActiveList(list);
    });
  };

  const handleInviteCancel = () => {
    setPendingInviteToken(null);
    window.history.replaceState({}, "", window.location.pathname);
  };

  if (loading) {
    return (
      <div style={{ minHeight:"100vh",background:C.sand,display:"flex",alignItems:"center",justifyContent:"center" }}>
        <div style={{ width:40,height:40,border:`3px solid ${C.linenDim}`,borderTop:`3px solid ${C.sage}`,borderRadius:"50%",animation:"spin 0.8s linear infinite" }} />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  if (!session) return <AuthScreen pendingInviteToken={pendingInviteToken} />;

  // Se está em modo recuperação de senha (veio do link de email), mostra a
  // tela de "Definir nova senha" em vez do app
  if (isPasswordRecovery) {
    return <NewPasswordScreen onDone={() => setIsPasswordRecovery(false)} />;
  }

  // Se tem token de convite e está logado, mostra tela de aceite
  if (pendingInviteToken && session) {
    return (
      <div style={{ minHeight:"100vh",background:C.sand }}>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Fraunces:wght@400;500;600&family=DM+Sans:wght@400;500;600&display=swap');
          *{margin:0;padding:0;box-sizing:border-box}
          @keyframes spin{to{transform:rotate(360deg)}}
        `}</style>
        <AcceptInviteScreen
          token={pendingInviteToken}
          currentUserId={session.user.id}
          onAccepted={handleInviteAccepted}
          onCancel={handleInviteCancel}
        />
      </div>
    );
  }

  const enabledStores = profile?.enabled_stores?.length ? profile.enabled_stores : ["ml","amazon"];

  return (
    <div style={{ position:"fixed",top:0,bottom:0,left:"50%",transform:"translateX(-50%)",width:"100%",maxWidth:480,background:C.sand,fontFamily:"'DM Sans',sans-serif",color:C.graphite,display:"flex",flexDirection:"column",overflow:"hidden" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:wght@400;500;600&family=DM+Sans:wght@400;500;600&display=swap');
        *{margin:0;padding:0;box-sizing:border-box}
        html,body{height:100%;overflow:hidden;overscroll-behavior:none;-webkit-text-size-adjust:100%;background:${C.sand}}
        #root{height:100%;overflow:hidden}
        button,a,input,select,textarea{touch-action:manipulation}
        @keyframes slideDown{from{transform:translateY(-30px);opacity:0}to{transform:translateY(0);opacity:1}}
        @keyframes toastSlide{from{transform:translate(-50%, -20px);opacity:0}to{transform:translate(-50%, 0);opacity:1}}
        @keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        @keyframes spin{to{transform:rotate(360deg)}}
        ::-webkit-scrollbar{display:none}
        input::placeholder{color:${C.stoneSoft}}
        select option{background:${C.sand};color:${C.graphite}}
        input[type=range]{-webkit-appearance:none;height:4px;background:${C.linenDim};border-radius:4px;outline:none}
        input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:18px;height:18px;border-radius:50%;background:${C.sage};cursor:pointer;border:2px solid ${C.sand};box-shadow:0 1px 3px rgba(0,0,0,0.15)}
        button:active{transform:scale(0.98)}
      `}</style>

      {savedMsg && (
        <div style={{ position:"fixed",top:24,left:"50%",transform:"translateX(-50%)",background:C.graphite,color:C.sand,padding:"10px 20px",borderRadius:20,fontWeight:500,fontSize:13,zIndex:999,fontFamily:"'DM Sans',sans-serif" }}>
          ✓ Configurações salvas
        </div>
      )}

      {/* Toast genérico (sucesso/erro/info) */}
      {toast && (
        <div style={{
          position:"fixed", top:24, left:"50%", transform:"translateX(-50%)",
          background: toast.type === "error" ? C.danger : (toast.type === "success" ? C.sage : C.graphite),
          color: toast.type === "success" ? C.graphite : C.sand,
          padding:"12px 18px", borderRadius:20,
          fontWeight:500, fontSize:13, zIndex:9999,
          fontFamily:"'DM Sans',sans-serif",
          boxShadow:"0 8px 24px rgba(0,0,0,0.18)",
          maxWidth:"calc(100% - 32px)",
          display:"flex", alignItems:"center", gap:10,
          animation: "toastSlide 0.25s ease"
        }}>
          <span style={{ fontSize:15, flexShrink:0 }}>
            {toast.type === "error" ? "⚠️" : toast.type === "success" ? "✓" : "ℹ️"}
          </span>
          <span style={{ lineHeight:1.4 }}>{toast.message}</span>
        </div>
      )}

      <div style={{ flex:1,overflowY:"auto",WebkitOverflowScrolling:"touch",overscrollBehavior:"none" }}>
        {activeList ? (
          <ScreenListDetail
            list={activeList}
            items={items}
            members={activeListMembers}
            currentUserId={session.user.id}
            onBack={()=>setActiveList(null)}
            enabledStores={enabledStores}
            onAddItem={addItem}
            onToggleItem={toggleItem}
            onDeleteItem={deleteItem}
            onChangeCategory={changeCategory}
            onMarkPurchased={markPurchased}
            onToggleAll={toggleAllItems}
            onRefresh={refreshActiveList}
            onUpdateItem={updateItemFields}
            onRegisterPurchase={()=>openRegisterPurchase({
              listId: activeList.id,
              listName: activeList.name,
              items: items
            })}
            priceHints={priceHints}
          />
        ) : (
          <>
            {tab==="lists" && <ScreenLists lists={lists} listCounts={listCounts} listMembers={listMembers} onOpen={setActiveList} onAdd={addList} onDelete={deleteList} profile={profile} currentUserId={session.user.id} />}
            {tab==="history" && <ScreenHistory history={history} invoices={invoices} onDeleteRecord={deleteHistoryRecord} onDeleteMany={deleteHistoryMany} onDeleteInvoice={deleteInvoiceAndItems} onRegisterPurchase={()=>openRegisterPurchase()} />}
            {tab==="settings" && <ScreenSettings profile={profile} onSave={saveProfile} onLogout={handleLogout} onDeleteAccount={handleDeleteAccount} />}
          </>
        )}
      </div>

      {!invoiceFlow && <BottomNav tab={activeList?"lists":tab} setTab={(t)=>{ setActiveList(null); setTab(t); }} />}

      {/* ══════════════════════════════════════════════════════
          FLUXO DE REGISTRO DE COMPRA (NF-e)
      ══════════════════════════════════════════════════════ */}

      {invoiceFlow === "choose" && (
        <RegisterPurchaseModal
          onClose={closeInvoiceFlow}
          onChooseMethod={(method) => {
            if (method === "paste") setInvoiceFlow("paste");
            else if (method === "scan") setInvoiceFlow("scan");
          }}
        />
      )}

      {invoiceFlow === "scan" && (
        <QRScannerModal
          onClose={closeInvoiceFlow}
          onDetected={(url) => {
            // QR detectado → dispara fetch (que vai mostrar preview ou erro)
            handleInvoiceFetch(url);
          }}
          onFallbackPaste={() => setInvoiceFlow("paste")}
          onClearError={() => setInvoiceError(null)}
          loading={invoiceLoading}
          error={invoiceError}
        />
      )}

      {invoiceFlow === "paste" && (
        <PasteLinkModal
          onClose={closeInvoiceFlow}
          onSubmit={handleInvoiceFetch}
          loading={invoiceLoading}
          error={invoiceError}
        />
      )}

      {duplicateInvoice && (
        <InvoiceDuplicateModal
          existing={duplicateInvoice}
          onClose={closeInvoiceFlow}
          onViewHistory={handleViewDuplicateInHistory}
        />
      )}

      {invoiceFlow === "preview" && invoiceData && (
        <InvoicePreviewScreen
          invoice={invoiceData.invoice}
          items={invoiceData.items}
          listItems={invoiceListContext?.items || []}
          listName={invoiceListContext?.listName || null}
          onCancel={closeInvoiceFlow}
          onConfirm={handleInvoiceConfirm}
          saving={invoiceSaving}
        />
      )}
    </div>
  );
}