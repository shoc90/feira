// ═══════════════════════════════════════════════════════════════════
// FEIRA — Vercel Serverless Function
// Parser de NF-e (NFC-e) das SEFAZ estaduais
//
// Endpoint: POST /api/invoice-parse
// Body: { "url": "https://nfce.sefaz.pe.gov.br:444/..." }
// Retorna: { ok, invoice: {...}, items: [...] }
//
// INSTALAÇÃO:
// Este arquivo precisa do pacote node-html-parser. Adicione em package.json:
//   "dependencies": { "node-html-parser": "^6.1.13" }
// ═══════════════════════════════════════════════════════════════════

import { parse as parseHTML } from "node-html-parser";

// ─────────────────────────────────────────────────────────────────────
// Configuração por estado (UF)
// ─────────────────────────────────────────────────────────────────────
const STATE_CONFIG = {
  // PE — Pernambuco
  "26": {
    name: "Pernambuco",
    domain: "nfce.sefaz.pe.gov.br",
    parser: "pe_v1"
  },
  // SP — São Paulo
  "35": {
    name: "São Paulo",
    domain: "nfce.fazenda.sp.gov.br",
    parser: null // ainda não suportado
  },
  // RJ — Rio de Janeiro
  "33": {
    name: "Rio de Janeiro",
    domain: "consultadfe.fazenda.rj.gov.br",
    parser: null
  },
  // Adicione outros estados aqui conforme demanda
};

// ─────────────────────────────────────────────────────────────────────
// Validação e extração da chave de acesso (44 dígitos)
// ─────────────────────────────────────────────────────────────────────
function extractAccessKey(url) {
  // O parâmetro "p" da URL contém: chave|versao|tpAmb|dhEmi|vNF|digestValue
  // Pegamos só os 44 primeiros dígitos
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
    aamm: key.substring(2, 6),
    cnpj: key.substring(6, 20),
    modelo: key.substring(20, 22),
    serie: key.substring(22, 25),
    numero: key.substring(25, 34),
  };
}

// ─────────────────────────────────────────────────────────────────────
// Parser SEFAZ-PE v1
// HTML estrutura observada (pode variar levemente):
// - tabela com #tabResult contendo tr's de itens
// - cada tr tem: descrição, quantidade, unidade, valor unitário, valor total
// - cabeçalho com nome do supermercado, CNPJ, endereço, total
// ─────────────────────────────────────────────────────────────────────
function parsePE(html) {
  const root = parseHTML(html);

  // Nome e CNPJ do estabelecimento
  const storeNameEl = root.querySelector(".txtTopo");
  const storeName = storeNameEl ? storeNameEl.text.trim() : null;

  // Endereço
  const enderecoEl = root.querySelector(".text");
  const storeAddress = enderecoEl ? enderecoEl.text.trim().replace(/\s+/g, " ") : null;

  // Itens — múltiplas estruturas possíveis, vamos cobrir as principais
  let items = [];

  // Estrutura A: tabela com #tabResult
  const tabResult = root.querySelector("#tabResult");
  if (tabResult) {
    const trs = tabResult.querySelectorAll("tr");
    for (const tr of trs) {
      const item = parsePEItemRow(tr);
      if (item) items.push(item);
    }
  }

  // Estrutura B: divs com classe .txtTit2 (algumas versões)
  if (items.length === 0) {
    const itemDivs = root.querySelectorAll(".txtTit2");
    for (const div of itemDivs) {
      const parent = div.parentNode;
      if (!parent) continue;
      const item = parsePEItemFromDiv(parent);
      if (item) items.push(item);
    }
  }

  // Total da nota
  const totalEl = root.querySelector(".totalNumb");
  let totalAmount = null;
  if (totalEl) {
    totalAmount = parseFloat(totalEl.text.trim().replace(".", "").replace(",", "."));
  }

  // Quantidade total de itens
  const qtdItensEl = root.querySelector(".totalNumb.txtMax");
  let totalItems = items.length || null;

  // Data de emissão — geralmente está em uma <li> ou span
  let issuedAt = null;
  const allText = root.text;
  const dateMatch = allText.match(/(\d{2}\/\d{2}\/\d{4})\s+(\d{2}:\d{2}:\d{2})/);
  if (dateMatch) {
    const [, date, time] = dateMatch;
    const [d, m, y] = date.split("/");
    issuedAt = `${y}-${m}-${d}T${time}-03:00`;
  }

  return {
    storeName,
    storeAddress,
    totalAmount,
    totalItems,
    issuedAt,
    items
  };
}

function parsePEItemRow(tr) {
  // Tenta extrair de uma linha de tabela
  try {
    const desc = tr.querySelector(".txtTit2, .txtTit");
    const qty = tr.querySelector(".Rqtd, .qtd");
    const unit = tr.querySelector(".RUN, .un");
    const unitPrice = tr.querySelector(".RvlUnit, .vlUnit");
    const totalPrice = tr.querySelector(".valor, .vlTotal, .RvlTotal");

    if (!desc) return null;

    const name = desc.text.trim().replace(/\s+/g, " ");
    if (!name) return null;

    const qtyText = qty ? qty.text.replace(/[^\d,.\-]/g, "").replace(",", ".") : "1";
    const unitText = unit ? unit.text.replace(/[^a-zA-Zçãáéíóú]/gi, "").toLowerCase() : "un";
    const unitPriceText = unitPrice ? unitPrice.text.replace(/[^\d,.\-]/g, "").replace(",", ".") : "0";
    const totalPriceText = totalPrice ? totalPrice.text.replace(/[^\d,.\-]/g, "").replace(",", ".") : "0";

    return {
      name: cleanItemName(name),
      qty: parseFloat(qtyText) || 1,
      unit: normalizeUnit(unitText),
      unit_price: parseFloat(unitPriceText) || 0,
      total_price: parseFloat(totalPriceText) || 0,
    };
  } catch {
    return null;
  }
}

