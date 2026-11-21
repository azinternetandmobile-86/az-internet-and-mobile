const firebaseConfig = {
  apiKey: "AIzaSyDXp--aSw0XvYbKVG70qtGRLGqLdl9E",
  authDomain: "az-internet-and-mobile.firebaseapp.com",
  projectId: "az-internet-and-mobile",
  storageBucket: "az-internet-and-mobile.firebasestorage.app",
  messagingSenderId: "981347891852",
  appId: "1:981347891852:web:cd7183f5b6369ff97d99a9",
  measurementId: "G-GYCBRB93S7"
};

// Firebase को लोड करें (यदि पहले से initialized है तो वही app लें)
const firebaseReady = (async () => {
  const [appModule, firestore] = await Promise.all([
    import("https://www.gstatic.com/firebasejs/13.3.0/firebase-app.js"),
    import("https://www.gstatic.com/firebasejs/13.3.0/firebase-firestore.js")
  ]);

  const app = appModule.getApps().length
    ? appModule.getApp()
    : appModule.initializeApp(firebaseConfig);
  const db = firestore.getFirestore(app);

  return { db, firestore };
})();

// HTML में सुरक्षित रूप से टेक्स्ट दिखाने के लिए
function safeText(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char]);
}

// प्रोडक्ट दिखाने का फंक्शन
window.renderProducts = async function () {
  const list = document.getElementById("product-list");
  if (!list) return;

  list.innerHTML = "<p>प्रोडक्ट लोड हो रहे हैं...</p>";

  try {
    const { db, firestore } = await firebaseReady;

    const snapshot = await firestore.getDocs(
      firestore.collection(db, "products")
    );

    if (snapshot.empty) {
      list.innerHTML = "<p>अभी कोई प्रोडक्ट उपलब्ध नहीं है।</p>";
      return;
    }

    const products = snapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .filter(product => product.active !== false);

    if (!products.length) {
      list.innerHTML = "<p>अभी कोई प्रोडक्ट उपलब्ध नहीं है।</p>";
      return;
    }

    list.innerHTML = products.map(product => `
      <article class="product-card">
        ${product.image ? `
          <img
            src="${safeText(product.image)}"
            alt="${safeText(product.name)}"
            loading="lazy"
            style="width:100%;height:190px;object-fit:contain"
          >
        ` : ""}
        <div class="product-info">
          <h3>${safeText(product.name || "Product")}</h3>
          <p>${safeText(product.description || "")}</p>
          <strong>₹${safeText(product.price ?? "कीमत पूछें")}</strong>
          <p>
            <a class="btn blue"
              href="https://wa.me/919960312286?text=${encodeURIComponent(
                "मुझे इस प्रोडक्ट की जानकारी चाहिए: " + (product.name || "")
              )}"
              target="_blank" rel="noopener">
              WhatsApp पर पूछें
            </a>
          </p>
        </div>
      </article>
    `).join("");

  } catch (error) {
    console.error("Products Error:", error);
    list.innerHTML =
      "<p>प्रोडक्ट लोड नहीं हुए। Firebase Database और Internet जाँचें।</p>";
  }
};

// ग्राहक की बुकिंग Firebase में सेव करें
window.submitRequest = async function (event) {
  event.preventDefault();

  const form = event.target;
  const result = document.getElementById("form-result");
  const button = form.querySelector('button[type="submit"]');

  const formData = new FormData(form);

  const booking = {
    name: String(formData.get("name") || "").trim(),
    phone: String(formData.get("phone") || "").trim(),
    service: String(formData.get("service") || "").trim(),
    date: String(formData.get("date") || ""),
    message: String(formData.get("message") || "").trim(),
    status: "New"
  };

  if (!booking.name || !booking.phone || !booking.service) {
    if (result) {
      result.textContent = "कृपया सभी जरूरी जानकारी भरें।";
      result.style.color = "red";
    }
    return;
  }

  if (button) {
    button.disabled = true;
    button.textContent = "सेव हो रहा है...";
  }
  if (result) result.textContent = "";

  try {
    const { db, firestore } = await firebaseReady;

    await firestore.addDoc(
      firestore.collection(db, "bookings"),
      {
        ...booking,
        createdAt: firestore.serverTimestamp()
      }
    );

    if (result) {
      result.textContent = "आपकी रिक्वेस्ट सफलतापूर्वक सेव हो गई है!";
      result.style.color = "green";
    }
    form.reset();

  } catch (error) {
    console.error("Booking Error:", error);
    if (result) {
      result.textContent = "रिक्वेस्ट सेव नहीं हुई: " + error.message;
      result.style.color = "red";
    }

  } finally {
    if (button) {
      button.disabled = false;
      button.textContent = "रिक्वेस्ट सबमिट करें";
    }
  }
};
