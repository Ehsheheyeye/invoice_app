document.addEventListener('DOMContentLoaded', () => {
    // 1. Try to Load Data
    const hasData = loadData();
    
    // 2. If no data, set defaults
    if (!hasData) {
        document.getElementById('inDate').valueAsDate = new Date();
        addItem(); 
    }
    
    // 3. Initialize View
    updatePreview();
    setZoom(0.8);
    
    // 4. Restore Color if saved
    const savedColor = localStorage.getItem('invoiceTheme');
    if(savedColor) changeTheme(savedColor);
});

// --- THEME COLOR ---
function changeTheme(color) {
    document.documentElement.style.setProperty('--primary', color);
    document.getElementById('themeColor').value = color;
    localStorage.setItem('invoiceTheme', color);
}

// --- ZOOM LOGIC ---
function setZoom(value) {
    const wrapper = document.getElementById('previewWrapper');
    const display = document.getElementById('zoomValue');
    wrapper.style.transform = `scale(${value})`;
    display.innerText = `${Math.round(value * 100)}%`;
}

function adjustZoom(delta) {
    const range = document.getElementById('zoomRange');
    let newVal = parseFloat(range.value) + delta;
    newVal = Math.max(0.4, Math.min(1.5, newVal));
    range.value = newVal;
    setZoom(newVal);
}

// --- SIDEBAR ---
function toggleCard(header) {
    header.classList.toggle('active');
    const body = header.nextElementSibling;
    body.style.display = body.style.display === "block" ? "none" : "block";
}

// --- LOGO HANDLING ---
function handleLogoUpload() {
    const fileInput = document.getElementById('logoInput');
    const previewImg = document.getElementById('p-logo');
    const container = document.getElementById('logo-container');

    if (fileInput.files && fileInput.files[0]) {
        const reader = new FileReader();
        reader.onload = function(e) {
            previewImg.src = e.target.result;
            container.style.display = 'block';
            saveData(); // Save logo string (if small enough) or state
        }
        reader.readAsDataURL(fileInput.files[0]);
    }
}

function resizeLogo() {
    const size = document.getElementById('logoSize').value;
    document.getElementById('p-logo').style.width = `${size}px`;
    saveData();
}

// --- PREVIEW UPDATE ---
function updatePreview() {
    syncText('inNum', 'p-num');
    syncText('inDate', 'p-date');
    syncText('senderName', 'p-senderName', 'Your Company');
    syncText('clientName', 'p-clientName', 'Client Name');
    syncText('notesInput', 'p-notes', '');

    syncOptional('senderServices', 'p-senderServices');
    syncOptional('senderAddress', 'p-senderAddress');
    syncOptional('senderContact', 'p-senderContact');
    syncOptional('senderEmail', 'p-senderEmail');

    syncOptional('clientAddress', 'p-clientAddress');
    syncOptional('clientContact', 'p-clientContact');
    syncOptional('clientEmail', 'p-clientEmail');

    calculateTotal();
    checkOverflow();
    saveData(); // Auto-save on every update
}

function syncOptional(inputId, previewId) {
    const inputVal = document.getElementById(inputId).value;
    const el = document.getElementById(previewId);
    if (inputVal.trim() !== "") {
        el.style.display = 'block';
        el.innerText = inputVal;
    } else {
        el.style.display = 'none';
    }
}

function syncText(inputId, previewId, fallback) {
    const val = document.getElementById(inputId).value;
    document.getElementById(previewId).innerText = val || fallback;
}

// --- ITEMS & CALCULATIONS ---
function addItem(desc='', qty=1, price=0) {
    const list = document.getElementById('items-list');
    const id = Date.now() + Math.random(); // Unique ID
    const div = document.createElement('div');
    div.className = 'item-row';
    div.id = `row-${id}`;
    div.innerHTML = `
        <input type="text" placeholder="Description" class="desc" value="${desc}" oninput="calculateTotal(); saveData()">
        <input type="number" placeholder="Qty" class="qty" value="${qty}" min="1" oninput="calculateTotal(); saveData()">
        <input type="number" placeholder="Price" class="price" value="${price}" min="0" oninput="calculateTotal(); saveData()">
        <button class="btn-del" onclick="removeItem('${id}')"><i class="fa-solid fa-trash"></i></button>
    `;
    list.appendChild(div);
}

function removeItem(id) {
    const row = document.getElementById(`row-${id}`);
    if (row) row.remove();
    calculateTotal();
    saveData();
}

