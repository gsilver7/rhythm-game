import { createRoot } from "react-dom/client";
import "./index.css";
// import RhythmGame from "./RhythmGame.tsx";
import Uart from "./Uart.tsx";

createRoot(document.getElementById("root")!).render(<Uart />);
