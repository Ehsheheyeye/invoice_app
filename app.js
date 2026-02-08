import { auth, db, signOut, onAuthStateChanged, doc, setDoc, getDoc } from "./firebase-config.js";

let currentUser = null;
let saveTimeout = null;

document.addEventListener('DOMContentLoaded', () => {
    // 1. Check Login
    onAuthStateChanged(auth, (user) => {
        if (user) {
            currentUser = user;
            document.getElementById('userEmail').innerText = user.email;
            loadUserData(user.uid);
        } else {
            window.location.href = "index.html"; // Go home if not logged in
        }
    });

    // 2. Setup
    document.getElementById('inDate').valueAsDate = new Date();
    addItem(); 
    updatePreview();
    setZoom(0.8);

    // 3. Listeners
    document.getElementById('logoInput').addEventListener('change', handleLogoUpload);
    document.getElementById('logoutBtn').addEventListener('click', () => {
        signOut(auth).then(() => window.location.href = "index.html");
    });
});

// --- DATABASE LOAD ---
async function loadUserData(uid) {
    const docRef = doc(db, "users", uid);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
        const data = docSnap.data();
        
        // Load Logo (from text)
        if(data.logoBase64) {
            document.getElementById('p-logo').src = data.logoBase64;
            document.getElementById('logo-container').style.display = 'block';
        }

        if(data.theme) changeTheme(data.theme);

        setVal('currencySymbol', data.currency || '$');
        setVal('inNum', data.inNum || '#INV-001');
        
        setVal('senderName', data.sender?.name || '');
        setVal('senderServices', data.sender?.services || '');
        setVal('senderAddress', data.sender?.address || '');
        setVal('senderContact', data.sender?.contact || '');
        setVal('senderEmail', data.sender?.email || '');

        setVal('clientName', data.client?.name || '');
        setVal('clientAddress', data.client?.address || '');
        setVal('clientContact', data.client?.contact || '');
        setVal('clientEmail', data.client?.email || '');
        
        setVal('discountRate', data.discount || 0);
        setVal('taxRate', data.tax || 0);
        setVal('notesInput', data.notes || '');

        // Items
        const list = document.getElementById('items-list');
        list.innerHTML = '';
        if (data.items && data.items.length > 0) {
            data.items.forEach(item => addItem(item.desc, item.qty, item.price));
        } else {
            addItem();
        }
        updatePreview();
    }
}

// --- DATABASE SAVE ---
function saveData() {
    if (!currentUser) return;
    
    document.getElementById('saveStatus').innerText = "Saving...";
    
    clearTimeout(saveTimeout);
    saveTimeout = setTimeout(async () => {
        const data = {
            currency: getVal('currencySymbol'),
            theme: document.getElementById('themeColor').value,
            inNum: getVal('inNum'),
            sender: {
                name: getVal('senderName'),
                services: getVal('senderServices'),
                address: getVal('senderAddress'),
                contact: getVal('senderContact'),
                email: getVal('senderEmail')
            },
            client: {
                name: getVal('clientName'),
                address: getVal('clientAddress'),
                contact: getVal('clientContact'),
                email: getVal('clientEmail')
            },
            items: [],
            discount: getVal('discountRate'),
            tax: getVal('taxRate'),
            notes: getVal('notesInput'),
            // Note: Logo is saved separately in handleLogoUpload
        };

        document.querySelectorAll('.item-row').forEach(row => {
            data.items.push({
                desc: row.querySelector('.desc').value,
                qty: row.querySelector('.qty').value,
                price: row.querySelector('.price').value
            });
        });

        await setDoc(doc(db, "users", currentUser.uid), data, { merge: true });
        document.getElementById('saveStatus').innerHTML = 'Saved <i class="fa-solid fa-check"></i>';
    }, 1000);
}

// --- NEW LOGO LOGIC (FREE) ---
function handleLogoUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    // Check size (Max 0.8 MB to be safe for free database)
    if (file.size > 800000) {
        alert("Image is too large! Please use an image smaller than 800KB.");
        return;
    }

    const reader = new FileReader();
    reader.onload = async function(event) {
        const base64String = event.target.result;
        
        // Show immediately
        document.getElementById('p-logo').src = base64String;
        document.getElementById('logo-container').style.display = 'block';

        // Save to Database
        if(currentUser) {
            document.getElementById('saveStatus').innerText = "Saving Logo...";
            await setDoc(doc(db, "users", currentUser.uid), { logoBase64: base64String }, { merge: true });
            document.getElementById('saveStatus').innerHTML = 'Logo Saved <i class="fa-solid fa-check"></i>';
        }
    }
    reader.readAsDataURL(file);
}

