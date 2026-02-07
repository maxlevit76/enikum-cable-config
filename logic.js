/* logic.js - v18.3: Fire Logic Anchor 1.2 (Silicone) */

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
    state: { 
        cat: 'BUS', 
        geo: { N:1, type:'x2x', S:'0.60' }, 
        idx: {}, 
        explanations: [], 
        validIns: [], 
        validJacket: [], 
        msgs: [] 
    },

    init() { 
        this.setCat('BUS'); 
        setTimeout(() => this.showToasts(['Система v18.3: Fire Logic 1.2']), 1000);
    },

    setCat(cat, btn) {
        this.state.cat = cat;
        if(btn) { 
            document.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active')); 
            btn.classList.add('active');
        }
        this.doReset(cat);
    },

    resetAll() {
        const icon = document.querySelector('.reset-btn i');
        if(icon) icon.classList.add('fa-spin');
        this.doReset(this.state.cat);
        setTimeout(() => { 
            if(icon) icon.classList.remove('fa-spin');
            this.showToasts(['Конфигурация сброшена']);
        }, 500);
    },

    doReset(cat) {
        for(let i=1; i<=24; i++) this.state.idx[i] = "";
        const defs = DB.LIMITS[cat].defaults;
        for(const [k,v] of Object.entries(defs)) this.state.idx[k] = v;
        this.state.idx[22] = DB.LIMITS[cat].volt;
        if(cat==='BUS') this.state.geo = {N:1, type:'x2x', S:'0.60'};
        if(cat==='SIGNAL') this.state.geo = {N:2, type:'x2x', S:'0.75'};
        if(cat==='CONTROL') this.state.geo = {N:5, type:'x', S:'1.5'};
        if (!this.state.idx[19]) this.state.idx[19] = '(1)';
        this.calculateState();
        this.updateUI();
    },

    updateVal(id, val) {
        this.state.idx[id] = val;
        if (id === 1) {
            if (val === 'Вз') { 
                if(this.state.idx[8] !== 'з') { this.state.idx[8] = 'з'; this.showToasts(['Вз: добавлено заполнение']); }
            } else { 
                if (this.state.idx[8] === 'з') this.state.idx[8] = '';
            }
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

    calculateState() {
        const s = this.state.idx;
        const cat = this.state.cat;
        let msgs = [];
        this.state.explanations = []; 
        const addExplain = (txt) => this.state.explanations.push(txt);
        
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

        if (cat === 'BUS') {
            if (req.fr) {
                if (s[3] !== 'Си') { s[3] = 'Си'; msgs.push("Добавлен барьер (Си)"); }
            } else {
                if (s[3] === 'Си') { s[3] = ''; }
            }
        }

        if (s[19] === '(6)') { 
            if (s[10] === 'К' || s[10] === 'Б') { s[10] = 'КГ'; msgs.push('Броня -> КГ'); }
            if (['Эа','Эм','ЭИа','ЭИм'].includes(s[6])) { s[6] = 'Эо'; msgs.push('Экран -> Эо'); }
            if (['Эа','Эм','ЭИа','ЭИм'].includes(s[4])) { s[4] = 'ЭИо'; msgs.push('Экран пар -> ЭИо'); }
        }

        const isCompatible = (matCode, type) => {
            let key = (type === 'jacket') ? 'J_' + matCode : matCode;
            let p = DB.MAT_PROPS[key];
            if (!p) return false;

            if (p.minT > req.minT) return false;
            if (req.hf && !p.hf) return false;
            if (req.oil && type === 'jacket' && !p.oil) return false;
            if (req.chem && type === 'jacket' && !p.chem) return false;
            if (req.fr) {
                const hasBarrier = (s[3] === 'Си');
                if (!p.fr && !(type === 'ins' && hasBarrier)) return false;
            }
            if (req.flex === 2 && p.flex_grade < 2) return false;
            if (req.flex === 1 && p.flex_grade < 0 && type==='jacket') return false;
            return true;
        };
        const allIns = DB.INDICES.find(x => x.id === 2).opts.map(o => o.c);
        const allJacket = DB.INDICES.find(x => x.id === 9).opts.map(o => o.c);
        this.state.validIns = allIns.filter(c => isCompatible(c, 'ins'));
        this.state.validJacket = allJacket.filter(c => isCompatible(c, 'jacket'));

        if (this.state.validIns.length === 0) msgs.push('ОШИБКА: Нет подходящей Изоляции!');
        if (this.state.validJacket.length === 0) msgs.push('ОШИБКА: Нет подходящей Оболочки!');

        const optimizeMaterial = (currentVal, validList, type) => {
            const curProp = DB.MAT_PROPS[(type==='jacket'?'J_':'')+currentVal];
            if (!curProp) return currentVal; 
            let needChange = false;
            let isDowngrade = false; 

            if (!validList.includes(currentVal)) needChange = true;
            if (!req.fr && curProp.fr) { needChange = true; isDowngrade = true; }
            if (!req.hf && curProp.hf) {
                if (cat === 'BUS' && type === 'ins' && currentVal === 'Пв') { needChange = false; } 
                else { needChange = true; isDowngrade = true; }
            }

            if (!needChange) return currentVal;
            const sortedValid = validList.sort((a,b) => {
                let pA = DB.MAT_PROPS[(type==='jacket'?'J_':'')+a];
                let pB = DB.MAT_PROPS[(type==='jacket'?'J_':'')+b];
                return (pA ? pA.rank : 99) - (pB ? pB.rank : 99);
            });
            if (curProp.family && !isDowngrade) {
                const sameFamily = sortedValid.find(c => {
                    let p = DB.MAT_PROPS[(type==='jacket'?'J_':'')+c];
                    return p && p.family === curProp.family && (!req.fr ? !p.fr : true);
                });
                if (sameFamily) return sameFamily;
            }
            if (cat === 'BUS' && type === 'ins' && sortedValid.includes('Пв')) return 'Пв';
            return sortedValid[0];
        };

        if (this.state.validIns.length > 0) {
            const newIns = optimizeMaterial(s[2], this.state.validIns, 'ins');
            if (newIns !== s[2]) { s[2] = newIns; msgs.push(`Изоляция -> ${newIns}`); }
        }

        if (this.state.validJacket.length > 0) {
            const newJacket = optimizeMaterial(s[9], this.state.validJacket, 'jacket');
            if (newJacket !== s[9]) { s[9] = newJacket; msgs.push(`Оболочка -> ${newJacket}`); }
        }
        
        let targetColor = 'Серый';
        if (s[16] === '-УФ' || s[9] === 'Пэ') targetColor = 'Черный';
        if (req.fr) targetColor = 'Оранжевый';
        if (s[21] === 'i') targetColor = 'Синий'; 
        if (cat === 'BUS' && s[23] === '[PB]') targetColor = 'Фиолетовый';
        if (s[24] !== 'Спец' && s[24] !== 'Желтый' && s[24] !== 'Красный') { s[24] = targetColor; }

        this.state.msgs = msgs;
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
        
        const elSku = document.getElementById('skuDisplay');
        if(elSku) elSku.innerText = sku;

        this.renderIcons();
        this.renderForm();
        if(this.state.msgs && this.state.msgs.length) { this.showToasts(this.state.msgs); this.state.msgs = []; }
    },

    renderIcons() {
        const s = this.state.idx;
        const c = document.getElementById('headerIcons');
        if(!c) return;
        c.innerHTML = '';
        const mkSlot = (isActive, html, color, badge) => {
            const div = document.createElement('div');
            div.className = `icon-slot ${isActive?'active':''}`;
            if(isActive) div.style.background = color;
            div.innerHTML = html;
            if(isActive && badge) div.innerHTML += `<div class="slot-badge">${badge}</div>`;
            return div;
        };
        
        // 0. Категория
        let catColor = (this.state.cat === 'BUS') ? '#0D6EFD' : ((this.state.cat === 'SIGNAL') ? '#198754' : '#F7941D');
        let catIcon = (this.state.cat === 'BUS') ? '<i class="fas fa-network-wired"></i>' : ((this.state.cat === 'SIGNAL') ? '<i class="fas fa-wave-square"></i>' : '<i class="fas fa-bolt"></i>');
        c.appendChild(mkSlot(true, catIcon, catColor));
        
        // --- 1. Ex / Ex-i ---
        const isEx = (s[21] === 'i' || s[1] === 'Вз');
        let exColor = '#000000'; // Вз - ЧЕРНЫЙ
        let exText = 'Ex';
        if (s[21] === 'i') { exColor = '#0D6EFD'; exText = 'Ex-i'; } // i - Синий
        c.appendChild(mkSlot(isEx, exText, exColor));
        
        // --- 2. FR (Fire Resistance - ЯКОРЬ №1.2) ---
        let isFR = s[11] && s[11].includes('FR');
        let frBadge = '';
        if (isFR) {
            let doubleBarrier = false;
            if (this.state.cat === 'BUS') {
                // Для BUS: Только ОБЩИЙ барьер (C)
                if (s[5] === 'С') doubleBarrier = true;
            } else {
                // Для SIGNAL/CONTROL:
                // 1. Общий (С) ИЛИ 
                // 2. Индивидуальный (Си) ИЛИ
                // 3. Изоляция Силикон (начинается на Р)
                const isSilicone = (s[2] && s[2].startsWith('Р')); 
                if (s[5] === 'С' || s[3] === 'Си' || isSilicone) doubleBarrier = true;
            }
            if (doubleBarrier) frBadge = 'x2';
        }
        c.appendChild(mkSlot(isFR, '<i class="fas fa-fire"></i>', '#DC3545', frBadge));
        
        // --- 3. HF / LTx ---
        let isLTx = (s[11] && s[11].includes('LTx'));
        let isHF = (s[11] && s[11].includes('HF'));
        let ecoActive = isLTx || isHF;
        let ecoHtml = '<i class="fas fa-leaf"></i>';
        let ecoBadge = '';
        if(isLTx) { ecoBadge = 'LTx'; } else if (isHF) { ecoHtml = 'HF'; }
        c.appendChild(mkSlot(ecoActive, ecoHtml, '#198754', ecoBadge));
        
        // --- 4. Climate (ХЛ/ЭХЛ/Т/М) ---
        let climColor = '#0D6EFD'; 
        let climIcon = '<i class="fas fa-snowflake"></i>';
        let climBadge = '';
        let isClim = (s[12] && s[12] !== '');
        
        if (s[12] === '-ЭХЛ') { climColor = '#0D6EFD'; climBadge = 'x2'; } // ЭХЛ = x2
        else if (s[12] === '-Т') { climColor = '#FFC107'; climIcon = '<i class="fas fa-sun"></i>'; } // Тропики - Желтый
        else if (s[12] === '-М') { climColor = '#0DCAF0'; climIcon = '<i class="fas fa-water"></i>'; } // Морской - Голубой
        else if (s[12] === '-ХЛ') { climColor = '#0D6EFD'; } 
        
        c.appendChild(mkSlot(isClim, climIcon, climColor, climBadge));
        
        // --- 5. Oil (МБ) ---
        c.appendChild(mkSlot(s[13] === '-МБ', '<i class="fas fa-tint"></i>', '#000000'));
        
        // --- 6. Chem (ХС) ---
        c.appendChild(mkSlot(s[14] === '-ХС', '<i class="fas fa-flask"></i>', '#6610f2'));
        
        // --- 7. Thermo (ТС) ---
        let isHot = (s[15] && s[15] !== '');
        let hotBadge = isHot ? s[15].replace('-ТС-', '').replace('-TC-', '') : '';
        c.appendChild(mkSlot(isHot, '<i class="fas fa-temperature-high"></i>', '#fd7e14', hotBadge));
        
        // --- 8. UV (УФ) ---
        const isUV = (s[16] === '-УФ' || s[9] === 'Пэ');
        c.appendChild(mkSlot(isUV, '<i class="fas fa-sun"></i>', '#212529', 'UV'));
        
        // --- 9. Flex (5/6) ---
        let flexIcon = '<i class="fas fa-rainbow"></i>'; // Парабола
        let flexActive = false; 
        let flexColor = '#6c757d'; // СЕРЫЙ МЕТАЛЛ
        if (s[19] === '(5)') { flexActive = true; } 
        if (s[19] === '(6)') { flexIcon = '<i class="fas fa-robot"></i>'; flexActive = true; }
        c.appendChild(mkSlot(flexActive, flexIcon, flexColor));
        
        // --- 10. Screen ---
        let screenCount = 0; if (s[4]) screenCount++; if (s[6]) screenCount++;
        if (['Эал','Эмо','ЭИал'].includes(s[4]) || ['Эал','Эмо'].includes(s[6])) screenCount = Math.max(screenCount, 2);
        if (['Экл','Экм','ЭИкл'].includes(s[4]) || ['Экл'].includes(s[6])) screenCount = 3;
        c.appendChild(mkSlot(screenCount > 0, '<i class="fas fa-border-all"></i>', '#6c757d', screenCount > 1 ? 'x'+screenCount : ''));
        
        // --- 11. Armor ---
        let isShield = !!s[10]; let shBadge = ''; if (isShield) { if (s[10] === 'Б') shBadge = 'x2'; if (s[10] === 'КБ') shBadge = 'x3'; }
        c.appendChild(mkSlot(isShield, '<i class="fas fa-shield-alt"></i>', '#6c757d', shBadge));
    },

    renderForm() {
        const area = document.getElementById('formArea');
        if (!area) return;
        const openIdx = [];
        document.querySelectorAll('.acc-body').forEach((el, i) => { if(el.classList.contains('open')) openIdx.push(i); });
        area.innerHTML = '';
        if (DB && DB.GROUPS) {
            DB.GROUPS.forEach((grp, gIdx) => {
                let html = '';
                grp.ids.forEach(id => {
                    if(id === 18) { html += this.getGeoWidget(); return; }
                    if(id === 23 && this.state.cat !== 'BUS') return;
                    const meta = DB.INDICES.find(x => x.id === id);
                    if (meta) { html += this.getControl(meta); }
                });
                if(html) {
                    const isOpen = (gIdx === 0 || openIdx.includes(gIdx));
                    area.innerHTML += `<div class="acc-group"><div class="acc-header ${isOpen?'active':''}" onclick="toggleAcc(this)">${grp.t} <i class="fas fa-chevron-down"></i></div><div class="acc-body ${isOpen?'open':''}">${html}</div></div>`;
                }
            });
        }
    },

    getControl(meta) {
        const val = this.state.idx[meta.id];
        let opts = meta.opts.map(o => {
            let disabled = this.isDisabled(meta.id, o.c);
            let style = "";
            if (meta.id === 11 && o.c.includes('FR')) style = "color:#F7941D; font-weight:bold;";
            if (meta.id === 2 && DB.MAT_PROPS[o.c] && DB.MAT_PROPS[o.c].fr) style = "color:#F7941D;";
            if ((meta.id === 3 || meta.id === 5) && o.c !== "") style = "color:#F7941D;";
            if(disabled) return `<option value="${o.c}" disabled>${o.l}</option>`;
            return `<option value="${o.c}" style="${style}" ${val===o.c?'selected':''}>${o.l}</option>`;
        }).join('');
        const hintObj = meta.opts.find(o => o.c === val);
        const desc = hintObj ? hintObj.hint : "";
        const hlClass = (val && val !== '') ? 'highlight' : '';
        return `<div class="control-row"><div class="lbl-row"><div class="lbl-main">${meta.n}</div><div class="lbl-idx">#${meta.id}</div></div><select class="c-select ${hlClass}" onchange="app.updateVal(${meta.id}, this.value)">${opts}</select><div class="hint ${val?'visible':''}">${desc}</div></div>`;
    },

    getGeoWidget() {
        const cat = this.state.cat;
        const lim = DB.LIMITS[cat];
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
        if (id === 2 && !this.state.validIns.includes(val)) return true;
        if (id === 9 && !this.state.validJacket.includes(val)) return true;
        return false;
    },

    renderMatrix() {
        const c1 = document.getElementById('summaryTableArea');
        if (c1) {
            let html1 = '<table class="summary-table" style="width:auto; min-width:100%; border-collapse: collapse; font-size: 11px;"><thead><tr>';
            DB.INDICES.forEach(idx => { 
                html1 += `<th style="background:var(--dark); color:white; padding:6px; border:1px solid var(--text);">${idx.id}</th>`; 
            });
            html1 += '</tr></thead><tbody><tr>';
            DB.INDICES.forEach(idx => {
                html1 += `<td style="padding:0; border:1px solid var(--border); vertical-align:top; background:var(--bg-white);">`;
                idx.opts.forEach(o => {
                    if (o.c) { 
                        const isActive = (app.state.idx[idx.id] === o.c);
                        const activeStyle = isActive ? 'background:#0D6EFD; color:white; font-weight:bold;' : ''; 
                        let colorStyle = 'color:var(--text);';
                        if (!isActive) {
                            if (o.wiki && o.wiki.toLowerCase().includes('огнестойк')) colorStyle = 'color:#F7941D; font-weight:bold;';
                            if (idx.id === 11 && o.c.includes('FR')) colorStyle = 'color:#F7941D; font-weight:bold;';
                        }
                        html1 += `<div style="padding:3px 4px; border-bottom:1px solid var(--bg-light); cursor:default; ${colorStyle} ${activeStyle}" title="${o.l}">${o.c}</div>`;
                    }
                });
                html1 += `</td>`;
            });
            html1 += '</tr></tbody></table>';
            c1.innerHTML = html1;
        }
    },
    
    renderPDFPreview() {
        const sku = document.getElementById('skuDisplay').innerText;
        document.getElementById('pdfSkuMain').innerText = sku;
        document.getElementById('pdfIcons').innerHTML = document.getElementById('headerIcons').innerHTML;
        
        let specHtml = '';
        [18, 22, 23, 10, 11, 21].forEach((id, index) => {
            const val = this.state.idx[id]; if(!val && id !== 18) return;
            const meta = DB.INDICES.find(x=>x.id===id); const opt = meta.opts.find(o=>o.c===val);
            const valStr = (id===18) ? this.state.idx[18] : (opt ? opt.l : val);
            const bg = index % 2 === 0 ? 'var(--bg-white)' : 'var(--bg-light)';
            specHtml += `<tr style="background:${bg}; border-bottom:1px solid var(--border);"><td style="padding:8px; color:var(--text-muted); width:40%;">${meta.n}</td><td style="padding:8px; font-weight:bold; text-align:right;">${valStr}</td></tr>`;
        });
        const tableArea = document.getElementById('pdfSpecsTable');
        if(tableArea) tableArea.innerHTML = specHtml;
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
        if(!msgs || !msgs.length) return;
        const t = document.createElement('div');
        t.className = 'toast';
        const isDanger = msgs.some(m => m.includes('ОШИБКА'));
        if(isDanger) t.classList.add('danger');
        let content = '';
        if(msgs.length === 1) { content = `<span>${msgs[0]}</span>`; } 
        else { content = `<div style="display:flex; flex-direction:column; align-items:flex-start;">`; msgs.forEach(m => content += `<div style="margin-bottom:2px;">• ${m}</div>`); content += `</div>`; }
        t.innerHTML = `<i class="fas fa-info-circle" style="margin-top:${msgs.length>1?'4px':'0'}"></i> ${content}`;
        c.appendChild(t);
        const time = 3000 + (msgs.length * 1000);
        setTimeout(() => c.innerHTML = '', time);
    }
};

function toggleAcc(el) {
    el.classList.toggle('active');
    el.nextElementSibling.classList.toggle('open');
}

app.init();