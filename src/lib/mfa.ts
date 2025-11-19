/**
 * MFA Service Layer
 * Handles TOTP 2FA enrollment, verification, and backup codes
 * Uses Supabase Auth MFA APIs
 */

import { supabase } from './supabase';
import * as Crypto from 'expo-crypto';
import bcrypt from 'bcryptjs';

// ============================================================================
// Types
// ============================================================================

export interface MFAEnrollmentResult {
  factorId: string;
  qrCode: string;
  secret: string;
  uri: string;
}

export interface MFAFactor {
  id: string;
  type: 'totp';
  status: 'verified' | 'unverified';
  created_at: string;
  updated_at: string;
}

export interface BackupCode {
  code: string;
  id?: string;
}

export interface TrustedDevice {
  id: string;
  device_name: string | null;
  last_used_at: string;
  expires_at: string;
  created_at: string;
}

export interface SecurityEvent {
  id: string;
  event_type: string;
  event_data: any;
  ip_address: string | null;
  user_agent: string | null;
  success: boolean;
  created_at: string;
}

// ============================================================================
// MFA Enrollment
// ============================================================================

/**
 * Enroll a new TOTP factor for the current user
 * Returns QR code and secret for authenticator app setup
 */
export async function enrollTOTP(): Promise<MFAEnrollmentResult> {
  try {
    const { data, error } = await supabase.auth.mfa.enroll({
      factorType: 'totp',
      friendlyName: 'Authenticator App',
    });

    if (error) throw error;
    if (!data) throw new Error('No enrollment data returned');

    // Log security event
    await logSecurityEvent('mfa_enrollment_started', {
      factor_type: 'totp',
    });

    return {
      factorId: data.id,
      qrCode: data.totp.qr_code,
      secret: data.totp.secret,
      uri: data.totp.uri,
    };
  } catch (error) {
    console.error('[MFA] Enrollment error:', error);
    throw error;
  }
}

/**
 * Verify TOTP enrollment with a 6-digit code
 */
export async function verifyTOTPEnrollment(
  factorId: string,
  code: string
): Promise<boolean> {
  try {
    const { data, error } = await supabase.auth.mfa.challengeAndVerify({
      factorId,
      code,
    });

    if (error) throw error;

    // Log successful enrollment
    await logSecurityEvent('mfa_enrollment_completed', {
      factor_id: factorId,
      factor_type: 'totp',
    });

    return true;
  } catch (error) {
    console.error('[MFA] Verification error:', error);
    
    // Log failed enrollment attempt
    await logSecurityEvent('mfa_enrollment_failed', {
      factor_id: factorId,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, false);
    
    throw error;
  }
}

/**
 * Get all MFA factors for the current user
 */
export async function getMFAFactors(): Promise<MFAFactor[]> {
  try {
    const { data, error } = await supabase.auth.mfa.listFactors();

    if (error) throw error;

    return (data?.totp || []) as MFAFactor[];
  } catch (error) {
    console.error('[MFA] Error fetching factors:', error);
    return [];
  }
}

/**
 * Unenroll (remove) an MFA factor
 */
export async function unenrollMFA(factorId: string): Promise<void> {
  try {
    const { error } = await supabase.auth.mfa.unenroll({ factorId });

    if (error) throw error;

    // Log MFA removal
    await logSecurityEvent('mfa_unenrolled', {
      factor_id: factorId,
    });

    // Also delete backup codes when MFA is removed
    await deleteAllBackupCodes();
  } catch (error) {
    console.error('[MFA] Unenroll error:', error);
    throw error;
  }
}

// ============================================================================
// MFA Challenge & Verification (Login)
// ============================================================================

/**
 * Create an MFA challenge for login
 */
export async function createMFAChallenge(factorId: string): Promise<string> {
  try {
    const { data, error } = await supabase.auth.mfa.challenge({ factorId });

    if (error) throw error;
    if (!data) throw new Error('No challenge data returned');

    return data.id;
  } catch (error) {
    console.error('[MFA] Challenge creation error:', error);
    throw error;
  }
}

/**
 * Verify an MFA challenge with a 6-digit code
 */
export async function verifyMFAChallenge(
  factorId: string,
  challengeId: string,
  code: string
): Promise<boolean> {
  try {
    const { data, error } = await supabase.auth.mfa.verify({
      factorId,
      challengeId,
      code,
    });

    if (error) throw error;

    // Log successful verification
    await logSecurityEvent('mfa_verification_success', {
      factor_id: factorId,
    });

    return true;
  } catch (error) {
    console.error('[MFA] Verification error:', error);
    
    // Log failed verification
    await logSecurityEvent('mfa_verification_failed', {
      factor_id: factorId,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, false);
    
    throw error;
  }
}

// ============================================================================
// Backup Codes
// ============================================================================

/**
 * Generate secure backup codes
 */
function generateBackupCode(): string {
  // Generate 8-character alphanumeric code (e.g., "A3F7-K9M2")
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Exclude ambiguous chars
  let code = '';
  
  for (let i = 0; i < 8; i++) {
    if (i === 4) code += '-'; // Add separator
    const randomIndex = Math.floor(Math.random() * chars.length);
    code += chars[randomIndex];
  }
  
  return code;
}

/**
 * Generate and store backup codes for the current user
 */
export async function generateBackupCodes(count: number = 10): Promise<BackupCode[]> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No authenticated user');

    // Delete existing backup codes first
    await deleteAllBackupCodes();

    const codes: BackupCode[] = [];
    const codeInserts = [];

    // Generate codes
    for (let i = 0; i < count; i++) {
      const code = generateBackupCode();
      const hash = await bcrypt.hash(code, 10);
      
      codes.push({ code });
      codeInserts.push({
        user_id: user.id,
        code_hash: hash,
      });
    }

    // Store hashed codes in database
    const { error } = await supabase
      .from('mfa_backup_codes')
      .insert(codeInserts);

    if (error) throw error;

    // Log backup code generation
    await logSecurityEvent('backup_codes_generated', {
      count,
    });

    return codes;
  } catch (error) {
    console.error('[MFA] Backup code generation error:', error);
    throw error;
  }
}

