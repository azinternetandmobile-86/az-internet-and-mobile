const firebaseConfig = {
  apiKey: "AIzaSyDXp--aSw0XvYbKVG70qtGRLGgqLdlOj9E",
  authDomain: "az-internet-and-mobile.firebaseapp.com",
  projectId: "az-internet-and-mobile",
  storageBucket: "az-internet-and-mobile.firebasestorage.app",
  messagingSenderId: "981347891852",
  appId: "1:981347891852:web:cd7183f5b6369ff97d99a9",
  measurementId: "G-GYCBRB93S7"
};

(async function () {
  const area = document.getElementById("auth-area");
  if (!area) return;

  const inputStyle =
    "display:block;width:100%;padding:10px 12px;margin-top:6px;box-sizing:border-box;background:#0f172a;color:#f8fafc;border:1px solid #334155;border-radius:6px";
  const labelStyle = "display:block;color:#e2e8f0;font-weight:600;font-size:14px";
  const tabBtnBase =
    "padding:9px 14px;border:1px solid #334155;border-radius:6px;font-weight:600;cursor:pointer";

  const DEFAULT_SETTINGS = {
    shopName: "AZ INTERNET AND MOBILE",
    tagline: "YOUR DIGITAL PARTNER",
    phone: "9960312286",
    whatsapp: "919960312286",
    address: "HP Petrol Pump के सामने, काला बलुआ, अररिया, बिहार",
    timing: "सुबह 8:00 बजे – रात 9:00 बजे (प्रतिदिन)",
    announcement: "मोबाइल रिपेयर, एक्सेसरीज़, रिचार्ज, बैंकिंग व ऑनलाइन सेवाएँ उपलब्ध।",
    showAnnouncement: true,
    bookingOpen: true
  };

  function escapeHtml(str) {
    return String(str ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function renderLoginForm() {
    area.innerHTML = `
      <form id="admin-login">
        <div style="margin-bottom:12px">
          <label style="${labelStyle}">Email ID</label>
          <input id="admin-email" type="email" placeholder="अपना Email डालें" required style="${inputStyle}">
        </div>

        <div style="margin-bottom:14px">
          <label style="${labelStyle}">Password</label>
          <input id="admin-password" type="password" placeholder="अपना Password डालें" required style="${inputStyle}">
        </div>

        <button type="submit"
          style="padding:12px 25px;background:#f5ad28;color:#0f172a;border:0;border-radius:8px;font-weight:bold;cursor:pointer">
          Login करें
        </button>
      </form>
      <p id="login-message" style="color:#f8fafc;margin-top:10px"></p>
    `;
  }

  // पहले तुरंत लॉगिन फ़ॉर्म दिखाएँ ताकि पेज कभी खाली न दिखे
  renderLoginForm();

  try {
    const appModule = await import(
      "https://www.gstatic.com/firebasejs/13.3.0/firebase-app.js"
    );
    const authModule = await import(
      "https://www.gstatic.com/firebasejs/13.3.0/firebase-auth.js"
    );
    const fsModule = await import(
      "https://www.gstatic.com/firebasejs/13.3.0/firebase-firestore.js"
    );

    const app = appModule.getApps().length
      ? appModule.getApp()
      : appModule.initializeApp(firebaseConfig);

    const auth = authModule.getAuth(app);
    const db = fsModule.getFirestore(app);

    let unsubBookings = null;
    let unsubProducts = null;
    let activeTab = "bookings";
    let bookingFilter = "All";
    let latestBookingsSnap = null;

    function cleanupListeners() {
      if (typeof unsubBookings === "function") unsubBookings();
      if (typeof unsubProducts === "function") unsubProducts();
      unsubBookings = null;
      unsubProducts = null;
    }

    async function checkIsAdmin(user) {
      const uidDocRef = fsModule.doc(db, "admins", user.uid);
      const uidSnap = await fsModule.getDoc(uidDocRef);

      if (uidSnap.exists()) {
        const data = uidSnap.data();
        return data.role === "admin" || Boolean(data.email);
      }

      const q = fsModule.query(
        fsModule.collection(db, "admins"),
        fsModule.where("email", "==", user.email)
      );
      const querySnap = await fsModule.getDocs(q);
      if (!querySnap.empty) {
        const data = querySnap.docs[0].data();
        return !data.role || data.role === "admin";
      }

      return false;
    }

    function applyTabStyles() {
      const tabs = ["bookings", "products", "settings"];
      tabs.forEach(t => {
        const btn = document.getElementById(`tab-btn-${t}`);
        const sec = document.getElementById(`tab-sec-${t}`);
        if (!btn || !sec) return;
        const isActive = activeTab === t;
        btn.style.background = isActive ? "#f5ad28" : "#1e293b";
        btn.style.color = isActive ? "#0f172a" : "#e2e8f0";
        sec.style.display = isActive ? "block" : "none";
      });
    }

    function renderDashboard(user) {
      area.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;border-bottom:1px solid #334155;padding-bottom:12px;margin-bottom:16px">
          <div>
            <h3 style="margin:0;color:#ffffff">AZ Internet & Mobile — Master Control</h3>
            <small style="color:#cbd5e1">Logged in: ${escapeHtml(user.email)}</small>
          </div>
          <button id="admin-logout"
            style="padding:8px 16px;background:#e53935;color:#fff;border:0;border-radius:6px;font-weight:600;cursor:pointer">
            Logout
          </button>
        </div>

        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:22px">
          <button type="button" id="tab-btn-bookings" style="${tabBtnBase}">📋 Bookings</button>
          <button type="button" id="tab-btn-products" style="${tabBtnBase}">🛍️ Products</button>
          <button type="button" id="tab-btn-settings" style="${tabBtnBase}">⚙️ Website Settings</button>
        </div>

        <section id="tab-sec-bookings">
          <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;margin-bottom:12px">
            <h4 style="color:#f5ad28;margin:0">ग्राहक बुकिंग्स</h4>
            <select id="booking-filter"
              style="padding:7px 10px;background:#0f172a;color:#f8fafc;border:1px solid #475569;border-radius:6px">
              ${["All", "New", "Pending", "Confirmed", "In Progress", "Completed", "Cancelled"]
                .map(f => `<option value="${f}" ${bookingFilter === f ? "selected" : ""}>Filter: ${f}</option>`)
                .join("")}
            </select>
          </div>
          <div id="bookings-list" style="color:#e2e8f0">Bookings लोड हो रही हैं...</div>
        </section>

        <section id="tab-sec-products" style="display:none">
          <h4 style="color:#f5ad28;margin-bottom:12px">Products जोड़ें / बदलें / हटाएँ</h4>
          <form id="product-form" style="background:#1e293b;border:1px solid #334155;padding:16px;border-radius:10px;margin-bottom:18px">
            <input type="hidden" id="product-id">

            <div style="margin-bottom:12px">
              <label style="${labelStyle}">Product Name *</label>
              <input id="product-name" type="text" placeholder="जैसे: Tempered Glass / Charger / Repair Service" required style="${inputStyle}">
            </div>

            <div style="display:flex;gap:12px;flex-wrap:wrap;margin-bottom:12px">
              <div style="flex:1;min-width:140px">
                <label style="${labelStyle}">Price (₹) *</label>
                <input id="product-price" type="number" step="0.01" placeholder="Price" required style="${inputStyle}">
              </div>
              <div style="flex:1;min-width:140px">
                <label style="${labelStyle}">Category</label>
                <input id="product-category" type="text" placeholder="Accessories / Mobile / Service" style="${inputStyle}">
              </div>
            </div>

            <div style="margin-bottom:12px">
              <label style="${labelStyle}">Image URL (वैकल्पिक)</label>
              <input id="product-image" type="text" placeholder="जैसे: mobile-sales-banner.png या https://..." style="${inputStyle}">
            </div>

            <div style="margin-bottom:14px">
              <label style="${labelStyle}">Description</label>
              <textarea id="product-desc" rows="2" placeholder="संक्षिप्त विवरण" style="${inputStyle}"></textarea>
            </div>

            <div style="margin-bottom:14px">
              <label style="display:inline-flex;align-items:center;gap:8px;color:#e2e8f0;cursor:pointer">
                <input type="checkbox" id="product-active" checked>
                <span>वेबसाइट पर Active (दिखाएँ)</span>
              </label>
            </div>

            <button type="submit" id="product-submit-btn"
              style="padding:10px 20px;background:#f5ad28;color:#0f172a;border:0;border-radius:6px;font-weight:bold;cursor:pointer">
              Product जोड़ें
            </button>
            <button type="button" id="product-cancel-btn"
              style="display:none;padding:10px 16px;background:#475569;color:#fff;border:0;border-radius:6px;margin-left:8px;cursor:pointer">
              Cancel Edit
            </button>
            <p id="product-msg" style="margin:10px 0 0;font-size:14px;color:#38bdf8"></p>
          </form>

          <div id="products-list" style="color:#e2e8f0">Products लोड हो रहे हैं...</div>
        </section>

        <section id="tab-sec-settings" style="display:none">
          <h4 style="color:#f5ad28;margin-bottom:12px">पूरी वेबसाइट की सेटिंग्स (Live Sync)</h4>
          <form id="settings-form" style="background:#1e293b;border:1px solid #334155;padding:16px;border-radius:10px">
            <div style="display:flex;gap:12px;flex-wrap:wrap;margin-bottom:12px">
              <div style="flex:1;min-width:180px">
                <label style="${labelStyle}">दुकान का नाम</label>
                <input id="set-shop-name" type="text" style="${inputStyle}">
              </div>
              <div style="flex:1;min-width:180px">
                <label style="${labelStyle}">Tagline</label>
                <input id="set-tagline" type="text" style="${inputStyle}">
              </div>
            </div>

            <div style="display:flex;gap:12px;flex-wrap:wrap;margin-bottom:12px">
              <div style="flex:1;min-width:160px">
                <label style="${labelStyle}">फ़ोन नंबर</label>
                <input id="set-phone" type="text" style="${inputStyle}">
              </div>
              <div style="flex:1;min-width:160px">
                <label style="${labelStyle}">WhatsApp नंबर (देश कोड सहित, जैसे 919960312286)</label>
                <input id="set-whatsapp" type="text" style="${inputStyle}">
              </div>
            </div>

            <div style="margin-bottom:12px">
              <label style="${labelStyle}">पता</label>
              <input id="set-address" type="text" style="${inputStyle}">
            </div>

            <div style="margin-bottom:12px">
              <label style="${labelStyle}">दुकान खुलने का समय</label>
              <input id="set-timing" type="text" style="${inputStyle}">
            </div>

            <div style="margin-bottom:12px">
              <label style="${labelStyle}">घोषणा / ऑफ़र मैसेज (Announcement Bar)</label>
              <textarea id="set-announcement" rows="2" style="${inputStyle}"></textarea>
            </div>

            <div style="display:flex;gap:18px;flex-wrap:wrap;margin-bottom:16px">
              <label style="display:inline-flex;align-items:center;gap:8px;color:#e2e8f0;cursor:pointer">
                <input type="checkbox" id="set-show-announcement">
                <span>घोषणा पट्टी वेबसाइट पर दिखाएँ</span>
              </label>
              <label style="display:inline-flex;align-items:center;gap:8px;color:#e2e8f0;cursor:pointer">
                <input type="checkbox" id="set-booking-open">
                <span>ऑनलाइन बुकिंग चालू रखें</span>
              </label>
            </div>

            <button type="submit" id="settings-save-btn"
              style="padding:10px 22px;background:#f5ad28;color:#0f172a;border:0;border-radius:6px;font-weight:bold;cursor:pointer">
              सेटिंग्स सेव करें
            </button>
            <p id="settings-msg" style="margin:10px 0 0;font-size:14px;color:#38bdf8"></p>
          </form>
        </section>
      `;

      document.getElementById("admin-logout").onclick = async () => {
        cleanupListeners();
        await authModule.signOut(auth);
      };

      ["bookings", "products", "settings"].forEach(t => {
        const btn = document.getElementById(`tab-btn-${t}`);
        if (btn) {
          btn.onclick = () => {
            activeTab = t;
            applyTabStyles();
          };
        }
      });

      applyTabStyles();
      listenBookings();
      setupProductForm();
      listenProducts();
      setupSettingsForm();
    }

    function renderFilteredBookings() {
      const container = document.getElementById("bookings-list");
      if (!container || !latestBookingsSnap) return;

      const docs = latestBookingsSnap.docs.filter(d => {
        if (bookingFilter === "All") return true;
        return (d.data().status || "New") === bookingFilter;
      });

      if (!docs.length) {
        container.innerHTML = "<p style='color:#cbd5e1'>इस फ़िल्टर के लिए कोई Booking नहीं है।</p>";
        return;
      }

      const statuses = ["New", "Pending", "Confirmed", "In Progress", "Completed", "Cancelled"];

      container.innerHTML = docs
        .map(docSnap => {
          const b = docSnap.data();
          const currentStatus = b.status || "New";
          const customer = b.customerName || b.name || b.phone || b.email || "Customer";
          const item = b.service || b.productName || b.item || "-";
          const note = b.message || b.notes || "";

          return `
            <div style="background:#1e293b;border:1px solid #334155;border-radius:8px;padding:14px;margin-bottom:12px;color:#f8fafc">
              <div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:8px">
                <strong style="font-size:16px;color:#ffffff">${escapeHtml(customer)}</strong>
                <span style="color:#94a3b8;font-size:12px">ID: <code>${docSnap.id}</code></span>
              </div>
              <p style="margin:6px 0;color:#e2e8f0"><strong>Item / Service:</strong> ${escapeHtml(item)}</p>
              ${b.phone ? `<p style="margin:4px 0;color:#e2e8f0"><strong>Phone:</strong> <a href="tel:${escapeHtml(b.phone)}" style="color:#38bdf8">${escapeHtml(b.phone)}</a></p>` : ""}
              ${b.date ? `<p style="margin:4px 0;color:#cbd5e1"><strong>Date:</strong> ${escapeHtml(b.date)}</p>` : ""}
              ${note ? `<p style="margin:4px 0;color:#cbd5e1"><strong>Note:</strong> ${escapeHtml(note)}</p>` : ""}
              <div style="margin-top:10px;display:flex;align-items:center;gap:8px;flex-wrap:wrap">
                <label style="color:#e2e8f0"><strong>Status:</strong></label>
                <select class="booking-status-select" data-id="${docSnap.id}"
                  style="padding:6px 10px;background:#0f172a;color:#f8fafc;border:1px solid #475569;border-radius:6px">
                  ${statuses
                    .map(st => `<option value="${st}" ${currentStatus === st ? "selected" : ""}>${st}</option>`)
                    .join("")}
                </select>
                <button type="button" class="delete-booking-btn" data-id="${docSnap.id}"
                  style="padding:6px 10px;background:#7f1d1d;color:#fecaca;border:0;border-radius:6px;cursor:pointer;margin-left:auto">
                  हटाएँ
                </button>
              </div>
            </div>
          `;
        })
        .join("");

      container.querySelectorAll(".booking-status-select").forEach(select => {
        select.onchange = async e => {
          const id = e.target.dataset.id;
          try {
            await fsModule.updateDoc(fsModule.doc(db, "bookings", id), {
              status: e.target.value,
              updatedAt: fsModule.serverTimestamp()
            });
          } catch (err) {
            alert("Status बदलने में त्रुटि: " + err.message);
          }
        };
      });

      container.querySelectorAll(".delete-booking-btn").forEach(btn => {
        btn.onclick = async () => {
          const id = btn.dataset.id;
          if (!confirm("क्या आप इस Booking को हटाना चाहते हैं?")) return;
          try {
            await fsModule.deleteDoc(fsModule.doc(db, "bookings", id));
          } catch (err) {
            alert("हटाने में त्रुटि: " + err.message);
          }
        };
      });
    }

    function listenBookings() {
      const filterEl = document.getElementById("booking-filter");
      if (filterEl) {
        filterEl.onchange = e => {
          bookingFilter = e.target.value;
          renderFilteredBookings();
        };
      }

      const q = fsModule.query(
        fsModule.collection(db, "bookings"),
        fsModule.orderBy("createdAt", "desc")
      );

      unsubBookings = fsModule.onSnapshot(
        q,
        snap => {
          latestBookingsSnap = snap;
          renderFilteredBookings();
        },
        err => {
          if (err.code === "failed-precondition" || err.code === "invalid-argument") {
            if (typeof unsubBookings === "function") unsubBookings();
            unsubBookings = fsModule.onSnapshot(fsModule.collection(db, "bookings"), snap => {
              latestBookingsSnap = snap;
              renderFilteredBookings();
            });
          } else {
            const container = document.getElementById("bookings-list");
            if (container) {
              container.innerHTML = `<p style="color:#f87171">Bookings Error: ${escapeHtml(err.message)}</p>`;
            }
          }
        }
      );
    }

    function setupProductForm() {
      const form = document.getElementById("product-form");
      const idInput = document.getElementById("product-id");
      const nameInput = document.getElementById("product-name");
      const priceInput = document.getElementById("product-price");
      const catInput = document.getElementById("product-category");
      const imgInput = document.getElementById("product-image");
      const descInput = document.getElementById("product-desc");
      const activeInput = document.getElementById("product-active");
      const submitBtn = document.getElementById("product-submit-btn");
      const cancelBtn = document.getElementById("product-cancel-btn");
      const msgEl = document.getElementById("product-msg");

      function resetForm() {
        idInput.value = "";
        form.reset();
        activeInput.checked = true;
        submitBtn.textContent = "Product जोड़ें";
        cancelBtn.style.display = "none";
      }

      cancelBtn.onclick = resetForm;

      form.onsubmit = async e => {
        e.preventDefault();
        const id = idInput.value.trim();
        const payload = {
          name: nameInput.value.trim(),
          price: Number(priceInput.value),
          category: catInput.value.trim(),
          image: imgInput.value.trim(),
          description: descInput.value.trim(),
          active: Boolean(activeInput.checked),
          updatedAt: fsModule.serverTimestamp()
        };

        msgEl.textContent = "Save हो रहा है...";
        try {
          if (id) {
            await fsModule.updateDoc(fsModule.doc(db, "products", id), payload);
            msgEl.textContent = "Product अपडेट हो गया।";
          } else {
            payload.createdAt = fsModule.serverTimestamp();
            await fsModule.addDoc(fsModule.collection(db, "products"), payload);
            msgEl.textContent = "नया Product जुड़ गया।";
          }
          resetForm();
        } catch (err) {
          msgEl.textContent = "Error: " + err.message;
        }
      };
    }

    function listenProducts() {
      const container = document.getElementById("products-list");
      unsubProducts = fsModule.onSnapshot(
        fsModule.collection(db, "products"),
        snap => {
          if (snap.empty) {
            container.innerHTML = "<p style='color:#cbd5e1'>अभी कोई Product नहीं है।</p>";
            return;
          }

          container.innerHTML = sn
