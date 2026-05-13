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
  LayoutAnimation,
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
  const [debtPercentage, setDebtPercentage] = useState(10);
  const [goalName, setGoalName] = useState('');
  const [goalAmount, setGoalAmount] = useState('');
  const [goalPercentage, setGoalPercentage] = useState(10);
  const [expandedTaxes, setExpandedTaxes] = useState(true);
  const [expandedRetirement, setExpandedRetirement] = useState(false);
  const [expandedEmergency, setExpandedEmergency] = useState(false);
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

  const toggleExpanded = (section: 'taxes' | 'retirement' | 'emergency') => {
    if (Platform.OS !== 'web') {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    }
    if (section === 'taxes') setExpandedTaxes(!expandedTaxes);
    if (section === 'retirement') setExpandedRetirement(!expandedRetirement);
    if (section === 'emergency') setExpandedEmergency(!expandedEmergency);
  };

  const getTaxFeedback = (percentage: number): string => {
    if (percentage < 14) return '⚠️ Below the minimum SE tax rate. You may owe more than this.';
    if (percentage < 20) return '✓ Covers SE tax. May not cover federal income tax if you earn over $20k/year.';
    if (percentage < 25) return '✓ Good coverage for most gig workers';
    if (percentage <= 30) return '✓ Strong coverage — great choice';
    return '✓ Conservative — you may get a refund at year end';
  };

  const getRetirementFeedback = (percentage: number): string => {
    if (percentage === 0) return 'Not started — even 3% makes a difference';
    if (percentage < 5) return 'A start ✓ — try to increase over time';
    if (percentage < 10) return 'On track ✓ — solid foundation';
    if (percentage < 15) return 'Strong ✓ — you\'re building real wealth';
    return 'Excellent ✓ — future you says thank you';
  };

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
          percentage: debtPercentage,
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
          b.bucket_type === 'debt' ? { ...b, goal_name: debtName, percentage: debtPercentage } : b
        );
      }

      // Handle goal bucket
      if (goalEnabled && !updated.find(b => b.bucket_type === 'goal')) {
        updated.push({
          name: goalName || 'Savings Goal',
          emoji: '🎯',
          bucket_type: 'goal',
          percentage: goalPercentage,
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
                percentage: goalPercentage,
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
    <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.step1Content}>
      <Text style={[styles.progressIndicator, { color: colors.text.subtle }]}>Step 1 of 4  ●○○○</Text>
      
      <Text style={styles.largeEmoji}>💸</Text>
      
      <Text style={[styles.headline, { color: colors.text.DEFAULT }]}>
        That ${exampleAmount} isn't all yours.
      </Text>

      <Text style={[styles.subheadline, { color: colors.text.muted }]}>
        ...and that's actually okay. Here's why.
      </Text>

      <Text style={[styles.bodyText, { color: colors.text.DEFAULT }]}>
        When you get paid as a gig worker, you receive the full amount — but a portion of it was already promised to the IRS, your future self, and your safety net.
      </Text>

      <Text style={[styles.bodyText, { color: colors.text.DEFAULT }]}>
        The mistake most musicians and freelancers make is spending all of it, then scrambling when taxes are due.
      </Text>

      <Text style={[styles.bodyText, { color: colors.text.DEFAULT }]}>
        Bozzy is going to show you exactly how to divide every payment the moment it arrives — so you always know what's truly yours to spend.
      </Text>

      <View style={[styles.socialProofCard, { backgroundColor: colors.surface.elevated, borderColor: colors.border.DEFAULT }]}>
        <Text style={[styles.socialProofTitle, { color: colors.text.DEFAULT }]}>
          💡 What other gig workers do:
        </Text>
        <Text style={[styles.socialProofItem, { color: colors.text.muted }]}>
          • Session musicians set aside 25-30% for taxes
        </Text>
        <Text style={[styles.socialProofItem, { color: colors.text.muted }]}>
          • Freelance developers keep 3 months expenses in emergency savings
        </Text>
        <Text style={[styles.socialProofItem, { color: colors.text.muted }]}>
          • Most financial advisors recommend 10-15% toward retirement from the first dollar earned
        </Text>
      </View>

      <Text style={[styles.timeEstimate, { color: colors.text.subtle }]}>
        This takes about 2 minutes
      </Text>

      <TouchableOpacity
        style={[styles.primaryButton, { backgroundColor: colors.brand.DEFAULT }]}
        onPress={() => setStep(2)}
      >
        <Text style={[styles.buttonText, { color: colors.brand.foreground }]}>I'm ready — show me how →</Text>
      </TouchableOpacity>
    </ScrollView>
  );

  const renderStep2 = () => {
    const federalTax = buckets.find(b => b.bucket_type === 'federal_tax');
    const stateTax = buckets.find(b => b.bucket_type === 'state_tax');
    const retirement = buckets.find(b => b.bucket_type === 'retirement');
    const emergency = buckets.find(b => b.bucket_type === 'emergency_fund');

    const totalTaxPercent = (federalTax?.percentage || 0) + (stateTax?.percentage || 0);
    const taxesDisabled = totalTaxPercent < 14;

    return (
      <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.scrollContent}>
        <Text style={[styles.progressIndicator, { color: colors.text.subtle }]}>Step 2 of 4  ●●○○</Text>
        
        <Text style={[styles.header, { color: colors.text.DEFAULT }]}>
          Start with the non-negotiables
        </Text>
        <Text style={[styles.subtext, { color: colors.text.muted, marginBottom: 24 }]}>
          These three buckets protect you from the most common financial mistakes gig workers make.
        </Text>

        <View style={styles.bucketCards}>
          {federalTax && (
            <View style={[styles.bucketCard, { backgroundColor: colors.surface.elevated, borderColor: colors.border.DEFAULT }]}>
              <View style={styles.bucketHeader}>
                <Text style={styles.bucketEmoji}>{federalTax.emoji}</Text>
                <Text style={[styles.bucketName, { color: colors.text.DEFAULT }]}>Taxes</Text>
              </View>

              <TouchableOpacity onPress={() => toggleExpanded('taxes')} style={styles.expandableHeader}>
                <Text style={[styles.expandableTitle, { color: colors.text.muted }]}>
                  {expandedTaxes ? '▼' : '▶'} Why this matters
                </Text>
              </TouchableOpacity>

              {expandedTaxes && (
                <View style={styles.expandableContent}>
                  <Text style={[styles.expandableText, { color: colors.text.DEFAULT }]}>
                    Self-employment tax alone is 15.3% of your net income — that's before federal or state income tax. Unlike a W-2 job where your employer pays half, you pay all of it yourself.
                  </Text>
                  <Text style={[styles.expandableText, { color: colors.text.DEFAULT }]}>
                    The IRS expects quarterly payments in April, June, September, and January. Missing these means penalties on top of what you owe.
                  </Text>
                </View>
              )}

              <PercentageSlider
                value={totalTaxPercent}
                min={14}
                max={40}
                onChange={(val) => {
                  const statePercent = stateTax?.percentage || 0;
                  updateBucketPercentage('federal_tax', val - statePercent);
                }}
                color="#dc2626"
                label="Your tax set-aside"
              />

              <Text style={[styles.feedbackText, { color: colors.text.muted }]}>
                {getTaxFeedback(totalTaxPercent)}
              </Text>

              <View style={[styles.tipCard, { backgroundColor: colors.brand.muted }]}>
                <Text style={[styles.tipText, { color: colors.text.DEFAULT }]}>
                  💡 Nashville session musicians typically set aside 25-28%. NYC and LA artists often go 30%+ due to higher state taxes.
                </Text>
              </View>
            </View>
          )}

          {retirement && (
            <View style={[styles.bucketCard, { backgroundColor: colors.surface.elevated, borderColor: colors.border.DEFAULT }]}>
              <View style={styles.bucketHeader}>
                <Text style={styles.bucketEmoji}>{retirement.emoji}</Text>
                <Text style={[styles.bucketName, { color: colors.text.DEFAULT }]}>Retirement</Text>
              </View>

              <TouchableOpacity onPress={() => toggleExpanded('retirement')} style={styles.expandableHeader}>
                <Text style={[styles.expandableTitle, { color: colors.text.muted }]}>
                  {expandedRetirement ? '▼' : '▶'} Why this matters
                </Text>
              </TouchableOpacity>

              {expandedRetirement && (
                <View style={styles.expandableContent}>
                  <Text style={[styles.expandableText, { color: colors.text.DEFAULT }]}>
                    There's no employer 401k match when you're self-employed. No one is saving for your retirement but you.
                  </Text>
                  <Text style={[styles.expandableText, { color: colors.text.DEFAULT }]}>
                    The good news: self-employed people have access to some of the best retirement accounts available — SEP-IRA allows contributions up to $69,000/year (2026). Even $50/month started at 30 is worth $100,000+ by retirement.
                  </Text>
                </View>
              )}

              <PercentageSlider
                value={retirement.percentage}
                min={0}
                max={30}
                onChange={(val) => updateBucketPercentage('retirement', val)}
                color="#2563eb"
                label="Your retirement contribution"
              />

              <Text style={[styles.feedbackText, { color: colors.text.muted }]}>
                {getRetirementFeedback(retirement.percentage)}
              </Text>

              <View style={[styles.tipCard, { backgroundColor: colors.brand.muted }]}>
                <Text style={[styles.tipText, { color: colors.text.DEFAULT }]}>
                  💡 Most financial advisors recommend 10-15% of gross income. If that feels like too much, start with 5% and increase by 1% every 6 months.
                </Text>
              </View>
            </View>
          )}

          {emergency && (
            <View style={[styles.bucketCard, { backgroundColor: colors.surface.elevated, borderColor: colors.border.DEFAULT }]}>
              <View style={styles.bucketHeader}>
                <Text style={styles.bucketEmoji}>{emergency.emoji}</Text>
                <Text style={[styles.bucketName, { color: colors.text.DEFAULT }]}>Emergency Fund</Text>
              </View>

              <TouchableOpacity onPress={() => toggleExpanded('emergency')} style={styles.expandableHeader}>
                <Text style={[styles.expandableTitle, { color: colors.text.muted }]}>
                  {expandedEmergency ? '▼' : '▶'} Why this matters
                </Text>
              </TouchableOpacity>

              {expandedEmergency && (
                <View style={styles.expandableContent}>
                  <Text style={[styles.expandableText, { color: colors.text.DEFAULT }]}>
                    Gig income is unpredictable. A cancelled tour, an injury, or a slow season can wipe out months of progress if you have no cushion.
                  </Text>
                  <Text style={[styles.expandableText, { color: colors.text.DEFAULT }]}>
                    The goal is 3-6 months of your basic living expenses (rent, food, utilities, transport). Once you reach that goal, Bozzy will suggest redirecting this bucket to retirement or another goal.
                  </Text>
                </View>
              )}

              <PercentageSlider
                value={emergency.percentage}
                min={0}
                max={20}
                onChange={(val) => updateBucketPercentage('emergency_fund', val)}
                color="#0f766e"
                label="Emergency fund percentage"
              />

              <View style={[styles.tipCard, { backgroundColor: colors.brand.muted }]}>
                <Text style={[styles.tipText, { color: colors.text.DEFAULT }]}>
                  💡 Start with a $1,000 mini emergency fund first — it covers most unexpected costs. Then build toward the full 3-month target.
                </Text>
              </View>
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
      <Text style={[styles.progressIndicator, { color: colors.text.subtle }]}>Step 3 of 4  ●●●○</Text>
      
      <Text style={[styles.header, { color: colors.text.DEFAULT }]}>Want to supercharge your finances?</Text>
      <Text style={[styles.subtext, { color: colors.text.muted, marginBottom: 24 }]}>
        These are optional but powerful. You can always add or change them later.
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
                value={debtPercentage}
                min={0}
                max={20}
                onChange={setDebtPercentage}
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
                value={goalPercentage}
                min={0}
                max={20}
                onChange={setGoalPercentage}
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

    const getActionHint = (bucketType: string): string => {
      switch (bucketType) {
        case 'federal_tax':
        case 'state_tax':
          return '→ Move to a separate savings account';
        case 'retirement':
          return '→ Transfer to your SEP-IRA or Roth IRA';
        case 'emergency_fund':
          return '→ High-yield savings account';
        case 'debt':
          return '→ Apply to your highest-interest balance';
        case 'goal':
          return '→ Dedicated savings account';
        case 'spendable':
          return '→ This is yours to spend freely 🎉';
        default:
          return '';
      }
    };

    return (
      <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.scrollContent}>
        <Text style={[styles.progressIndicator, { color: colors.text.subtle }]}>Step 4 of 4  ●●●●</Text>
        
        <Text style={[styles.header, { color: colors.text.DEFAULT }]}>
          🎉 Here's your money plan
        </Text>
        <Text style={[styles.subtext, { color: colors.text.muted, marginBottom: 8 }]}>
          Example: When you get paid ${exampleAmount.toFixed(2)}
        </Text>
        <Text style={[styles.subtext, { color: colors.text.muted, marginBottom: 16 }]}>
          Here's exactly where it goes:
        </Text>

        <View style={styles.allocationList}>
          {allocations.map((allocation, index) => {
            const isSpendable = allocation.bucket.bucket_type === 'spendable';
            return (
              <View key={index}>
                <View
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
                <Text style={[styles.actionHint, { color: colors.text.subtle }]}>
                  {getActionHint(allocation.bucket.bucket_type)}
                </Text>
              </View>
            );
          })}
        </View>

        <View style={[styles.proTipsBox, { backgroundColor: colors.surface.elevated, borderColor: colors.border.DEFAULT }]}>
          <Text style={[styles.proTipsTitle, { color: colors.text.DEFAULT }]}>
            💡 Tips from experienced gig workers
          </Text>
          <View style={styles.quoteBox}>
            <Text style={[styles.quoteText, { color: colors.text.DEFAULT }]}>
              "Open a separate bank account just for taxes. Name it 'Not My Money.' Transfer the tax amount every time you get paid and never touch it."
            </Text>
            <Text style={[styles.quoteAttribution, { color: colors.text.muted }]}>
              — Common advice from freelancers
            </Text>
          </View>
          <View style={styles.quoteBox}>
            <Text style={[styles.quoteText, { color: colors.text.DEFAULT }]}>
              "I set a phone reminder the day after every gig to transfer my tax money. It's automatic now."
            </Text>
            <Text style={[styles.quoteAttribution, { color: colors.text.muted }]}>
              — Session musician
            </Text>
          </View>
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
              <Text style={[styles.buttonText, { color: colors.brand.foreground }]}>Let's do this 🚀</Text>
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
  step1Content: {
    padding: 24,
    paddingBottom: 40,
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 100,
  },
  progressIndicator: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
    fontWeight: '500',
  },
  largeEmoji: {
    fontSize: 72,
    textAlign: 'center',
    marginBottom: 24,
  },
  headline: {
    fontSize: 32,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 40,
  },
  subheadline: {
    fontSize: 20,
    fontWeight: '500',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 28,
  },
  bodyText: {
    fontSize: 15,
    lineHeight: 24,
    marginBottom: 16,
  },
  socialProofCard: {
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 8,
    marginBottom: 24,
  },
  socialProofTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  socialProofItem: {
    fontSize: 15,
    lineHeight: 24,
    marginBottom: 8,
  },
  timeEstimate: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
  },
  header: {
    fontSize: 28,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 12,
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
  expandableHeader: {
    marginBottom: 12,
  },
  expandableTitle: {
    fontSize: 14,
    fontWeight: '500',
  },
  expandableContent: {
    marginBottom: 16,
  },
  expandableText: {
    fontSize: 15,
    lineHeight: 24,
    marginBottom: 12,
  },
  feedbackText: {
    fontSize: 14,
    marginTop: 8,
    marginBottom: 12,
    fontWeight: '500',
  },
  tipCard: {
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  tipText: {
    fontSize: 14,
    lineHeight: 20,
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
  actionHint: {
    fontSize: 13,
    marginLeft: 44,
    marginTop: -8,
    marginBottom: 12,
  },
  proTipsBox: {
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 20,
  },
  proTipsTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 16,
  },
  quoteBox: {
    marginBottom: 16,
  },
  quoteText: {
    fontSize: 15,
    lineHeight: 24,
    fontStyle: 'italic',
    marginBottom: 8,
  },
  quoteAttribution: {
    fontSize: 14,
    textAlign: 'right',
  },
  tipBox: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 24,
  },
  errorText: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 16,
  },
});
