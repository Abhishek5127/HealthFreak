"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateIndianPhoneNumber = validateIndianPhoneNumber;
/**
 * Strictly validates and formats Indian telephone numbers for Exotel SIP dialing.
 * Valid Indian mobile numbers are 10 digits starting with 6, 7, 8, or 9.
 */
function validateIndianPhoneNumber(rawNumber) {
    if (!rawNumber || typeof rawNumber !== 'string') {
        return { isValid: false, reason: 'Phone number is required' };
    }
    // Remove spaces, hyphens, parentheses
    let cleaned = rawNumber.replace(/[\s\-\(\)]/g, '');
    // Handle leading 0 (e.g. 09876543210)
    if (cleaned.startsWith('0') && cleaned.length === 11) {
        cleaned = cleaned.slice(1);
    }
    // Handle leading +91 or 91
    if (cleaned.startsWith('+91')) {
        cleaned = cleaned.slice(3);
    }
    else if (cleaned.startsWith('91') && cleaned.length === 12) {
        cleaned = cleaned.slice(2);
    }
    // Now cleaned should be exactly 10 digits
    if (cleaned.length !== 10) {
        return {
            isValid: false,
            reason: `Expected 10-digit Indian phone number, received ${cleaned.length} digits`,
        };
    }
    // Check valid mobile prefixes in India: 6, 7, 8, 9
    const firstDigit = cleaned.charAt(0);
    if (!['6', '7', '8', '9'].includes(firstDigit)) {
        return {
            isValid: false,
            reason: `Invalid Indian telecom mobile prefix "${firstDigit}". Must start with 6, 7, 8, or 9`,
        };
    }
    // Check all are digits
    if (!/^\d{10}$/.test(cleaned)) {
        return { isValid: false, reason: 'Contains non-numeric characters' };
    }
    return {
        isValid: true,
        formattedNumber: `+91${cleaned}`,
    };
}
