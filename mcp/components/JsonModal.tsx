import React from 'react';
import { CopyToClipboard } from 'react-copy-to-clipboard';

interface JsonModalProps {
  isOpen: boolean;
  onClose: () => void;
  jsonOutput: any;
  title?: string;
}

const JsonModal: React.FC<JsonModalProps> = ({
  isOpen,
  onClose,
  jsonOutput,
  title = "MCP Server Configuration"
}) => {
  const [copied, setCopied] = React.useState(false);

  if (!isOpen) return null;

  const handleCopy = () => {
    setCopied(true);
    setTimeout(() => setCopied(false), 2000); // Reset "Copied!" message after 2 seconds
  };

  return (
    <div className="fixed inset-0 bg-black flex justify-center items-center z-50">
      <div className="bg-white p-8 rounded-lg shadow-lg max-w-lg w-full relative">
        <button
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 text-2xl"
          onClick={onClose}
        >
          &times;
        </button>
        <h2 className="text-2xl font-bold mb-4">{title}</h2>
        <div className="bg-gray-100 p-4 rounded-md mb-4 max-h-80 overflow-auto">
          <pre className="text-gray-700 font-mono text-sm break-all">
            {JSON.stringify(jsonOutput, null, 2)}
          </pre>
        </div>
        <CopyToClipboard text={JSON.stringify(jsonOutput, null, 2)} onCopy={handleCopy}>
          <button className="bg-black text-white px-6 py-2 rounded-md hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-700 font-medium">
            {copied ? 'Copied!' : 'Copy to clipboard'}
          </button>
        </CopyToClipboard>
      </div>
    </div>
  );
};

export default JsonModal;