function calculateTotal() {
    const rows = document.querySelectorAll('.item-row');
    const tbody = document.getElementById('p-items-body');
    const currency = document.getElementById('currencySymbol').value || '$';
    
    tbody.innerHTML = '';
    let subtotal = 0;

    rows.forEach(row => {
        const desc = row.querySelector('.desc').value;
        const qty = parseFloat(row.querySelector('.qty').value) || 0;
        const price = parseFloat(row.querySelector('.price').value) || 0;
        const total = qty * price;
        subtotal += total;

        if(desc || qty || price) {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td style="text-align: left;">${desc}</td>
                <td>${qty}</td>
                <td>${currency}${price.toFixed(2)}</td>
                <td>${currency}${total.toFixed(2)}</td>
            `;
            tbody.appendChild(tr);
        }
    });

    // Discount
    const discRate = parseFloat(document.getElementById('discountRate').value) || 0;
    const discAmt = subtotal * (discRate / 100);
    const afterDisc = subtotal - discAmt;

    // Tax
    const taxRate = parseFloat(document.getElementById('taxRate').value) || 0;
    const taxAmt = afterDisc * (taxRate / 100);
    
    const grandTotal = afterDisc + taxAmt;

    // Update Text
    document.getElementById('p-subtotal').innerText = `${currency}${subtotal.toFixed(2)}`;
    document.getElementById('p-discRate').innerText = discRate;
    document.getElementById('p-discAmt').innerText = `-${currency}${discAmt.toFixed(2)}`;
    
    document.getElementById('p-taxRate').innerText = taxRate;
    document.getElementById('p-taxAmt').innerText = `+${currency}${taxAmt.toFixed(2)}`;
    
    document.getElementById('p-total').innerText = `${currency}${grandTotal.toFixed(2)}`;
    
    checkOverflow();
}

// --- AUTO SAVE & LOAD ---
function saveData() {
    const data = {
        inNum: document.getElementById('inNum').value,
        inDate: document.getElementById('inDate').value,
        currency: document.getElementById('currencySymbol').value,
        theme: document.getElementById('themeColor').value,
        sender: {
            name: document.getElementById('senderName').value,
            services: document.getElementById('senderServices').value,
            address: document.getElementById('senderAddress').value,
            contact: document.getElementById('senderContact').value,
            email: document.getElementById('senderEmail').value
        },
        client: {
            name: document.getElementById('clientName').value,
            address: document.getElementById('clientAddress').value,
            contact: document.getElementById('clientContact').value,
            email: document.getElementById('clientEmail').value
        },
        items: [],
        discount: document.getElementById('discountRate').value,
        tax: document.getElementById('taxRate').value,
        notes: document.getElementById('notesInput').value
    };

    // Save Items
    document.querySelectorAll('.item-row').forEach(row => {
        data.items.push({
            desc: row.querySelector('.desc').value,
            qty: row.querySelector('.qty').value,
            price: row.querySelector('.price').value
        });
    });

    localStorage.setItem('invoiceData', JSON.stringify(data));
}

function loadData() {
    const saved = localStorage.getItem('invoiceData');
    if (!saved) return false;

    const data = JSON.parse(saved);

    document.getElementById('inNum').value = data.inNum || '#INV-001';
    document.getElementById('inDate').value = data.inDate || '';
    document.getElementById('currencySymbol').value = data.currency || '$';
    document.getElementById('themeColor').value = data.theme || '#3b82f6';

    document.getElementById('senderName').value = data.sender.name || '';
    document.getElementById('senderServices').value = data.sender.services || '';
    document.getElementById('senderAddress').value = data.sender.address || '';
    document.getElementById('senderContact').value = data.sender.contact || '';
    document.getElementById('senderEmail').value = data.sender.email || '';

    document.getElementById('clientName').value = data.client.name || '';
    document.getElementById('clientAddress').value = data.client.address || '';
    document.getElementById('clientContact').value = data.client.contact || '';
    document.getElementById('clientEmail').value = data.client.email || '';

    document.getElementById('discountRate').value = data.discount || 0;
    document.getElementById('taxRate').value = data.tax || 0;
    document.getElementById('notesInput').value = data.notes || '';

    // Rebuild Items
    const list = document.getElementById('items-list');
    list.innerHTML = ''; // Clear defaults
    if (data.items && data.items.length > 0) {
        data.items.forEach(item => addItem(item.desc, item.qty, item.price));
    } else {
        addItem();
    }

    return true;
}

function clearData() {
    if(confirm("Are you sure you want to clear all data?")) {
        localStorage.removeItem('invoiceData');
        localStorage.removeItem('invoiceTheme');
        location.reload();
    }
}

// --- OVERFLOW CHECKER ---
function checkOverflow() {
    const paper = document.getElementById('invoice-capture');
    const marker = document.getElementById('page-break-line');
    if (paper.scrollHeight > paper.clientHeight) {
        marker.style.display = 'block';
    } else {
        marker.style.display = 'none';
    }
}

// --- EXPORT ---
function downloadPDF() {
    const element = document.getElementById('invoice-capture');
    document.getElementById('page-break-line').style.display = 'none';
    const opt = {
        margin: 0,
        filename: `Invoice_${document.getElementById('inNum').value}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };
    html2pdf().set(opt).from(element).save().then(() => checkOverflow());
}

function downloadJPG() {
    const element = document.getElementById('invoice-capture');
    document.getElementById('page-break-line').style.display = 'none';
    html2canvas(element, { scale: 2, useCORS: true }).then(canvas => {
        const link = document.createElement('a');
        link.download = `Invoice.jpg`;
        link.href = canvas.toDataURL("image/jpeg");
        link.click();
        checkOverflow();
    });
}
