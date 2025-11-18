import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
import {
  ActivityIndicator,
  FlatList,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useLogin } from './src/hooks/useLogin';
import { authStore } from './src/stores/auth-store';
import { usePurchases } from './src/hooks/usePurchases';
import { format } from 'date-fns';
import { useIntegrationTrigger } from './src/hooks/useIntegrationTrigger';
import { useMediaUpload } from './src/hooks/useMediaUpload';

const queryClient = new QueryClient();

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaView style={styles.safeArea}>
        <Root />
        <StatusBar style="dark" />
      </SafeAreaView>
    </QueryClientProvider>
  );
}

const Root = () => {
  const token = authStore((state) => state.token);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    authStore
      .getState()
      .hydrate()
      .finally(() => setHydrated(true));
  }, []);

  if (!hydrated) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={styles.muted}>Loading secure session…</Text>
      </View>
    );
  }

  return token ? <DashboardView /> : <LoginView />;
};

const LoginView = () => {
  const loginMutation = useLogin();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.eyebrow}>Resale OS</Text>
        <Text style={styles.title}>Mobile intake</Text>
        <Text style={styles.subtitle}>Authenticate to sync purchases + listings.</Text>

        <View style={styles.field}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="seller@resale.app"
            autoCapitalize="none"
            keyboardType="email-address"
            style={styles.input}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Password</Text>
          <TextInput value={password} onChangeText={setPassword} secureTextEntry style={styles.input} />
        </View>

        {loginMutation.isError ? <Text style={styles.error}>Authentication failed</Text> : null}

        <TouchableOpacity
          style={[styles.button, loginMutation.isPending && styles.buttonDisabled]}
          onPress={() => loginMutation.mutate({ email, password })}
          disabled={loginMutation.isPending}
        >
          <Text style={styles.buttonText}>{loginMutation.isPending ? 'Signing in…' : 'Access workspace'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const DashboardView = () => {
  const purchasesQuery = usePurchases();
  const logout = () => authStore.getState().clearSession();
  const integrationMutation = useIntegrationTrigger();
  const mediaUpload = useMediaUpload();

  useEffect(() => {
    ImagePicker.requestMediaLibraryPermissionsAsync();
  }, []);

  const handleAttachPhoto = async (purchaseItemId: string) => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.5,
    });
    if (result.canceled || !result.assets.length) {
      return;
    }

    const asset = result.assets[0];
    await mediaUpload.mutateAsync({
      purchaseItemId,
      file: {
        uri: asset.uri,
        name: asset.fileName ?? `photo-${Date.now()}.jpg`,
        type: asset.mimeType ?? 'image/jpeg',
      },
    });
  };

  return (
    <ScrollView contentContainerStyle={styles.dashboardContainer}>
      <View style={styles.dashboardHeader}>
        <View>
          <Text style={styles.eyebrow}>Purchasing</Text>
          <Text style={styles.title}>Latest intake</Text>
        </View>
        <TouchableOpacity style={styles.secondaryButton} onPress={logout}>
          <Text style={styles.secondaryButtonText}>Logout</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.quickCard}>
        <Text style={styles.label}>Quick Manifest</Text>
        <TouchableOpacity
          style={[styles.button, integrationMutation.isPending && styles.buttonDisabled]}
          onPress={() =>
            integrationMutation.mutate({
              manifestId: `MOBILE-${Date.now()}`,
              purchaseDate: new Date().toISOString(),
              totalCost: 0,
              items: [],
            })
          }
        >
          <Text style={styles.buttonText}>
            {integrationMutation.isPending ? 'Syncing…' : 'Trigger Goodwill Sync'}
          </Text>
        </TouchableOpacity>
      </View>

      {purchasesQuery.isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator color="#2563eb" />
        </View>
      ) : (
        <FlatList
          data={purchasesQuery.data}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ gap: 12 }}
          renderItem={({ item }) => (
            <View style={styles.listCard}>
              <Text style={styles.listTitle}>{item.orderNumber ?? 'Unnumbered batch'}</Text>
              <Text style={styles.muted}>{format(new Date(item.purchaseDate), 'MMM dd, yyyy')}</Text>
              <Text style={styles.muted}>Lines: {item.items.length}</Text>
              {item.items.map((line) => (
                <TouchableOpacity
                  key={line.id}
                  style={styles.attachButton}
                  onPress={() => handleAttachPhoto(line.id)}
                  disabled={mediaUpload.isPending}
                >
                  <Text style={styles.attachButtonText}>
                    {mediaUpload.isPending ? 'Uploading…' : `Attach photo · ${line.title}`}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        />
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 24,
    shadowColor: '#0f172a',
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 4,
    gap: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    color: '#0f172a',
  },
  subtitle: {
    fontSize: 14,
    color: '#475569',
  },
  eyebrow: {
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 4,
    color: '#94a3b8',
    fontWeight: '600',
  },
  field: {
    gap: 6,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  input: {
    borderWidth: 1,
    borderColor: '#cbd5f5',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    backgroundColor: '#fff',
  },
  button: {
    backgroundColor: '#2563eb',
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
  },
  error: {
    color: '#ef4444',
    fontSize: 12,
  },
  dashboardContainer: {
    padding: 24,
    gap: 16,
  },
  dashboardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  secondaryButton: {
    borderColor: '#94a3b8',
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  secondaryButtonText: {
    color: '#475569',
    fontWeight: '600',
  },
  quickCard: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 24,
    gap: 8,
    shadowColor: '#0f172a',
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
  },
  listCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    gap: 6,
    shadowColor: '#0f172a',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  listTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
  },
  attachButton: {
    marginTop: 8,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#cbd5f5',
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  attachButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2563eb',
  },
  muted: {
    color: '#64748b',
    fontSize: 13,
  },
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 8,
  },
});
