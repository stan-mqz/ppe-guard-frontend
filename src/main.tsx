import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router-dom";

// Debe ir antes del router: createBrowserRouter ejecuta los loaders al importarse.
import "@/mocks/install";
import { router } from "@/routes/router";
import "@/styles/index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);
