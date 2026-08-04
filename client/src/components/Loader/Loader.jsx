import { useState, useEffect } from "react";
import "./Loader.css";

const loaderMessages = [
  "Researcher is analyzing your topic...",
  "Gathering research data...",
  "Writer is crafting the content...",
  "Editor is reviewing the draft...",
  "Processing feedback...",
  "Making revisions...",
];

export default function Loader() {
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % loaderMessages.length);
    }, 2500);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="loader-container">
      <div className="loader-animation">
        <div className="loader-dot researcher"></div>
        <div className="loader-dot writer"></div>
        <div className="loader-dot editor"></div>
      </div>
      <p className="loader-message">{loaderMessages[messageIndex]}</p>
    </div>
  );
}
