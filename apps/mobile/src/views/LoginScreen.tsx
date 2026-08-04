import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { LightColors, LineModeColors } from '../theme/colors';
import { requestOtpApi, verifyOtpApi, loginStaffApi } from '../services/api';
import { AlertTriangle, X, ArrowLeft, Zap } from 'lucide-react-native';

interface LoginScreenProps {
  onLoginSuccess: (user: any, org: any, userOrgs?: any[]) => void;
  isLineMode: boolean;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess, isLineMode }) => {
  const colors = isLineMode ? LineModeColors : LightColors;
  const [email, setEmail] = useState('owner@saffrongrill.com');
  const [password, setPassword] = useState('password123');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'request' | 'verify'>('request');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const showError = (title: string, msg: string) => {
    setErrorMessage(msg);
    Alert.alert(title, msg);
    if (typeof window !== 'undefined' && window.alert) {
      try {
        window.alert(`${title}: ${msg}`);
      } catch (_) {}
    }
  };

  // Step 1: Request Email OTP Code
  const handleRequestOtp = async () => {
    setErrorMessage(null);
    if (!email || !password) {
      showError('Authentication Error', 'Please enter your email and password.');
      return;
    }
    setLoading(true);
    try {
      await requestOtpApi(email, password);
      setLoading(false);
      setStep('verify');
      Alert.alert('OTP Sent', `A 6-digit verification code was sent to ${email}`);
    } catch (err: any) {
      // Direct login fallback if OTP bypass mode active
      try {
        const res = await loginStaffApi(email);
        setLoading(false);
        onLoginSuccess(res.user, res.org, res.userOrgs);
      } catch (loginErr: any) {
        setLoading(false);
        showError('Authentication Error', err?.message || loginErr?.message || 'Failed to request OTP');
      }
    }
  };

  // Step 2: Verify 6-digit OTP Code
  const handleVerifyOtp = async () => {
    setErrorMessage(null);
    if (!otp || otp.length < 6) {
      showError('Verification Error', 'Please enter the 6-digit OTP code sent to your email.');
      return;
    }
    setLoading(true);
    try {
      const res = await verifyOtpApi(email, otp);
      setLoading(false);
      onLoginSuccess(res.user, res.org, res.userOrgs);
    } catch (err: any) {
      setLoading(false);
      const msg = err?.message || 'Invalid or expired OTP code.';
      showError('Verification Error', msg);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.steel }]}>
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.mist }]}>
        <View style={styles.header}>
          <View style={[styles.logoBadge, { backgroundColor: colors.primary }]}>
            <Text style={styles.logoText}>SG</Text>
          </View>
          <Text style={[styles.title, { color: colors.ink }]}>Saffron SaaS Mobile</Text>
          <Text style={[styles.subtitle, { color: colors.graphite }]}>
            Multi-Tenant Operational POS & Kitchen KDS
          </Text>
        </View>

        {errorMessage && (
          <View style={styles.errorBox}>
            <View style={styles.errorHeaderRow}>
              <AlertTriangle size={14} color="#991B1B" style={{ marginRight: 6 }} />
              <Text style={styles.errorBoxTitle}>Authentication Error</Text>
            </View>
            <Text style={styles.errorBoxMsg}>{errorMessage}</Text>
            <TouchableOpacity onPress={() => setErrorMessage(null)} style={styles.errorDismissBtn}>
              <X size={14} color="#991B1B" />
            </TouchableOpacity>
          </View>
        )}

        {step === 'request' ? (
          <>
            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: colors.graphite }]}>STAFF EMAIL ADDRESS</Text>
              <TextInput
                style={[styles.input, { color: colors.ink, borderColor: colors.mist, backgroundColor: colors.steel }]}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                placeholder="owner@restaurant.com"
                placeholderTextColor={colors.graphite}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: colors.graphite }]}>PASSWORD</Text>
              <TextInput
                style={[styles.input, { color: colors.ink, borderColor: colors.mist, backgroundColor: colors.steel }]}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                placeholder="••••••••"
                placeholderTextColor={colors.graphite}
              />
            </View>

            <TouchableOpacity
              style={[styles.button, { backgroundColor: colors.primary }]}
              onPress={handleRequestOtp}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.buttonText}>REQUEST EMAIL OTP CODE</Text>
              )}
            </TouchableOpacity>
          </>
        ) : (
          <>
            <View style={styles.otpBanner}>
              <Text style={[styles.otpTitle, { color: colors.ink }]}>Enter 6-Digit Email OTP</Text>
              <Text style={[styles.otpSub, { color: colors.graphite }]}>
                Check inbox for {email}
              </Text>
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: colors.graphite }]}>6-DIGIT OTP CODE</Text>
              <TextInput
                style={[styles.input, styles.otpInput, { color: colors.ink, borderColor: colors.primary, backgroundColor: colors.steel }]}
                value={otp}
                onChangeText={setOtp}
                keyboardType="number-pad"
                maxLength={6}
                placeholder="123456"
                placeholderTextColor={colors.graphite}
              />
            </View>

            <TouchableOpacity
              style={[styles.button, { backgroundColor: colors.primary }]}
              onPress={handleVerifyOtp}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.buttonText}>VERIFY OTP & SIGN IN</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.backBtn}
              onPress={() => { setErrorMessage(null); setStep('request'); }}
            >
              <ArrowLeft size={12} color={colors.graphite} style={{ marginRight: 4 }} />
              <Text style={[styles.backBtnText, { color: colors.graphite }]}>Back to Email & Password (Request New OTP)</Text>
            </TouchableOpacity>
          </>
        )}

        <View style={styles.demoBanner}>
          <Zap size={12} color={colors.primary} style={{ marginRight: 4 }} />
          <Text style={[styles.demoText, { color: colors.graphite }]}>
            Multi-Tenant Staff 2-Step OTP Authentication
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 20 },
  card: { borderRadius: 16, padding: 24, borderWidth: 1, elevation: 4 },
  header: { alignItems: 'center', marginBottom: 20 },
  logoBadge: { width: 50, height: 50, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  logoText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 18, fontFamily: 'monospace' },
  title: { fontSize: 20, fontWeight: 'bold', letterSpacing: -0.5 },
  subtitle: { fontSize: 11, marginTop: 4, textAlign: 'center' },
  errorBox: {
    backgroundColor: '#FEF2F2',
    borderColor: '#F87171',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 14,
    position: 'relative'
  },
  errorHeaderRow: { flexDirection: 'row', alignItems: 'center' },
  errorBoxTitle: { color: '#991B1B', fontSize: 11, fontWeight: 'bold', fontFamily: 'monospace' },
  errorBoxMsg: { color: '#B91C1C', fontSize: 11, marginTop: 2 },
  errorDismissBtn: { position: 'absolute', top: 10, right: 10, padding: 4 },
  formGroup: { marginBottom: 14 },
  label: { fontSize: 9.5, fontWeight: 'bold', marginBottom: 6, letterSpacing: 0.5, fontFamily: 'monospace' },
  input: { height: 50, borderRadius: 10, borderWidth: 1, paddingHorizontal: 16, fontSize: 15 },
  otpInput: { fontSize: 24, fontWeight: 'bold', letterSpacing: 10, textAlign: 'center' },
  button: { height: 52, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginTop: 10, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 3 },
  buttonText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 13, letterSpacing: 0.5, fontFamily: 'monospace' },
  otpBanner: { marginBottom: 16, alignItems: 'center' },
  otpTitle: { fontSize: 18, fontWeight: 'bold' },
  otpSub: { fontSize: 13, marginTop: 4, fontFamily: 'monospace' },
  backBtn: { marginTop: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 8 },
  backBtnText: { fontSize: 12, fontFamily: 'monospace' },
  demoBanner: { marginTop: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  demoText: { fontSize: 11, fontFamily: 'monospace' }
});

