/* logic.js - v20.0 FULL: Dashboard + Logic Anchors + PDF */

window.nav = function(p) {
    document.querySelectorAll('.page').forEach(x => x.classList.remove('active'));
    document.getElementById('p-'+p).classList.add('active');
    if(p === 'matrix') app.renderMatrix();
    if(p === 'pdf') app.renderPDFPreview();
    window.scrollTo(0,0);
}

const app = {
    state: { 
        cat: 'BUS', 
        geo: { N:1, type:'x2x', S:'0.60' }, 
        idx: {}, 
        validIns: [], validJacket: [], msgs: [] 
    },

    init() { 
        this.setCat('BUS'); 
        setTimeout(() => this.showToasts(['Система: Dashboard v20.0 Готов']), 1000);
    },

    setCat(cat, btn) {
        this.state.cat = cat;
        if(btn) { 
            document.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active')); 
            btn.classList.add('active');
        }
        this.doReset(cat);
    },

    resetAll() { this.doReset(this.state.cat); },

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
        // Логика Ex-d (Вз -> з)
        if (id === 1) {
            if (val === 'Вз' && this.state.idx[8] !== 'з') { 
                this.state.idx[8] = 'з'; 
                this.showToasts(['Вз: добавлено заполнение']); 
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

    // === ЯДРО ЛОГИКИ (Все якоря сохранены) ===
    calculateState() {
        const s = this.state.idx;
        const cat = this.state.cat;
        let msgs = [];
        
        const req = { minT: -50, hf: false, fr: false, oil: false, chem: false, uv: false, flex: 1 };
        const fireCode = s[11] || "";
        
        if (fireCode.includes('HF') || fireCode.includes('LTx')) req.hf = true;
        if (fireCode.includes('FR')) req.fr = true;
        if (s[12] && s[12].includes('ХЛ')) req.minT = -60;
        if (s[12] && s[12].includes('ЭХЛ')) req.minT = -70;
        if (s[13] === '-МБ') req.oil = true;
        if (s[14] === '-ХС') req.chem = true;
        if (s[16] === '-УФ' || s[9] === 'Пэ') req.uv = true;
        if (s[19] === '(5)') req.flex = 1; 
        if (s[19] === '(6)') req.flex = 2;

        // Авто-барьер для BUS FR
        if (cat === 'BUS') {
            if (req.fr) {
                if (s[3] !== 'Си') s[3] = 'Си';
            } else {
                if (s[3] === 'Си') s[3] = '';
            }
        }

        // Логика Робототехники (6 класс)
        if (s[19] === '(6)') { 
            if (s[10] === 'К' || s[10] === 'Б') { s[10] = 'КГ'; msgs.push('Броня -> КГ (для роботов)'); }
            if (['Эа','Эм','ЭИа','ЭИм'].includes(s[6])) s[6] = 'Эо';
            if (['Эа','Эм','ЭИа','ЭИм'].includes(s[4])) s[4] = 'ЭИо';
        }

        // Фильтр Материалов
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

        // Авто-коррекция материалов (Упрощенная для скорости)
        if (!this.state.validIns.includes(s[2]) && this.state.validIns.length > 0) {
             // Пытаемся оставить тот же, если нет - первый валидный
             if(cat==='BUS' && this.state.validIns.includes('Пв')) s[2] = 'Пв';
             else s[2] = this.state.validIns[0];
             msgs.push(`Изоляция изменена на ${s[2]}`);
        }
        if (!this.state.validJacket.includes(s[9]) && this.state.validJacket.length > 0) {
             s[9] = this.state.validJacket[0];
             msgs.push(`Оболочка изменена на ${s[9]}`);
        }

        // Авто-цвет
        if (s[16] === '-УФ' || s[9] === 'Пэ') s[24] = 'Черный';
        else if (req.fr) s[24] = 'Оранжевый';
        else if (s[21] === 'i') s[24] = 'Синий'; 
        else if (cat === 'BUS' && s[23] === '[PB]') s[24] = 'Фиолетовый';
        else if (!['Желтый','Красный','Спец'].includes(s[24])) s[24] = 'Серый';

        this.state.msgs = msgs;
    },

    updateUI() {
        const s = this.state.idx;
        let sku = "ЭНИКУМ "; 
        [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17].forEach(id => { if(s[id]) sku += s[id]; });
        
        const g = this.state.geo;
        let s18 = (g.type === 'vfd') ? (DB.LIMITS.CONTROL.vfd_map[g.S]||"ERR") : ((g.type==='x') ? `${g.N}x${g.S}` : `${g.N}${g.type}${g.S}`);
        this.state.idx[18] = s18; 
        sku += " " + s18;
        
        if(s[19] && s[19] !== '(1)') sku += " " + s[19]; 
        if(s[20]) sku += " " + s[20];
        if(s[21]) sku += s[21]; if(s[22]) sku += s[22];
        if(s[23]) sku += s[23]; if(s[24]) sku += " " + s[24];
        
        const elSku = document.getElementById('skuDisplay');
        if(elSku) elSku.innerText = sku;
        
        this.renderIcons();
        this.renderDashboard(); 
        if(this.state.msgs.length) { this.showToasts(this.state.msgs); this.state.msgs = []; }
    },

    // === ГЕНЕРАТОР ПЛИТКИ (DASHBOARD GRID) ===
    renderDashboard() {
        const grid = document.getElementById('dashboardGrid');
        if (!grid) return;
        grid.innerHTML = '';

        grid.innerHTML += this.getGeoTile();

        // Порядок плиток на экране
        const priorityIds = [
            23, // Протокол
            2,  // Изоляция
            4, 6, // Экраны
            9,  // Оболочка
            10, // Броня
            11, // Пожарка
            12, // Климат
            13, 14, 15, 16, 17, // Среда
            19, // Гибкость
            21, // Ex-i
            1, // Вз
            24, 22 // Цвет, Вольтаж
        ];

        priorityIds.forEach(id => {
            if(id === 23 && this.state.cat !== 'BUS') return; 
            const meta = DB.INDICES.find(x => x.id === id);
            if (meta) {
                grid.innerHTML += this.getParamTile(meta);
            }
        });
    },

    getGeoTile() {
        const cat = this.state.cat;
        const lim = DB.LIMITS[cat];
        
        let typesHtml = lim.types.map(t => `<option value="${t}" ${this.state.geo.type===t?'selected':''}>${DB.GEO_TYPES.find(x=>x.c===t).l}</option>`).join('');
        
        let sList = lim.valid_S;
        if(this.state.geo.type === 'vfd') sList = sList.filter(s => ['1.5','2.5','4.0','6.0'].includes(s));
        if(cat === 'BUS') { const p = this.state.idx[23] || ''; const r = lim.proto[p] || lim.proto['']; sList = r.S; }
        let sHtml = sList.map(s => `<option value="${s}" ${this.state.geo.S===s?'selected':''}>${s} мм²</option>`).join('');
        
        let nList = [];
        if(cat === 'BUS') { const p = this.state.idx[23] || ''; nList = (lim.proto[p] || lim.proto['']).N; }
        else if(lim.get_valid_N) { nList = lim.get_valid_N(this.state.geo.S, this.state.geo.type); } 
        else { nList = [1,2,4]; }
        let nHtml = nList.map(n => `<option value="${n}" ${this.state.geo.N==n?'selected':''}>${n}</option>`).join('');
        
        return `
        <div class="param-tile" style="grid-column: span 2; border-left: 4px solid var(--primary);">
            <div class="tile-header">
                <span>ГЕОМЕТРИЯ КАБЕЛЯ</span>
                <span class="tile-id">#18</span>
            </div>
            <div class="geo-box">
                <div style="flex:0.5">
                    <div style="font-size:9px;color:#888;">КОЛ-ВО</div>
                    <select class="geo-select" onchange="app.updateGeo('N',this.value)">${nHtml}</select>
                </div>
                <div style="flex:1">
                    <div style="font-size:9px;color:#888;">ТИП</div>
                    <select class="geo-select" onchange="app.updateGeo('type',this.value)">${typesHtml}</select>
                </div>
                <div style="flex:0.8">
                    <div style="font-size:9px;color:#888;">СЕЧЕНИЕ</div>
                    <select class="geo-select" onchange="app.updateGeo('S',this.value)">${sHtml}</select>
                </div>
            </div>
        </div>`;
    },

    getParamTile(meta) {
        const val = this.state.idx[meta.id];
        
        let optionsHtml = meta.opts.map(o => {
            const isActive = (val === o.c);
            let isDisabled = false;
            
            if (meta.id === 2 && !this.state.validIns.includes(o.c)) isDisabled = true;
            if (meta.id === 9 && !this.state.validJacket.includes(o.c)) isDisabled = true;
            
            const classes = `opt-item ${isActive ? 'active' : ''} ${isDisabled ? 'disabled' : ''}`;
            const label = o.c === "" ? "Нет" : o.c;
            
            return `<div class="${classes}" onclick="app.updateVal(${meta.id}, '${o.c}')" title="${o.l}">${label}</div>`;
        }).join('');

        return `
        <div class="param-tile">
            <div class="tile-header">
                <span>${meta.n}</span>
                <span class="tile-id">#${meta.id}</span>
            </div>
            <div class="opt-list">
                ${optionsHtml}
            </div>
        </div>`;
    },

    // --- ЛОГИКА ИКОНОК (С ВОССТАНОВЛЕННЫМИ ЯКОРЯМИ) ---
    renderIcons() {
        const s = this.state.idx;
        const c = document.getElementById('headerIcons');
        if(!c) return;
        c.innerHTML = '';
        
        const mkIcon = (active, color, txt, badge) => {
            if(!active) return;
            const div = document.createElement('div');
            div.className = 'icon-badge active';
            div.style.background = color;
            div.innerHTML = txt;
            if(badge) div.innerHTML += `<span style="position:absolute; top:-4px; right:-6px; font-size:8px; color:black; background:white; border-radius:3px; padding:0 2px;">${badge}</span>`;
            c.appendChild(div);
        }

        // 1. Ex (Взрыв)
        const isEx = (s[21] === 'i' || s[1] === 'Вз');
        mkIcon(isEx, s[21]==='i'?'#0D6EFD':'#000', 'Ex', s[21]==='i'?'i':'');
        
        // 2. Fire (Пламя 1.2)
        let isFR = s[11] && s[11].includes('FR');
        let frBadge = '';
        if (isFR) {
             let dbl = false;
             if (this.state.cat === 'BUS') { if(s[5]==='С') dbl = true; }
             else { if(s[5]==='С' || s[3]==='Си' || (s[2]&&s[2].startsWith('Р'))) dbl = true; }
             if(dbl) frBadge = 'x2';
        }
        mkIcon(isFR, '#DC3545', '<i class="fas fa-fire"></i>', frBadge);

        // 3. HF
        let isHF = (s[11] && (s[11].includes('HF') || s[11].includes('LTx')));
        mkIcon(isHF, '#198754', '<i class="fas fa-leaf"></i>', s[11].includes('LTx')?'LTx':'HF');

        // 4. Climate
        let clim = s[12];
        if(clim) {
            let col = '#0D6EFD'; let icon = '<i class="fas fa-snowflake"></i>'; let badge = '';
            if(clim==='-Т') { col='#FFC107'; icon='<i class="fas fa-sun"></i>'; }
            if(clim==='-ЭХЛ') badge='x2';
            if(clim==='-М') { col='#0DCAF0'; icon='<i class="fas fa-water"></i>'; }
            mkIcon(true, col, icon, badge);
        }

        // 5. Oil/Chem
        mkIcon(s[13]==='-МБ', '#000', '<i class="fas fa-tint"></i>');
        mkIcon(s[14]==='-ХС', '#6610f2', '<i class="fas fa-flask"></i>');
        
        // 6. Flex
        if(s[19]==='(5)') mkIcon(true, '#6c757d', '<i class="fas fa-rainbow"></i>');
        if(s[19]==='(6)') mkIcon(true, '#343a40', '<i class="fas fa-robot"></i>');

        // 7. Screen (Якорь №2)
        let scrCnt = 0;
        const countL = (val) => {
            if(!val) return 0;
            if(['Экл','Экм','ЭИкл','ЭИкм'].includes(val)) return 3;
            if(['Эал','Эмо','ЭИал','ЭИмо'].includes(val)) return 2;
            return 1;
        };
        scrCnt = countL(s[4]) + countL(s[6]);
        if(scrCnt > 0) mkIcon(true, '#6c757d', '<i class="fas fa-border-all"></i>', scrCnt>1?('x'+scrCnt):'');

        // 8. Armor (Якорь №3)
        let arm = s[10];
        if(arm) {
            let badge = '';
            if(arm==='Б' || arm==='Кп') badge = 'x2';
            if(arm==='КБ') badge = 'x3';
            mkIcon(true, '#6c757d', '<i class="fas fa-shield-alt"></i>', badge);
        }
    },

    // --- PDF & MATRIX (Старый функционал возвращен) ---
    renderMatrix() {
        const c1 = document.getElementById('summaryTableArea');
        if (c1) {
            let html1 = '<table class="summary-table" style="width:auto; min-width:100%; border-collapse: collapse; font-size: 11px;"><thead><tr>';
            DB.INDICES.forEach(idx => { html1 += `<th style="background:var(--dark); color:white; padding:6px; border:1px solid var(--text);">${idx.id}</th>`; });
            html1 += '</tr></thead><tbody><tr>';
            DB.INDICES.forEach(idx => {
                html1 += `<td style="padding:0; border:1px solid var(--border); vertical-align:top; background:var(--bg-white);">`;
                idx.opts.forEach(o => {
                    if (o.c) { 
                        const isActive = (app.state.idx[idx.id] === o.c);
                        const activeStyle = isActive ? 'background:#0D6EFD; color:white; font-weight:bold;' : ''; 
                        html1 += `<div style="padding:3px 4px; border-bottom:1px solid var(--bg-light); cursor:default; ${activeStyle}" title="${o.l}">${o.c}</div>`;
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
        
        let specHtml = '';
        [18, 22, 23, 10, 11, 21].forEach((id, index) => {
            const val = this.state.idx[id]; if(!val && id !== 18) return;
            const meta = DB.INDICES.find(x=>x.id===id); const opt = meta.opts.find(o=>o.c===val);
            const valStr = (id===18) ? this.state.idx[18] : (opt ? opt.l : val);
            const bg = index % 2 === 0 ? 'var(--bg-white)' : 'var(--bg-light)';
            specHtml += `<tr style="background:${bg}; border-bottom:1px solid var(--border);"><td style="padding:8px; color:#666; width:40%;">${meta.n}</td><td style="padding:8px; font-weight:bold; text-align:right;">${valStr}</td></tr>`;
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