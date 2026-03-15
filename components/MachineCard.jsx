import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Card, Title, Paragraph, Text, Chip, IconButton } from 'react-native-paper';
import { BRAND_COLORS } from '../constants/Colors';

const MachineCard = ({ 
  machine, 
  onPress, 
  onMenuPress,
  compact = false
}) => {
  return (
    <Card style={styles.card}>
      <TouchableOpacity onPress={() => onPress(machine)} activeOpacity={0.7}>
        <Card.Content>
          <View style={styles.cardHeader}>
            <Title 
              style={[styles.machineTitle, compact && styles.compactTitle]} 
              numberOfLines={compact ? 1 : 2}
            >
              {machine.name}
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
          
          <Paragraph numberOfLines={compact ? 1 : undefined}>
            Cliente: {machine.clientName}
          </Paragraph>
          
          {!compact && machine.model && (
            <Paragraph>Modelo: {machine.model}</Paragraph>
          )}
          
          {!compact && machine.serialNumber && (
            <Paragraph>N° Serie: {machine.serialNumber}</Paragraph>
          )}
          
          <View style={styles.cardFooter}>
            <Text style={styles.date}>
              {new Date(machine.date).toLocaleDateString()}
            </Text>
            
            {machine.clientType && (
              <Chip style={styles.chip} textStyle={compact ? styles.compactChipText : {}}>
                {machine.clientType}
              </Chip>
            )}
          </View>
        </Card.Content>
      </TouchableOpacity>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    marginBottom: 12,
    elevation: 2,
    borderLeftWidth: 3,
    borderLeftColor: BRAND_COLORS.primaryBlue,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  machineTitle: {
    fontSize: 18,
    flex: 1,
  },
  compactTitle: {
    fontSize: 16,
  },
  menuButton: {
    margin: 0,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  date: {
    fontSize: 12,
    color: '#757575',
  },
  chip: {
    backgroundColor: '#e3f2fd',
  },
  compactChipText: {
    fontSize: 10,
  },
});

export default MachineCard;