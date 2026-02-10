/**
 * Session ID utility for unique user session management.
 * Uses sessionStorage to maintain a unique ID per browser tab.
 */

// Generate a UUID v4
function generateUUID() {
    if (typeof crypto !== "undefined" && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    // Fallback for older browsers
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

// Session storage key
const SESSION_ID_KEY = 'chatbot_session_id';

/**
 * Get the current session ID. Creates a new one if it doesn't exist.
 * @returns {string} The unique session ID for this browser tab
 */
export function getSessionId() {
    if (typeof window === 'undefined') {
        // Server-side rendering - return a placeholder
        return 'server-side';
    }

    let sessionId = sessionStorage.getItem(SESSION_ID_KEY);

    if (!sessionId) {
        sessionId = generateUUID();
        sessionStorage.setItem(SESSION_ID_KEY, sessionId);
        // console.log('[Session] Created new session:', sessionId);
    }

    return sessionId;
}

/**
 * Clear the current session (useful for testing or logout)
 */
export function clearSession() {
    if (typeof window !== 'undefined') {
        sessionStorage.removeItem(SESSION_ID_KEY);
        // console.log('[Session] Session cleared');
    }
}
