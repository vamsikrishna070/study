import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import { Lock, Fingerprint } from 'lucide-react-native';
import { useAppLock } from '../../context/AppLockContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppTheme } from '../../theme/theme';
import { Button } from '../../components/ui/Button';

export function AppLockScreen() {
  const { isLocked, isLockEnabled, biometricEnabled, biometricAvailable, biometricStatus, unlock, verifyPin } = useAppLock();
  const { colors, typography, radii, spacing } = useAppTheme();
  const insets = useSafeAreaInsets();

  const [pinMode, setPinMode] = useState(false);
  const [enteredPin, setEnteredPin] = useState('');
  const [errorText, setErrorText] = useState('');


  useEffect(() => {
    if (isLocked && isLockEnabled) {
      setEnteredPin('');
      setErrorText('');
      if (biometricEnabled && biometricAvailable) {
        setPinMode(false);
        promptBiometric();
      } else {
        setPinMode(true);
      }
    }
  }, [isLocked, isLockEnabled, biometricEnabled, biometricAvailable]);

  const promptBiometric = async () => {
    if (!biometricEnabled || !biometricAvailable) {
      setPinMode(true);
      return;
    }

    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Unlock StudyArena',
        cancelLabel: 'Use PIN',
        disableDeviceFallback: true,
      });

      if (result.success) {
        unlock();
      } else {

        setPinMode(true);
      }
    } catch (e) {
      setPinMode(true);
    }
  };

  const handlePinPress = (digit) => {
    setErrorText('');
    const nextPin = enteredPin + digit;
    setEnteredPin(nextPin);

    if (nextPin.length === 4) {
      checkPin(nextPin);
    }
  };

  const handleDelete = () => {
    if (enteredPin.length > 0) {
      setEnteredPin(enteredPin.slice(0, -1));
      setErrorText('');
    }
  };

  const checkPin = async (pin) => {
    const isValid = await verifyPin(pin);
    if (isValid) {
      unlock();
    } else {
      setErrorText('Incorrect PIN');
      setEnteredPin('');
    }
  };

  if (!isLockEnabled || !isLocked) return null;

  const renderKeypad = () => {
    const rows = [
      ['1', '2', '3'],
      ['4', '5', '6'],
      ['7', '8', '9'],
      ['', '0', 'delete']
    ];

    return (
      <View style={styles.keypadContainer}>
        {rows.map((row, rowIndex) => (
          <View key={rowIndex} style={styles.keypadRow}>
            {row.map((btn, colIndex) => {
              if (btn === '') {
                return <View key={colIndex} style={styles.keypadBtn} />;
              }
              if (btn === 'delete') {
                return (
                  <TouchableOpacity key={colIndex} style={styles.keypadBtn} onPress={handleDelete}>
                    <Text style={[styles.keypadText, { color: colors.mutedForeground }]}>⌫</Text>
                  </TouchableOpacity>
                );
              }
              return (
                <TouchableOpacity key={colIndex} style={styles.keypadBtn} onPress={() => handlePinPress(btn)}>
                  <Text style={[styles.keypadText, { color: colors.foreground }]}>{btn}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        ))}
      </View>
    );
  };

  return (
    <Modal visible={true} transparent={false} animationType="fade">
      <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.primary, fontFamily: typography.sans.bold }]}>StudyArena</Text>
        </View>

        <View style={styles.content}>
          <View style={[styles.iconContainer, { backgroundColor: colors.primary + '10' }]}>
            <Lock size={48} color={colors.primary} />
          </View>
          <Text style={[styles.lockedText, { color: colors.foreground, fontFamily: typography.sans.bold }]}>App Locked</Text>

          {errorText ? (
            <Text style={[styles.errorText, { color: colors.destructive, fontFamily: typography.sans.medium }]}>{errorText}</Text>
          ) : (
            <Text style={[styles.subtitle, { color: colors.mutedForeground, fontFamily: typography.sans.regular }]}>
              {pinMode ? 'Enter your 4-digit PIN' : 'Unlock to continue'}
            </Text>
          )}

          {pinMode && (
            <View style={styles.pinDotsContainer}>
              {[0, 1, 2, 3].map((i) => (
                <View
                  key={i}
                  style={[
                    styles.pinDot,
                    {
                      borderColor: colors.border,
                      backgroundColor: enteredPin.length > i ? colors.primary : 'transparent'
                    }
                  ]}
                />
              ))}
            </View>
          )}

          {pinMode ? (
            <View style={{ width: '100%', alignItems: 'center' }}>
              {renderKeypad()}
              {biometricEnabled && biometricAvailable && (
                <Button
                  variant="ghost"
                  onPress={() => {
                    setPinMode(false);
                    promptBiometric();
                  }}
                  style={{ marginTop: 24 }}
                >
                  Use Biometrics
                </Button>
              )}
            </View>
          ) : biometricEnabled && biometricAvailable ? (
            <View style={{ width: '100%', alignItems: 'center', marginTop: 32 }}>
              <View style={[styles.fingerprintCircle, { backgroundColor: colors.primary + '15' }]}>
                <Fingerprint size={56} color={colors.primary} />
              </View>
              <Button
                variant="primary"
                onPress={promptBiometric}
                style={{ width: '100%', maxWidth: 300, marginBottom: 16, marginTop: 24 }}
              >
                Use Fingerprint
              </Button>
              <Button
                variant="outline"
                onPress={() => setPinMode(true)}
                style={{ width: '100%', maxWidth: 300 }}
              >
                Use PIN
              </Button>
            </View>
          ) : (
            <View style={{ width: '100%', alignItems: 'center', marginTop: 24 }}>
              <Button
                variant="primary"
                onPress={() => setPinMode(true)}
                style={{ width: '100%', maxWidth: 300, marginTop: 8 }}
              >
                Use PIN
              </Button>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  title: {
    fontSize: 24,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingBottom: 60,
  },
  iconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  lockedText: {
    fontSize: 24,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 32,
  },
  errorText: {
    fontSize: 16,
    marginBottom: 32,
  },
  biometricBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  biometricText: {
    fontSize: 16,
    marginTop: 16,
  },
  fingerprintCircle: {
    width: 112,
    height: 112,
    borderRadius: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  biometricNotice: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 16,
    paddingHorizontal: 24,
  },
  usePinBtn: {
    marginTop: 32,
    padding: 16,
  },
  usePinText: {
    fontSize: 16,
  },
  pinDotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 40,
    gap: 16,
  },
  pinDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1,
  },
  keypadContainer: {
    width: '100%',
    maxWidth: 320,
  },
  keypadRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  keypadBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keypadText: {
    fontSize: 32,
  },
});
