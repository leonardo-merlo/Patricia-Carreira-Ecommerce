<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Meu painel — Patrícia Carreira</title>
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --text:          #1a1a1a;
    --text-2:        #555;
    --text-3:        #999;
    --surface:       #ffffff;
    --surface-2:     #f5f4f1;
    --border:        rgba(0,0,0,.08);
    --border-strong: rgba(0,0,0,.16);
    --accent:        #7c5cbf;
    --accent-hover:  #6a4daa;
    --red:           #c0392b;
    --yellow:        #b07d1a;
    --green:         #2e7d32;
    font-size: 14px;
  }

  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    background: var(--surface-2);
    color: var(--text);
    line-height: 1.5;
    min-height: 100vh;
  }

  /* ── topo ── */
  .topbar {
    background: var(--surface);
    border-bottom: 1px solid var(--border);
    display: flex; align-items: center; justify-content: space-between;
    padding: 0 24px; height: 52px; position: sticky; top: 0; z-index: 10;
  }
  .topbar-brand {
    font-size: 13px; font-weight: 600; color: var(--text);
    display: flex; align-items: center; gap: 8px;
  }
  .topbar-brand span { color: var(--text-3); font-weight: 400; }
  .topbar-right { display: flex; align-items: center; gap: 12px; }
  .user-chip {
    display: flex; align-items: center; gap: 8px;
    padding: 4px 10px 4px 4px;
    border: 1px solid var(--border); border-radius: 99px;
    cursor: pointer;
  }
  .user-avatar {
    width: 26px; height: 26px; border-radius: 50%;
    background: linear-gradient(135deg,#c9b6c9,#8b6b8b);
    display: flex; align-items: center; justify-content: center;
    font-size: 10px; font-weight: 700; color: #fff; flex-shrink: 0;
  }
  .user-name { font-size: 12px; font-weight: 500; color: var(--text); }

  /* ── layout ── */
  .page { max-width: 820px; margin: 0 auto; padding: 24px 20px 48px; }

  /* ── hero ── */
  .hero { margin-bottom: 22px; }
  .hero-greeting { font-size: 20px; font-weight: 600; color: var(--text); }
  .hero-sub { font-size: 13px; color: var(--text-3); margin-top: 2px; }

  /* ── cupom ── */
  .cupom-block {
    display: inline-flex; align-items: center; gap: 10px;
    margin-top: 12px;
    background: var(--surface); border: 1px solid var(--border);
    border-radius: 8px; padding: 9px 14px;
  }
  .cupom-label { font-size: 11px; color: var(--text-3); font-weight: 500; text-transform: uppercase; letter-spacing: .06em; }
  .cupom-code {
    font-family: 'Courier New', monospace; font-size: 15px;
    font-weight: 700; color: var(--accent); letter-spacing: .08em;
  }
  .cupom-discount {
    font-size: 11px; color: var(--text-3);
    padding-left: 10px; border-left: 1px solid var(--border);
  }
  .icon-btn {
    width: 28px; height: 28px; border-radius: 6px;
    border: 1px solid var(--border); background: transparent;
    cursor: pointer; display: inline-flex; align-items: center;
    justify-content: center; color: var(--text-3);
    transition: background .15s, color .15s;
  }
  .icon-btn:hover { background: var(--surface-2); color: var(--text-2); }

  /* ── period ── */
  .period-row {
    display: flex; align-items: center; justify-content: space-between;
    margin-bottom: 14px;
  }
  .section-label {
    font-size: 11px; font-weight: 600; text-transform: uppercase;
    letter-spacing: .08em; color: var(--text-3);
  }
  .period-sel { display: flex; gap: 4px; }
  .period-pill {
    font-size: 12px; padding: 4px 12px; border-radius: 99px;
    border: 1px solid var(--border-strong); background: transparent;
    color: var(--text-2); cursor: pointer; transition: all .15s;
  }
  .period-pill.active { background: var(--accent); border-color: var(--accent); color: #fff; }

  /* ── metrics ── */
  .metrics-grid {
    display: grid; grid-template-columns: repeat(3, minmax(0,1fr));
    gap: 12px; margin-bottom: 14px;
  }
  .metric-card {
    background: var(--surface); border: 1px solid var(--border);
    border-radius: 10px; padding: 14px 16px;
  }
  .metric-label { font-size: 11px; color: var(--text-3); margin-bottom: 6px; font-weight: 500; }
  .metric-value { font-size: 22px; font-weight: 600; color: var(--text); line-height: 1; }
  .metric-delta { font-size: 11px; margin-top: 4px; }
  .metric-delta.up  { color: var(--green); }
  .metric-delta.down{ color: var(--red); }
  .metric-delta.neu { color: var(--text-3); }

  /* ── receber card ── */
  .receber-card {
    background: linear-gradient(135deg, #5a3f9a, var(--accent));
    border-radius: 10px; padding: 16px 20px;
    display: flex; align-items: center; justify-content: space-between;
    margin-bottom: 16px;
  }
  .rec-label  { font-size: 11px; color: rgba(255,255,255,.6); text-transform: uppercase; letter-spacing:.08em; margin-bottom:4px; }
  .rec-value  { font-size: 28px; font-weight: 700; color: #fff; line-height:1; }
  .rec-status { display:flex; align-items:center; gap:5px; margin-top:6px; }
  .status-dot { width:6px; height:6px; border-radius:50%; flex-shrink:0; }
  .status-dot.yellow { background:#FAC775; }
  .status-dot.green  { background:#97C459; }
  .rec-status-text   { font-size:12px; color:rgba(255,255,255,.8); }
  .rec-right         { text-align:right; }
  .rec-pay-label     { font-size:11px; color:rgba(255,255,255,.5); margin-bottom:2px; }
  .rec-pay-date      { font-size:15px; font-weight:600; color:#fff; }
  .rec-pay-method    { font-size:11px; color:rgba(255,255,255,.55); margin-top:1px; }

  /* ── cards ── */
  .card {
    background: var(--surface); border: 1px solid var(--border);
    border-radius: 10px; overflow: hidden; margin-bottom: 14px;
  }
  .card-header {
    display: flex; align-items: center; justify-content: space-between;
    padding: 12px 18px; border-bottom: 1px solid var(--border);
  }
  .card-header-title { font-size: 13px; font-weight: 600; color: var(--text); }
  .card-body { padding: 16px 18px; }
  .card-body.flush { padding: 0; }

  /* ── bar chart ── */
  .bar-row   { display:flex; align-items:center; gap:10px; margin-bottom:9px; }
  .bar-row:last-child { margin-bottom:0; }
  .bar-label { font-size:12px; color:var(--text-3); width:24px; text-align:right; flex-shrink:0; }
  .bar-track { flex:1; height:5px; background:var(--surface-2); border-radius:99px; overflow:hidden; }
  .bar-fill  { height:100%; border-radius:99px; background:var(--accent); }
  .bar-count { font-size:12px; font-weight:600; color:var(--text); width:20px; flex-shrink:0; }

  /* ── table ── */
  .table-wrap { overflow-x: auto; }
  .tbl { width: 100%; border-collapse: collapse; }
  .tbl th {
    text-align: left; font-size: 11px; font-weight: 600; color: var(--text-3);
    text-transform: uppercase; letter-spacing: .06em;
    padding: 10px 18px; border-bottom: 1px solid var(--border); white-space: nowrap;
  }
  .tbl td {
    padding: 11px 18px; font-size: 13px;
    border-bottom: 1px solid var(--border); vertical-align: middle;
  }
  .tbl tr:last-child td { border-bottom: none; }
  .tbl tr:hover td { background: var(--surface-2); }

  /* ── badges ── */
  .badge {
    display: inline-flex; align-items: center;
    padding: 2px 8px; border-radius: 99px;
    font-size: 11px; font-weight: 500;
  }
  .badge.pago        { background: #e8f5e9; color: var(--green); }
  .badge.pendente    { background: #fff8e1; color: var(--yellow); }
  .badge.processando { background: #e8eaf6; color: #3949ab; }

  /* ── two cols ── */
  .two-cols { display:grid; grid-template-columns:1fr 1fr; gap:14px; margin-bottom:14px; }

  /* ── timeline ── */
  .tl-item { display:flex; gap:12px; padding-bottom:14px; }
  .tl-item:last-child { padding-bottom:0; }
  .tl-left { display:flex; flex-direction:column; align-items:center; width:16px; flex-shrink:0; }
  .tl-dot  { width:8px; height:8px; border-radius:50%; background:var(--accent); flex-shrink:0; margin-top:4px; }
  .tl-dot.gray { background:var(--border-strong); }
  .tl-line { width:1px; flex:1; background:var(--border); margin-top:3px; }
  .tl-item:last-child .tl-line { display:none; }
  .tl-title { font-size:13px; color:var(--text); margin-bottom:1px; display:flex; align-items:center; gap:7px; }
  .tl-meta  { font-size:11px; color:var(--text-3); }

  /* ── btn ── */
  .btn {
    display:inline-flex; align-items:center; gap:6px;
    padding:7px 14px; border-radius:7px; font-size:13px;
    font-weight:500; cursor:pointer; border:1px solid transparent;
    transition:background .15s, border-color .15s, color .15s;
  }
  .btn.ghost { background:transparent; border-color:var(--border-strong); color:var(--text-2); }
  .btn.ghost:hover { background:var(--surface-2); }
  .btn.sm { padding:5px 10px; font-size:12px; }

  /* ── num ── */
  .num { font-variant-numeric: tabular-nums; }

  /* ── tabs ── */
  .tabs {
    display:flex; gap:2px; border-bottom:1px solid var(--border);
    padding:0 18px; background:var(--surface);
    border-radius:10px 10px 0 0; border:1px solid var(--border);
    margin-bottom:0;
  }
  .tab {
    padding:10px 14px; font-size:13px; font-weight:500;
    color:var(--text-3); cursor:pointer; border:none; background:none;
    border-bottom:2px solid transparent; margin-bottom:-1px;
    transition:color .15s, border-color .15s;
  }
  .tab.active { color:var(--accent); border-bottom-color:var(--accent); }

  /* ── tab content ── */
  .tab-content { margin-top:0; }

  @media(max-width:600px){
    .metrics-grid  { grid-template-columns:1fr 1fr; }
    .two-cols      { grid-template-columns:1fr; }
    .receber-card  { flex-direction:column; gap:12px; }
    .rec-right     { text-align:left; }
    .cupom-block   { flex-wrap:wrap; }
  }
</style>
</head>
<body>

<!-- ── TOPBAR ── -->
<div class="topbar">
  <div class="topbar-brand">
    Patrícia Carreira <span>/ área da afiliada</span>
  </div>
  <div class="topbar-right">
    <div class="user-chip">
      <div class="user-avatar">LS</div>
      <span class="user-name">Larissa Santos</span>
    </div>
    <button class="btn ghost sm" style="border:none;color:var(--text-3);padding:4px 8px">
      <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/></svg>
      Sair
    </button>
  </div>
</div>

<div class="page">

  <!-- ── HERO ── -->
  <div class="hero">
    <div class="hero-greeting">Olá, Larissa 👋</div>
    <div class="hero-sub">Aqui estão os seus dados de afiliada — maio de 2026</div>

    <div class="cupom-block">
      <span class="cupom-label">Seu cupom</span>
      <span class="cupom-code">LARI15</span>
      <button class="icon-btn" id="btn-copiar-cupom" title="Copiar código" onclick="copiarCupom()">
        <svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
      </button>
      <span class="cupom-discount">15% de desconto para seus clientes</span>
    </div>
    <div id="cupom-copied" style="display:none;font-size:11px;color:var(--green);margin-top:5px">
      ✓ Copiado!
    </div>
  </div>

  <!-- ── TABS ── -->
  <div class="tabs" style="margin-bottom:20px">
    <button class="tab active" onclick="switchTab('resumo',this)">Resumo</button>
    <button class="tab" onclick="switchTab('vendas',this)">Minhas vendas</button>
    <button class="tab" onclick="switchTab('pagamentos',this)">Pagamentos</button>
  </div>

  <!-- ════════════════════════════════════════ -->
  <!-- TAB: RESUMO                             -->
  <!-- ════════════════════════════════════════ -->
  <div id="tab-resumo" class="tab-content">

    <div class="period-row">
      <span class="section-label">mês de referência</span>
      <div class="period-sel">
        <button class="period-pill" onclick="setPeriod(this)">Mar</button>
        <button class="period-pill" onclick="setPeriod(this)">Abr</button>
        <button class="period-pill active" onclick="setPeriod(this)">Mai</button>
      </div>
    </div>

    <!-- métricas -->
    <div class="metrics-grid">
      <div class="metric-card">
        <div class="metric-label">Vendas no mês</div>
        <div class="metric-value num">23</div>
        <div class="metric-delta up">↑ 4 vs. abril</div>
      </div>
      <div class="metric-card">
        <div class="metric-label">Receita gerada</div>
        <div class="metric-value num" style="font-size:19px">R$4.870</div>
        <div class="metric-delta up">↑ R$620</div>
      </div>
      <div class="metric-card">
        <div class="metric-label">Comissão do mês</div>
        <div class="metric-value num" style="font-size:19px;color:var(--accent)">R$730</div>
        <div class="metric-delta neu">15% sobre receita</div>
      </div>
    </div>

    <!-- a receber -->
    <div class="receber-card">
      <div>
        <div class="rec-label">total a receber</div>
        <div class="rec-value">R$ 1.290</div>
        <div class="rec-status">
          <div class="status-dot yellow"></div>
          <span class="rec-status-text">Pagamento em processamento</span>
        </div>
      </div>
      <div class="rec-right">
        <div class="rec-pay-label">previsão de pagamento</div>
        <div class="rec-pay-date">10 jun, 2026</div>
        <div class="rec-pay-method">via PIX · chave CPF</div>
      </div>
    </div>

    <!-- barras + últimos pagamentos -->
    <div class="two-cols">
      <div class="card">
        <div class="card-header">
          <span class="card-header-title">Vendas por semana</span>
          <span style="font-size:11px;color:var(--text-3)">mai/26</span>
        </div>
        <div class="card-body">
          <div class="bar-row">
            <span class="bar-label">S1</span>
            <div class="bar-track"><div class="bar-fill" style="width:35%"></div></div>
            <span class="bar-count num">4</span>
          </div>
          <div class="bar-row">
            <span class="bar-label">S2</span>
            <div class="bar-track"><div class="bar-fill" style="width:70%"></div></div>
            <span class="bar-count num">7</span>
          </div>
          <div class="bar-row">
            <span class="bar-label">S3</span>
            <div class="bar-track"><div class="bar-fill" style="width:60%"></div></div>
            <span class="bar-count num">6</span>
          </div>
          <div class="bar-row">
            <span class="bar-label">S4</span>
            <div class="bar-track"><div class="bar-fill" style="width:52%"></div></div>
            <span class="bar-count num">6</span>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="card-header">
          <span class="card-header-title">Seus pagamentos</span>
        </div>
        <div class="card-body">
          <div class="tl-item">
            <div class="tl-left"><div class="tl-dot yellow" style="background:#FAC775"></div><div class="tl-line"></div></div>
            <div>
              <div class="tl-title">R$1.290 <span class="badge pendente">pendente</span></div>
              <div class="tl-meta">Ref. mai/26 · vence 10 jun</div>
            </div>
          </div>
          <div class="tl-item">
            <div class="tl-left"><div class="tl-dot"></div><div class="tl-line"></div></div>
            <div>
              <div class="tl-title">R$980 <span class="badge pago">pago</span></div>
              <div class="tl-meta">Ref. abr/26 · pago em 10 mai</div>
            </div>
          </div>
          <div class="tl-item">
            <div class="tl-left"><div class="tl-dot gray"></div><div class="tl-line"></div></div>
            <div>
              <div class="tl-title">R$740 <span class="badge pago">pago</span></div>
              <div class="tl-meta">Ref. mar/26 · pago em 10 abr</div>
            </div>
          </div>
          <div class="tl-item">
            <div class="tl-left"><div class="tl-dot gray"></div></div>
            <div>
              <div class="tl-title">R$510 <span class="badge pago">pago</span></div>
              <div class="tl-meta">Ref. fev/26 · pago em 10 mar</div>
            </div>
          </div>
        </div>
      </div>
    </div>

  </div><!-- /tab-resumo -->

  <!-- ════════════════════════════════════════ -->
  <!-- TAB: MINHAS VENDAS                      -->
  <!-- ════════════════════════════════════════ -->
  <div id="tab-vendas" class="tab-content" style="display:none">
    <div class="card">
      <div class="card-header">
        <span class="card-header-title">Vendas realizadas com seu cupom</span>
        <span style="font-size:11px;color:var(--text-3)">23 vendas em mai/26</span>
      </div>
      <div class="card-body flush">
        <div class="table-wrap">
          <table class="tbl">
            <thead>
              <tr>
                <th>Data</th>
                <th>Produto</th>
                <th>Tamanho</th>
                <th style="text-align:right">Valor</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td class="num" style="color:var(--text-3)">28 mai</td>
                <td>Bolsa Tira Margarida</td>
                <td style="color:var(--text-3)">Único</td>
                <td class="num" style="text-align:right;font-weight:600">R$298</td>
                <td><span class="badge pago">confirmado</span></td>
              </tr>
              <tr>
                <td class="num" style="color:var(--text-3)">26 mai</td>
                <td>Vestido Bata Linho</td>
                <td style="color:var(--text-3)">P</td>
                <td class="num" style="text-align:right;font-weight:600">R$187</td>
                <td><span class="badge pago">confirmado</span></td>
              </tr>
              <tr>
                <td class="num" style="color:var(--text-3)">24 mai</td>
                <td>Bolsa Palha Redonda</td>
                <td style="color:var(--text-3)">Único</td>
                <td class="num" style="text-align:right;font-weight:600">R$340</td>
                <td><span class="badge processando">processando</span></td>
              </tr>
              <tr>
                <td class="num" style="color:var(--text-3)">22 mai</td>
                <td>Cinto Macramê</td>
                <td style="color:var(--text-3)">M</td>
                <td class="num" style="text-align:right;font-weight:600">R$89</td>
                <td><span class="badge pago">confirmado</span></td>
              </tr>
              <tr>
                <td class="num" style="color:var(--text-3)">20 mai</td>
                <td>Bata Algodão Bordado</td>
                <td style="color:var(--text-3)">G</td>
                <td class="num" style="text-align:right;font-weight:600">R$214</td>
                <td><span class="badge pendente">aguardando pagto.</span></td>
              </tr>
              <tr>
                <td class="num" style="color:var(--text-3)">18 mai</td>
                <td>Bolsa Tira Margarida</td>
                <td style="color:var(--text-3)">Único</td>
                <td class="num" style="text-align:right;font-weight:600">R$298</td>
                <td><span class="badge pago">confirmado</span></td>
              </tr>
              <tr>
                <td class="num" style="color:var(--text-3)">15 mai</td>
                <td>Vestido Linho Listrado</td>
                <td style="color:var(--text-3)">M</td>
                <td class="num" style="text-align:right;font-weight:600">R$255</td>
                <td><span class="badge pago">confirmado</span></td>
              </tr>
              <tr>
                <td class="num" style="color:var(--text-3)">12 mai</td>
                <td>Sandália Macramê</td>
                <td style="color:var(--text-3)">37</td>
                <td class="num" style="text-align:right;font-weight:600">R$165</td>
                <td><span class="badge pago">confirmado</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div><!-- /tab-vendas -->

  <!-- ════════════════════════════════════════ -->
  <!-- TAB: PAGAMENTOS                         -->
  <!-- ════════════════════════════════════════ -->
  <div id="tab-pagamentos" class="tab-content" style="display:none">
    <div class="card" style="margin-bottom:14px">
      <div class="card-header">
        <span class="card-header-title">Histórico de pagamentos</span>
      </div>
      <div class="card-body flush">
        <div class="table-wrap">
          <table class="tbl">
            <thead>
              <tr>
                <th>Mês ref.</th>
                <th style="text-align:right">Vendas</th>
                <th style="text-align:right">Receita gerada</th>
                <th style="text-align:right">Sua comissão</th>
                <th>Pagamento</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style="font-weight:500">Maio/26</td>
                <td class="num" style="text-align:right">23</td>
                <td class="num" style="text-align:right">R$4.870</td>
                <td class="num" style="text-align:right;font-weight:600;color:var(--accent)">R$1.290</td>
                <td class="num" style="color:var(--text-3)">10 jun/26</td>
                <td><span class="badge pendente">pendente</span></td>
              </tr>
              <tr>
                <td style="font-weight:500">Abril/26</td>
                <td class="num" style="text-align:right">19</td>
                <td class="num" style="text-align:right">R$4.200</td>
                <td class="num" style="text-align:right;font-weight:600">R$980</td>
                <td class="num" style="color:var(--text-3)">10 mai/26</td>
                <td><span class="badge pago">pago</span></td>
              </tr>
              <tr>
                <td style="font-weight:500">Março/26</td>
                <td class="num" style="text-align:right">15</td>
                <td class="num" style="text-align:right">R$3.100</td>
                <td class="num" style="text-align:right;font-weight:600">R$740</td>
                <td class="num" style="color:var(--text-3)">10 abr/26</td>
                <td><span class="badge pago">pago</span></td>
              </tr>
              <tr>
                <td style="font-weight:500">Fevereiro/26</td>
                <td class="num" style="text-align:right">10</td>
                <td class="num" style="text-align:right">R$2.040</td>
                <td class="num" style="text-align:right;font-weight:600">R$510</td>
                <td class="num" style="color:var(--text-3)">10 mar/26</td>
                <td><span class="badge pago">pago</span></td>
              </tr>
              <tr>
                <td style="font-weight:500">Janeiro/26</td>
                <td class="num" style="text-align:right">7</td>
                <td class="num" style="text-align:right">R$1.380</td>
                <td class="num" style="text-align:right;font-weight:600">R$330</td>
                <td class="num" style="color:var(--text-3)">10 fev/26</td>
                <td><span class="badge pago">pago</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- info pix -->
    <div class="card">
      <div class="card-header">
        <span class="card-header-title">Dados para recebimento</span>
        <button class="btn ghost sm">Editar</button>
      </div>
      <div class="card-body">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;font-size:13px">
          <div>
            <div style="font-size:11px;color:var(--text-3);margin-bottom:3px;font-weight:500">Chave PIX</div>
            <div style="font-weight:500">012.345.678-90</div>
            <div style="font-size:11px;color:var(--text-3)">Tipo: CPF</div>
          </div>
          <div>
            <div style="font-size:11px;color:var(--text-3);margin-bottom:3px;font-weight:500">Dia de pagamento</div>
            <div style="font-weight:500">Todo dia 10</div>
            <div style="font-size:11px;color:var(--text-3)">do mês seguinte</div>
          </div>
        </div>
      </div>
    </div>

  </div><!-- /tab-pagamentos -->

</div><!-- /page -->

<script>
  function switchTab(name, el) {
    ['resumo','vendas','pagamentos'].forEach(t => {
      document.getElementById('tab-'+t).style.display = t === name ? '' : 'none';
    });
    document.querySelectorAll('.tab').forEach(b => b.classList.remove('active'));
    el.classList.add('active');
  }

  function setPeriod(el) {
    document.querySelectorAll('.period-pill').forEach(b => b.classList.remove('active'));
    el.classList.add('active');
  }

  function copiarCupom() {
    navigator.clipboard.writeText('LARI15').catch(()=>{});
    const msg = document.getElementById('cupom-copied');
    msg.style.display = 'block';
    setTimeout(() => msg.style.display = 'none', 2000);
  }
</script>
</body>
</html>