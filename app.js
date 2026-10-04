/**
 * تطبيق مبيعات زبادي كابو - مندوب التوزيع
 * منطق العمل بالكامل: دون اتصال (Offline-First)، تخزين محلي، إرسال فواتير لواتساب الرئاسة والعملاء.
 */

// ======================= 1. البيانات الأولية =======================
const DEFAULT_PRODUCTS = [
    { id: 'tab_110', cat: 'طبيعي', size: '110g', name: 'زبادي طبيعي', price: 600, badge: 'طبيعي' },
    { id: 'tab_350', cat: 'طبيعي', size: '350g', name: 'زبادي طبيعي', price: 1400, badge: 'طبيعي' },
    { id: 'tab_400', cat: 'طبيعي', size: '400g', name: 'زبادي طبيعي', price: 1600, badge: 'طبيعي' },
    { id: 'tab_800', cat: 'طبيعي', size: '800g', name: 'زبادي طبيعي', price: 3000, badge: 'طبيعي' },
    { id: 'tab_1000', cat: 'طبيعي', size: '1 كجم', name: 'زبادي طبيعي سطل', price: 3800, badge: 'طبيعي' },

    { id: 'jam_110', cat: 'جامد', size: '110g', name: 'زبادي جامد', price: 650, badge: 'جامد' },
    { id: 'jam_350', cat: 'جامد', size: '350g', name: 'زبادي جامد', price: 1500, badge: 'جامد' },
    { id: 'jam_400', cat: 'جامد', size: '400g', name: 'زبادي جامد', price: 1750, badge: 'جامد' },
    { id: 'jam_800', cat: 'جامد', size: '800g', name: 'زبادي جامد', price: 3200, badge: 'جامد' },

    { id: 'msh_200', cat: 'مش', size: '200g', name: 'زبادي مش كابو', price: 1200, badge: 'مش' },
    { id: 'msh_400', cat: 'مش', size: '400g', name: 'زبادي مش كابو', price: 2100, badge: 'مش' },

    { id: 'str_80', cat: 'فراولة', size: '80g', name: 'زبادي فراولة', price: 700, badge: 'فراولة' },
    { id: 'str_drink', cat: 'فراولة', size: 'عادي', name: 'مشروب زبادي فراولة', price: 1300, badge: 'فراولة' }
];

const DEFAULT_STORES = [
    'بقالة الأمانة',
    'سوبرماركت البركة',
    'مركز النصر التجاري',
    'دكان عمك السر',
    'بقالة التقوى',
    'ميني ماركت الوفاء',
    'بقالة السلام',
    'سوبرماركت الخير'
];

const DEFAULT_SETTINGS = {
    hqPhone: '249912345678', // رقم واتساب رئاسة الشركة
    repName: 'محمد أحمد',
    repRoute: 'خط بحري - المزاد / الختمية'
};

// ======================= 2. إدارة الحالة (State) =======================
let products = JSON.parse(localStorage.getItem('kabo_app_products')) || DEFAULT_PRODUCTS;
let frequentStores = JSON.parse(localStorage.getItem('kabo_app_stores')) || DEFAULT_STORES;
let settings = JSON.parse(localStorage.getItem('kabo_app_settings')) || DEFAULT_SETTINGS;
let todayInvoices = JSON.parse(localStorage.getItem('kabo_app_invoices_today')) || [];

// سلة الطلبية الحالية للمحل المفتوح
let currentCart = {}; // { productId: quantity }
let selectedStoreName = '';
let currentInvoiceData = null; // لتخزين بيانات الفاتورة المفتوحة حالياً للمشاركة

// ======================= 3. بدء التشغيل وتهيئة الواجهة =======================
document.addEventListener('DOMContentLoaded', () => {
    applySettingsToUI();
    renderQuickStoreChips();
    renderProductsGrid('الكل');
    updateCartSummaryUI();
    updateHistoryBadge();

    // ربط أحداث الإدخال
    const custInput = document.getElementById('customerNameInput');
    custInput.addEventListener('input', (e) => {
        selectedStoreName = e.target.value.trim();
        // إزالة التحديد عن الشرائح إذا كان المستخدم يكتب اسماً يدوياً مختلفاً
        document.querySelectorAll('.store-chip').forEach(c => {
            if (c.innerText !== selectedStoreName) c.classList.remove('selected');
        });
    });

    // تبديل لوحة الإدارة
    document.getElementById('btnToggleAdmin').addEventListener('click', () => {
        switchView('admin');
        renderAdminSettings();
    });
});

