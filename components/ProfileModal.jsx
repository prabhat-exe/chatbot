"use client";

import React from "react";

export default function ProfileModal({
  isOpen,
  firstName,
  setFirstName,
  lastName,
  setLastName,
  email,
  setEmail,
  loading,
  message,
  onSubmit,
  onClose,
}) {
  if (!isOpen) return null;

  const isValidEmail = (value) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  };

  return (
    <div className="auth-modal-overlay" onClick={onClose}>
      <div className="auth-modal" onClick={(e) => e.stopPropagation()}>
        <button className="auth-modal-close" onClick={onClose} aria-label="Close">
          x
        </button>
        <h3 className="auth-modal-title">Complete Your Profile</h3>
        {message && <div className="auth-modal-message">{message}</div>}
        <div className="auth-modal-body">
          <label className="auth-label text-[#1e293b]">First Name</label>
          <input
            className="auth-input text-[#1e293b]"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            placeholder="Enter first name"
          />
          <label className="auth-label">Last Name</label>
          <input
            className="auth-input text-[#1e293b]"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            placeholder="Enter last name"
          />
          <label className="auth-label">Email (optional)</label>
          <input
            className={`auth-input text-[#1e293b] ${email && !isValidEmail(email) ? "input-error" : ""}`}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter email"
            type="email"
          />

          <button
            className="auth-primary"
            onClick={onSubmit}
            disabled={loading || !firstName || !lastName || (email && !isValidEmail(email))}
          >
            {loading ? "Saving..." : "Save Profile"}
          </button>
        </div>
      </div>
    </div>
  );
}
