// ═══════════════════════════════════════════════════════════════════
// FEIRA — Vercel Serverless Function v3
// Parser de NF-e (NFC-e) — usa XML estruturado nacional
//
// Endpoint: POST /api/invoice-parse
// Body: { "url": "https://nfce.sefaz.XX.gov.br/..." }
//
// ✨ NOVIDADE v3:
// A SEFAZ retorna XML estruturado padronizado nacional. Não precisamos
// de node-html-parser nem de adaptadores por estado — UM parser serve
// para TODOS os estados.
// ═══════════════════════════════════════════════════════════════════

// Estados suportados (baseados na UF da chave de acesso)
const STATE_NAMES = {
    "11": "Rondônia", "12": "Acre", "13": "Amazonas", "14": "Roraima",
    "15": "Pará", "16": "Amapá", "17": "Tocantins",
    "21": "Maranhão", "22": "Piauí", "23": "Ceará", "24": "Rio Grande do Norte",
    "25": "Paraíba", "26": "Pernambuco", "27": "Alagoas", "28": "Sergipe", "29": "Bahia",
    "31": "Minas Gerais", "32": "Espírito Santo", "33": "Rio de Janeiro", "35": "São Paulo",
    "41": "Paraná", "42": "Santa Catarina", "43": "Rio Grande do Sul",
    "50": "Mato Grosso do Sul", "51": "Mato Grosso", "52": "Goiás", "53": "Distrito Federal"
  };
  
  function extractAccessKey(url) {
    try {
      const parsed = new URL(url);
      const p = parsed.searchParams.get("p");
      if (!p) return null;
      const firstSegment = p.split("|")[0] || p;
      const key = firstSegment.replace(/\D/g, "").slice(0, 44);
      if (key.length !== 44) return null;
      return key;
    } catch {
      return null;
    }
  }
  
  function parseAccessKey(key) {
    return {
      uf: key.substring(0, 2),
      cnpj: key.substring(6, 20),
    };
  }
  
  // ─────────────────────────────────────────────────────────────────────
  // Helper: extrair conteúdo de uma tag XML (regex simples, sem deps)
  // ─────────────────────────────────────────────────────────────────────
  function extractTag(xml, tagName) {
    // Captura <tag>conteúdo</tag> ou <tag attr="...">conteúdo</tag>
    // Busca a PRIMEIRA ocorrência da tag
    const regex = new RegExp(`<${tagName}(?:\\s[^>]*)?>(.*?)</${tagName}>`, "s");
    const match = xml.match(regex);
    return match ? match[1].trim() : null;
  }
  
  function extractAllTags(xml, tagName) {
    // Captura TODAS as ocorrências, retorna array
    const regex = new RegExp(`<${tagName}(?:\\s[^>]*)?>(.*?)</${tagName}>`, "gs");
    const matches = [];
    let m;
    while ((m = regex.exec(xml)) !== null) {
      matches.push(m[1].trim());
    }
    return matches;
  }
  
  function parseNum(s) {
    if (!s) return 0;
    const n = parseFloat(String(s).trim());
    return isNaN(n) ? 0 : n;
  }
  
  function cleanItemName(raw) {
    if (!raw) return "";
    // Remove espaços extras, capitaliza
    let cleaned = raw.replace(/\s+/g, " ").trim();
    cleaned = cleaned
      .toLowerCase()
      .split(" ")
      .filter(w => w.length > 0)
      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
    return cleaned;
  }
  
  function normalizeUnit(raw) {
    const map = {
      "un": "un", "und": "un", "unid": "un",
      "kg": "kg", "g": "g", "grama": "g", "gr": "g",
      "l": "L", "lt": "L", "litro": "L", "ml": "ml",
      "cx": "cx", "caixa": "cx",
      "pct": "pct", "pacote": "pct",
      "dz": "dz", "duzia": "dz",
    };
    const k = (raw || "").toLowerCase().trim();
    return map[k] || "un";
  }
  
  // ─────────────────────────────────────────────────────────────────────
  // Parser principal — funciona para qualquer estado (XML é nacional)
  // ─────────────────────────────────────────────────────────────────────
  function parseNFCeXML(xml) {
    // ── Cabeçalho do emitente
    const emit = extractTag(xml, "emit") || "";
    const storeName = extractTag(emit, "xNome") || extractTag(xml, "xNome");
    const storeFantasy = extractTag(emit, "xFant") || extractTag(xml, "xFant");
    const storeCNPJ = extractTag(emit, "CNPJ") || extractTag(xml, "CNPJ");
    const enderEmit = extractTag(emit, "enderEmit") || "";
    const xLgr = extractTag(enderEmit, "xLgr") || "";
    const nro = extractTag(enderEmit, "nro") || "";
    const xBairro = extractTag(enderEmit, "xBairro") || "";
    const xMun = extractTag(enderEmit, "xMun") || "";
    const stateUF = extractTag(enderEmit, "UF") || "";
    const storeAddress = [
      [xLgr, nro].filter(Boolean).join(", "),
      xBairro,
      [xMun, stateUF].filter(Boolean).join("/")
    ].filter(Boolean).join(" - ");
  
    // ── Data de emissão
    const dhEmi = extractTag(xml, "dhEmi");
  
    // ── Total da nota (vNF dentro de ICMSTot)
    const icmsTot = extractTag(xml, "ICMSTot") || "";
    const totalAmount = parseNum(extractTag(icmsTot, "vNF") || extractTag(xml, "vNF"));
  
    // ── Itens (cada <det> contém um <prod>)
    // Capturamos todos os <det nItem="X">...</det>
    const detRegex = /<det\s+nItem="(\d+)">(.*?)<\/det>/gs;
    const items = [];
    let detMatch;
    while ((detMatch = detRegex.exec(xml)) !== null) {
      const [, nItem, detContent] = detMatch;
      const prod = extractTag(detContent, "prod") || "";
  
      const xProd = extractTag(prod, "xProd");
      if (!xProd) continue;
  
      const cEAN = extractTag(prod, "cEAN");
      const ean = (cEAN && cEAN !== "SEM GTIN") ? cEAN : null;
  
      const item = {
        n: parseInt(nItem, 10),
        name: cleanItemName(xProd),
        ean,
        qty: parseNum(extractTag(prod, "qCom")),
        unit: normalizeUnit(extractTag(prod, "uCom")),
        unit_price: parseNum(extractTag(prod, "vUnCom")),
        total_price: parseNum(extractTag(prod, "vProd")),
      };
      items.push(item);
    }
  
    return {
      storeName: storeName ? storeName.trim() : null,
      storeFantasy: storeFantasy ? storeFantasy.trim() : null,
      storeCNPJ,
      storeAddress: storeAddress || null,
      totalAmount,
      totalItems: items.length,
      issuedAt: dhEmi || null,
      items
    };
  }
  
  // ─────────────────────────────────────────────────────────────────────
  // HANDLER
  // ─────────────────────────────────────────────────────────────────────
  export default async function handler(req, res) {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  
    if (req.method === "OPTIONS") return res.status(200).end();
    if (req.method !== "POST") {
      return res.status(405).json({ ok: false, error: "Method not allowed" });
    }
  
    try {
      const { url, debug } = req.body || {};
      if (!url || typeof url !== "string") {
        return res.status(400).json({ ok: false, error: "URL é obrigatória" });
      }
  
      const accessKey = extractAccessKey(url);
      if (!accessKey) {
        return res.status(400).json({ ok: false, error: "URL inválida ou chave de acesso não encontrada" });
      }
  
      const parsedKey = parseAccessKey(accessKey);
      const stateName = STATE_NAMES[parsedKey.uf] || `UF ${parsedKey.uf}`;
  
      // ── Baixa o XML da SEFAZ
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 20000);
  
      let response;
      try {
        response = await fetch(url, {
          signal: controller.signal,
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8",
          }
        });
        clearTimeout(timeoutId);
      } catch (err) {
        clearTimeout(timeoutId);
        if (err.name === "AbortError") {
          return res.status(504).json({
            ok: false,
            error: `Tempo esgotado ao consultar SEFAZ ${stateName}. Tente novamente.`
          });
        }
        throw err;
      }
  
      if (!response.ok) {
        return res.status(502).json({
          ok: false,
          error: `SEFAZ ${stateName} retornou status ${response.status}`,
        });
      }
  
      const xml = await response.text();
  
      // ── Modo debug: retorna XML cru
      if (debug === true) {
        return res.status(200).json({
          ok: true,
          debug_mode: true,
          access_key: accessKey,
          xml_length: xml.length,
          xml_sample: xml.substring(0, 5000),
        });
      }
  
      // ── Parser
      const data = parseNFCeXML(xml);
  
      if (!data.items || data.items.length === 0) {
        return res.status(422).json({
          ok: false,
          error: "Não foi possível extrair os itens. Verifique se o link está correto.",
          access_key: accessKey,
          debug: { hasStoreName: !!data.storeName, xmlLength: xml.length }
        });
      }
  
      return res.status(200).json({
        ok: true,
        invoice: {
          access_key: accessKey,
          store_name: data.storeName,
          store_fantasy: data.storeFantasy,
          store_cnpj: data.storeCNPJ || parsedKey.cnpj,
          store_address: data.storeAddress,
          total_amount: data.totalAmount,
          total_items: data.totalItems,
          issued_at: data.issuedAt,
          state: stateName,
          uf: parsedKey.uf,
          raw_url: url
        },
        items: data.items
      });
  
    } catch (err) {
      console.error("[invoice-parse] erro:", err);
      return res.status(500).json({
        ok: false,
        error: "Erro interno: " + (err.message || "")
      });
    }
  }