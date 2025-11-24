import React from 'react';
import './Settings.css';

interface SettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

const Settings: React.FC<SettingsProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <>
      <div className="settings-overlay" onClick={onClose} />
      <div className="settings-panel">
        <div className="settings-header">
          <h2>Settings</h2>
          <button className="close-button" onClick={onClose}>
            ✕
          </button>
        </div>
        
        <div className="settings-content">
          <div className="settings-section">
            <h3>Appearance</h3>
            
            <div className="setting-item">
              <div className="setting-info">
                <label htmlFor="dark-mode-toggle">Dark Mode</label>
                <p className="setting-description">Switch between light and dark themes</p>
              </div>
              <label className="toggle-switch">
                <input 
                  type="checkbox" 
                  id="dark-mode-toggle"
                  // We'll implement this later
                />
                <span className="toggle-slider"></span>
              </label>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Settings;
