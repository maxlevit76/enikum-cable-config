/* logic.js - Движок v13.0 (Smart Logic + Technical Bible) */

// Навигация
window.nav = function(p, btn) {
    document.querySelectorAll('.page').forEach(x => x.classList.remove('active'));
    document.getElementById('p-'+p).classList.add('active');
    document.querySelectorAll('.nav-btn').forEach(x => x.classList.remove('active'));
    if(btn) btn.classList.add('active');
    if(p === 'matrix') app.renderMatrix();
    if(p === 'pdf') app.renderPDFPreview();
    window.scrollTo(0,0);
}

const app = {
    state: { cat: 'BUS', geo: { N:1, type:'x2x', S:'0.60' }, idx: {}, explanations: [], validIns: [], validJacket: [], memory: {}, snapshot: {} },

    init() { 
        this.setCat('BUS'); 
        setTimeout(() => this.showToasts(['Система v14.1: TU Strict Mode']), 1000);
    },

    setCat(cat, btn) {
        this.state.cat = cat;
        if(btn) { document.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active')); btn.classList.add('active'); }
        this.doReset(cat);
    },

    // Хард-ресет к дефолтам
    doReset(cat) {
        // 1. Очистка всего
        for(let i=1; i<=24; i++) this.state.idx[i] = "";
        // 2. Загрузка дефолтов
        const defs = DB.LIMITS[cat].defaults;
        for(const [k,v] of Object.entries(defs)) this.state.idx[k] = v;
        this.state.idx[22] = DB.LIMITS[cat].volt;
        // 3. Геометрия
        if(cat==='BUS') this.state.geo = {N:1, type:'x2x', S:'0.60'};
        if(cat==='SIGNAL') this.state.geo = {N:2, type:'x2x', S:'0.75'};
        if(cat==='CONTROL') this.state.geo = {N:5, type:'x', S:'1.5'};
        // 4. Гибкость (1) по умолчанию
        if (!this.state.idx[19]) this.state.idx[19] = '(1)';
        
        this.calculateState();
        this.updateUI();
    },

    updateVal(id, val) {
        this.state.idx[id] = val;
        // Ex-d логика
        if (id === 1) {
            if (val === 'Вз') { if(this.state.idx[8] !== 'з') this.state.idx[8] = 'з'; }
            else { if (this.state.idx[8] === 'з') this.state.idx[8] = ''; }
        }
        this.calculateState();
        this.updateUI();
    },

    updateGeo(k, v) { 
        this.state.geo[k] = v; 
        if(this.state.geo.type === 'vfd') this.state.geo.N = 1; 
        this.calculateState(); 
        this.updateUI(); 
    },

    // --- ГЛАВНЫЙ АЛГОРИТМ (SMART LOGIC RESTORED) ---
    calculateState() {
        const s = this.state.idx;
        const cat = this.state.cat;
        const msgs = [];
        this.state.explanations = [];
        const addExplain = (txt) => this.state.explanations.push(txt);

        // 1. СБОР ТРЕБОВАНИЙ (CONSTRAINTS)
        const req = { minT: -50, hf: false, fr: false, oil: false, chem: false, uv: false, flex: 1 };
        
        const fireCode = s[11] || "";
        if (fireCode.includes('HF') || fireCode.includes('LTx')) req.hf = true;
        if (fireCode.includes('FR')) req.fr = true;

        if (s[12] && s[12].includes('ХЛ')) req.minT = -60;
        if (s[12] && s[12].includes('ЭХЛ')) req.minT = -70;
        if (s[13] === '-МБ') req.oil = true;
        if (s[14] === '-ХС') req.chem = true;
        if (s[16] === '-УФ' || s[9] === 'Пэ') req.uv = true;
        
        if (s[19] === '(5)') { req.flex = 1; addExplain("Гибкий монтаж"); }
        if (s[19] === '(6)') { req.flex = 2; addExplain("Робототехника"); }

        // --- ROBOT POLICE ---
        if (s[19] === '(6)') { 
            if (s[10] === 'К' || s[10] === 'Б') {
                s[10] = 'КГ'; msgs.push('Броня заменена на гибкую (КГ)');
            }
            if (['Эа','Эм','ЭИа','ЭИм'].includes(s[6])) {
                 s[6] = 'Эо'; msgs.push('Общий экран заменен на оплетку (Эо)');
            }
            if (['Эа','Эм','ЭИа','ЭИм'].includes(s[4])) {
                 s[4] = 'ЭИо'; msgs.push('Экран пар заменен на оплетку (ЭИо)');
            }
        }

        // 2. ФИЛЬТРАЦИЯ МАТЕРИАЛОВ (INTERSECTION)
        const isCompatible = (matCode, type) => {
            let key = (type==='jacket') ? 'J_'+matCode : matCode;
            let p = DB.MAT_PROPS[key];
            if (!p) return false;

            if (p.minT > req.minT) return false; // Temp Check
            if (req.hf && !p.hf) return false;   // HF Check
            if (req.oil && type==='jacket' && !p.oil) return false; // Oil Check
            if (req.chem && type==='jacket' && !p.chem) return false; // Chem Check
            
            // Flex Check
            if (req.flex === 2 && p.flex_grade < 2) return false;
            if (req.flex === 1 && p.flex_grade < 0 && type==='jacket') return false;

            return true;
        };

        // Списки ВАЛИДНЫХ опций
        const allIns = DB.INDICES.find(x=>x.id===2).opts.map(o=>o.c);
        this.state.validIns = allIns.filter(c => isCompatible(c, 'ins'));

        const allJacket = DB.INDICES.find(x=>x.id===9).opts.map(o=>o.c);
        this.state.validJacket = allJacket.filter(c => isCompatible(c, 'jacket'));

        // ЗВЕЗДА СМЕРТИ (Предупреждения)
        if (this.state.validIns.length === 0) msgs.push('ВНИМАНИЕ: Нет изоляции под эти условия!');
        if (this.state.validJacket.length === 0) msgs.push('ВНИМАНИЕ: Нет оболочки под эти условия!');

        // 3. АВТО-КОРРЕКЦИЯ
        // Если текущий материал выпал из валидного списка -> меняем
        if (!this.state.validIns.includes(s[2]) && this.state.validIns.length > 0) {
            // Сортируем по рангу (цена) и берем первый подходящий
            const valid = this.state.validIns.sort((a,b) => DB.MAT_PROPS[a].rank - DB.MAT_PROPS[b].rank);
            if (cat === 'BUS' && valid.includes('Пв')) s[2] = 'Пв'; // Приоритет BUS
            else s[2] = valid[0];
        }

        if (!this.state.validJacket.includes(s[9]) && this.state.validJacket.length > 0) {
             const validJ = this.state.validJacket.sort((a,b) => DB.MAT_PROPS['J_'+a].rank - DB.MAT_PROPS['J_'+b].rank);
             s[9] = validJ[0];
        }
        
        // Anti-Stick: Если HF не нужен, а стоит HF, и есть ПВХ -> Меняем на ПВХ
        if (!req.hf && this.state.validJacket.includes('В') && DB.MAT_PROPS['J_'+s[9]].hf) {
             s[9] = 'В'; 
        }

        // 4. ЛОГИКА БАРЬЕРОВ И FR
        // Исправлено: Не стираем 'Си' принудительно, а только если это BUS non-HF
        if (!req.fr && s[3] === 'Си') {
             // Раньше стирали. Теперь оставляем, но можно вывести warning.
             // s[3] = ''; // Убрали авто-стирание для свободы выбора
        }
        
        if (cat === 'BUS' && req.fr && !req.hf) {
            if (s[2] === 'Пв' && s[3] !== 'Си') { s[3] = 'Си'; msgs.push('Добавлен барьер (Си) для FR'); }
        }

        // 5. ЦВЕТА
        let targetColor = 'Серый'; 
        if (s[16] === '-УФ' || s[9] === 'Пэ') targetColor = 'Черный';
        if (req.fr) targetColor = 'Оранжевый';
        if (cat === 'BUS' && s[23] === '[PB]') targetColor = 'Фиолетовый';
        if (s[21] === 'i') targetColor = 'Синий'; 
        if (s[24] !== 'Спец' && s[24] !== 'Желтый' && s[24] !== 'Красный') s[24] = targetColor;

        this.currentMsgs = msgs;
    },

    updateUI() {
        const s = this.state.idx;
        let sku = "ЭНИКУМ"; sku += " "; 
        [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17].forEach(id => { if(s[id]) sku += s[id]; });
        sku += " ";
        const g = this.state.geo;
        let s18 = (g.type === 'vfd') ? (DB.LIMITS.CONTROL.vfd_map[g.S]||"ERR") : ((g.type==='x') ? `${g.N}x${g.S}` : `${g.N}${g.type}${g.S}`);
        this.state.idx[18] = s18; sku += s18;
        
        const flex = s[19]; 
        if(flex && flex !== '(1)') sku += " " + flex; 
        
        if(s[20]) sku += " " + s[20];
        if(s[21]) sku += s[21]; if(s[22]) sku += s[22];
        if(s[23]) sku += s[23]; if(s[24]) sku += " " + s[24];
        sku = sku.replace(/\s+/g, ' ').trim();
        document.getElementById('skuDisplay').innerText = sku;

        this.renderIcons();
        this.renderForm();
        if(this.currentMsgs && this.currentMsgs.length) this.showToasts(this.currentMsgs);
    },

    /* =========================================================
       🔒 LOCKED: DASHBOARD ICONS v13.0
       ========================================================= */
    renderIcons() {
        const s = this.state.idx;
        const c = document.getElementById('headerIcons');
        c.innerHTML = '';
        
        const mkSlot = (isActive, html, color, badge) => {
            const div = document.createElement('div');
            div.className = `icon-slot ${isActive?'active':''}`;
            if(isActive) div.style.background = color;
            div.innerHTML = html;
            if(isActive && badge) div.innerHTML += `<div class="slot-badge">${badge}</div>`;
            return div;
        };

        // 1. CATEGORY
        c.appendChild(mkSlot(true, this.state.cat === 'BUS' ? '<i class="fas fa-network-wired"></i>' : (this.state.cat === 'SIGNAL' ? '<i class="fas fa-wave-square"></i>' : '<i class="fas fa-bolt"></i>'), '#343A40'));
        
        // 2. EX
        const isEx = (s[21] === 'i' || s[1] === 'Вз');
        let exColor = '#212529'; let exText = 'Ex';
        if (s[21] === 'i') { exColor = '#0D6EFD'; exText = 'Ex-i'; }
        c.appendChild(mkSlot(isEx, exText, exColor));
        
        // 3. FIRE
        let isFR = s[11] && s[11].includes('FR');
        let fireBadge = '';
        if (isFR) {
            const mat = DB.MAT_PROPS[s[2]];
            const isRubber = (s[2] === 'Р' || s[2] === 'РПс' || s[2] === 'РПп');
            const hasBarrier = (s[3] === 'Си' || s[5] === 'С');
            const busDouble = (this.state.cat === 'BUS' && s[3] === 'Си' && s[5] === 'С'); 
            if (this.state.cat === 'BUS') {
                if (busDouble || isRubber) fireBadge = 'x2';
            } else {
                if (isRubber || (mat && mat.fr && hasBarrier)) fireBadge = 'x2';
            }
        }
        c.appendChild(mkSlot(isFR, '<i class="fas fa-fire"></i>', '#DC3545', fireBadge));

        // 4. ECO
        let isEco = (s[11] && (s[11].includes('LTx') || s[11].includes('HF')));
        let ecoHtml = '<i class="fas fa-leaf"></i>';
        let ecoBadge = '';
        if (isEco) {
            if (s[11].includes('LTx')) { ecoBadge = 'LTx'; }
            else { ecoHtml = 'HF'; } 
        }
        c.appendChild(mkSlot(isEco, ecoHtml, '#198754', ecoBadge));

        // 5. CLIMATE
        let climColor = '#6EA8FE'; let climIcon = '<i class="fas fa-snowflake"></i>'; let climBadge = '';
        let isClim = (s[12] && s[12] !== '');
        if (s[12] === '-ЭХЛ') { climColor = '#0D6EFD'; climBadge = 'Ar'; }
        else if (s[12] === '-Т') { climColor = '#FFC107'; climIcon = '<i class="fas fa-sun"></i>'; climBadge = 'Tr'; }
        else if (s[12] === '-М') { climColor = '#0DCAF0'; climIcon = '<i class="fas fa-water"></i>'; climBadge = 'Sea'; }
        else if (s[12] === '-ХЛ') { climColor = '#6EA8FE'; }
        else { isClim = false; } 
        c.appendChild(mkSlot(isClim, climIcon, climColor, climBadge));

        // 6. SHIELD
        let isShield = !!s[10];
        let shBadge = '';
        if (isShield) {
            if (s[10] === 'Б') shBadge = 'x2';
            if (s[10] === 'КБ') shBadge = 'x3';
        }
        c.appendChild(mkSlot(isShield, '<i class="fas fa-shield-alt"></i>', '#495057', shBadge));

        // 7. GRID
        let screenCount = 0;
        if (s[4]) screenCount++; if (s[6]) screenCount++;
        if (['Эал','Эмо','ЭИал'].includes(s[4]) || ['Эал','Эмо'].includes(s[6])) screenCount = Math.max(screenCount, 2);
        if (['Экл','Экм','ЭИкл'].includes(s[4]) || ['Экл'].includes(s[6])) screenCount = 3;
        c.appendChild(mkSlot(screenCount > 0, '<i class="fas fa-border-all"></i>', '#6c757d', screenCount > 1 ? 'x'+screenCount : ''));

        // 8. MOTION (New: Bezier Curve for Flex)
        let flexIcon = '<i class="fas fa-bezier-curve"></i>'; 
        let flexActive = false;
        let flexColor = '#fd7e14';
        if (s[19] === '(5)') { flexIcon = '<i class="fas fa-bezier-curve"></i>'; flexActive = true; } // Parabola
        if (s[19] === '(6)') { flexIcon = '<i class="fas fa-robot"></i>'; flexActive = true; flexColor = '#212529'; }
        c.appendChild(mkSlot(flexActive, flexIcon, flexColor));

        // 9. EXTRAS
        const isHeat = (s[15] && s[15] !== '');
        let heatBadge = '';
        if (s[15]) heatBadge = s[15].replace('-ТС-', '');
        c.appendChild(mkSlot(isHeat, '<i class="fas fa-thermometer-half"></i>', '#dc3545', heatBadge));

        const isUV = (s[16] === '-УФ' || s[9] === 'Пэ');
        c.appendChild(mkSlot(isUV, '<i class="fas fa-sun"></i>', '#212529', 'UV')); // Black Sun
        c.appendChild(mkSlot(s[13] === '-МБ', '<i class="fas fa-tint"></i>', '#000'));
        c.appendChild(mkSlot(s[14] === '-ХС', '<i class="fas fa-flask"></i>', '#6610f2'));
    },
    /* === [END LOCKED] === */

    renderForm() {
        const area = document.getElementById('formArea');
        const openIdx = [];
        document.querySelectorAll('.acc-body').forEach((el, i) => { if(el.classList.contains('open')) openIdx.push(i); });
        area.innerHTML = '';
        DB.GROUPS.forEach((grp, gIdx) => {
            let html = '';
            grp.ids.forEach(id => {
                if(id === 18) { html += this.getGeoWidget(); return; }
                if(id === 23 && this.state.cat !== 'BUS') return;
                const meta = DB.INDICES.find(x => x.id === id);
                html += this.getControl(meta);
            });
            if(html) area.innerHTML += `<div class="acc-group"><div class="acc-header ${(gIdx===0||openIdx.includes(gIdx))?'active':''}" onclick="toggleAcc(this)">${grp.t} <i class="fas fa-chevron-down"></i></div><div class="acc-body ${(gIdx===0||openIdx.includes(gIdx))?'open':''}">${html}</div></div>`;
        });
    },

    getControl(meta) {
        const val = this.state.idx[meta.id];
        let opts = meta.opts.map(o => {
            let disabled = this.isDisabled(meta.id, o.c);
            
            // --- SMART FILTER VISUALS (HEATMAP) ---
            let style = "";
            if (meta.id === 11 && o.c.includes('FR')) style = "color:#fd7e14; font-weight:bold;";
            if (meta.id === 2 && DB.MAT_PROPS[o.c] && DB.MAT_PROPS[o.c].fr) style = "color:#fd7e14;";
            if ((meta.id === 3 || meta.id === 5) && o.c !== "") style = "color:#fd7e14;";

            if(disabled) return `<option value="${o.c}" disabled>${o.l}</option>`;
            return `<option value="${o.c}" style="${style}" ${val===o.c?'selected':''}>${o.l}</option>`;
        }).join('');
        
        const hintObj = meta.opts.find(o => o.c === val);
        const desc = hintObj ? hintObj.wiki : "";
        const hlClass = (val && val !== '') ? 'highlight' : '';
        return `<div class="control-row"><div class="lbl-row"><div class="lbl-main">${meta.n}</div><div class="lbl-idx">#${meta.id}</div></div><select class="c-select ${hlClass}" onchange="app.updateVal(${meta.id}, this.value)">${opts}</select><div class="hint ${val?'visible':''}">${desc}</div></div>`;
    },

    getGeoWidget() {
        const cat = this.state.cat; const lim = DB.LIMITS[cat];
        let typesHtml = lim.types.map(t => `<option value="${t}" ${this.state.geo.type===t?'selected':''}>${DB.GEO_TYPES.find(x=>x.c===t).l}</option>`).join('');
        let sList = lim.valid_S;
        if(this.state.geo.type === 'vfd') sList = sList.filter(s => ['1.5','2.5','4.0','6.0'].includes(s));
        if(cat === 'BUS') { const p = this.state.idx[23] || ''; const r = lim.proto[p] || lim.proto['']; sList = r.S; }
        let sHtml = sList.map(s => `<option value="${s}" ${this.state.geo.S===s?'selected':''}>${s} мм²</option>`).join('');
        let nList = [];
        if(cat === 'BUS') { const p = this.state.idx[23] || ''; nList = (lim.proto[p] || lim.proto['']).N; }
        else if(lim.get_valid_N) { nList = lim.get_valid_N(this.state.geo.S, this.state.geo.type); } else { nList = [1,2,4]; }
        let nHtml = nList.map(n => `<option value="${n}" ${this.state.geo.N==n?'selected':''}>${n}</option>`).join('');
        const isVFD = (this.state.geo.type === 'vfd');
        return `<div class="control-row" style="border-left:3px solid var(--primary); padding-left:15px; margin-left:-5px;"><div class="lbl-row"><div class="lbl-main">ГЕОМЕТРИЯ (18)</div></div><div class="geo-widget"><div class="geo-col"><div class="geo-lbl">КОЛ-ВО</div><select class="c-select" ${isVFD?'disabled':''} onchange="app.updateGeo('N',this.value)">${nHtml}</select></div><div class="geo-col"><div class="geo-lbl">ТИП</div><select class="c-select" onchange="app.updateGeo('type',this.value)">${typesHtml}</select></div><div class="geo-col"><div class="geo-lbl">СЕЧЕНИЕ</div><select class="c-select" onchange="app.updateGeo('S',this.value)">${sHtml}</select></div></div></div>`;
    },

    isDisabled(id, val) {
        const s = this.state.idx;
        // 1. Robot Logic
        if (s[19] === '(6)') {
            if (id === 10 && ['К','Б'].includes(val)) return true; 
            if ([4,6].includes(id) && ['Эа','Эм','ЭИа','ЭИм'].includes(val)) return true;
        }
        
        // 2. SMART INTERSECTION (Grey out invalid options)
        if (id === 2 && !this.state.validIns.includes(val)) return true;
        if (id === 9 && !this.state.validJacket.includes(val)) return true;

        return false;
    },

    renderMatrix() {
        // 1. Верхняя таблица: Структура маркообразования (Индексы 1-24)
        const c1 = document.getElementById('summaryTableArea');
        if (c1) {
            let html1 = '<table class="summary-table"><thead><tr>';
            
            // Заголовки (Номера индексов)
            DB.INDICES.forEach(idx => {
                html1 += `<th>${idx.id}</th>`;
            });
            html1 += '</tr></thead><tbody><tr>';
            
            // Названия параметров (Сжато)
            DB.INDICES.forEach(idx => {
                // Сокращаем длинные названия для компактности таблицы
                let shortName = idx.n.replace("Изоляция ", "").replace("Оболочка", "Обол.").replace("Напряжение", "Вольт");
                html1 += `<td><div class="st-idx" title="${idx.n}">${shortName}</div></td>`;
            });
            html1 += '</tr></tbody></table>';
            c1.innerHTML = html1;
        }

        // 2. Нижняя часть: Энциклопедия (Подробные описания из ТУ)
        const c2 = document.getElementById('detailedSpecs');
        if (c2) {
            let html2 = '';
            DB.INDICES.forEach(idx => {
                html2 += `<div class="spec-block">
                    <div class="spec-title">
                        <span>${idx.n}</span>
                        <span class="spec-code">Позиция #${idx.id}</span>
                    </div>`;
                
                idx.opts.forEach(o => {
                    // Рендерим только если есть код или описание
                    if (o.c || o.l) {
                        // Подсветка важных опций (FR, HF)
                        let extraStyle = "";
                        if(o.wiki && o.wiki.includes("Огнестойкая")) extraStyle = "color:#D67D0F; font-weight:bold;";
                        
                        html2 += `<div style="margin-bottom:8px; padding-bottom:6px; border-bottom:1px dashed #eee;">
                            <span class="opt-v" style="${extraStyle}">${o.c ? o.c : "(-)"}</span>
                            <div style="font-size:12px; font-weight:bold; color:#333;">${o.l}</div>
                            <div style="font-size:11px; color:#777; margin-top:2px;">${o.wiki || "Базовое исполнение"}</div>
                        </div>`;
                    }
                });
                html2 += `</div>`;
            });
            c2.innerHTML = html2;
        }
    },
    
    renderPDFPreview() {
        const sku = document.getElementById('skuDisplay').innerText;
        document.getElementById('pdfSkuMain').innerText = sku;
        document.getElementById('pdfIcons').innerHTML = document.getElementById('headerIcons').innerHTML;
        let destText = `Кабель марки <b>${sku.split(' ')[0]}</b> предназначен для передачи сигналов и данных. Изготовлен по ТУ 27.32.13-001-33185018-2023.`;
        document.getElementById('pdfDest').innerHTML = destText;
        let specHtml = '';
        [18, 22, 23, 10, 11, 21].forEach((id, index) => {
            const val = this.state.idx[id]; if(!val && id !== 18) return;
            const meta = DB.INDICES.find(x=>x.id===id); const opt = meta.opts.find(o=>o.c===val);
            const valStr = (id===18) ? this.state.idx[18] : (opt ? opt.l : val);
            const bg = index % 2 === 0 ? '#FFFFFF' : '#F8F9FA';
            specHtml += `<tr style="background:${bg}; border-bottom:1px solid #EEE;"><td style="padding:8px; color:#555; width:40%;">${meta.n}</td><td style="padding:8px; font-weight:bold; text-align:right;">${valStr}</td></tr>`;
        });
        document.getElementById('pdfSpecsTable').innerHTML = specHtml;
        const pdfAlerts = document.getElementById('pdfAlerts');
        if (this.state.explanations.length > 0) {
            pdfAlerts.style.display = 'block';
            pdfAlerts.innerHTML = "<b>ПРИМЕЧАНИЯ ПО ТУ:</b><br>" + this.state.explanations.map(e => `&bull; ${e}`).join('<br>');
        } else { pdfAlerts.style.display = 'none'; }
    }, 
    
    downloadPDF() {
        const element = document.getElementById('pdfExportTarget');
        const sku = document.getElementById('skuDisplay').innerText;
        const fab = document.querySelector('.fab-download');
        const oldHtml = fab.innerHTML; fab.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        const opt = { margin: 0, filename: `ENICUM_${sku}.pdf`, image: { type: 'jpeg', quality: 1.0 }, html2canvas: { scale: 2, useCORS: true, scrollY: 0 }, jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' } };
        html2pdf().set(opt).from(element).save().then(() => { fab.innerHTML = oldHtml; app.showToasts(['PDF скачан']); });
    }, 
    
    showToasts(msgs) {
        const c = document.getElementById('toasts');
        c.innerHTML = '';
        msgs.forEach(m => {
            const t = document.createElement('div');
            t.className = 'toast';
            if(m.includes('ОШИБКА')) t.classList.add('danger');
            t.innerHTML = `<i class="fas fa-info-circle"></i> <span>${m}</span>`;
            c.appendChild(t);
        });
        setTimeout(() => c.innerHTML = '', 4000);
    }
};

// Функция переключения аккордеонов
function toggleAcc(el) {
    el.classList.toggle('active');
    el.nextElementSibling.classList.toggle('open');
}

app.init();