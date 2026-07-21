import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@/app/globals.css";
import { VaseStudio } from "@/components/VaseStudio";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <VaseStudio />
  </StrictMode>,
);
