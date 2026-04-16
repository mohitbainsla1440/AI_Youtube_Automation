import React from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Badge } from '@/components/ui/Badge';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { VideoProject } from '@/types';
import { COLORS } from '@/utils/constants';
import { formatDuration, getStatusLabel, getStatusColor, timeAgo } from '@/utils/helpers';

interface VideoCardProps {
  project: VideoProject;
  onPress: () => void;
  onMorePress?: () => void;
}

export function VideoCard({ project, onPress, onMorePress }: VideoCardProps) {
  const isProcessing = [
    'generating_script',
    'generating_voice',
    'generating_visuals',
    'rendering',
  ].includes(project.status);

  const statusColor = getStatusColor(project.status);

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85}>
      {/* Thumbnail */}
      <View style={styles.thumbnailWrap}>
        {project.thumbnail?.url ? (
          <Image source={{ uri: project.thumbnail.url }} style={styles.thumbnail} />
        ) : (
          <View style={[styles.thumbnail, styles.thumbnailPlaceholder]}>
            <Ionicons name="film-outline" size={28} color={COLORS.textMuted} />
          </View>
        )}

        {project.script?.estimatedDuration && (
          <View style={styles.durationBadge}>
            <Text style={styles.durationText}>
              {formatDuration(project.script.estimatedDuration)}
            </Text>
          </View>
        )}

        {project.status === 'published' && (
          <View style={styles.publishedBadge}>
            <Ionicons name="logo-youtube" size={12} color="#FF0000" />
          </View>
        )}
      </View>

      {/* Info */}
      <View style={styles.info}>
        <View style={styles.titleRow}>
          <Text style={styles.title} numberOfLines={2}>
            {project.title || project.topic}
          </Text>
          {onMorePress && (
            <TouchableOpacity onPress={onMorePress} style={styles.moreBtn}>
              <Ionicons name="ellipsis-vertical" size={16} color={COLORS.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.meta}>
          <Badge
            label={getStatusLabel(project.status)}
            color={statusColor}
            size="sm"
            dot={isProcessing}
          />
          <Text style={styles.time}>{timeAgo(project.updatedAt)}</Text>
        </View>

        {isProcessing && (
          <ProgressBar
            progress={project.status === 'generating_script' ? 20 : 60}
            color={statusColor}
            height={3}
            animated
          />
        )}

        {project.analytics && (
          <View style={styles.analytics}>
            <AnalyticItem icon="eye-outline" value={project.analytics.views.toString()} />
            <AnalyticItem icon="time-outline" value={`${Math.round(project.analytics.avgViewDuration)}s`} />
            <AnalyticItem icon="stats-chart-outline" value={`${project.analytics.ctr.toFixed(1)}%`} />
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

function AnalyticItem({ icon, value }: { icon: string; value: string }) {
  return (
    <View style={styles.analyticItem}>
      <Ionicons name={icon as keyof typeof Ionicons.glyphMap} size={11} color={COLORS.textMuted} />
      <Text style={styles.analyticValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
    flexDirection: 'row',
    gap: 12,
    padding: 12,
    marginBottom: 10,
  },
  thumbnailWrap: { position: 'relative', width: 110, height: 80 },
  thumbnail: { width: 110, height: 80, borderRadius: 10 },
  thumbnailPlaceholder: { backgroundColor: COLORS.elevated, alignItems: 'center', justifyContent: 'center' },
  durationBadge: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    backgroundColor: 'rgba(0,0,0,0.75)',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
  },
  durationText: { color: '#fff', fontSize: 10, fontWeight: '600' },
  publishedBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(0,0,0,0.75)',
    padding: 3,
    borderRadius: 4,
  },
  info: { flex: 1, gap: 6 },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 4 },
  title: { flex: 1, color: COLORS.text, fontSize: 14, fontWeight: '600', lineHeight: 19 },
  moreBtn: { padding: 4 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  time: { color: COLORS.textMuted, fontSize: 11 },
  analytics: { flexDirection: 'row', gap: 10, marginTop: 2 },
  analyticItem: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  analyticValue: { color: COLORS.textMuted, fontSize: 11 },
});