function parsePEItemFromDiv(parent) {
  try {
    const text = parent.text;
    const name = (parent.querySelector(".txtTit2") || parent.querySelector(".txtTit"))?.text.trim();
    if (!name) return null;

    // Padrões comuns no HTML da SEFAZ-PE:
    //   "Qtde.: 1,000 UN: KG ... Vl. Unit.: 5,99 ... Vl. Total 5,99"
    const qtyMatch = text.match(/Qtde[\s.:]+([\d.,]+)/i);
    const unitMatch = text.match(/UN[\s.:]+([A-Za-z]+)/i);
    const unitPriceMatch = text.match(/Vl[\s.]?Unit[\s.:]+([\d.,]+)/i);
    const totalMatch = text.match(/Vl[\s.]?Total[\s.:]+([\d.,]+)/i);

    return {
      name: cleanItemName(name),
      qty: qtyMatch ? parseFloat(qtyMatch[1].replace(".", "").replace(",", ".")) : 1,
      unit: unitMatch ? normalizeUnit(unitMatch[1]) : "un",
      unit_price: unitPriceMatch ? parseFloat(unitPriceMatch[1].replace(".", "").replace(",", ".")) : 0,
      total_price: totalMatch ? parseFloat(totalMatch[1].replace(".", "").replace(",", ".")) : 0,
    };
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────
// Normalização de nomes (NF traz tudo em CAIXA ALTA com abreviações)
// ─────────────────────────────────────────────────────────────────────
function cleanItemName(raw) {
  if (!raw) return "";

  // Remove códigos de produto no início (ex: "7896013100966 #0#VINAGRE")
  let cleaned = raw
    .replace(/^[\d#\s]+#\d*#?/g, "")           // remove "1234 #0#" no início
    .replace(/^[\d\s]+/, "")                   // remove dígitos soltos no início
    .replace(/#/g, " ")                        // remove #'s
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

// ─────────────────────────────────────────────────────────────────────
// HANDLER principal
// ─────────────────────────────────────────────────────────────────────
export default async function handler(req, res) {
  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ ok: false, error: "Method not allowed" });

  try {
    const { url } = req.body || {};
    if (!url || typeof url !== "string") {
      return res.status(400).json({ ok: false, error: "URL é obrigatória" });
    }

    // 1. Extrai chave de acesso
    const accessKey = extractAccessKey(url);
    if (!accessKey) {
      return res.status(400).json({ ok: false, error: "URL inválida ou chave de acesso não encontrada" });
    }

    // 2. Identifica o estado
    const parsed = parseAccessKey(accessKey);
    const config = STATE_CONFIG[parsed.uf];
    if (!config) {
      return res.status(400).json({
        ok: false,
        error: `Estado UF=${parsed.uf} não suportado ainda`,
        access_key: accessKey
      });
    }

    if (!config.parser) {
      return res.status(400).json({
        ok: false,
        error: `Estado ${config.name} ainda não suportado. Suportamos: Pernambuco.`,
        access_key: accessKey
      });
    }

    // 3. Baixa o HTML da SEFAZ
    const fetchTimeout = 15000; // 15s
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), fetchTimeout);

    let html;
    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8",
        }
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        return res.status(502).json({
          ok: false,
          error: `SEFAZ ${config.name} retornou status ${response.status}. Tente novamente em alguns minutos.`,
          access_key: accessKey
        });
      }

      html = await response.text();
    } catch (err) {
      clearTimeout(timeoutId);
      if (err.name === "AbortError") {
        return res.status(504).json({
          ok: false,
          error: `Tempo esgotado ao consultar SEFAZ ${config.name}. Tente novamente.`,
          access_key: accessKey
        });
      }
      throw err;
    }

    // 4. Parser específico do estado
    let parsed_data;
    if (config.parser === "pe_v1") {
      parsed_data = parsePE(html);
    } else {
      return res.status(500).json({ ok: false, error: "Parser não implementado" });
    }

    // 5. Validações finais
    if (!parsed_data.items || parsed_data.items.length === 0) {
      return res.status(422).json({
        ok: false,
        error: "Não consegui extrair os itens. A página da SEFAZ pode estar fora do ar ou ter mudado o layout.",
        access_key: accessKey,
        debug: { hasStoreName: !!parsed_data.storeName, htmlLength: html.length }
      });
    }

    // 6. Resposta
    return res.status(200).json({
      ok: true,
      invoice: {
        access_key: accessKey,
        store_name: parsed_data.storeName,
        store_cnpj: parsed.cnpj,
        store_address: parsed_data.storeAddress,
        total_amount: parsed_data.totalAmount,
        total_items: parsed_data.totalItems,
        issued_at: parsed_data.issuedAt,
        state: config.name,
        uf: parsed.uf,
        raw_url: url
      },
      items: parsed_data.items
    });

  } catch (err) {
    console.error("[invoice-parse] erro:", err);
    return res.status(500).json({
      ok: false,
      error: "Erro interno ao processar a nota. " + (err.message || "")
    });
  }
}