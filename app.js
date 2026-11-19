// 화면을 그리는 코드예요. 내용은 content.json(→ data.js)에 있고, 편집은 편집기에서 해요.
// 편집 모드에서는 editor.js가 PortfolioApp.render(data, { editing: true })로 다시 그려요.
(function () {
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const has = (v) => v !== null && v !== undefined && String(v).trim() !== "";
  const comma = (n) => typeof n === "number" ? n.toLocaleString("ko-KR") : esc(n);
  const short = (n) => {
    if (typeof n !== "number") return esc(n);
    if (n >= 10000) return (Math.round(n / 1000) / 10).toLocaleString("ko-KR") + "만";
    return n.toLocaleString("ko-KR");
  };
  const CONTEXT = { personal: "리밍 개인 채널", brand: "브랜드 협업 · 리밍 채널", company: "회사 업무", outsourcing: "외주 제작" };
  const TAG_KIND = { "브랜드 협업": "brand", "공동구매": "brand", "제휴": "brand", "설레임파티": "company", "외주 제작": "outsourcing" };

  // 화면 상태(데이터가 아니라 보기 상태라 저장하지 않아요)
  const ui = { brandCat: "전체", brandOpen: false, tab: "owned", dlvCat: "전체", ownedOpen: false, persona: /^#seri\b/.test(location.hash) ? "seri" : "liming" };
  // 리밍 / 안세림 탭: 무엇이 어느 탭에 보이는지 (항목에 persona: "liming"|"seri"|"both"를 적으면 그게 우선)
  const PERSONAS = ["liming", "seri"];
  const SEC_P = { metrics: "liming", testimonials: "liming", brands: "liming", process: "seri" };
  const SV_P = { deliver: "seri", plan: "seri" };
  const TAB_P = { owned: "liming", community: "liming", delivery: "seri" };
  const inP = (x, def = "both") => { const w = (x && x.persona) || def; return w === "both" || w === ui.persona; };
  const pKey = (base) => base + (ui.persona === "seri" ? "Seri" : "Liming");
  // 공개 허락·납품 확인이 끝난 것만 방문자에게 보여요
  const okReview = (t) => t.permission === "확인됨";
  const okDelivery = (d) => d.permission === "확인됨" && d.deliveredStatus === "확인됨";
  let D = null, EDIT = false, opener = null;

  // 편집 표시용 속성. 공개 화면에서도 붙지만 아무 동작을 하지 않아요.
  const ed = (path, val, tag = "span", cls = "", ml = false) =>
    `<${tag}${cls ? ` class="${cls}"` : ""} data-edit="${path}"${ml ? " data-ml" : ""}>${esc(val)}</${tag}>`;
  const obj = (kind, path, extra = "") => EDIT ? ` data-obj="${path}" data-kind="${kind}"${extra}` : "";
  const shown = (x) => EDIT || (x && x.public !== false && x.hidden !== true);
  const hid = (x) => x && (x.public === false || x.hidden === true) ? " ed-hidden" : "";
  const add = (list, kind, label, extra = "") => EDIT ? `<button type="button" class="ed-add" data-add="${list}" data-kind="${kind}"${extra}>+ ${esc(label)}</button>` : "";
  const bg = (sec) => has(sec.bg) ? ` bg-${esc(sec.bg)}` : "";
  const tsize = (sec) => has(sec.titleSize) ? ` ts-${esc(sec.titleSize)}` : "";
  const isPub = (x) => x && x.public !== false;
  const nodot = (s) => String(s ?? "").replace(/\s+·\s+/g, ", ");
  // 방문자 화면에서 출처 메모(본인 제공·본인 기록·미리캔버스 …)를 지워요
  const clean = (t) => String(t ?? "")
    .replace(/\s*\([^()]*(본인|미리캔버스|확인이 필요)[^()]*\)?/g, "")
    .replace(/미리캔버스 포트폴리오\s*(\([^)]*\))?\s*(캡처\s*)?기준\s*/g, "")
    .replace(/[^.]*(본인 기록|본인 제공|미리캔버스|확인이 필요)[^.]*\.\s*/g, "")
    .replace(/\s{2,}/g, " ").trim();
  const noEmoji = (s) => String(s ?? "").replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE0F}\u{200D}]/gu, "").replace(/\s{2,}/g, " ").trim();

  /* ───── 자유 블록 (모든 섹션 끝에 붙어요) ───── */
  const blockHTML = (b, path) => {
    const a = `align-${esc(b.align || "left")}`, s = `size-${esc(b.size || "m")}`;
    let inner = "";
    if (b.type === "heading") inner = ed(`${path}.text`, b.text, "h3", `cb-h ${s}`);
    else if (b.type === "text") inner = ed(`${path}.text`, b.text, "p", `cb-t ${s}`, true);
    else if (b.type === "image") {
      if (!has(b.src) && !EDIT) return "";
      inner = `<figure class="cb-img w-${esc(b.width || "m")}">${has(b.src) ? `<img src="${esc(b.src)}" alt="${esc(b.alt || "")}" loading="lazy">` : `<div class="ed-empty-img">이미지를 고르세요</div>`}${has(b.caption) || EDIT ? ed(`${path}.caption`, b.caption || (EDIT ? "" : ""), "figcaption") : ""}</figure>`;
    } else if (b.type === "media") {
      inner = `<div class="cb-media side-${esc(b.side || "left")}">${has(b.src) ? `<img src="${esc(b.src)}" alt="${esc(b.alt || "")}" loading="lazy">` : (EDIT ? `<div class="ed-empty-img">이미지를 고르세요</div>` : "<div></div>")}<div>${ed(`${path}.title`, b.title, "h3", `cb-h ${s}`)}${ed(`${path}.text`, b.text, "p", "cb-t size-m", true)}</div></div>`;
    }
    return `<div class="cb ${a}${hid(b)}"${obj("block", path)}>${inner}</div>`;
  };
  const blocksHTML = (sec, si) => {
    const list = (sec.blocks || []).map((b, bi) => shown(b) ? blockHTML(b, `sections.${si}.blocks.${bi}`) : "").join("");
    const adders = EDIT ? `<div class="ed-add-row">${add(`sections.${si}.blocks`, "block:heading", "제목")}${add(`sections.${si}.blocks`, "block:text", "글")}${add(`sections.${si}.blocks`, "block:image", "이미지")}${add(`sections.${si}.blocks`, "block:media", "이미지+글")}</div>` : "";
    return list || adders ? `<div class="wrap cblocks">${list}${adders}</div>` : "";
  };
  const head = (sec, si, extra = "", leadKey = "lead") => `
    <div class="block-head${tsize(sec)}">
      ${has(sec.eyebrow) || (EDIT && "eyebrow" in sec) ? ed(`sections.${si}.eyebrow`, sec.eyebrow, "p", "eyebrow") : ""}
      ${ed(`sections.${si}.title`, sec.title, "h2")}
      ${has(sec[leadKey]) || (EDIT && leadKey in sec) ? ed(`sections.${si}.${leadKey}`, sec[leadKey], "p", "lead", true) : ""}
      ${extra}
    </div>`;

  /* ───── 섹션별 화면 ───── */
  const R = {};

  // 첫 화면: 고른 탭의 사람만 (이름·역할·헤드라인·한 줄·버튼·사진)
  R.hero = (sec, si) => {
    const s = D.site, k = ui.persona, p = D.people[k];
    // 리밍 헤드라인은 원래 자리(site.headline)를 그대로 써요(직접 고친 문구라서)
    const hlKey = k === "liming" && !(p.headline || []).length ? "site.headline" : `people.${k}.headline`;
    const hl = k === "liming" && !(p.headline || []).length ? s.headline : p.headline;
    const lines = (Array.isArray(hl) ? hl : [hl]).filter((l) => has(l) || EDIT);
    const vsLine = (l) => {
      const [a, b] = String(l).split(" vs ");
      return b === undefined ? esc(l) : `<span class="nw">${esc(a)} <i class="vs">vs</i></span> <span class="nw">${esc(b)}</span>`;
    };
    const src = p.photo || s.profilePhoto;
    const photo = has(src)
      ? `<div class="photo"${obj("person", `people.${k}`)}><img src="${esc(src)}" alt="${esc(p.name)} 프로필 사진">${EDIT ? `<span class="ed-photo-tip">사진 바꾸기</span>` : ""}</div>`
      : EDIT ? `<div class="photo-slot"${obj("person", `people.${k}`)}><b>${esc(p.name)} 사진 넣기</b><small>세로 4:5 사진을 추천해요.</small></div>` : "";
    const contact = (s.cta || []).map((b, i) => ({ b, i })).filter(({ b }) => shown(b) && b.href === "#contact");
    return `<section class="hero${bg(sec)}" id="${esc(sec.id)}">
      <div class="wrap hero-in${has(src) || EDIT ? "" : " no-photo"}">
        <div class="hero-text">
          <p class="names">${ed(`people.${k}.name`, p.name, "span", `name ${k}`)}</p>
          <p class="roles">${ed(`people.${k}.role`, p.role)}</p>
          <h1>${lines.map((l, i) => `<span class="hl hl-${i}" data-edit="${hlKey}.${i}">${vsLine(l)}</span>`).join("")}</h1>
          ${has(p.heroLine) || EDIT ? ed(`people.${k}.heroLine`, p.heroLine, "p", "subline", true) : ""}
          <div class="cta">${has(p.heroLink) ? `<a class="btn btn-dark" href="${esc(p.heroLink)}"${obj("person", `people.${k}`)}>${ed(`people.${k}.heroLinkLabel`, p.heroLinkLabel || "자세히 보기")}</a>` : ""}${contact.map(({ b, i }) => `<a class="btn btn-line${hid(b)}" href="${esc(b.href)}"${obj("button", `site.cta.${i}`)}>${ed(`site.cta.${i}.label`, b.label)}</a>`).join("")}</div>
        </div>
        ${photo ? `<div class="hero-side">${photo}</div>` : ""}
      </div>
      ${blocksHTML(sec, si)}
    </section>`;
  };

  // 브랜드 숫자는 모두 공개 중인 목록에서 같은 방식으로 세요(숨김·중복 제외)
  const brandStats = () => {
    const pub = D.brands.filter(isPub);
    const names = new Set(pub.map((b) => b.name.trim().toLowerCase()));
    const brand = pub.filter((b) => b.relation !== "wc").length, wc = pub.filter((b) => b.relation === "wc").length;
    const contents = pub.reduce((n, b) => n + (b.campaigns || []).filter((c) => isPub(c) && !c.summary).length, 0);
    return { total: names.size, brand, wc, contents, partners: D.partners.filter(isPub).length };
  };
  const brandCount = () => brandStats().total;

  R.metrics = (sec, si) => {
    const items = D.metrics.map((m, i) => {
      if (!shown(m) || !inP(m, "liming")) return "";
      const auto = m.auto === "brandCount";
      const value = auto ? (brandCount() ? `${brandCount()}곳` : null) : m.value;
      if (!has(value) && !EDIT) return "";
      const where = [m.channel, m.period].filter(has).map(nodot).join(", ");
      const when = has(m.asOf) ? `${m.asOf} 기준` : "";
      const v = auto ? `<span class="v num" title="브랜드 목록에서 자동으로 세요">${esc(value)}</span>` : ed(`metrics.${i}.value`, value, "span", "v num");
      const attrs = EDIT ? obj("metric", `metrics.${i}`) : ` data-metric="${i}" role="button" tabindex="0" aria-label="${esc(m.label)} 근거 보기"`;
      return `<li class="metric${hid(m)}"${attrs}>${v}${ed(`metrics.${i}.label`, m.label, "span", "l")}${when ? `<span class="m">${esc(when)}</span>` : ""}</li>`;
    }).join("");
    if (!items.trim() && !EDIT) return "";
    return `<section class="metrics-band${bg(sec)}" id="${esc(sec.id)}" aria-label="숫자로 보는 활동">
      <div class="wrap"><ul class="metrics">${items}${EDIT ? `<li class="metric ed-add-cell">${add("metrics", "metric", "숫자 추가")}</li>` : ""}</ul>
      <p class="metrics-cap">숫자를 누르면 어디서 언제 센 값인지 볼 수 있어요.</p></div>
      ${blocksHTML(sec, si)}
    </section>`;
  };

  R.brands = (sec, si) => {
    const st = brandStats();
    const all = D.brands.map((b, i) => ({ b, i })).filter(({ b }) => shown(b));
    const pubOnly = all.filter(({ b }) => isPub(b));
    const cats = (D.brandCategories || []).filter((c) => all.some(({ b }) => b.category === c));
    const inCat = ({ b }) => ui.brandCat === "전체" || b.category === ui.brandCat;
    const open = EDIT || ui.brandOpen || ui.brandCat !== "전체";
    const campaignsOf = (b) => (b.campaigns || []).filter((c) => isPub(c) && !c.summary);
    const tile = ({ b, i }) => {
      const n = campaignsOf(b).length;
      const face = has(b.logo) ? `<img src="${esc(b.logo)}" alt="${esc(b.name)}">` : ed(`brands.${i}.name`, b.name, "span", "bn");
      const meta = D.showBrandCounts && n > 1 ? `<span class="cnt num">${n}건</span>` : "";
      const inner = `${face}<span class="bs">${esc(b.category || "")}${meta}</span>`;
      return EDIT
        ? `<li><div class="brand${hid(b)}"${obj("brand", `brands.${i}`)}>${inner}</div></li>`
        : `<li><button type="button" class="brand" data-brand="${i}" aria-label="${esc(b.name)} 협업 보기">${inner}</button></li>`;
    };
    const featuredFirst = (L) => L.filter(({ b }) => b.featured).concat(L.filter(({ b }) => !b.featured));
    const groupA = all.filter(({ b }) => b.relation !== "wc" && inCat({ b }));
    const groupB = all.filter(({ b }) => b.relation === "wc" && inCat({ b }));
    const showA = open ? groupA : featuredFirst(groupA).slice(0, D.brandsInitial || 12);
    const showB = open ? groupB : featuredFirst(groupB).slice(0, 6);
    const rest = groupA.length + groupB.length - showA.length - showB.length;
    const group = (title, tKey, note, nKey, items, total, kind) => (items.length || EDIT) ? `
      <div class="brand-group">
        <div class="bg-head">${ed(`sections.${si}.${tKey}`, title, "h3")}<span class="num">${total}곳</span></div>
        ${has(note) || EDIT ? ed(`sections.${si}.${nKey}`, note, "p", "bg-note", true) : ""}
        <ul class="brands">${items.map(tile).join("")}${EDIT && kind === "brand" ? `<li>${add("brands", "brand", "브랜드 추가", ' style="width:100%;min-height:96px"')}</li>` : ""}</ul>
      </div>` : "";
    const partners = D.partners.map((p, i) => shown(p) ? `<li class="${hid(p).trim()}"${obj("partner", `partners.${i}`)}>${has(p.link) && !EDIT ? `<a href="${esc(p.link)}" target="_blank" rel="noopener">${esc(p.name)}</a>` : ed(`partners.${i}.name`, p.name, "b")}<span>${esc(p.type)}</span></li>` : "").join("");
    return `<section class="block${bg(sec)}" id="${esc(sec.id)}">
      <div class="wrap">
        ${head(sec, si)}
        <p class="brand-sum"><span>브랜드 협업 <b class="num">${st.brand}곳</b></span><span>웨딩커넥트 제휴 업체 <b class="num">${st.wc}곳</b></span><span>협업 콘텐츠 <b class="num">${st.contents}건</b></span>${EDIT && all.length > pubOnly.length ? `<span class="ed-note">편집 화면에만 보이는 숨긴 브랜드 ${all.length - pubOnly.length}곳</span>` : ""}</p>
        <div class="pills" role="group" aria-label="브랜드 분야">${["전체", ...cats].map((c) => `<button type="button" class="pill" aria-pressed="${c === ui.brandCat}" data-cat="${esc(c)}">${esc(c)}<span class="num">${c === "전체" ? pubOnly.length : pubOnly.filter(({ b }) => b.category === c).length}</span></button>`).join("")}</div>
        ${group(sec.groupBrandTitle || "브랜드 협업", "groupBrandTitle", sec.groupBrandNote, "groupBrandNote", showA, groupA.filter(({ b }) => isPub(b)).length, "brand")}
        ${group(sec.groupWcTitle || "웨딩커넥트 제휴 업체", "groupWcTitle", sec.groupWcNote, "groupWcNote", showB, groupB.filter(({ b }) => isPub(b)).length, "wc")}
        ${!EDIT && ui.brandCat === "전체" && (ui.brandOpen || rest > 0) ? `<button type="button" class="btn btn-line more" id="brand-more" aria-expanded="${ui.brandOpen}">${ui.brandOpen ? "주요 브랜드만 보기" : `전체 ${st.total}곳 보기`}</button>` : ""}
        ${has(sec.extraNote) || EDIT ? ed(`sections.${si}.extraNote`, sec.extraNote, "p", "note extra-note", true) : ""}
        ${partners || EDIT ? `<details class="partners"${EDIT ? " open" : ""}>
          ${ed(`sections.${si}.partnersTitle`, sec.partnersTitle, "summary")}
          ${ed(`sections.${si}.partnersNote`, sec.partnersNote, "p", "note", true)}
          <ul>${partners}${EDIT ? `<li>${add("partners", "partner", "업체 추가")}</li>` : ""}</ul>
        </details>` : ""}
      </div>
      ${blocksHTML(sec, si)}
    </section>`;
  };

  R.about = (sec, si) => {
    const P = D.people;
    const person = (k) => {
      const p = P[k];
      return `<article class="person ${k}"${obj("person", `people.${k}`)}>
        ${ed(`people.${k}.title`, p.title, "h3")}
        ${(p.body || []).map((t, i) => ed(`people.${k}.body.${i}`, t, "p", "", true)).join("")}
        ${has(p.now) || EDIT ? ed(`people.${k}.now`, p.now, "p", "now") : ""}
        <ul>${(p.skills || []).map((s) => `<li>${esc(s)}</li>`).join("")}</ul>
      </article>`;
    };
    const work = (D.work || []).map((w, i) => shown(w) ? `
      <article class="work-exp${hid(w)}"${obj("work", `work.${i}`)}>
        <div class="we-head">${ed(`work.${i}.org`, w.org, "h3")}${ed(`work.${i}.label`, w.label, "span", "we-label")}${has(w.orgNote) || EDIT ? ed(`work.${i}.orgNote`, w.orgNote, "p", "we-org") : ""}</div>
        <div class="we-body">
          ${ed(`work.${i}.summary`, w.summary, "p", "", true)}
          ${(w.points || []).filter(has).length ? `<ul>${w.points.filter(has).map((t) => `<li>${esc(t)}</li>`).join("")}</ul>` : ""}
          ${(w.facts || []).filter((f) => isPub(f) && has(f.value)).length ? `<div class="result-grid">${w.facts.filter((f) => isPub(f) && has(f.value)).map((f) => `<div><b class="num">${esc(f.value)}</b><span>${esc(f.label)}</span></div>`).join("")}</div>` : ""}
          ${(w.links || []).filter((l) => has(l.url)).map((l) => `<a class="we-link" href="${esc(l.url)}" target="_blank" rel="noopener">${esc(l.label)}</a>`).join("")}
        </div>
      </article>` : "").join("");
    const career = D.career.map((c, i) => shown(c) ? `<li class="${hid(c).trim()}"${obj("career", `career.${i}`)}>${ed(`career.${i}.step`, c.step, "b")}${ed(`career.${i}.text`, c.text, "p", "", true)}${has(c.period) || EDIT ? ed(`career.${i}.period`, c.period, "small") : ""}${has(c.detail) ? `<small>${esc(c.detail)}</small>` : ""}</li>` : "").join("");
    // 탭마다 그 사람 소개만: 리밍은 크리에이터 소개, 안세림은 실무 경험·경력까지
    const seri = ui.persona === "seri";
    return `<section class="block${bg(sec)}" id="${esc(sec.id)}">
      <div class="wrap">
        <div class="people single">${person(ui.persona)}</div>
        ${seri ? `<div>${work}${add("work", "work", "실무 경험 추가")}</div>
        <ol class="career" aria-label="경력 흐름">${career}</ol>
        ${add("career", "career", "경력 단계 추가")}` : ""}
      </div>
      ${blocksHTML(sec, si)}
    </section>`;
  };

  const thumbHTML = (p, extra = "") => has(p.thumb)
    ? `<div class="thumb ${p.thumbRatio === "square" ? "square" : ""}">${extra}<img src="${esc(p.thumb)}" alt="${esc(p.title)} 썸네일" loading="lazy"></div>`
    : `<div class="thumb thumb-empty">${extra}<span>${esc(p.brand || p.title || "썸네일 없음")}</span></div>`;
  const chip = (t) => `<span class="chip${TAG_KIND[t] ? ` k-${TAG_KIND[t]}` : ""}">${esc(t)}</span>`;

  R.work = (sec, si) => {
    const tabs = sec.tabs || { owned: "온드미디어 채널", community: "커뮤니티 운영", delivery: "숏폼 납품" };
    const order = sec.tabOrder || ["owned", "community", "delivery"];
    const P = D.projects.map((p, i) => ({ p, i })).filter(({ p }) => shown(p) && (EDIT || has(p.title)));

    // 릴스 카드와 캠페인 사례에 같은 콘텐츠가 겹치면 카드 하나에서 사례 상세를 열어요
    // 예전 '캠페인 사례'는 대표작 카드에 합쳤어요(상세보기에서 기획·전환을 봐요)
    const shortsAll = P.filter(({ p }) => (p.tabs || []).length);
    const comms = D.communities.map((c, i) => ({ c, i })).filter(({ c }) => shown(c));
    const dlvAll = (D.deliveries || []).map((d, i) => ({ d, i })).filter(({ d }) => shown(d) && (EDIT || okDelivery(d)));
    const lim = +sec.ownedInitial || 6;
    const shorts = shortsAll;
    const ownedShown = EDIT || ui.ownedOpen ? shorts : shorts.slice(0, lim);
    const ownedRest = shorts.length - ownedShown.length;
    const reviewOf = (p) => (D.testimonials || []).filter((t) => t.project === p.id && isPub(t) && (EDIT || okReview(t)));
    const reels = ownedShown.map(({ p, i }) => {
      const hl = ((p.highlights || []).length ? p.highlights : (p.reactions || [])).slice(0, 2);
      const meta = [p.brand, nodot(p.format)].filter(has).join(", ");
      const fb = reviewOf(p).length;
      const extra = EDIT && p.featured ? `<span class="chips"><span class="chip k-featured">대표 협업</span></span>` : "";
      return `<li class="${hid(p).trim()}"><article class="work-card"${obj("project", `projects.${i}`)}>
        <button type="button" class="wc-thumb${p.thumbRatio === "square" ? " fit" : ""}"${EDIT ? "" : ` data-project="${esc(p.id)}"`} aria-label="${esc(p.title)} 사례 상세">${thumbHTML(p, extra)}</button>
        ${has(meta) ? `<p class="wc-meta">${esc(meta)}</p>` : ""}
        ${ed(`projects.${i}.title`, p.title, "h3")}
        ${hl.length ? `<p class="wc-hl">${hl.map(([k, v]) => `<span><b class="num">${short(v)}</b>${esc(k)}</span>`).join("")}</p>` : ""}
        <div class="wc-act">${has(p.link) ? `<a href="${esc(p.link)}" target="_blank" rel="noopener">결과물 보기</a>` : ""}${EDIT ? "" : `<button type="button" data-project="${esc(p.id)}">사례 상세</button>`}</div>
      </article></li>`;
    }).join("");
    const commItems = comms.map(({ c, i }) => `
      <article class="comm${hid(c)}"${obj("community", `communities.${i}`)}>
        ${ed(`communities.${i}.tag`, c.tag, "span", "chip")}
        ${ed(`communities.${i}.name`, c.name, "h3")}
        ${ed(`communities.${i}.kind`, c.kind, "p", "kind")}
        ${c.stat && has(c.stat.value) ? `<p class="big"><b class="num">${esc(c.stat.value)}</b><span>${esc(c.stat.label)}${has(c.stat.asOf) ? ` · ${esc(c.stat.asOf)} 기준` : ""}</span></p>` : ""}
        <ul>${(c.points || []).map((t) => `<li>${esc(t)}</li>`).join("")}</ul>
        ${(c.materials || []).length ? `<div class="materials">${c.materials.map((m) => `<a href="${esc(m.url)}" target="_blank" rel="noopener">${esc(m.label)}</a>`).join("")}</div>` : ""}
        ${has(c.link) ? `<a class="media" href="${esc(c.link)}" target="_blank" rel="noopener">${has(c.thumb) ? `<img src="${esc(c.thumb)}" alt="">` : ""}<span>${esc(c.linkLabel || "게시물 보기")}</span></a>` : ""}
      </article>`).join("");
    // 숏폼 납품: 실제 영상 갤러리
    const dcats = (D.deliveryCategories || []).filter((c) => dlvAll.some(({ d }) => d.category === c));
    if (ui.dlvCat !== "전체" && !dcats.includes(ui.dlvCat)) ui.dlvCat = "전체";
    const dlv = dlvAll.filter(({ d }) => ui.dlvCat === "전체" || d.category === ui.dlvCat);
    const dlvItems = dlv.map(({ d, i }) => {
      const extra = `<span class="chips">${has(d.type) ? `<span class="chip">${esc(d.type)}</span>` : ""}${EDIT && !okDelivery(d) ? `<span class="chip k-review">납품 ${esc(d.deliveredStatus || "미확인")} · 공개 허락 ${esc(d.permission || "미확인")}</span>` : ""}</span><span class="play" aria-hidden="true"></span>${has(d.duration) ? `<span class="stat num">${esc(d.duration)}</span>` : ""}`;
      const attrs = EDIT ? obj("delivery", `deliveries.${i}`) : ` data-delivery="${esc(d.id)}" aria-label="${esc(d.title)} 영상 보기"`;
      return `<li class="${hid(d).trim()}"><div class="reel-btn" role="button" tabindex="0"${attrs}>${thumbHTML({ thumb: d.poster, title: d.title, brand: d.client }, extra)}${ed(`deliveries.${i}.title`, d.title, "h3")}<p>${esc(d.client || "")}${(d.roles || []).length ? `<br><span class="roles-line">${esc(d.roles.join(", "))}</span>` : ""}</p></div></li>`;
    }).join("");
    const counts = { owned: shorts.length, community: comms.length, delivery: dlvAll.length };
    const keys = order.filter((k) => tabs[k] && TAB_P[k] === ui.persona && (counts[k] || EDIT));
    if (!keys.length) return "";
    if (!keys.includes(ui.tab)) ui.tab = keys[0];
    const panel = (k, inner) => keys.includes(k) ? `<div role="tabpanel" id="panel-${k}" aria-labelledby="tab-${k}"${ui.tab === k ? "" : " hidden"}>${inner}</div>` : "";
    return `<section class="block${bg(sec)}" id="${esc(sec.id)}">
      <div class="wrap">
        ${head(sec, si, "", pKey("lead"))}
        ${keys.length > 1 ? `<div class="tabs" role="tablist" aria-label="작업 분야">${keys.map((k) => `<button role="tab" id="tab-${k}" aria-controls="panel-${k}" aria-selected="${ui.tab === k}" tabindex="${ui.tab === k ? 0 : -1}" data-tab="${k}">${esc(tabs[k])}</button>`).join("")}</div>` : ""}
        ${panel("owned", `${has(sec.ownedLead) || EDIT ? ed(`sections.${si}.ownedLead`, sec.ownedLead, "p", "lead dlv-lead", true) : ""}<ul class="reels work-cards">${reels}${EDIT ? `<li>${add("projects", "project:shortform", "릴스 카드 추가", ' style="width:100%;aspect-ratio:9/16"')}</li>` : ""}</ul>
          ${!EDIT && (ownedRest > 0 || ui.ownedOpen) ? `<button type="button" class="btn btn-line more" id="owned-more" aria-expanded="${ui.ownedOpen}">${ui.ownedOpen ? "대표작만 보기" : `콘텐츠 ${ownedRest}개 더 보기`}</button>` : ""}
`)}
        ${panel("community", `${has(sec.communityLead) || EDIT ? ed(`sections.${si}.communityLead`, sec.communityLead, "p", "lead dlv-lead", true) : ""}<div class="communities">${commItems}${add("communities", "community", "커뮤니티 추가")}</div>`)}
        ${panel("delivery", `${has(sec.deliveryLead) || EDIT ? ed(`sections.${si}.deliveryLead`, sec.deliveryLead, "p", "lead dlv-lead", true) : ""}
          ${dcats.length > 1 ? `<div class="pills" role="group" aria-label="작업 유형">${["전체", ...dcats].map((c) => `<button type="button" class="pill" aria-pressed="${c === ui.dlvCat}" data-dcat="${esc(c)}">${esc(c)}<span class="num">${c === "전체" ? dlvAll.length : dlvAll.filter(({ d }) => d.category === c).length}</span></button>`).join("")}</div>` : ""}
          <ul class="reels">${dlvItems}${EDIT ? `<li>${add("deliveries", "delivery", "납품 영상 추가", ' style="width:100%;aspect-ratio:9/16"')}</li>` : ""}</ul>`)}
      </div>
      ${blocksHTML(sec, si)}
    </section>`;
  };

  // 파트너 피드백: 업체가 보낸 실제 메시지
  R.testimonials = (sec, si) => {
    const acts = (D.activities || []).map((a, i) => shown(a) ? `<li class="act${hid(a)}"${obj("activity", `activities.${i}`)}>
        ${has(a.image) ? `<button type="button" class="act-img" data-zoom="${esc(a.image)}" data-zoom-alt="${esc(a.name)} 선정 안내" data-zoom-cap=""><img src="${esc(a.image)}" alt="${esc(a.name)} 선정 안내" loading="lazy"></button>` : ""}
        <div>${ed(`activities.${i}.name`, a.name, "b")}${ed(`activities.${i}.detail`, a.detail, "p")}
        <small>${esc([a.org, a.cohort, a.period].filter(has).join(", "))}</small></div></li>` : "").join("");
    const list = (D.testimonials || []).map((t, i) => ({ t, i })).filter(({ t }) => shown(t) && (EDIT || okReview(t)));
    if (!list.length && !acts.trim() && !EDIT) return "";
    const pubProject = (id) => D.projects.some((x) => x.id === id && isPub(x));
    const cards = list.map(({ t, i }) => `
      <article class="review${hid(t)}"${obj("testimonial", `testimonials.${i}`)}>
        <div class="rv-top">${ed(`testimonials.${i}.vendor`, t.vendor, "b")}${has(t.vendorType) ? `<span class="chip">${esc(t.vendorType)}</span>` : ""}${EDIT && !okReview(t) ? `<span class="chip k-review">공개 허락 ${esc(t.permission || "미확인")} · 방문자에게 안 보여요</span>` : ""}</div>
        ${ed(`testimonials.${i}.headline`, t.headline, "blockquote", "rv-quote")}
        ${has(t.image) ? `<button type="button" class="rv-shot" data-zoom="${esc(t.image)}" data-zoom-alt="${esc(t.imageAlt || t.vendor)}" data-zoom-cap="${esc(t.note || "")}"><img src="${esc(t.image)}" alt="${esc(t.imageAlt || "")}" loading="lazy"><span>원본 메시지 보기</span></button>` : ""}
        ${has(t.note) ? `<p class="rv-note">${esc(t.note)}</p>` : ""}
        <div class="rv-links">${has(t.project) && pubProject(t.project) && !EDIT ? `<button type="button" data-project="${esc(t.project)}">관련 콘텐츠 보기</button>` : ""}${has(t.reel) ? `<a href="${esc(t.reel)}" target="_blank" rel="noopener">협업 릴스</a>` : ""}${(t.links || []).filter((l) => has(l.url)).map((l) => `<a href="${esc(l.url)}" target="_blank" rel="noopener">${esc(l.label)}</a>`).join("")}</div>
      </article>`).join("");
    // 공개된 피드백이 없으면 제목·설명을 선정 이력 기준으로 바꿔요
    const withFb = list.length > 0;
    const view = withFb ? sec : { ...sec, title: sec.titleNoFeedback || sec.title, lead: sec.leadNoFeedback ?? sec.lead };
    const headHTML = EDIT ? head(sec, si) : head(view, si);
    return `<section class="block${bg(sec)}" id="${esc(sec.id)}">
      <div class="wrap">
        ${headHTML}
        ${EDIT ? `<p class="ed-note-line">공개된 피드백이 없으면 방문자에게는 제목이 '${esc(sec.titleNoFeedback || "")}'로 보여요(섹션 설정에서 바꿀 수 있어요).</p>` : ""}
        ${acts.trim() || EDIT ? `<div class="acts-wrap">${withFb || EDIT ? ed(`sections.${si}.activitiesTitle`, sec.activitiesTitle || "크리에이터 활동·선정 이력", "h3", "acts-h") : ""}<ul class="acts">${acts}</ul>${add("activities", "activity", "활동·선정 이력 추가")}</div>` : ""}
        ${withFb || EDIT ? `<div class="fb-wrap">${ed(`sections.${si}.feedbackTitle`, sec.feedbackTitle || "파트너 피드백", "h3", "acts-h")}<div class="reviews">${cards}${add("testimonials", "testimonial", "피드백 추가")}</div></div>` : ""}
      </div>
      ${blocksHTML(sec, si)}
    </section>`;
  };

  R.services = (sec, si) => {
    const tabOk = (k) => k === "owned" ? D.projects.some((x) => isPub(x) && (x.tabs || []).length)
      : k === "community" ? D.communities.some(isPub) : k === "delivery" ? (D.deliveries || []).some((d) => isPub(d) && okDelivery(d)) : false;
    // 카드 다섯 개 대신 한 줄씩 읽히는 목록: 이름(무엇을 하는지) / 설명 / 결과물·연결
    const items = D.services.map((s, i) => shown(s) && inP(s, SV_P[s.mode] || "liming") ? `<li class="service ${esc(s.mode)}${hid(s)}"${obj("service", `services.${i}`)}>
        <div class="sv-name">${ed(`services.${i}.title`, s.title, "h3")}${EDIT || !String(s.title || "").includes(s.modeLabel || "@@") ? ed(`services.${i}.modeLabel`, s.modeLabel, "span", `mode ${esc(s.mode)}`) : ""}</div>
        <div class="sv-body">${ed(`services.${i}.body`, s.body, "p", "", true)}${has(s.output) || EDIT ? `<p class="sv-out"><b>결과물</b>${ed(`services.${i}.output`, s.output)}</p>` : ""}</div>
        <div class="sv-go">${has(s.tab) && has(s.linkLabel) && !EDIT && tabOk(s.tab) ? `<a class="sv-link" href="#${esc(s.tab)}">${esc(s.linkLabel)}</a>` : ""}</div>
      </li>` : "").join("");
    const steps = inP({ persona: sec.designPersona }, "seri") ? (sec.designSteps || []).filter(has) : [];
    const designOn = steps.length || (EDIT && inP({ persona: sec.designPersona }, "seri"));
    const proc = D.process.filter((x) => isPub(x));
    if (!items.trim() && !EDIT) return "";
    return `<section class="block${bg(sec)}" id="${esc(sec.id)}">
    <div class="wrap">
      ${head(sec, si, "", pKey("lead"))}
      <ul class="services">${items}</ul>
      ${add("services", "service", "서비스 추가")}
      ${designOn ? `<div class="design"${EDIT ? obj("section", `sections.${si}`) : ""}>
        <div class="design-head">${ed(`sections.${si}.designTitle`, sec.designTitle, "h3")}${ed(`sections.${si}.designLead`, sec.designLead, "p", "", true)}</div>
        <ol class="design-steps">${steps.map((x) => `<li>${esc(x)}</li>`).join("")}</ol>
      </div>` : ""}
      ${proc.length ? `<div class="proc-line"><b>${esc(sec.processTitle || "진행 과정")}</b><ol>${proc.map((x) => `<li><span>${esc(x.title)}</span></li>`).join("")}</ol></div>` : ""}
      ${ed("servicesNote", D.servicesNote, "p", "note", true)}
    </div>
    ${blocksHTML(sec, si)}
  </section>`;
  };

  R.process = (sec, si) => `<section class="block${bg(sec)}" id="${esc(sec.id)}">
    <div class="wrap">
      ${head(sec, si)}
      <ol class="process">${D.process.map((s, i) => shown(s) ? `<li class="${hid(s).trim()}"${obj("step", `process.${i}`)}>${ed(`process.${i}.title`, s.title, "b")}${ed(`process.${i}.body`, s.body, "p", "", true)}</li>` : "").join("")}</ol>
      ${add("process", "step", "단계 추가")}
    </div>
    ${blocksHTML(sec, si)}
  </section>`;

  R.contact = (sec, si) => {
    const C = D.contact;
    const acts = [];
    if (has(C.email)) {
      acts.push(`<a class="btn btn-light" href="mailto:${esc(C.email)}?subject=${encodeURIComponent(C.emailSubject || "")}">${ed("contact.emailButton", C.emailButton || "메일로 협업 문의")}</a>`);
      acts.push(`<button type="button" class="btn btn-ghost" id="copy-email">${ed("contact.copyButton", C.copyButton || "메일 주소 복사")}</button>`);
    }
    if (has(C.kakao)) acts.push(`<a class="btn btn-ghost" href="${esc(C.kakao)}" target="_blank" rel="noopener">${ed("contact.kakaoButton", C.kakaoButton || "카카오톡 문의")}</a>`);
    return `<section class="contact${bg(sec)}" id="${esc(sec.id)}">
      <div class="wrap contact-in">
        ${ed("contact.title", C.title, "h2")}
        ${ed("contact.body", C.body, "p", "", true)}
        <div class="contact-actions"${obj("contact", "contact")}>${acts.join("")}${has(C.email) ? ed("contact.email", C.email, "p", "email-text", false).replace("<p ", '<p style="flex-basis:100%" ') : ""}</div>
        <ul class="channel-links" aria-label="채널">${D.channels.map((c, i) => shown(c) && (has(c.url) || EDIT) ? `<li class="${hid(c).trim()}"${obj("channel", `channels.${i}`)}><a href="${esc(c.url)}" target="_blank" rel="noopener">${ed(`channels.${i}.name`, c.name)}<span>${esc(c.handle)}</span></a></li>` : "").join("")}${EDIT ? `<li>${add("channels", "channel", "채널 추가")}</li>` : ""}</ul>
      </div>
      ${blocksHTML(sec, si)}
    </section>`;
  };

  R.custom = (sec, si) => `<section class="block custom${bg(sec)}" id="${esc(sec.id)}">
    ${has(sec.title) || has(sec.lead) || EDIT ? `<div class="wrap">${head(sec, si)}</div>` : ""}
    ${blocksHTML(sec, si)}
  </section>`;

  /* ───── 전체 그리기 ───── */
  function render(data, opts = {}) {
    D = data; EDIT = !!opts.editing;
    document.body.classList.toggle("is-editing", EDIT);
    const site = D.site;
    document.title = site.title || document.title;
    $("logo").innerHTML = `<span class="dot ${ui.persona}"></span>${esc(D.people[ui.persona].name)}`;
    const fbPublic = (D.testimonials || []).some((x) => isPub(x) && okReview(x));
    const navName = (s) => s.type === "testimonials" && !fbPublic ? (s.navNoFeedback || "선정 이력") : s.nav;
    const hc = site.headerCta || { label: "협업 문의", href: "#contact" };
    $("header-cta").textContent = hc.label; $("header-cta").href = hc.href;

    // 리밍 / 안세림 파일 탭 (머리글 안에 있어서 스크롤해도 늘 보여요)
    document.body.dataset.p = ui.persona;
    $("ptabs").innerHTML = PERSONAS.map((k) => {
      const p = D.people[k] || {};
      return `<button type="button" role="tab" class="ptab ${k}" id="ptab-${k}" aria-selected="${ui.persona === k}" aria-controls="main" data-persona="${k}"><b>${esc(p.name)}</b><span>${esc(p.role || "")}</span></button>`;
    }).join("");

    const drawn = [];
    $("main").innerHTML = D.sections.map((sec, si) => {
      if (sec.hidden && !EDIT) return "";
      if (!inP(sec, SEC_P[sec.type])) return "";
      const f = R[sec.type] || R.custom;
      const html = f(sec, si);
      if (html.trim()) drawn.push(sec);
      if (!EDIT) return html;
      const name = sec.nav || sec.title || ({ hero: "첫 화면", metrics: "숫자", contact: "문의" })[sec.type] || "섹션";
      const bar = `<div class="ed-sec-bar" draggable="true" data-list="sections" data-index="${si}"><span class="ed-grip" aria-hidden="true">⋮⋮</span><b>${esc(name)}</b>${sec.hidden ? `<span class="ed-badge">숨김</span>` : ""}<button type="button" data-open="section" data-path="sections.${si}">섹션 설정</button></div>`;
      const between = `<div class="ed-between"><button type="button" class="ed-add" data-add="sections" data-kind="section" data-at="${si + 1}">+ 여기에 새 섹션</button></div>`;
      return `<div class="ed-sec${sec.hidden ? " ed-sec-hidden" : ""}" data-sec="${si}">${bar}${html}</div>${between}`;
    }).join("");
    $("nav").innerHTML = drawn.filter((s) => !s.hidden && has(s.nav)).map((s) => `<a href="#${esc(s.id)}">${esc(navName(s))}</a>`).join("");

    // 사이트 마지막 수정일(저장한 날)과 숫자의 데이터 기준일은 따로예요
    const saved = [String((D._meta || {}).savedAt || "").slice(0, 10), String(site.updated || "")].filter(has).sort().pop() || "";
    const note = (D.footer || {}).note;
    $("foot").innerHTML = `${ed("footer.copyright", (D.footer || {}).copyright, "p")}${has(note) || EDIT ? `<p>${ed("footer.note", note)}</p>` : ""}<p>마지막 수정 ${esc(saved)}. 숫자마다 기준일을 따로 적었어요.</p>`;
    bindCopy();
    // 내 컴퓨터(편집기 서버)에서 볼 때만: 이 화면에서 바로 수정하러 가는 버튼
    let go = $("edit-here");
    if (!EDIT && /^(127\.0\.0\.1|localhost)$/.test(location.hostname)) {
      if (!go) { go = document.createElement("a"); go.id = "edit-here"; go.className = "edit-here"; go.textContent = "이 페이지 수정하기"; document.body.appendChild(go); }
      go.href = "/edit#" + ui.persona;
    } else if (go) go.remove();
  }

  function bindCopy() {
    const btn = $("copy-email");
    if (!btn || EDIT) return;
    btn.onclick = async () => {
      const C = D.contact;
      try { await navigator.clipboard.writeText(C.email); btn.textContent = "복사했어요"; }
      catch { const r = document.createRange(); r.selectNodeContents(document.querySelector(".email-text")); getSelection().removeAllRanges(); getSelection().addRange(r); btn.textContent = "주소를 선택했어요"; }
      setTimeout(() => (btn.textContent = C.copyButton || "메일 주소 복사"), 1800);
    };
  }

  /* ───── 상세 보기 (공개 화면) ───── */
  const dlg = $("detail");
  const grid = (list, cls) => `<div class="result-grid ${cls}">${list.map(([k, v]) => `<div><b class="num">${comma(v)}</b><span>${esc(k)}</span></div>`).join("")}</div>`;
  function openProject(id, from) {
    const p = D.projects.find((x) => x.id === id && isPub(x));
    if (!p) return;
    opener = from || null;
    const b = p.brief || {};
    const why = [b.question, p.purpose].filter(has).join("\n");
    const rows = [["타깃 · 누구에게", p.audience], ["기획 배경 · 어떤 고민에", why], ["핵심 기획 · 첫 3초 후킹", b.message], ["유도한 행동 (CTA)", b.action]].filter((r) => has(r[1]));
    const media = has(p.thumb);
    $("detail-body").className = "detail-in" + (media ? "" : " no-media");
    $("detail-body").innerHTML = `
      <button type="button" class="close" aria-label="닫기">×</button>
      ${media ? thumbHTML(p) : ""}
      <div>
        <span class="chips-row">${(p.tags || []).map((t) => `<span class="chip">${esc(t)}</span>`).join("")}${p.brand ? `<span class="chip">${esc(p.brand)}</span>` : ""}</span>
        <h3 id="detail-title">${esc(p.title)}</h3>
        <dl>
          ${has(p.date) ? `<div><dt>게시</dt><dd class="num">${esc(p.date)} · ${esc(CONTEXT[p.context] || "")}</dd></div>` : `<div><dt>기록 맥락</dt><dd>${esc(CONTEXT[p.context] || "")}</dd></div>`}
          ${rows.map(([k, v]) => `<div><dt>${k}</dt><dd class="pre">${esc(v)}</dd></div>`).join("")}
          ${(p.roles || []).length ? `<div><dt>내가 맡은 역할</dt><dd class="roles-list">${p.roles.map((r) => `<span>${esc(r)}</span>`).join("")}</dd></div>` : ""}
          ${(p.reactions || []).length ? `<div><dt>성과 · 반응</dt><dd>${grid(p.reactions, "")}</dd></div>` : ""}
          ${(p.conversions || []).length ? `<div><dt>성과 · 전환</dt><dd>${grid(p.conversions, "conv")}</dd></div>` : ""}
        </dl>
        ${(p.links || []).filter((l) => has(l.url)).length ? `<div class="link-list"><dt>${esc(p.linksTitle || "함께 볼 콘텐츠")}</dt><ul>${p.links.filter((l) => has(l.url)).map((l) => `<li><a href="${esc(l.url)}" target="_blank" rel="noopener">${esc(l.label)}</a></li>`).join("")}</ul></div>` : ""}
        ${(D.testimonials || []).filter((t) => t.project === p.id && isPub(t) && okReview(t)).map((t) => `<div class="dt-review"><dt>업체 피드백 · ${esc(t.vendor)}</dt><blockquote>${esc(t.headline)}</blockquote>${has(t.image) ? `<button type="button" class="c-go" data-zoom="${esc(t.image)}" data-zoom-alt="${esc(t.imageAlt || t.vendor)}" data-zoom-cap="${esc(t.note || "")}">원본 메시지 보기</button>` : ""}</div>`).join("")}
        ${has(p.link) ? `<a class="btn btn-dark" href="${esc(p.link)}" target="_blank" rel="noopener">결과물 보기</a>` : ""}
      </div>`;
    if (!dlg.open) dlg.showModal();
  }
  function openMetric(i, from) {
    const m = D.metrics[i];
    if (!m || !isPub(m)) return;
    opener = from || null;
    const auto = m.auto === "brandCount", st = brandStats();
    const value = auto ? `${st.total}곳` : m.value;
    const ev = m.evidence || {};
    // 출처·근거 메모(본인 제공, 미리캔버스 등)는 방문자에게 보여 주지 않아요
    const text = auto ? `브랜드 협업 ${st.brand}곳, 웨딩커넥트 제휴 업체 ${st.wc}곳이에요.` : "";
    const rows = [["채널", m.channel], ["집계 기간", clean(m.period)], ["기준", m.asOf], ["내용", text]].filter((r) => has(r[1]));
    $("detail-body").className = "detail-in no-media";
    $("detail-body").innerHTML = `<button type="button" class="close" aria-label="닫기">×</button><div>
      <h3 id="detail-title">${esc(m.label)} <span class="num">${esc(value)}</span></h3>
      <dl>${rows.map(([k, v]) => `<div><dt>${k}</dt><dd>${esc(v)}</dd></div>`).join("")}</dl>
      ${has(ev.link) ? `<a class="btn btn-dark" href="${esc(ev.link)}"${/^https?:/.test(ev.link) ? ' target="_blank" rel="noopener"' : ' data-close-go'}>${esc(ev.linkLabel || "근거 보기")}</a>` : ""}
    </div>`;
    if (!dlg.open) dlg.showModal();
  }
  function openBrand(i, from) {
    const b = D.brands[i];
    if (!b || !isPub(b)) return;
    opener = from || null;
    const list = (b.campaigns || []).filter(isPub);
    const pubIds = new Set(D.projects.filter(isPub).map((p) => p.id));
    $("detail-body").className = "detail-in no-media";
    $("detail-body").innerHTML = `
      <button type="button" class="close" aria-label="닫기">×</button>
      <div>
        <span class="chips-row">${[b.category, b.type, has(b.agency) ? `with ${b.agency}` : ""].filter(has).map((t) => `<span class="chip">${esc(t)}</span>`).join("")}</span>
        <h3 id="detail-title">${esc(b.name)}</h3>
        ${has(clean(b.note)) ? `<p class="result-note">${esc(clean(b.note))}</p>` : ""}
        ${list.length ? `<ol class="campaigns">${list.map((c) => `<li><span class="c-when num">${esc(c.date || "")}</span><span class="c-what">${esc(noEmoji(c.title))}${has(clean(c.kind)) ? `<small>${esc(nodot(clean(c.kind)))}</small>` : ""}${has(clean(c.result)) ? `<small>${esc(nodot(clean(c.result)))}</small>` : ""}</span>${has(c.project) && pubIds.has(c.project) ? `<button type="button" class="c-go" data-project="${esc(c.project)}">자세히</button>` : has(c.link) ? `<a class="c-go" href="${esc(c.link)}" target="_blank" rel="noopener">보기</a>` : ""}</li>`).join("")}</ol>` : ""}
      </div>`;
    if (!dlg.open) dlg.showModal();
  }
  function openDelivery(id, from) {
    const d = (D.deliveries || []).find((x) => x.id === id && isPub(x) && okDelivery(x));
    if (!d) return;
    opener = from || null;
    const rows = [["업체", d.client], ["유형", d.type], ["형식", d.format], ["길이·비율", [d.duration, d.ratio].filter(has).join(" · ")], ["내용", d.summary]].filter((r) => has(r[1]));
    $("detail-body").className = "detail-in";
    $("detail-body").innerHTML = `
      <button type="button" class="close" aria-label="닫기">×</button>
      <div class="thumb video"><video src="${esc(d.video)}" poster="${esc(d.poster || "")}" controls playsinline preload="metadata"></video></div>
      <div>
        <span class="chips-row"><span class="chip">숏폼 납품</span>${has(d.category) ? `<span class="chip">${esc(d.category)}</span>` : ""}</span>
        <h3 id="detail-title">${esc(d.title)}</h3>
        <dl>${rows.map(([k, v]) => `<div><dt>${k}</dt><dd>${esc(v)}</dd></div>`).join("")}
          ${(d.roles || []).length ? `<div><dt>맡은 범위</dt><dd class="roles-list">${d.roles.map((r) => `<span>${esc(r)}</span>`).join("")}</dd></div>` : ""}
          ${(d.results || []).length ? `<div><dt>확인된 성과</dt><dd>${grid(d.results, "")}</dd></div>` : ""}
        </dl>
        ${has(d.link) ? `<a class="btn btn-dark" href="${esc(d.link)}" target="_blank" rel="noopener">게시물 보기</a>` : ""}
      </div>`;
    if (!dlg.open) dlg.showModal();
  }
  function openZoom(src, alt, cap, from) {
    opener = from || null;
    $("detail-body").className = "detail-in no-media zoom";
    $("detail-body").innerHTML = `<button type="button" class="close" aria-label="닫기">×</button><figure class="zoom-fig"><img src="${esc(src)}" alt="${esc(alt || "")}">${has(cap) ? `<figcaption>${esc(cap)}</figcaption>` : ""}</figure>`;
    if (!dlg.open) dlg.showModal();
  }
  dlg.addEventListener("close", () => { const v = dlg.querySelector("video"); if (v) v.pause(); });
  dlg.addEventListener("click", (e) => { if (e.target === dlg || e.target.closest(".close")) dlg.close(); });
  dlg.addEventListener("close", () => { if (opener && document.contains(opener)) opener.focus(); });

  // 공개 화면 동작(편집 모드에서는 editor.js가 클릭을 맡아요)
  document.addEventListener("click", (e) => {
    if (EDIT) return;
    const pr = e.target.closest("[data-project]");
    if (pr) { const from = pr.closest("dialog") ? opener : pr; if (dlg.open) dlg.close(); openProject(pr.dataset.project, from); return; }
    const br = e.target.closest("[data-brand]");
    if (br) { openBrand(+br.dataset.brand, br); return; }
    const go = e.target.closest("[data-close-go]");
    if (go) { dlg.close(); return; }   // 페이지 안 링크(#…)는 창을 닫고 이동해요
    const mt = e.target.closest("[data-metric]");
    if (mt) { openMetric(+mt.dataset.metric, mt); return; }
    if (e.target.closest("#owned-more")) { ui.ownedOpen = !ui.ownedOpen; render(D); return; }
    const dv = e.target.closest("[data-delivery]");
    if (dv) { openDelivery(dv.dataset.delivery, dv); return; }
    const zm = e.target.closest("[data-zoom]");
    if (zm) { openZoom(zm.dataset.zoom, zm.dataset.zoomAlt, zm.dataset.zoomCap, zm); return; }
    const cat = e.target.closest("[data-cat]");
    if (cat) { ui.brandCat = cat.dataset.cat; render(D); return; }
    if (e.target.closest("#brand-more")) { ui.brandOpen = !ui.brandOpen; render(D); return; }
  });
  document.addEventListener("keydown", (e) => {
    if (EDIT) return;
    const t = e.target.closest && e.target.closest('[role="button"][data-project], [role="button"][data-delivery], [role="button"][data-metric]');
    if (t && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); t.click(); }
    const pt = e.target.closest && e.target.closest("[data-persona]");
    if (pt && (e.key === "ArrowRight" || e.key === "ArrowLeft")) {
      setPersona(pt.dataset.persona === "liming" ? "seri" : "liming"); $("ptab-" + ui.persona).focus(); return;
    }
    const tab = e.target.closest && e.target.closest("[data-tab]");
    if (tab && (e.key === "ArrowRight" || e.key === "ArrowLeft")) {
      const all = [...document.querySelectorAll("[data-tab]")];
      const i = all.indexOf(tab), n = all[(i + (e.key === "ArrowRight" ? 1 : all.length - 1)) % all.length];
      ui.tab = n.dataset.tab; render(D, { editing: EDIT }); document.getElementById(n.id).focus();
    }
  });
  // 탭은 편집 중에도 바꿀 수 있어요
  function setPersona(k, keepScroll) {
    if (!PERSONAS.includes(k)) return;
    const changed = ui.persona !== k;
    ui.persona = k;
    history.replaceState(null, "", "#" + k);
    if (changed) render(D, { editing: EDIT });
    // 탭을 바꾸면 그 사람 소개(첫 화면)부터 보여요
    if (changed && !keepScroll) window.scrollTo({ top: 0 });
  }
  document.addEventListener("click", (e) => {
    const pp = e.target.closest("[data-persona]");
    if (pp) { setPersona(pp.dataset.persona); return; }
    const t = e.target.closest("[data-tab]");
    if (t) { ui.tab = t.dataset.tab; render(D, { editing: EDIT }); }
    const dc = e.target.closest("[data-dcat]");
    if (dc) { ui.dlvCat = dc.dataset.dcat; render(D, { editing: EDIT }); }
  });

  function fromHash() {
    const h = decodeURIComponent(location.hash.slice(1));
    const alias = { shortform: "owned", marketing: "owned" };
    if (PERSONAS.includes(h)) { setPersona(h); return; }
    if (["owned", "community", "delivery", "shortform", "marketing"].includes(h)) {
      ui.tab = alias[h] || h; ui.persona = TAB_P[ui.tab]; render(D, { editing: EDIT });
      const w = $("work"); if (w) w.scrollIntoView(); return;
    }
    if (h.startsWith("project-")) { if (ui.persona !== "liming") { ui.persona = "liming"; render(D, { editing: EDIT }); } openProject(h.slice(8)); return; }
    // 다른 탭에만 있는 섹션으로 가는 링크면 그 탭으로 바꿔서 보여 줘요
    if (h && !$(h)) {
      const sec = D.sections.find((s) => s.id === h && !s.hidden);
      const other = PERSONAS.find((k) => k !== ui.persona);
      if (sec && (sec.persona || SEC_P[sec.type]) === other) { ui.persona = other; render(D, { editing: EDIT }); const el = $(h); if (el) el.scrollIntoView(); }
    }
  }

  window.PortfolioApp = { render, ui, get data() { return D; } };
  if (window.PORTFOLIO) { render(window.PORTFOLIO); fromHash(); window.addEventListener("hashchange", fromHash); }
})();
