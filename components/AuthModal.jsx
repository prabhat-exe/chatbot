"use client";

import React from "react";

export default function AuthModal({ isOpen, step = 'phone', phone, setPhone, otp, setOtp, loading, message, onSendPhone, onVerifyOtp, onClose }) {
  if (!isOpen) return null;
 console.log(message)
  return (
    <div className="auth-modal-overlay" onClick={onClose}>
      <div className="auth-modal" onClick={(e) => e.stopPropagation()}>
        <button className="auth-modal-close" onClick={onClose} aria-label="Close">×</button>
        <h3 className="auth-modal-title">{step === 'phone' ? 'Login' : 'Verify OTP'}</h3>
        
        {message && <div className="auth-modal-message">{message}</div>}

        {step === 'phone' ? (
          <div className="auth-modal-body">
            <label className="auth-label">Phone number</label>
            <div className="auth-phone-row">
              <span className="auth-phone-code">+91</span>
              <input
                    type="tel"
                    className="auth-input text-[#1e293b]"
                    value={phone}
                    onChange={(e) => {
                        // Allow only digits
                        const onlyNumbers = e.target.value.replace(/\D/g, "");
                        setPhone(onlyNumbers);
                    }}
                    placeholder="Enter phone number"
                    inputMode="numeric"
                    pattern="[0-9]*"
               />

            </div>
            <button className="auth-primary" onClick={onSendPhone} disabled={loading || !phone}>
              {loading ? 'Sending…' : 'Send OTP'}
            </button>
          </div>
        ) : (
          <div className="auth-modal-body">
            <label className="auth-label">Enter OTP</label>

            <div className="otp-container">
                {[...Array(6)].map((_, index) => (
                <input
                    key={index}
                    type="text"
                    maxLength="1"
                    inputMode="numeric"
                    className="otp-input"
                    value={otp[index] || ""}
                    onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, "");
                    if (!value) return;

                    const newOtp = otp.split("");
                    newOtp[index] = value;
                    setOtp(newOtp.join(""));

                    // Auto focus next
                    if (index < 5) {
                        document.getElementById(`otp-${index + 1}`)?.focus();
                    }
                    }}
                    onKeyDown={(e) => {
                    if (e.key === "Backspace") {
                        const newOtp = otp.split("");
                        newOtp[index] = "";
                        setOtp(newOtp.join(""));

                        if (index > 0) {
                        document.getElementById(`otp-${index - 1}`)?.focus();
                        }
                    }
                    }}
                    id={`otp-${index}`}
                />
                ))}
            </div>

            <button
                className="auth-primary"
                onClick={onVerifyOtp}
                disabled={loading || otp.length !== 6}
            >
                {loading ? "Verifying…" : "Verify OTP"}
            </button>

            <button
                className="auth-secondary"
                onClick={onSendPhone}
                disabled={loading}
            >
                Resend OTP
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
