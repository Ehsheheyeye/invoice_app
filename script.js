document.addEventListener('DOMContentLoaded', () => {
    // Initialize with one empty row
    addItem();
    
    // Set default date
    document.getElementById('inDate').valueAsDate = new Date();
    updatePreview();
});

// --- STATE MANAGEMENT ---
function addItem() {
    const list = document.getElementById('items-list');
    const id = Date.now(); // Unique ID for row
    
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
    if(row) row.remove();
    calculateTotal();
}

// --- CORE LOGIC ---
function updatePreview() {
    // Text Sync
    syncText('inNum', 'p-num');
    syncText('inDate', 'p-date');
    syncText('senderName', 'p-senderName', 'Your Company');
    syncText('senderEmail', 'p-senderEmail', 'email@example.com');
    syncText('clientName', 'p-clientName', 'Client Name');
    syncText('clientAddress', 'p-clientAddress', 'Client Address');
    syncText('notesInput', 'p-notes', 'Thank you for your business.');
    
    // Force Recalculate
    calculateTotal();
}

function syncText(inputId, previewId, fallback = '') {
    const val = document.getElementById(inputId).value;
    document.getElementById(previewId).innerText = val || fallback;
}

function calculateTotal() {
    const rows = document.querySelectorAll('.item-row');
    const tbody = document.getElementById('p-items-body');
    tbody.innerHTML = ''; // Clear preview table
    
    let subtotal = 0;

    rows.forEach(row => {
        const desc = row.querySelector('.desc').value || 'Item';
        const qty = parseFloat(row.querySelector('.qty').value) || 0;
        const price = parseFloat(row.querySelector('.price').value) || 0;
        const total = qty * price;

        subtotal += total;

        // Add to Preview Table
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${desc}</td>
            <td>${qty}</td>
            <td>$${price.toFixed(2)}</td>
            <td>$${total.toFixed(2)}</td>
        `;
        tbody.appendChild(tr);
    });

    // Tax Calculation
    const taxRate = parseFloat(document.getElementById('taxRate').value) || 0;
    const taxAmt = subtotal * (taxRate / 100);
    const grandTotal = subtotal + taxAmt;

    // Update Totals UI
    document.getElementById('p-subtotal').innerText = `$${subtotal.toFixed(2)}`;
    document.getElementById('p-taxRate').innerText = taxRate;
    document.getElementById('p-taxAmt').innerText = `$${taxAmt.toFixed(2)}`;
    document.getElementById('p-total').innerText = `$${grandTotal.toFixed(2)}`;
}

// --- EXPORT FUNCTIONS ---

// 1. PDF Download
function downloadPDF() {
    const element = document.getElementById('invoice-capture');
    const opt = {
        margin:       0.5,
        filename:     `Invoice_${document.getElementById('inNum').value}.pdf`,
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { scale: 2 },
        jsPDF:        { unit: 'in', format: 'a4', orientation: 'portrait' }
    };
    html2pdf().set(opt).from(element).save();
}

// 2. JPG Download
function downloadJPG() {
    const element = document.getElementById('invoice-capture');
    html2canvas(element, { scale: 2 }).then(canvas => {
        const link = document.createElement('a');
        link.download = `Invoice_${document.getElementById('inNum').value}.jpg`;
        link.href = canvas.toDataURL("image/jpeg");
        link.click();
    });
}

// 3. Excel Export
function downloadExcel() {
    let data = [];
    // Headers
    data.push(["Invoice Number", document.getElementById('inNum').value]);
    data.push(["Date", document.getElementById('inDate').value]);
    data.push(["Client", document.getElementById('clientName').value]);
    data.push([]); // spacer
    data.push(["Description", "Quantity", "Price", "Total"]); // Table Header

    // Items
    const rows = document.querySelectorAll('.item-row');
    rows.forEach(row => {
        data.push([
            row.querySelector('.desc').value,
            row.querySelector('.qty').value,
            row.querySelector('.price').value,
            (row.querySelector('.qty').value * row.querySelector('.price').value).toFixed(2)
        ]);
    });

    data.push([]);
    data.push(["", "", "Grand Total", document.getElementById('p-total').innerText]);

    const ws = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Invoice");
    XLSX.writeFile(wb, `Invoice_${document.getElementById('inNum').value}.xlsx`);
}