// ======================= 4. التنقل والتبويب =======================
function switchView(viewName) {
    document.querySelectorAll('.app-view').forEach(v => v.classList.remove('active-view'));
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));

    const bottomBar = document.getElementById('bottomCartBar');

    if (viewName === 'new-invoice') {
        document.getElementById('viewNewInvoice').classList.add('active-view');
        document.getElementById('tabNewInvoice').classList.add('active');
        bottomBar.style.display = 'flex';
    } else if (viewName === 'history') {
        document.getElementById('viewHistory').classList.add('active-view');
        document.getElementById('tabHistory').classList.add('active');
        bottomBar.style.display = 'none';
        renderHistoryView();
    } else if (viewName === 'admin') {
        document.getElementById('viewAdmin').classList.add('active-view');
        bottomBar.style.display = 'none';
    }
}

// ======================= 5. عرض واجهة المحلات والمنتجات =======================
function renderQuickStoreChips() {
    const container = document.getElementById('quickStoresContainer');
    container.innerHTML = '';

    frequentStores.forEach(store => {
        const chip = document.createElement('div');
        chip.className = 'store-chip';
        chip.innerText = store;
        chip.onclick = () => selectStoreChip(store, chip);
        container.appendChild(chip);
    });
}

function selectStoreChip(storeName, chipElement) {
    document.querySelectorAll('.store-chip').forEach(c => c.classList.remove('selected'));
    chipElement.classList.add('selected');
    selectedStoreName = storeName;
    document.getElementById('customerNameInput').value = storeName;
}

function filterCategory(catName) {
    document.querySelectorAll('.cat-pill').forEach(btn => {
        btn.classList.toggle('active', btn.innerText.includes(catName));
    });
    renderProductsGrid(catName);
}

function renderProductsGrid(categoryFilter = 'الكل') {
    const grid = document.getElementById('productsGridContainer');
    grid.innerHTML = '';

    const filtered = categoryFilter === 'الكل' 
        ? products 
        : products.filter(p => p.cat === categoryFilter);

    filtered.forEach(p => {
        const qty = currentCart[p.id] || 0;
        const subtotal = qty * p.price;

        const card = document.createElement('div');
        card.className = `product-row-card ${qty > 0 ? 'has-qty' : ''}`;
        card.id = `prod_card_${p.id}`;

        card.innerHTML = `
            <div class="prod-card-top">
                <div class="prod-badge-name">
                    <span class="cat-badge cat-badge-${p.badge}">${p.cat}</span>
                    <strong class="prod-title">${p.name} <span class="prod-size-tag">${p.size}</span></strong>
                </div>
                <div class="prod-price-tag">${p.price.toLocaleString()} <span class="currency-sm">ج.س</span></div>
            </div>

            <div class="prod-card-bottom">
                <div class="prod-subtotal" id="subtotal_${p.id}" ${qty > 0 ? '' : 'style="display:none;"'}>
                    ${qty > 0 ? `الإجمالي: ${(qty * p.price).toLocaleString()} ج.س` : ''}
                </div>
                <div class="qty-stepper">
                    <button type="button" class="btn-step btn-step-minus" onclick="changeQty('${p.id}', -1)" aria-label="تقليل">−</button>
                    <input type="number" id="qty_input_${p.id}" class="qty-input" value="${qty}" min="0" onchange="setQtyDirect('${p.id}', this.value)">
                    <button type="button" class="btn-step btn-step-plus" onclick="changeQty('${p.id}', 1)" aria-label="زيادة">+</button>
                </div>
            </div>
        `;

        grid.appendChild(card);
    });
}

// ======================= 6. منطق العداد وإدارة السلة =======================
function changeQty(prodId, delta) {
    const current = currentCart[prodId] || 0;
    const next = Math.max(0, current + delta);
    setQtyDirect(prodId, next);
}

