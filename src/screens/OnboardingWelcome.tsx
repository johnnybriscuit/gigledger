import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { supabase } from '../lib/supabase';

interface OnboardingWelcomeProps {
  onNext: () => void;
  onSkip: () => void;
}

export function OnboardingWelcome({ onNext }: OnboardingWelcomeProps) {
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleContinue = async () => {
    setLoading(true);
    try {
      if (fullName.trim()) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase
            .from('profiles')
            .update({ full_name: fullName.trim() })
            .eq('id', user.id);
        }
      }
      onNext();
    } catch (error: any) {
      console.error('[OnboardingWelcome] Error saving name:', error);
      onNext();
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.step}>Step 1 of 6</Text>
          <Text style={styles.title}>Welcome to Bozzy �</Text>
          <Text style={styles.subtitle}>Financial clarity for musicians and freelancers</Text>
          <Text style={styles.body}>
            Bozzy makes sure you never accidentally spend money you owe in taxes. Let's get you set up — takes about 3 minutes.
          </Text>
        </View>

        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Your Name</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., John Smith"
              value={fullName}
              onChangeText={setFullName}
              editable={!loading}
              returnKeyType="done"
              onSubmitEditing={handleContinue}
            />
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.continueButton, loading && styles.buttonDisabled]}
          onPress={handleContinue}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.continueButtonText}>Let's go →</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
  header: {
    paddingTop: 64,
    paddingBottom: 40,
  },
  step: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3b82f6',
    marginBottom: 12,
  },
  title: {
    fontSize: 36,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 18,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 16,
  },
  body: {
    fontSize: 16,
    color: '#6b7280',
    lineHeight: 26,
  },
  form: {
    gap: 24,
    marginTop: 8,
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    padding: 16,
    fontSize: 16,
    color: '#111827',
  },
  footer: {
    padding: 24,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    backgroundColor: '#fff',
  },
  continueButton: {
    paddingVertical: 18,
    borderRadius: 10,
    backgroundColor: '#3b82f6',
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  continueButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
});
