import React from 'react';
import { Shield, Trash2 } from 'lucide-react';

interface MinimalHeaderProps {
  onClearChat: () => void;
  onEmergencyStop: () => void;
  onOpenPermissions: () => void;
}

export const MinimalHeader: React.FC<MinimalHeaderProps> = ({
  onClearChat,
  onEmergencyStop,
  onOpenPermissions,
}) => {
  return (
    <header className="vortexis-header">
      <div className="vortexis-brand">
        <img src="/icon48.png" alt="Vortexis Logo" className="w-6 h-6 rounded-[5px]" />
        <span className="vortexis-brand-name">
          VORTEXIS
        </span>
      </div>

      <div className="vortexis-header-actions">
        <button
          type="button"
          onClick={onOpenPermissions}
          className="vortexis-icon-button"
          title="Site Permissions"
        >
          <Shield className="w-3.5 h-3.5" strokeWidth={1.5} />
        </button>

        <button
          type="button"
          onClick={onClearChat}
          className="vortexis-icon-button"
          title="Clear Chat History"
        >
          <Trash2 className="w-3.5 h-3.5" strokeWidth={1.5} />
        </button>
      </div>
    </header>
  );
};
