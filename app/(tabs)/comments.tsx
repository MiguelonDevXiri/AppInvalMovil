import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Button, Card, Divider, Text, TextInput } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import PhotoCapture from '../../components/PhotoCapture';
import { BORDER_RADIUS, BRAND_COLORS, GRADIENTS, SHADOWS, SPACING, TYPOGRAPHY } from '../../constants/Colors';
import { CommentWithPhoto, getMachineById, Machine, saveMachineComments } from '../../utils/storage';

export default function CommentsScreen() {
  const { machineId, returnTo: returnToParam } = useLocalSearchParams();
  const returnTo = typeof returnToParam === 'string' ? returnToParam : Array.isArray(returnToParam) ? returnToParam[0] : undefined;
  const [machine, setMachine] = useState<Machine | null>(null);
  const [comments, setComments] = useState<CommentWithPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [savingText, setSavingText] = useState('Guardando comentarios...');

  useEffect(() => {
    const loadMachine = async () => {
      try {
        if (!machineId) return;
        setLoading(true);
        const foundMachine = await getMachineById(machineId.toString());
        if (foundMachine) {
          setMachine(foundMachine);
          if (foundMachine.commentsWithPhotos && foundMachine.commentsWithPhotos.length > 0) {
            setComments(foundMachine.commentsWithPhotos);
          } else {
            setComments([]);
          }
        }
        setLoading(false);
      } catch (error) {
        console.error('Error al cargar los datos de la máquina:', error);
        setLoading(false);
      }
    };
    loadMachine();
  }, [machineId]);

  const addNewComment = () => {
    const newComment: CommentWithPhoto = { id: Date.now().toString(), text: '', photoUri: null };
    setComments([...comments, newComment]);
  };

  const updateCommentText = (id: string, text: string) => {
    setComments(comments.map(c => c.id === id ? { ...c, text } : c));
  };

  const updateCommentPhoto = (id: string, uri: string) => {
    setComments(comments.map(c => c.id === id ? { ...c, photoUri: uri } : c));
  };

  const removeComment = (id: string) => {
    Alert.alert('Eliminar comentario', '¿Estás seguro de que quieres eliminar este comentario?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: () => setComments(comments.filter(c => c.id !== id)) },
    ]);
  };

  const handleSaveComments = async () => {
    try {
      if (!machineId || !machine) return;
      setSavingText('Guardando comentarios...');
      setIsSaving(true);
      let fullCommentsText = '=== COMENTARIOS ESPECÍFICOS ===\n\n';
      if (comments.length > 0) {
        comments.forEach((comment, index) => {
          fullCommentsText += `#${index + 1}: ${comment.text}\n`;
          if (comment.photoUri) fullCommentsText += `[Foto adjunta: ${comment.id}]\n`;
          fullCommentsText += '\n';
        });
      } else {
        fullCommentsText += 'No se añadieron comentarios específicos.\n';
      }
      const saved = await saveMachineComments(machineId.toString(), fullCommentsText, comments);
      if (!saved) throw new Error('No se pudieron guardar los comentarios');
      setIsSaving(false);
      if (returnTo) {
        if (router.canGoBack()) {
          router.back();
        } else {
          router.replace({ pathname: returnTo as any, params: { machineId: machineId.toString() } });
        }
        return;
      }
      setSavingText('Abriendo fotos generales...');
      router.push({ pathname: '/photos', params: { machineId: machineId.toString() } });
    } catch (error) {
      console.error('Error al guardar los comentarios:', error);
      setIsSaving(false);
      Alert.alert('Error', 'Error al guardar los comentarios. Inténtalo de nuevo.');
    }
  };

  if (loading || !machine) {
    return (
      <SafeAreaView style={styles.loadingContainer} edges={['top', 'bottom']}>
        <Text style={styles.loadingText}>Cargando datos...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <LinearGradient
          colors={GRADIENTS.primary as unknown as [string, string, ...string[]]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.headerGradient}
        >
          <TouchableOpacity onPress={() => router.back()} style={{position:'absolute',left:12,top:12,zIndex:10,width:36,height:36,borderRadius:18,backgroundColor:'rgba(255,255,255,0.2)',justifyContent:'center',alignItems:'center'}}>
            <MaterialCommunityIcons name="arrow-left" size={22} color="white" />
          </TouchableOpacity>
          <MaterialCommunityIcons name="comment-text-outline" size={24} color="rgba(255,255,255,0.7)" />
          <Text style={styles.headerTitle}>Comentarios y Fotos</Text>
          <Text style={styles.headerSubtitle}>
            Añade comentarios específicos con fotos para documentar detalles importantes
          </Text>
        </LinearGradient>

        <Card style={styles.infoCard}>
          <Card.Content style={styles.infoContent}>
            <MaterialCommunityIcons name="cog" size={20} color={BRAND_COLORS.primaryBlue} />
            <View style={styles.infoTextContainer}>
              <Text style={styles.infoName}>{machine.name}</Text>
              <Text style={styles.infoDetail}>Cliente: {machine.clientName}</Text>
              {machine.brand && <Text style={styles.infoDetail}>Marca: {machine.brand} {machine.model ? `- ${machine.model}` : ''}</Text>}
            </View>
          </Card.Content>
        </Card>

        {comments.length > 0 ? (
          comments.map((comment, index) => (
            <Card key={comment.id} style={styles.commentCard}>
              <Card.Content>
                <View style={styles.commentHeader}>
                  <Text style={styles.commentTitle}>Comentario #{index + 1}</Text>
                  <Button
                    icon="delete"
                    mode="text"
                    onPress={() => removeComment(comment.id)}
                    textColor={BRAND_COLORS.error}
                    compact
                  >
                    Eliminar
                  </Button>
                </View>
                <TextInput
                  label="Texto del comentario"
                  value={comment.text}
                  onChangeText={(text) => updateCommentText(comment.id, text)}
                  multiline
                  style={styles.commentInput}
                  mode="outlined"
                  outlineColor={BRAND_COLORS.grayMedium}
                  activeOutlineColor={BRAND_COLORS.primaryBlue}
                />
                <PhotoCapture
                  title="Foto del comentario"
                  description="Añade una foto relacionada con este comentario"
                  photoUri={comment.photoUri}
                  onPhotoTaken={(uri: string) => updateCommentPhoto(comment.id, uri)}
                />
              </Card.Content>
            </Card>
          ))
        ) : (
          <Card style={styles.emptyCard}>
            <Card.Content style={styles.emptyContent}>
              <MaterialCommunityIcons name="comment-plus-outline" size={40} color={BRAND_COLORS.grayMedium} />
              <Text style={styles.emptyText}>No hay comentarios. Pulsa Añadir para agregar uno.</Text>
            </Card.Content>
          </Card>
        )}

        <Button
          mode="outlined"
          onPress={addNewComment}
          disabled={isSaving}
          style={styles.addButton}
          icon="plus"
          textColor={BRAND_COLORS.primaryBlue}
        >
          Añadir Comentario
        </Button>
      </ScrollView>

      <SafeAreaView style={styles.buttonSafeArea} edges={['bottom']}>
        <View style={styles.buttonContainer}>
          <Button
            mode="outlined"
            onPress={() => router.back()}
            disabled={isSaving}
            style={styles.button}
            icon="arrow-left"
            textColor={BRAND_COLORS.primaryBlue}
          >
            Volver
          </Button>
          <Button
            mode="contained"
            onPress={handleSaveComments}
            disabled={isSaving}
            style={styles.button}
            icon="check"
            contentStyle={{ flexDirection: 'row-reverse' }}
            buttonColor={BRAND_COLORS.primaryBlue}
          >
            Guardar
          </Button>
        </View>
      </SafeAreaView>
      {isSaving && (
        <View style={styles.savingOverlay}>
          <View style={styles.savingCard}>
            <ActivityIndicator size="large" color={BRAND_COLORS.primaryBlue} />
            <Text style={styles.savingTitle}>{savingText}</Text>
            <Text style={styles.savingSubtitle}>Espera un momento, estamos preparando la siguiente pantalla.</Text>
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
  loadingText: {
    color: BRAND_COLORS.grayText,
  },
  headerGradient: {
    padding: SPACING.lg,
    paddingTop: SPACING.md,
    alignItems: 'center',
  },
  headerTitle: {
    color: 'white',
    fontSize: TYPOGRAPHY.sizes.xl,
    fontWeight: TYPOGRAPHY.weights.bold as any,
    marginTop: SPACING.sm,
  },
  headerSubtitle: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: TYPOGRAPHY.sizes.sm,
    textAlign: 'center',
    marginTop: SPACING.xs,
  },
  infoCard: {
    margin: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    ...SHADOWS.small,
  },
  infoContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoTextContainer: {
    marginLeft: SPACING.sm,
    flex: 1,
  },
  infoName: {
    fontSize: TYPOGRAPHY.sizes.md,
    fontWeight: TYPOGRAPHY.weights.bold as any,
    color: '#1e293b',
  },
  infoDetail: {
    fontSize: TYPOGRAPHY.sizes.sm,
    color: BRAND_COLORS.grayText,
  },
  commentCard: {
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.sm,
    borderRadius: BORDER_RADIUS.lg,
    borderLeftWidth: 3,
    borderLeftColor: BRAND_COLORS.primaryOrange,
    ...SHADOWS.small,
  },
  commentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  commentTitle: {
    fontSize: TYPOGRAPHY.sizes.md,
    fontWeight: TYPOGRAPHY.weights.semibold as any,
    color: BRAND_COLORS.primaryBlue,
  },
  commentInput: {
    backgroundColor: 'white',
    marginBottom: SPACING.sm,
  },
  emptyCard: {
    margin: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    backgroundColor: BRAND_COLORS.grayLight,
  },
  emptyContent: {
    alignItems: 'center',
    paddingVertical: SPACING.lg,
  },
  emptyText: {
    textAlign: 'center',
    fontStyle: 'italic',
    color: BRAND_COLORS.grayText,
    marginTop: SPACING.sm,
  },
  addButton: {
    marginHorizontal: SPACING.md,
    marginTop: SPACING.xs,
    borderColor: BRAND_COLORS.primaryBlue,
    borderRadius: BORDER_RADIUS.md,
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
  button: {
    flex: 1,
    marginHorizontal: SPACING.sm,
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
  savingSubtitle: {
    marginTop: SPACING.sm,
    fontSize: TYPOGRAPHY.sizes.sm,
    color: BRAND_COLORS.grayText,
    textAlign: 'center',
  },
});
