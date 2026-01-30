import { router } from 'expo-router';
import React from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Card, Title } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BRAND_COLORS } from '../../constants/Colors';
import { MACHINE_TYPES } from '../../data/machineTypes';

export default function MachineTypeSelectionScreen() {
  const handleTypeSelect = (typeId: string) => {
    console.log(`Tipo de máquina seleccionado: ${typeId}`);
    router.push({
      pathname: '/new-machine',
      params: { machineTypeId: typeId }
    });
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.container}>
        <Card style={styles.headerCard}>
          <Card.Content>
            <Title style={styles.headerTitle}>Selecciona el Tipo de Máquina</Title>
          </Card.Content>
        </Card>

        <View style={styles.typesGrid}>
          {MACHINE_TYPES.map(type => (
            <TouchableOpacity
              key={type.id}
              style={styles.typeCard}
              onPress={() => handleTypeSelect(type.id)}
              activeOpacity={0.7}
            >
              <Card style={[styles.card, { borderLeftColor: BRAND_COLORS.primaryBlue }]}>
                <Card.Content>
                  <Title style={styles.typeTitle}>{type.name}</Title>
                </Card.Content>
              </Card>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
  },
  container: {
    padding: 16,
    paddingBottom: 32, // Añadido más padding inferior
  },
  headerCard: {
    marginBottom: 16,
    backgroundColor: BRAND_COLORS.primaryBlue,
    elevation: 4,
  },
  headerTitle: {
    color: 'white',
    fontSize: 18,
    textAlign: 'center',
    fontWeight: 'bold',
  },
  typesGrid: {
    flex: 1,
  },
  typeCard: {
    marginBottom: 12,
  },
  card: {
    borderLeftWidth: 5,
    elevation: 2,
    backgroundColor: 'white',
  },
  typeTitle: {
    fontSize: 18,
    textAlign: 'center',
    color: BRAND_COLORS.primaryBlue,
  },
});