import React, { useState, useEffect, useContext } from 'react';
import { View, StyleSheet, ScrollView, Text, Image } from 'react-native';
import { AuthContext } from '../../context/AuthContext';
import { Header } from '../../components/ui/Header';
import { PageHeading } from '../../components/ui/PageHeading';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { typography, spacing, radii, useAppTheme, useStyles } from '../../theme/theme';
import { formatSemester } from '../../utils/semester';

const getInitials = (name) => {
  if (!name || typeof name !== 'string') return 'U';
  return name.trim().split(/\s+/).slice(0, 2).map(p => p[0].toUpperCase()).join('');
};

const ProfileScreen = ({ navigation }) => {
  const { colors, typography, spacing, radii } = useAppTheme();
  const styles = useStyles(createStyles);
  const { user, logout } = useContext(AuthContext);

  return (
    <View style={styles.container}>
      <Header />
      <ScrollView contentContainerStyle={styles.scroll}>
        <PageHeading 
          eyebrow="Account overview" 
          title="Profile" 
          detail="Your personal profile details."
        />

        <Card style={styles.card}>
          <View style={styles.profileHeader}>
            <View style={styles.avatarWrapper}>
              {user?.profileImageUrl ? (
                <Image source={{ uri: user.profileImageUrl }} style={styles.avatarImage} />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Text style={styles.avatarText}>{getInitials(user?.name)}</Text>
                </View>
              )}
            </View>
            <View style={styles.infoContainer}>
              <Text style={styles.name}>{user?.name || 'Student'}</Text>
              <Text style={styles.email}>{user?.email || 'email@domain.com'}</Text>
            </View>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>College / University</Text>
            <Text style={styles.detailValue}>{user?.university || 'Not specified'}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Degree</Text>
            <Text style={styles.detailValue}>{user?.degree || 'Not specified'}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Branch</Text>
            <Text style={styles.detailValue}>{user?.branch || 'Not specified'}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Current Semester</Text>
            <Text style={styles.detailValue}>{formatSemester(user?.semester)}</Text>
          </View>

          <Button style={styles.editBtn} variant="outline" onPress={() => navigation.navigate('Settings')}>
            Edit Profile in Settings
          </Button>
        </Card>
      </ScrollView>
    </View>
  );
};

const createStyles = ({ colors, typography, spacing, radii }) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: spacing.lg, paddingBottom: spacing.xxl },
  card: { padding: spacing.xl },
  profileHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.xl },
  avatarWrapper: { width: 64, height: 64, borderRadius: 32, overflow: 'hidden', marginRight: spacing.lg },
  avatarImage: { width: '100%', height: '100%' },
  avatarPlaceholder: { width: '100%', height: '100%', backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontFamily: typography.sans.bold, fontSize: 22, color: colors.primaryForeground },
  infoContainer: { flex: 1 },
  name: { fontFamily: typography.serif.medium, fontSize: 24, color: colors.foreground },
  email: { fontFamily: typography.sans.regular, fontSize: 14, color: colors.mutedForeground, marginTop: 2 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.md, borderTopWidth: 1, borderTopColor: colors.cardBorder },
  detailLabel: { fontFamily: typography.sans.regular, fontSize: 14, color: colors.mutedForeground },
  detailValue: { fontFamily: typography.sans.semiBold, fontSize: 14, color: colors.foreground },
  editBtn: { marginTop: spacing.xl }
});

export default ProfileScreen;
