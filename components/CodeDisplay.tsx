
import React, { useState } from 'react';

interface CodeDisplayProps {
  code: string;
  language: string;
  filename: string;
}

const CodeDisplay: React.FC<CodeDisplayProps> = ({ code, language, filename }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    React.createElement("div", { className: "flex flex-col h-full bg-slate-950 rounded-lg overflow-hidden border border-slate-800" },
      React.createElement("div", { className: "flex justify-between items-center px-4 py-2 bg-slate-900 border-b border-slate-800" },
        React.createElement("span", { className: "text-slate-400 text-xs font-medium tracking-wider uppercase" }, filename),
        React.createElement("button", { 
          onClick: handleCopy,
          className: "text-xs text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1"
        },
          copied ? 'Copiado!' : (
            React.createElement(React.Fragment, null,
              React.createElement("svg", { xmlns: "http://www.w3.org/2000/svg", width: "14", height: "14", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round" }, React.createElement("rect", { x: "9", y: "9", width: "13", height: "13", rx: "2", ry: "2" }), React.createElement("path", { d: "M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" })),
              "Copiar"
            )
          )
        )
      ),
      React.createElement("pre", { className: "flex-1 p-6 overflow-auto text-sm text-slate-300 code-font leading-relaxed" },
        React.createElement("code", null, code)
      )
    )
  );
};

export default CodeDisplay;