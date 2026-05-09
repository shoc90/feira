// ═══════════════════════════════════════════════════════════════════
// FEIRA — Vercel Serverless Function v2
// Parser de NF-e (NFC-e) das SEFAZ estaduais
//
// Endpoint: POST /api/invoice-parse
// Body: { "url": "...", "debug": false }
//
// Modo debug: passa { "url": "...", "debug": true } e retorna HTML cru
// (use para investigar estrutura quando o parser não funciona)
// ═══════════════════════════════════════════════════════════════════

import { parse as parseHTML } from "node-html-parser";

const STATE_CONFIG = {
  "26": { name: "Pernambuco", parser: "pe_v1" },
  "35": { name: "São Paulo", parser: null },
  "33": { name: "Rio de Janeiro", parser: null },
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

// ═══════════════════════════════════════════════════════════════════
// PARSER PE v2 — abordagem mais robusta usando regex e múltiplos seletores
// ═══════════════════════════════════════════════════════════════════
function parsePE(html) {
  const root = parseHTML(html);

  // ─────────────────────────────────────────────────────────────────
  // ESTRATÉGIA 1: tentar IDs e classes conhecidas
  // ─────────────────────────────────────────────────────────────────
  let storeName = null;
  let storeAddress = null;
  let totalAmount = null;
  let totalItems = null;
  let issuedAt = null;
  let items = [];

  // Tenta vários seletores possíveis para o nome da loja
  const storeNameSelectors = [
    "#u20", ".txtTopo", "#topo", ".topo", "td.txtTopo",
    "h1", "h2", "h3", "h4",
    "[class*='txtTopo']", "[class*='topo']"
  ];
  for (const sel of storeNameSelectors) {
    const el = root.querySelector(sel);
    if (el && el.text && el.text.trim().length > 5) {
      storeName = el.text.trim().replace(/\s+/g, " ");
      break;
    }
  }

  // ─────────────────────────────────────────────────────────────────
  // ESTRATÉGIA 2: parser de itens via regex no texto cru
  // (mais resiliente a mudanças de layout)
  // ─────────────────────────────────────────────────────────────────
  const fullText = root.text.replace(/\s+/g, " ");

  // Total da nota
  const totalMatch = fullText.match(/Valor a Pagar[\s:R$]*([\d.,]+)/i)
    || fullText.match(/Valor Total[\s:R$]*([\d.,]+)/i)
    || fullText.match(/Total[\s:R$]*([\d.,]+)/i);
  if (totalMatch) {
    totalAmount = parseFloat(totalMatch[1].replace(".", "").replace(",", "."));
  }

  // Quantidade de itens
  const qtdMatch = fullText.match(/Qtde\s*\.?\s*total\s*de\s*itens?[\s:]*(\d+)/i);
  if (qtdMatch) {
    totalItems = parseInt(qtdMatch[1], 10);
  }

  // Data de emissão
  const dateMatch = fullText.match(/Emissão[\s:]*(\d{2}\/\d{2}\/\d{4})\s+(\d{2}:\d{2}:\d{2})/i)
    || fullText.match(/(\d{2}\/\d{2}\/\d{4})\s+(\d{2}:\d{2}:\d{2})/);
  if (dateMatch) {
    const [, date, time] = dateMatch;
    const [d, m, y] = date.split("/");
    issuedAt = `${y}-${m}-${d}T${time}-03:00`;
  }

  // ─────────────────────────────────────────────────────────────────
  // ESTRATÉGIA 3: extrair itens varrendo TODAS as tabelas
  // ─────────────────────────────────────────────────────────────────
  const allTables = root.querySelectorAll("table");

  for (const table of allTables) {
    const rows = table.querySelectorAll("tr");
    for (const row of rows) {
      const item = parsePEItemRow(row);
      if (item && item.name && item.name.length > 2) {
        // Evita duplicatas
        const dup = items.find(i => i.name === item.name && i.total_price === item.total_price);
        if (!dup) items.push(item);
      }
    }
  }

  // Estratégia 4: se ainda não tem itens, tenta extrair via regex no texto
  if (items.length === 0) {
    items = extractItemsFromText(fullText);
  }

  return {
    storeName,
    storeAddress,
    totalAmount,
    totalItems: totalItems || items.length,
    issuedAt,
    items
  };
}

function parsePEItemRow(tr) {
  try {
    const text = tr.text;
    if (!text || text.length < 10) return null;

    // Padrão típico de linha de item da NFC-e:
    // "DESCRIÇÃO ... Qtde.: X UN: KG ... Vl. Unit.: X,XX ... Vl. Total X,XX"
    const qtyMatch = text.match(/Qtde[\s.:]+([\d.,]+)/i);
    const unitMatch = text.match(/UN[\s.:]+([A-Za-z]+)/i);
    const unitPriceMatch = text.match(/Vl[\s.]?\s*Unit[\s.:]+\s*\(?R?\$?\s*([\d.,]+)/i);
    const totalMatch = text.match(/Vl[\s.]?\s*Total[\s.:]+\s*\(?R?\$?\s*([\d.,]+)/i);

    if (!qtyMatch || !totalMatch) return null;

    // Tenta extrair o nome — geralmente é a primeira parte antes de "Qtde"
    let name = "";
    const nameEl = tr.querySelector(".txtTit2") || tr.querySelector(".txtTit") || tr.querySelector("td");
    if (nameEl) {
      name = nameEl.text.trim().split(/Qtde/i)[0].trim();
    } else {
      name = text.split(/Qtde/i)[0].trim();
    }

    if (!name || name.length < 2) return null;

    return {
      name: cleanItemName(name),
      qty: parseNum(qtyMatch[1]),
      unit: normalizeUnit(unitMatch?.[1] || "un"),
      unit_price: unitPriceMatch ? parseNum(unitPriceMatch[1]) : 0,
      total_price: parseNum(totalMatch[1]),
    };
  } catch {
    return null;
  }
}

function extractItemsFromText(text) {
  const items = [];
  // Regex muito flexível: captura blocos com "Qtde.: X UN: Y ... Vl.Unit: Z ... Vl. Total W"
  const itemRegex = /(.+?)\s*Qtde[\s.:]+([\d.,]+)\s*(?:UN|Un)[\s.:]+([A-Za-z]+)\s*.*?Vl[\s.]?\s*Unit[\s.:]+\s*\(?R?\$?\s*([\d.,]+)\s*.*?Vl[\s.]?\s*Total\s*\(?R?\$?\s*([\d.,]+)/gi;

  let match;
  while ((match = itemRegex.exec(text)) !== null) {
    const [, rawName, qty, unit, unitPrice, totalPrice] = match;
    const name = cleanItemName(rawName);
    if (name && name.length > 2) {
      items.push({
        name,
        qty: parseNum(qty),
        unit: normalizeUnit(unit),
        unit_price: parseNum(unitPrice),
        total_price: parseNum(totalPrice),
      });
    }
  }
  return items;
}

function parseNum(s) {
  if (!s) return 0;
  const cleaned = String(s).trim().replace(/\./g, "").replace(",", ".");
  const n = parseFloat(cleaned);
  return isNaN(n) ? 0 : n;
}

function cleanItemName(raw) {
  if (!raw) return "";
  let cleaned = raw
    .replace(/^[\d#\s]+#\d*#?/g, "")
    .replace(/^[\d\s]+/, "")
    .replace(/#/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  // Capitalize primeira letra de cada palavra
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

// ═══════════════════════════════════════════════════════════════════
// HANDLER
// ═══════════════════════════════════════════════════════════════════
export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ ok: false, error: "Method not allowed" });

  try {
    const { url, debug } = req.body || {};
    if (!url || typeof url !== "string") {
      return res.status(400).json({ ok: false, error: "URL é obrigatória" });
    }

    const accessKey = extractAccessKey(url);
    if (!accessKey) {
      return res.status(400).json({ ok: false, error: "URL inválida" });
    }

    const parsed = parseAccessKey(accessKey);
    const config = STATE_CONFIG[parsed.uf];
    if (!config || !config.parser) {
      return res.status(400).json({
        ok: false,
        error: `Estado UF=${parsed.uf} não suportado. Suportamos: PE.`,
      });
    }

    // Baixa HTML
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000);

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8",
      }
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return res.status(502).json({
        ok: false,
        error: `SEFAZ retornou status ${response.status}`,
      });
    }

    const html = await response.text();

    // Modo debug: retorna HTML cru
    if (debug === true) {
      return res.status(200).json({
        ok: true,
        debug_mode: true,
        access_key: accessKey,
        html_length: html.length,
        html_sample: html.substring(0, 5000), // primeiros 5KB
        html_full: html, // HTML completo
      });
    }

    // Parser normal
    const data = parsePE(html);

    if (!data.items || data.items.length === 0) {
      return res.status(422).json({
        ok: false,
        error: "Não consegui extrair os itens. Use modo debug para investigar.",
        access_key: accessKey,
        debug: { hasStoreName: !!data.storeName, htmlLength: html.length }
      });
    }

    return res.status(200).json({
      ok: true,
      invoice: {
        access_key: accessKey,
        store_name: data.storeName,
        store_cnpj: parsed.cnpj,
        store_address: data.storeAddress,
        total_amount: data.totalAmount,
        total_items: data.totalItems,
        issued_at: data.issuedAt,
        state: config.name,
        uf: parsed.uf,
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