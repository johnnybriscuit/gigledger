import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Dimensions,
} from 'react-native';

interface OnboardingTooltipProps {
  visible: boolean;
  title: string;
  message: string;
  step: number;
  totalSteps: number;
  onNext: () => void;
  onSkip: () => void;
  position?: 'top' | 'bottom' | 'center';
  highlightArea?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export function OnboardingTooltip({
  visible,
  title,
  message,
  step,
  totalSteps,
  onNext,
  onSkip,
  position = 'center',
  highlightArea,
}: OnboardingTooltipProps) {
  if (!visible) return null;

  const { height } = Dimensions.get('window');

  const getTooltipPosition = () => {
    if (position === 'top') {
      return { top: 100 };
    } else if (position === 'bottom') {
      return { bottom: 100 };
    }
    return { top: height / 2 - 150 };
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onSkip}
    >
      <View style={styles.overlay}>
        {/* Semi-transparent backdrop */}
        <View style={styles.backdrop} />

        {/* Tooltip content */}
        <View style={[styles.tooltipContainer, getTooltipPosition()]}>
          <View style={styles.tooltip}>
            {/* Progress indicator */}
            <View style={styles.progressContainer}>
              <Text style={styles.progressText}>
                Step {step} of {totalSteps}
              </Text>
              <TouchableOpacity onPress={onSkip}>
                <Text style={styles.skipText}>Skip Tutorial</Text>
              </TouchableOpacity>
            </View>

            {/* Content */}
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.message}>{message}</Text>

            {/* Action buttons */}
            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={styles.nextButton}
                onPress={onNext}
              >
                <Text style={styles.nextButtonText}>
                  {step === totalSteps ? 'Finish' : 'Next'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    position: 'relative',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  tooltipContainer: {
    position: 'absolute',
    left: 20,
    right: 20,
    zIndex: 1000,
  },
  tooltip: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  progressText: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '600',
  },
  skipText: {
    fontSize: 12,
    color: '#3b82f6',
    fontWeight: '600',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 12,
  },
  message: {
    fontSize: 16,
    color: '#4b5563',
    lineHeight: 24,
    marginBottom: 24,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  nextButton: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8,
  },
  nextButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
