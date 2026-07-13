import { useRef } from 'react';
import type { RefObject } from 'react';
import { ScrollView, TextInput, View } from 'react-native';

/**
 * Shared keyboard-avoidance mechanism for long forms in a Modal + ScrollView.
 * Scrolls the focused field to just below the header so it's never hidden
 * behind the keyboard, regardless of how far down the form it sits.
 *
 * Measures each field relative to a wrapper View around the ScrollView's
 * content (not the ScrollView itself, whose ref is a composite component
 * rather than a host instance and isn't a reliable measureLayout target) so
 * the returned y is an absolute content offset usable directly as a scrollTo
 * target.
 *
 * Attach `scrollViewRef` to the form's <ScrollView> and `scrollContentRef` to
 * a <View> wrapping its children, then call `scrollFieldIntoView(fieldRef)`
 * from each field's onFocus.
 */
export function useScrollFieldIntoView() {
  const scrollViewRef = useRef<ScrollView>(null);
  const scrollContentRef = useRef<View>(null);

  const scrollFieldIntoView = (ref: RefObject<TextInput | View | null>) => {
    if (!ref.current || !scrollContentRef.current) return;
    setTimeout(() => {
      ref.current?.measureLayout(
        scrollContentRef.current as any,
        (_x: number, y: number) => {
          scrollViewRef.current?.scrollTo({ y: Math.max(0, y - 100), animated: true });
        },
        () => {}
      );
    }, 50);
  };

  return { scrollViewRef, scrollContentRef, scrollFieldIntoView };
}
