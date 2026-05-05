import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Card, Title, Paragraph, Text, Chip, IconButton } from 'react-native-paper';
import { BRAND_COLORS, BORDER_RADIUS, SHADOWS, SPACING, TYPOGRAPHY } from '../constants/Colors';

const MachineCard = ({ 
  machine, 
  onPress, 
  onMenuPress,
  onLongPress,
  compact = false
}) => {
  return (
    <Card style={styles.card}>
      <TouchableOpacity onPress={() => onPress(machine)} onLongPress={onLongPress ? () => onLongPress(machine) : undefined} delayLongPress={500} activeOpacity={0.85}>
        <Card.Content style={styles.cardContent}>
          <View style={styles.cardHeader}>
            <Title 
              style={[styles.machineTitle, compact && styles.compactTitle]} 
              numberOfLines={compact ? 1 : 2}
            >
              {machine.clientName || machine.name}
            </Title>
            
            {onMenuPress && (
              <IconButton
                icon="dots-vertical"
                onPress={(e) => onMenuPress(machine, e)}
                size={compact ? 16 : 20}
                style={styles.menuButton}
              />
            )}
          </View>
          
          <Paragraph style={styles.paragraph} numberOfLines={compact ? 1 : undefined}>
            Tipo de máquina: {machine.name || machine.machineType || 'Sin tipo'}
          </Paragraph>
          <Paragraph style={styles.paragraph} numberOfLines={compact ? 1 : undefined}>
            Matrícula: {machine.licensePlate || 'Sin matrícula'}
          </Paragraph>
          <Paragraph style={styles.paragraph} numberOfLines={compact ? 1 : undefined}>
            Ubicación: {machine.location || 'Sin ubicación'}
          </Paragraph>
          <Paragraph style={styles.paragraph} numberOfLines={compact ? 1 : undefined}>
            Marca: {machine.brand || 'Sin marca'}
          </Paragraph>
          <Paragraph style={styles.paragraph} numberOfLines={compact ? 1 : undefined}>
            OT: {machine.otNumber || 'Sin OT'}
          </Paragraph>
          
          <View style={styles.cardFooter}>
            <Text style={styles.date}>
              {new Date(machine.date).toLocaleDateString()}
            </Text>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              {machine.inspectionStatus === 'revisada' ? (
                <Chip style={[styles.chip, { backgroundColor: '#dcfce7' }]} textStyle={[styles.chipText, { color: '#16a34a' }, compact && styles.compactChipText]}>
                  {'\uD83D\uDFE2'} Revisada
                </Chip>
              ) : (
                <Chip style={[styles.chip, { backgroundColor: '#fff7ed' }]} textStyle={[styles.chipText, { color: '#ea580c' }, compact && styles.compactChipText]}>
                  {'\uD83D\uDFE0'} Entrada
                </Chip>
              )}
              {machine.clientType && (
                <Chip style={styles.chip} textStyle={[styles.chipText, compact && styles.compactChipText]}>
                  {machine.clientType}
                </Chip>
              )}
            </View>
          </View>
        </Card.Content>
      </TouchableOpacity>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    marginBottom: SPACING.sm + 2,
    borderLeftWidth: 3,
    borderLeftColor: BRAND_COLORS.primaryBlue,
    borderRadius: BORDER_RADIUS.xl,
    backgroundColor: 'white',
    ...SHADOWS.card,
  },
  cardContent: {
    paddingVertical: SPACING.md,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  machineTitle: {
    fontSize: TYPOGRAPHY.sizes.lg,
    flex: 1,
    color: BRAND_COLORS.primaryBlue,
    fontWeight: TYPOGRAPHY.weights.bold,
  },
  compactTitle: {
    fontSize: TYPOGRAPHY.sizes.md,
  },
  menuButton: {
    margin: 0,
  },
  paragraph: {
    color: BRAND_COLORS.grayDark,
    fontSize: TYPOGRAPHY.sizes.sm,
    lineHeight: 20,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: SPACING.sm,
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: BRAND_COLORS.grayLight,
  },
  date: {
    fontSize: TYPOGRAPHY.sizes.xs,
    color: BRAND_COLORS.grayText,
  },
  chip: {
    backgroundColor: BRAND_COLORS.tertiaryBlue,
    borderRadius: BORDER_RADIUS.full,
  },
  chipText: {
    fontSize: TYPOGRAPHY.sizes.xs,
    color: BRAND_COLORS.primaryBlue,
  },
  compactChipText: {
    fontSize: 10,
  },
});

export default MachineCard;