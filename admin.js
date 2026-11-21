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

  const inp =
    "display:block;width:100%;padding:10px 12px;margin-top:6px;box-sizing:border-box;background:#0f172a;color:#f8fafc;border:1px solid #334155;border-radius:6px";
  const lbl = "display:block;color:#e2e8f0;font-weight:600;font-size:14px";
  const esc = s =>
    String(s ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");

  function showLogin(msg = "") {
    area.innerHTML = `
      <form id="admin-login">
        <div style="margin-bottom:12px">
          <label style="${lbl}">Email ID</label>
          <input id="admin-email" type="email" required style="${inp}">
        </div>
        <div style="margin-bottom:14px">
          <label style="${lbl}">Password</label>
          <input id="admin-password" type="password" required style="${inp}">
        </div>
        <button type="submit" style="padding:12px 24px;background:#f5ad28;color:#0f172a;border:0;border-radius:8px;font-weight:bold;cursor:pointer">Login करें</button>
      </form>
      <p id="login-msg" style="color:#f87171;margin-top:10px">${esc(msg)}</p>
    `;
  }

  showLogin();

  try {
    const appM = await import("https://www.gstatic.com/firebasejs/13.3.0/firebase-app.js");
    const authM = await import("https://www.gstatic.com/firebasejs/13.3.0/firebase-auth.js");
    const fsM = await import("https://www.gstatic.com/firebasejs/13.3.0/firebase-firestore.js");

    const app = appM.getApps().length ? appM.getApp() : appM.initializeApp(firebaseConfig);
    const auth = authM.getAuth(app);
    const db = fsM.getFirestore(app);

    let unsubB = null;
    let unsubP = null;
    let filterVal = "All";
    let bookingsSnap = null;

    function stopSubs() {
      if (unsubB) unsubB();
      if (unsubP) unsubP();
      unsubB = null;
      unsubP = null;
    }

    async function isAdminUser(user) {
      const uDoc = await fsM.getDoc(fsM.doc(db, "admins", user.uid));
      if (uDoc.exists()) return uDoc.data().role === "admin" || Boolean(uDoc.data().email);
      const q = fsM.query(fsM.collection(db, "admins"), fsM.where("email", "==", user.email));
      const qs = await fsM.getDocs(q);
      return !qs.empty;
    }

    function setTab(tab) {
      ["bookings", "products", "settings"].forEach(t => {
        const b = document.getElementById("tb-" + t);
        const s = document.getElementById("ts-" + t);
        if (!b || !s) return;
        const on = t === tab;
        b.style.background = on ? "#f5ad28" : "#1e293b";
        b.style.color = on ? "#0f172a" : "#e2e8f0";
        s.style.display = on ? "block" : "none";
      });
    }

    function drawBookings() {
      const box = document.getElementById("bookings-box");
      if (!box || !bookingsSnap) return;
      const list = bookingsSnap.docs.filter(d => filterVal === "All" || (d.data().status || "New") === filterVal);
      if (!list.length) {
        box.innerHTML = "<p style='color:#cbd5e1'>कोई Booking नहीं मिली।</p>";
        return;
      }
      const sts = ["New", "Pending", "Confirmed", "In Progress", "Completed", "Cancelled"];
      box.innerHTML = list
        .map(d => {
          const b = d.data();
          const st = b.status || "New";
          return `
            <div style="background:#1e293b;border:1px solid #334155;border-radius:8px;padding:12px;margin-bottom:10px">
              <strong>${esc(b.customerName || b.name || b.phone || "Customer")}</strong>
              <p style="margin:4px 0">Service: ${esc(b.service || b.productName || b.item || "-")}</p>
              ${b.phone ? `<p style="margin:4px 0">Phone: ${esc(b.phone)}</p>` : ""}
              ${b.message || b.notes ? `<p style="margin:4px 0;color:#cbd5e1">Note: ${esc(b.message || b.notes)}</p>` : ""}
              <div style="margin-top:8px;display:flex;gap:8px;align-items:center">
                <select class="b-st" data-id="${d.id}" style="padding:6px;background:#0f172a;color:#fff;border:1px solid #475569;border-radius:6px">
                  ${sts.map(x => `<option value="${x}" ${st === x ? "selected" : ""}>${x}</option>`).join("")}
                </select>
                <button type="button" class="b-del" data-id="${d.id}" style="padding:6px 10px;background:#7f1d1d;color:#fecaca;border:0;border-radius:6px;cursor:pointer;margin-left:auto">हटाएँ</button>
              </div>
            </div>`;
        })
        .join("");

      box.querySelectorAll(".b-st").forEach(sel => {
        sel.onchange = e => fsM.updateDoc(fsM.doc(db, "bookings", e.target.dataset.id), { status: e.target.value });
      });
      box.querySelectorAll(".b-del").forEach(btn => {
        btn.onclick = async () => {
          if (confirm("Booking हटाएँ?")) await fsM.deleteDoc(fsM.doc(db, "bookings", btn.dataset.id));
        };
      });
    }

    function initBookings() {
      const fEl = document.getElementById("b-filter");
      if (fEl) {
        fEl.onchange = e => {
          filterVal = e.target.value;
          drawBookings();
        };
      }
      unsubB = fsM.onSnapshot(fsM.collection(db, "bookings"), snap => {
        bookingsSnap = snap;
        drawBookings();
      });
    }

    function initProducts() {
      const form = document.getElementById("p-form");
      const box = document.getElementById("products-box");
      const msg = document.getElementById("p-msg");

      form.onsubmit = async e => {
        e.preventDefault();
        const id = document.getElementById("p-id").value.trim();
        const data = {
          name: document.getElementById("p-name").value.trim(),
          price: Number(document.getElementById("p-price").value),
          category: document.getElementById("p-cat").value.trim(),
          image: document.getElementById("p-img").value.trim(),
          description: document.getElementById("p-desc").value.trim(),
          active: document.getElementById("p-active").checked
        };
        msg.textContent = "सेव हो रहा है...";
        if (id) {
          await fsM.updateDoc(fsM.doc(db, "products", id), data);
          msg.textContent = "अपडेट हो गया।";
        } else {
          data.createdAt = fsM.serverTimestamp();
          await fsM.addDoc(fsM.collection(db, "products"), data);
          msg.textContent = "जुड़ गया।";
        }
        document.getElementById("p-id").value = "";
        form.reset();
        document.getElementById("p-active").checked = true;
      };

      unsubP = fsM.onSnapshot(fsM.collection(db, "products"), snap => {
        if (snap.empty) {
          box.innerHTML = "<p style='color:#cbd5e1'>अभी कोई Product नहीं है।</p>";
          return;
        }
        const map = new Map(snap.docs.map(d => [d.id, d.data()]));
        box.innerHTML = snap.docs
          .map(d => {
            const p = d.data();
            return `
              <div style="background:#1e293b;border:1px solid #334155;border-radius:8px;padding:12px;margin-bottom:10px;display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap">
                <div>
                  <strong>${esc(p.name)}</strong> — <span style="color:#f5ad28">₹${esc(p.price)}</span>
                  ${p.category ? `<span style="background:#334155;padding:2px 6px;border-radius:4px;font-size:12px">${esc(p.category)}</span>` : ""}
                </div>
                <div style="display:flex;gap:6px">
                  <button type="button" class="p-edit" data-id="${d.id}" style="padding:6px 10px;background:#334155;color:#fff;border:0;border-radius:4px;cursor:pointer">बदलें</button>
                  <button type="button" class="p-del" data-id="${d.id}" style="padding:6px 10px;background:#e53935;color:#fff;border:0;border-radius:4px;cursor:pointer">हटाएँ</button>
                </div>
              </div>`;
          })
          .join("");

        box.querySelectorAll(".p-edit").forEach(btn => {
          btn.onclick = () => {
            const p = map.get(btn.dataset.id);
            if (!p) return;
            document.getElementById("p-id").value = btn.dataset.id;
            document.getElementById("p-name").value = p.name || "";
            document.getElementById("p-price").value = p.price ?? "";
            document.getElementById("p-cat").value = p.category || "";
            document.getElementById("p-img").value = p.image || "";
            document.getElementById("p-desc").value = p.description || "";
            document.getElementById("p-active").checked = p.active !== false;
          };
        });
        box.querySelectorAll(".p-del").forEach(btn => {
          btn.onclick = async () => {
            if (confirm("Product हटाएँ?")) await fsM.deleteDoc(fsM.doc(db, "products", btn.dataset.id));
          };
        });
      });
    }

    async function initSettings() {
      const form = document.getElementById("s-form");
      const msg = document.getElementById("s-msg");
      const snap = await fsM.getDoc(fsM.doc(db, "settings", "site"));
      const s = snap.exists() ? snap.data() : {};

      document.getElementById("s-phone").value = s.phone || "9960312286";
      document.getElementById("s-wa").value = s.whatsapp || "919960312286";
      document.getElementById("s-addr").value = s.address || "HP Petrol Pump के सामने, काला बलुआ, अररिया, बिहार";
      document.getElementById("s-ann").value = s.announcement || "";
      document.getElementById("s-show-ann").checked = s.showAnnouncement !== false;
      document.getElementById("s-book-open").checked = s.bookingOpen !== false;

      form.onsubmit = async e => {
        e.preventDefault();
        msg.textContent = "सेव हो रहा है...";
        await fsM.setDoc(
          fsM.doc(db, "settings", "site"),
          {
            phone: document.getElementById("s-phone").value.trim(),
            whatsapp: document.getElementById("s-wa").value.trim(),
            address: document.getElementById("s-addr").value.trim(),
            announcement: document.getElementById("s-ann").value.trim(),
            showAnnouncement: document.getElementById("s-show-ann").checked,
            bookingOpen: document.getElementById("s-book-open").checked
          },
          { merge: true }
        );
        msg.textContent = "सेटिंग्स सेव हो गईं!";
      };
    }

    function drawDashboard(user) {
      const btnS = "padding:8px 12px;border:1px solid #334155;border-radius:6px;font-weight:600;cursor:pointer";
      area.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;border-bottom:1px solid #334155;padding-bottom:10px;margin-bottom:14px">
          <div><strong>${esc(user.email)}</strong></div>
          <button id="logout-btn" style="padding:7px 14px;background:#e53935;color:#fff;border:0;border-radius:6px;cursor:pointer">Logout</button>
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:18px">
          <button type="button" id="tb-bookings" style="${btnS}">Bookings</button>
          <button type="button" id="tb-products" style="${btnS}">Products</button>
          <button type="button" id="tb-settings" style="${btnS}">Settings</button>
        </div>

        <div id="ts-bookings">
          <select id="b-filter" style="padding:6px;background:#0f172a;color:#fff;border:1px solid #475569;border-radius:6px;margin-bottom:10px">
            <option value="All">All</option><option value="New">New</option><option value="Pending">Pending</option>
            <option value="Confirmed">Confirmed</option><option value="In Progress">In Progress</option>
            <option value="Completed">Completed</option><option value="Cancelled">Cancelled</option>
          </select>
          <div id="bookings-box">लोड हो रहा है...</div>
        </div>

        <div id="ts-products" style="display:none">
          <form id="p-form" style="background:#1e293b;padding:14px;border-radius:8px;margin-bottom:14px">
            <input type="hidden" id="p-id">
            <div style="margin-bottom:10px"><label style="${lbl}">Name *</label><input id="p-name" required style="${inp}"></div>
            <div style="margin-bottom:10px"><label style="${lbl}">Price (₹) *</label><input id="p-price" type="number" required style="${inp}"></div>
            <div style="margin-bottom:10px"><label style="${lbl}">Category</label><input id="p-cat" style="${inp}"></div>
            <div style="margin-bottom:10px"><label style="${lbl}">Image URL</label><input id="p-img" style="${inp}"></div>
            <div style="margin-bottom:10px"><label style="${lbl}">Description</label><textarea id="p-desc" rows="2" style="${inp}"></textarea></div>
            <label style="display:block;margin-bottom:10px"><input type="checkbox" id="p-active" checked> Active</label>
            <button type="submit" style="padding:9px 18px;background:#f5ad28;color:#0f172a;border:0;border-radius:6px;font-weight:bold;cursor:pointer">Save Product</button>
            <p id="p-msg" style="color:#38bdf8;margin-top:8px"></p>
          </form>
          <div id="products-box">लोड हो रहा है...</div>
        </div>

        <div id="ts-settings" style="display:none">
          <form id="s-form" style="background:#1e293b;padding:14px;border-radius:8px">
            <div style="margin-bottom:10px"><label style="${lbl}">Phone</label><input id="s-phone" style="${inp}"></div>
            <div style="margin-bottom:10px"><label style="${lbl}">WhatsApp</label><input id="s-wa" style="${inp}"></div>
            <div style="margin-bottom:10px"><label style="${lbl}">Address</label><input id="s-addr" style="${inp}"></div>
            <div style="margin-bottom:10px"><label style="${lbl}">Announcement</label><textarea id="s-ann" rows="2" style="${inp}"></textarea></div>
            <label style="display:block;margin-bottom:8px"><input type="checkbox" id="s-show-ann"> Show Announcement</label>
            <label style="display:block;margin-bottom:12px"><input type="checkbox" id="s-book-open"> Booking Open</label>
            <button type="submit" style="padding:9px 18px;background:#f5ad28;color:#0f172a;border:0;border-radius:6px;font-weight:bold;cursor:pointer">Save Settings</button>
            <p id="s-msg" style="color:#38bdf8;margin-top:8px"></p>
          </form>
        </div>
      `;

      document.getElementById("logout-btn").onclick = () => {
        stopSubs();
        authM.signOut(auth);
      };
      ["bookings", "products", "settings"].forEach(t => {
        document.getElementById("tb-" + t).onclick = () => setTab(t);
      });
      setTab("bookings");
      initBookings();
      initProducts();
      initSettings();
    }

    function bindLogin() {
      const f = document.getElementById("admin-login");
      if (!f) return;
      f.onsubmit = async e => {
        e.preventDefault();
        try {
          await authM.signInWithEmailAndPassword(
            auth,
            document.getElementById("admin-email").value,
            document.getElementById("admin-password").value
          );
        } catch (err) {
          showLogin(err.message);
        }
      };
    }

    bindLogin();
    authM.onAuthStateChanged(auth, async user => {
      stopSubs();
      if (!user) {
        showLogin();
        bindLogin();
        return;
      }
      if (!(await isAdminUser(user))) {
        showLogin("Admin अनुमति नहीं है।");
        return;
      }
      drawDashboard(user);
    });
  } catch (err) {
    area.innerHTML = '<p style="color:#f87171">' + esc(err.message) + "</p>";
  }
})();

