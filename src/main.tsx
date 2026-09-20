import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import BackendApp from "./BackendApp";
import "./styles.css";
createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    {import.meta.env.MODE === "server" ? <BackendApp /> : <App />}
  </React.StrictMode>,
);