/**
 * Verify a backup code and mark it as used
 */
export async function verifyBackupCode(code: string): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No authenticated user');

    // Get all unused backup codes for user
    const { data: backupCodes, error: fetchError } = await supabase
      .from('mfa_backup_codes')
      .select('id, code_hash')
      .eq('user_id', user.id)
      .is('used_at', null);

    if (fetchError) throw fetchError;
    if (!backupCodes || backupCodes.length === 0) {
      throw new Error('No backup codes available');
    }

    // Check each code hash
    for (const backupCode of backupCodes) {
      const isMatch = await bcrypt.compare(code, backupCode.code_hash);
      
      if (isMatch) {
        // Mark code as used
        const { error: updateError } = await supabase
          .from('mfa_backup_codes')
          .update({ used_at: new Date().toISOString() })
          .eq('id', backupCode.id);

        if (updateError) throw updateError;

        // Log successful backup code use
        await logSecurityEvent('backup_code_used', {
          code_id: backupCode.id,
        });

        return true;
      }
    }

    // No matching code found
    await logSecurityEvent('backup_code_failed', {
      reason: 'invalid_code',
    }, false);

    return false;
  } catch (error) {
    console.error('[MFA] Backup code verification error:', error);
    throw error;
  }
}

/**
 * Get count of remaining unused backup codes
 */
export async function getRemainingBackupCodesCount(): Promise<number> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return 0;

    const { count, error } = await supabase
      .from('mfa_backup_codes')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .is('used_at', null);

    if (error) throw error;

    return count || 0;
  } catch (error) {
    console.error('[MFA] Error counting backup codes:', error);
    return 0;
  }
}

/**
 * Delete all backup codes for the current user
 */
export async function deleteAllBackupCodes(): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from('mfa_backup_codes')
      .delete()
      .eq('user_id', user.id);

    if (error) throw error;
  } catch (error) {
    console.error('[MFA] Error deleting backup codes:', error);
    throw error;
  }
}

// ============================================================================
// Trusted Devices
// ============================================================================

/**
 * Generate a random device token
 */
