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

    const snap = await fsModule.getDoc(fsModule.doc(db, "settings", "site"));
    if (!snap.exists()) return;

    const s = snap.data();

    // WhatsApp लिंक अपडेट करें
    if (s.whatsapp) {
      const cleanWa = String(s.whatsapp).replace(/[^0-9]/g, "");
      document.querySelectorAll('a[href*="wa.me/"]').forEach(link => {
        const href = link.getAttribute("href") || "";
        const qIndex = href.indexOf("?");
        const queryPart = qIndex >= 0 ? href.slice(qIndex) : "";
        link.setAttribute("href", `https://wa.me/${cleanWa}${queryPart}`);
      });
    }

    // फ़ोन लिंक अपडेट करें
    if (s.phone) {
      const cleanPhone = String(s.phone).replace(/[^0-9+]/g, "");
      document.querySelectorAll('a[href^="tel:"]').forEach(link => {
        link.setAttribute("href", `tel:${cleanPhone}`);
      });
    }

    // यदि घोषणा (Announcement) चालू है तो पेज के ऊपर दिखाएँ
    if (s.showAnnouncement !== false && s.announcement) {
      const existing = document.getElementById("az-live-announcement");
      if (!existing) {
        const bar = document.createElement("div");
        bar.id = "az-live-announcement";
        bar.style.cssText =
          "background:#f5ad28;color:#0f172a;padding:8px 14px;text-align:center;font-weight:600;font-size:14px";
        bar.textContent = s.announcement;
        document.body.prepend(bar);
      }
    }

    // यदि ऑनलाइन बुकिंग बंद कर दी गई है तो बुकिंग फ़ॉर्म पर सूचना दिखाएँ
    if (s.bookingOpen === false) {
      const bookingForm = document.querySelector('form[onsubmit*="submitRequest"]');
      if (bookingForm) {
        const btn = bookingForm.querySelector('button[type="submit"]');
        if (btn) {
          btn.disabled = true;
          btn.textContent = "ऑनलाइन बुकिंग फ़िलहाल बंद है";
        }
      }
    }
  } catch (err) {
    console.warn("Site settings sync skipped:", err.message);
  }
})();
