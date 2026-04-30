import { useState, useEffect } from "react";
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

const CATEGORIES = [
  { id:"hortifruti", label:"Hortifruti", emoji:"🥦", keywords:["alface","tomate","cenoura","batata","cebola","alho","limão","limao","laranja","banana","maçã","maca","uva","abacate","espinafre","brócolis","brocolis","couve","pepino","pimentão"] },
  { id:"laticinios", label:"Laticínios", emoji:"🥛", keywords:["leite","queijo","iogurte","manteiga","requeijão","requeijao","creme de leite","nata","ovos","ovo","ricota"] },
  { id:"carnes", label:"Carnes", emoji:"🥩", keywords:["carne","frango","peixe","linguiça","linguica","salsicha","bacon","presunto","bife","costela","filé","file","patinho","picanha","alcatra","salmão","salmao","atum","camarão","camarao"] },
  { id:"padaria", label:"Padaria", emoji:"🍞", keywords:["pão","pao","bolo","biscoito","bolacha","torrada","croissant","broa","farinha"] },
  { id:"limpeza", label:"Limpeza", emoji:"🧹", keywords:["sabão","sabao","detergente","desinfetante","cloro","multiuso","esponja","vassoura","rodo","pano","amaciante","limpador","papel higiênico","papel higienico"] },
  { id:"higiene", label:"Higiene", emoji:"🧴", keywords:["shampoo","condicionador","sabonete","creme","desodorante","absorvente","fralda","escova","pasta de dente","creme dental","perfume","hidratante"] },
  { id:"bebidas", label:"Bebidas", emoji:"🧃", keywords:["suco","refrigerante","água","agua","cerveja","vinho","café","cafe","chá","cha","energético","energetico"] },
  { id:"congelados", label:"Congelados", emoji:"🧊", keywords:["pizza","lasanha","sorvete","hambúrguer","hamburguer","nuggets","empanado","congelado"] },
  { id:"mercearia", label:"Mercearia", emoji:"🛒", keywords:["arroz","feijão","feijao","macarrão","macarrao","azeite","óleo","oleo","açúcar","acucar","sal","molho","extrato","atum","sardinha","milho","ervilha","vinagre","ketchup","maionese","mostarda","tempero","caldo"] },
  { id:"outros", label:"Outros", emoji:"📦", keywords:[] },
];

function guessCategory(name) {
  const lower = name.toLowerCase();
  for (const cat of CATEGORIES.slice(0, -1)) {
    if (cat.keywords.some(k => lower.includes(k))) return cat.id;
  }
  return "outros";
}

const LIST_ICONS = ["🛒","🏗️","🏠","🎁","🐾","💊","📚","🌿","🧺","⚽"];
const STORES = [
  { id:"ml", label:"Mercado Livre", short:"Mercado Livre", emoji:"🛍️" },
  { id:"amazon", label:"Amazon", short:"Amazon", emoji:"📦" },
];

// ═════════════════════════════════════════════════════════════════════
// FAKE PRICES
// ═════════════════════════════════════════════════════════════════════
function fakePrice(name, mult = 1) {
  const seed = name.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  const base = 4.9 + ((seed * 9301 + 49297) % 233280) / 233280 * 85;
  return Math.round(base * mult * 100) / 100;
}
function getResults(name) {
  const q = encodeURIComponent(name);
  const base = fakePrice(name);
  return {
    ml: [
      { id:"ml1", title:`${name} — Marca Premium`, price:base, delivery:"Chega amanhã", freeShipping:base>49, rating:4.5, url:`https://lista.mercadolivre.com.br/${q}?partner_id=${AFFILIATE.ml}` },
      { id:"ml2", title:`${name} — Embalagem Econômica`, price:fakePrice(name+"2",0.82), delivery:"Chega em 2 dias", freeShipping:false, rating:4.1, url:`https://lista.mercadolivre.com.br/${q}?partner_id=${AFFILIATE.ml}` },
    ],
    amazon: [
      { id:"a1", title:`${name} — Amazon's Choice`, price:fakePrice(name+"a",0.91), delivery:"Prime: amanhã", freeShipping:true, rating:4.7, url:`https://www.amazon.com.br/s?k=${q}&tag=${AFFILIATE.amazon}` },
      { id:"a2", title:`${name} — Pacote Família`, price:fakePrice(name+"a2",1.08), delivery:"Chega em 3 dias", freeShipping:false, rating:4.2, url:`https://www.amazon.com.br/s?k=${q}&tag=${AFFILIATE.amazon}` },
    ],
  };
}

