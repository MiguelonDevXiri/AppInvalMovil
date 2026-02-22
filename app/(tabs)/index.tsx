import { router } from 'expo-router';
import React from 'react';
import { Image, ScrollView, StyleSheet, View } from 'react-native';
import { Button, Card, Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BRAND_COLORS } from '../../constants/Colors';

export default function HomeScreen() {
  const handleNewInspection = () => {
    router.push('/machine-type-selection');
  };

  const handleViewMachines = () => {
    router.push('/machine-list');
  };

  const handleActecoInspection = () => {
    router.push('/acteco-report-form');
  };

  const handleViewActecoInspections = () => {
    router.push('/acteco-inspections-list');
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.container}>
        {/* Imagen principal o logo */}
        <View style={styles.logoContainer}>
          <Image
            source={require('../../assets/images/logo-placeholder.png')}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>
        
        <Card style={styles.headerCard}>
          <Card.Content>
            <Text style={styles.title}>Taller de Máquinas</Text>
            <Text style={styles.subtitle}>Sistema de Gestión de Inspecciones</Text>
          </Card.Content>
        </Card>
        
        <View style={styles.buttonsContainer}>
          <Button 
            mode="contained" 
            style={styles.newInspectionButton}
            icon="plus-circle"
            onPress={handleNewInspection}
          >
            Nueva Inspección
          </Button>
          
          <Button 
            mode="contained" 
            style={styles.viewMachinesButton}
            icon="format-list-bulleted"
            onPress={handleViewMachines}
          >
            Ver Máquinas Registradas
          </Button>

          <Button 
            mode="contained" 
            style={styles.actecoButton}
            icon="clipboard-check"
            onPress={handleActecoInspection}
          >
            Inspección URGENCIAS
          </Button>

          <Button 
            mode="contained" 
            style={styles.viewActecoButton}
            icon="file-document-multiple"
            onPress={handleViewActecoInspections}
          >
            Ver Inspecciones Registradas
          </Button>

          <Button 
            mode="contained" 
            style={styles.automisaButton}
            icon="factory"
            onPress={() => router.push('/automisa-login')}
          >
            Automisa Inspecciones
          </Button>
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
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  logo: {
    width: 200,
    height: 80,
  },
  headerCard: {
    marginBottom: 20,
    backgroundColor: BRAND_COLORS.primaryBlue,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: 'white',
    textAlign: 'center',
    marginTop: 8,
  },
  buttonsContainer: {
    marginBottom: 20,
  },
  newInspectionButton: {
    marginVertical: 8,
    paddingVertical: 12,
    backgroundColor: BRAND_COLORS.primaryOrange,
  },
  viewMachinesButton: {
    marginVertical: 8,
    paddingVertical: 12,
    backgroundColor: BRAND_COLORS.primaryBlue,
  },
  actecoButton: {
    marginVertical: 8,
    paddingVertical: 12,
    backgroundColor: '#16a34a', // Verde
  },
  viewActecoButton: {
    marginVertical: 8,
    paddingVertical: 12,
    backgroundColor: '#0891b2', // Azul cyan
  },
  automisaButton: {
    marginVertical: 8,
    paddingVertical: 12,
    backgroundColor: '#7c3aed', // Purple - Automisa
  },
});