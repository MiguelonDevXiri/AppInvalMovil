import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, Image, ScrollView, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { Button, Divider, ProgressBar, Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BRAND_COLORS } from '../../constants/Colors';
import { getChecklistTemplate, submitInspection } from '../../utils/api';

interface ChecklistCategory {
  category: string;
  items: { id: string; text: string }[];
}

interface PhotoWithComment {
  uri: string;
  comment: string;
}

export default function AutomisaChecklistScreen() {
  const { woId, machineType, machineName, licensePlate } = useLocalSearchParams<{
    woId: string;
    machineType: string;
    machineName: string;
    licensePlate: string;
  }>();

  const [categories, setCategories] = useState<ChecklistCategory[]>([]);
  const [results, setResults] = useState<Record<string, string>>({});
  const [photos, setPhotos] = useState<Record<string, PhotoWithComment[]>>({});
  const [currentCat, setCurrentCat] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [generalComment, setGeneralComment] = useState('');

  // Comment modal state
  const [commentVisible, setCommentVisible] = useState(false);
  const [commentItemId, setCommentItemId] = useState('');
  const [commentPhotoIdx, setCommentPhotoIdx] = useState(0);
  const [commentText, setCommentText] = useState('');

  useEffect(() => {
    getChecklistTemplate(machineType || 'default')
      .then((data) => setCategories(data.categories))
      .catch(() => Alert.alert('Error', 'No se pudo cargar el checklist'))
      .finally(() => setLoading(false));
  }, [machineType]);

  const totalItems = categories.reduce((s, c) => s + c.items.length, 0);
  const completedItems = Object.keys(results).length;
  const progress = totalItems > 0 ? completedItems / totalItems : 0;

  const handleStatus = (id: string, status: string) => {
    setResults((prev) => ({ ...prev, [id]: status }));
  };

  const handlePhoto = async (itemId: string) => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permisos', 'Se necesitan permisos de cámara');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.7 });
    if (!result.canceled && result.assets?.[0]) {
      const newPhoto: PhotoWithComment = { uri: result.assets[0].uri, comment: '' };
      const current = photos[itemId] || [];
      const updated = [...current, newPhoto];
      setPhotos((prev) => ({ ...prev, [itemId]: updated }));
      // Open comment dialog
      setCommentItemId(itemId);
      setCommentPhotoIdx(updated.length - 1);
      setCommentText('');
      setCommentVisible(true);
    }
  };

  const saveComment = () => {
    const itemPhotos = [...(photos[commentItemId] || [])];
    if (itemPhotos[commentPhotoIdx]) {
      itemPhotos[commentPhotoIdx] = { ...itemPhotos[commentPhotoIdx], comment: commentText };
      setPhotos((prev) => ({ ...prev, [commentItemId]: itemPhotos }));
    }
    setCommentVisible(false);
  };

  const removePhoto = (itemId: string, idx: number) => {
    const updated = (photos[itemId] || []).filter((_, i) => i !== idx);
    setPhotos((prev) => ({ ...prev, [itemId]: updated }));
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    const result = await submitInspection(woId || '', results, generalComment, photos);
    setSubmitting(false);

    if (result.success) {
      Alert.alert('✅ Enviado', 'Inspección enviada correctamente', [
        { text: 'OK', onPress: () => router.replace('/automisa-home') },
      ]);
    } else {
      Alert.alert('Error', result.error || 'No se pudo enviar');
    }
  };

  if (loading) {
    return <SafeAreaView style={styles.centered}><Text>Cargando checklist...</Text></SafeAreaView>;
  }

  // Summary screen
  if (showSummary) {
    const okCount = Object.values(results).filter((v) => v === 'ok').length;
    const failCount = Object.values(results).filter((v) => v === 'fail').length;
    const naCount = Object.values(results).filter((v) => v === 'na').length;
    const pending = totalItems - completedItems;

    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScrollView contentContainerStyle={styles.summaryContainer}>
          <Text style={styles.summaryTitle}>Resumen de inspección</Text>
          <Text style={styles.summaryMachine}>{machineName}</Text>
          <Text style={styles.summaryPlate}>{licensePlate}</Text>

          <View style={styles.summaryStats}>
            <View style={[styles.statBox, { backgroundColor: BRAND_COLORS.successLight }]}>
              <Text style={[styles.statNumber, { color: BRAND_COLORS.success }]}>{okCount}</Text>
              <Text style={styles.statLabel}>Bien</Text>
            </View>
            <View style={[styles.statBox, { backgroundColor: BRAND_COLORS.errorLight }]}>
              <Text style={[styles.statNumber, { color: BRAND_COLORS.error }]}>{failCount}</Text>
              <Text style={styles.statLabel}>Mal</Text>
            </View>
            <View style={[styles.statBox, { backgroundColor: '#f1f5f9' }]}>
              <Text style={[styles.statNumber, { color: BRAND_COLORS.grayDark }]}>{naCount}</Text>
              <Text style={styles.statLabel}>N/A</Text>
            </View>
            {pending > 0 && (
              <View style={[styles.statBox, { backgroundColor: BRAND_COLORS.warningLight }]}>
                <Text style={[styles.statNumber, { color: BRAND_COLORS.warning }]}>{pending}</Text>
                <Text style={styles.statLabel}>Pendiente</Text>
              </View>
            )}
          </View>

          <Text style={styles.commentLabel}>Comentarios generales:</Text>
          <TextInput
            style={styles.generalComment}
            multiline
            numberOfLines={4}
            value={generalComment}
            onChangeText={setGeneralComment}
            placeholder="Observaciones adicionales (opcional)"
          />

          <Button
            mode="contained"
            style={styles.submitButton}
            onPress={handleSubmit}
            loading={submitting}
            disabled={submitting}
            icon="send"
            contentStyle={{ height: 52 }}
          >
            Enviar Inspección
          </Button>

          <Button mode="outlined" onPress={() => setShowSummary(false)} style={{ marginTop: 8 }}>
            Volver al checklist
          </Button>
        </ScrollView>
      </SafeAreaView>
    );
  }

  const cat = categories[currentCat];

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 16 }}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerMachine}>{machineName}</Text>
          <Text style={styles.headerPlate}>{licensePlate}</Text>
          <View style={{ marginTop: 12 }}>
            <Text style={{ fontSize: 13, marginBottom: 4 }}>Progreso: {Math.round(progress * 100)}%</Text>
            <ProgressBar progress={progress} color={BRAND_COLORS.primaryOrange} style={{ height: 8, borderRadius: 4 }} />
          </View>
        </View>

        {/* Category header */}
        <View style={styles.catHeader}>
          <Text style={styles.catTitle}>{cat.category}</Text>
          <Text style={styles.catCount}>
            {currentCat + 1} / {categories.length}
          </Text>
        </View>
        <Divider style={{ height: 2, backgroundColor: BRAND_COLORS.primaryOrange }} />

        {/* Items */}
        <View style={{ padding: 16 }}>
          {cat.items.map((item) => {
            const status = results[item.id];
            const itemPhotos = photos[item.id] || [];

            return (
              <View key={item.id} style={styles.itemContainer}>
                <Text style={styles.itemText}>{item.text}</Text>
                <View style={styles.statusRow}>
                  {(['ok', 'fail', 'na'] as const).map((s) => {
                    const labels = { ok: 'Bien', fail: 'Mal', na: 'N/A' };
                    const activeStyles = {
                      ok: { backgroundColor: '#4CAF50' },
                      fail: { backgroundColor: '#F44336' },
                      na: { backgroundColor: '#9E9E9E' },
                    };
                    const isActive = status === s;
                    return (
                      <TouchableOpacity
                        key={s}
                        style={[styles.statusBtn, isActive ? activeStyles[s] : styles.statusBtnOutline]}
                        onPress={() => handleStatus(item.id, s)}
                      >
                        <Text style={isActive ? styles.statusTextActive : styles.statusTextInactive}>
                          {labels[s]}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {status === 'fail' && (
                  <View style={styles.photoSection}>
                    {itemPhotos.length > 0 && (
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
                        {itemPhotos.map((p, idx) => (
                          <View key={idx} style={styles.photoThumb}>
                            <Image source={{ uri: p.uri }} style={styles.photoImg} />
                            <TouchableOpacity style={styles.photoRemove} onPress={() => removePhoto(item.id, idx)}>
                              <Text style={{ color: 'white', fontWeight: 'bold' }}>×</Text>
                            </TouchableOpacity>
                            {p.comment ? (
                              <Text style={styles.photoComment} numberOfLines={1}>{p.comment}</Text>
                            ) : null}
                          </View>
                        ))}
                      </ScrollView>
                    )}
                    <Button mode="outlined" icon="camera" onPress={() => handlePhoto(item.id)} compact>
                      Añadir foto
                    </Button>
                  </View>
                )}
                <Divider style={{ marginTop: 12 }} />
              </View>
            );
          })}
        </View>
      </ScrollView>

      {/* Navigation */}
      <SafeAreaView style={styles.navBar} edges={['bottom']}>
        <View style={styles.navRow}>
          <Button
            mode="outlined"
            icon="arrow-left"
            onPress={() => (currentCat > 0 ? setCurrentCat(currentCat - 1) : router.back())}
            style={styles.navBtn}
          >
            {currentCat > 0 ? 'Anterior' : 'Salir'}
          </Button>

          {currentCat < categories.length - 1 ? (
            <Button
              mode="contained"
              icon="arrow-right"
              contentStyle={{ flexDirection: 'row-reverse' }}
              onPress={() => setCurrentCat(currentCat + 1)}
              style={[styles.navBtn, { backgroundColor: BRAND_COLORS.primaryBlue }]}
            >
              Siguiente
            </Button>
          ) : (
            <Button
              mode="contained"
              icon="check"
              contentStyle={{ flexDirection: 'row-reverse' }}
              onPress={() => setShowSummary(true)}
              style={[styles.navBtn, { backgroundColor: BRAND_COLORS.primaryOrange }]}
            >
              Finalizar
            </Button>
          )}
        </View>
      </SafeAreaView>

      {/* Comment modal */}
      {commentVisible && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Comentario de la foto</Text>
            <TextInput
              style={styles.modalInput}
              multiline
              numberOfLines={3}
              value={commentText}
              onChangeText={setCommentText}
              placeholder="Describe el problema"
            />
            <View style={styles.modalButtons}>
              <Button onPress={() => setCommentVisible(false)}>Saltar</Button>
              <Button onPress={saveComment}>Guardar</Button>
            </View>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f5f5f5' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { padding: 16, backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#e0e0e0' },
  headerMachine: { fontSize: 20, fontWeight: 'bold', color: BRAND_COLORS.primaryBlue },
  headerPlate: {
    fontSize: 18,
    fontWeight: 'bold',
    color: BRAND_COLORS.primaryBlue,
    backgroundColor: BRAND_COLORS.lightBlue,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    marginTop: 4,
    overflow: 'hidden',
    letterSpacing: 1,
  },
  catHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#e3f2fd',
  },
  catTitle: { fontSize: 18, fontWeight: '600', color: BRAND_COLORS.primaryBlue },
  catCount: { fontSize: 14, color: BRAND_COLORS.grayDark },
  itemContainer: { marginBottom: 16 },
  itemText: { fontSize: 16, marginBottom: 8 },
  statusRow: { flexDirection: 'row', gap: 8 },
  statusBtn: { flex: 1, padding: 10, borderRadius: 6, alignItems: 'center', minHeight: 48, justifyContent: 'center' },
  statusBtnOutline: { borderWidth: 1, borderColor: '#ccc' },
  statusTextActive: { color: 'white', fontWeight: 'bold', fontSize: 15 },
  statusTextInactive: { color: '#333', fontSize: 15 },
  photoSection: { marginTop: 8, backgroundColor: '#fef2f2', padding: 8, borderRadius: 8 },
  photoThumb: { width: 100, height: 100, marginRight: 8, borderRadius: 8, overflow: 'hidden', position: 'relative' },
  photoImg: { width: 100, height: 100 },
  photoRemove: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(244,67,54,0.7)',
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoComment: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(255,255,255,0.85)',
    fontSize: 10,
    padding: 2,
    textAlign: 'center',
  },
  navBar: { backgroundColor: 'white', borderTopWidth: 1, borderTopColor: '#e0e0e0' },
  navRow: { flexDirection: 'row', justifyContent: 'space-between', padding: 16 },
  navBtn: { flex: 1, marginHorizontal: 8 },
  // Summary
  summaryContainer: { padding: 24 },
  summaryTitle: { fontSize: 24, fontWeight: 'bold', color: BRAND_COLORS.primaryBlue, textAlign: 'center' },
  summaryMachine: { fontSize: 18, textAlign: 'center', marginTop: 8 },
  summaryPlate: {
    fontSize: 20,
    fontWeight: 'bold',
    color: BRAND_COLORS.primaryBlue,
    backgroundColor: BRAND_COLORS.lightBlue,
    alignSelf: 'center',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 8,
    marginTop: 8,
    overflow: 'hidden',
    letterSpacing: 1,
  },
  summaryStats: { flexDirection: 'row', justifyContent: 'center', gap: 12, marginTop: 24, flexWrap: 'wrap' },
  statBox: { alignItems: 'center', padding: 16, borderRadius: 12, minWidth: 70 },
  statNumber: { fontSize: 28, fontWeight: 'bold' },
  statLabel: { fontSize: 13, color: BRAND_COLORS.grayDark, marginTop: 2 },
  commentLabel: { fontSize: 16, fontWeight: '600', marginTop: 24, marginBottom: 8 },
  generalComment: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    backgroundColor: 'white',
    textAlignVertical: 'top',
    minHeight: 80,
    fontSize: 15,
  },
  submitButton: { marginTop: 20, backgroundColor: BRAND_COLORS.success, paddingVertical: 4 },
  // Modal
  modalOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  modalContent: { backgroundColor: 'white', borderRadius: 12, padding: 20, width: '85%' },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: BRAND_COLORS.primaryBlue, marginBottom: 12 },
  modalInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 10,
    textAlignVertical: 'top',
    minHeight: 70,
  },
  modalButtons: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 12, gap: 8 },
});
