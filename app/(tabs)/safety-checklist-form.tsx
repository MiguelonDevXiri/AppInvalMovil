import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { Button, Card, Divider, Text, TextInput } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  BORDER_RADIUS,
  BRAND_COLORS,
  SHADOWS,
  SPACING,
  TYPOGRAPHY,
} from '../../constants/Colors';
import { getMachineById, saveMachineSafetyChecklist } from '../../utils/storage';
import {
  createEmptySafetyChecklist,
  getFireWorkTypeLabel,
  parseSafetyChecklist,
  SAFETY_CHECKLIST_MODULE_CONFIG,
  type SafetyChecklist,
  type SafetyChecklistModuleKey,
} from '../../utils/safetyChecklist';

const MODULE_CONFIG = SAFETY_CHECKLIST_MODULE_CONFIG;
type ModuleKey = SafetyChecklistModuleKey;

const FIRE_WORK_OPTIONS = ['soldadura', 'radial', 'chispa', 'calor', 'otros'] as const;

const getParamString = (value: unknown): string => {
  if (Array.isArray(value)) {
    return typeof value[0] === 'string' ? value[0] : '';
  }

  return typeof value === 'string' ? value : '';
};

function ChoicePill({
  label,
  active,
  activeColor,
  onPress,
}: {
  label: string;
  active: boolean;
  activeColor: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      style={[
        styles.choicePill,
        active && { backgroundColor: activeColor, borderColor: activeColor },
      ]}
    >
      <Text style={[styles.choicePillText, active && styles.choicePillTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

function BooleanField({
  label,
  value,
  accent,
  onChange,
}: {
  label: string;
  value: boolean | null;
  accent: string;
  onChange: (nextValue: boolean | null) => void;
}) {
  return (
    <View style={styles.booleanField}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.booleanChoices}>
        <ChoicePill
          label="Sí"
          active={value === true}
          activeColor={accent}
          onPress={() => onChange(value === true ? null : true)}
        />
        <ChoicePill
          label="No"
          active={value === false}
          activeColor={accent}
          onPress={() => onChange(value === false ? null : false)}
        />
      </View>
    </View>
  );
}

function SectionTitle({ icon, title, accent }: { icon: string; title: string; accent: string }) {
  return (
    <View style={styles.sectionTitleRow}>
      <MaterialCommunityIcons name={icon as any} size={20} color={accent} />
      <Text style={[styles.sectionTitle, { color: accent }]}>{title}</Text>
    </View>
  );
}

export default function SafetyChecklistFormScreen() {
  const params = useLocalSearchParams();
  const moduleKey = (getParamString(params.module) as ModuleKey) || 'averia';
  const config = MODULE_CONFIG[moduleKey] || MODULE_CONFIG.averia;
  const machineId = getParamString(params.machineId);
  const nextPathParam = getParamString(params.nextPath);
  const returnTo = getParamString(params.returnTo);

  const [checklist, setChecklist] = useState<SafetyChecklist>(() => createEmptySafetyChecklist(config.mode));
  const [loading, setLoading] = useState(moduleKey === 'inspection');
  const [saving, setSaving] = useState(false);

  const isFireOnly = config.mode === 'fire-only';

  useEffect(() => {
    let cancelled = false;

    const loadChecklist = async () => {
      try {
        const paramChecklist = getParamString(params.safetyChecklist);
        if (paramChecklist) {
          if (!cancelled) {
            setChecklist(parseSafetyChecklist(paramChecklist, config.mode));
            setLoading(false);
          }
          return;
        }

        if (moduleKey === 'inspection' && machineId) {
          const machine = await getMachineById(machineId);
          if (!cancelled) {
            setChecklist(parseSafetyChecklist(machine?.safetyChecklist, config.mode));
          }
        }
      } catch (error) {
        console.error('No se pudo cargar el checklist de seguridad:', error);
        if (!cancelled) {
          setChecklist(createEmptySafetyChecklist(config.mode));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadChecklist();

    return () => {
      cancelled = true;
    };
  }, [config.mode, machineId, moduleKey, params.safetyChecklist]);

  const fireSelectedLabels = useMemo(() => {
    return checklist.fire.workTypes.map((value) => getFireWorkTypeLabel(value));
  }, [checklist.fire.workTypes]);

  const updateFire = <K extends keyof SafetyChecklist['fire']>(key: K, value: SafetyChecklist['fire'][K]) => {
    setChecklist((current) => ({
      ...current,
      fire: {
        ...current.fire,
        [key]: value,
      },
    }));
  };

  const updateElectrical = <K extends keyof NonNullable<SafetyChecklist['electrical']>>(
    key: K,
    value: NonNullable<SafetyChecklist['electrical']>[K]
  ) => {
    setChecklist((current) => ({
      ...current,
      electrical: {
        ...(current.electrical || createEmptySafetyChecklist('full').electrical!),
        [key]: value,
      },
    }));
  };

  const updateEntrapment = <K extends keyof NonNullable<SafetyChecklist['entrapment']>>(
    key: K,
    value: NonNullable<SafetyChecklist['entrapment']>[K]
  ) => {
    setChecklist((current) => ({
      ...current,
      entrapment: {
        ...(current.entrapment || createEmptySafetyChecklist('full').entrapment!),
        [key]: value,
      },
    }));
  };

  const toggleFireWorkType = (type: string) => {
    setChecklist((current) => {
      const exists = current.fire.workTypes.includes(type);
      return {
        ...current,
        fire: {
          ...current.fire,
          workTypes: exists
            ? current.fire.workTypes.filter((item) => item !== type)
            : [...current.fire.workTypes, type],
        },
      };
    });
  };

  const validateChecklist = () => {
    if (checklist.fire.hasRisk === null) {
      Alert.alert('Checklist incompleto', 'Indica si existe riesgo de incendio antes de continuar.');
      return false;
    }

    if (!isFireOnly) {
      if (checklist.electrical?.hasRisk === null) {
        Alert.alert('Checklist incompleto', 'Indica si existe riesgo eléctrico antes de continuar.');
        return false;
      }

      if (checklist.entrapment?.hasRisk === null) {
        Alert.alert('Checklist incompleto', 'Indica si existe riesgo de atrapamiento o puesta en marcha inesperada.');
        return false;
      }
    }

    return true;
  };

  const handleContinue = async () => {
    if (!validateChecklist()) return;

    const nextChecklist: SafetyChecklist = {
      ...checklist,
      mode: config.mode,
      completedAt: new Date().toISOString(),
    };

    try {
      setSaving(true);

      if (moduleKey === 'inspection') {
        if (!machineId) {
          Alert.alert('Error', 'No se ha encontrado la inspección que se está creando.');
          return;
        }

        await saveMachineSafetyChecklist(machineId, nextChecklist);

        if (returnTo) {
          if (router.canGoBack()) {
            router.back();
          } else {
            router.replace({ pathname: returnTo as any, params: { machineId } });
          }
          return;
        }

        const nextPath = nextPathParam || '/checklist';
        router.push({ pathname: nextPath as any, params: { machineId } });
        return;
      }

      const nextPath = config.nextPath;
      if (!nextPath) {
        Alert.alert('Error', 'No se ha encontrado el siguiente paso del formulario.');
        return;
      }

      router.push({
        pathname: nextPath as any,
        params: {
          ...params,
          safetyChecklist: JSON.stringify(nextChecklist),
        },
      });
    } catch (error) {
      console.error('Error al guardar el checklist de seguridad:', error);
      Alert.alert('Error', 'No se pudo guardar la seguridad previa. Inténtalo de nuevo.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingSafeArea} edges={['top', 'bottom']}>
        <ActivityIndicator size="large" color={config.accent} />
        <Text style={styles.loadingText}>Cargando seguridad previa...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: config.accent }]} edges={['top']}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <LinearGradient
            colors={config.gradient as any}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.headerGradient}
          >
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
              <MaterialCommunityIcons name="arrow-left" size={22} color="white" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>{config.title}</Text>
            <Text style={styles.headerSubtitle}>{config.subtitle}</Text>
          </LinearGradient>

          <Card style={styles.card}>
            <Card.Content>
              <SectionTitle icon="fire-alert" title="Riesgo de incendio" accent={config.accent} />
              <Divider style={styles.divider} />
              <BooleanField
                label="¿Hay riesgo por soldadura, radial, chispa, calor u otro trabajo similar?"
                value={checklist.fire.hasRisk}
                accent={config.accent}
                onChange={(value) => updateFire('hasRisk', value)}
              />

              {checklist.fire.hasRisk === true && (
                <>
                  <View style={styles.fieldBlock}>
                    <Text style={styles.fieldLabel}>Tipo de herramienta / trabajo</Text>
                    <View style={styles.chipsWrap}>
                      {FIRE_WORK_OPTIONS.map((item) => (
                        <ChoicePill
                          key={item}
                          label={getFireWorkTypeLabel(item)}
                          active={checklist.fire.workTypes.includes(item)}
                          activeColor={config.accent}
                          onPress={() => toggleFireWorkType(item)}
                        />
                      ))}
                    </View>
                    {fireSelectedLabels.length > 0 && (
                      <Text style={styles.helperText}>Seleccionado: {fireSelectedLabels.join(', ')}</Text>
                    )}
                  </View>

                  {checklist.fire.workTypes.includes('otros') && (
                    <TextInput
                      label="Otros trabajos similares"
                      value={checklist.fire.otherWorkType}
                      onChangeText={(value) => updateFire('otherWorkType', value)}
                      style={styles.input}
                      mode="outlined"
                      outlineColor={BRAND_COLORS.grayMedium}
                      activeOutlineColor={config.accent}
                      placeholder="Describe el trabajo que genera el riesgo"
                    />
                  )}

                  <TextInput
                    label="Motivo del riesgo"
                    value={checklist.fire.riskReason}
                    onChangeText={(value) => updateFire('riskReason', value)}
                    style={styles.input}
                    mode="outlined"
                    outlineColor={BRAND_COLORS.grayMedium}
                    activeOutlineColor={config.accent}
                    multiline
                    numberOfLines={3}
                    placeholder="Qué se va a hacer y dónde está el riesgo"
                  />

                  <BooleanField
                    label="¿Hay material inflamable cerca?"
                    value={checklist.fire.flammableMaterialNearby}
                    accent={config.accent}
                    onChange={(value) => updateFire('flammableMaterialNearby', value)}
                  />
                  <BooleanField
                    label="¿La zona está limpia?"
                    value={checklist.fire.areaClean}
                    accent={config.accent}
                    onChange={(value) => updateFire('areaClean', value)}
                  />
                  <BooleanField
                    label="¿Se han retirado combustibles?"
                    value={checklist.fire.combustiblesRemoved}
                    accent={config.accent}
                    onChange={(value) => updateFire('combustiblesRemoved', value)}
                  />
                  <BooleanField
                    label="¿Hay extintor cerca?"
                    value={checklist.fire.extinguisherNearby}
                    accent={config.accent}
                    onChange={(value) => updateFire('extinguisherNearby', value)}
                  />
                  <BooleanField
                    label="¿Es seguro trabajar?"
                    value={checklist.fire.safeToWork}
                    accent={config.accent}
                    onChange={(value) => updateFire('safeToWork', value)}
                  />
                </>
              )}
            </Card.Content>
          </Card>

          {!isFireOnly && (
            <Card style={styles.card}>
              <Card.Content>
                <SectionTitle icon="flash-alert" title="Riesgo eléctrico" accent={config.accent} />
                <Divider style={styles.divider} />
                <BooleanField
                  label="¿Hay riesgo eléctrico?"
                  value={checklist.electrical?.hasRisk ?? null}
                  accent={config.accent}
                  onChange={(value) => updateElectrical('hasRisk', value)}
                />

                {checklist.electrical?.hasRisk === true && (
                  <>
                    <BooleanField
                      label="¿Se puede cortar la corriente?"
                      value={checklist.electrical.canCutPower}
                      accent={config.accent}
                      onChange={(value) => updateElectrical('canCutPower', value)}
                    />
                    <BooleanField
                      label="¿Se ha cortado la corriente?"
                      value={checklist.electrical.powerCut}
                      accent={config.accent}
                      onChange={(value) => updateElectrical('powerCut', value)}
                    />
                    <BooleanField
                      label="¿Se ha verificado ausencia de tensión?"
                      value={checklist.electrical.absenceOfVoltageVerified}
                      accent={config.accent}
                      onChange={(value) => updateElectrical('absenceOfVoltageVerified', value)}
                    />
                    <BooleanField
                      label="¿Hay elementos energizados cerca?"
                      value={checklist.electrical.energizedElementsNearby}
                      accent={config.accent}
                      onChange={(value) => updateElectrical('energizedElementsNearby', value)}
                    />
                  </>
                )}
              </Card.Content>
            </Card>
          )}

          {!isFireOnly && (
            <Card style={styles.card}>
              <Card.Content>
                <SectionTitle icon="cog-outline" title="Atrapamiento / puesta en marcha" accent={config.accent} />
                <Divider style={styles.divider} />
                <BooleanField
                  label="¿Hay riesgo de atrapamiento o puesta en marcha inesperada?"
                  value={checklist.entrapment?.hasRisk ?? null}
                  accent={config.accent}
                  onChange={(value) => updateEntrapment('hasRisk', value)}
                />

                {checklist.entrapment?.hasRisk === true && (
                  <>
                    <BooleanField
                      label="¿Se ha aplicado bloqueo?"
                      value={checklist.entrapment.lockoutApplied}
                      accent={config.accent}
                      onChange={(value) => updateEntrapment('lockoutApplied', value)}
                    />
                    <BooleanField
                      label="¿Se ha usado candado de seguridad?"
                      value={checklist.entrapment.safetyPadlockUsed}
                      accent={config.accent}
                      onChange={(value) => updateEntrapment('safetyPadlockUsed', value)}
                    />
                    <BooleanField
                      label="¿La intervención está señalizada?"
                      value={checklist.entrapment.interventionSignaled}
                      accent={config.accent}
                      onChange={(value) => updateEntrapment('interventionSignaled', value)}
                    />
                  </>
                )}
              </Card.Content>
            </Card>
          )}

          {!isFireOnly && (
            <Card style={styles.card}>
              <Card.Content>
                <SectionTitle icon="text-box-outline" title="Otros riesgos / observaciones" accent={config.accent} />
                <Divider style={styles.divider} />
                <TextInput
                  label="Otros riesgos u observaciones"
                  value={checklist.otherRisksNotes}
                  onChangeText={(value) => setChecklist((current) => ({ ...current, otherRisksNotes: value }))}
                  style={styles.input}
                  mode="outlined"
                  outlineColor={BRAND_COLORS.grayMedium}
                  activeOutlineColor={config.accent}
                  multiline
                  numberOfLines={4}
                  placeholder="Algo a tener en cuenta antes de intervenir"
                />
              </Card.Content>
            </Card>
          )}
        </ScrollView>

        <SafeAreaView style={styles.buttonSafeArea} edges={['bottom']}>
          <View style={styles.buttonContainer}>
            <Button
              mode="outlined"
              style={styles.navBtn}
              onPress={() => router.back()}
              disabled={saving}
              icon="arrow-left"
              textColor={config.accent}
            >
              Volver
            </Button>
            <Button
              mode="contained"
              style={styles.navBtn}
              onPress={handleContinue}
              disabled={saving}
              loading={saving}
              icon="arrow-right"
              contentStyle={{ flexDirection: 'row-reverse' }}
              buttonColor={config.accent}
            >
              {saving ? 'Guardando...' : 'Continuar'}
            </Button>
          </View>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  loadingSafeArea: {
    flex: 1,
    backgroundColor: BRAND_COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
    gap: SPACING.md,
  },
  loadingText: {
    color: BRAND_COLORS.grayText,
    fontSize: TYPOGRAPHY.sizes.sm,
  },
  safeArea: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
    backgroundColor: BRAND_COLORS.surface,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  headerGradient: {
    padding: SPACING.lg,
    alignItems: 'center',
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
    fontSize: TYPOGRAPHY.sizes.xl,
    fontWeight: TYPOGRAPHY.weights.bold as any,
    color: 'white',
  },
  headerSubtitle: {
    fontSize: TYPOGRAPHY.sizes.sm,
    color: 'rgba(255,255,255,0.82)',
    marginTop: SPACING.xs,
    textAlign: 'center',
  },
  card: {
    margin: SPACING.md,
    marginBottom: SPACING.sm,
    borderRadius: BORDER_RADIUS.lg,
    ...SHADOWS.small,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  sectionTitle: {
    fontSize: TYPOGRAPHY.sizes.md,
    fontWeight: TYPOGRAPHY.weights.bold as any,
  },
  divider: {
    marginBottom: SPACING.md,
  },
  booleanField: {
    marginBottom: SPACING.md,
  },
  fieldBlock: {
    marginBottom: SPACING.md,
  },
  fieldLabel: {
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: TYPOGRAPHY.weights.bold as any,
    color: '#0f172a',
    marginBottom: SPACING.sm,
  },
  booleanChoices: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  choicePill: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: 10,
    borderRadius: BORDER_RADIUS.full,
    borderWidth: 1,
    borderColor: BRAND_COLORS.grayMedium,
    backgroundColor: 'white',
  },
  choicePillText: {
    fontSize: TYPOGRAPHY.sizes.sm,
    color: BRAND_COLORS.grayText,
    fontWeight: TYPOGRAPHY.weights.bold as any,
  },
  choicePillTextActive: {
    color: 'white',
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  helperText: {
    fontSize: TYPOGRAPHY.sizes.xs,
    color: BRAND_COLORS.grayText,
    marginTop: SPACING.xs,
  },
  input: {
    marginBottom: SPACING.sm,
    backgroundColor: 'white',
  },
  buttonSafeArea: {
    backgroundColor: 'white',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: SPACING.md,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: BRAND_COLORS.grayMedium,
    ...SHADOWS.medium,
  },
  navBtn: {
    flex: 1,
    marginHorizontal: SPACING.xs,
    borderRadius: BORDER_RADIUS.md,
  },
});
