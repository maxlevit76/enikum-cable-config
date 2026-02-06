/* logic.js - v14.9: The Librarian (Rich Matrix & Encyclopedia) */

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
        setTimeout(() => this.showToasts(['Система v14.9: Reference Mode']), 1000);
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
                if(this.state.idx[8] !== 'з') { this.state.idx[8] = 'з'; this.showToasts(['Добавлено заполнение для Ex-d']); }
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

    // === ГЛАВНЫЙ АЛГОРИТМ ===
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

        // BUS Force Barrier
        if (cat === 'BUS') {
            if (req.fr) {
                if (s[3] !== 'Си') { s[3] = 'Си'; msgs.push("Добавлен барьер (Си)"); }
            } else {
                if (s[3] === 'Си') { s[3] = ''; }
            }
        }

        // Horizontal Police
        if (s[19] === '(6)') { 
            if (s[10] === 'К' || s[10] === 'Б') { s[10] = 'КГ'; msgs.push('Броня -> КГ (Гибкая)'); }
            if (['Эа','Эм','ЭИа','ЭИм'].includes(s[6])) { s[6] = 'Эо'; msgs.push('Экран -> Эо (Оплетка)'); }
            if (['Эа','Эм','ЭИа','ЭИм'].includes(s[4])) { s[4] = 'ЭИо'; msgs.push('Экран пар -> ЭИо (Оплетка)'); }
        }

        // Material Filter
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

        // Optimizer
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
        
        const flex = s[19]; if(flex && flex !== '(1)') sku += " " + flex; 
        if(s[20]) sku += " " + s[20];
        if(s[21]) sku += s[21]; if(s[22]) sku += s[22];
        if(s[23]) sku += s[23]; if(s[24]) sku += " " + s[24];
        sku = sku.replace(/\s+/g, ' ').trim();
        document.getElementById('skuDisplay').innerText = sku;

        this.renderIcons();
        this.renderForm();
        if(this.state.msgs && this.state.msgs.length) { this.showToasts(this.state.msgs); this.state.msgs = []; }
    },

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
        c.appendChild(mkSlot(true, this.state.cat === 'BUS' ? '<i class="fas fa-network-wired"></i>' : (this.state.cat === 'SIGNAL' ? '<i class="fas fa-wave-square"></i>' : '<i class="fas fa-bolt"></i>'), '#343A40'));
        const isEx = (s[21] === 'i' || s[1] === 'Вз');
        let exColor = '#212529'; let exText = 'Ex'; if (s[21] === 'i') { exColor = '#0D6EFD'; exText = 'Ex-i'; }
        c.appendChild(mkSlot(isEx, exText, exColor));
        let isFR = s[11] && s[11].includes('FR');
        c.appendChild(mkSlot(isFR, '<i class="fas fa-fire"></i>', '#DC3545'));
        let isEco = (s[11] && (s[11].includes('LTx') || s[11].includes('HF')));
        let ecoHtml = '<i class="fas fa-leaf"></i>'; let ecoBadge = '';
        if (isEco) { if (s[11].includes('LTx')) { ecoBadge = 'LTx'; } else { ecoHtml = 'HF'; } }
        c.appendChild(mkSlot(isEco, ecoHtml, '#198754', ecoBadge));
        let climColor = '#6EA8FE'; let climIcon = '<i class="fas fa-snowflake"></i>'; let climBadge = '';
        let isClim = (s[12] && s[12] !== '');
        if (s[12] === '-ЭХЛ') { climColor = '#0D6EFD'; climBadge = 'Ar'; }
        else if (s[12] === '-Т') { climColor = '#FFC107'; climIcon = '<i class="fas fa-sun"></i>'; climBadge = 'Tr'; }
        else if (s[12] === '-М') { climColor = '#0DCAF0'; climIcon = '<i class="fas fa-water"></i>'; climBadge = 'Sea'; }
        c.appendChild(mkSlot(isClim, climIcon, climColor, climBadge));
        let isShield = !!s[10]; let shBadge = ''; if (isShield) { if (s[10] === 'Б') shBadge = 'x2'; if (s[10] === 'КБ') shBadge = 'x3'; }
        c.appendChild(mkSlot(isShield, '<i class="fas fa-shield-alt"></i>', '#495057', shBadge));
        let screenCount = 0; if (s[4]) screenCount++; if (s[6]) screenCount++;
        if (['Эал','Эмо','ЭИал'].includes(s[4]) || ['Эал','Эмо'].includes(s[6])) screenCount = Math.max(screenCount, 2);
        if (['Экл','Экм','ЭИкл'].includes(s[4]) || ['Экл'].includes(s[6])) screenCount = 3;
        c.appendChild(mkSlot(screenCount > 0, '<i class="fas fa-border-all"></i>', '#6c757d', screenCount > 1 ? 'x'+screenCount : ''));
        let flexIcon = '<i class="fas fa-bezier-curve"></i>'; let flexActive = false; let flexColor = '#fd7e14';
        if (s[19] === '(5)') { flexActive = true; } 
        if (s[19] === '(6)') { flexIcon = '<i class="fas fa-robot"></i>'; flexActive = true; flexColor = '#212529'; }
        c.appendChild(mkSlot(flexActive, flexIcon, flexColor));
        const isUV = (s[16] === '-УФ' || s[9] === 'Пэ');
        c.appendChild(mkSlot(isUV, '<i class="fas fa-sun"></i>', '#212529', 'UV')); 
        c.appendChild(mkSlot(s[13] === '-МБ', '<i class="fas fa-tint"></i>', '#000'));
        c.appendChild(mkSlot(s[14] === '-ХС', '<i class="fas fa-flask"></i>', '#6610f2'));
    },

    // === ОБНОВЛЕННЫЙ РЕНДЕР МАТРИЦЫ (СПРАВОЧНИК) ===
    renderMatrix() {
        // 1. Сводная Таблица: Сравнение категорий
        const c1 = document.getElementById('summaryTableArea');
        if (c1) {
            let html1 = `
            <table class="summary-table" style="width:100%; border-collapse:collapse; font-size:11px;">
                <thead>
                    <tr style="background:#212529; color:white;">
                        <th style="padding:8px; text-align:left;">ПАРАМЕТР</th>
                        <th style="padding:8px;">BUS (Шина)</th>
                        <th style="padding:8px;">SIGNAL (КСРЭВ)</th>
                        <th style="padding:8px;">CONTROL (КУВ)</th>
                    </tr>
                </thead>
                <tbody>
            `;
            
            // Строки для таблицы
            const rows = [
                { l: "Напряжение", id: 22 },
                { l: "Изоляция", id: 2 },
                { l: "Экран", id: 6 },
                { l: "Оболочка", id: 9 },
                { l: "Пожарка", id: 11 }
            ];

            rows.forEach((r, idx) => {
                const bg = idx % 2 === 0 ? '#fff' : '#f8f9fa';
                const getDef = (cat) => {
                    const code = DB.LIMITS[cat].defaults[r.id] || DB.LIMITS[cat].volt || "-";
                    // Ищем описание
                    const meta = DB.INDICES.find(x => x.id === r.id);
                    const opt = meta ? meta.opts.find(o => o.c === code) : null;
                    return opt ? `<b>${opt.c}</b><br><span style="color:#777; font-size:9px;">${opt.l.split('-')[0]}</span>` : code;
                };

                html1 += `
                <tr style="background:${bg}; border-bottom:1px solid #ddd;">
                    <td style="padding:8px; font-weight:bold;">${r.l}</td>
                    <td style="padding:8px; text-align:center;">${getDef('BUS')}</td>
                    <td style="padding:8px; text-align:center;">${getDef('SIGNAL')}</td>
                    <td style="padding:8px; text-align:center;">${getDef('CONTROL')}</td>
                </tr>`;
            });
            html1 += '</tbody></table>';
            c1.innerHTML = html1;
        }

        // 2. Детальная Энциклопедия
        const c2 = document.getElementById('detailedSpecs');
        if (c2) {
            let html2 = '';
            DB.INDICES.forEach(idx => {
                html2 += `
                <div class="spec-block" style="border-left:4px solid #F7941D; margin-bottom:20px; box-shadow:0 2px 5px rgba(0,0,0,0.05);">
                    <div class="spec-title" style="padding:10px; background:#f1f3f5; font-weight:bold; display:flex; justify-content:space-between;">
                        <span>${idx.n}</span>
                        <span style="background:#333; color:white; padding:2px 6px; border-radius:4px; font-size:10px;">ID ${idx.id}</span>
                    </div>
                    <div style="padding:10px;">`;
                
                idx.opts.forEach(o => {
                    if (o.c || o.l) {
                        let wikiText = o.wiki || "Базовое исполнение";
                        // Подсветка ТУ
                        wikiText = wikiText.replace(/\[ТУ (.*?)\]/g, '<span style="color:#0d6efd; font-weight:bold;">[ТУ $1]</span>');
                        
                        let badge = "";
                        if(o.wiki && o.wiki.toLowerCase().includes("огнестойк")) badge = '<i class="fas fa-fire" style="color:#DC3545; margin-right:5px;"></i>';
                        if(o.wiki && o.wiki.toLowerCase().includes("мороз")) badge = '<i class="fas fa-snowflake" style="color:#0DCAF0; margin-right:5px;"></i>';

                        html2 += `
                        <div style="margin-bottom:12px; border-bottom:1px dashed #eee; padding-bottom:8px;">
                            <div style="display:flex; justify-content:space-between; align-items:center;">
                                <span class="opt-v" style="font-size:14px; color:#F7941D;">${o.c ? o.c : "(-)"}</span>
                                <span style="font-size:11px; font-weight:bold; color:#555;">${o.l}</span>
                            </div>
                            <div style="font-size:11px; color:#666; margin-top:4px; line-height:1.4;">
                                ${badge} ${wikiText}
                            </div>
                        </div>`;
                    }
                });
                html2 += `</div></div>`;
            });
            c2.innerHTML = html2;
        }
    },
    
    renderPDFPreview() {
        const sku = document.getElementById('skuDisplay').innerText;
        document.getElementById('pdfSkuMain').innerText = sku;
        document.getElementById('pdfIcons').innerHTML = document.getElementById('headerIcons').innerHTML;
        let destText = `Кабель марки <b>${sku.split(' ')[0]}</b>. ТУ 27.32.13-001-33185018-2023.`;
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
            pdfAlerts.innerHTML = "<b>ПРИМЕЧАНИЯ:</b><br>" + this.state.explanations.map(e => `&bull; ${e}`).join('<br>');
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