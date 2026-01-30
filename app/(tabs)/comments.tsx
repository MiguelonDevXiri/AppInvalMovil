import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { Button, Card, Divider, Paragraph, TextInput, Title } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import PhotoCapture from '../../components/PhotoCapture';
import { BRAND_COLORS } from '../../constants/Colors';
import {
    CommentWithPhoto,
    getMachineById,
    Machine,
    saveMachineComments,
} from '../../utils/storage';

export default function CommentsScreen() {
  const { machineId } = useLocalSearchParams();
  const [machine, setMachine] = useState<Machine | null>(null);
  const [comments, setComments] = useState<CommentWithPhoto[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadMachine = async () => {
      try {
        if (!machineId) return;
        
        setLoading(true);
        const foundMachine = await getMachineById(machineId.toString());
        if (foundMachine) {
          setMachine(foundMachine);
          
          if (foundMachine.commentsWithPhotos && foundMachine.commentsWithPhotos.length > 0) {
            console.log('Cargando comentarios existentes:', foundMachine.commentsWithPhotos.length);
            setComments(foundMachine.commentsWithPhotos);
          } else {
            console.log('No hay comentarios previos, iniciando vacío');
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
    const newComment: CommentWithPhoto = {
      id: Date.now().toString(),
      text: '',
      photoUri: null
    };
    setComments([...comments, newComment]);
  };

  const updateCommentText = (id: string, text: string) => {
    const updatedComments = comments.map(comment => 
      comment.id === id ? { ...comment, text } : comment
    );
    setComments(updatedComments);
  };

  const updateCommentPhoto = (id: string, uri: string) => {
    const updatedComments = comments.map(comment => 
      comment.id === id ? { ...comment, photoUri: uri } : comment
    );
    setComments(updatedComments);
  };

  const removeComment = (id: string) => {
    Alert.alert(
      'Eliminar comentario',
      '¿Estás seguro de que quieres eliminar este comentario?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => {
            const updatedComments = comments.filter(comment => comment.id !== id);
            setComments(updatedComments);
          }
        }
      ]
    );
  };

  const handleSaveComments = async () => {
    try {
      if (!machineId || !machine) return;
      
      let fullCommentsText = '=== COMENTARIOS ESPECÍFICOS ===\n\n';
      
      if (comments.length > 0) {
        comments.forEach((comment, index) => {
          fullCommentsText += `#${index + 1}: ${comment.text}\n`;
          if (comment.photoUri) {
            fullCommentsText += `[Foto adjunta: ${comment.id}]\n`;
          }
          fullCommentsText += '\n';
        });
      } else {
        fullCommentsText += 'No se añadieron comentarios específicos.\n';
      }
      
      await saveMachineComments(machineId.toString(), fullCommentsText, comments);
      
      router.push({
        pathname: '/photos',
        params: { machineId: machineId.toString() }
      });
    } catch (error) {
      console.error('Error al guardar los comentarios:', error);
      Alert.alert('Error', 'Error al guardar los comentarios. Inténtalo de nuevo.');
    }
  };

  if (loading || !machine) {
    return (
      <SafeAreaView style={styles.loadingContainer} edges={['top', 'bottom']}>
        <Paragraph>Cargando datos...</Paragraph>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <Card style={styles.headerCard}>
          <Card.Content>
            <Title style={styles.headerTitle}>Comentarios y Fotos Adicionales</Title>
            <Paragraph style={styles.headerSubtitle}>
              Añade comentarios específicos con fotos para documentar detalles importantes de la máquina
            </Paragraph>
          </Card.Content>
        </Card>
        
        <Card style={styles.infoCard}>
          <Card.Content>
            <Title>{machine.name}</Title>
            <Paragraph>Cliente: {machine.clientName}</Paragraph>
            {machine.brand && <Paragraph>Marca: {machine.brand}</Paragraph>}
            {machine.model && <Paragraph>Modelo: {machine.model}</Paragraph>}
          </Card.Content>
        </Card>
        
        {comments.length > 0 ? (
          <Card style={styles.commentsCard}>
            <Card.Content>
              <Title style={styles.sectionTitle}>Comentarios Específicos</Title>
              
              {comments.map((comment, index) => (
                <View key={comment.id} style={styles.commentItem}>
                  <View style={styles.commentHeader}>
                    <Title style={styles.commentTitle}>Comentario #{index + 1}</Title>
                    <Button 
                      icon="delete" 
                      mode="text" 
                      onPress={() => removeComment(comment.id)}
                      color="#F44336"
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
                  />
                  
                  <PhotoCapture
                    title="Foto del comentario"
                    description="Añade una foto relacionada con este comentario"
                    photoUri={comment.photoUri}
                    onPhotoTaken={(uri: string) => updateCommentPhoto(comment.id, uri)}
                  />
                  
                  <Divider style={styles.divider} />
                </View>
              ))}
            </Card.Content>
          </Card>
        ) : (
          <Card style={styles.emptyCard}>
            <Card.Content>
              <Paragraph style={styles.emptyText}>
                No hay comentarios específicos. Pulsa el botón "Añadir Comentario" para agregar uno.
              </Paragraph>
            </Card.Content>
          </Card>
        )}
        
        <Button 
          mode="outlined" 
          onPress={addNewComment}
          style={styles.addButton}
          icon="plus"
        >
          Añadir Comentario
        </Button>
      </ScrollView>
      
      <SafeAreaView style={styles.buttonSafeArea} edges={['bottom']}>
        <View style={styles.buttonContainer}>
          <Button 
            mode="outlined" 
            onPress={() => router.back()}
            style={[styles.button, styles.backButton]}
            icon="arrow-left"
          >
            Volver
          </Button>
          
          <Button 
            mode="contained" 
            onPress={handleSaveComments}
            style={[styles.button, styles.nextButton]}
            icon="check"
            contentStyle={{ flexDirection: 'row-reverse' }}
          >
            Guardar
          </Button>
        </View>
      </SafeAreaView>
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
  scrollContent: {
    padding: 16,
    paddingBottom: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  headerCard: {
    marginBottom: 8,
    backgroundColor: BRAND_COLORS.primaryBlue,
  },
  headerTitle: {
    color: 'white',
    fontSize: 20,
    marginBottom: 8,
  },
  headerSubtitle: {
    color: 'white',
  },
  infoCard: {
    marginTop: 8,
    marginBottom: 8,
  },
  commentsCard: {
    marginTop: 8,
    marginBottom: 8,
  },
  emptyCard: {
    marginTop: 8,
    marginBottom: 8,
    backgroundColor: '#f9f9f9',
  },
  emptyText: {
    textAlign: 'center',
    fontStyle: 'italic',
    color: '#757575',
  },
  sectionTitle: {
    fontSize: 18,
    marginBottom: 12,
  },
  commentItem: {
    marginBottom: 16,
  },
  commentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  commentTitle: {
    fontSize: 16,
  },
  commentInput: {
    backgroundColor: 'white',
    marginBottom: 12,
  },
  divider: {
    marginTop: 8,
  },
  addButton: {
    marginTop: 0,
    borderColor: BRAND_COLORS.primaryBlue,
  },
  buttonSafeArea: {
    backgroundColor: 'white',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  button: {
    flex: 1,
    marginHorizontal: 8,
  },
  backButton: {
    borderColor: BRAND_COLORS.primaryBlue,
  },
  nextButton: {
    backgroundColor: BRAND_COLORS.primaryBlue,
  },
});