async function generateDeviceToken(): Promise<string> {
  const randomBytes = await Crypto.getRandomBytesAsync(32);
  return Array.from(randomBytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Add a trusted device for the current user
 */
export async function addTrustedDevice(
  deviceName?: string,
  userAgent?: string,
  ipAddress?: string
): Promise<string> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No authenticated user');

    const deviceToken = await generateDeviceToken();
    const tokenHash = await bcrypt.hash(deviceToken, 10);
    const ipHash = ipAddress ? await bcrypt.hash(ipAddress, 10) : null;

    const { error } = await supabase
      .from('trusted_devices')
      .insert({
        user_id: user.id,
        device_token_hash: tokenHash,
        device_name: deviceName,
        user_agent: userAgent,
        ip_hash: ipHash,
      });

    if (error) throw error;

    // Log trusted device addition
    await logSecurityEvent('trusted_device_added', {
      device_name: deviceName,
    });

    return deviceToken;
  } catch (error) {
    console.error('[MFA] Error adding trusted device:', error);
    throw error;
  }
}

/**
 * Verify if a device token is trusted and not expired
 */
export async function verifyTrustedDevice(deviceToken: string): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { data: devices, error } = await supabase
      .from('trusted_devices')
      .select('id, device_token_hash, expires_at')
      .eq('user_id', user.id)
      .gt('expires_at', new Date().toISOString());

    if (error) throw error;
    if (!devices || devices.length === 0) return false;

    // Check each device token
    for (const device of devices) {
      const isMatch = await bcrypt.compare(deviceToken, device.device_token_hash);
      
      if (isMatch) {
        // Update last used timestamp
        await supabase
          .from('trusted_devices')
          .update({ last_used_at: new Date().toISOString() })
          .eq('id', device.id);

        return true;
      }
    }

    return false;
  } catch (error) {
    console.error('[MFA] Error verifying trusted device:', error);
    return false;
  }
}

/**
 * Get all trusted devices for the current user
 */
export async function getTrustedDevices(): Promise<TrustedDevice[]> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from('trusted_devices')
      .select('*')
      .eq('user_id', user.id)
      .order('last_used_at', { ascending: false });

    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error('[MFA] Error fetching trusted devices:', error);
    return [];
  }
}

/**
 * Remove a trusted device
 */
export async function removeTrustedDevice(deviceId: string): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('No authenticated user');

    const { error } = await supabase
      .from('trusted_devices')
      .delete()
      .eq('id', deviceId)
      .eq('user_id', user.id);

    if (error) throw error;

    // Log device removal
    await logSecurityEvent('trusted_device_removed', {
      device_id: deviceId,
    });
  } catch (error) {
    console.error('[MFA] Error removing trusted device:', error);
    throw error;
  }
}

/**
 * Remove all trusted devices for the current user
 */
export async function removeAllTrustedDevices(): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from('trusted_devices')
      .delete()
      .eq('user_id', user.id);

    if (error) throw error;

    // Log bulk device removal
    await logSecurityEvent('all_trusted_devices_removed', {});
  } catch (error) {
    console.error('[MFA] Error removing all trusted devices:', error);
    throw error;
  }
}

// ============================================================================
// Security Events
// ============================================================================

/**
 * Log a security event
 */
export async function logSecurityEvent(
  eventType: string,
  eventData: any = {},
  success: boolean = true,
  ipAddress?: string,
  userAgent?: string
): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();

    await supabase
      .from('security_events')
      .insert({
        user_id: user?.id || null,
        event_type: eventType,
        event_data: eventData,
        ip_address: ipAddress || null,
        user_agent: userAgent || null,
        success,
      });
  } catch (error) {
    // Don't throw - logging failures shouldn't break the app
    console.error('[MFA] Error logging security event:', error);
  }
}

/**
 * Get security events for the current user
 */
export async function getSecurityEvents(limit: number = 50): Promise<SecurityEvent[]> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from('security_events')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error('[MFA] Error fetching security events:', error);
    return [];
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Check if user has MFA enabled
 */
export async function isMFAEnabled(): Promise<boolean> {
  try {
    const factors = await getMFAFactors();
    return factors.some(f => f.status === 'verified');
  } catch (error) {
    console.error('[MFA] Error checking MFA status:', error);
    return false;
  }
}

/**
 * Get the user's verified TOTP factor (if any)
 */
export async function getVerifiedTOTPFactor(): Promise<MFAFactor | null> {
  try {
    const factors = await getMFAFactors();
    return factors.find(f => f.status === 'verified') || null;
  } catch (error) {
    console.error('[MFA] Error getting verified factor:', error);
    return null;
  }
}
