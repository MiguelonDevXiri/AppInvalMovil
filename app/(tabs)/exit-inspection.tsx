import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, ScrollView, StyleSheet, TextInput as RNTextInput, TouchableOpacity, View } from 'react-native';
import { Button, Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BORDER_RADIUS, BRAND_COLORS, GRADIENTS, SHADOWS, SPACING, TYPOGRAPHY } from '../../constants/Colors';
import { getChecklistByMachineType } from '../../data/machineChecklists';
import { supabase } from '../../utils/supabase';
import {
  ChecklistPhoto,
  ExitCheck,
  deleteExitInspection,
  getChecklistByMachineId,
  getExitChecksByMachineId,
  getMachineById,
  Machine,
  saveExitChecks,
} from '../../utils/storage';

interface ReviewItem {
  id: string;
  text: string;
  category: string;
  originalStatus: string;
}

export default function ExitInspectionScreen() {
  const { machineId } = useLocalSearchParams();
  const [machine, setMachine] = useState<Machine | null>(null);
  const [reviewItems, setReviewItems] = useState<ReviewItem[]>([]);
  const [checks, setChecks] = useState<Record<string, { verified: boolean; photoUrl: string | null; comment: string }>>({});
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Technician name input
  const [technicianName, setTechnicianName] = useState('');
  const [nameConfirmed, setNameConfirmed] = useState(false);

  // Machine comments
  const [machineComments, setMachineComments] = useState<{ id: string; text: string; photoUri?: string }[]>([]);
  const [entryPhotos, setEntryPhotos] = useState<Record<string, ChecklistPhoto>>({});
  const [userRole, setUserRole] = useState<string>('');

  useEffect(() => {
    loadData();
    AsyncStorage.getItem('current_technician').then(val => {
      if (val) {
        try { const parsed = JSON.parse(val); setUserRole(parsed.role || ''); } catch {}
      }
    });
  }, [machineId]);

  const loadData = async () => {
    try {
      if (!machineId) return;
      setLoading(true);

      const foundMachine = await getMachineById(machineId.toString());
      if (foundMachine) {
        setMachine(foundMachine);

        // Load machine comments
        if (foundMachine.commentsWithPhotos && foundMachine.commentsWithPhotos.length > 0) {
          setMachineComments(
            foundMachine.commentsWithPhotos.map((c, i) => ({ id: `comment_${i}`, text: c.text, photoUri: (c as any).photoUri }))
          );
        }

        // Get checklist results to find failed + cant items
        const checklistData = await getChecklistByMachineId(machineId.toString());
        if (checklistData) {
          const machineChecklist = getChecklistByMachineType(foundMachine.machineType || 'otros');

          const itemMap: Record<string, { text: string; category: string }> = {};
          for (const cat of machineChecklist) {
            for (const item of cat.items) {
              itemMap[item.id] = { text: item.text, category: cat.category };
            }
          }

          // Filter failed AND cant items
          const items: ReviewItem[] = [];
          for (const [itemId, result] of Object.entries(checklistData.results)) {
            if (result === 'fail' || result === 'cant') {
              const info = itemMap[itemId];
              if (info) {
                items.push({
                  id: itemId,
                  text: info.text,
                  category: info.category,
                  originalStatus: result === 'fail' ? 'Mal' : 'No se puede',
                });
              }
            }
          }
          setReviewItems(items);

          // Store entry photos for display
          if (checklistData.photos) {
            setEntryPhotos(checklistData.photos);
          }

          // Load existing exit checks
          const existingChecks = await getExitChecksByMachineId(machineId.toString());
          if (existingChecks.length > 0) {
            const checksMap: Record<string, { verified: boolean; photoUrl: string | null; comment: string }> = {};
            for (const ec of existingChecks) {
              checksMap[ec.itemId] = { verified: ec.verified, photoUrl: ec.photoUrl || null, comment: ec.comment || '' };
            }
            setChecks(checksMap);

            // Recover technician name from existing checks
            const savedTech = existingChecks.find(c => c.verifiedBy);
            if (savedTech?.verifiedBy) {
              setTechnicianName(savedTech.verifiedBy);
              setNameConfirmed(true);
            }
          }
        }
      }
      setLoading(false);
    } catch (error) {
      console.error('Error al cargar datos de inspección de salida:', error);
      setLoading(false);
    }
  };

  const toggleVerified = (itemId: string) => {
    setChecks(prev => ({
      ...prev,
      [itemId]: {
        verified: !prev[itemId]?.verified,
        photoUrl: prev[itemId]?.photoUrl || null,
        comment: prev[itemId]?.comment || '',
      },
    }));
  };

  const updateComment = (itemId: string, comment: string) => {
    setChecks(prev => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        verified: prev[itemId]?.verified || false,
        photoUrl: prev[itemId]?.photoUrl || null,
        comment,
      },
    }));
  };

  const handleTakePhoto = async (itemId: string) => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permisos requeridos', 'Se necesitan permisos para usar la cámara');
        return;
      }
      const result = await ImagePicker.launchCameraAsync({ allowsEditing: false, quality: 0.7 });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        setChecks(prev => ({
          ...prev,
          [itemId]: {
            verified: prev[itemId]?.verified || true,
            photoUrl: result.assets[0].uri,
            comment: prev[itemId]?.comment || '',
          },
        }));
      }
    } catch (error) {
      console.error('Error al tomar foto:', error);
      Alert.alert('Error', 'No se pudo tomar la foto.');
    }
  };

  const handleRemovePhoto = (itemId: string) => {
    setChecks(prev => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        photoUrl: null,
      },
    }));
  };

  const handleDeleteExitInspection = () => {
    Alert.alert(
      'Borrar revisión de salida',
      '¿Estás seguro? Se borrarán todos los datos de la inspección de salida (comprobaciones, fotos y PDF). Esta acción no se puede deshacer.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Borrar',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsSaving(true);
              const success = await deleteExitInspection(machineId!.toString());
              setIsSaving(false);
              if (success) {
                Alert.alert('Eliminada', 'La inspección de salida ha sido borrada.', [
                  { text: 'Aceptar', onPress: () => router.push('/machine-list') },
                ]);
              } else {
                Alert.alert('Error', 'No se pudo borrar la inspección de salida.');
              }
            } catch (error) {
              setIsSaving(false);
              Alert.alert('Error', 'No se pudo borrar la inspección de salida.');
            }
          },
        },
      ],
    );
  };

  const handleContinue = async () => {
    try {
      if (!machineId) return;
      if (!technicianName.trim()) {
        Alert.alert('Nombre requerido', 'Escribe el nombre del técnico revisor antes de continuar.');
        return;
      }
      setIsSaving(true);

      // Build exit checks array (checklist items + comment items)
      const allItems = [
        ...reviewItems.map(item => ({
          id: '',
          machineId: machineId.toString(),
          itemId: item.id,
          verified: checks[item.id]?.verified || false,
          verifiedBy: technicianName.trim(),
          verifiedAt: new Date().toISOString(),
          photoUrl: checks[item.id]?.photoUrl || null,
          comment: checks[item.id]?.comment || '',
        })),
        ...machineComments.map(comment => ({
          id: '',
          machineId: machineId.toString(),
          itemId: comment.id,
          verified: checks[comment.id]?.verified || false,
          verifiedBy: technicianName.trim(),
          verifiedAt: new Date().toISOString(),
          photoUrl: checks[comment.id]?.photoUrl || null,
          comment: checks[comment.id]?.comment || '',
        })),
      ] as ExitCheck[];

      await saveExitChecks(machineId.toString(), allItems);
      setIsSaving(false);

      router.push({
        pathname: '/exit-photos' as any,
        params: { machineId: machineId.toString() },
      });
    } catch (error) {
      console.error('Error al guardar exit checks:', error);
      setIsSaving(false);
      Alert.alert('Error', 'No se pudieron guardar los datos.');
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer} edges={['top', 'bottom']}>
        <ActivityIndicator size="large" color={BRAND_COLORS.primaryBlue} />
        <Text style={{ color: BRAND_COLORS.grayText, marginTop: SPACING.md }}>Cargando datos...</Text>
      </SafeAreaView>
    );
  }

  if (!machine) {
    return (
      <SafeAreaView style={styles.loadingContainer} edges={['top', 'bottom']}>
        <Text style={{ color: BRAND_COLORS.grayText }}>No se encontró la máquina.</Text>
        <Button mode="contained" onPress={() => router.back()} style={{ marginTop: SPACING.md }} buttonColor={BRAND_COLORS.primaryBlue}>
          Volver
        </Button>
      </SafeAreaView>
    );
  }

  const verifiedCount = [...reviewItems, ...machineComments].filter(item => checks[item.id]?.verified).length;
  const totalItems = reviewItems.length + machineComments.length;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <LinearGradient
          colors={GRADIENTS.primary as unknown as [string, string, ...string[]]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.headerGradient}
        >
          <TouchableOpacity onPress={() => router.back()} style={styles.backArrow}>
            <MaterialCommunityIcons name="arrow-left" size={22} color="white" />
          </TouchableOpacity>
          <MaterialCommunityIcons name="clipboard-check-outline" size={24} color="rgba(255,255,255,0.7)" />
          <Text style={styles.headerTitle}>Inspección de Salida</Text>
          <Text style={styles.headerSubtitle}>
            {machine.name} - {machine.brand} {machine.model ? `(${machine.model})` : ''}
          </Text>
          {machine.licensePlate && (
            <Text style={styles.headerSubtitle}>Matrícula: {machine.licensePlate}</Text>
          )}
        </LinearGradient>

        {/* Technician name input */}
        {!nameConfirmed ? (
          <View style={styles.techSection}>
            <Text style={styles.techSectionTitle}>Nombre del técnico revisor</Text>
            <RNTextInput
              style={styles.techNameInput}
              placeholder="Escribe tu nombre..."
              value={technicianName}
              onChangeText={setTechnicianName}
              autoCapitalize="words"
            />
            {technicianName.trim().length > 0 && (
              <TouchableOpacity
                style={styles.techConfirmBtn}
                onPress={() => setNameConfirmed(true)}
              >
                <Text style={styles.techConfirmText}>Continuar como {technicianName.trim()}</Text>
                <MaterialCommunityIcons name="arrow-right" size={18} color="white" />
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <>
            {/* Confirmed technician banner */}
            <TouchableOpacity
              style={styles.techBanner}
              onPress={() => setNameConfirmed(false)}
              activeOpacity={0.8}
            >
              <MaterialCommunityIcons name="account-check" size={20} color={BRAND_COLORS.primaryBlue} />
              <Text style={styles.techBannerText}>Revisor: {technicianName.trim()}</Text>
              <Text style={styles.techBannerChange}>Cambiar</Text>
            </TouchableOpacity>

            {/* Summary banner */}
            {totalItems === 0 ? (
              <View style={styles.emptyContainer}>
                <MaterialCommunityIcons name="check-circle-outline" size={56} color={BRAND_COLORS.success} />
                <Text style={styles.emptyText}>No hay ítems con fallos ni pendientes en el checklist.</Text>
                <Text style={styles.emptySubtext}>Puedes continuar directamente a las fotos de salida.</Text>
              </View>
            ) : (
              <>
                <View style={styles.summaryBanner}>
                  <MaterialCommunityIcons name="alert-circle-outline" size={20} color={BRAND_COLORS.primaryOrange} />
                  <Text style={styles.summaryText}>
                    {totalItems} ítem{totalItems > 1 ? 's' : ''} a revisar — {verifiedCount} comprobado{verifiedCount !== 1 ? 's' : ''}
                  </Text>
                </View>

                {/* Checklist items (fail + cant) */}
                {reviewItems.map(item => {
                  const isVerified = checks[item.id]?.verified || false;
                  const photoUrl = checks[item.id]?.photoUrl || null;
                  const isCant = item.originalStatus === 'No se puede';

                  return (
                    <View key={item.id} style={[styles.itemCard, isVerified && styles.itemCardVerified, isCant && !isVerified && styles.itemCardCant]}>
                      <View style={styles.itemHeader}>
                        <View style={styles.itemInfo}>
                          <Text style={styles.itemCategory}>{item.category}</Text>
                          <Text style={styles.itemText}>{item.text}</Text>
                          <View style={[styles.originalBadge, isCant && styles.originalBadgeCant]}>
                            <Text style={[styles.originalBadgeText, isCant && styles.originalBadgeTextCant]}>
                              Estado original: {item.originalStatus}
                            </Text>
                          </View>
                        </View>
                        <TouchableOpacity onPress={() => toggleVerified(item.id)} style={[styles.verifyButton, isVerified && styles.verifyButtonActive]}>
                          <MaterialCommunityIcons
                            name={isVerified ? 'check-circle' : 'circle-outline'}
                            size={28}
                            color={isVerified ? 'white' : BRAND_COLORS.grayMedium}
                          />
                          <Text style={[styles.verifyText, isVerified && styles.verifyTextActive]}>
                            {isVerified ? 'Comprobado' : 'Comprobar'}
                          </Text>
                        </TouchableOpacity>
                      </View>

                      {/* Entry photos for this item */}
                      {entryPhotos[item.id] && (() => {
                        const raw = entryPhotos[item.id];
                        const photoArray: { uri: string; comment?: string }[] = [];
                        if (typeof raw === 'string') {
                          photoArray.push({ uri: raw });
                        } else if (Array.isArray(raw)) {
                          raw.forEach(p => {
                            if (typeof p === 'string') photoArray.push({ uri: p });
                            else if (p && typeof p === 'object') photoArray.push({ uri: (p as any).uri, comment: (p as any).comment });
                          });
                        }
                        if (photoArray.length === 0) return null;
                        return (
                          <View style={styles.entryPhotosSection}>
                            <Text style={styles.entryPhotosLabel}>Fotos de entrada:</Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.entryPhotosScroll}>
                              {photoArray.map((photo, idx) => (
                                <View key={idx} style={styles.entryPhotoWrapper}>
                                  <Image source={{ uri: photo.uri }} style={styles.entryPhoto} />
                                  {photo.comment ? <Text style={styles.entryPhotoComment} numberOfLines={1}>{photo.comment}</Text> : null}
                                </View>
                              ))}
                            </ScrollView>
                          </View>
                        );
                      })()}

                      {isVerified && (
                        <View style={styles.photoArea}>
                          <View style={styles.photoCommentRow}>
                            {photoUrl ? (
                              <View style={styles.photoPreview}>
                                <Image source={{ uri: photoUrl }} style={styles.photo} />
                                <TouchableOpacity style={styles.removePhotoBtn} onPress={() => handleRemovePhoto(item.id)}>
                                  <MaterialCommunityIcons name="close" size={16} color="white" />
                                </TouchableOpacity>
                              </View>
                            ) : (
                              <TouchableOpacity style={styles.addPhotoBtn} onPress={() => handleTakePhoto(item.id)}>
                                <MaterialCommunityIcons name="camera-plus-outline" size={20} color={BRAND_COLORS.primaryBlue} />
                                <Text style={styles.addPhotoText}>Foto</Text>
                              </TouchableOpacity>
                            )}
                            <RNTextInput
                              style={styles.checkCommentInput}
                              placeholder="Comentario de comprobación..."
                              value={checks[item.id]?.comment || ''}
                              onChangeText={(text) => updateComment(item.id, text)}
                              multiline
                              numberOfLines={2}
                            />
                          </View>
                        </View>
                      )}
                    </View>
                  );
                })}

                {/* Machine comments section */}
                {machineComments.length > 0 && (
                  <>
                    <View style={styles.commentsSectionHeader}>
                      <MaterialCommunityIcons name="comment-text-outline" size={18} color={BRAND_COLORS.primaryOrange} />
                      <Text style={styles.commentsSectionTitle}>Comentarios específicos</Text>
                    </View>

                    {machineComments.map((comment, index) => {
                      const isVerified = checks[comment.id]?.verified || false;
                      const commentPhotoUrl = checks[comment.id]?.photoUrl || null;
                      return (
                        <View key={comment.id} style={[styles.commentCard, isVerified && styles.commentCardVerified]}>
                          <View style={styles.commentRow}>
                            <View style={styles.commentInfo}>
                              <Text style={styles.commentLabel}>Comentario #{index + 1}</Text>
                              <Text style={styles.commentText}>{comment.text}</Text>
                              {comment.photoUri && (
                                <Image source={{ uri: comment.photoUri }} style={styles.entryCommentPhoto} />
                              )}
                            </View>
                            <TouchableOpacity onPress={() => toggleVerified(comment.id)} style={[styles.verifyButton, isVerified && styles.verifyButtonActive]}>
                              <MaterialCommunityIcons
                                name={isVerified ? 'check-circle' : 'circle-outline'}
                                size={28}
                                color={isVerified ? 'white' : BRAND_COLORS.grayMedium}
                              />
                              <Text style={[styles.verifyText, isVerified && styles.verifyTextActive]}>
                                {isVerified ? 'Revisado' : 'Revisar'}
                              </Text>
                            </TouchableOpacity>
                          </View>
                          {isVerified && (
                            <View style={styles.photoArea}>
                              <View style={styles.photoCommentRow}>
                                {commentPhotoUrl ? (
                                  <View style={styles.photoPreview}>
                                    <Image source={{ uri: commentPhotoUrl }} style={styles.photo} />
                                    <TouchableOpacity style={styles.removePhotoBtn} onPress={() => handleRemovePhoto(comment.id)}>
                                      <MaterialCommunityIcons name="close" size={16} color="white" />
                                    </TouchableOpacity>
                                  </View>
                                ) : (
                                  <TouchableOpacity style={styles.addPhotoBtn} onPress={() => handleTakePhoto(comment.id)}>
                                    <MaterialCommunityIcons name="camera-plus-outline" size={20} color={BRAND_COLORS.primaryBlue} />
                                    <Text style={styles.addPhotoText}>Foto</Text>
                                  </TouchableOpacity>
                                )}
                                <RNTextInput
                                  style={styles.checkCommentInput}
                                  placeholder="Comentario de revisión..."
                                  value={checks[comment.id]?.comment || ''}
                                  onChangeText={(text) => updateComment(comment.id, text)}
                                  multiline
                                  numberOfLines={2}
                                />
                              </View>
                            </View>
                          )}
                        </View>
                      );
                    })}
                  </>
                )}
              </>
            )}

            {/* Delete button */}
            {machine.inspectionStatus === 'revisada' && userRole === 'admin' && (
              <TouchableOpacity style={styles.deleteButton} onPress={handleDeleteExitInspection}>
                <MaterialCommunityIcons name="delete-outline" size={20} color="white" />
                <Text style={styles.deleteButtonText}>Borrar revisión de salida</Text>
              </TouchableOpacity>
            )}
          </>
        )}
      </ScrollView>

      {nameConfirmed && (
        <SafeAreaView style={styles.buttonSafeArea} edges={['bottom']}>
          <View style={styles.buttonContainer}>
            <Button
              mode="outlined"
              onPress={() => router.back()}
              style={styles.backButton}
              disabled={isSaving}
              icon="arrow-left"
              textColor={BRAND_COLORS.primaryBlue}
            >
              Volver
            </Button>
            <Button
              mode="contained"
              onPress={handleContinue}
              style={styles.continueButton}
              disabled={isSaving || !technicianName.trim()}
              icon="camera"
              contentStyle={{ flexDirection: 'row-reverse' }}
              buttonColor={BRAND_COLORS.primaryOrange}
            >
              Fotos de salida
            </Button>
          </View>
        </SafeAreaView>
      )}

      {isSaving && (
        <View style={styles.savingOverlay}>
          <View style={styles.savingCard}>
            <ActivityIndicator size="large" color={BRAND_COLORS.primaryBlue} />
            <Text style={styles.savingTitle}>Guardando comprobaciones...</Text>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: BRAND_COLORS.primaryBlue,
  },
  scrollView: {
    flex: 1,
    backgroundColor: BRAND_COLORS.surface,
  },
  scrollContent: {
    paddingBottom: SPACING.md,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: BRAND_COLORS.surface,
  },
  headerGradient: {
    padding: SPACING.lg,
    paddingTop: SPACING.md,
    alignItems: 'center',
  },
  backArrow: {
    position: 'absolute',
    left: 12,
    top: 12,
    zIndex: 10,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    color: 'white',
    fontWeight: TYPOGRAPHY.weights.bold as any,
    fontSize: TYPOGRAPHY.sizes.xl,
    marginTop: SPACING.sm,
  },
  headerSubtitle: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: TYPOGRAPHY.sizes.sm,
    marginTop: SPACING.xs,
  },

  // Technician selector
  techSection: {
    padding: SPACING.md,
  },
  techSectionTitle: {
    fontSize: TYPOGRAPHY.sizes.lg,
    fontWeight: TYPOGRAPHY.weights.bold as any,
    color: BRAND_COLORS.grayDark,
    marginBottom: SPACING.md,
  },
  techNameInput: {
    backgroundColor: 'white',
    borderWidth: 2,
    borderColor: BRAND_COLORS.grayLight,
    borderRadius: BORDER_RADIUS.xl,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.md,
    fontSize: TYPOGRAPHY.sizes.md,
    color: BRAND_COLORS.grayDark,
    ...SHADOWS.soft,
  },
  techList: {
    gap: SPACING.sm,
  },
  techCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.md,
    borderRadius: BORDER_RADIUS.xl,
    borderWidth: 2,
    borderColor: BRAND_COLORS.grayLight,
    ...SHADOWS.soft,
  },
  techCardSelected: {
    borderColor: BRAND_COLORS.primaryBlue,
    backgroundColor: BRAND_COLORS.tertiaryBlue,
  },
  techIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: BRAND_COLORS.lightBlue,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.sm,
  },
  techIconSelected: {
    backgroundColor: BRAND_COLORS.primaryBlue,
  },
  techName: {
    flex: 1,
    fontSize: TYPOGRAPHY.sizes.md,
    fontWeight: TYPOGRAPHY.weights.medium as any,
    color: BRAND_COLORS.grayDark,
  },
  techNameSelected: {
    color: BRAND_COLORS.primaryBlue,
    fontWeight: TYPOGRAPHY.weights.bold as any,
  },
  techConfirmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: BRAND_COLORS.primaryBlue,
    borderRadius: BORDER_RADIUS.xl,
    paddingVertical: SPACING.md,
    marginTop: SPACING.lg,
    gap: SPACING.sm,
  },
  techConfirmText: {
    color: 'white',
    fontWeight: TYPOGRAPHY.weights.bold as any,
    fontSize: TYPOGRAPHY.sizes.md,
  },
  techBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: BRAND_COLORS.tertiaryBlue,
    padding: SPACING.md,
    marginHorizontal: SPACING.md,
    marginTop: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    gap: SPACING.sm,
    borderLeftWidth: 4,
    borderLeftColor: BRAND_COLORS.primaryBlue,
  },
  techBannerText: {
    flex: 1,
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: TYPOGRAPHY.weights.semibold as any,
    color: BRAND_COLORS.primaryBlue,
  },
  techBannerChange: {
    fontSize: TYPOGRAPHY.sizes.xs,
    color: BRAND_COLORS.primaryBlue,
    fontWeight: TYPOGRAPHY.weights.bold as any,
    textDecorationLine: 'underline',
  },

  emptyContainer: {
    alignItems: 'center',
    padding: SPACING.xl,
    marginTop: SPACING.lg,
  },
  emptyText: {
    fontSize: TYPOGRAPHY.sizes.lg,
    fontWeight: TYPOGRAPHY.weights.bold as any,
    color: BRAND_COLORS.success,
    marginTop: SPACING.md,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: TYPOGRAPHY.sizes.sm,
    color: BRAND_COLORS.grayText,
    marginTop: SPACING.sm,
    textAlign: 'center',
  },
  summaryBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: BRAND_COLORS.tertiaryOrange,
    padding: SPACING.md,
    marginHorizontal: SPACING.md,
    marginTop: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    gap: SPACING.sm,
    borderLeftWidth: 4,
    borderLeftColor: BRAND_COLORS.primaryOrange,
  },
  summaryText: {
    fontSize: TYPOGRAPHY.sizes.sm,
    color: BRAND_COLORS.darkOrange,
    fontWeight: TYPOGRAPHY.weights.semibold as any,
    flex: 1,
  },
  itemCard: {
    backgroundColor: 'white',
    marginHorizontal: SPACING.md,
    marginTop: SPACING.sm,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    borderLeftWidth: 3,
    borderLeftColor: BRAND_COLORS.error,
    ...SHADOWS.soft,
  },
  itemCardVerified: {
    borderLeftColor: BRAND_COLORS.success,
  },
  itemCardCant: {
    borderLeftColor: '#7c3aed',
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: SPACING.sm,
  },
  itemInfo: {
    flex: 1,
  },
  itemCategory: {
    fontSize: TYPOGRAPHY.sizes.xs,
    color: BRAND_COLORS.grayText,
    fontWeight: TYPOGRAPHY.weights.semibold as any,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  itemText: {
    fontSize: TYPOGRAPHY.sizes.md,
    color: '#1e293b',
    fontWeight: TYPOGRAPHY.weights.medium as any,
    marginTop: SPACING.xs,
    lineHeight: 22,
  },
  originalBadge: {
    backgroundColor: BRAND_COLORS.errorLight,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.md,
    marginTop: SPACING.sm,
    alignSelf: 'flex-start',
  },
  originalBadgeCant: {
    backgroundColor: '#ede9fe',
  },
  originalBadgeText: {
    fontSize: TYPOGRAPHY.sizes.xs,
    color: BRAND_COLORS.error,
    fontWeight: TYPOGRAPHY.weights.semibold as any,
  },
  originalBadgeTextCant: {
    color: '#7c3aed',
  },
  verifyButton: {
    alignItems: 'center',
    padding: SPACING.sm,
    borderRadius: BORDER_RADIUS.lg,
    backgroundColor: BRAND_COLORS.grayLight,
    minWidth: 80,
  },
  verifyButtonActive: {
    backgroundColor: BRAND_COLORS.success,
  },
  verifyText: {
    fontSize: TYPOGRAPHY.sizes.xs,
    color: BRAND_COLORS.grayText,
    fontWeight: TYPOGRAPHY.weights.semibold as any,
    marginTop: SPACING.xs,
  },
  verifyTextActive: {
    color: 'white',
  },
  photoArea: {
    marginTop: SPACING.sm,
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: BRAND_COLORS.grayLight,
  },
  photoPreview: {
    position: 'relative',
    width: 100,
    height: 100,
  },
  photo: {
    width: 100,
    height: 100,
    borderRadius: BORDER_RADIUS.md,
  },
  removePhotoBtn: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 24,
    height: 24,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: 'rgba(220, 38, 38, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addPhotoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    padding: SPACING.sm,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: BRAND_COLORS.primaryBlue,
    borderRadius: BORDER_RADIUS.md,
    alignSelf: 'flex-start',
  },
  addPhotoText: {
    fontSize: TYPOGRAPHY.sizes.xs,
    color: BRAND_COLORS.primaryBlue,
    fontWeight: TYPOGRAPHY.weights.medium as any,
  },
  photoCommentRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.sm,
  },
  checkCommentInput: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: BRAND_COLORS.grayMedium,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.sm,
    backgroundColor: BRAND_COLORS.grayLight,
    fontSize: TYPOGRAPHY.sizes.sm,
    color: '#1e293b',
    minHeight: 60,
    textAlignVertical: 'top',
  },

  // Comments section
  commentsSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginHorizontal: SPACING.md,
    marginTop: SPACING.lg,
    marginBottom: SPACING.xs,
    paddingBottom: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: BRAND_COLORS.grayLight,
  },
  commentsSectionTitle: {
    fontSize: TYPOGRAPHY.sizes.md,
    fontWeight: TYPOGRAPHY.weights.bold as any,
    color: BRAND_COLORS.primaryOrange,
  },
  commentCard: {
    backgroundColor: 'white',
    marginHorizontal: SPACING.md,
    marginTop: SPACING.sm,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    borderLeftWidth: 3,
    borderLeftColor: BRAND_COLORS.primaryOrange,
    ...SHADOWS.soft,
  },
  commentCardVerified: {
    borderLeftColor: BRAND_COLORS.success,
  },
  commentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: SPACING.sm,
  },
  commentInfo: {
    flex: 1,
  },
  commentLabel: {
    fontSize: TYPOGRAPHY.sizes.xs,
    fontWeight: TYPOGRAPHY.weights.semibold as any,
    color: BRAND_COLORS.primaryOrange,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  commentText: {
    fontSize: TYPOGRAPHY.sizes.sm,
    color: '#334155',
    marginTop: SPACING.xs,
    lineHeight: 20,
  },

  // Delete button
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: BRAND_COLORS.error,
    marginHorizontal: SPACING.md,
    marginTop: SPACING.xl,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    gap: SPACING.sm,
  },
  deleteButtonText: {
    color: 'white',
    fontWeight: TYPOGRAPHY.weights.bold as any,
    fontSize: TYPOGRAPHY.sizes.sm,
  },

  buttonSafeArea: {
    backgroundColor: 'white',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: SPACING.md,
    backgroundColor: 'white',
    ...SHADOWS.medium,
  },
  backButton: {
    flex: 1,
    marginRight: SPACING.sm,
    borderColor: BRAND_COLORS.primaryBlue,
    borderRadius: BORDER_RADIUS.md,
  },
  continueButton: {
    flex: 1,
    marginLeft: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
  },
  savingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1100,
  },
  savingCard: {
    backgroundColor: 'white',
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.xl,
    alignItems: 'center',
    width: '80%',
    maxWidth: 320,
    ...SHADOWS.large,
  },
  savingTitle: {
    marginTop: SPACING.md,
    fontSize: TYPOGRAPHY.sizes.lg,
    fontWeight: TYPOGRAPHY.weights.bold as any,
    color: BRAND_COLORS.primaryBlue,
    textAlign: 'center',
  },
  entryPhotosSection: {
    marginTop: SPACING.sm,
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: BRAND_COLORS.grayLight,
  },
  entryPhotosLabel: {
    fontSize: TYPOGRAPHY.sizes.xs,
    fontWeight: TYPOGRAPHY.weights.semibold as any,
    color: BRAND_COLORS.primaryBlue,
    marginBottom: SPACING.xs,
  },
  entryPhotosScroll: {
    flexDirection: 'row',
  },
  entryPhotoWrapper: {
    marginRight: SPACING.sm,
    alignItems: 'center',
  },
  entryPhoto: {
    width: 80,
    height: 80,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 2,
    borderColor: BRAND_COLORS.primaryBlue,
  },
  entryPhotoComment: {
    fontSize: 9,
    color: BRAND_COLORS.grayText,
    maxWidth: 80,
    textAlign: 'center',
    marginTop: 2,
  },
  entryCommentPhoto: {
    width: 80,
    height: 80,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 2,
    borderColor: BRAND_COLORS.primaryOrange,
    marginTop: SPACING.sm,
  },
});
