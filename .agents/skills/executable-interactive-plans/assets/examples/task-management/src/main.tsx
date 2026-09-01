import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { ReviewShell } from "./review-shell"
import "./styles.css"

createRoot(document.querySelector("#root")!).render(<StrictMode><ReviewShell /></StrictMode>)
