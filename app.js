import { auth, db, storage, signOut, onAuthStateChanged, doc, setDoc, getDoc, ref, uploadBytes, getDownloadURL } from "./firebase-config.js";

let currentUser = null;
let saveTimeout = null;

document.addEventListener('DOMContentLoaded', () => {
    // 1. Auth Guard: Check if user is logged in
    onAuthStateChanged(auth, (user) => {
        if (user) {
            currentUser = user;
            document.getElementById('userEmail').innerText = user.email;
            loadUserData(user.uid); // Load their specific data
        } else {
            window.location.href = "index.html"; // Kick them out if not logged in
        }
    });

    // 2. Setup Inputs
    document.getElementById('inDate').valueAsDate = new Date();
    addItem(); 
    updatePreview();
    setZoom(0.8);

    // 3. Logo Upload Listener
    document.getElementById('logoInput').addEventListener('change', handleLogoUpload);

    // 4. Logout Listener
    document.getElementById('logoutBtn').addEventListener('click', () => {
        signOut(auth).then(() => window.location.href = "index.html");
    });
});

// --- DATABASE FUNCTIONS ---

async function loadUserData(uid) {
    const docRef = doc(db, "users", uid);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
        const data = docSnap.data();
        
        // Fill Fields
        if(data.theme) changeTheme(data.theme);
        if(data.logoUrl) {
            document.getElementById('p-logo').src = data.logoUrl;
            document.getElementById('logo-container').style.display = 'block';
        }

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

        // Rebuild Items
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

function saveData() {
    if (!currentUser) return;
    
    document.getElementById('saveStatus').innerText = "Saving...";
    
    // Debounce: Wait 1 second after typing stops to save
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
            // Note: We don't save the Logo URL here, that's handled in upload
        };

        // Get Items
        document.querySelectorAll('.item-row').forEach(row => {
            data.items.push({
                desc: row.querySelector('.desc').value,
                qty: row.querySelector('.qty').value,
                price: row.querySelector('.price').value
            });
        });

        // Send to Firebase
        await setDoc(doc(db, "users", currentUser.uid), data, { merge: true });
        document.getElementById('saveStatus').innerHTML = 'Saved <i class="fa-solid fa-check"></i>';
    }, 1000);
}

// --- HELPER FUNCTIONS ---
function setVal(id, val) { 
    const el = document.getElementById(id);
    if(el) el.value = val; 
}
function getVal(id) { 
    const el = document.getElementById(id);
    return el ? el.value : ''; 
}

// --- LOGO UPLOAD (TO FIREBASE STORAGE) ---
async function handleLogoUpload(e) {
    if (!currentUser) return;
    const file = e.target.files[0];
    if (!file) return;

    const storageRef = ref(storage, `logos/${currentUser.uid}`);
    
    try {
        document.getElementById('saveStatus').innerText = "Uploading Logo...";
        await uploadBytes(storageRef, file);
        const url = await getDownloadURL(storageRef);
        
        // Update Preview
        document.getElementById('p-logo').src = url;
        document.getElementById('logo-container').style.display = 'block';
        
        // Save URL to DB
        await setDoc(doc(db, "users", currentUser.uid), { logoUrl: url }, { merge: true });
        document.getElementById('saveStatus').innerHTML = 'Logo Saved <i class="fa-solid fa-check"></i>';
    } catch (err) {
        console.error("Upload failed", err);
        alert("Upload failed. Make sure you enabled Firebase Storage!");
    }
}

// --- APP LOGIC (Same as before but calls saveData) ---
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
    saveData(); // Auto-save trigger
}
// ... (Include the rest of your syncOptional, syncText, calculateTotal logic here)
// Important: Add 'saveData()' to your addItem and removeItem logic inside those functions.

// (For brevity, re-paste the calculateTotal, addItem, removeItem functions from previous step 
//  but ADD "saveData();" at the end of them.)
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
     // ... (Copy exact logic from previous script.js, but ensure currency symbol is dynamic)
    const currency = document.getElementById('currencySymbol').value || '$';
    // ... (rest of logic using 'currency' variable) ...
    // ... 
    // At end of function:
    checkOverflow();
    // Don't call saveData() here usually, because oninput triggers it via updatePreview
}

window.checkOverflow = function() {
    const paper = document.getElementById('invoice-capture');
    const marker = document.getElementById('page-break-line');
    if (paper.scrollHeight > paper.clientHeight) marker.style.display = 'block';
    else marker.style.display = 'none';
}

// ... (Copy downloadPDF and downloadJPG logic)
window.toggleCard = function(header) {
    header.classList.toggle('active');
    const body = header.nextElementSibling;
    body.style.display = body.style.display === "block" ? "none" : "block";
}
window.resizeLogo = function() {
    const size = document.getElementById('logoSize').value;
    document.getElementById('p-logo').style.width = `${size}px`;
    // Logo size isn't critical to save instantly, but you can if you want
}
// ZOOM
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
// HELPER FOR SYNC (Needed for updatePreview)
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
