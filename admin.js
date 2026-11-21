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

    function renderDashboard(user) {
      area.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;border-bottom:1px solid #334155;padding-bottom:12px;margin-bottom:20px">
          <div>
            <h3 style="margin:0;color:#ffffff">AZ Internet & Mobile — Admin Dashboard</h3>
            <small style="color:#cbd5e1">Logged in: ${escapeHtml(user.email)}</small>
          </div>
          <button id="admin-logout"
            style="padding:8px 16px;background:#e53935;color:#fff;border:0;border-radius:6px;font-weight:600;cursor:pointer">
            Logout
          </button>
        </div>

        <section style="margin-bottom:32px">
          <h4 style="color:#f5ad28;margin-bottom:12px">Bookings</h4>
          <div id="bookings-list" style="color:#e2e8f0">Bookings लोड हो रही हैं...</div>
        </section>

        <section>
          <h4 style="color:#f5ad28;margin-bottom:12px">Products जोड़ें / बदलें</h4>
          <form id="product-form" style="background:#1e293b;border:1px solid #334155;padding:16px;border-radius:10px;margin-bottom:18px">
            <input type="hidden" id="product-id">

            <div style="margin-bottom:12px">
              <label style="${labelStyle}">Product Name</label>
              <input id="product-name" type="text" placeholder="जैसे: Tempered Glass / Charger / Repair Service" required style="${inputStyle}">
            </div>

            <div style="display:flex;gap:12px;flex-wrap:wrap;margin-bottom:12px">
              <div style="flex:1;min-width:140px">
                <label style="${labelStyle}">Price (₹)</label>
                <input id="product-price" type="number" step="0.01" placeholder="Price" required style="${inputStyle}">
              </div>
              <div style="flex:1;min-width:140px">
                <label style="${labelStyle}">Category / Status</label>
                <input id="product-category" type="text" placeholder="Accessories / Mobile / Service" style="${inputStyle}">
              </div>
            </div>

            <div style="margin-bottom:14px">
              <label style="${labelStyle}">Description</label>
              <textarea id="product-desc" rows="2" placeholder="संक्षिप्त विवरण" style="${inputStyle}"></textarea>
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
      `;

      document.getElementById("admin-logout").onclick = async () => {
        cleanupListeners();
        await authModule.signOut(auth);
      };

      listenBookings();
      setupProductForm();
      listenProducts();
    }

    function renderBookingCards(container, snap) {
      if (snap.empty) {
        container.innerHTML = "<p style='color:#cbd5e1'>अभी कोई Booking नहीं है।</p>";
        return;
      }

      container.innerHTML = snap.docs
        .map(docSnap => {
          const b = docSnap.data();
          const currentStatus = b.status || "Pending";
          const customer = b.customerName || b.name || b.phone || b.email || "Customer";
          const item = b.service || b.productName || b.item || "-";

          return `
            <div style="background:#1e293b;border:1px solid #334155;border-radius:8px;padding:14px;margin-bottom:12px;color:#f8fafc">
              <div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:8px">
                <strong style="font-size:16px;color:#ffffff">${escapeHtml(customer)}</strong>
                <span style="color:#94a3b8;font-size:12px">ID: <code>${docSnap.id}</code></span>
              </div>
              <p style="margin:6px 0;color:#e2e8f0"><strong>Item / Service:</strong> ${escapeHtml(item)}</p>
              ${b.phone ? `<p style="margin:4px 0;color:#e2e8f0"><strong>Phone:</strong> ${escapeHtml(b.phone)}</p>` : ""}
              ${b.notes ? `<p style="margin:4px 0;color:#cbd5e1"><strong>Note:</strong> ${escapeHtml(b.notes)}</p>` : ""}
              <div style="margin-top:10px;display:flex;align-items:center;gap:8px;flex-wrap:wrap">
                <label style="color:#e2e8f0"><strong>Status:</strong></label>
                <select class="booking-status-select" data-id="${docSnap.id}"
                  style="padding:6px 10px;background:#0f172a;color:#f8fafc;border:1px solid #475569;border-radius:6px">
                  ${["Pending", "Confirmed", "In Progress", "Completed", "Cancelled"]
                    .map(st => `<option value="${st}" ${currentStatus === st ? "selected" : ""}>${st}</option>`)
                    .join("")}
                </select>
              </div>
            </div>
          `;
        })
        .join("");

      container.querySelectorAll(".booking-status-select").forEach(select => {
        select.onchange = async e => {
          const id = e.target.dataset.id;
          const newStatus = e.target.value;
          try {
            await fsModule.updateDoc(fsModule.doc(db, "bookings", id), {
              status: newStatus,
              updatedAt: fsModule.serverTimestamp()
            });
          } catch (err) {
            alert("Status बदलने में त्रुटि: " + err.message);
          }
        };
      });
    }

    function listenBookings() {
      const container = document.getElementById("bookings-list");
      const q = fsModule.query(
        fsModule.collection(db, "bookings"),
        fsModule.orderBy("createdAt", "desc")
      );

      unsubBookings = fsModule.onSnapshot(
        q,
        snap => renderBookingCards(container, snap),
        err => {
          if (err.code === "failed-precondition" || err.code === "invalid-argument") {
            if (typeof unsubBookings === "function") unsubBookings();
            unsubBookings = fsModule.onSnapshot(
              fsModule.collection(db, "bookings"),
              snap => renderBookingCards(container, snap)
            );
          } else {
            container.innerHTML = `<p style="color:#f87171">Bookings Error: ${escapeHtml(err.message)}</p>`;
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
      const descInput = document.getElementById("product-desc");
      const submitBtn = document.getElementById("product-submit-btn");
      const cancelBtn = document.getElementById("product-cancel-btn");
      const msgEl = document.getElementById("product-msg");

      function resetForm() {
        idInput.value = "";
        form.reset();
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
          description: descInput.value.trim(),
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

          container.innerHTML = snap.docs
            .map(docSnap => {
              const p = docSnap.data();
              return `
                <div style="background:#1e293b;border:1px solid #334155;border-radius:8px;padding:14px;margin-bottom:10px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;color:#f8fafc">
                  <div>
                    <strong style="color:#ffffff">${escapeHtml(p.name || "Unnamed")}</strong> — <span style="color:#f5ad28;font-weight:bold">₹${escapeHtml(String(p.price ?? 0))}</span>
                    ${p.category ? `<span style="background:#334155;color:#e2e8f0;padding:2px 8px;border-radius:4px;margin-left:6px;font-size:12px">${escapeHtml(p.category)}</span>` : ""}
                    ${p.description ? `<p style="margin:6px 0 0;color:#cbd5e1;font-size:14px">${escapeHtml(p.description)}</p>` : ""}
                  </div>
                  <div style="display:flex;gap:8px">
                    <button class="edit-product-btn" data-id="${docSnap.id}"
                      style="padding:6px 12px;background:#334155;color:#fff;border:0;border-radius:4px;cursor:pointer">बदलें</button>
                    <button class="delete-product-btn" data-id="${docSnap.id}"
                      style="padding:6px 12px;background:#e53935;color:#fff;border:0;border-radius:4px;cursor:pointer">हटाएँ</button>
                  </div>
                </div>
              `;
            })
            .join("");

          const docMap = new Map(snap.docs.map(d => [d.id, d.data()]));

          container.querySelectorAll(".edit-product-btn").forEach(btn => {
            btn.onclick = () => {
              const id = btn.dataset.id;
              const p = docMap.get(id);
              if (!p) return;
              document.getElementById("product-id").value = id;
              document.getElementById("product-name").value = p.name || "";
              document.getElementById("product-price").value = p.price ?? "";
              document.getElementById("product-category").value = p.category || "";
              document.getElementById("product-desc").value = p.description || "";
              document.getElementById("product-submit-btn").textContent = "Product अपडेट करें";
              document.getElementById("product-cancel-btn").style.display = "inline-block";
            };
          });

          container.querySelectorAll(".delete-product-btn").forEach(btn => {
            btn.onclick = async () => {
              const id = btn.dataset.id;
              if (!confirm("क्या आप इस Product को हटाना चाहते हैं?")) return;
              try {
                await fsModule.deleteDoc(fsModule.doc(db, "products", id));
              } catch (err) {
                alert("हटाने में त्रुटि: " + err.message);
              }
            };
          });
        },
        err => {
          container.innerHTML = `<p style="color:#f87171">Products Error: ${escapeHtml(err.message)}</p>`;
        }
      );
    }

    function escapeHtml(str) {
      return String(str ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
    }

    authModule.onAuthStateChanged(auth, async user => {
      cleanupListeners();

      if (!user) {
        renderLoginForm();
        attachLoginHandler();
        return;
      }

      area.innerHTML = "<p style='color:#cbd5e1'>Admin अधिकार जाँचे जा रहे हैं...</p>";
      const isAdmin = await checkIsAdmin(user);

      if (!isAdmin) {
        area.innerHTML = `
          <p style="color:#f87171">इस खाते (${escapeHtml(user.email)}) को Admin अनुमति नहीं है।</p>
          <button id="admin-logout" style="padding:8px 16px;background:#e53935;color:#fff;border:0;border-radius:6px;cursor:pointer">Logout</button>
        `;
        document.getElementById("admin-logout").onclick = () => authModule.signOut(auth);
        return;
      }

      renderDashboard(user);
    });

    function attachLoginHandler() {
      const loginForm = document.getElementById("admin-login");
      if (!loginForm) return;

      loginForm.addEventListener("submit", async event => {
        event.preventDefault();
        const email = document.getElementById("admin-email").value;
        const password = document.getElementById("admin-password").value;
        const message = document.getElementById("login-message");

        message.textContent = "Login हो रहा है...";
        try {
          await authModule.signInWithEmailAndPassword(auth, email, password);
        } catch (error) {
          message.textContent = "Login Error: " + error.message;
        }
      });
    }

    attachLoginHandler();
  } catch (error) {
    area.innerHTML = `<p style="color:#f87171">Firebase Error: ${error.message}</p>`;
  }
})();
