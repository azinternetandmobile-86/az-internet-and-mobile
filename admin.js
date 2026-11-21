// For Firebase JS SDK v7.20.0 and later, measurementId is optional
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

  area.innerHTML = `
    <form id="admin-login">
      <label>Email ID</label>
      <input id="admin-email" type="email"
        placeholder="अपना Email डालें" required
        style="display:block;width:100%;padding:12px;margin:10px 0">

      <label>Password</label>
      <input id="admin-password" type="password"
        placeholder="अपना Password डालें" required
        style="display:block;width:100%;padding:12px;margin:10px 0">

      <button type="submit"
        style="padding:12px 25px;background:#f5ad28;
        border:0;border-radius:8px;font-weight:bold">
        Login करें
      </button>
    </form>
    <p id="login-message"></p>
  `;

  try {
    const appModule = await import(
      "https://www.gstatic.com/firebasejs/13.3.0/firebase-app.js"
    );

    const authModule = await import(
      "https://www.gstatic.com/firebasejs/13.3.0/firebase-auth.js"
    );

    const app = appModule.initializeApp(firebaseConfig);
    const auth = authModule.getAuth(app);

    const message = document.getElementById("login-message");

    authModule.onAuthStateChanged(auth, user => {
      if (user) {
        area.innerHTML = `
          <h3>Login सफल हुआ!</h3>
          <p>${user.email}</p>
          <button id="admin-logout">Logout</button>
        `;

        document.getElementById("admin-logout")
          .onclick = () => authModule.signOut(auth);
      }
    });

    document.getElementById("admin-login")
      .addEventListener("submit", async event => {
        event.preventDefault();

        const email = document.getElementById("admin-email").value;
        const password = document.getElementById("admin-password").value;

        message.textContent = "Login हो रहा है...";

        try {
          await authModule.signInWithEmailAndPassword(
            auth, email, password
          );
        } catch (error) {
          message.textContent = "Login Error: " + error.message;
        }
      });

  } catch (error) {
    area.textContent = "Firebase Error: " + error.message;
  }
})();

