import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { memo, useState } from 'react';
import { Image, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Text } from 'react-native-paper';
import { BORDER_RADIUS, BRAND_COLORS, SPACING, TYPOGRAPHY } from '../constants/Colors';

type LazyPhotoGridProps = {
  title: string;
  photos: string[];
  labelPrefix?: string;
  emptyText?: string;
  accentColor?: string;
};

function LazyPhotoGridComponent({
  title,
  photos,
  labelPrefix,
  emptyText = 'Sin fotos adjuntas',
  accentColor = BRAND_COLORS.primaryBlue,
}: LazyPhotoGridProps) {
  const [expanded, setExpanded] = useState(false);

  if (photos.length === 0) {
    return <Text style={styles.emptyText}>{emptyText}</Text>;
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.toggle} onPress={() => setExpanded((value) => !value)} activeOpacity={0.85}>
        <View style={styles.toggleTextBox}>
          <Text style={[styles.title, { color: accentColor }]}>{title}</Text>
          <Text style={styles.subtitle}>{expanded ? 'Fotos cargadas en pantalla' : 'Pulsa para cargar las fotos'}</Text>
        </View>
        <View style={[styles.countPill, { backgroundColor: `${accentColor}18` }]}>
          <Text style={[styles.countText, { color: accentColor }]}>{photos.length}</Text>
        </View>
        <MaterialCommunityIcons name={expanded ? 'chevron-up' : 'chevron-down'} size={24} color={accentColor} />
      </TouchableOpacity>

      {expanded ? (
        <View style={styles.grid}>
          {photos.map((photo, index) => (
            <View key={`${photo}_${index}`} style={styles.item}>
              <Image source={{ uri: photo }} style={styles.image} resizeMode="cover" />
              {labelPrefix ? <Text style={styles.label}>{labelPrefix}{index + 1}</Text> : null}
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

export const LazyPhotoGrid = memo(LazyPhotoGridComponent);

const styles = StyleSheet.create({
  container: {
    marginTop: SPACING.sm,
  },
  toggle: {
    minHeight: 58,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: '#fff7ed',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  toggleTextBox: {
    flex: 1,
  },
  title: {
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: TYPOGRAPHY.weights.bold as any,
  },
  subtitle: {
    marginTop: 2,
    color: BRAND_COLORS.grayText,
    fontSize: TYPOGRAPHY.sizes.xs,
  },
  countPill: {
    minWidth: 30,
    height: 30,
    paddingHorizontal: SPACING.xs,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countText: {
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: TYPOGRAPHY.weights.bold as any,
  },
  grid: {
    marginTop: SPACING.sm,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  item: {
    width: '48%',
  },
  image: {
    width: '100%',
    height: 130,
    borderRadius: BORDER_RADIUS.sm,
    backgroundColor: BRAND_COLORS.grayMedium,
  },
  label: {
    marginTop: SPACING.xs,
    textAlign: 'center',
    color: BRAND_COLORS.grayText,
    fontSize: TYPOGRAPHY.sizes.xs,
  },
  emptyText: {
    color: BRAND_COLORS.grayText,
    fontStyle: 'italic',
  },
});
