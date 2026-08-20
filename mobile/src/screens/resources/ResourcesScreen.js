import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, FlatList, RefreshControl, Text, TouchableOpacity, ActivityIndicator, Modal, KeyboardAvoidingView, Platform, ScrollView, Alert, Linking } from 'react-native';
import { Library, Plus, FileText, Image as ImageIcon, Video, Music, ExternalLink, X, Download } from 'lucide-react-native';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as WebBrowser from 'expo-web-browser';
import { getResources, createResource, deleteResource } from '../../api/resources';
import client from '../../api/client';
import { Header } from '../../components/ui/Header';
import { PageHeading } from '../../components/ui/PageHeading';
import { EmptyState } from '../../components/ui/EmptyState';
import { QueryState } from '../../components/ui/QueryState';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Field } from '../../components/ui/Field';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, typography, spacing, radii } from '../../theme/theme';

const ResourceIcon = ({ type, mimeType }) => {
  if (mimeType?.includes('image')) return <ImageIcon size={20} color={colors.secondary} />;
  if (mimeType?.includes('video')) return <Video size={20} color={colors.secondary} />;
  if (mimeType?.includes('audio')) return <Music size={20} color={colors.secondary} />;
  if (type === 'Document' || mimeType?.includes('pdf')) return <FileText size={20} color={colors.secondary} />;
  if (type === 'YouTube') return <ExternalLink size={20} color={colors.secondary} />;
  return <Library size={20} color={colors.secondary} />;
};

