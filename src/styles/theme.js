import { StyleSheet, Platform, StatusBar } from 'react-native';

export const COLORS = {
  bg: '#0F172A',
  card: '#1E293B',
  border: '#334155',
  primary: '#38BDF8',
  success: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
  textMain: '#F8FAFC',
  textSub: '#94A3B8',
  textMuted: '#64748B',
};

export const globalStyles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.bg,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  screenPadding: {
    flex: 1,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.textMain,
    marginTop: 16,
    marginBottom: 12,
  },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  inputLabel: {
    color: COLORS.textSub,
    fontSize: 12,
    fontWeight: '600',
    marginTop: 12,
    marginBottom: 6,
  },
  input: {
    backgroundColor: COLORS.bg,
    color: COLORS.textMain,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    fontSize: 14,
  },
  primaryBtn: {
    flexDirection: 'row',
    backgroundColor: COLORS.primary,
    paddingVertical: 13,
    paddingHorizontal: 16,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  primaryBtnText: {
    color: COLORS.bg,
    fontWeight: 'bold',
    fontSize: 14,
  },
});