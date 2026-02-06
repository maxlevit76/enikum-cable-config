/* logic.js - v14.2: Logic Repair (Reset, Anti-Stick, Basic Police) */

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
    // Начальное состояние
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
        setTimeout(() => this.showToasts(['Система v14.2: Logic Online']), 1000);
    },

    // Смена категории (Вкладки сверху)
    setCat(cat, btn) {
        this.state.cat = cat;
        if(btn) { 
            document.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active')); 
            btn.classList.add('active'); 
        }
        this.doReset(cat);
    },

    // Кнопка СБРОС (Reset All)
    resetAll() {
        // Анимация иконки
        const icon = document.querySelector('.reset-btn i');
        if(icon) icon.classList.add('fa-spin');
        
        // Выполняем сброс
        this.doReset(this.state.cat);
        
        // Убираем анимацию и даем уведомление
        setTimeout(() => { 
            if(icon) icon.classList.remove('fa-spin');
            this.showToasts(['Конфигурация сброшена']);
        }, 500);
    },

    // Логика сброса (Загрузка дефолтов из database.js)
    doReset(cat) {
        // 1. Очищаем массив индексов
        for(let i=1; i<=24; i++) this.state.idx[i] = "";
        
        // 2. Загружаем дефолты для текущей категории
        const defs = DB.LIMITS[cat].defaults;
        for(const [k,v] of Object.entries(defs)) this.state.idx[k] = v;
        
        // 3. Устанавливаем напряжение
        this.state.idx[22] = DB.LIMITS[cat].volt;
        
        // 4. Сбрасываем геометрию
        if(cat==='BUS') this.state.geo = {N:1, type:'x2x', S:'0.60'};
        if(cat==='SIGNAL') this.state.geo = {N:2, type:'x2x', S:'0.75'};
        if(cat==='CONTROL') this.state.geo = {N:5, type:'x', S:'1.5'};
        
        // 5. Гибкость по умолчанию - класс 1 (если не задано иное)
        if (!this.state.idx[19]) this.state.idx[19] = '(1)';
        
        // Пересчитываем и рисуем
        this.calculateState();
        this.updateUI();
    },

    // Обновление одного индекса из Select
    updateVal(id, val) {
        this.state.idx[id] = val;
        
        // Спец-логика для Взрывозащиты (Ex-d)
        // Если выбрали Вз -> ставим Заполнение (з)
        if (id === 1) {
            if (val === 'Вз') { 
                if(this.state.idx[8] !== 'з') {
                    this.state.idx[8] = 'з';
                    this.showToasts(['Добавлено заполнение для Ex-d']);
                }
            } else { 
                // Если убрали Вз -> убираем заполнение (если оно было)
                if (this.state.idx[8] === 'з') this.state.idx[8] = ''; 
            }
        }
        
        this.calculateState();
        this.updateUI();
    },

    // Обновление геометрии (Кол-во, Тип, Сечение)
    updateGeo(k, v) { 
        this.state.geo[k] = v; 
        if(this.state.geo.type === 'vfd') this.state.geo.N = 1; 
        this.calculateState(); 
        this.updateUI(); 
    },

    // === МОЗГ СИСТЕМЫ (CALCULATE STATE) ===
    calculateState() {
        const s = this.state.idx;
        const cat = this.state.cat;
        let msgs = [];
        this.state.explanations = []; // Для PDF
        const addExplain = (txt) => this.state.explanations.push(txt);

        // --- 1. СБОР ТРЕБОВАНИЙ (CONSTRAINTS) ---
        // Создаем "портрет" идеального материала для текущих условий
        const req = { 
            minT: -50, // Температура по умолчанию
            hf: false, // Безгалогенность
            fr: false, // Огнестойкость
            oil: false, // Маслостойкость
            chem: false, // Химстойкость
            uv: false, // УФ-стойкость
            flex: 1 // Гибкость: 1=Low, 2=High
        };
        
        // Анализируем выбранные пользователем индексы
        const fireCode = s[11] || "";
        if (fireCode.includes('HF') || fireCode.includes('LTx')) req.hf = true;
        if (fireCode.includes('FR')) req.fr = true;

        if (s[12] && s[12].includes('ХЛ')) req.minT = -60;
        if (s[12] && s[12].includes('ЭХЛ')) req.minT = -70;
        if (s[13] === '-МБ') req.oil = true;
        if (s[14] === '-ХС') req.chem = true;
        // УФ нужен если выбран индекс УФ или оболочка Пэ (она всегда на улице)
        if (s[16] === '-УФ' || s[9] === 'Пэ') req.uv = true;
        
        // Уровень гибкости
        if (s[19] === '(5)') { req.flex = 1; addExplain("Гибкий монтаж"); }
        if (s[19] === '(6)') { req.flex = 2; addExplain("Робототехника (Super Flex)"); }

        // --- 2. ГОРИЗОНТАЛЬНАЯ ПОЛИЦИЯ (Hard Rules) ---
        // Запрещает несовместимые комбинации индексов
        
        // Полиция Роботов (Flex)
        if (s[19] === '(6)') { 
            // Робот не может быть в жесткой броне
            if (s[10] === 'К' || s[10] === 'Б') {
                s[10] = 'КГ'; // Меняем на гибкую
                msgs.push('Броня заменена на гибкую (КГ) для Super Flex');
            }
            // Робот не может иметь экран из фольги (она порвется)
            if (['Эа','Эм','ЭИа','ЭИм'].includes(s[6])) {
                 s[6] = 'Эо'; 
                 msgs.push('Общий экран заменен на оплетку (Эо)');
            }
            if (['Эа','Эм','ЭИа','ЭИм'].includes(s[4])) {
                 s[4] = 'ЭИо'; 
                 msgs.push('Экран пар заменен на оплетку (ЭИо)');
            }
        }

        // --- 3. ФИЛЬТРАЦИЯ МАТЕРИАЛОВ (THE FILTER) ---
        // Проверяем каждый материал из базы на соответствие требованиям (req)
        
        const isCompatible = (matCode, type) => {
            // Формируем ключ для поиска свойств (J_ для оболочек)
            let key = (type === 'jacket') ? 'J_' + matCode : matCode;
            let p = DB.MAT_PROPS[key];
            
            // Если материала нет в базе физики - пропускаем (или запрещаем)
            if (!p) return false;

            // Сравнение параметров
            if (p.minT > req.minT) return false; // Не держит мороз
            if (req.hf && !p.hf) return false;   // Нужен HF, а материал не HF
            if (req.oil && type === 'jacket' && !p.oil) return false; // Нужна маслостойкость
            if (req.chem && type === 'jacket' && !p.chem) return false; // Нужна химстойкость
            if (req.uv && type === 'jacket' && !p.uv) {
                // Исключение: Черный ПВХ может быть УФ стойким, но пока считаем строго по базе
                // В данном случае считаем по базе.
                return false; 
            }
            
            // Проверка гибкости
            if (req.flex === 2 && p.flex_grade < 2) return false; // Для роботов только спецматериалы
            
            return true;
        };

        // Получаем все возможные коды изоляции и оболочки из базы
        const allIns = DB.INDICES.find(x => x.id === 2).opts.map(o => o.c);
        const allJacket = DB.INDICES.find(x => x.id === 9).opts.map(o => o.c);

        // Фильтруем их
        this.state.validIns = allIns.filter(c => isCompatible(c, 'ins'));
        this.state.validJacket = allJacket.filter(c => isCompatible(c, 'jacket'));

        // Предупреждения, если выбор пуст
        if (this.state.validIns.length === 0) msgs.push('НЕТ ИЗОЛЯЦИИ под эти требования!');
        if (this.state.validJacket.length === 0) msgs.push('НЕТ ОБОЛОЧКИ под эти требования!');

        // --- 4. ANTI-STICK (АВТО-ПЕРЕКЛЮЧЕНИЕ) ---
        // Если текущий материал перестал быть валидным -> меняем на лучший доступный
        
        // Для Изоляции (Индекс 2)
        if (!this.state.validIns.includes(s[2]) && this.state.validIns.length > 0) {
            // Сортируем валидные по Рангу (цене/качеству) - от 1 до 6
            const valid = this.state.validIns.sort((a,b) => {
                let pA = DB.MAT_PROPS[a];
                let pB = DB.MAT_PROPS[b];
                return (pA ? pA.rank : 99) - (pB ? pB.rank : 99);
            });
            
            // Логика предпочтений:
            // Для BUS лучше брать 'Пв' (rank 2), чем 'П' (rank 2), если доступно
            if (cat === 'BUS' && valid.includes('Пв')) {
                s[2] = 'Пв';
            } else {
                s[2] = valid[0]; // Берем самый дешевый (низкий ранг)
            }
            msgs.push(`Изоляция изменена на ${s[2]}`);
        }

        // Для Оболочки (Индекс 9)
        if (!this.state.validJacket.includes(s[9]) && this.state.validJacket.length > 0) {
             const validJ = this.state.validJacket.sort((a,b) => {
                let pA = DB.MAT_PROPS['J_'+a];
                let pB = DB.MAT_PROPS['J_'+b];
                return (pA ? pA.rank : 99) - (pB ? pB.rank : 99);
             });
             s[9] = validJ[0]; // Берем самый дешевый
             msgs.push(`Оболочка изменена на ${s[9]}`);
        }
        
        // --- 5. ФИНАЛЬНАЯ ПОКРАСКА (Цвета) ---
        let targetColor = 'Серый'; 
        if (s[16] === '-УФ' || s[9] === 'Пэ') targetColor = 'Черный'; // Улица = Черный
        if (req.fr) targetColor = 'Оранжевый'; // Огнестойкость = Оранжевый
        if (s[21] === 'i') targetColor = 'Синий'; // Ex-i = Синий
        if (cat === 'BUS' && s[23] === '[PB]') targetColor = 'Фиолетовый'; // Profibus
        
        // Применяем цвет, если не выбран Спец, Желтый или Красный вручную
        if (s[24] !== 'Спец' && s[24] !== 'Желтый' && s[24] !== 'Красный') {
            s[24] = targetColor;
        }

        this.state.msgs = msgs;
    },

    // Отрисовка интерфейса
    updateUI() {
        const s = this.state.idx;
        
        // Формирование Артикула
        let sku = "ЭНИКУМ"; sku += " "; 
        // Перебираем индексы по порядку (кроме геометрии 18)
        [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17].forEach(id => { 
            if(s[id]) sku += s[id]; 
        });
        sku += " ";
        
        // Геометрия (18)
        const g = this.state.geo;
        let s18 = "";
        if (g.type === 'vfd') {
            s18 = (DB.LIMITS.CONTROL.vfd_map[g.S] || "ERR");
        } else if (g.type === 'x') {
            s18 = `${g.N}x${g.S}`;
        } else {
            // x2x (Пары) или x3x (Тройки)
            let char = (g.type === 'x2x') ? 'x2x' : 'x3x';
            s18 = `${g.N}${char}${g.S}`;
        }
        this.state.idx[18] = s18; // Сохраняем для PDF
        sku += s18;
        
        // Гибкость (19) - добавляем в артикул только если не (1)
        const flex = s[19]; 
        if(flex && flex !== '(1)') sku += " " + flex; 
        
        // Остальные индексы
        if(s[20]) sku += " " + s[20];
        if(s[21]) sku += s[21]; 
        if(s[22]) sku += s[22];
        if(s[23]) sku += s[23]; 
        if(s[24]) sku += " " + s[24];
        
        // Чистим лишние пробелы
        sku = sku.replace(/\s+/g, ' ').trim();
        document.getElementById('skuDisplay').innerText = sku;

        // Рендер компонентов
        this.renderIcons();
        this.renderForm();
        
        // Показ сообщений (если есть новые)
        if(this.state.msgs && this.state.msgs.length) {
            this.showToasts(this.state.msgs);
            this.state.msgs = []; // Очищаем после показа
        }
    },

    // --- ОТРИСОВКА ИКОНОК (DASHBOARD) ---
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

        // 1. Категория
        c.appendChild(mkSlot(true, this.state.cat === 'BUS' ? '<i class="fas fa-network-wired"></i>' : (this.state.cat === 'SIGNAL' ? '<i class="fas fa-wave-square"></i>' : '<i class="fas fa-bolt"></i>'), '#343A40'));
        
        // 2. Ex (Взрывозащита)
        const isEx = (s[21] === 'i' || s[1] === 'Вз');
        let exColor = '#212529'; let exText = 'Ex';
        if (s[21] === 'i') { exColor = '#0D6EFD'; exText = 'Ex-i'; }
        c.appendChild(mkSlot(isEx, exText, exColor));
        
        // 3. Fire (Огонь)
        let isFR = s[11] && s[11].includes('FR');
        c.appendChild(mkSlot(isFR, '<i class="fas fa-fire"></i>', '#DC3545'));

        // 4. Eco (Экология)
        let isEco = (s[11] && (s[11].includes('LTx') || s[11].includes('HF')));
        let ecoHtml = '<i class="fas fa-leaf"></i>';
        let ecoBadge = '';
        if (isEco) {
            if (s[11].includes('LTx')) { ecoBadge = 'LTx'; }
            else { ecoHtml = 'HF'; } 
        }
        c.appendChild(mkSlot(isEco, ecoHtml, '#198754', ecoBadge));

        // 5. Climate (Климат)
        let climColor = '#6EA8FE'; let climIcon = '<i class="fas fa-snowflake"></i>'; let climBadge = '';
        let isClim = (s[12] && s[12] !== '');
        if (s[12] === '-ЭХЛ') { climColor = '#0D6EFD'; climBadge = 'Ar'; }
        else if (s[12] === '-Т') { climColor = '#FFC107'; climIcon = '<i class="fas fa-sun"></i>'; climBadge = 'Tr'; }
        else if (s[12] === '-М') { climColor = '#0DCAF0'; climIcon = '<i class="fas fa-water"></i>'; climBadge = 'Sea'; }
        c.appendChild(mkSlot(isClim, climIcon, climColor, climBadge));

        // 6. Shield (Броня)
        let isShield = !!s[10];
        let shBadge = '';
        if (isShield) {
            if (s[10] === 'Б') shBadge = 'x2';
            if (s[10] === 'КБ') shBadge = 'x3';
        }
        c.appendChild(mkSlot(isShield, '<i class="fas fa-shield-alt"></i>', '#495057', shBadge));

        // 7. Grid (Экраны)
        let screenCount = 0;
        if (s[4]) screenCount++; if (s[6]) screenCount++;
        if (['Эал','Эмо','ЭИал'].includes(s[4]) || ['Эал','Эмо'].includes(s[6])) screenCount = Math.max(screenCount, 2);
        if (['Экл','Экм','ЭИкл'].includes(s[4]) || ['Экл'].includes(s[6])) screenCount = 3;
        c.appendChild(mkSlot(screenCount > 0, '<i class="fas fa-border-all"></i>', '#6c757d', screenCount > 1 ? 'x'+screenCount : ''));

        // 8. Motion (Гибкость)
        let flexIcon = '<i class="fas fa-bezier-curve"></i>'; 
        let flexActive = false;
        let flexColor = '#fd7e14';
        if (s[19] === '(5)') { flexActive = true; } 
        if (s[19] === '(6)') { flexIcon = '<i class="fas fa-robot"></i>'; flexActive = true; flexColor = '#212529'; }
        c.appendChild(mkSlot(flexActive, flexIcon, flexColor));

        // 9. UV / Oil / Chem (Спецсвойства)
        const isUV = (s[16] === '-УФ' || s[9] === 'Пэ');
        c.appendChild(mkSlot(isUV, '<i class="fas fa-sun"></i>', '#212529', 'UV')); 
        c.appendChild(mkSlot(s[13] === '-МБ', '<i class="fas fa-tint"></i>', '#000'));
        c.appendChild(mkSlot(s[14] === '-ХС', '<i class="fas fa-flask"></i>', '#6610f2'));
    },

    // --- ОТРИСОВКА ФОРМЫ ---
    renderForm() {
        const area = document.getElementById('formArea');
        // Запоминаем открытые вкладки аккордеона
        const openIdx = [];
        document.querySelectorAll('.acc-body').forEach((el, i) => { if(el.classList.contains('open')) openIdx.push(i); });
        
        area.innerHTML = '';
        
        DB.GROUPS.forEach((grp, gIdx) => {
            let html = '';
            grp.ids.forEach(id => {
                // Виджет геометрии
                if(id === 18) { html += this.getGeoWidget(); return; }
                // Индекс 23 только для BUS
                if(id === 23 && this.state.cat !== 'BUS') return;
                
                const meta = DB.INDICES.find(x => x.id === id);
                html += this.getControl(meta);
            });
            
            // Если группа не пустая - рисуем аккордеон
            if(html) {
                // Первая группа всегда открыта, остальные по памяти
                const isOpen = (gIdx === 0 || openIdx.includes(gIdx));
                area.innerHTML += `
                <div class="acc-group">
                    <div class="acc-header ${isOpen?'active':''}" onclick="toggleAcc(this)">
                        ${grp.t} <i class="fas fa-chevron-down"></i>
                    </div>
                    <div class="acc-body ${isOpen?'open':''}">
                        ${html}
                    </div>
                </div>`;
            }
        });
    },

    // Генерация HTML для Select
    getControl(meta) {
        const val = this.state.idx[meta.id];
        
        let opts = meta.opts.map(o => {
            let disabled = this.isDisabled(meta.id, o.c);
            let style = "";
            
            // Визуальная подсветка важных опций
            if (meta.id === 11 && o.c.includes('FR')) style = "color:#fd7e14; font-weight:bold;"; // FR оранжевый
            if (meta.id === 2 && DB.MAT_PROPS[o.c] && DB.MAT_PROPS[o.c].fr) style = "color:#fd7e14;";
            
            if(disabled) return `<option value="${o.c}" disabled>${o.l}</option>`;
            return `<option value="${o.c}" style="${style}" ${val===o.c?'selected':''}>${o.l}</option>`;
        }).join('');
        
        // Получаем подсказку (Hint)
        const hintObj = meta.opts.find(o => o.c === val);
        const desc = hintObj ? hintObj.hint : ""; // Берем короткий HINT для формы
        
        const hlClass = (val && val !== '') ? 'highlight' : '';
        
        return `
        <div class="control-row">
            <div class="lbl-row">
                <div class="lbl-main">${meta.n}</div>
                <div class="lbl-idx">#${meta.id}</div>
            </div>
            <select class="c-select ${hlClass}" onchange="app.updateVal(${meta.id}, this.value)">
                ${opts}
            </select>
            <div class="hint ${val?'visible':''}">${desc}</div>
        </div>`;
    },

    // Виджет Геометрии (Сложный HTML)
    getGeoWidget() {
        const cat = this.state.cat; 
        const lim = DB.LIMITS[cat];
        
        // Типы скрутки
        let typesHtml = lim.types.map(t => 
            `<option value="${t}" ${this.state.geo.type===t?'selected':''}>${DB.GEO_TYPES.find(x=>x.c===t).l}</option>`
        ).join('');
        
        // Сечения
        let sList = lim.valid_S;
        if(this.state.geo.type === 'vfd') sList = sList.filter(s => ['1.5','2.5','4.0','6.0'].includes(s));
        
        // Для BUS сечения зависят от протокола
        if(cat === 'BUS') { 
            const p = this.state.idx[23] || ''; 
            const r = lim.proto[p] || lim.proto['']; 
            sList = r.S; 
        }
        
        let sHtml = sList.map(s => 
            `<option value="${s}" ${this.state.geo.S===s?'selected':''}>${s} мм²</option>`
        ).join('');
        
        // Количество жил/пар
        let nList = [];
        if(cat === 'BUS') { 
            const p = this.state.idx[23] || ''; 
            nList = (lim.proto[p] || lim.proto['']).N; 
        } else if(lim.get_valid_N) { 
            nList = lim.get_valid_N(this.state.geo.S, this.state.geo.type); 
        } else { 
            nList = [1,2,4]; 
        }
        
        let nHtml = nList.map(n => 
            `<option value="${n}" ${this.state.geo.N==n?'selected':''}>${n}</option>`
        ).join('');
        
        const isVFD = (this.state.geo.type === 'vfd');
        
        return `
        <div class="control-row" style="border-left:3px solid var(--primary); padding-left:15px; margin-left:-5px;">
            <div class="lbl-row"><div class="lbl-main">ГЕОМЕТРИЯ (18)</div></div>
            <div class="geo-widget">
                <div class="geo-col">
                    <div class="geo-lbl">КОЛ-ВО</div>
                    <select class="c-select" ${isVFD?'disabled':''} onchange="app.updateGeo('N',this.value)">${nHtml}</select>
                </div>
                <div class="geo-col">
                    <div class="geo-lbl">ТИП</div>
                    <select class="c-select" onchange="app.updateGeo('type',this.value)">${typesHtml}</select>
                </div>
                <div class="geo-col">
                    <div class="geo-lbl">СЕЧЕНИЕ</div>
                    <select class="c-select" onchange="app.updateGeo('S',this.value)">${sHtml}</select>
                </div>
            </div>
        </div>`;
    },

    // Проверка на Disabled (Greyed out)
    isDisabled(id, val) {
        // Если поле фильтруется по "Умной Логике"
        if (id === 2 && !this.state.validIns.includes(val)) return true;
        if (id === 9 && !this.state.validJacket.includes(val)) return true;
        return false;
    },

    // Рендер Матрицы (Справочник)
    renderMatrix() {
        // 1. Верхняя таблица
        const c1 = document.getElementById('summaryTableArea');
        if (c1) {
            let html1 = '<table class="summary-table"><thead><tr>';
            DB.INDICES.forEach(idx => { html1 += `<th>${idx.id}</th>`; });
            html1 += '</tr></thead><tbody><tr>';
            DB.INDICES.forEach(idx => {
                let shortName = idx.n.replace("Изоляция ", "").replace("Оболочка", "Обол.").replace("Напряжение", "Вольт");
                html1 += `<td><div class="st-idx" title="${idx.n}">${shortName}</div></td>`;
            });
            html1 += '</tr></tbody></table>';
            c1.innerHTML = html1;
        }

        // 2. Энциклопедия (Использует wiki текст)
        const c2 = document.getElementById('detailedSpecs');
        if (c2) {
            let html2 = '';
            DB.INDICES.forEach(idx => {
                html2 += `<div class="spec-block"><div class="spec-title"><span>${idx.n}</span><span class="spec-code">Позиция #${idx.id}</span></div>`;
                idx.opts.forEach(o => {
                    if (o.c || o.l) {
                        let extraStyle = "";
                        // Используем wiki для полного описания
                        html2 += `<div style="margin-bottom:8px; padding-bottom:6px; border-bottom:1px dashed #eee;"><span class="opt-v" style="${extraStyle}">${o.c ? o.c : "(-)"}</span><div style="font-size:12px; font-weight:bold; color:#333;">${o.l}</div><div style="font-size:11px; color:#777; margin-top:2px;">${o.wiki || "..."}</div></div>`;
                    }
                });
                html2 += `</div>`;
            });
            c2.innerHTML = html2;
        }
    },
    
    // PDF (Без изменений, но использует state.idx)
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
        msgs.forEach(m => {
            const t = document.createElement('div');
            t.className = 'toast';
            if(m.includes('НЕТ') || m.includes('ВНИМАНИЕ')) t.classList.add('danger');
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