// --- HELPERS ---
function setVal(id, val) { 
    const el = document.getElementById(id);
    if(el) el.value = val; 
}
function getVal(id) { 
    const el = document.getElementById(id);
    return el ? el.value : ''; 
}

// --- APP FUNCTIONS ---
window.changeTheme = function(color) {
    document.documentElement.style.setProperty('--primary', color);
    saveData();
}
window.updatePreview = function() {
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
    saveData(); 
}

window.addItem = function(desc='', qty=1, price=0) {
    const list = document.getElementById('items-list');
    const id = Date.now() + Math.random();
    const div = document.createElement('div');
    div.className = 'item-row';
    div.id = `row-${id}`;
    div.innerHTML = `
        <input type="text" placeholder="Desc" class="desc" value="${desc}" oninput="calculateTotal(); saveData()">
        <input type="number" placeholder="Qty" class="qty" value="${qty}" min="1" oninput="calculateTotal(); saveData()">
        <input type="number" placeholder="Price" class="price" value="${price}" min="0" oninput="calculateTotal(); saveData()">
        <button class="btn-del" onclick="removeItem('${id}')"><i class="fa-solid fa-trash"></i></button>
    `;
    list.appendChild(div);
}

window.removeItem = function(id) {
    const row = document.getElementById(`row-${id}`);
    if (row) row.remove();
    calculateTotal();
    saveData();
}

window.calculateTotal = function() {
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

    const discRate = parseFloat(document.getElementById('discountRate').value) || 0;
    const discAmt = subtotal * (discRate / 100);
    const afterDisc = subtotal - discAmt;
    const taxRate = parseFloat(document.getElementById('taxRate').value) || 0;
    const taxAmt = afterDisc * (taxRate / 100);
    const grandTotal = afterDisc + taxAmt;

    document.getElementById('p-subtotal').innerText = `${currency}${subtotal.toFixed(2)}`;
    document.getElementById('p-discRate').innerText = discRate;
    document.getElementById('p-discAmt').innerText = `-${currency}${discAmt.toFixed(2)}`;
    document.getElementById('p-taxRate').innerText = taxRate;
    document.getElementById('p-taxAmt').innerText = `+${currency}${taxAmt.toFixed(2)}`;
    document.getElementById('p-total').innerText = `${currency}${grandTotal.toFixed(2)}`;
    
    checkOverflow();
}

window.checkOverflow = function() {
    const paper = document.getElementById('invoice-capture');
    const marker = document.getElementById('page-break-line');
    if (paper.scrollHeight > paper.clientHeight) marker.style.display = 'block';
    else marker.style.display = 'none';
}

window.toggleCard = function(header) {
    header.classList.toggle('active');
    const body = header.nextElementSibling;
    body.style.display = body.style.display === "block" ? "none" : "block";
}

window.resizeLogo = function() {
    const size = document.getElementById('logoSize').value;
    document.getElementById('p-logo').style.width = `${size}px`;
}

window.setZoom = function(value) {
    const wrapper = document.getElementById('previewWrapper');
    const display = document.getElementById('zoomValue');
    wrapper.style.transform = `scale(${value})`;
    display.innerText = `${Math.round(value * 100)}%`;
}

window.adjustZoom = function(delta) {
    const range = document.getElementById('zoomRange');
    let newVal = parseFloat(range.value) + delta;
    newVal = Math.max(0.4, Math.min(1.5, newVal));
    range.value = newVal;
    setZoom(newVal);
}

window.syncText = function(inputId, previewId, fallback) {
    const val = document.getElementById(inputId).value;
    document.getElementById(previewId).innerText = val || fallback;
}

window.syncOptional = function(inputId, previewId) {
    const inputVal = document.getElementById(inputId).value;
    const el = document.getElementById(previewId);
    if (inputVal.trim() !== "") {
        el.style.display = 'block';
        el.innerText = inputVal;
    } else {
        el.style.display = 'none';
    }
}

window.downloadPDF = function() {
    const element = document.getElementById('invoice-capture');
    document.getElementById('page-break-line').style.display = 'none';
    const opt = { margin: 0, filename: `Invoice.pdf`, image: { type: 'jpeg', quality: 0.98 }, html2canvas: { scale: 2, useCORS: true }, jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' } };
    html2pdf().set(opt).from(element).save().then(() => checkOverflow());
}

window.downloadJPG = function() {
    const element = document.getElementById('invoice-capture');
    document.getElementById('page-break-line').style.display = 'none';
    html2canvas(element, { scale: 2, useCORS: true }).then(canvas => {
        const link = document.createElement('a'); link.download = `Invoice.jpg`; link.href = canvas.toDataURL("image/jpeg"); link.click(); checkOverflow();
    });
}
