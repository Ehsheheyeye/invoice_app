document.addEventListener('DOMContentLoaded', () => {
    // Initial Setup
    document.getElementById('inDate').valueAsDate = new Date();
    addItem(); // Add one empty row
    updatePreview();
    
    // Set initial Zoom
    setZoom(0.8);
});

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

// --- SIDEBAR ACCORDION LOGIC ---
function toggleCard(header) {
    // Toggle the 'active' class for rotation
    header.classList.toggle('active');
    
    // Toggle the body visibility
    const body = header.nextElementSibling;
    if (body.style.display === "block") {
        body.style.display = "none";
    } else {
        body.style.display = "block";
    }
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
        }
        reader.readAsDataURL(fileInput.files[0]);
    }
}

function resizeLogo() {
    const size = document.getElementById('logoSize').value;
    const img = document.getElementById('p-logo');
    img.style.width = `${size}px`;
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

// --- ITEMS & TOTALS ---
function addItem() {
    const list = document.getElementById('items-list');
    const id = Date.now();
    const div = document.createElement('div');
    div.className = 'item-row';
    div.id = `row-${id}`;
    div.innerHTML = `
        <input type="text" placeholder="Description" class="desc" oninput="calculateTotal()">
        <input type="number" placeholder="Qty" class="qty" value="1" min="1" oninput="calculateTotal()">
        <input type="number" placeholder="Price" class="price" value="0" min="0" oninput="calculateTotal()">
        <button class="btn-del" onclick="removeItem('${id}')"><i class="fa-solid fa-trash"></i></button>
    `;
    list.appendChild(div);
}

function removeItem(id) {
    const row = document.getElementById(`row-${id}`);
    if (row) row.remove();
    calculateTotal();
}

function calculateTotal() {
    const rows = document.querySelectorAll('.item-row');
    const tbody = document.getElementById('p-items-body');
    tbody.innerHTML = '';
    
    let subtotal = 0;

    rows.forEach(row => {
        const desc = row.querySelector('.desc').value || '';
        const qty = parseFloat(row.querySelector('.qty').value) || 0;
        const price = parseFloat(row.querySelector('.price').value) || 0;
        const total = qty * price;
        subtotal += total;

        if(desc || qty || price) {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td style="text-align: left;">${desc}</td>
                <td>${qty}</td>
                <td>$${price.toFixed(2)}</td>
                <td>$${total.toFixed(2)}</td>
            `;
            tbody.appendChild(tr);
        }
    });

    const taxRate = parseFloat(document.getElementById('taxRate').value) || 0;
    const taxAmt = subtotal * (taxRate / 100);
    const grandTotal = subtotal + taxAmt;

    document.getElementById('p-subtotal').innerText = `$${subtotal.toFixed(2)}`;
    document.getElementById('p-taxRate').innerText = taxRate;
    document.getElementById('p-taxAmt').innerText = `$${taxAmt.toFixed(2)}`;
    document.getElementById('p-total').innerText = `$${grandTotal.toFixed(2)}`;
    
    checkOverflow();
}

// --- OVERFLOW CHECKER ---
function checkOverflow() {
    const paper = document.getElementById('invoice-capture');
    const marker = document.getElementById('page-break-line');
    
    // A4 height in pixels (approx) at standard DPI, or relying on visual overflow
    // If scrollHeight > clientHeight, it's overflowing.
    if (paper.scrollHeight > paper.clientHeight) {
        marker.style.display = 'block';
    } else {
        marker.style.display = 'none';
    }
}

// --- EXPORT ---
function downloadPDF() {
    const element = document.getElementById('invoice-capture');
    
    // Hide marker before print
    document.getElementById('page-break-line').style.display = 'none';
    
    const opt = {
        margin: 0,
        filename: `Invoice_${document.getElementById('inNum').value}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };
    
    html2pdf().set(opt).from(element).save().then(() => {
        // Restore check
        checkOverflow();
    });
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
