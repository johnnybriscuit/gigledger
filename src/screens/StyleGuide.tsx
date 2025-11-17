/**
 * Style Guide
 * 
 * Living documentation of all UI primitives and design tokens.
 * Serves as a visual reference and testing ground for components.
 */

import React, { useState } from 'react';
import { ScrollView, View, StyleSheet } from 'react-native';
import { colors, spacing } from '../styles/theme';
import {
  Container,
  H1,
  H2,
  H3,
  Text,
  Caption,
  Display,
  Button,
  Card,
  CardHeader,
  CardContent,
  CardFooter,
  Badge,
  Stat,
  SectionHeader,
  Field,
  EmptyState,
  Modal,
} from '../ui';
import { formatCurrency, formatPercentage } from '../utils/format';

export function StyleGuide() {
  const [modalVisible, setModalVisible] = useState(false);

  return (
    <ScrollView style={styles.container}>
      <Container>
        <View style={styles.hero}>
          <Display>GigLedger Style Guide</Display>
          <Text muted>
            Living documentation of design tokens and UI primitives
          </Text>
        </View>

        {/* Typography */}
        <View style={styles.section}>
          <SectionHeader title="Typography" />
          <Card>
            <CardContent>
              <View style={styles.stack}>
                <Display>Display Text</Display>
                <H1>Heading 1</H1>
                <H2>Heading 2</H2>
                <H3>Heading 3</H3>
                <Text>Body text with normal weight</Text>
                <Text semibold>Body text with semibold weight</Text>
                <Text bold>Body text with bold weight</Text>
                <Text muted>Muted body text</Text>
                <Text subtle>Subtle body text</Text>
                <Caption>Caption text for small labels</Caption>
                <Caption muted>Muted caption text</Caption>
              </View>
            </CardContent>
          </Card>
        </View>

        {/* Buttons */}
        <View style={styles.section}>
          <SectionHeader title="Buttons" />
          <Card>
            <CardContent>
              <View style={styles.stack}>
                <Text semibold>Variants</Text>
                <View style={styles.row}>
                  <Button variant="primary">Primary</Button>
                  <Button variant="secondary">Secondary</Button>
                  <Button variant="ghost">Ghost</Button>
                </View>
                <View style={styles.row}>
                  <Button variant="success">Success</Button>
                  <Button variant="destructive">Destructive</Button>
                </View>

                <Text semibold style={styles.spacer}>Sizes</Text>
                <View style={styles.row}>
                  <Button size="sm">Small</Button>
                  <Button size="md">Medium</Button>
                  <Button size="lg">Large</Button>
                </View>

                <Text semibold style={styles.spacer}>States</Text>
                <View style={styles.row}>
                  <Button disabled>Disabled</Button>
                  <Button loading>Loading</Button>
                </View>

                <Text semibold style={styles.spacer}>Full Width</Text>
                <Button fullWidth>Full Width Button</Button>
              </View>
            </CardContent>
          </Card>
        </View>

        {/* Cards */}
        <View style={styles.section}>
          <SectionHeader title="Cards" />
          <View style={styles.stack}>
            <Card variant="elevated">
              <CardHeader>
                <H3>Elevated Card</H3>
              </CardHeader>
              <CardContent>
                <Text>
                  This card has a subtle shadow and border for depth.
                </Text>
              </CardContent>
              <CardFooter>
                <Button variant="secondary" size="sm">Action</Button>
              </CardFooter>
            </Card>

            <Card variant="flat">
              <CardHeader>
                <H3>Flat Card</H3>
              </CardHeader>
              <CardContent>
                <Text>
                  This card has a simple border with no shadow.
                </Text>
              </CardContent>
            </Card>

            <Card variant="muted">
              <CardHeader>
                <H3>Muted Card</H3>
              </CardHeader>
              <CardContent>
                <Text>
                  This card has a muted background color.
                </Text>
              </CardContent>
            </Card>
          </View>
        </View>

        {/* Badges */}
        <View style={styles.section}>
          <SectionHeader title="Badges" />
          <Card>
            <CardContent>
              <View style={styles.stack}>
                <View style={styles.row}>
                  <Badge variant="neutral">Neutral</Badge>
                  <Badge variant="success">Success</Badge>
                  <Badge variant="warning">Warning</Badge>
                  <Badge variant="danger">Danger</Badge>
                </View>
                <View style={styles.row}>
                  <Badge size="sm">Small</Badge>
                  <Badge size="md">Medium</Badge>
                </View>
              </View>
            </CardContent>
          </Card>
        </View>

        {/* Stats */}
        <View style={styles.section}>
          <SectionHeader title="Stats" />
          <Card>
            <CardContent>
              <View style={styles.grid}>
                <Stat
                  label="Net Profit YTD"
                  value={formatCurrency(12345)}
                  delta={{ value: '+12.5%', variant: 'success' }}
                />
                <Stat
                  label="Effective Tax Rate"
                  value={formatPercentage(0.141)}
                />
                <Stat
                  label="Total Gigs"
                  value="24"
                  delta={{ value: '+3', variant: 'success' }}
                />
              </View>
            </CardContent>
          </Card>
        </View>

        {/* Section Header */}
        <View style={styles.section}>
          <SectionHeader title="Section Headers" />
          <Card>
            <CardContent>
              <View style={styles.stack}>
                <SectionHeader title="Basic Header" />
                <SectionHeader
                  title="Header with Actions"
                  actions={
                    <Button variant="secondary" size="sm">
                      Action
                    </Button>
                  }
                />
              </View>
            </CardContent>
          </Card>
        </View>

        {/* Form Field */}
        <View style={styles.section}>
          <SectionHeader title="Form Fields" />
          <Card>
            <CardContent>
              <View style={styles.stack}>
                <Field label="Basic Field">
                  <View style={styles.input}>
                    <Text>Input placeholder</Text>
                  </View>
                </Field>

                <Field
                  label="Field with Help"
                  help="This is helpful information about the field"
                >
                  <View style={styles.input}>
                    <Text>Input placeholder</Text>
                  </View>
                </Field>

                <Field
                  label="Required Field"
                  required
                >
                  <View style={styles.input}>
                    <Text>Input placeholder</Text>
                  </View>
                </Field>

                <Field
                  label="Field with Error"
                  error="This field is required"
                >
                  <View style={styles.input}>
                    <Text>Input placeholder</Text>
                  </View>
                </Field>
              </View>
            </CardContent>
          </Card>
        </View>

        {/* Empty State */}
        <View style={styles.section}>
          <SectionHeader title="Empty State" />
          <Card>
            <EmptyState
              title="No gigs yet"
              description="Add your first gig to start tracking your income"
              action={{
                label: 'Add Gig',
                onPress: () => console.log('Add gig'),
              }}
            />
          </Card>
        </View>

        {/* Modal */}
        <View style={styles.section}>
          <SectionHeader title="Modal" />
          <Card>
            <CardContent>
              <Button onPress={() => setModalVisible(true)}>
                Open Modal
              </Button>
            </CardContent>
          </Card>
        </View>

        {/* Colors */}
        <View style={styles.section}>
          <SectionHeader title="Colors" />
          <Card>
            <CardContent>
              <View style={styles.stack}>
                <Text semibold>Brand</Text>
                <View style={styles.colorGrid}>
                  <ColorSwatch color={colors.brand.DEFAULT} label="Brand" />
                  <ColorSwatch color={colors.brand.hover} label="Hover" />
                  <ColorSwatch color={colors.brand.muted} label="Muted" />
                </View>

                <Text semibold style={styles.spacer}>Semantic</Text>
                <View style={styles.colorGrid}>
                  <ColorSwatch color={colors.success.DEFAULT} label="Success" />
                  <ColorSwatch color={colors.warning.DEFAULT} label="Warning" />
                  <ColorSwatch color={colors.danger.DEFAULT} label="Danger" />
                </View>

                <Text semibold style={styles.spacer}>Text</Text>
                <View style={styles.colorGrid}>
                  <ColorSwatch color={colors.text.DEFAULT} label="Default" />
                  <ColorSwatch color={colors.text.muted} label="Muted" />
                  <ColorSwatch color={colors.text.subtle} label="Subtle" />
                </View>
              </View>
            </CardContent>
          </Card>
        </View>

        <View style={styles.bottomSpacer} />
      </Container>

      {/* Modal Example */}
      <Modal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        title="Example Modal"
        description="This is a modal with title, description, content, and actions"
        actions={
          <>
            <Button variant="secondary" onPress={() => setModalVisible(false)}>
              Cancel
            </Button>
            <Button onPress={() => setModalVisible(false)}>
              Confirm
            </Button>
          </>
        }
      >
        <View style={styles.stack}>
          <Text>
            This is the modal content area. You can put any content here,
            including forms, lists, or other components.
          </Text>
          <Text muted>
            The modal is scrollable if the content is too long.
          </Text>
        </View>
      </Modal>
    </ScrollView>
  );
}

function ColorSwatch({ color, label }: { color: string; label: string }) {
  return (
    <View style={styles.colorSwatch}>
      <View style={[styles.colorBox, { backgroundColor: color }]} />
      <Caption>{label}</Caption>
      <Caption muted>{color}</Caption>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface.muted,
  },

  hero: {
    paddingVertical: parseInt(spacing[12]),
    gap: parseInt(spacing[3]),
    alignItems: 'center',
  },

  section: {
    marginBottom: parseInt(spacing[8]),
  },

  stack: {
    gap: parseInt(spacing[4]),
  },

  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: parseInt(spacing[3]),
  },

  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: parseInt(spacing[6]),
  },

  spacer: {
    marginTop: parseInt(spacing[4]),
  },

  input: {
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
    borderRadius: 8,
    padding: parseInt(spacing[3]),
    backgroundColor: colors.surface.DEFAULT,
  },

  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: parseInt(spacing[4]),
  },

  colorSwatch: {
    alignItems: 'center',
    gap: parseInt(spacing[1]),
  },

  colorBox: {
    width: 64,
    height: 64,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
  },

  bottomSpacer: {
    height: parseInt(spacing[12]),
  },
});
