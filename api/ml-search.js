// ═══════════════════════════════════════════════════════════════════
// FEIRA — Vercel Serverless Function
// Proxy para a API pública do Mercado Livre (resolve CORS)
//
// Endpoint: GET /api/ml-search?q=arroz
// Retorna: { query, count, results: [...] }
// ═══════════════════════════════════════════════════════════════════

export default async function handler(req, res) {
    // Permitir CORS de qualquer origem (o app é público)
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  
    if (req.method === "OPTIONS") {
      return res.status(200).end();
    }
  
    const { q, limit = 5 } = req.query;
  
    if (!q || typeof q !== "string" || q.trim().length === 0) {
      return res.status(400).json({ error: "Parâmetro 'q' é obrigatório" });
    }
  
    try {
      const url = `https://api.mercadolibre.com/sites/MLB/search?q=${encodeURIComponent(q)}&limit=${limit}`;
      const response = await fetch(url, {
        headers: { "Accept": "application/json" }
      });
  
      if (!response.ok) {
        return res.status(response.status).json({
          error: "Erro na API do Mercado Livre",
          status: response.status
        });
      }
  
      const data = await response.json();
  
      // Simplifica a resposta — só os campos que precisamos
      const results = (data.results || []).map(item => ({
        id: item.id,
        title: item.title,
        price: item.price,
        original_price: item.original_price,
        thumbnail: (item.thumbnail || "").replace("http://", "https://"),
        permalink: item.permalink,
        free_shipping: item.shipping?.free_shipping || false,
        logistic_type: item.shipping?.logistic_type || null,
        condition: item.condition,
        sold_quantity: item.sold_quantity || 0,
      }));
  
      // Cache de 5 minutos no CDN da Vercel — economiza chamadas
      res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=600");
  
      return res.status(200).json({
        query: q,
        count: results.length,
        results
      });
    } catch (err) {
      console.error("Erro ao consultar ML:", err);
      return res.status(500).json({
        error: "Erro interno do servidor",
        details: err.message
      });
    }
  }