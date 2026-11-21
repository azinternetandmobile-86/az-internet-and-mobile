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
  const listEl = document.getElementById("product-list");
  if (!listEl) return;

  listEl.innerHTML = "<p class='muted'>प्रोडक्ट्स लोड हो रहे हैं...</p>";

  try {
    const appModule = await import(
      "https://www.gstatic.com/firebasejs/13.3.0/firebase-app.js"
    );
    const fsModule = await import(
      "https://www.gstatic.com/firebasejs/13.3.0/firebase-firestore.js"
    );

    const app = appModule.getApps().length
      ? appModule.getApp()
      : appModule.initializeApp(firebaseConfig);
    const db = fsModule.getFirestore(app);

    function escapeHtml(str) {
      return String(str ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
    }

    function renderCards(snap) {
      if (snap.empty) {
        listEl.innerHTML = "<p class='muted'>अभी कोई प्रोडक्ट उपलब्ध नहीं है।</p>";
        return;
      }

      listEl.innerHTML = snap.docs
        .map(docSnap => {
          const p = docSnap.data();
          const name = escapeHtml(p.name || "Product");
          const price = escapeHtml(String(p.price ?? ""));
          const category = escapeHtml(p.category || "");
          const desc = escapeHtml(p.description || "");
          const waText = encodeURIComponent(
            `नमस्ते AZ Internet & Mobile, मुझे "${p.name || "Product"}" (₹${p.price ?? ""}) के बारे में जानकारी चाहिए।`
          );

          return `
            <article class="card" style="padding:18px;border-radius:12px;border:1px solid #e2e8f0;background:#fff">
              ${category ? `<span class="tag" style="margin-bottom:8px;display:inline-block">${category}</span>` : ""}
              <h3 style="margin:6px 0;color:var(--navy)">${name}</h3>
              <p style="font-size:18px;font-weight:bold;color:#0f172a;margin:6px 0">₹${price}</p>
              ${desc ? `<p class="muted" style="margin:6px 0 14px">${desc}</p>` : ""}
              <div style="display:flex;gap:8px;flex-wrap:wrap">
                <a class="btn yellow" href="booking.html?product=${encodeURIComponent(p.name || "")}">बुक करें</a>
                <a class="btn blue" href="https://wa.me/919960312286?text=${waText}" target="_blank" rel="noopener">WhatsApp</a>
              </div>
            </article>
          `;
        })
        .join("");
    }

    const q = fsModule.query(
      fsModule.collection(db, "products"),
      fsModule.orderBy("createdAt", "desc")
    );

    fsModule.onSnapshot(
      q,
      snap => renderCards(snap),
      err => {
        if (err.code === "failed-precondition" || err.code === "invalid-argument") {
          fsModule.onSnapshot(fsModule.collection(db, "products"), snap => renderCards(snap));
        } else {
          listEl.innerHTML = `<p style="color:#dc2626">प्रोडक्ट्स लोड करने में त्रुटि: ${escapeHtml(err.message)}</p>`;
        }
      }
    );
  } catch (error) {
    listEl.innerHTML = `<p style="color:#dc2626">Firebase Error: ${error.message}</p>`;
  }
})();
