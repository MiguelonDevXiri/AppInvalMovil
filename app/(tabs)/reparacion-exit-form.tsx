import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  type AlertButton,
  Image,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { Button, Card, Divider, IconButton, Paragraph, Text, TextInput, Title } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LazyPhotoGrid } from '../../components/LazyPhotoGrid';
import { BORDER_RADIUS, BRAND_COLORS, SHADOWS, SPACING, TYPOGRAPHY } from '../../constants/Colors';
import { generateReparacionExitPDF } from '../../utils/reparacionesExitReportGenerator';
import {
  buildExitDraftFromInspection,
  deleteReparacionExit,
  getReparacionInspectionById,
  saveReparacionExit,
  type ReparacionExitCheck,
  type ReparacionExitData,
  type ReparacionExitMaterial,
  type ReparacionInspection,
} from '../../utils/reparacionesInspectionStorage';

const EXIT_GRADIENT = ['#065f46', '#16a34a', '#4ade80'] as const;
const EXIT_PRIMARY = '#15803d';
const EXIT_PHOTO_LABELS = ['S1', 'S2', 'S3', 'S4'] as const;

const buildEmptyExtraMaterial = (): ReparacionExitMaterial => ({
  id: `extra_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
  materialId: null,
  name: '',
  quantity: '',
  reference: '',
  available: null,
  checked: true,
  isExtra: true,
});

export default function ReparacionExitFormScreen() {
  const params = useLocalSearchParams();
  const inspectionId = typeof params.inspectionId === 'string' ? params.inspectionId : '';

  const [inspection, setInspection] = useState<ReparacionInspection | null>(null);
  const [exitData, setExitData] = useState<ReparacionExitData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [materialsExpanded, setMaterialsExpanded] = useState(false);

  useEffect(() => {
    let active = true;

    const loadData = async () => {
      try {
        if (!inspectionId) {
          setLoading(false);
          return;
        }

        const loadedInspection = await getReparacionInspectionById(inspectionId);
        if (!active) return;

        if (!loadedInspection) {
          setInspection(null);
          setExitData(null);
          setLoading(false);
          return;
        }

        const draft = buildExitDraftFromInspection(loadedInspection);
        const technicianJson = await AsyncStorage.getItem('current_technician');
        const technicianName = technicianJson ? JSON.parse(technicianJson).name || '' : '';

        if (!active) return;

        setInspection(loadedInspection);
        setExitData({
          ...draft,
          reviewedBy: draft.reviewedBy || technicianName,
        });
        setLoading(false);
      } catch (error) {
        console.error('Error al cargar la salida de reparación:', error);
        if (active) {
          setLoading(false);
        }
      }
    };

    void loadData();

    return () => {
      active = false;
    };
  }, [inspectionId]);

  const checkedRepairs = useMemo(
    () => exitData?.checks.filter((item) => item.checked).length || 0,
    [exitData]
  );

  const checkedMaterials = useMemo(
    () => exitData?.materials.filter((item) => item.checked).length || 0,
    [exitData]
  );

  const updateExitData = (updater: (current: ReparacionExitData) => ReparacionExitData) => {
    setExitData((current) => (current ? updater(current) : current));
  };

  const updateCheck = (repairId: string, updater: (current: ReparacionExitCheck) => ReparacionExitCheck) => {
    updateExitData((current) => ({
      ...current,
      checks: current.checks.map((item) => (item.repairId === repairId ? updater(item) : item)),
    }));
  };

  const toggleCheck = (repairId: string) => {
    updateCheck(repairId, (item) => {
      const nextChecked = !item.checked;
      return {
        ...item,
        checked: nextChecked,
        verifiedBy: nextChecked ? exitData?.reviewedBy || item.verifiedBy : '',
        verifiedAt: nextChecked ? item.verifiedAt || new Date().toISOString() : '',
      };
    });
  };

  const updateCheckComment = (repairId: string, comment: string) => {
    updateCheck(repairId, (item) => ({ ...item, comment }));
  };

  const updateCheckPhoto = (repairId: string, photoUrl: string) => {
    updateCheck(repairId, (item) => ({ ...item, photoUrl }));
  };

  const updateGeneralPhotoSlot = (index: number, uri: string | null) => {
    updateExitData((current) => {
      const nextPhotos = [...(current.generalPhotos || [])].slice(0, 4);
      while (nextPhotos.length < 4) nextPhotos.push('');
      nextPhotos[index] = uri || '';

      return {
        ...current,
        generalPhotos: nextPhotos.filter(Boolean).slice(0, 4),
      };
    });
  };

  const getGeneralPhotoAt = (index: number): string => exitData?.generalPhotos?.[index] || '';

  const updateMaterial = (
    materialId: string,
    field: keyof ReparacionExitMaterial,
    value: string | boolean | null
  ) => {
    updateExitData((current) => ({
      ...current,
      materials: current.materials.map((item) =>
        item.id === materialId ? { ...item, [field]: value } : item
      ),
    }));
  };

  const addExtraMaterial = () => {
    updateExitData((current) => ({
      ...current,
      materials: [...current.materials, buildEmptyExtraMaterial()],
    }));
  };

  const removeExtraMaterial = (materialId: string) => {
    updateExitData((current) => ({
      ...current,
      materials: current.materials.filter((item) => item.id !== materialId),
    }));
  };

  const handleTakeCheckPhoto = async (repairId: string) => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permisos requeridos', 'Se necesitan permisos para usar la cámara.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({ allowsEditing: false, quality: 0.7 });
      if (!result.canceled && result.assets?.length > 0) {
        updateCheckPhoto(repairId, result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error al tomar foto de comprobación de reparación:', error);
      Alert.alert('Error', 'No se pudo tomar la foto de comprobación.');
    }
  };

  const handlePickGeneralPhoto = async (index: number) => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permisos requeridos', 'Se necesitan permisos para acceder a la galería.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.7,
        selectionLimit: 1,
      });

      if (!result.canceled && result.assets?.length > 0) {
        updateGeneralPhotoSlot(index, result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error al seleccionar foto general de salida:', error);
      Alert.alert('Error', 'No se pudo seleccionar la foto de salida.');
    }
  };

  const handleTakeGeneralPhoto = async (index: number) => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permisos requeridos', 'Se necesitan permisos para usar la cámara.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({ allowsEditing: false, quality: 0.7 });
      if (!result.canceled && result.assets?.length > 0) {
        updateGeneralPhotoSlot(index, result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error al tomar foto general de salida:', error);
      Alert.alert('Error', 'No se pudo tomar la foto de salida.');
    }
  };

  const openGeneralPhotoOptions = (index: number) => {
    const hasPhoto = Boolean(getGeneralPhotoAt(index));
    const actions: AlertButton[] = [
      { text: 'Cámara', onPress: () => { void handleTakeGeneralPhoto(index); } },
      { text: 'Galería', onPress: () => { void handlePickGeneralPhoto(index); } },
    ];

    if (hasPhoto) {
      actions.push({
        text: 'Quitar foto',
        style: 'destructive',
        onPress: () => updateGeneralPhotoSlot(index, null),
      });
    }

    actions.push({ text: 'Cancelar', style: 'cancel' });
    Alert.alert(`Foto ${EXIT_PHOTO_LABELS[index]}`, 'Selecciona una opción', actions);
  };

  const handlePickCheckPhoto = async (repairId: string) => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permisos requeridos', 'Se necesitan permisos para acceder a la galería.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.7,
        selectionLimit: 1,
      });

      if (!result.canceled && result.assets?.length > 0) {
        updateCheckPhoto(repairId, result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error al seleccionar foto de comprobación de reparación:', error);
      Alert.alert('Error', 'No se pudo seleccionar la foto de comprobación.');
    }
  };

  const handleDeleteExit = async () => {
    if (!inspection) return;

    Alert.alert(
      'Borrar salida',
      'Se borrarán las comprobaciones, materiales extra y PDF de esta salida.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Borrar',
          style: 'destructive',
          onPress: async () => {
            try {
              setSaving(true);
              const success = await deleteReparacionExit(inspection.id);
              setSaving(false);

              if (success) {
                Alert.alert('Salida borrada', 'La salida de reparación se ha borrado correctamente.', [
                  {
                    text: 'Aceptar',
                    onPress: () => router.push({ pathname: '/reparacion-report-view' as any, params: { inspectionId: inspection.id } }),
                  },
                ]);
              } else {
                Alert.alert('Error', 'No se pudo borrar la salida de reparación.');
              }
            } catch (error) {
              console.error('Error al borrar salida de reparación:', error);
              setSaving(false);
              Alert.alert('Error', 'No se pudo borrar la salida de reparación.');
            }
          },
        },
      ]
    );
  };

  const handleSave = async () => {
    if (!inspection || !exitData) return;

    if (!exitData.reviewedBy.trim()) {
      Alert.alert('Técnico requerido', 'Escribe el nombre del técnico que revisa la salida.');
      return;
    }

    try {
      setSaving(true);
      const nextPayload: ReparacionExitData = {
        ...exitData,
        reviewedBy: exitData.reviewedBy.trim(),
        completedAt: exitData.completedAt || new Date().toISOString(),
        generalPhotos: (exitData.generalPhotos || []).filter(Boolean).slice(0, 4),
        checks: exitData.checks.map((item) => ({
          ...item,
          comment: item.comment.trim(),
          photoUrl: item.photoUrl || '',
          verifiedBy: item.checked ? exitData.reviewedBy.trim() : '',
          verifiedAt: item.checked ? item.verifiedAt || new Date().toISOString() : '',
        })),
        materials: exitData.materials.filter((item) => {
          if (!item.isExtra) return true;
          return item.name.trim() || item.quantity.trim() || item.reference.trim();
        }),
      };

      const savedInspection = await saveReparacionExit(inspection.id, nextPayload);
      const refreshedInspection = savedInspection || (await getReparacionInspectionById(inspection.id));

      let exitPdfGenerated = false;
      if (refreshedInspection) {
        const exitPdfUrl = await generateReparacionExitPDF(refreshedInspection);
        if (exitPdfUrl) {
          refreshedInspection.exitPdfUrl = exitPdfUrl;
          exitPdfGenerated = true;
        }
      }

      setSaving(false);

      if (!exitPdfGenerated) {
        Alert.alert(
          'Salida guardada sin PDF',
          'La salida se ha guardado, pero no se pudo generar o subir el PDF de salida. Revísalo antes de entregar el parte.',
          [
            {
              text: 'Aceptar',
              onPress: () =>
                router.push({
                  pathname: '/reparacion-report-view' as any,
                  params: { inspectionId: inspection.id },
                }),
            },
          ]
        );
        return;
      }

      Alert.alert('Salida guardada', 'La salida de reparación se ha guardado correctamente.', [
        {
          text: 'Aceptar',
          onPress: () =>
            router.push({
              pathname: '/reparacion-report-view' as any,
              params: { inspectionId: inspection.id },
            }),
        },
      ]);
    } catch (error) {
      console.error('Error al guardar la salida de reparación:', error);
      setSaving(false);
      Alert.alert('Error', 'No se pudo guardar la salida de reparación.');
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer} edges={['top', 'bottom']}>
        <ActivityIndicator size="large" color={EXIT_PRIMARY} />
        <Text style={styles.loadingText}>Cargando salida de reparación...</Text>
      </SafeAreaView>
    );
  }

  if (!inspection || !exitData) {
    return (
      <SafeAreaView style={styles.loadingContainer} edges={['top', 'bottom']}>
        <Text style={styles.emptyText}>No se encontró la reparación.</Text>
        <Button mode="contained" onPress={() => router.back()} buttonColor={EXIT_PRIMARY} style={styles.inlineButton}>
          Volver
        </Button>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <LinearGradient colors={EXIT_GRADIENT as any} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <MaterialCommunityIcons name="arrow-left" size={22} color="white" />
          </TouchableOpacity>
          <MaterialCommunityIcons name="clipboard-check-outline" size={24} color="rgba(255,255,255,0.75)" />
          <Text style={styles.headerTitle}>Salida reparación</Text>
          <Text style={styles.headerSubtitle}>{inspection.clientName} · {inspection.machineBrand || inspection.machineType || 'Sin máquina'}</Text>
        </LinearGradient>

        <Card style={styles.card}>
          <Card.Content>
            <Title style={styles.sectionTitle}>📋 Datos base</Title>
            <Divider style={styles.divider} />
            <InfoRow label="Cliente" value={inspection.clientName} />
            <InfoRow label="Matrícula" value={inspection.licensePlate || 'Sin matrícula'} />
            <InfoRow label="OT" value={inspection.otNumber || 'Sin OT'} />
            <InfoRow label="Ubicación" value={inspection.location || 'Sin ubicación'} />
          </Card.Content>
        </Card>

        <Card style={styles.card}>
          <Card.Content>
            <Title style={styles.sectionTitle}>👷 Técnico revisor</Title>
            <Divider style={styles.divider} />
            <TextInput
              label="Nombre del técnico"
              value={exitData.reviewedBy}
              onChangeText={(value) => updateExitData((current) => ({ ...current, reviewedBy: value }))}
              mode="outlined"
              style={styles.input}
              outlineColor={BRAND_COLORS.grayMedium}
              activeOutlineColor={EXIT_PRIMARY}
            />
          </Card.Content>
        </Card>

        <Card style={styles.card}>
          <Card.Content>
            <Title style={styles.sectionTitle}>📸 Fotos generales de salida</Title>
            <Divider style={styles.divider} />
            <Text style={styles.helperText}>Opcional: añade hasta 4 fotos del estado final antes de entregar la máquina.</Text>
            <View style={styles.generalPhotosGrid}>
              {EXIT_PHOTO_LABELS.map((label, index) => {
                const uri = getGeneralPhotoAt(index);
                return (
                  <TouchableOpacity
                    key={label}
                    onPress={() => openGeneralPhotoOptions(index)}
                    style={styles.generalPhotoCardWrapper}
                    activeOpacity={0.85}
                  >
                    <Card style={styles.generalPhotoCard}>
                      <Card.Content style={styles.generalPhotoCardContent}>
                        <Text style={styles.generalPhotoTitle}>{label}</Text>
                        {uri ? (
                          <View style={styles.photoContainerInner}>
                            <Image source={{ uri }} style={styles.generalPhotoPreview} />
                            <Text style={styles.photoHint}>Tocar para cambiar</Text>
                          </View>
                        ) : (
                          <View style={styles.photoPlaceholder}>
                            <MaterialCommunityIcons name="camera-plus-outline" size={28} color={BRAND_COLORS.grayText} />
                            <Text style={styles.photoPlaceholderText}>Añadir foto</Text>
                          </View>
                        )}
                        {uri ? (
                          <View style={styles.checkIndicator}>
                            <MaterialCommunityIcons name="check-circle" size={20} color={BRAND_COLORS.success} />
                          </View>
                        ) : null}
                      </Card.Content>
                    </Card>
                  </TouchableOpacity>
                );
              })}
            </View>
          </Card.Content>
        </Card>

        <Card style={styles.card}>
          <Card.Content>
            <View style={styles.sectionHeaderRow}>
              <Title style={styles.sectionTitle}>🛠️ Comprobación de reparaciones</Title>
              <Text style={styles.sectionCounter}>{checkedRepairs}/{exitData.checks.length}</Text>
            </View>
            <Divider style={styles.divider} />
            {inspection.repairs.map((repair, index) => {
              const currentCheck = exitData.checks.find((item) => item.repairId === repair.id);
              const checked = currentCheck?.checked || false;
              return (
                <View key={repair.id} style={[styles.blockCard, checked ? styles.blockCardChecked : null]}>
                  <View style={styles.blockHeader}>
                    <View style={styles.blockInfo}>
                      <Text style={styles.blockTitle}>Reparación {index + 1}</Text>
                      <Paragraph style={styles.blockParagraph}>{repair.description || 'Sin descripción.'}</Paragraph>
                    </View>
                    <TouchableOpacity
                      onPress={() => toggleCheck(repair.id)}
                      style={[styles.verifyButton, checked ? styles.verifyButtonActive : null]}
                      activeOpacity={0.85}
                    >
                      <MaterialCommunityIcons
                        name={checked ? 'check-circle' : 'circle-outline'}
                        size={26}
                        color={checked ? 'white' : BRAND_COLORS.grayMedium}
                      />
                      <Text style={[styles.verifyText, checked ? styles.verifyTextActive : null]}>
                        {checked ? 'Comprobado' : 'Comprobar'}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {repair.photos.length > 0 ? (
                    <LazyPhotoGrid
                      title="Fotos del trabajo realizado"
                      photos={repair.photos}
                      labelPrefix={`R${index + 1}.`}
                      accentColor={EXIT_PRIMARY}
                    />
                  ) : null}

                  {checked ? (
                    <View style={styles.checkDetailArea}>
                      <View style={styles.checkDetailRow}>
                        {currentCheck?.photoUrl ? (
                          <View style={styles.photoPreviewBox}>
                            <Image source={{ uri: currentCheck.photoUrl }} style={styles.photoPreviewThumb} />
                            <TouchableOpacity style={styles.removePhotoBtn} onPress={() => updateCheckPhoto(repair.id, '')}>
                              <MaterialCommunityIcons name="close" size={16} color="white" />
                            </TouchableOpacity>
                          </View>
                        ) : (
                          <TouchableOpacity style={styles.addPhotoBtn} onPress={() => handleTakeCheckPhoto(repair.id)}>
                            <MaterialCommunityIcons name="camera-plus-outline" size={20} color={EXIT_PRIMARY} />
                            <Text style={styles.addPhotoText}>Evidencia</Text>
                          </TouchableOpacity>
                        )}

                        <TextInput
                          label="Comentario de revisión"
                          value={currentCheck?.comment || ''}
                          onChangeText={(value) => updateCheckComment(repair.id, value)}
                          mode="outlined"
                          multiline
                          numberOfLines={3}
                          style={styles.commentInput}
                          outlineColor={BRAND_COLORS.grayMedium}
                          activeOutlineColor={EXIT_PRIMARY}
                          placeholder="Comentario de comprobación..."
                        />
                      </View>

                      <Button
                        mode="text"
                        icon="image"
                        textColor={EXIT_PRIMARY}
                        onPress={() => handlePickCheckPhoto(repair.id)}
                        compact
                      >
                        Elegir desde galería
                      </Button>
                    </View>
                  ) : null}
                </View>
              );
            })}
          </Card.Content>
        </Card>

        <Card style={styles.card}>
          <Card.Content>
            <TouchableOpacity style={styles.sectionHeaderRow} onPress={() => setMaterialsExpanded((current) => !current)} activeOpacity={0.8}>
              <View style={styles.collapsibleTitleRow}>
                <MaterialCommunityIcons name={materialsExpanded ? 'chevron-down' : 'chevron-right'} size={24} color={EXIT_PRIMARY} />
                <Title style={styles.sectionTitle}>🧰 Materiales de salida</Title>
              </View>
              <Button compact mode="contained" buttonColor={EXIT_PRIMARY} icon="plus" onPress={addExtraMaterial}>
                Añadir
              </Button>
            </TouchableOpacity>
            <Divider style={styles.divider} />
            {materialsExpanded ? exitData.materials.map((material) => (
              <View key={material.id} style={styles.blockCard}>
                <View style={styles.blockHeader}>
                  <Text style={styles.blockTitle}>{material.isExtra ? 'Material de salida' : material.name || 'Material'}</Text>
                  <View style={styles.inlineActions}>
                    <TouchableOpacity
                      style={[styles.smallChip, material.checked ? styles.smallChipActive : null]}
                      onPress={() => updateMaterial(material.id, 'checked', !material.checked)}
                    >
                      <Text style={[styles.smallChipText, material.checked ? styles.smallChipTextActive : null]}>
                        {material.checked ? 'OK' : 'Pendiente'}
                      </Text>
                    </TouchableOpacity>
                    {material.isExtra ? (
                      <IconButton icon="delete" size={18} iconColor={BRAND_COLORS.error} onPress={() => removeExtraMaterial(material.id)} />
                    ) : null}
                  </View>
                </View>

                <TextInput
                  label="Material"
                  value={material.name}
                  onChangeText={(value) => updateMaterial(material.id, 'name', value)}
                  mode="outlined"
                  style={styles.input}
                  outlineColor={BRAND_COLORS.grayMedium}
                  activeOutlineColor={EXIT_PRIMARY}
                />
                <View style={styles.row}>
                  <TextInput
                    label="Cantidad"
                    value={material.quantity}
                    onChangeText={(value) => updateMaterial(material.id, 'quantity', value)}
                    mode="outlined"
                    style={[styles.input, styles.rowInput]}
                    outlineColor={BRAND_COLORS.grayMedium}
                    activeOutlineColor={EXIT_PRIMARY}
                  />
                  <TextInput
                    label="Referencia"
                    value={material.reference}
                    onChangeText={(value) => updateMaterial(material.id, 'reference', value)}
                    mode="outlined"
                    style={[styles.input, styles.rowInput]}
                    outlineColor={BRAND_COLORS.grayMedium}
                    activeOutlineColor={EXIT_PRIMARY}
                  />
                </View>

                <View style={styles.availabilityRow}>
                  <Text style={styles.availabilityLabel}>Disponibilidad</Text>
                  <View style={styles.availabilityButtons}>
                    <TouchableOpacity
                      style={[styles.smallChip, material.available === true ? styles.smallChipActive : null]}
                      onPress={() => updateMaterial(material.id, 'available', material.available === true ? null : true)}
                    >
                      <Text style={[styles.smallChipText, material.available === true ? styles.smallChipTextActive : null]}>Sí</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.smallChip, material.available === false ? styles.smallChipDanger : null]}
                      onPress={() => updateMaterial(material.id, 'available', material.available === false ? null : false)}
                    >
                      <Text style={[styles.smallChipText, material.available === false ? styles.smallChipTextActive : null]}>No</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            )) : null}
            {materialsExpanded ? <Text style={styles.helperText}>{checkedMaterials} material(es) de salida marcados como comprobados.</Text> : null}
          </Card.Content>
        </Card>

        <Card style={styles.card}>
          <Card.Content>
            <Title style={styles.sectionTitle}>📝 Notas de salida</Title>
            <Divider style={styles.divider} />
            <TextInput
              label="Observaciones finales"
              value={exitData.note}
              onChangeText={(value) => updateExitData((current) => ({ ...current, note: value }))}
              mode="outlined"
              multiline
              numberOfLines={5}
              style={styles.input}
              outlineColor={BRAND_COLORS.grayMedium}
              activeOutlineColor={EXIT_PRIMARY}
            />
          </Card.Content>
        </Card>
      </ScrollView>

      <SafeAreaView style={styles.bottomBar} edges={['bottom']}>
        <View style={styles.bottomRow}>
          <Button mode="outlined" onPress={() => router.back()} textColor={EXIT_PRIMARY} style={styles.bottomButton} disabled={saving}>
            Volver
          </Button>
          {inspection.exitStatus === 'completed' ? (
            <Button mode="text" onPress={handleDeleteExit} textColor={BRAND_COLORS.error} style={styles.bottomButton} disabled={saving}>
              Borrar salida
            </Button>
          ) : null}
          <Button mode="contained" onPress={handleSave} buttonColor={EXIT_PRIMARY} style={styles.bottomButton} loading={saving} disabled={saving}>
            Guardar salida
          </Button>
        </View>
      </SafeAreaView>
    </SafeAreaView>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value || '—'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: EXIT_PRIMARY,
  },
  scrollView: {
    flex: 1,
    backgroundColor: BRAND_COLORS.surface,
  },
  scrollContent: {
    paddingBottom: 120,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: BRAND_COLORS.surface,
    padding: SPACING.xl,
  },
  loadingText: {
    marginTop: SPACING.md,
    color: BRAND_COLORS.grayText,
  },
  header: {
    paddingVertical: SPACING.lg,
    paddingHorizontal: SPACING.lg,
    alignItems: 'center',
    gap: SPACING.xs,
  },
  backBtn: {
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
    fontSize: TYPOGRAPHY.sizes.xl,
    fontWeight: TYPOGRAPHY.weights.bold as any,
  },
  headerSubtitle: {
    color: 'rgba(255,255,255,0.82)',
    fontSize: TYPOGRAPHY.sizes.sm,
    textAlign: 'center',
  },
  card: {
    marginHorizontal: SPACING.lg,
    marginTop: SPACING.lg,
    borderRadius: BORDER_RADIUS.xl,
    backgroundColor: 'white',
    ...SHADOWS.card,
  },
  sectionTitle: {
    color: EXIT_PRIMARY,
    fontSize: TYPOGRAPHY.sizes.lg,
    fontWeight: TYPOGRAPHY.weights.bold as any,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  collapsibleTitleRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  sectionCounter: {
    color: BRAND_COLORS.grayText,
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: TYPOGRAPHY.weights.semibold as any,
  },
  divider: {
    marginVertical: SPACING.sm,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: SPACING.xs + 2,
    gap: SPACING.md,
  },
  infoLabel: {
    flex: 0.45,
    color: BRAND_COLORS.grayText,
    textTransform: 'uppercase',
    fontSize: TYPOGRAPHY.sizes.sm,
    letterSpacing: 0.5,
  },
  infoValue: {
    flex: 0.55,
    color: BRAND_COLORS.grayDark,
    fontSize: TYPOGRAPHY.sizes.md,
    textAlign: 'right',
    fontWeight: TYPOGRAPHY.weights.semibold as any,
  },
  input: {
    marginTop: SPACING.sm,
    backgroundColor: 'white',
  },
  blockCard: {
    borderWidth: 1,
    borderColor: BRAND_COLORS.grayLight,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    backgroundColor: '#fcfffd',
  },
  blockHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: SPACING.sm,
  },
  blockInfo: {
    flex: 1,
  },
  blockCardChecked: {
    borderColor: '#86efac',
    backgroundColor: '#f0fdf4',
  },
  blockTitle: {
    flex: 1,
    color: BRAND_COLORS.grayDark,
    fontSize: TYPOGRAPHY.sizes.md,
    fontWeight: TYPOGRAPHY.weights.bold as any,
  },
  blockParagraph: {
    color: BRAND_COLORS.grayDark,
    marginTop: SPACING.xs,
  },
  entryPhotosSection: {
    marginTop: SPACING.md,
    gap: SPACING.sm,
  },
  entryPhotosTitle: {
    color: BRAND_COLORS.grayText,
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: TYPOGRAPHY.weights.semibold as any,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  entryPhotosRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  entryPhoto: {
    width: 94,
    height: 94,
    borderRadius: BORDER_RADIUS.lg,
    backgroundColor: BRAND_COLORS.grayLight,
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  reviewPhotoWrapper: {
    marginTop: SPACING.md,
    alignItems: 'center',
  },
  reviewPhoto: {
    width: '100%',
    height: 220,
    borderRadius: BORDER_RADIUS.xl,
    backgroundColor: BRAND_COLORS.grayLight,
  },
  verifyButton: {
    minWidth: 96,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.sm,
    borderRadius: BORDER_RADIUS.xl,
    borderWidth: 1.5,
    borderColor: BRAND_COLORS.grayMedium,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'white',
  },
  verifyButtonActive: {
    backgroundColor: EXIT_PRIMARY,
    borderColor: EXIT_PRIMARY,
  },
  verifyText: {
    marginTop: 4,
    color: BRAND_COLORS.grayDark,
    fontSize: TYPOGRAPHY.sizes.xs,
    fontWeight: TYPOGRAPHY.weights.bold as any,
  },
  verifyTextActive: {
    color: 'white',
  },
  checkDetailArea: {
    marginTop: SPACING.md,
    gap: SPACING.sm,
  },
  checkDetailRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    alignItems: 'stretch',
  },
  photoPreviewBox: {
    width: 88,
    position: 'relative',
  },
  photoPreviewThumb: {
    width: 88,
    height: 88,
    borderRadius: BORDER_RADIUS.lg,
    backgroundColor: BRAND_COLORS.grayLight,
  },
  removePhotoBtn: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addPhotoBtn: {
    width: 88,
    height: 88,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1.5,
    borderColor: '#86efac',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f0fdf4',
    gap: 4,
  },
  addPhotoText: {
    color: EXIT_PRIMARY,
    fontSize: TYPOGRAPHY.sizes.xs,
    fontWeight: TYPOGRAPHY.weights.bold as any,
  },
  commentInput: {
    flex: 1,
    backgroundColor: 'white',
  },
  inlineActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  smallChip: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 6,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: '#e2e8f0',
  },
  smallChipActive: {
    backgroundColor: '#dcfce7',
  },
  smallChipDanger: {
    backgroundColor: '#fee2e2',
  },
  smallChipText: {
    color: BRAND_COLORS.grayDark,
    fontSize: TYPOGRAPHY.sizes.xs,
    fontWeight: TYPOGRAPHY.weights.bold as any,
  },
  smallChipTextActive: {
    color: BRAND_COLORS.grayDark,
  },
  row: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  rowInput: {
    flex: 1,
  },
  availabilityRow: {
    marginTop: SPACING.sm,
    gap: SPACING.sm,
  },
  availabilityLabel: {
    color: BRAND_COLORS.grayText,
    fontSize: TYPOGRAPHY.sizes.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  availabilityButtons: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  helperText: {
    color: BRAND_COLORS.grayText,
    fontSize: TYPOGRAPHY.sizes.sm,
    marginTop: SPACING.xs,
  },
  photoActions: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  photoButton: {
    flex: 1,
  },
  generalPhotosGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: SPACING.sm,
  },
  generalPhotoCardWrapper: {
    width: '48%',
    marginBottom: SPACING.sm,
  },
  generalPhotoCard: {
    borderRadius: BORDER_RADIUS.lg,
    ...SHADOWS.small,
  },
  generalPhotoCardContent: {
    position: 'relative',
  },
  generalPhotoTitle: {
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: TYPOGRAPHY.weights.bold as any,
    marginBottom: SPACING.sm,
    color: EXIT_PRIMARY,
  },
  generalPhotoPreview: {
    width: '100%',
    height: 140,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 2,
    borderColor: '#86efac',
  },
  photoContainerInner: {
    alignItems: 'center',
  },
  photoHint: {
    fontSize: TYPOGRAPHY.sizes.xs,
    fontWeight: TYPOGRAPHY.weights.medium as any,
    marginTop: SPACING.xs,
    color: EXIT_PRIMARY,
  },
  photoPlaceholder: {
    width: '100%',
    height: 140,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: BRAND_COLORS.grayLight,
    borderWidth: 2,
    borderColor: BRAND_COLORS.grayMedium,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoPlaceholderText: {
    color: BRAND_COLORS.grayText,
    fontSize: TYPOGRAPHY.sizes.xs,
    marginTop: SPACING.xs,
  },
  checkIndicator: {
    position: 'absolute',
    top: 0,
    right: 0,
  },
  bottomBar: {
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: BRAND_COLORS.grayLight,
  },
  bottomRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    padding: SPACING.md,
  },
  bottomButton: {
    flex: 1,
  },
  inlineButton: {
    marginTop: SPACING.md,
  },
  emptyText: {
    color: BRAND_COLORS.grayText,
    textAlign: 'center',
  },
});
