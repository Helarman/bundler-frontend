import React, { useState } from 'react';
import { AlertCircle } from 'lucide-react';

interface ServerConfigProps {
  onSubmit: (url: string) => void;
}

const ServerConfig: React.FC<ServerConfigProps> = ({ onSubmit }) => {
  const [serverUrl, setServerUrl] = useState('');
  const [error, setError] = useState<string | null>(null);
 

  const validateAndFormatUrl = (url: string): string => {
    try {
      // If no protocol is specified, add https://
      if (!/^https?:\/\//i.test(url)) {
        url = 'https://' + url;
      }
      
      const urlObj = new URL(url);
      
      // For localhost or IP addresses, use http://
      if (urlObj.hostname === 'localhost' || 
          /^(\d{1,3}\.){3}\d{1,3}$/.test(urlObj.hostname)) {
        urlObj.protocol = 'http:';
      } else {
        // For all other domains, enforce https://
        urlObj.protocol = 'https:';
      }
      
      return urlObj.toString();
    } catch (err) {
      throw new Error('Invalid URL format');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // (Убираем проверку, чтобы всегда пропускало дальше)
    onSubmit(serverUrl.trim());
  };
  return (
    <div className="fixed inset-0 bg-neutral-900/95 flex items-center justify-center p-4">
      <div className="bg-neutral-800 rounded-lg max-w-md w-full p-6 shadow-xl">
        <h2 className="text-xl font-semibold text-green-500 mb-4">Server Configuration</h2>
        
        <div className="mb-6 space-y-2">
          <p className="text-neutral-300">
            Please enter your trading server URL:
          </p>
          <ul className="text-sm text-neutral-400 list-disc list-inside space-y-1">
            <li>For local servers, use: localhost:8888 or your IP address</li>
            <li>For remote servers, use HTTPS URL</li>
          </ul>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <input
              type="text"
              value={serverUrl}
              onChange={(e) => {
                setServerUrl(e.target.value);
                setError(null);
              }}
              placeholder="Enter server URL (e.g., localhost:8888)"
              className={`w-full bg-neutral-700 border ${
                error ? 'border-red-500' : 'border-neutral-600'
              } rounded px-3 py-2 text-neutral-200 placeholder-neutral-500 
                focus:outline-none focus:border-green-500`}
            />
            {error && (
              <div className="flex items-center gap-2 mt-2 text-red-500 text-sm">
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
            )}
          </div>
          <button
            type="submit"
            className="w-full bg-green-500 hover:bg-green-600 text-black font-medium 
                     py-2 px-4 rounded transition-colors"
          >
            Connect to Server
          </button>
        </form>
      </div>
    </div>
  );
};

export default ServerConfig;