function setQtyDirect(prodId, value) {
    const val = parseInt(value, 10) || 0;
    const prod = products.find(p => p.id === prodId);
    if (!prod) return;

    if (val > 0) {
        currentCart[prodId] = val;
    } else {
        delete currentCart[prodId];
    }

    // تحديث بطاقة المنتج المحددة
    const input = document.getElementById(`qty_input_${prodId}`);
    if (input) input.value = val;

    const card = document.getElementById(`prod_card_${prodId}`);
    const subtotalEl = document.getElementById(`subtotal_${prodId}`);

    if (card && subtotalEl) {
        if (val > 0) {
            card.classList.add('has-qty');
            subtotalEl.style.display = 'block';
            subtotalEl.innerText = `الإجمالي: ${(val * prod.price).toLocaleString()} ج.س`;
        } else {
            card.classList.remove('has-qty');
            subtotalEl.style.display = 'none';
        }
    }

    updateCartSummaryUI();
}

function updateCartSummaryUI() {
    let grandTotal = 0;
    let totalUnits = 0;
    let distinctCount = 0;

    Object.keys(currentCart).forEach(pId => {
        const qty = currentCart[pId];
        const prod = products.find(p => p.id === pId);
        if (prod && qty > 0) {
            grandTotal += (qty * prod.price);
            totalUnits += qty;
            distinctCount++;
        }
    });

    const totalEl = document.getElementById('barTotalDisplay');
    const unitsEl = document.getElementById('barUnitsDisplay');

    if (totalEl) totalEl.innerHTML = `${grandTotal.toLocaleString()} <span class="currency">ج.س</span>`;
    if (unitsEl) unitsEl.innerText = `(${totalUnits} علبة - ${distinctCount} صنف)`;
}

