import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { getThemePalette } from '../styles/theme';
import { useAllocationBuckets } from '../hooks/useAllocationBuckets';
import { useGigs } from '../hooks/useGigs';
import { useUser } from '../contexts/UserContext';
import { getDefaultBuckets, calculateAllocations } from '../utils/allocationEngine';
import { PercentageSlider } from '../components/ui/PercentageSlider';
import { AllocationSummaryBar } from '../components/ui/AllocationSummaryBar';
import type { AllocationBucket } from '../types/allocation';

type Step = 1 | 2 | 3 | 4;

interface BucketConfig {
  name: string;
  emoji: string;
  bucket_type: AllocationBucket['bucket_type'];
  percentage: number;
  color: string;
  goal_amount?: number | null;
  goal_name?: string | null;
  sort_order: number;
  is_active: boolean;
}

interface BucketSetupScreenProps {
  onComplete: () => void;
}

export function BucketSetupScreen({ onComplete }: BucketSetupScreenProps) {
  const { theme } = useTheme();
  const colors = getThemePalette(theme);
  const { taxProfile } = useUser();
  const { data: gigs } = useGigs();
  const { createBucket, isCreating } = useAllocationBuckets();

  const [step, setStep] = useState<Step>(1);
  const [buckets, setBuckets] = useState<BucketConfig[]>([]);
  const [debtEnabled, setDebtEnabled] = useState(false);
  const [goalEnabled, setGoalEnabled] = useState(false);
  const [debtName, setDebtName] = useState('');
  const [goalName, setGoalName] = useState('');
  const [goalAmount, setGoalAmount] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Initialize default buckets
  useEffect(() => {
    const state = taxProfile?.state || 'CA';
    const estimatedIncome = 50000; // Default
    const defaults = getDefaultBuckets(state, estimatedIncome);
    
    const initialBuckets: BucketConfig[] = defaults.map((b) => ({
      name: b.name,
      emoji: b.emoji,
      bucket_type: b.bucket_type,
      percentage: b.percentage,
      color: b.color,
      goal_amount: b.goal_amount,
      goal_name: b.goal_name,
      sort_order: b.sort_order,
      is_active: b.is_active,
    }));

    setBuckets(initialBuckets);
  }, [taxProfile]);

  // Get most recent paid gig for examples
  const recentGig = gigs?.find(g => g.paid === true);
  const exampleAmount = recentGig?.gross_amount || 500;

  const updateBucketPercentage = (bucketType: string, newPercentage: number) => {
    setBuckets(prev => {
      const updated = prev.map(b =>
        b.bucket_type === bucketType ? { ...b, percentage: newPercentage } : b
      );

      // Recalculate spendable
      const nonSpendable = updated.filter(b => b.bucket_type !== 'spendable');
      const totalNonSpendable = nonSpendable.reduce((sum, b) => sum + b.percentage, 0);
      const spendablePercent = Math.max(0, 100 - totalNonSpendable);

      return updated.map(b =>
        b.bucket_type === 'spendable' ? { ...b, percentage: spendablePercent } : b
      );
    });
  };

  const handleSave = async () => {
    try {
      setError(null);

      // Filter active buckets
      const activeBuckets = buckets.filter(b => b.is_active);

      // Create each bucket
      for (const bucket of activeBuckets) {
        await createBucket({
          name: bucket.name,
          emoji: bucket.emoji,
          bucket_type: bucket.bucket_type,
          percentage: bucket.percentage,
          color: bucket.color,
          goal_amount: bucket.goal_amount,
          goal_name: bucket.goal_name,
          sort_order: bucket.sort_order,
        });
      }

      // Set flag in localStorage
      if (Platform.OS === 'web') {
        localStorage.setItem('bozzy_buckets_configured', 'true');
      }

      onComplete();
    } catch (err) {
      setError('Something went wrong — tap to retry');
      console.error('Failed to create buckets:', err);
    }
  };

  const handleStep3Continue = () => {
    // Update buckets based on toggles
    setBuckets(prev => {
      let updated = [...prev];

      // Handle debt bucket
      if (debtEnabled && !updated.find(b => b.bucket_type === 'debt')) {
        updated.push({
          name: 'Debt Payoff',
          emoji: '💳',
          bucket_type: 'debt',
          percentage: 10,
          color: '#7c3aed',
          goal_name: debtName || null,
          goal_amount: null,
          sort_order: 5,
          is_active: true,
        });
      } else if (!debtEnabled) {
        updated = updated.filter(b => b.bucket_type !== 'debt');
      } else if (debtName) {
        updated = updated.map(b =>
          b.bucket_type === 'debt' ? { ...b, goal_name: debtName } : b
        );
      }

      // Handle goal bucket
      if (goalEnabled && !updated.find(b => b.bucket_type === 'goal')) {
        updated.push({
          name: goalName || 'Savings Goal',
          emoji: '🎯',
          bucket_type: 'goal',
          percentage: 10,
          color: '#f59e0b',
          goal_name: goalName || null,
          goal_amount: goalAmount ? parseFloat(goalAmount) : null,
          sort_order: 6,
          is_active: true,
        });
      } else if (!goalEnabled) {
        updated = updated.filter(b => b.bucket_type !== 'goal');
      } else {
        updated = updated.map(b =>
          b.bucket_type === 'goal'
            ? {
                ...b,
                name: goalName || b.name,
                goal_name: goalName || null,
                goal_amount: goalAmount ? parseFloat(goalAmount) : null,
              }
            : b
        );
      }

      // Recalculate spendable
      const nonSpendable = updated.filter(b => b.bucket_type !== 'spendable');
      const totalNonSpendable = nonSpendable.reduce((sum, b) => sum + b.percentage, 0);
      const spendablePercent = Math.max(0, 100 - totalNonSpendable);

      return updated.map(b =>
        b.bucket_type === 'spendable' ? { ...b, percentage: spendablePercent } : b
      );
    });

    setStep(4);
  };

  const renderStep1 = () => (
    <View style={styles.stepContainer}>
      <Text style={[styles.header, { color: colors.text.DEFAULT }]}>
        {recentGig ? `💰 Your ${recentGig.title} paid $${exampleAmount}` : '💰 Let\'s set up your money plan'}
      </Text>

      <Text style={[styles.bigQuestion, { color: colors.text.DEFAULT }]}>
        Of every dollar you earn — how much is actually yours?
      </Text>

      <Text style={[styles.subtext, { color: colors.text.muted }]}>
        Most gig workers spend money that was already spoken for. Let's make sure that never happens to you.
      </Text>

      <TouchableOpacity
        style={[styles.primaryButton, { backgroundColor: colors.brand.DEFAULT }]}
        onPress={() => setStep(2)}
      >
        <Text style={[styles.buttonText, { color: colors.brand.foreground }]}>Show me →</Text>
      </TouchableOpacity>
    </View>
  );

  const renderStep2 = () => {
    const federalTax = buckets.find(b => b.bucket_type === 'federal_tax');
    const stateTax = buckets.find(b => b.bucket_type === 'state_tax');
    const retirement = buckets.find(b => b.bucket_type === 'retirement');
    const emergency = buckets.find(b => b.bucket_type === 'emergency_fund');

    const taxesDisabled = (federalTax?.percentage || 0) < 14;

    return (
      <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.scrollContent}>
        <Text style={[styles.header, { color: colors.text.DEFAULT }]}>
          The three things that protect you
        </Text>

        <View style={styles.bucketCards}>
          {federalTax && (
            <View style={[styles.bucketCard, { backgroundColor: colors.surface.elevated, borderColor: colors.border.DEFAULT }]}>
              <View style={styles.bucketHeader}>
                <Text style={styles.bucketEmoji}>{federalTax.emoji}</Text>
                <Text style={[styles.bucketName, { color: colors.text.DEFAULT }]}>Taxes</Text>
              </View>
              <PercentageSlider
                value={federalTax.percentage + (stateTax?.percentage || 0)}
                min={14}
                max={40}
                onChange={(val) => {
                  const statePercent = stateTax?.percentage || 0;
                  updateBucketPercentage('federal_tax', val - statePercent);
                }}
                color="#dc2626"
                label="Tax percentage"
              />
              <Text style={[styles.helperText, { color: colors.text.subtle }]}>
                Covers self-employment tax + federal income tax
              </Text>
            </View>
          )}

          {retirement && (
            <View style={[styles.bucketCard, { backgroundColor: colors.surface.elevated, borderColor: colors.border.DEFAULT }]}>
              <View style={styles.bucketHeader}>
                <Text style={styles.bucketEmoji}>{retirement.emoji}</Text>
                <Text style={[styles.bucketName, { color: colors.text.DEFAULT }]}>Retirement</Text>
              </View>
              <PercentageSlider
                value={retirement.percentage}
                min={0}
                max={30}
                onChange={(val) => updateBucketPercentage('retirement', val)}
                color="#2563eb"
                label="Retirement percentage"
              />
              <Text style={[styles.helperText, { color: colors.text.subtle }]}>
                SEP-IRA or Roth IRA — pay yourself first
              </Text>
            </View>
          )}

          {emergency && (
            <View style={[styles.bucketCard, { backgroundColor: colors.surface.elevated, borderColor: colors.border.DEFAULT }]}>
              <View style={styles.bucketHeader}>
                <Text style={styles.bucketEmoji}>{emergency.emoji}</Text>
                <Text style={[styles.bucketName, { color: colors.text.DEFAULT }]}>Emergency Fund</Text>
              </View>
              <PercentageSlider
                value={emergency.percentage}
                min={0}
                max={20}
                onChange={(val) => updateBucketPercentage('emergency_fund', val)}
                color="#0f766e"
                label="Emergency fund percentage"
              />
              <Text style={[styles.helperText, { color: colors.text.subtle }]}>
                Goal: 3-6 months of expenses
              </Text>
            </View>
          )}
        </View>

        <TouchableOpacity
          style={[
            styles.primaryButton,
            { backgroundColor: taxesDisabled ? colors.border.muted : colors.brand.DEFAULT },
            styles.bottomButton,
          ]}
          onPress={() => setStep(3)}
          disabled={taxesDisabled}
        >
          <Text style={[styles.buttonText, { color: taxesDisabled ? colors.text.subtle : colors.brand.foreground }]}>
            These look good →
          </Text>
        </TouchableOpacity>

        <AllocationSummaryBar buckets={buckets} />
      </ScrollView>
    );
  };

  const renderStep3 = () => (
    <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.scrollContent}>
      <Text style={[styles.header, { color: colors.text.DEFAULT }]}>Want to go further?</Text>
      <Text style={[styles.subtext, { color: colors.text.muted, marginBottom: 24 }]}>
        These are optional. You can always add them later.
      </Text>

      <View style={styles.optionalCards}>
        <View style={[styles.optionalCard, { backgroundColor: colors.surface.elevated, borderColor: colors.border.DEFAULT }]}>
          <View style={styles.optionalHeader}>
            <View style={styles.optionalTitleRow}>
              <Text style={styles.bucketEmoji}>💳</Text>
              <Text style={[styles.bucketName, { color: colors.text.DEFAULT }]}>Debt Payoff</Text>
            </View>
            <TouchableOpacity
              style={[styles.toggle, debtEnabled && { backgroundColor: '#7c3aed' }]}
              onPress={() => setDebtEnabled(!debtEnabled)}
            >
              <View style={[styles.toggleThumb, debtEnabled && styles.toggleThumbActive]} />
            </TouchableOpacity>
          </View>

          {debtEnabled && (
            <View style={styles.optionalContent}>
              <PercentageSlider
                value={buckets.find(b => b.bucket_type === 'debt')?.percentage || 10}
                min={0}
                max={20}
                onChange={(val) => updateBucketPercentage('debt', val)}
                color="#7c3aed"
                label="Debt percentage"
              />
              <TextInput
                style={[styles.input, { backgroundColor: colors.surface.DEFAULT, borderColor: colors.border.DEFAULT, color: colors.text.DEFAULT }]}
                placeholder="What debt? (e.g. Credit card)"
                placeholderTextColor={colors.text.subtle}
                value={debtName}
                onChangeText={setDebtName}
              />
            </View>
          )}
        </View>

        <View style={[styles.optionalCard, { backgroundColor: colors.surface.elevated, borderColor: colors.border.DEFAULT }]}>
          <View style={styles.optionalHeader}>
            <View style={styles.optionalTitleRow}>
              <Text style={styles.bucketEmoji}>🎯</Text>
              <Text style={[styles.bucketName, { color: colors.text.DEFAULT }]}>Savings Goal</Text>
            </View>
            <TouchableOpacity
              style={[styles.toggle, goalEnabled && { backgroundColor: '#f59e0b' }]}
              onPress={() => setGoalEnabled(!goalEnabled)}
            >
              <View style={[styles.toggleThumb, goalEnabled && styles.toggleThumbActive]} />
            </TouchableOpacity>
          </View>

          {goalEnabled && (
            <View style={styles.optionalContent}>
              <PercentageSlider
                value={buckets.find(b => b.bucket_type === 'goal')?.percentage || 10}
                min={0}
                max={20}
                onChange={(val) => updateBucketPercentage('goal', val)}
                color="#f59e0b"
                label="Goal percentage"
              />
              <TextInput
                style={[styles.input, { backgroundColor: colors.surface.DEFAULT, borderColor: colors.border.DEFAULT, color: colors.text.DEFAULT }]}
                placeholder="Goal name (e.g. House down payment)"
                placeholderTextColor={colors.text.subtle}
                value={goalName}
                onChangeText={setGoalName}
              />
              <TextInput
                style={[styles.input, { backgroundColor: colors.surface.DEFAULT, borderColor: colors.border.DEFAULT, color: colors.text.DEFAULT }]}
                placeholder="Target amount (optional)"
                placeholderTextColor={colors.text.subtle}
                value={goalAmount}
                onChangeText={setGoalAmount}
                keyboardType="numeric"
              />
            </View>
          )}
        </View>
      </View>

      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={[styles.secondaryButton, { borderColor: colors.border.DEFAULT }]}
          onPress={handleStep3Continue}
        >
          <Text style={[styles.buttonText, { color: colors.text.DEFAULT }]}>Skip for now →</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.primaryButton, { backgroundColor: colors.brand.DEFAULT }]}
          onPress={handleStep3Continue}
        >
          <Text style={[styles.buttonText, { color: colors.brand.foreground }]}>Looks good →</Text>
        </TouchableOpacity>
      </View>

      <AllocationSummaryBar buckets={buckets} />
    </ScrollView>
  );

  const renderStep4 = () => {
    const activeBuckets = buckets.filter(b => b.is_active);
    const allocations = calculateAllocations(exampleAmount, activeBuckets as unknown as AllocationBucket[]);
    const nonSpendable = allocations.filter(a => a.bucket.bucket_type !== 'spendable');
    const totalToSetAside = nonSpendable.reduce((sum, a) => sum + a.allocatedAmount, 0);

    return (
      <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.scrollContent}>
        <Text style={[styles.header, { color: colors.text.DEFAULT }]}>
          Here's what happens when you get paid ${exampleAmount}
        </Text>
        {!recentGig && (
          <Text style={[styles.subtext, { color: colors.text.muted, marginBottom: 16 }]}>
            Example: $500 gig
          </Text>
        )}

        <View style={styles.allocationList}>
          {allocations.map((allocation, index) => {
            const isSpendable = allocation.bucket.bucket_type === 'spendable';
            return (
              <View
                key={index}
                style={[
                  styles.allocationRow,
                  isSpendable && styles.allocationRowHighlight,
                  { borderBottomColor: colors.border.muted },
                ]}
              >
                <View style={styles.allocationLeft}>
                  <Text style={styles.allocationEmoji}>{allocation.bucket.emoji}</Text>
                  <Text style={[styles.allocationName, isSpendable && styles.allocationNameBold, { color: colors.text.DEFAULT }]}>
                    {allocation.bucket.name}
                  </Text>
                </View>
                <View style={styles.allocationRight}>
                  <Text style={[styles.allocationPercent, { color: colors.text.muted }]}>
                    {allocation.percentage.toFixed(0)}%
                  </Text>
                  <Text style={[styles.allocationAmount, isSpendable && styles.allocationAmountBold, { color: isSpendable ? colors.success.DEFAULT : colors.text.DEFAULT }]}>
                    ${allocation.allocatedAmount.toFixed(2)}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>

        <View style={[styles.tipBox, { backgroundColor: colors.brand.muted, borderColor: colors.brand.DEFAULT }]}>
          <Text style={[styles.tipText, { color: colors.text.DEFAULT }]}>
            💡 When you get paid, move ${totalToSetAside.toFixed(2)} to a separate savings account.
          </Text>
        </View>

        {error && (
          <Text style={[styles.errorText, { color: colors.danger.DEFAULT }]}>{error}</Text>
        )}

        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={[styles.secondaryButton, { borderColor: colors.border.DEFAULT }]}
            onPress={() => setStep(3)}
          >
            <Text style={[styles.buttonText, { color: colors.text.DEFAULT }]}>← Go back</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.primaryButton, { backgroundColor: colors.brand.DEFAULT }]}
            onPress={handleSave}
            disabled={isCreating}
          >
            {isCreating ? (
              <ActivityIndicator color={colors.brand.foreground} />
            ) : (
              <Text style={[styles.buttonText, { color: colors.brand.foreground }]}>Set up my buckets →</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.surface.canvas }]}>
      {step === 1 && renderStep1()}
      {step === 2 && renderStep2()}
      {step === 3 && renderStep3()}
      {step === 4 && renderStep4()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  stepContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 100,
  },
  header: {
    fontSize: 28,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 24,
  },
  bigQuestion: {
    fontSize: 24,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 16,
    marginTop: 32,
  },
  subtext: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  primaryButton: {
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 200,
  },
  secondaryButton: {
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    flex: 1,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  bucketCards: {
    gap: 16,
    marginBottom: 24,
  },
  bucketCard: {
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
  },
  bucketHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  bucketEmoji: {
    fontSize: 24,
    marginRight: 12,
  },
  bucketName: {
    fontSize: 18,
    fontWeight: '600',
  },
  helperText: {
    fontSize: 14,
    marginTop: 8,
  },
  bottomButton: {
    marginTop: 24,
    marginBottom: 16,
  },
  optionalCards: {
    gap: 16,
    marginBottom: 24,
  },
  optionalCard: {
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
  },
  optionalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  optionalTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  toggle: {
    width: 50,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#d0d5dd',
    padding: 2,
    justifyContent: 'center',
  },
  toggleThumb: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#ffffff',
  },
  toggleThumbActive: {
    alignSelf: 'flex-end',
  },
  optionalContent: {
    gap: 12,
  },
  input: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    fontSize: 16,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  allocationList: {
    marginBottom: 24,
  },
  allocationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  allocationRowHighlight: {
    paddingVertical: 20,
  },
  allocationLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  allocationEmoji: {
    fontSize: 20,
    marginRight: 12,
  },
  allocationName: {
    fontSize: 16,
  },
  allocationNameBold: {
    fontSize: 18,
    fontWeight: '700',
  },
  allocationRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  allocationPercent: {
    fontSize: 14,
    minWidth: 40,
    textAlign: 'right',
  },
  allocationAmount: {
    fontSize: 16,
    fontWeight: '600',
    minWidth: 80,
    textAlign: 'right',
  },
  allocationAmountBold: {
    fontSize: 20,
    fontWeight: '700',
  },
  tipBox: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 24,
  },
  tipText: {
    fontSize: 14,
    lineHeight: 20,
  },
  errorText: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 16,
  },
});
