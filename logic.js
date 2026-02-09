/* ==========================================================================
   PROJECT: ENICUM CONFIGURATOR
   VERSION: v23.3 (Dashboard Icons Logic)
   FILE:    [L] logic.js
   DESC:    Ядро v21.1 + Новая отрисовка иконок (всегда видны).
   ========================================================================== */

   window.nav = function(p) {
    document.querySelectorAll('.page').forEach(x => x.classList.remove('active'));
    document.getElementById('p-'+p).classList.add('active');
    if(p === 'matrix') app.renderMatrix();
    if(p === 'pdf') app.renderPDFPreview();
    window.scrollTo(0,0);
}

const app = {
    // --- [L-02] STATE ---
    state: { 
        cat: 'BUS', 
        geo: { N:1, type:'x2x', S:'0.60' }, 
        idx: {}, 
        validIns: [], validJacket: [], msgs: [] 
    },

    // --- [L-03] INIT ---
    init() { 
        this.setCat('BUS'); 
        setTimeout(() => this.showToasts(['Система готова: v23.3']), 1000);
    },

    setCat(cat) {
        this.state.cat = cat;
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

    // --- [L-04] HANDLERS ---
    updateVal(id, val) {
        // TOGGLE LOGIC (Тумблер из v21.1)
        if (this.state.idx[id] === val && id !== 2 && id !== 9) {
             this.state.idx[id] = ""; 
        } else {
             this.state.idx[id] = val;
        }

        // Ex-d logic
        if (id === 1 && this.state.idx[1] === 'Вз' && this.state.idx[8] !== 'з') {
             this.state.idx[8] = 'з'; 
             this.showToasts(['Вз: добавлено заполнение']);
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

    // --- [L-05] CORE CALCULATION (From v21.1) ---
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

        if (cat === 'BUS') {
            if (req.fr) { if (s[3] !== 'Си') s[3] = 'Си'; } 
            else { if (s[3] === 'Си') s[3] = ''; }
        }

        if (s[19] === '(6)') { 
            if (s[10] === 'К' || s[10] === 'Б') { s[10] = 'КГ'; msgs.push('Броня -> КГ (Робот)'); }
            if (['Эа','Эм','ЭИа','ЭИм'].includes(s[6])) s[6] = 'Эо';
            if (['Эа','Эм','ЭИа','ЭИм'].includes(s[4])) s[4] = 'ЭИо';
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

        if (!this.state.validIns.includes(s[2]) && this.state.validIns.length > 0) {
             if(cat==='BUS' && this.state.validIns.includes('Пв')) s[2] = 'Пв';
             else s[2] = this.state.validIns[0];
        }
        if (!this.state.validJacket.includes(s[9]) && this.state.validJacket.length > 0) {
             s[9] = this.state.validJacket[0];
        }

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
        
        document.getElementById('skuDisplay').innerText = sku;
        
        this.renderIcons();
        this.renderDashboard(); 
        if(this.state.msgs.length) { this.showToasts(this.state.msgs); this.state.msgs = []; }
    },

    // --- [L-07] НОВАЯ ЛОГИКА ИКОНОК (Active/Inactive) ---
    renderIcons() {
        const c = document.getElementById('headerIcons');
        if(!c) return;
        c.innerHTML = '';
        const s = this.state.idx;

        // Хелпер для подсчета экранов
        const countL = (val) => {
            if(!val) return 0;
            if(['Экл','Экм','ЭИкл','ЭИкм'].includes(val)) return 3;
            if(['Эал','Эмо','ЭИал','ЭИмо'].includes(val)) return 2;
            return 1;
        };
        const scrCnt = countL(s[4]) + countL(s[6]);

        // Конфигурация панели (Иконки фиксированы)
        const dashboard = [
            { id: 'ex',   active: (s[21]==='i' || s[1]==='Вз'), col: (s[21]==='i'?'#0D6EFD':'#000'), txt: 'Ex', bdg: (s[21]==='i'?'i':'') },
            { id: 'fire', active: (s[11] && s[11].includes('FR')), col: '#DC3545', ic: 'fa-fire', bdg: (s[5]==='С'||s[3]==='Си'?'x2':'') },
            { id: 'hf',   active: (s[11] && (s[11].includes('HF') || s[11].includes('LTx'))), col: '#198754', ic: 'fa-leaf', bdg: (s[11].includes('LTx')?'LTx':'HF') },
            { id: 'clim', active: (s[12]), col: (s[12]==='-Т'?'#FFC107':(s[12]==='-М'?'#0DCAF0':'#0D6EFD')), ic: (s[12]==='-Т'?'fa-sun':(s[12]==='-М'?'fa-water':'fa-snowflake')), bdg: (s[12]==='-ЭХЛ'?'x2':'') },
            { id: 'oil',  active: (s[13]==='-МБ'), col: '#000', ic: 'fa-tint' },
            { id: 'chem', active: (s[14]==='-ХС'), col: '#6610f2', ic: 'fa-flask' },
            { id: 'uv',   active: (s[16]==='-УФ'), col: '#212529', ic: 'fa-sun', bdg: 'UV' },
            { id: 'flex', active: (s[19]==='(5)'||s[19]==='(6)'), col: (s[19]==='(6)'?'#343a40':'#6c757d'), ic: (s[19]==='(6)'?'fa-robot':'fa-rainbow') },
            { id: 'scr',  active: (scrCnt > 0), col: '#6c757d', ic: 'fa-border-all', bdg: (scrCnt>1 ? 'x'+scrCnt : '') },
            { id: 'arm',  active: (s[10]), col: '#6c757d', ic: 'fa-shield-alt', bdg: (s[10]==='КБ'?'x3':(s[10]==='Б'||s[10]==='Кп'?'x2':'')) }
        ];

        dashboard.forEach(item => {
            const div = document.createElement('div');
            // Добавляем класс inactive или active для CSS
            div.className = `icon-badge ${item.active ? 'active' : 'inactive'}`;
            
            // Если иконка активна, применяем её цвет (иначе она будет серой через CSS)
            if (item.active) {
                if (item.col && item.col !== '#000') div.style.borderColor = item.col;
                // Особая логика для желтого цвета (чтобы иконка была темной на желтом)
                if (item.id === 'clim' && item.col === '#FFC107') div.style.color = '#212529'; 
            }

            // Контент
            let inner = item.ic ? `<i class="fas ${item.ic}"></i>` : item.txt;
            
            // Если активна, красим саму иконку
            if(item.active && item.col) div.style.color = (item.col === '#FFC107' ? '#000' : item.col);
            
            div.innerHTML = inner;
            
            // Бейджик рисуем только если активна
            if (item.active && item.bdg) {
                div.innerHTML += `<div class="icon-sub">${item.bdg}</div>`;
            }
            c.appendChild(div);
        });
    },

    renderDashboard() {
        const grid = document.getElementById('dashboardGrid');
        if (!grid) return;
        grid.innerHTML = '';

        grid.innerHTML += this.getCategoryTile();

        // Порядок "ОТ ЗАДАЧИ" (Task Flow)
        const renderOrder = [
            23, 18, 19, // Суть
            11, 1, 21,  // Безопасность
            4, 6, 10, 12, 13, 14, 15, 16, 17, 7, // Защита
            2, 9, 22, 24, 3, 5, 8, 20 // Конструктив
        ];

        renderOrder.forEach(id => {
            if(id === 23 && this.state.cat !== 'BUS') return; 
            if(id === 18) { grid.innerHTML += this.getGeoTile(); return; }

            const meta = DB.INDICES.find(x => x.id === id);
            if (meta) grid.innerHTML += this.getParamTile(meta);
        });
    },

    getCategoryTile() {
        const cats = [{id:'BUS', lbl:'BUS'}, {id:'SIGNAL', lbl:'SIGNAL'}, {id:'CONTROL', lbl:'CONTROL'}];
        let html = '';
        cats.forEach(c => {
            const isActive = (this.state.cat === c.id);
            html += `<div class="opt-item ${isActive ? 'active' : ''}" onclick="app.setCat('${c.id}')">${c.lbl}</div>`;
        });
        return `<div class="param-tile tile-category"><div class="tile-header"><span style="font-weight:bold; color:var(--brand-black);">КАТЕГОРИЯ</span><span class="tile-id">TYPE</span></div><div class="opt-list" style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:4px;">${html}</div></div>`;
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
        return `<div class="param-tile"><div class="tile-header"><span>ГЕОМЕТРИЯ</span><span class="tile-id">#18</span></div><div class="geo-box"><div class="geo-col-wrap" style="flex:0.6"><div class="geo-lbl">КОЛ-ВО</div><select class="geo-select" onchange="app.updateGeo('N',this.value)">${nHtml}</select></div><div class="geo-col-wrap" style="flex:1"><div class="geo-lbl">ТИП</div><select class="geo-select" onchange="app.updateGeo('type',this.value)">${typesHtml}</select></div><div class="geo-col-wrap" style="flex:0.8"><div class="geo-lbl">СЕЧЕНИЕ</div><select class="geo-select" onchange="app.updateGeo('S',this.value)">${sHtml}</select></div></div></div>`;
    },

    getParamTile(meta) {
        const val = this.state.idx[meta.id];
        let visibleOpts = meta.opts.filter(o => o.c !== "");
        let optionsHtml = visibleOpts.map(o => {
            const isActive = (val === o.c);
            let isDisabled = false;
            if (meta.id === 2 && !this.state.validIns.includes(o.c)) isDisabled = true;
            if (meta.id === 9 && !this.state.validJacket.includes(o.c)) isDisabled = true;
            const classes = `opt-item ${isActive ? 'active' : ''} ${isDisabled ? 'disabled' : ''}`;
            return `<div class="${classes}" onclick="app.updateVal(${meta.id}, '${o.c}')" title="${o.hint || o.l}">${o.c}</div>`;
        }).join('');
        return `<div class="param-tile"><div class="tile-header"><span>${meta.n}</span><span class="tile-id">#${meta.id}</span></div><div class="opt-list">${optionsHtml}</div></div>`;
    },

    renderMatrix() {
        const c1 = document.getElementById('summaryTableArea');
        if (c1) {
            let html1 = '<table class="summary-table" style="width:auto; min-width:100%; border-collapse: collapse; font-size: 11px;"><thead><tr>';
            DB.INDICES.forEach(idx => { html1 += `<th style="background:#231F20; color:white; padding:6px; border:1px solid #555;">${idx.id}</th>`; });
            html1 += '</tr></thead><tbody><tr>';
            DB.INDICES.forEach(idx => {
                html1 += `<td style="padding:0; border:1px solid #ccc; vertical-align:top; background:white;">`;
                idx.opts.forEach(o => {
                    if (o.c) { 
                        const isActive = (app.state.idx[idx.id] === o.c);
                        const activeStyle = isActive ? 'background:#F7931E; color:black; font-weight:bold;' : ''; 
                        html1 += `<div style="padding:3px 4px; border-bottom:1px solid #eee; cursor:default; ${activeStyle}" title="${o.hint}">${o.c}</div>`;
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
            const bg = index % 2 === 0 ? '#fff' : '#f9f9f9';
            specHtml += `<tr style="background:${bg}; border-bottom:1px solid #eee;"><td style="padding:8px; color:#666; width:40%;">${meta.n}</td><td style="padding:8px; font-weight:bold; text-align:right;">${valStr}</td></tr>`;
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

app.init();