// ======================= 7. فحص وإنشاء الفاتورة (Invoice Generation) =======================
function openInvoicePreview() {
    const custName = document.getElementById('customerNameInput').value.trim();
    if (!custName) {
        showSimpleAlert('⚠️ اسم المحل مطلوب', 'الرجاء اختيار أو كتابة اسم المحل أو العميل في الخطوة رقم 1 قبل إصدار الفاتورة.');
        return;
    }

    const items = [];
    let grandTotal = 0;
    let totalUnits = 0;

    Object.keys(currentCart).forEach(pId => {
        const qty = currentCart[pId];
        const prod = products.find(p => p.id === pId);
        if (prod && qty > 0) {
            const itemTotal = qty * prod.price;
            grandTotal += itemTotal;
            totalUnits += qty;
            items.push({
                id: prod.id,
                name: `${prod.name} (${prod.size})`,
                qty: qty,
                price: prod.price,
                total: itemTotal
            });
        }
    });

    if (items.length === 0) {
        showSimpleAlert('⚠️ السلة فارغة!', 'الرجاء تحديد صنف واحد على الأقل والكمية المطلوبة بالضغط على (+) قبل إصدار الفاتورة.');
        return;
    }

    // إنشاء رقم فاتورة فريد وتاريخ لحظي
    const invNumber = generateInvoiceNumber();
    const now = new Date();
    const dateFormatted = now.toLocaleDateString('ar-EG', { year: 'numeric', month: '2-digit', day: '2-digit' });
    const timeFormatted = now.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', hour12: true });
    const fullDateTime = `${dateFormatted} - ${timeFormatted}`;

    const custPhone = document.getElementById('customerPhoneInput').value.trim();

    currentInvoiceData = {
        invoiceNumber: invNumber,
        dateTime: fullDateTime,
        timestamp: now.toISOString(),
        repName: settings.repName,
        repRoute: settings.repRoute,
        customerName: custName,
        customerPhone: custPhone,
        items: items,
        totalUnits: totalUnits,
        grandTotal: grandTotal
    };

    // تعبئة الفاتورة في المعاينة
    document.getElementById('recInvoiceNum').innerText = invNumber;
    document.getElementById('recDateTime').innerText = fullDateTime;
    document.getElementById('recRepName').innerText = settings.repName;
    document.getElementById('recRepRoute').innerText = settings.repRoute;
    document.getElementById('recCustomerName').innerText = custName;

    const tbody = document.getElementById('recItemsBody');
    tbody.innerHTML = '';
    items.forEach(it => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td style="text-align: right; font-weight: bold;">${it.name}</td>
            <td style="font-weight: 900;">${it.qty}</td>
            <td>${it.price.toLocaleString()}</td>
            <td style="text-align: left; font-weight: bold;">${it.total.toLocaleString()}</td>
        `;
        tbody.appendChild(tr);
    });

    document.getElementById('recTotalUnits').innerText = `${totalUnits} علبة`;
    document.getElementById('recGrandTotal').innerText = `${grandTotal.toLocaleString()} ج.س`;

    // إظهار نافذة الفاتورة
    document.getElementById('invoiceModalOverlay').style.display = 'flex';
}

function closeInvoiceModal() {
    document.getElementById('invoiceModalOverlay').style.display = 'none';
}

function generateInvoiceNumber() {
    const todayCount = todayInvoices.length + 1;
    const pad = String(todayCount).padStart(3, '0');
    return `#KB-${pad}`;
}

// ======================= 8. إرسال الفاتورة لواتساب الرئاسة والعميل =======================
function buildInvoiceWhatsAppText(inv) {
    let text = `🏢 *فاتورة مبيعات زبادي كابو*\n`;
    text += `📄 *رقم الفاتورة:* ${inv.invoiceNumber}\n`;
    text += `📅 *التاريخ:* ${inv.dateTime}\n`;
    text += `👤 *المندوب:* ${inv.repName}\n`;
    text += `📍 *خط السير:* ${inv.repRoute}\n`;
    text += `🏪 *العميل/المحل:* ${inv.customerName}\n`;
    text += `--------------------------------\n`;
    text += `📦 *المنتجات والكميات المسلمة:*\n`;

    inv.items.forEach(item => {
        text += `▫️ ${item.name} | *${item.qty} علبة* × ${item.price.toLocaleString()} = ${item.total.toLocaleString()} ج.س\n`;
    });

    text += `--------------------------------\n`;
    text += `🔢 *إجمالي العلب المسلمة:* ${inv.totalUnits} علبة\n`;
    text += `💰 *المبلغ المستحق:* *${inv.grandTotal.toLocaleString()} جنيه سوداني*\n`;
    text += `--------------------------------\n`;
    text += `✅ *تم التسليم الفعلي بواسطة مندوب كابو*`;

    return text;
}

function sendInvoiceToHQWhatsApp() {
    if (!currentInvoiceData) return;
    
    // التأكد من حفظ الفاتورة أولاً
    saveCurrentInvoiceToStorage();

    const hqNumber = (settings.hqPhone || '').replace(/\D/g, '');
    const message = buildInvoiceWhatsAppText(currentInvoiceData);
    const encoded = encodeURIComponent(message);

    const waUrl = hqNumber 
        ? `https://api.whatsapp.com/send?phone=${hqNumber}&text=${encoded}`
        : `https://api.whatsapp.com/send?text=${encoded}`;

    window.open(waUrl, '_blank');
}

function sendInvoiceToCustomerWhatsApp() {
    if (!currentInvoiceData) return;
    saveCurrentInvoiceToStorage();

    const custPhone = (currentInvoiceData.customerPhone || '').replace(/\D/g, '');
    const message = buildInvoiceWhatsAppText(currentInvoiceData);
    const encoded = encodeURIComponent(message);

    const waUrl = custPhone 
        ? `https://api.whatsapp.com/send?phone=${custPhone}&text=${encoded}`
        : `https://api.whatsapp.com/send?text=${encoded}`;

    window.open(waUrl, '_blank');
}

function printReceipt() {
    saveCurrentInvoiceToStorage();
    window.print();
}

function completeAndNewInvoice() {
    saveCurrentInvoiceToStorage();
    closeInvoiceModal();

    // تصفير السلة واسم المحل للمحل القادم
    currentCart = {};
    selectedStoreName = '';
    document.getElementById('customerNameInput').value = '';
    document.getElementById('customerPhoneInput').value = '';
    document.querySelectorAll('.store-chip').forEach(c => c.classList.remove('selected'));

    renderProductsGrid();
    updateCartSummaryUI();
    updateHistoryBadge();

    showSimpleAlert('✅ تم بنجاح!', 'تم حفظ الفاتورة بنجاح في سجل اليوم، وجاهز لتسجيل المحل التالي.');
}

function saveCurrentInvoiceToStorage() {
    if (!currentInvoiceData) return;
    
    // تجنب التكرار لنفس الفاتورة إذا ضغط إرسال أكثر من مرة
    const exists = todayInvoices.find(inv => inv.invoiceNumber === currentInvoiceData.invoiceNumber);
    if (!exists) {
        todayInvoices.unshift(currentInvoiceData);
        localStorage.setItem('kabo_app_invoices_today', JSON.stringify(todayInvoices));
        updateHistoryBadge();

        // إضافة المحل لقائمة المحلات المعتادة إذا لم يكن مسجلاً
        if (currentInvoiceData.customerName && !frequentStores.includes(currentInvoiceData.customerName)) {
            frequentStores.push(currentInvoiceData.customerName);
            localStorage.setItem('kabo_app_stores', JSON.stringify(frequentStores));
            renderQuickStoreChips();
        }
    }
}

// ======================= 9. واجهة سجل اليومية وتلخيص الرئاسة =======================
function updateHistoryBadge() {
    const badge = document.getElementById('todayCountBadge');
    if (badge) badge.innerText = todayInvoices.length;
}

function renderHistoryView() {
    const container = document.getElementById('invoicesListContainer');
    container.innerHTML = '';

    let grandTotal = 0;
    let totalUnits = 0;

    todayInvoices.forEach(inv => {
        grandTotal += inv.grandTotal;
        totalUnits += inv.totalUnits;

        const card = document.createElement('div');
        card.className = 'invoice-item-card';
        card.innerHTML = `
            <div class="inv-info">
                <span class="inv-customer">${inv.customerName}</span>
                <span class="inv-meta">${inv.invoiceNumber} | ${inv.dateTime}</span>
                <span class="inv-meta">الكمية: ${inv.totalUnits} علبة (${inv.items.length} أصناف)</span>
                <div class="inv-actions">
                    <button class="btn-mini" onclick="reopenInvoice('${inv.invoiceNumber}')">📄 عرض</button>
                    <button class="btn-mini" onclick="resendInvoiceWhatsApp('${inv.invoiceNumber}')">💬 واتساب</button>
                    <button class="btn-mini" style="color: #b91c1c;" onclick="deleteSingleInvoice('${inv.invoiceNumber}')">🗑️ إلغاء</button>
                </div>
            </div>
            <div class="inv-amount">
                ${inv.grandTotal.toLocaleString()}
                <div style="font-size: 13px; font-weight: bold; color: #475569;">جنيه</div>
            </div>
        `;
        container.appendChild(card);
    });

    if (todayInvoices.length === 0) {
        container.innerHTML = `<div style="text-align: center; color: #64748b; padding: 20px;">لا توجد فواتير منفذة اليوم حتى الآن.</div>`;
    }

    document.getElementById('summaryInvoicesCount').innerText = todayInvoices.length;
    document.getElementById('summaryTotalAmount').innerHTML = `${grandTotal.toLocaleString()} <small>ج.س</small>`;
    document.getElementById('summaryTotalUnits').innerHTML = `${totalUnits.toLocaleString()} <small>علبة</small>`;
}

function reopenInvoice(invNumber) {
    const inv = todayInvoices.find(i => i.invoiceNumber === invNumber);
    if (!inv) return;

    currentInvoiceData = inv;
    document.getElementById('recInvoiceNum').innerText = inv.invoiceNumber;
    document.getElementById('recDateTime').innerText = inv.dateTime;
    document.getElementById('recRepName').innerText = inv.repName;
    document.getElementById('recRepRoute').innerText = inv.repRoute;
    document.getElementById('recCustomerName').innerText = inv.customerName;

    const tbody = document.getElementById('recItemsBody');
    tbody.innerHTML = '';
    inv.items.forEach(it => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td style="text-align: right; font-weight: bold;">${it.name}</td>
            <td style="font-weight: 900;">${it.qty}</td>
            <td>${it.price.toLocaleString()}</td>
            <td style="text-align: left; font-weight: bold;">${it.total.toLocaleString()}</td>
        `;
        tbody.appendChild(tr);
    });

    document.getElementById('recTotalUnits').innerText = `${inv.totalUnits} علبة`;
    document.getElementById('recGrandTotal').innerText = `${inv.grandTotal.toLocaleString()} ج.س`;

    document.getElementById('invoiceModalOverlay').style.display = 'flex';
}

function resendInvoiceWhatsApp(invNumber) {
    const inv = todayInvoices.find(i => i.invoiceNumber === invNumber);
    if (!inv) return;
    currentInvoiceData = inv;
    sendInvoiceToHQWhatsApp();
}

function deleteSingleInvoice(invNumber) {
    if (confirm(`هل أنت متأكد من إلغاء الفاتورة رقم ${invNumber}؟`)) {
        todayInvoices = todayInvoices.filter(i => i.invoiceNumber !== invNumber);
        localStorage.setItem('kabo_app_invoices_today', JSON.stringify(todayInvoices));
        renderHistoryView();
        updateHistoryBadge();
    }
}

// تقرير اليومية الشامل لرئاسة الشركة
function sendFullDayReportToHQ() {
    if (todayInvoices.length === 0) {
        showSimpleAlert('تنبيه', 'لا توجد فواتير مسجلة اليوم لإرسال تقرير بها.');
        return;
    }

    let grandTotal = 0;
    let totalUnits = 0;
    const productAggregates = {}; // { productName: totalQty }

    todayInvoices.forEach(inv => {
        grandTotal += inv.grandTotal;
        totalUnits += inv.totalUnits;
        inv.items.forEach(item => {
            productAggregates[item.name] = (productAggregates[item.name] || 0) + item.qty;
        });
    });

    const now = new Date();
    const dateFormatted = now.toLocaleDateString('ar-EG');

    let text = `📊 *كشف وتلخيص يومية مبيعات كابو*\n`;
    text += `👤 *المندوب:* ${settings.repName}\n`;
    text += `📍 *خط السير:* ${settings.repRoute}\n`;
    text += `📅 *تاريخ اليومية:* ${dateFormatted}\n`;
    text += `--------------------------------\n`;
    text += `💵 *إجمالي المبيعات الكلي:* *${grandTotal.toLocaleString()} جنيه*\n`;
    text += `📦 *إجمالي العلب الموزعة:* *${totalUnits} علبة*\n`;
    text += `🏪 *عدد المحلات المستلمة:* *${todayInvoices.length} محل*\n`;
    text += `--------------------------------\n`;
    text += `📦 *تفصيل الكميات الموزعة حسب الصنف:*\n`;

    Object.keys(productAggregates).forEach(pName => {
        text += `▫️ ${pName}: *${productAggregates[pName]} علبة*\n`;
    });

    text += `--------------------------------\n`;
    text += `📋 *سجل المحلات المستلمة:*\n`;
    todayInvoices.forEach(inv => {
        text += `- ${inv.customerName}: ${inv.grandTotal.toLocaleString()} ج (${inv.totalUnits} علبة)\n`;
    });

    text += `--------------------------------\n`;
    text += `✅ *تقرير صادر من تطبيق مندوب كابو الميداني*`;

    const hqNumber = (settings.hqPhone || '').replace(/\D/g, '');
    const encoded = encodeURIComponent(text);
    const waUrl = hqNumber 
        ? `https://api.whatsapp.com/send?phone=${hqNumber}&text=${encoded}`
        : `https://api.whatsapp.com/send?text=${encoded}`;

    window.open(waUrl, '_blank');
}

// تصدير فواتير اليوم لملف Excel / CSV لإدخالها في النظام المركزي
function exportTodayToExcel() {
    if (todayInvoices.length === 0) {
        showSimpleAlert('تنبيه', 'لا توجد فواتير مسجلة اليوم لتصديرها.');
        return;
    }

    let csvContent = '\uFEFF'; // UTF-8 BOM لدعم اللغة العربية في إكسيل
    csvContent += 'رقم الفاتورة,التاريخ والوقت,اسم المندوب,خط السير,اسم العميل/المحل,رقم الهاتف,الصنف,الكمية,سعر القطعة,إجمالي الصنف,إجمالي الفاتورة\n';

    todayInvoices.forEach(inv => {
        inv.items.forEach(it => {
            const row = [
                `"${inv.invoiceNumber}"`,
                `"${inv.dateTime}"`,
                `"${inv.repName}"`,
                `"${inv.repRoute}"`,
                `"${inv.customerName}"`,
                `"${inv.customerPhone || ''}"`,
                `"${it.name}"`,
                it.qty,
                it.price,
                it.total,
                inv.grandTotal
            ];
            csvContent += row.join(',') + '\n';
        });
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `كشف_مبيعات_كابو_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
}

// ======================= 10. إعدادات الإدارة =======================
function applySettingsToUI() {
    document.getElementById('displayRepName').innerText = `المندوب: ${settings.repName}`;
    document.getElementById('displayRepRoute').innerText = `خط التوزيع: ${settings.repRoute}`;
}

function renderAdminSettings() {
    document.getElementById('settingHqPhone').value = settings.hqPhone || '';
    document.getElementById('settingRepName').value = settings.repName || '';
    document.getElementById('settingRepRoute').value = settings.repRoute || '';

    const pricesBox = document.getElementById('adminPricesContainer');
    pricesBox.innerHTML = '';

    products.forEach(p => {
        const row = document.createElement('div');
        row.className = 'admin-price-row';
        row.innerHTML = `
            <span><b>${p.name}</b> (${p.size})</span>
            <div style="display:flex; align-items:center; gap:8px;">
                <input type="number" class="admin-price-input" id="admin_p_${p.id}" value="${p.price}">
                <small>ج.س</small>
            </div>
        `;
        pricesBox.appendChild(row);
    });
}

function saveSettings() {
    settings.hqPhone = document.getElementById('settingHqPhone').value.trim();
    settings.repName = document.getElementById('settingRepName').value.trim() || 'المندوب';
    settings.repRoute = document.getElementById('settingRepRoute').value.trim() || 'الخط العام';

    localStorage.setItem('kabo_app_settings', JSON.stringify(settings));

    // تحديث الأسعار
    products.forEach(p => {
        const inp = document.getElementById(`admin_p_${p.id}`);
        if (inp && inp.value) {
            p.price = parseInt(inp.value, 10) || p.price;
        }
    });
    localStorage.setItem('kabo_app_products', JSON.stringify(products));

    applySettingsToUI();
    renderProductsGrid();
    updateCartSummaryUI();

    showSimpleAlert('✅ تم الحفظ', 'تم تحديث بيانات المندوب ورقم الرئاسة وأسعار المنتجات بنجاح.');
    switchView('new-invoice');
}

function confirmResetAllTodayData() {
    if (confirm('هل أنت متأكد من مسح جميع فواتير اليوم وبدء يومية جديدة؟\n\nتأكد من إرسال تقرير اليومية للرئاسة أو تنزيل ملف الإكسيل قبل المسح.')) {
        todayInvoices = [];
        localStorage.removeItem('kabo_app_invoices_today');
        updateHistoryBadge();
        renderHistoryView();
        showSimpleAlert('تم التصفير', 'تم تفريغ فواتير اليومية القديمة وبدء يومية جديدة.');
        switchView('new-invoice');
    }
}

// ======================= 11. نافذة التنبيه البسيطة =======================
function showSimpleAlert(title, message, icon = '⚠️') {
    document.getElementById('simpleAlertTitle').innerText = title;
    document.getElementById('simpleAlertMessage').innerText = message;
    document.getElementById('simpleAlertIcon').innerText = icon;
    document.getElementById('simpleAlertModal').style.display = 'flex';
}

function closeSimpleAlert() {
    document.getElementById('simpleAlertModal').style.display = 'none';
}
