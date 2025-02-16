import { Auth0Provider } from "@auth0/auth0-react";
import React from "react";
import { createRoot } from "react-dom/client";

import App from "./App";

const container = document.getElementById("root") as HTMLElement;
const root = createRoot(container);

root.render(
  <React.StrictMode>
    <Auth0Provider
      domain="dev-u7ugzhfyb6nhuby6.us.auth0.com"
      clientId="qm1BBhb3g1KzdM6JPpHUmXUPkvHtIlDC"
      audience="http://localhost:8000"
        redirectUri={window.location.origin}
        connection="UBC-PMC-ADMINS"
    >
      <App />
    </Auth0Provider>
  </React.StrictMode>
);
