/* database.js - v14.22: Light (No text, logic only) */

const DB = {
    // 1. Groups
    GROUPS: [
        { t: "1. ТИП И БЕЗОПАСНОСТЬ", ids: [23, 11, 1] },
        { t: "2. КОНСТРУКЦИЯ КАБЕЛЯ", ids: [2, 3, 4, 5, 6, 7, 8, 9, 10] },
        { t: "3. ПАРАМЕТРЫ ЖИЛЫ", ids: [18, 19, 20, 22] }, 
        { t: "4. ВНЕШНИЕ ФАКТОРЫ", ids: [12, 13, 14, 15, 16, 17] },
        { t: "5. ЦВЕТОВАЯ МАРКИРОВКА", ids: [21, 24] }
    ],

    // 2. Indices (Codes Only)
    INDICES: [
        { id:1, n:"Взрывозащита", opts:[{c:"", l:"Нет (Общепром)", hint:"Общепром"}, {c:"Вз", l:"Вз - Взрывозащита", hint:"Для взрывоопасных зон"}]},
        { id:2, n:"Изоляция ТПЖ", opts:[
            {c:"В", l:"В - ПВХ пластикат", hint:"PVC"}, {c:"П", l:"П - Полимер (HF)", hint:"HF"}, 
            {c:"Пб", l:"Пб - Сшитый полимер", hint:"HF Pro"}, {c:"Пс", l:"Пс - Сшитый ПЭ", hint:"XLPE"}, 
            {c:"Пв", l:"Пв - Вспененный ПЭ", hint:"FPE"}, {c:"Пп", l:"Пп - Полиолефин", hint:"PO"}, 
            {c:"Р", l:"Р - Силикон", hint:"SiR"}, {c:"Тп", l:"Тп - Термоэластопласт", hint:"TPE"}, 
            {c:"Ф", l:"Ф - Фторопласт", hint:"FEP"}, 
            {c:"Вк", l:"Вк - Слюда + ПВХ", hint:"Mica/PVC", wiki:"огнестойк"},
            {c:"Пк", l:"Пк - Слюда + Полимер", hint:"Mica/HF", wiki:"огнестойк"},
            {c:"Пбк", l:"Пбк - Слюда + Сшитый", hint:"Mica/XL-HF", wiki:"огнестойк"},
            {c:"Пск", l:"Пск - Слюда + XLPE", hint:"Mica/XLPE", wiki:"огнестойк"},
            {c:"РПс", l:"РПс - Силикон + XLPE", hint:"SiR/XLPE", wiki:"огнестойк"}, 
            {c:"РПп", l:"РПп - Силикон + PO", hint:"SiR/PO", wiki:"огнестойк"}
        ]},
        { id:3, n:"Барьер Пары", opts:[{c:"", l:"Нет", hint:"Нет"}, {c:"Си", l:"Си - Огнестойкий", hint:"Слюда"}]},
        { id:4, n:"Экран Пары", opts:[
            {c:"", l:"Нет", hint:"Нет"}, {c:"ЭИм", l:"ЭИм - Лента (Cu)", hint:"Cu-Tape"}, 
            {c:"ЭИмо", l:"ЭИмо - Лента + Оплетка", hint:"Double"}, {c:"ЭИкм", l:"ЭИкм - Тройной", hint:"Triple"},
            {c:"ЭИа", l:"ЭИа - Лента (Al)", hint:"Al-Tape"}, {c:"ЭИал", l:"ЭИал - Лента + Оплетка", hint:"Al+Cu"}, 
            {c:"ЭИкл", l:"ЭИкл - Тройной (Sn)", hint:"Triple Sn"},
            {c:"ЭИо", l:"ЭИо - Оплетка (Cu)", hint:"Braid"}, {c:"ЭИл", l:"ЭИл - Оплетка (Sn)", hint:"Sn-Braid"},
            {c:"ЭИн", l:"ЭИн - Оплетка (Ni)", hint:"Ni-Braid"}
        ]},
        { id:5, n:"Барьер Общий", opts:[{c:"", l:"Нет", hint:"Нет"}, {c:"С", l:"С - Огнестойкий", hint:"Слюда"}]},
        { id:6, n:"Экран Общий", opts:[
            {c:"", l:"Нет", hint:"Нет"}, {c:"Эм", l:"Эм - Лента (Cu)", hint:"Cu-Tape"}, 
            {c:"Эмо", l:"Эмо - Лента + Оплетка", hint:"Double"}, {c:"Экм", l:"Экм - Тройной", hint:"Triple"}, 
            {c:"Эа", l:"Эа - Лента (Al)", hint:"Al-Tape"}, {c:"Эал", l:"Эал - Лента + Оплетка", hint:"Al+Cu"}, 
            {c:"Экл", l:"Экл - Тройной (Sn)", hint:"Triple Sn"}, {c:"Эо", l:"Эо - Оплетка (Cu)", hint:"Braid"}, 
            {c:"Эл", l:"Эл - Оплетка (Sn)", hint:"Sn-Braid"}, {c:"Эн", l:"Эн - Оплетка (Ni)", hint:"Ni-Braid"}
        ]},
        { id:7, n:"Водоблокировка", opts:[{c:"", l:"Нет", hint:"Сухое"}, {c:"в", l:"в - Водоблокировка", hint:"Лента"}]},
        { id:8, n:"Заполнение", opts:[{c:"", l:"Нет", hint:"Нет"}, {c:"з", l:"з - Заполнение", hint:"Экструзия"}]},
        { id:9, n:"Оболочка", opts:[
            {c:"В", l:"В - ПВХ пластикат", hint:"PVC"}, {c:"П", l:"П - Полимер (HF)", hint:"HF"}, 
            {c:"Пэ", l:"Пэ - Полиэтилен", hint:"PE (UV)"}, {c:"Пб", l:"Пб - Сшитый полимер", hint:"XL-HF"}, 
            {c:"У", l:"У - Полиуретан", hint:"PUR"}, {c:"ПУ", l:"ПУ - Полиуретан (HF)", hint:"PUR-HF"}, 
            {c:"Р", l:"Р - Силикон", hint:"SiR"}, {c:"Тп", l:"Тп - Термоэластопласт", hint:"TPE"},
            {c:"Ф", l:"Ф - Фторопласт", hint:"FEP"}
        ]},
        { id:10, n:"Броня", opts:[
            {c:"", l:"Нет", hint:"Нет"}, {c:"КГ", l:"КГ - Гибкая оплетка", hint:"Indoor"}, 
            {c:"К", l:"К - Оплетка в шланге", hint:"Outdoor"}, {c:"Б", l:"Б - Ленты", hint:"Armored"}, 
            {c:"Кп", l:"Кп - Повив проволок", hint:"Heavy"}, {c:"КБ", l:"КБ - Комбинированная", hint:"Double"}
        ]},
        { id:11, n:"Пожарная безоп.", opts:[
            {c:"нг(А)", l:"нг(А)", hint:"Cat A"}, {c:"нг(А)-LS", l:"нг(А)-LS", hint:"Low Smoke"}, 
            {c:"нг(А)-HF", l:"нг(А)-HF", hint:"Halogen Free"}, {c:"нг(А)-LSLTx", l:"нг(А)-LSLTx", hint:"Low Toxic"}, 
            {c:"нг(А)-FRLS", l:"нг(А)-FRLS", hint:"Fire Res LS", wiki:"огнестойк"}, 
            {c:"нг(А)-FRHF", l:"нг(А)-FRHF", hint:"Fire Res HF", wiki:"огнестойк"}, 
            {c:"нг(А)-FRLSLTx", l:"нг(А)-FRLSLTx", hint:"Fire Res LTx", wiki:"огнестойк"}
        ]},
        { id:12, n:"Климат", opts:[
            {c:"", l:"УХЛ (Стандарт)", hint:"-50C"}, {c:"-ХЛ", l:"-ХЛ (Холодный)", hint:"-65C"}, 
            {c:"-ЭХЛ", l:"-ЭХЛ (Экстрем.)", hint:"-70C"}, {c:"-Т", l:"-Т (Тропики)", hint:"Tropics"},
            {c:"-М", l:"-М (Морской)", hint:"Marine"}
        ]},
        { id:13, n:"Маслостойкость", opts:[{c:"", l:"Нет", hint:"Std"}, {c:"-МБ", l:"-МБ (Маслобензо)", hint:"Oil Res"}]},
        { id:14, n:"Химстойкость", opts:[{c:"", l:"Нет", hint:"Std"}, {c:"-ХС", l:"-ХС (Химстойкий)", hint:"Chem Res"}]},
        { id:15, n:"Термостойкость", opts:[
            {c:"", l:"Нет", hint:"Std"}, {c:"-ТС-125", l:"-ТС-125", hint:"+125C"}, 
            {c:"-ТС-150", l:"-ТС-150", hint:"+150C"}, {c:"-ТС-200", l:"-ТС-200", hint:"+200C"},
            {c:"-ТС-250", l:"-ТС-250", hint:"+250C"}
        ]},
        { id:16, n:"УФ / Улица", opts:[{c:"", l:"Нет", hint:"Indoor"}, {c:"-УФ", l:"-УФ (Улица)", hint:"UV Res"}]},
        { id:17, n:"Грызуны", opts:[{c:"", l:"Нет", hint:"No"}, {c:"-ГТ", l:"-ГТ (Репеллент)", hint:"Anti-Rodent"}]},
        { id:18, n:"Геометрия", opts:[
            {c:"NxS", l:"Пучок (NxS)", hint:"Жилы"}, {c:"Nx2xS", l:"Пары (Nx2xS)", hint:"Пары"}, 
            {c:"Nx3xS", l:"Тройки (Nx3xS)", hint:"Тройки"}, {c:"Nx4xS", l:"Четверки (Nx4xS)", hint:"Четверки"}
        ]},
        { id:19, n:"Гибкость (ГОСТ)", opts:[
            {c:"(1)", l:"(1) - 1 класс", hint:"Rigid"}, {c:"(3)", l:"(3) - 3 класс", hint:"Flex"}, 
            {c:"(4)", l:"(4) - 4 класс", hint:"Flex+"}, {c:"(5)", l:"(5) - 5 класс", hint:"Extra Flex"}, 
            {c:"(6)", l:"(6) - 6 класс", hint:"Robot"}
        ]},
        { id:20, n:"Покрытие жилы", opts:[{c:"", l:"Медная (Cu)", hint:"Cu"}, {c:"л", l:"л (Sn) - Луженая", hint:"Sn"}, {c:"н", l:"н (Ni) - Никелир.", hint:"Ni"}]},
        { id:21, n:"Искробезоп.", opts:[{c:"", l:"Нет", hint:"General"}, {c:"i", l:"i - Ex-i цепь", hint:"Ex-i"}]},
        { id:22, n:"Напряжение", opts:[{c:"-300", l:"-300 В", hint:"300V"}, {c:"-500", l:"-500 В", hint:"500V"}, {c:"-660", l:"-660 В", hint:"660V"}]},
        { id:23, n:"Протокол", opts:[
            {c:"", l:"Нет", hint:"Univ"}, {c:"[485]", l:"[485] - RS-485", hint:"RS-485"}, 
            {c:"[PB]", l:"[PB] - Profibus", hint:"Profibus"}, {c:"[FF]", l:"[FF] - Fieldbus", hint:"Fieldbus"}
        ]},
        { id:24, n:"Цвет оболочки", opts:[
            {c:"Серый", l:"Серый", hint:"RAL 7035"}, {c:"Черный", l:"Черный", hint:"RAL 9005"}, 
            {c:"Синий", l:"Синий", hint:"Ex-i"}, {c:"Оранжевый", l:"Оранжевый", hint:"Orange", wiki:"огнестойк"}, 
            {c:"Красный", l:"Красный", hint:"Fire", wiki:"огнестойк"}, {c:"Фиолетовый", l:"Фиолетовый", hint:"PB"}, 
            {c:"Желтый", l:"Желтый", hint:"Warn"}, {c:"Спец", l:"Спеццвет", hint:"Custom"}
        ]}
    ],

    // 3. Properties
    MAT_PROPS: {
        "В": { minT: -50, hf: false, fr: false, oil: false, chem: false, flex_grade: 1, rank: 1, family: "PVC" },
        "П": { minT: -60, hf: true, fr: false, oil: false, chem: true, flex_grade: 1, rank: 2, family: "Polymer" },
        "Пв": { minT: -60, hf: true, fr: false, oil: false, chem: true, flex_grade: 1, rank: 2, family: "FPE" },
        "Пс": { minT: -60, hf: true, fr: false, oil: false, chem: true, flex_grade: 1, rank: 3, family: "XLPE" },
        "Пб": { minT: -60, hf: true, fr: false, oil: true, chem: true, flex_grade: 1, rank: 3, family: "XLPE" },
        "Пп": { minT: -60, hf: true, fr: false, oil: false, chem: true, flex_grade: 1, rank: 2, family: "PO" },
        "Тп": { minT: -60, hf: true, fr: false, oil: true, chem: true, flex_grade: 2, rank: 3, family: "TPE" },
        "У": { minT: -70, hf: false, fr: false, oil: true, chem: true, flex_grade: 3, rank: 4, family: "PUR" },
        "ПУ": { minT: -70, hf: true, fr: false, oil: true, chem: true, flex_grade: 3, rank: 4, family: "PUR" },
        "Р": { minT: -60, hf: true, fr: true, oil: false, chem: true, flex_grade: 2, rank: 5, family: "Silicon" },
        "Ф": { minT: -70, hf: true, fr: true, oil: true, chem: true, flex_grade: 1, rank: 6, family: "FEP" },
        "Вк": { minT: -50, hf: false, fr: true, oil: false, chem: false, flex_grade: 1, rank: 1 },
        "Пк": { minT: -60, hf: true, fr: true, oil: false, chem: true, flex_grade: 1, rank: 2 },
        "Пбк": { minT: -60, hf: true, fr: true, oil: true, chem: true, flex_grade: 1, rank: 3 },
        "Пск": { minT: -60, hf: true, fr: true, oil: false, chem: true, flex_grade: 1, rank: 3 },
        "РПс": { minT: -60, hf: true, fr: true, oil: false, chem: true, flex_grade: 1, rank: 5 },
        "РПп": { minT: -60, hf: true, fr: true, oil: false, chem: true, flex_grade: 1, rank: 5 },
        "J_В": { minT: -50, hf: false, fr: false, oil: false, chem: false, flex_grade: 1, rank: 1, family: "PVC" },
        "J_П": { minT: -60, hf: true, fr: false, oil: false, chem: true, flex_grade: 1, rank: 2, family: "Polymer" },
        "J_Пэ": { minT: -60, hf: true, fr: false, oil: false, chem: true, flex_grade: 1, rank: 2, family: "PE" },
        "J_Пб": { minT: -60, hf: true, fr: false, oil: true, chem: true, flex_grade: 1, rank: 3, family: "XLPE" },
        "J_У": { minT: -70, hf: false, fr: false, oil: true, chem: true, flex_grade: 3, rank: 4, family: "PUR" },
        "J_ПУ": { minT: -70, hf: true, fr: false, oil: true, chem: true, flex_grade: 3, rank: 4, family: "PUR" },
        "J_Р": { minT: -60, hf: true, fr: true, oil: false, chem: true, flex_grade: 2, rank: 5, family: "Silicon" },
        "J_Тп": { minT: -60, hf: true, fr: false, oil: true, chem: true, flex_grade: 2, rank: 3, family: "TPE" },
        "J_Ф": { minT: -70, hf: true, fr: true, oil: true, chem: true, flex_grade: 1, rank: 6, family: "FEP" }
    },

    // 4. Limits
    LIMITS: {
        BUS: {
            volt: "-300",
            defaults: {1:"", 2:"Пв", 4:"ЭИал", 9:"В", 11:"нг(А)-LS", 18:"1х2х0.60", 23:"[485]"},
            types: ["x2x"],
            proto: {
                "[485]": { N: [1,2,3,4,5,6,8,10], S: ["0.60","0.78"] },
                "[PB]": { N: [1], S: ["0.64"] },
                "[FF]": { N: [1], S: ["0.80","1.0","1.5"] },
                "": { N: [1,2,4], S: ["0.60","0.78"] }
            },
            valid_S: ["0.60", "0.64", "0.78", "0.80", "1.0", "1.5"]
        },
        SIGNAL: {
            volt: "-500",
            defaults: {1:"", 2:"В", 6:"Эа", 9:"В", 11:"нг(А)-LS", 18:"2х2х0.75"},
            types: ["x","x2x","x3x"],
            valid_S: ["0.5","0.75","1.0","1.5","2.5"],
            get_valid_N: (s, t) => {
                if(t === 'x') return [2,3,4,5,7,10,12,14,19,24,27,30,37];
                return [1,2,4,5,6,8,10,12,16,20,24];
            }
        },
        CONTROL: {
            volt: "-660",
            defaults: {1:"", 2:"В", 9:"В", 11:"нг(А)", 18:"5x1.5"},
            types: ["x", "vfd"],
            valid_S: ["0.75","1.0","1.5","2.5","4.0","6.0"],
            get_valid_N: (s, t) => {
                if(t==='vfd') return [1];
                return [3,4,5,7,10,14,19,24,30,37];
            },
            vfd_map: { "1.5":"3x1.5+3x0.25", "2.5":"3x2.5+3x0.5", "4.0":"3x4.0+3x0.75", "6.0":"3x6.0+3x1.0" }
        }
    },
    
    GEO_TYPES: [
        {c:"x", l:"Жилы (NxS)"}, {c:"x2x", l:"Пары (Nx2xS)"},
        {c:"x3x", l:"Тройки (Nx3xS)"}, {c:"vfd", l:"VFD (Эл. двигатель)"}
    ]
};