// ═════════════════════════════════════════════════════════════════════
// LOGO
// ═════════════════════════════════════════════════════════════════════
function FeiraLogo({ size = 32, color = C.graphite, accent = C.sage }) {
  return (
    <svg width={size} height={size} viewBox="0 0 60 60">
      <circle cx="30" cy="30" r="26" fill="none" stroke={color} strokeWidth="2"/>
      <path d="M19 32 L26 39 L41 23" fill="none" stroke={accent} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function FeiraLockup({ color = C.graphite, accent = C.sage, size = 1 }) {
  return (
    <div style={{ display:"flex", alignItems:"center", gap: 10*size }}>
      <FeiraLogo size={28*size} color={color} accent={accent} />
      <span style={{ fontFamily:"'Fraunces', Georgia, serif", fontSize: 28*size, fontWeight:500, color, letterSpacing:"-0.5px" }}>feira</span>
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
function AuthScreen() {
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

  const handleSignup = async () => {
    if (!email || !password || !name || !cep) { setError("Preencha todos os campos"); return; }
    if (password.length < 6) { setError("Senha precisa ter pelo menos 6 caracteres"); return; }
    setLoading(true); setError(null);
    try {
      const { data, error: signErr } = await supabase.auth.signUp({
        email, password, options: { data: { name } }
      });
      if (signErr) throw signErr;
      if (data.user) {
        await supabase.from("profiles").upsert({
          id: data.user.id, name, email, cep,
          city: cepInfo?.localidade || null,
          state: cepInfo?.uf || null,
          street: cepInfo?.logradouro || null,
          neighborhood: cepInfo?.bairro || null,
        });
      }
      if (data.session) window.location.reload();
      else setEmailSent(true);
    } catch (e) { setError(e.message || "Erro ao criar conta"); }
    setLoading(false);
  };

  const handleLogin = async () => {
    if (!email || !password) { setError("Preencha email e senha"); return; }
    setLoading(true); setError(null);
    try {
      const { error: loginErr } = await supabase.auth.signInWithPassword({ email, password });
      if (loginErr) throw loginErr;
    } catch (e) {
      setError(e.message === "Invalid login credentials" ? "Email ou senha incorretos" : (e.message || "Erro ao entrar"));
    }
    setLoading(false);
  };

  const handleOAuth = async (provider) => {
    setError(null);
    try {
      const { error: oerr } = await supabase.auth.signInWithOAuth({
        provider, options: { redirectTo: window.location.origin }
      });
      if (oerr) throw oerr;
    } catch (e) { setError(e.message); }
  };

  if (emailSent) {
    return (
      <div style={{ minHeight:"100vh",background:C.sand,display:"flex",alignItems:"center",justifyContent:"center",padding:"24px",fontFamily:"'DM Sans',sans-serif" }}>
        <div style={{ maxWidth:380,textAlign:"center" }}>
          <FeiraLogo size={48} />
          <h2 style={{ fontFamily:"'Fraunces',serif",fontSize:24,fontWeight:500,color:C.graphite,marginTop:24,marginBottom:10 }}>Confirme seu email</h2>
          <p style={{ color:C.stone,fontSize:14,lineHeight:1.6 }}>Enviamos um link de confirmação para<br /><strong style={{ color:C.graphite }}>{email}</strong></p>
          <p style={{ color:C.stoneSoft,fontSize:12,marginTop:16,lineHeight:1.6 }}>Após confirmar, volte aqui e faça login.</p>
          <button onClick={()=>{setEmailSent(false);setMode("login")}} style={{ marginTop:24,padding:"12px 24px",background:C.graphite,color:C.sand,border:"none",borderRadius:11,fontSize:14,fontWeight:500,cursor:"pointer",fontFamily:"'DM Sans',sans-serif" }}>Voltar para login</button>
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
        <FeiraLogo size={56} />
        <h1 style={{ fontFamily:"'Fraunces',serif",fontSize:34,fontWeight:500,color:C.graphite,letterSpacing:"-0.8px",marginTop:18 }}>feira</h1>
        <p style={{ color:C.stone,fontSize:13,marginTop:6 }}>Sua feira, organizada.</p>
      </div>

      <div style={{ display:"flex",gap:6,marginBottom:24,padding:4,background:C.linen,borderRadius:12 }}>
        <button onClick={()=>{setMode("login");setError(null)}} style={{ flex:1,padding:"10px",borderRadius:9,background:mode==="login"?C.sand:"transparent",color:mode==="login"?C.graphite:C.stone,border:"none",fontWeight:500,fontSize:14,cursor:"pointer",fontFamily:"'DM Sans',sans-serif",boxShadow:mode==="login"?"0 1px 3px rgba(0,0,0,0.06)":"none" }}>Entrar</button>
        <button onClick={()=>{setMode("signup");setError(null)}} style={{ flex:1,padding:"10px",borderRadius:9,background:mode==="signup"?C.sand:"transparent",color:mode==="signup"?C.graphite:C.stone,border:"none",fontWeight:500,fontSize:14,cursor:"pointer",fontFamily:"'DM Sans',sans-serif",boxShadow:mode==="signup"?"0 1px 3px rgba(0,0,0,0.06)":"none" }}>Criar conta</button>
      </div>

      <div style={{ display:"flex",flexDirection:"column",gap:8,marginBottom:18 }}>
        <button onClick={()=>handleOAuth("google")} style={{ padding:"12px",background:"#fff",border:`1px solid ${C.linenDim}`,borderRadius:11,color:C.graphite,fontSize:14,fontWeight:500,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:10,fontFamily:"'DM Sans',sans-serif" }}>
          <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
          Continuar com Google
        </button>
        <button onClick={()=>handleOAuth("apple")} style={{ padding:"12px",background:C.graphite,border:"none",borderRadius:11,color:C.sand,fontSize:14,fontWeight:500,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:10,fontFamily:"'DM Sans',sans-serif" }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/></svg>
          Continuar com Apple
        </button>
      </div>

      <div style={{ display:"flex",alignItems:"center",gap:10,margin:"6px 0 18px" }}>
        <div style={{ flex:1,height:1,background:C.linenDim }} />
        <span style={{ color:C.stoneSoft,fontSize:11 }}>ou com email</span>
        <div style={{ flex:1,height:1,background:C.linenDim }} />
      </div>

      <div style={{ display:"flex",flexDirection:"column",gap:10 }}>
        {mode==="signup" && (
          <input style={inp} placeholder="Seu nome" value={name} onChange={e=>setName(e.target.value)} />
        )}
        <input style={inp} placeholder="Email" type="email" value={email} onChange={e=>setEmail(e.target.value)} autoComplete="email" />
        <input style={inp} placeholder="Senha" type="password" value={password} onChange={e=>setPassword(e.target.value)} autoComplete={mode==="login"?"current-password":"new-password"} />
        {mode==="signup" && (
          <>
            <input style={inp} placeholder="CEP (00000-000)" value={cep} onChange={e=>handleCepChange(e.target.value)} inputMode="numeric" pattern="[0-9]*" type="tel" />
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

      <button onClick={mode==="login"?handleLogin:handleSignup} disabled={loading} style={{ width:"100%",padding:"14px",background:C.graphite,border:"none",borderRadius:12,color:C.sand,fontWeight:500,cursor:loading?"wait":"pointer",fontSize:15,marginTop:18,fontFamily:"'DM Sans',sans-serif",opacity:loading?0.7:1 }}>
        {loading?"Aguarde...":(mode==="login"?"Entrar":"Criar conta")}
      </button>

      {mode==="signup" && (
        <p style={{ color:C.stoneSoft,fontSize:11,textAlign:"center",marginTop:14,lineHeight:1.6 }}>
          Ao criar conta você concorda com nossos termos.<br />Seus dados ficam seguros e privados.
        </p>
      )}
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════
// MODAL SHELL
// ═════════════════════════════════════════════════════════════════════
function Modal({ onClose, title, children, footer }) {
  return (
    <div style={{ position:"fixed",inset:0,background:"rgba(15,18,24,0.65)",zIndex:1000,display:"flex",alignItems:"flex-start",justifyContent:"center",backdropFilter:"blur(4px)",padding:"0 12px" }} onClick={onClose}>
      <div style={{ background:C.sand,borderRadius:18,marginTop:"max(24px, env(safe-area-inset-top))",width:"100%",maxWidth:460,maxHeight:"calc(100vh - 48px)",display:"flex",flexDirection:"column",animation:"slideDown 0.25s ease",boxShadow:"0 10px 40px rgba(0,0,0,0.25)",overflow:"hidden" }} onClick={e=>e.stopPropagation()}>
        <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",padding:"18px 20px 14px",borderBottom:`1px solid ${C.linen}`,flexShrink:0 }}>
          <h3 style={{ color:C.graphite,fontSize:19,fontFamily:"'Fraunces',serif",fontWeight:500,letterSpacing:"-0.3px" }}>{title}</h3>
          <button onClick={onClose} style={{ background:"none",border:"none",color:C.stoneSoft,fontSize:20,cursor:"pointer",padding:4 }}>✕</button>
        </div>
        <div style={{ padding:"18px 20px",overflowY:"auto",flex:1 }}>{children}</div>
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
// ITEM DETAIL MODAL (novo - tela 3 reformulada)
// ═════════════════════════════════════════════════════════════════════
function ItemDetailModal({ item, enabledStores, onClose, onMarkPurchased }) {
  // Tab ativa: primeira loja habilitada por padrão
  const activeStores = STORES.filter(s => enabledStores.includes(s.id));
  const [tab, setTab] = useState(activeStores[0]?.id || "ml");
  const [loading, setLoading] = useState(true);
  const [results, setResults] = useState(null);

  // Estado da Loja física
  const [storePrice, setStorePrice] = useState("");
  const [storeError, setStoreError] = useState(null);

  useEffect(() => {
    setLoading(true);
    const t = setTimeout(() => { setResults(getResults(item.name)); setLoading(false); }, 600);
    return () => clearTimeout(t);
  }, [item.name]);

  const formatBRL = (v) => {
    const digits = v.replace(/\D/g, "");
    if (!digits) return "";
    const num = parseInt(digits, 10) / 100;
    return num.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  // Marca como comprado em ML/Amazon e abre o link em nova aba
  // IMPORTANTE: window.open() PRECISA ser chamado de forma síncrona no clique,
  // senão navegadores móveis (Safari iOS, Chrome Android) bloqueiam como popup.
  // Por isso abrimos a aba ANTES de chamar onMarkPurchased (que é async).
  const handleMarkAndOpen = (productUrl, price) => {
    // Abre a aba imediatamente (resposta síncrona ao clique do usuário)
    // Se o navegador bloquear popups, a aba simplesmente não abre — preferimos
    // isso a redirecionar a página atual e perder o contexto do app.
    try {
      window.open(productUrl, "_blank", "noopener,noreferrer");
    } catch (e) {
      // Silencioso: se falhar, o usuário pode tocar de novo
    }

    // Marca como comprado em segundo plano
    onMarkPurchased(tab, price);
    onClose();
  };

  // Marca como comprado na loja física (com valor manual)
  const handleStoreSubmit = () => {
    const cleaned = storePrice.replace(/\./g, "").replace(",", ".");
    const num = parseFloat(cleaned);
    if (isNaN(num) || num <= 0) { setStoreError("Digite um valor válido"); return; }
    onMarkPurchased("store", num);
    onClose();
  };

  // Tabs incluindo Loja física
  const tabs = [
    ...activeStores.map(s => ({ id: s.id, label: s.short, emoji: s.emoji })),
    { id: "store", label: "Loja", emoji: "🏪" }
  ];

  return (
    <Modal
      onClose={onClose}
      title={item.name}
      footer={
        tab !== "store" ? (
          <button onClick={onClose} style={{ width:"100%",padding:"13px",background:C.linen,border:`1px solid ${C.linenDim}`,borderRadius:11,color:C.stone,cursor:"pointer",fontSize:14,fontFamily:"'DM Sans',sans-serif" }}>
            Voltar sem escolher
          </button>
        ) : (
          <div style={{ display:"flex",gap:8 }}>
            <button onClick={onClose} style={{ flex:1,padding:"13px",background:C.linen,border:`1px solid ${C.linenDim}`,borderRadius:11,color:C.stone,cursor:"pointer",fontSize:14,fontFamily:"'DM Sans',sans-serif" }}>Voltar</button>
            <button onClick={handleStoreSubmit} style={{ flex:2,padding:"13px",background:C.graphite,border:"none",borderRadius:11,color:C.sand,fontWeight:500,cursor:"pointer",fontSize:15,fontFamily:"'DM Sans',sans-serif" }}>Marcar como comprado</button>
          </div>
        )
      }
    >
      {/* Tabs com 3 botões: ML, Amazon, Loja */}
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

      {/* Aba Loja física */}
      {tab === "store" && (
        <div>
          <p style={{ color:C.inkSoft,fontSize:13,marginBottom:14,lineHeight:1.5 }}>
            Digite quanto você pagou por este item na loja física.
          </p>
          <p style={{ color:C.stone,fontSize:11,marginBottom:6,textTransform:"uppercase",letterSpacing:1 }}>Valor pago (R$)</p>
          <input
            style={{ ...inp, fontSize:22, fontWeight:500, fontFamily:"'Fraunces',serif" }}
            placeholder="0,00"
            value={storePrice}
            onChange={e => setStorePrice(formatBRL(e.target.value))}
            inputMode="numeric"
            pattern="[0-9]*"
            type="tel"
            autoFocus
          />
          {storeError && (
            <div style={{ background:`${C.danger}15`,border:`1px solid ${C.danger}55`,borderRadius:9,padding:"10px 12px",marginTop:12 }}>
              <p style={{ color:C.danger,fontSize:13 }}>{storeError}</p>
            </div>
          )}
        </div>
      )}

      {/* Abas ML e Amazon */}
      {tab !== "store" && (
        <>
          {loading ? (
            <div style={{ textAlign:"center",padding:"32px 0",color:C.stone }}>
              <div style={{ width:32,height:32,margin:"0 auto 10px",border:`2px solid ${C.linenDim}`,borderTop:`2px solid ${C.sage}`,borderRadius:"50%",animation:"spin 0.8s linear infinite" }} />
              <p style={{ fontSize:13 }}>Buscando preços...</p>
            </div>
          ) : results && results[tab].map(p => (
            <div key={p.id} style={{ background:C.linen,borderRadius:14,border:`1px solid ${C.linenDim}`,padding:"14px",marginBottom:9 }}>
              <div style={{ display:"flex",justifyContent:"space-between",marginBottom:5 }}>
                <span style={{ fontSize:10,color:C.stone,fontWeight:500,textTransform:"uppercase",letterSpacing:0.8 }}>{STORES.find(s=>s.id===tab)?.emoji} {STORES.find(s=>s.id===tab)?.label}</span>
                <span style={{ fontSize:11,color:C.stoneSoft }}>★ {p.rating}</span>
              </div>
              <p style={{ color:C.ink,fontSize:13,marginBottom:10,lineHeight:1.4 }}>{p.title}</p>
              <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-end",marginBottom:12 }}>
                <span style={{ color:C.graphite,fontWeight:500,fontSize:24,fontFamily:"'Fraunces',serif",letterSpacing:"-0.5px" }}>R$ {p.price.toFixed(2).replace(".",",")}</span>
                <div style={{ textAlign:"right" }}>
                  <p style={{ color:p.freeShipping?C.sageDeep:C.stone,fontSize:11,fontWeight:500 }}>{p.freeShipping?"Frete grátis":"+ frete"}</p>
                  <p style={{ color:C.stoneSoft,fontSize:11 }}>{p.delivery}</p>
                </div>
              </div>
              <button
                onClick={()=>handleMarkAndOpen(p.url, p.price)}
                style={{
                  width:"100%", padding:"11px",borderRadius:9,fontWeight:600,fontSize:13,
                  background:C.sage,color:C.graphite,border:"none",cursor:"pointer",fontFamily:"'DM Sans',sans-serif"
                }}
              >
                Comprar e marcar como comprado →
              </button>
            </div>
          ))}
          <p style={{ color:C.stoneSoft,fontSize:10,textAlign:"center",marginTop:6,fontStyle:"italic" }}>preços simulados · API em breve</p>
        </>
      )}
    </Modal>
  );
}

// ═════════════════════════════════════════════════════════════════════
// ITEM ROW (tela limpa - imagem 2)
// ═════════════════════════════════════════════════════════════════════
function ItemRow({ item, onToggle, onOpen, onCategoryChange, onDelete }) {
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
          onClick={(e)=>{ e.stopPropagation(); onToggle(); }}
          style={{
            width:26,height:26,borderRadius:7,flexShrink:0,
            background:item.done?C.sage:"transparent",
            border:`1.5px solid ${item.done?C.sage:C.stoneSoft}`,
            cursor:"pointer",fontSize:13,display:"flex",alignItems:"center",justifyContent:"center",
            color:C.graphite,fontWeight:700,transition:"all 0.2s"
          }}
        >{item.done?"✓":""}</button>

        <div style={{ flex:1,minWidth:0 }}>
          <p style={{ fontWeight:500,fontSize:15,color:item.done?C.stone:C.graphite,textDecoration:item.done?"line-through":"none",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",fontFamily:"'DM Sans',sans-serif" }}>{item.name}</p>
          <p style={{ color:C.stoneSoft,fontSize:11,marginTop:1 }}>
            {item.qty} {item.unit}
            {item.done && item.bought_at ? ` · ✓ ${item.bought_at === "store" ? "Loja" : STORES.find(s=>s.id===item.bought_at)?.short}` : ""}
          </p>
        </div>

        <button
          onClick={(e)=>{ e.stopPropagation(); setShowCatPicker(true); }}
          title="Editar categoria"
          style={{
            background:C.linen,border:`1px solid ${C.linenDim}`,borderRadius:8,
            width:34,height:34,fontSize:16,cursor:"pointer",
            display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0
          }}
        >{cat.emoji}</button>

        <button
          onClick={(e)=>{ e.stopPropagation(); onDelete(); }}
          style={{ background:"none",border:"none",color:C.stoneSoft,fontSize:14,cursor:"pointer",padding:"0 2px" }}
        >✕</button>
      </div>

      {showCatPicker && <CategoryPicker current={item.category} onChange={onCategoryChange} onClose={()=>setShowCatPicker(false)} />}
    </>
  );
}

// ═════════════════════════════════════════════════════════════════════
// ADD ITEM MODAL (com categoria editável)
// ═════════════════════════════════════════════════════════════════════
function AddItemModal({ onAdd, onClose }) {
  const [name, setName] = useState("");
  const [qty, setQty] = useState("1");
  const [unit, setUnit] = useState("un");
  const [note, setNote] = useState("");
  const [category, setCategory] = useState(null); // null = usa sugestão automática
  const [showCatPicker, setShowCatPicker] = useState(false);

  // Categoria efetiva: manual escolhida ou sugestão pelo nome
  const effectiveCategory = category || (name.trim() ? guessCategory(name.trim()) : "outros");
  const catObj = CATEGORIES.find(c => c.id === effectiveCategory) || CATEGORIES[9];
  const isSuggested = !category && name.trim();

  const handle = () => {
    if (!name.trim()) return;
    onAdd({ name:name.trim(), qty, unit, category: effectiveCategory, note });
    onClose();
  };

  return (
    <>
      <Modal
        onClose={onClose}
        title="Novo item"
        footer={
          <div style={{ display:"flex",gap:8 }}>
            <button onClick={onClose} style={{ flex:1,padding:"13px",background:C.linen,border:`1px solid ${C.linenDim}`,borderRadius:11,color:C.stone,cursor:"pointer",fontSize:14,fontFamily:"'DM Sans',sans-serif" }}>Cancelar</button>
            <button onClick={handle} style={{ flex:2,padding:"13px",background:C.graphite,border:"none",borderRadius:11,color:C.sand,fontWeight:500,cursor:"pointer",fontSize:15,fontFamily:"'DM Sans',sans-serif" }}>Adicionar</button>
          </div>
        }
      >
        <div style={{ display:"flex",flexDirection:"column",gap:9 }}>
          <input style={inp} placeholder="Nome do item" value={name} onChange={e=>setName(e.target.value)} autoFocus onKeyDown={e=>e.key==="Enter"&&handle()} />

          {/* Categoria (sugerida ou escolhida) - clicável para editar */}
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
          <input style={inp} placeholder="Observação (opcional)" value={note} onChange={e=>setNote(e.target.value)} />
        </div>
      </Modal>

      {showCatPicker && (
        <CategoryPicker
          current={effectiveCategory}
          onChange={(cid)=>setCategory(cid)}
          onClose={()=>setShowCatPicker(false)}
        />
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
      <input style={{ ...inp,marginBottom:16 }} placeholder="Nome da lista" value={name} onChange={e=>setName(e.target.value)} autoFocus onKeyDown={e=>e.key==="Enter"&&handle()} />
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
function ScreenLists({ lists, listCounts, onOpen, onAdd, onDelete, profile }) {
  const [showAdd, setShowAdd] = useState(false);
  return (
    <div style={{ paddingBottom:84 }}>
      <div style={{ padding:"44px 18px 18px",display:"flex",justifyContent:"space-between",alignItems:"center" }}>
        <FeiraLockup size={0.85} />
        {profile?.name && <p style={{ color:C.stone,fontSize:12,fontFamily:"'DM Sans',sans-serif" }}>Olá, {profile.name.split(" ")[0]}</p>}
      </div>

      <div style={{ padding:"0 14px 8px" }}>
        <p style={{ color:C.stone,fontSize:10,textTransform:"uppercase",letterSpacing:1.8,fontWeight:500,marginBottom:12,paddingLeft:4 }}>Minhas listas</p>
      </div>

      <div style={{ padding:"0 14px",display:"flex",flexDirection:"column",gap:9 }}>
        {lists.map((list,idx) => {
          const counts = listCounts[list.id] || { done:0, total:0 };
          const pct = counts.total ? Math.round((counts.done/counts.total)*100) : 0;
          return (
            <div key={list.id} style={{ animation:`fadeIn 0.3s ease ${idx*0.05}s both` }}>
              <div onClick={()=>onOpen(list)} style={{ background:"#FAF8F4",borderRadius:16,padding:"16px",cursor:"pointer",border:`1px solid ${C.linen}` }}>
                <div style={{ display:"flex",alignItems:"center",gap:13 }}>
                  <div style={{ width:46,height:46,borderRadius:12,background:C.linen,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,flexShrink:0 }}>{list.icon}</div>
                  <div style={{ flex:1,minWidth:0 }}>
                    <p style={{ fontWeight:500,fontSize:16,marginBottom:3,color:C.graphite,fontFamily:"'DM Sans',sans-serif" }}>{list.name}</p>
                    <p style={{ color:C.stone,fontSize:12 }}>{counts.total===0?"Lista vazia":`${counts.done}/${counts.total} comprados`}</p>
                    {counts.total>0 && <div style={{ height:3,background:C.linen,borderRadius:3,marginTop:7 }}><div style={{ height:"100%",width:`${pct}%`,background:C.sage,borderRadius:3,transition:"width 0.4s" }} /></div>}
                  </div>
                  <button onClick={e=>{e.stopPropagation();onDelete(list.id)}} style={{ background:"none",border:"none",color:C.stoneSoft,fontSize:14,cursor:"pointer",padding:6 }}>✕</button>
                </div>
              </div>
            </div>
          );
        })}
        <button onClick={()=>setShowAdd(true)} style={{ background:"transparent",border:`1.5px dashed ${C.linenDim}`,borderRadius:16,padding:"17px",cursor:"pointer",color:C.stone,fontSize:14,display:"flex",alignItems:"center",justifyContent:"center",gap:8,fontFamily:"'DM Sans',sans-serif" }}>
          <span style={{ fontSize:18,color:C.sage }}>+</span> Nova lista
        </button>
      </div>
      {showAdd && <AddListModal onAdd={async list=>{await onAdd(list);setShowAdd(false)}} onClose={()=>setShowAdd(false)} />}
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════
// SCREEN: LIST DETAIL
// ═════════════════════════════════════════════════════════════════════
function ScreenListDetail({ list, items, onBack, enabledStores, onAddItem, onToggleItem, onDeleteItem, onChangeCategory, onMarkPurchased, onToggleAll }) {
  const [showAdd, setShowAdd] = useState(false);
  const [openItem, setOpenItem] = useState(null);
  const [filter, setFilter] = useState("todos");
  const [sortBy, setSortBy] = useState("categoria");

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
      <div style={{ padding:"40px 16px 14px",background:C.linen }}>
        <button onClick={onBack} style={{ background:"none",border:"none",color:C.stone,fontSize:13,cursor:"pointer",marginBottom:12,display:"flex",alignItems:"center",gap:5,fontFamily:"'DM Sans',sans-serif" }}>← Voltar</button>
        <div style={{ display:"flex",alignItems:"center",gap:12,marginBottom:13 }}>
          <div style={{ width:46,height:46,borderRadius:12,background:C.sand,display:"flex",alignItems:"center",justifyContent:"center",fontSize:24 }}>{list.icon}</div>
          <div style={{ flex:1,minWidth:0 }}>
            <h2 style={{ fontFamily:"'Fraunces',serif",fontSize:24,fontWeight:500,color:C.graphite,letterSpacing:"-0.3px" }}>{list.name}</h2>
            <p style={{ color:C.stone,fontSize:12,marginTop:1 }}>{done}/{total} comprados</p>
          </div>
        </div>
        {total>0 && <div style={{ height:4,background:C.linenDim,borderRadius:4 }}><div style={{ height:"100%",width:`${progress}%`,borderRadius:4,background:C.sage,transition:"width 0.5s" }} /></div>}
      </div>

      {total > 0 && (
        <div style={{ display:"flex",gap:8,padding:"12px 14px 4px",alignItems:"center" }}>
          <select
            value={sortBy}
            onChange={e=>setSortBy(e.target.value)}
            style={{
              flex:1, padding:"7px 10px", background:C.linen, border:`1px solid ${C.linenDim}`,
              borderRadius:9, color:C.ink, fontSize:12, fontFamily:"'DM Sans',sans-serif",
              outline:"none", cursor:"pointer"
            }}
          >
            <option value="categoria">📂 Por categoria</option>
            <option value="ordem">↕ Ordem de criação</option>
            <option value="alfabetica">🔤 Ordem alfabética</option>
          </select>
          <button
            onClick={()=>onToggleAll(!allDone)}
            style={{
              padding:"7px 13px", borderRadius:9, flexShrink:0,
              background: allDone ? C.linen : C.graphite,
              border:`1px solid ${allDone ? C.linenDim : C.graphite}`,
              color: allDone ? C.ink : C.sand,
              fontSize:12, fontWeight:500, cursor:"pointer", fontFamily:"'DM Sans',sans-serif"
            }}
          >
            {allDone ? "Desmarcar todos" : "Marcar todos"}
          </button>
        </div>
      )}

      <div style={{ display:"flex",gap:6,padding:"8px 14px 4px",overflowX:"auto" }}>
        {filterTabs.map(({v,l})=>(
          <button key={v} onClick={()=>setFilter(v)} style={{ padding:"6px 13px",borderRadius:18,flexShrink:0,background:filter===v?C.graphite:"transparent",border:`1px solid ${filter===v?C.graphite:C.linenDim}`,color:filter===v?C.sand:C.stone,fontSize:12,fontWeight:500,cursor:"pointer",fontFamily:"'DM Sans',sans-serif" }}>{l}</button>
        ))}
      </div>

      <div style={{ padding:"6px 14px" }}>
        {filteredAndSorted.length===0 && (
          <div style={{ textAlign:"center",padding:"50px 20px",color:C.stoneSoft }}>
            <div style={{ fontSize:34,marginBottom:8,opacity:0.5 }}>🛒</div>
            <p style={{ color:C.stone,fontSize:14 }}>Nenhum item aqui</p>
          </div>
        )}
        {filteredAndSorted.map(item=>(
          <ItemRow
            key={item.id}
            item={item}
            onToggle={()=>onToggleItem(item)}
            onOpen={()=>setOpenItem(item)}
            onDelete={()=>onDeleteItem(item.id)}
            onCategoryChange={(cid)=>onChangeCategory(item.id,cid)}
          />
        ))}
      </div>

      <button onClick={()=>setShowAdd(true)} style={{ position:"fixed",bottom:80,right:16,width:54,height:54,borderRadius:"50%",background:C.sage,border:"none",fontSize:26,cursor:"pointer",boxShadow:`0 6px 20px ${C.sage}66, 0 2px 6px rgba(26,31,42,0.15)`,display:"flex",alignItems:"center",justifyContent:"center",color:C.graphite,fontWeight:600,zIndex:100 }}>+</button>

      {showAdd && <AddItemModal onAdd={async item=>{await onAddItem(item);setShowAdd(false)}} onClose={()=>setShowAdd(false)} />}
      {openItem && (
        <ItemDetailModal
          item={openItem}
          enabledStores={enabledStores}
          onClose={()=>setOpenItem(null)}
          onMarkPurchased={(storeId, price)=>onMarkPurchased(openItem, storeId, price)}
        />
      )}
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════
// SCREEN: HISTORY
// ═════════════════════════════════════════════════════════════════════
function ScreenHistory({ history, onDeleteRecord, onDeleteMany }) {
  const [storeFilter, setStoreFilter] = useState("all");
  const [sortBy, setSortBy] = useState("data");
  const [selectedIds, setSelectedIds] = useState(new Set());

  const fmtDate = (iso) => iso ? new Date(iso).toLocaleDateString("pt-BR",{day:"2-digit",month:"short",year:"numeric"}) : "—";

  const labelFor = (storeId) => {
    if (storeId === "store") return "Loja física";
    return STORES.find(s=>s.id===storeId)?.label || "—";
  };
  const emojiFor = (storeId) => {
    if (storeId === "store") return "🏪";
    return STORES.find(s=>s.id===storeId)?.emoji || "🛒";
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

  const toggleSelect = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const visibleIds = filteredAndSorted.map(i => i.id);
  const allSelected = visibleIds.length > 0 && visibleIds.every(id => selectedIds.has(id));

  const toggleAll = () => {
    if (allSelected) {
      setSelectedIds(prev => {
        const next = new Set(prev);
        visibleIds.forEach(id => next.delete(id));
        return next;
      });
    } else {
      setSelectedIds(prev => {
        const next = new Set(prev);
        visibleIds.forEach(id => next.add(id));
        return next;
      });
    }
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
      <div style={{ padding:"44px 18px 18px" }}>
        <p style={{ color:C.stone,fontSize:10,textTransform:"uppercase",letterSpacing:1.8,fontWeight:500,marginBottom:6 }}>Histórico</p>
        <h2 style={{ fontFamily:"'Fraunces',serif",fontSize:26,fontWeight:500,color:C.graphite,letterSpacing:"-0.5px" }}>Compras realizadas</h2>
      </div>

      {history.length > 0 && (
        <div style={{ display:"flex",gap:8,padding:"0 14px 10px",alignItems:"center" }}>
          <select
            value={sortBy}
            onChange={e=>setSortBy(e.target.value)}
            style={{
              flex:1, padding:"7px 10px", background:C.linen, border:`1px solid ${C.linenDim}`,
              borderRadius:9, color:C.ink, fontSize:12, fontFamily:"'DM Sans',sans-serif",
              outline:"none", cursor:"pointer"
            }}
          >
            <option value="data">📅 Data de compra</option>
            <option value="alfabetica">🔤 Ordem alfabética</option>
            <option value="categoria">📂 Por categoria</option>
          </select>
          <button
            onClick={toggleAll}
            style={{
              padding:"7px 13px", borderRadius:9, flexShrink:0,
              background: allSelected ? C.linen : C.graphite,
              border:`1px solid ${allSelected ? C.linenDim : C.graphite}`,
              color: allSelected ? C.ink : C.sand,
              fontSize:12, fontWeight:500, cursor:"pointer", fontFamily:"'DM Sans',sans-serif"
            }}
          >
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
          <div style={{ textAlign:"center",padding:"50px 20px",color:C.stoneSoft }}>
            <div style={{ fontSize:38,marginBottom:10,opacity:0.5 }}>📋</div>
            <p style={{ color:C.stone,fontSize:14 }}>Nenhuma compra registrada</p>
          </div>
        ) : (
          filteredAndSorted.map((item)=>{
            const isSelected = selectedIds.has(item.id);
            return (
              <div
                key={item.id}
                style={{
                  background: isSelected ? `${C.sage}22` : "#FAF8F4",
                  borderRadius:13, padding:"13px 14px", marginBottom:8,
                  border:`1px solid ${isSelected ? C.sage : C.linen}`,
                  display:"flex", alignItems:"center", gap:12,
                  transition:"background 0.15s"
                }}
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={()=>toggleSelect(item.id)}
                  style={{ width:18,height:18,accentColor:C.sage,cursor:"pointer",margin:0,flexShrink:0 }}
                />
                <div style={{ width:38,height:38,borderRadius:10,background:C.linen,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0 }}>{emojiFor(item.store)}</div>
                <div style={{ flex:1,minWidth:0 }}>
                  <p style={{ fontWeight:500,fontSize:14,color:C.graphite,marginBottom:2,fontFamily:"'DM Sans',sans-serif" }}>{item.item_name}</p>
                  <p style={{ color:C.stone,fontSize:11 }}>
                    {item.qty} {item.unit} · {labelFor(item.store)} · {fmtDate(item.purchased_at)}
                    {item.price ? ` · R$ ${Number(item.price).toFixed(2).replace(".", ",")}` : ""}
                  </p>
                </div>
                <button
                  onClick={()=>{ if (window.confirm("Apagar este registro do histórico?")) onDeleteRecord(item.id); }}
                  style={{ background:"none",border:"none",color:C.stoneSoft,fontSize:14,cursor:"pointer",padding:6,flexShrink:0 }}
                  title="Apagar registro"
                >✕</button>
              </div>
            );
          })
        )}
      </div>

      {hasSelection && (
        <div style={{
          position:"fixed", bottom:56, left:"50%", transform:"translateX(-50%)",
          width:"100%", maxWidth:480, padding:"12px 16px",
          background:C.sand, borderTop:`1px solid ${C.linen}`,
          display:"flex", alignItems:"center", justifyContent:"space-between", gap:12,
          zIndex:150,
          boxShadow:"0 -4px 20px rgba(0,0,0,0.06)"
        }}>
          <p style={{ color:C.ink, fontSize:13, fontFamily:"'DM Sans',sans-serif" }}>
            <strong>{selectedIds.size}</strong> {selectedIds.size === 1 ? "selecionado" : "selecionados"}
          </p>
          <button
            onClick={handleDeleteSelected}
            disabled={selectedIds.size === 0}
            style={{
              padding:"10px 18px", borderRadius:11,
              background: selectedIds.size === 0 ? C.linen : C.danger,
              border:"none", color: selectedIds.size === 0 ? C.stoneSoft : "#fff",
              fontSize:13, fontWeight:600, cursor: selectedIds.size === 0 ? "not-allowed" : "pointer",
              fontFamily:"'DM Sans',sans-serif"
            }}
          >
            Apagar selecionados
          </button>
        </div>
      )}
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════
// SCREEN: SETTINGS
// ═════════════════════════════════════════════════════════════════════
function ScreenSettings({ profile, onSave, onLogout }) {
  const [name, setName] = useState(profile?.name||"");
  const [cep, setCep] = useState(profile?.cep||"");
  const [cepInfo, setCepInfo] = useState(profile?.city ? {
    logradouro: profile.street || "",
    bairro: profile.neighborhood || "",
    localidade: profile.city,
    uf: profile.state || ""
  } : null);
  const [cepLoading, setCepLoading] = useState(false);
  const [maxDays, setMaxDays] = useState(profile?.max_delivery_days||7);
  const [enabledStores, setEnabledStores] = useState(profile?.enabled_stores||["ml","amazon"]);
  const [notifications, setNotifications] = useState(profile?.notifications_enabled!==false);

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
    } else {
      setCepInfo(null);
    }
  };

  const handleSave = () => {
    onSave({
      name, cep,
      city: cepInfo?.localidade || null,
      state: cepInfo?.uf || null,
      street: cepInfo?.logradouro || null,
      neighborhood: cepInfo?.bairro || null,
      max_delivery_days: maxDays,
      enabled_stores: enabledStores,
      notifications_enabled: notifications
    });
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
      <div style={{ padding:"44px 18px 18px" }}>
        <p style={{ color:C.stone,fontSize:10,textTransform:"uppercase",letterSpacing:1.8,fontWeight:500,marginBottom:6 }}>Conta</p>
        <h2 style={{ fontFamily:"'Fraunces',serif",fontSize:26,fontWeight:500,color:C.graphite,letterSpacing:"-0.5px" }}>Configurações</h2>
      </div>

      <div style={{ padding:"0 14px" }}>
        <Section title="Dados cadastrais">
          <div style={{ padding:"14px 16px",borderBottom:`1px solid ${C.linen}` }}>
            <p style={{ color:C.stone,fontSize:11,marginBottom:6 }}>Nome</p>
            <input style={inp} placeholder="Seu nome" value={name} onChange={e=>setName(e.target.value)} />
          </div>
          <div style={{ padding:"14px 16px",borderBottom:`1px solid ${C.linen}` }}>
            <p style={{ color:C.stone,fontSize:11,marginBottom:6 }}>Email</p>
            <input style={{ ...inp,background:C.linen,color:C.stone }} value={profile?.email||""} disabled />
          </div>
          <div style={{ padding:"14px 16px" }}>
            <p style={{ color:C.stone,fontSize:11,marginBottom:6 }}>CEP</p>
            <input
              style={inp}
              placeholder="00000-000"
              value={cep}
              onChange={e=>handleCepChange(e.target.value)}
              inputMode="numeric"
              pattern="[0-9]*"
              type="tel"
            />
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

        <div style={{ display:"flex",alignItems:"center",justifyContent:"center",gap:8,padding:"14px",border:`1px solid ${C.linen}`,borderRadius:13 }}>
          <FeiraLogo size={20} color={C.stoneSoft} accent={C.stoneSoft} />
          <p style={{ color:C.stoneSoft,fontSize:11,fontFamily:"'Fraunces',serif",fontStyle:"italic" }}>feira · v1.3</p>
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
    <div style={{ position:"fixed",bottom:0,left:"50%",transform:"translateX(-50%)",width:"100%",maxWidth:480,background:C.sand,borderTop:`1px solid ${C.linen}`,display:"flex",zIndex:200,paddingBottom:"env(safe-area-inset-bottom)" }}>
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
// MAIN APP
// ═════════════════════════════════════════════════════════════════════
export default function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [lists, setLists] = useState([]);
  const [items, setItems] = useState([]);
  const [history, setHistory] = useState([]);
  const [activeList, setActiveList] = useState(null);
  const [tab, setTab] = useState("lists");
  const [savedMsg, setSavedMsg] = useState(false);

  // Janela de desfazer silenciosa: backend permite reverter por 1 minuto
  // Guarda timestamps de marcações recentes em memória
  const [recentMarks, setRecentMarks] = useState({}); // { itemId: timestamp }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session }}) => {
      setSession(session); setLoading(false);
    });
    const { data: { subscription }} = supabase.auth.onAuthStateChange((_event, session) => setSession(session));
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session?.user) return;
    loadProfile();
    loadLists();
    loadHistory();
  }, [session]);

  const loadProfile = async () => {
    const { data } = await supabase.from("profiles").select("*").eq("id", session.user.id).single();
    if (data) setProfile(data);
  };

  const loadLists = async () => {
    const { data } = await supabase.from("lists").select("*").order("created_at", { ascending: true });
    if (data) setLists(data);
  };

  const loadHistory = async () => {
    const { data } = await supabase.from("purchase_history").select("*").order("purchased_at", { ascending: false }).limit(200);
    if (data) setHistory(data);
  };

  useEffect(() => {
    if (!activeList) { setItems([]); return; }
    loadItems(activeList.id);
  }, [activeList]);

  const loadItems = async (listId) => {
    const { data } = await supabase.from("items").select("*").eq("list_id", listId).order("created_at", { ascending: true });
    if (data) setItems(data);
  };

  const [listCounts, setListCounts] = useState({});
  useEffect(() => {
    if (!session?.user || lists.length === 0) return;
    supabase.from("items").select("list_id, done").eq("user_id", session.user.id).then(({ data }) => {
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
    const { data } = await supabase.from("lists").insert({ ...list, user_id: session.user.id }).select().single();
    if (data) setLists(prev => [...prev, data]);
  };

  const deleteList = async (id) => {
    if (!window.confirm("Excluir esta lista?")) return;
    await supabase.from("lists").delete().eq("id", id);
    setLists(prev => prev.filter(l => l.id !== id));
  };

  const addItem = async (item) => {
    const { data } = await supabase.from("items").insert({ ...item, list_id: activeList.id, user_id: session.user.id }).select().single();
    if (data) setItems(prev => [...prev, data]);
  };

  // Toggle simples (checkbox direto na lista)
  const toggleItem = async (item) => {
    const newDone = !item.done;
    const { data } = await supabase.from("items").update({
      done: newDone,
      bought_at: newDone ? item.bought_at : null,
      bought_date: newDone ? new Date().toISOString() : null,
    }).eq("id", item.id).select().single();
    if (data) setItems(prev => prev.map(i => i.id===item.id ? data : i));
    setTimeout(loadHistory, 300);
  };

  const deleteItem = async (id) => {
    await supabase.from("items").delete().eq("id", id);
    setItems(prev => prev.filter(i => i.id !== id));
  };

  const changeCategory = async (id, category) => {
    const { data } = await supabase.from("items").update({ category }).eq("id", id).select().single();
    if (data) setItems(prev => prev.map(i => i.id===id ? data : i));
  };

  // Marca como comprado em loja específica
  // NOTA: a abertura da URL em nova aba é feita pelo ItemDetailModal de forma SÍNCRONA
  // no clique do usuário, para não ser bloqueada por navegadores móveis.
  const markPurchased = async (item, storeId, price) => {
    // Se já está marcado nesta loja, desmarca
    if (item.done && item.bought_at === storeId) {
      const { data } = await supabase.from("items").update({
        done: false, bought_at: null, bought_date: null, bought_price: null
      }).eq("id", item.id).select().single();
      if (data) setItems(prev => prev.map(i => i.id===item.id ? data : i));
      setTimeout(loadHistory, 300);
      return;
    }

    const { data } = await supabase.from("items").update({
      done: true, bought_at: storeId, bought_date: new Date().toISOString(),
      bought_price: price ?? null,
    }).eq("id", item.id).select().single();

    if (data) {
      setItems(prev => prev.map(i => i.id===item.id ? data : i));
      // Marca para janela silenciosa de desfazer (60s)
      setRecentMarks(prev => ({ ...prev, [item.id]: Date.now() }));
      setTimeout(loadHistory, 500);
    }
  };

  const toggleAllItems = async (markAsDone) => {
    if (!activeList) return;
    const updates = { done: markAsDone };
    if (!markAsDone) {
      updates.bought_at = null;
      updates.bought_date = null;
      updates.bought_price = null;
    }
    const { data } = await supabase.from("items")
      .update(updates)
      .eq("list_id", activeList.id)
      .select();
    if (data) setItems(data);
    setTimeout(loadHistory, 300);
  };

  const deleteHistoryRecord = async (recordId) => {
    await supabase.from("purchase_history").delete().eq("id", recordId);
    setHistory(prev => prev.filter(h => h.id !== recordId));
  };

  const deleteHistoryMany = async (ids) => {
    await supabase.from("purchase_history").delete().in("id", ids);
    setHistory(prev => prev.filter(h => !ids.includes(h.id)));
  };

  const saveProfile = async (updates) => {
    const { data } = await supabase.from("profiles").update(updates).eq("id", session.user.id).select().single();
    if (data) {
      setProfile(data);
      setSavedMsg(true);
      setTimeout(() => setSavedMsg(false), 2000);
    }
  };

  const handleLogout = async () => {
    if (!window.confirm("Tem certeza que deseja sair?")) return;
    await supabase.auth.signOut();
    setSession(null); setProfile(null); setLists([]); setItems([]);
  };

  if (loading) {
    return (
      <div style={{ minHeight:"100vh",background:C.sand,display:"flex",alignItems:"center",justifyContent:"center" }}>
        <div style={{ width:40,height:40,border:`3px solid ${C.linenDim}`,borderTop:`3px solid ${C.sage}`,borderRadius:"50%",animation:"spin 0.8s linear infinite" }} />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  if (!session) return <AuthScreen />;

  const enabledStores = profile?.enabled_stores?.length ? profile.enabled_stores : ["ml","amazon"];

  return (
    <div style={{ minHeight:"100vh",background:C.sand,fontFamily:"'DM Sans',sans-serif",color:C.graphite,maxWidth:480,margin:"0 auto",position:"relative" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:wght@400;500;600&family=DM+Sans:wght@400;500;600&display=swap');
        *{margin:0;padding:0;box-sizing:border-box}
        body{background:${C.sand}}
        @keyframes slideDown{from{transform:translateY(-30px);opacity:0}to{transform:translateY(0);opacity:1}}
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

      {activeList ? (
        <ScreenListDetail
          list={activeList} items={items} onBack={()=>setActiveList(null)}
          enabledStores={enabledStores}
          onAddItem={addItem} onToggleItem={toggleItem} onDeleteItem={deleteItem}
          onChangeCategory={changeCategory} onMarkPurchased={markPurchased}
          onToggleAll={toggleAllItems}
        />
      ) : (
        <>
          {tab==="lists" && <ScreenLists lists={lists} listCounts={listCounts} onOpen={setActiveList} onAdd={addList} onDelete={deleteList} profile={profile} />}
          {tab==="history" && <ScreenHistory history={history} onDeleteRecord={deleteHistoryRecord} onDeleteMany={deleteHistoryMany} />}
          {tab==="settings" && <ScreenSettings profile={profile} onSave={saveProfile} onLogout={handleLogout} />}
        </>
      )}

      <BottomNav tab={activeList?"lists":tab} setTab={(t)=>{ setActiveList(null); setTab(t); }} />
    </div>
  );
}