const ResourcesScreen = ({ route, navigation }) => {
  const insets = useSafeAreaInsets();

  // Subject context from SubjectDetailScreen
  const paramSubjectId = route?.params?.subjectId || null;
  const paramOpenCreate = route?.params?.openCreate || false;

  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // Modal State
  const [visible, setVisible] = useState(paramOpenCreate);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [url, setUrl] = useState('');
  const [subjectId, setSubjectId] = useState(paramSubjectId || '');
  const [submitting, setSubmitting] = useState(false);
  const [downloadingItems, setDownloadingItems] = useState({});

  const loadData = async () => {
    try {
      setError(null);
      const res = await getResources(paramSubjectId);
      setData(res.data || res);
    } catch (e) {
      setError('Failed to load resources.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { loadData(); }, [paramSubjectId]);

  useEffect(() => {
    if (paramOpenCreate) setVisible(true);
  }, [paramOpenCreate]);

  const onRefresh = useCallback(() => { setRefreshing(true); loadData(); }, []);

  const handleCreate = async () => {
    if (!title || !url) {
      Alert.alert('Error', 'Please enter a title and URL.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await createResource({ 
        title, 
        description, 
        url,
        subjectId: subjectId || undefined,
        resourceType: url.includes('youtube.com') ? 'YouTube' : 'Website'
      });
      setVisible(false);
      setTitle('');
      setDescription('');
      setUrl('');
      if (res.data) {
        setData(prev => [res.data, ...prev]);
      } else {
        await loadData();
      }
    } catch (e) {
      Alert.alert('Error', 'Failed to create resource.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = (id) => {
    Alert.alert('Delete Resource', 'Are you sure you want to remove this resource?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try {
          await deleteResource(id);
          setData(prev => prev.filter(item => item._id !== id && item.id !== id));
        } catch (e) {
          Alert.alert('Error', 'Failed to delete resource.');
        }
      }}
    ]);
  };

  const handleOpenResource = async (item) => {
    let targetUrl = item.url || (item.fileData && item.fileData.url);
    if (!targetUrl && item.fileData?.publicId) {
      // If it's a relative path from the backend upload
      targetUrl = `/${item.fileData.publicId}`; // Adjust if backend gives different format
    }
    
    if (!targetUrl) {
      Alert.alert('Error', 'No valid URL found for this resource.');
      return;
    }

    // Fix relative URL by appending backend URL
    if (targetUrl.startsWith('/')) {
      const baseUrl = client.defaults.baseURL.replace('/api', '');
      targetUrl = `${baseUrl}${targetUrl}`;
    }

    // Ensure http/https
    if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
      targetUrl = `https://${targetUrl}`;
    }

    const isDocument = item.resourceType === 'Document' || item.resourceType === 'file' || targetUrl.toLowerCase().endsWith('.pdf') || item.fileData?.mimeType?.includes('pdf') || item.fileData?.originalName?.toLowerCase()?.endsWith('.pdf');

    if (isDocument) {
      const itemId = item._id || item.id;
      if (downloadingItems[itemId]) return; // Prevent double download

      setDownloadingItems(prev => ({ ...prev, [itemId]: true }));
      try {
        const filename = item.fileData?.originalName || `resource_${itemId}.pdf`;
        const fileUri = `${FileSystem.documentDirectory}${filename}`;
        
        const downloadResult = await FileSystem.downloadAsync(targetUrl, fileUri);
        
        if (downloadResult.status !== 200) {
          throw new Error(`Failed to download: Status ${downloadResult.status}`);
        }

        const canShare = await Sharing.isAvailableAsync();
        if (canShare) {
          await Sharing.shareAsync(downloadResult.uri, { 
            mimeType: item.fileData?.mimeType || 'application/pdf',
            UTI: 'com.adobe.pdf',
            dialogTitle: `Open ${filename}`
          });
        } else {
          Alert.alert('Sharing Unavailable', 'Cannot open file natively. Opening in browser...');
          await Linking.openURL(targetUrl);
        }
      } catch (e) {
        console.error('Download error:', e);
        Alert.alert('Download Failed', 'Could not download or open the file. Opening in browser instead...', [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Open in Browser', onPress: () => Linking.openURL(targetUrl) }
        ]);
      } finally {
        setDownloadingItems(prev => ({ ...prev, [itemId]: false }));
      }
    } else {
      // Normal Web Link
      try {
        const supported = await Linking.canOpenURL(targetUrl);
        if (supported) {
          await Linking.openURL(targetUrl);
        } else {
          Alert.alert('Error', 'Cannot open this URL type.');
        }
      } catch (error) {
        Alert.alert('Error', 'Failed to open link.');
      }
    }
  };

  const renderItem = ({ item }) => {
    const isDocument = item.resourceType === 'Document' || item.resourceType === 'file' || item.url?.toLowerCase().endsWith('.pdf') || item.fileData?.mimeType?.includes('pdf') || item.fileData?.originalName?.toLowerCase()?.endsWith('.pdf');
    const isDownloading = downloadingItems[item._id || item.id];
    
    return (
      <TouchableOpacity 
        style={styles.card} 
        activeOpacity={0.7}
        onLongPress={() => handleDelete(item._id || item.id)}
        onPress={() => handleOpenResource(item)}
      >
        <View style={styles.cardHeader}>
          <View style={styles.iconBox}>
            <ResourceIcon type={item.resourceType} mimeType={item.fileData?.mimeType} />
          </View>
          <View style={[styles.badge, item.watched ? styles.badgeWatched : null]}>
            <Text style={[styles.badgeText, item.watched ? styles.badgeTextWatched : null]}>
              {item.watched ? 'completed' : 'to explore'}
            </Text>
          </View>
        </View>
        <Text style={styles.cardTitle}>{item.title}</Text>
        <Text style={styles.cardPreview} numberOfLines={2}>
          {item.description || 'No description added.'}
        </Text>
        
        <View style={styles.actionButtonContainer}>
          <View style={[styles.actionButton, isDownloading && styles.actionButtonDisabled]}>
            {isDownloading ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <>
                {isDocument ? <FileText size={16} color={colors.primary} /> : <ExternalLink size={16} color={colors.primary} />}
                <Text style={styles.actionText}>{isDocument ? 'Open PDF / File' : 'Open Link'}</Text>
              </>
            )}
          </View>
        </View>

        <View style={styles.cardFooter}>
          <Button variant="danger" onPress={() => handleDelete(item._id || item.id)} style={styles.deleteBtn}>
            Delete
          </Button>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Header />
      <FlatList
        data={data}
        keyExtractor={(item, idx) => item._id || item.id || idx.toString()}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        ListHeaderComponent={
          <>
            <PageHeading 
              eyebrow="A considered library" 
              title="Resources" 
              detail="Keep the best explanations close, not scattered across twenty tabs."
              action={
                <Button size="sm" onPress={() => setVisible(true)}>
                  <Plus size={16} color={colors.primaryForeground} style={{ marginRight: 6 }} /> 
                  Save resource
                </Button>
              }
            />
            <QueryState error={error} onRetry={loadData} label="Resources" />
          </>
        }
        ListEmptyComponent={
          !error && !loading ? (
            <EmptyState 
              title="Your library is empty"
              detail="Save videos, articles, docs, and problem sets as you find them."
              icon={Library}
              action={
                <Button onPress={() => setVisible(true)}>
                  <Plus size={16} color={colors.primaryForeground} style={{ marginRight: 6 }} /> 
                  Save first resource
                </Button>
              }
            />
          ) : null
        }
      />

      <Modal visible={visible} animationType="slide" transparent>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalContainer}>
          <View style={styles.modalBackdrop} />
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Save Resource</Text>
              <Button variant="quiet" style={styles.closeBtn} onPress={() => setVisible(false)}>
                <X size={20} color={colors.foreground} />
              </Button>
            </View>
            <ScrollView style={styles.modalScroll}>
              <Field label="Title">
                <Input value={title} onChangeText={setTitle} placeholder="e.g. Intro to Calculus" />
              </Field>
              <Field label="URL">
                <Input value={url} onChangeText={setUrl} placeholder="https://..." keyboardType="url" autoCapitalize="none" />
              </Field>
              <Field label="Description (Optional)">
                <Input 
                  value={description} 
                  onChangeText={setDescription} 
                  placeholder="Why is this useful?" 
                  multiline
                  style={{ minHeight: 80, alignItems: 'flex-start' }}
                  textAlignVertical="top"
                />
              </Field>
              {!paramSubjectId && (
                <Field label="Subject ID (Optional)">
                  <Input value={subjectId} onChangeText={setSubjectId} placeholder="Enter subject ID" />
                </Field>
              )}
            </ScrollView>
            <View style={[styles.modalFooter, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
              <Button variant="quiet" style={styles.modalBtn} onPress={() => setVisible(false)}>Cancel</Button>
              <Button style={styles.modalBtn} onPress={handleCreate} loading={submitting}>Save</Button>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
  listContent: { padding: spacing.lg, paddingBottom: spacing.xxl },
  card: {
    backgroundColor: colors.card,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: radii.md,
    backgroundColor: colors.accent + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    backgroundColor: colors.muted,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radii.round,
  },
  badgeWatched: {
    backgroundColor: colors.accent + '20',
  },
  badgeText: {
    fontFamily: typography.mono.regular,
    fontSize: 9,
    textTransform: 'uppercase',
    color: colors.mutedForeground,
  },
  badgeTextWatched: {
    color: colors.accent,
  },
  cardTitle: {
    fontFamily: typography.serif.medium,
    fontSize: 20,
    color: colors.foreground,
    marginBottom: spacing.xs,
  },
  cardPreview: {
    fontFamily: typography.sans.regular,
    fontSize: 14,
    color: colors.mutedForeground,
    lineHeight: 20,
    marginBottom: spacing.md,
  },
  actionButtonContainer: {
    marginBottom: spacing.sm,
    alignItems: 'flex-start',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: `${colors.primary}1A`,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.md,
  },
  actionButtonDisabled: {
    opacity: 0.7,
  },
  actionText: {
    fontFamily: typography.sans.medium,
    fontSize: 14,
    color: colors.primary,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
  },
  deleteBtn: { minHeight: 32, paddingVertical: 4, paddingHorizontal: 12 },
  modalContainer: { flex: 1, justifyContent: 'flex-end' },
  modalBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(24,32,49,0.48)' },
  modalContent: { backgroundColor: colors.card, borderTopLeftRadius: radii.xxl, borderTopRightRadius: radii.xxl, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.lg, borderBottomWidth: 1, borderBottomColor: colors.cardBorder },
  modalTitle: { fontFamily: typography.serif.medium, fontSize: 24, color: colors.foreground },
  closeBtn: { minHeight: 40, paddingHorizontal: 10, paddingVertical: 8 },
  modalScroll: { padding: spacing.lg },
  modalFooter: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.md, padding: spacing.lg, borderTopWidth: 1, borderTopColor: colors.cardBorder, backgroundColor: `${colors.muted}33` },
  modalBtn: { minWidth: 100 }
});

export default ResourcesScreen;
