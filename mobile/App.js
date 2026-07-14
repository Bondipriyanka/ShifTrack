import React, { useState, useEffect, useRef } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  TextInput, 
  TouchableOpacity, 
  ActivityIndicator, 
  Alert, 
  ScrollView, 
  Image,
  Dimensions,
  Switch
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { CameraView, Camera } from 'expo-camera';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');

// Default initial roster
const INITIAL_ROSTER = [
  { id: 'EMP-7088', name: 'Vikram Sharma', shift: 'Morning Shift (A)', avatar: null },
  { id: 'EMP-9021', name: 'Priya Patel', shift: 'Morning Shift (A)', avatar: null },
  { id: 'EMP-4110', name: 'Amit Mishra', shift: 'General Shift (G)', avatar: null }
];

const LOCATIONS = [
  'Tata Motors - Gate 1',
  'Tata Motors - Assembly Line B',
  'Reliance Industries - Plant A',
  'Adani Port - Cargo Yard',
  'L&T Construction Site #4'
];

export default function App() {
  const cameraRef = useRef(null);

  // App Auth state
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [pinCode, setPinCode] = useState('');

  // App Screens: 'scan' | 'register'
  const [activeTab, setActiveTab] = useState('scan');

  // Camera permissions state
  const [hasCameraPermission, setHasCameraPermission] = useState(null);
  const [hasLocationPermission, setHasLocationPermission] = useState(null);
  
  // Scanner state
  const [isScanning, setIsScanning] = useState(false);
  const [clientLocation, setClientLocation] = useState('Tata Motors - Gate 1');
  const [gpsCoords, setGpsCoords] = useState('Locking...');
  const [isOffline, setIsOffline] = useState(false);
  const [simIndex, setSimIndex] = useState(0);
  
  // Simulated candidate selector states
  const [selectedCandidateId, setSelectedCandidateId] = useState('EMP-7088');
  const [isCandidateDropdownOpen, setIsCandidateDropdownOpen] = useState(false);
  const [isLocationDropdownOpen, setIsLocationDropdownOpen] = useState(false);
  const [showSimControls, setShowSimControls] = useState(false);

  // API host state (e.g. localhost, 10.0.2.2, or custom LAN IP)
  const [apiServerHost, setApiServerHost] = useState('localhost');
  
  // Registration state
  const [regName, setRegName] = useState('');
  const [regShift, setRegShift] = useState('Morning Shift (A)');
  const [regPhoto, setRegPhoto] = useState(null);
  const [isRegCameraActive, setIsRegCameraActive] = useState(false);

  // Log Database
  const [roster, setRoster] = useState(INITIAL_ROSTER);
  const [logs, setLogs] = useState([]);
  const [syncQueue, setSyncQueue] = useState([]);
  const [isProcessingScan, setIsProcessingScan] = useState(false);

  // Synchronize selectedCandidateId if the roster changes and the current selection is no longer in the roster
  useEffect(() => {
    if (
      selectedCandidateId &&
      selectedCandidateId !== 'stranger' &&
      selectedCandidateId !== 'spoof' &&
      !roster.some(emp => emp.id === selectedCandidateId)
    ) {
      if (roster.length > 0) {
        setSelectedCandidateId(roster[0].id);
      } else {
        setSelectedCandidateId('stranger');
      }
    }
  }, [roster]);

  // Automated scanner trigger loop
  useEffect(() => {
    let timer = null;
    if (isScanning && !isProcessingScan) {
      timer = setTimeout(() => {
        captureAndVerifyFace();
      }, 2500);
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [isScanning, isProcessingScan]);

  const getSelectedCandidateLabel = () => {
    if (selectedCandidateId === 'stranger') {
      return 'Unknown Pedestrian (Stranger)';
    }
    if (selectedCandidateId === 'spoof') {
      return 'Photo Spoof Attempt (Spoof)';
    }
    const emp = roster.find(e => e.id === selectedCandidateId);
    return emp ? `${emp.name} (ID: ${emp.id})` : 'Select Candidate';
  };

  // Load permissions & saved storage
  useEffect(() => {
    (async () => {
      const cameraStatus = await Camera.requestCameraPermissionsAsync();
      setHasCameraPermission(cameraStatus.status === 'granted');

      const locationStatus = await Location.requestForegroundPermissionsAsync();
      setHasLocationPermission(locationStatus.status === 'granted');
      
      if (locationStatus.status === 'granted') {
        try {
          const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          setGpsCoords(`${loc.coords.latitude.toFixed(4)}° N, ${loc.coords.longitude.toFixed(4)}° E`);
        } catch (e) {
          setGpsCoords('18.6420° N, 73.8055° E (Default)');
        }
      } else {
        setGpsCoords('Permissions Denied');
      }

      // Load data
      await loadSavedData();
    })();
  }, []);

  const loadSavedData = async () => {
    try {
      const savedLogs = await AsyncStorage.getItem('@attendance_logs');
      const savedQueue = await AsyncStorage.getItem('@sync_queue');
      const savedRoster = await AsyncStorage.getItem('@roster_list');
      const savedHost = await AsyncStorage.getItem('@api_host');

      if (savedLogs) setLogs(JSON.parse(savedLogs));
      if (savedQueue) setSyncQueue(JSON.parse(savedQueue));
      if (savedRoster) setRoster(JSON.parse(savedRoster));
      if (savedHost) setApiServerHost(savedHost);
      
      const host = savedHost || 'localhost';
      await loadDatabaseFromServer(host);
    } catch (e) {
      console.log('Error reading storage data', e);
    }
  };

  const cleanHost = (input) => {
    let clean = (input || '').trim();
    clean = clean.replace(/^https?:\/\//i, '');
    clean = clean.replace(/\/$/, '');
    if (clean.includes(':')) {
      return clean;
    }
    return clean + ':3000';
  };

  const loadDatabaseFromServer = async (host = apiServerHost) => {
    try {
      const formattedHost = cleanHost(host);
      const rosterRes = await fetch(`http://${formattedHost}/api/roster`);
      if (rosterRes.ok) {
        const rosterData = await rosterRes.json();
        // Convert roster database map (emp-001, etc.) to list for mobile app
        const rosterList = Object.keys(rosterData).map(key => ({
          dbKey: key,
          id: rosterData[key].id,
          name: rosterData[key].name,
          shift: rosterData[key].shift,
          avatar: rosterData[key].avatar
        }));
        setRoster(rosterList);
        await AsyncStorage.setItem('@roster_list', JSON.stringify(rosterList));
      }
      
      const logsRes = await fetch(`http://${formattedHost}/api/logs`);
      if (logsRes.ok) {
        const logsData = await logsRes.json();
        setLogs(logsData);
        await AsyncStorage.setItem('@attendance_logs', JSON.stringify(logsData));
      }
    } catch (err) {
      console.log('API Server down, using offline local storage', err);
    }
  };

  const saveApiHost = async (host) => {
    setApiServerHost(host);
    await AsyncStorage.setItem('@api_host', host);
    loadDatabaseFromServer(host);
  };

  const saveData = async (newLogs, newQueue, newRoster) => {
    try {
      if (newLogs) await AsyncStorage.setItem('@attendance_logs', JSON.stringify(newLogs));
      if (newQueue) await AsyncStorage.setItem('@sync_queue', JSON.stringify(newQueue));
      if (newRoster) await AsyncStorage.setItem('@roster_list', JSON.stringify(newRoster));
    } catch (e) {
      console.log('Error saving storage data', e);
    }
  };

  // Login handler
  const handleLogin = () => {
    if (pinCode === '1234') {
      setIsAuthorized(true);
      setPinCode('');
    } else {
      Alert.alert('Access Denied', 'Invalid Supervisor PIN passcode.');
      setPinCode('');
    }
  };

  // Log Out
  const handleLogout = () => {
    setIsAuthorized(false);
    setIsScanning(false);
    setIsRegCameraActive(false);
    setRegPhoto(null);
  };

  const handleOpenGateCamera = () => {
    setIsScanning(true);
    // Cycle the approaching subject to the next candidate automatically to simulate walk-ups
    const pool = [...roster.map(e => e.id), 'stranger', 'spoof'];
    const nextIdx = (simIndex + 1) % pool.length;
    setSimIndex(nextIdx);
    setSelectedCandidateId(pool[nextIdx]);
  };

  // Attendance scanner trigger
  const captureAndVerifyFace = async () => {
    if (isProcessingScan) return;
    setIsProcessingScan(true);

    try {
      let photoUri = null;
      
      // Take snapshot if camera is active
      if (cameraRef.current) {
        const photo = await cameraRef.current.takePictureAsync({ quality: 0.5 });
        photoUri = photo.uri;
      }

      // Match against the selected candidate instead of choosing randomly
      const selectedId = selectedCandidateId;
      
      setTimeout(() => {
        if (selectedId === 'stranger') {
          // Stranger mismatch
          Alert.alert('Access Denied', 'Biometric profile match not found.');
          setIsProcessingScan(false);
        } else if (selectedId === 'spoof') {
          // Spoof liveness fail
          Alert.alert('Liveness Failure', 'Spoof alert: Static 2D frame detected.');
          setIsProcessingScan(false);
        } else {
          // Success
          const matchedEmployee = roster.find(emp => emp.id === selectedId);
          if (matchedEmployee) {
            const newLog = {
              id: matchedEmployee.id,
              name: matchedEmployee.name,
              timestamp: new Date().toISOString(),
              location: clientLocation,
              gps: gpsCoords,
              synced: !isOffline,
              photo: photoUri
            };

            const updatedLogs = [newLog, ...logs];
            let updatedQueue = [...syncQueue];

            if (isOffline) {
              updatedQueue = [...syncQueue, newLog];
              setSyncQueue(updatedQueue);
              Alert.alert('Log Cached Offline', `Attendance verified for ${matchedEmployee.name} and saved to device memory buffer.`);
            } else {
              // Post check-in log to backend server API database
              try {
                const formattedHost = cleanHost(apiServerHost);
                fetch(`http://${formattedHost}/api/logs`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(newLog)
                });
              } catch (e) {
                console.log('Error posting check-in log to API server', e);
              }
              // Integrate/Send API payload to ZyngHR gateway
              Alert.alert('Attendance Synced', `Checked In: ${matchedEmployee.name}\nShift: ${matchedEmployee.shift || 'Morning Shift (A)'}`);
            }

            setLogs(updatedLogs);
            saveData(updatedLogs, updatedQueue, null);
            setIsProcessingScan(false);
            
            // Stop camera stream immediately on success
            setIsScanning(false);
          } else {
            Alert.alert('Access Denied', 'Biometric profile match not found.');
            setIsProcessingScan(false);
          }
        }
      }, 1500);

    } catch (e) {
      Alert.alert('Camera Error', 'Could not process biometric scan frame.');
      setIsProcessingScan(false);
    }
  };

  // Registration camera capture
  const takeRegistrationPhoto = async () => {
    if (cameraRef.current) {
      try {
        const photo = await cameraRef.current.takePictureAsync({ quality: 0.6 });
        setRegPhoto(photo.uri);
        setIsRegCameraActive(false);
      } catch (e) {
        Alert.alert('Error', 'Unable to capture snapshot.');
      }
    }
  };

  // Enroll employee into AsyncStorage database
  const saveEmployeeBiometrics = async () => {
    if (!regName.trim()) {
      Alert.alert('Missing Field', 'Please enter candidate name.');
      return;
    }

    // Duplicate check: Verify if candidate name already exists in roster
    const nameExists = roster.some(emp => emp.name.toLowerCase() === regName.trim().toLowerCase());
    if (nameExists) {
      const existingEmp = roster.find(emp => emp.name.toLowerCase() === regName.trim().toLowerCase());
      Alert.alert(
        'User Already Exists',
        `User already exists! ${regName.trim()} is already registered with ID ${existingEmp.id}. No need to register again, they can scan directly.`,
        [
          {
            text: 'OK',
            onPress: () => {
              // Reset and redirect to Scan Tab
              setRegName('');
              setRegPhoto(null);
              setActiveTab('scan');
            }
          }
        ]
      );
      return;
    }

    const newCode = `EMP-${Math.floor(Math.random() * 9000) + 1000}`;
    const initials = regName.split(" ").map(n => n[0]).join("").toUpperCase().substring(0, 2);
    const newStaff = {
      id: newCode,
      name: regName,
      initials: initials,
      role: "Contract Staff",
      shift: regShift,
      avatar: regPhoto,
      status: "Active",
      location: clientLocation,
      faceVector: `[Custom Vector hash: ${Math.random().toFixed(4)}]`
    };

    const updatedRoster = [...roster, newStaff];
    setRoster(updatedRoster);
    setSelectedCandidateId(newCode); // Automatically select newly registered candidate
    saveData(null, null, updatedRoster);

    // Post enrollment to shared API database server
    try {
      const customId = `emp-custom-${Date.now()}`;
      const formattedHost = cleanHost(apiServerHost);
      const response = await fetch(`http://${formattedHost}/api/roster`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: customId, employee: newStaff })
      });
      if (response.ok) {
        console.log('Enrollment synced with API server successfully.');
        loadDatabaseFromServer(); // Refresh roster
      }
    } catch (e) {
      console.log('API Server offline, enrollment saved to local storage only.', e);
    }

    Alert.alert('Enrollment Complete', `Registered ${regName} with Biometric Roster ID: ${newCode}`);
    
    // Clear forms
    setRegName('');
    setRegPhoto(null);
    setActiveTab('scan');
  };

  // Sync Queue to ZyngHR Server
  const syncOfflineQueue = async () => {
    if (isOffline) {
      Alert.alert('Sync Blocked', 'Device is offline. Turn off offline mode first.');
      return;
    }

    if (syncQueue.length === 0) {
      Alert.alert('Queue Empty', 'All check-ins are synchronized.');
      return;
    }

    // Reconcile logs with the backend server API database
    try {
      const formattedHost = cleanHost(apiServerHost);
      const response = await fetch(`http://${formattedHost}/api/sync-logs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(syncQueue)
      });
      if (response.ok) {
        const updatedLogs = logs.map(log => ({ ...log, synced: true }));
        setLogs(updatedLogs);
        setSyncQueue([]);
        saveData(updatedLogs, [], null);
        Alert.alert('ZyngHR Sync Complete', `Successfully uploaded ${syncQueue.length} records to the HR database.`);
      } else {
        Alert.alert('Sync Failed', 'API server rejected check-in sync.');
      }
    } catch (e) {
      Alert.alert('Sync Failed', 'API server unreachable. Try again when connection is restored.');
    }
  };

  // Render Login overlay
  if (!isAuthorized) {
    return (
      <View style={styles.loginContainer}>
        <Text style={styles.loginTitle}>GATEENTRY HUB</Text>
        <Text style={styles.loginSub}>Supervisor Terminal</Text>
        
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.pinInput}
            value={pinCode}
            onChangeText={setPinCode}
            placeholder="••••"
            placeholderTextColor="#6b7280"
            secureTextEntry
            keyboardType="numeric"
            maxLength={4}
          />
          <TouchableOpacity style={styles.loginBtn} onPress={handleLogin}>
            <Text style={styles.loginBtnText}>Authorize Access</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.hintText}>Passcode PIN Hint: 1234</Text>
        <StatusBar style="light" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header bar */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Smart GateEntry</Text>
          <Text style={styles.headerSub}>Client Gate Biometrics</Text>
        </View>
        <View style={styles.networkBadgeRow}>
          <Text style={[styles.networkBadge, isOffline && styles.networkBadgeOffline]}>
            {isOffline ? 'OFFLINE' : 'ONLINE'}
          </Text>
        </View>
      </View>

      {/* Screen Views */}
      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        {activeTab === 'scan' ? (
          /* SCAN GATE VIEW */
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>Gate Attendance Control</Text>
            
            <View style={styles.card}>
              <Text style={styles.label}>Gate Location Deployment</Text>
              <TouchableOpacity 
                style={styles.dropdownHeader} 
                onPress={() => setIsLocationDropdownOpen(!isLocationDropdownOpen)}
              >
                <Text style={styles.dropdownHeaderText}>{clientLocation}</Text>
                <Text style={styles.dropdownHeaderArrow}>
                  {isLocationDropdownOpen ? '▲' : '▼'}
                </Text>
              </TouchableOpacity>
              
              {isLocationDropdownOpen && (
                <View style={styles.dropdownList}>
                  {LOCATIONS.map(loc => (
                    <TouchableOpacity
                      key={loc}
                      style={[
                        styles.dropdownItem,
                        clientLocation === loc && styles.dropdownItemActive
                      ]}
                      onPress={() => {
                        setClientLocation(loc);
                        setIsLocationDropdownOpen(false);
                      }}
                    >
                      <Text style={styles.dropdownItemText}>{loc}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
              
              <Text style={styles.gpsLock}>GPS Lock: {gpsCoords}</Text>
            </View>

            {/* API Server Configuration */}
            <View style={styles.card}>
              <Text style={styles.label}>API Server Host IP</Text>
              <TextInput
                style={styles.textInput}
                value={apiServerHost}
                onChangeText={saveApiHost}
                placeholder="E.g., localhost or 192.168.1.10"
                placeholderTextColor="#6b7280"
                autoCapitalize="none"
                autoCorrect={false}
              />
              <TouchableOpacity 
                style={styles.syncBtn} 
                onPress={() => loadDatabaseFromServer(apiServerHost)}
              >
                <Text style={styles.syncBtnText}>Refresh Data from Server</Text>
              </TouchableOpacity>
              
              <View style={[styles.row, { marginTop: 12, marginBottom: 0 }]}>
                <Text style={styles.label}>Offline Simulation Mode</Text>
                <Switch
                  value={isOffline}
                  onValueChange={setIsOffline}
                  trackColor={{ false: '#27272a', true: '#60a5fa' }}
                />
              </View>
            </View>

            {/* Camera Viewport */}
            {isScanning ? (
              <View style={styles.cameraBox}>
                {hasCameraPermission ? (
                  <CameraView style={styles.camera} facing="front" ref={cameraRef}>
                    <View style={styles.scanGuide} />
                  </CameraView>
                ) : (
                  <View style={styles.cameraPlaceholder}>
                    <Text style={styles.lightText}>No Camera Access Permissions Granted</Text>
                  </View>
                )}
                
                {isProcessingScan ? (
                  <View style={styles.spinnerOverlay}>
                    <ActivityIndicator size="large" color="#60a5fa" />
                    <Text style={styles.spinnerLabel}>Matching Facial Embeddings...</Text>
                  </View>
                ) : (
                  <View style={styles.scannerStatusOverlay}>
                    <ActivityIndicator size="small" color="#60a5fa" />
                    <Text style={styles.scannerStatusText}>Detecting Face... Keep Still</Text>
                  </View>
                )}
              </View>
            ) : (
              <TouchableOpacity style={styles.primaryBtn} onPress={handleOpenGateCamera}>
                <Text style={styles.primaryBtnText}>Open Camera Gate</Text>
              </TouchableOpacity>
            )}

            {/* Sync Queue dashboard */}
            {syncQueue.length > 0 && (
              <TouchableOpacity style={styles.syncBtn} onPress={syncOfflineQueue}>
                <Text style={styles.syncBtnText}>Sync Offline Logs ({syncQueue.length} Pending)</Text>
              </TouchableOpacity>
            )}

            {/* Live scan feed logs list */}
            <Text style={styles.logTitle}>Recent Gate Check-Ins</Text>
            {logs.length === 0 ? (
              <Text style={styles.mutedText}>No check-ins recorded yet.</Text>
            ) : (
              logs.map((log, idx) => (
                <View key={idx} style={styles.logItem}>
                  <View style={styles.logLeft}>
                    <Text style={styles.logName}>{log.name}</Text>
                    <Text style={styles.logId}>{log.id} • {new Date(log.timestamp).toLocaleTimeString()}</Text>
                  </View>
                  <Text style={[styles.syncIndicator, log.synced ? styles.synced : styles.pending]}>
                    {log.synced ? 'Synced' : 'Offline'}
                  </Text>
                </View>
              ))
            )}
          </View>
        ) : (
          /* CANDIDATE BIOMETRIC REGISTRATION VIEW */
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>Biometric Candidate Registration</Text>
            
            <View style={styles.formCard}>
              <Text style={styles.label}>Full Name</Text>
              <TextInput
                style={styles.textInput}
                value={regName}
                onChangeText={setRegName}
                placeholder="Priya Patel"
                placeholderTextColor="#6b7280"
              />

              <Text style={styles.label}>Shift Assignment</Text>
              <TextInput
                style={styles.textInput}
                value={regShift}
                onChangeText={setRegShift}
                placeholder="E.g., Morning Shift (A)"
                placeholderTextColor="#6b7280"
              />

              <Text style={styles.label}>Biometric Face Profile</Text>
              <View style={styles.regPhotoContainer}>
                {regPhoto ? (
                  <Image source={{ uri: regPhoto }} style={styles.regPhotoPreview} />
                ) : isRegCameraActive ? (
                  <CameraView style={styles.regCamera} facing="front" ref={cameraRef}>
                    <TouchableOpacity style={styles.regCaptureBtn} onPress={takeRegistrationPhoto}>
                      <Text style={styles.regCaptureBtnText}>Snap Face</Text>
                    </TouchableOpacity>
                  </CameraView>
                ) : (
                  <TouchableOpacity style={styles.photoSelectBtn} onPress={() => setIsRegCameraActive(true)}>
                    <Text style={styles.photoSelectText}>Activate Camera</Text>
                  </TouchableOpacity>
                )}
              </View>

              {regPhoto && (
                <TouchableOpacity style={styles.saveRegBtn} onPress={saveEmployeeBiometrics}>
                  <Text style={styles.saveRegBtnText}>Register Candidate Biometrics</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}
      </ScrollView>

      {/* Tabs navigation */}
      <View style={styles.navBar}>
        <TouchableOpacity 
          style={[styles.navItem, activeTab === 'scan' && styles.navItemActive]}
          onPress={() => setActiveTab('scan')}
        >
          <Text style={[styles.navText, activeTab === 'scan' && styles.navTextActive]}>Scan Gate</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.navItem, activeTab === 'register' && styles.navItemActive]}
          onPress={() => setActiveTab('register')}
        >
          <Text style={[styles.navText, activeTab === 'register' && styles.navTextActive]}>Enroll Face</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.navItem} onPress={handleLogout}>
          <Text style={styles.navTextLogout}>Lock Hub</Text>
        </TouchableOpacity>
      </View>
      <StatusBar style="light" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#09090b',
  },
  scrollContent: {
    paddingBottom: 80,
  },
  loginContainer: {
    flex: 1,
    backgroundColor: '#09090b',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
  },
  loginTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: -1,
  },
  loginSub: {
    fontSize: 12,
    color: '#60a5fa',
    textTransform: 'uppercase',
    letterSpacing: 2,
    marginTop: 4,
    marginBottom: 40,
  },
  inputContainer: {
    width: '100%',
    maxWidth: 300,
    alignItems: 'center',
  },
  pinInput: {
    backgroundColor: '#18181b',
    borderWidth: 1,
    borderColor: '#27272a',
    borderRadius: 12,
    color: '#ffffff',
    fontSize: 24,
    padding: 16,
    width: '100%',
    textAlign: 'center',
    letterSpacing: 6,
    marginBottom: 20,
  },
  loginBtn: {
    backgroundColor: '#60a5fa',
    borderRadius: 12,
    padding: 16,
    width: '100%',
    alignItems: 'center',
  },
  loginBtnText: {
    color: '#09090b',
    fontWeight: '700',
    fontSize: 16,
  },
  hintText: {
    color: '#52525b',
    fontSize: 12,
    marginTop: 30,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#27272a',
    backgroundColor: '#0a0a0c',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
  },
  headerSub: {
    fontSize: 11,
    color: '#71717a',
  },
  networkBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  networkBadge: {
    fontSize: 10,
    fontWeight: '600',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    borderColor: '#22c55e',
    borderWidth: 1,
    color: '#22c55e',
  },
  networkBadgeOffline: {
    backgroundColor: 'rgba(234, 179, 8, 0.1)',
    borderColor: '#eab308',
    borderWidth: 1,
    color: '#eab308',
  },
  sectionContainer: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 15,
  },
  card: {
    backgroundColor: '#18181b',
    borderWidth: 1,
    borderColor: '#27272a',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
  label: {
    fontSize: 13,
    color: '#a1a1aa',
    marginBottom: 4,
  },
  gpsLock: {
    fontSize: 11,
    color: '#71717a',
    fontFamily: 'System',
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#27272a',
    paddingTop: 12,
    marginTop: 4,
  },
  primaryBtn: {
    backgroundColor: '#60a5fa',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 20,
  },
  primaryBtnText: {
    color: '#09090b',
    fontWeight: '700',
    fontSize: 15,
  },
  syncBtn: {
    backgroundColor: 'rgba(234, 179, 8, 0.1)',
    borderColor: '#eab308',
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    marginBottom: 20,
  },
  syncBtnText: {
    color: '#eab308',
    fontWeight: '700',
    fontSize: 14,
  },
  cameraBox: {
    height: 380,
    width: '100%',
    backgroundColor: '#000000',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#27272a',
    marginBottom: 20,
  },
  camera: {
    flex: 1,
  },
  scanGuide: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  scanTarget: {
    width: 240,
    height: 240,
    borderRadius: 24,
    borderWidth: 2.5,
    borderColor: '#10b981',
    borderStyle: 'dashed',
  },
  scannerStatusOverlay: {
    position: 'absolute',
    bottom: 25,
    alignSelf: 'center',
    backgroundColor: 'rgba(9, 9, 11, 0.85)',
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#27272a',
  },
  scannerStatusText: {
    color: '#60a5fa',
    fontWeight: '600',
    fontSize: 13,
    marginLeft: 8,
  },
  cameraPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  lightText: {
    color: '#a1a1aa',
  },
  scanCaptureBtn: {
    position: 'absolute',
    bottom: 20,
    alignSelf: 'center',
    backgroundColor: '#60a5fa',
    borderRadius: 24,
    paddingHorizontal: 24,
    paddingVertical: 12,
    shadowColor: '#000000',
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 8,
  },
  scanCaptureBtnText: {
    color: '#09090b',
    fontWeight: '700',
    fontSize: 14,
  },
  spinnerOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(9, 9, 11, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  spinnerLabel: {
    color: '#60a5fa',
    fontWeight: '600',
    marginTop: 15,
  },
  logTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#71717a',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 10,
    marginBottom: 10,
  },
  mutedText: {
    color: '#52525b',
    fontSize: 13,
    textAlign: 'center',
    paddingVertical: 20,
  },
  logItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#18181b',
    padding: 12,
    borderRadius: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#27272a',
  },
  logLeft: {
    flex: 1,
  },
  logName: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 14,
  },
  logId: {
    color: '#71717a',
    fontSize: 11,
    marginTop: 2,
  },
  syncIndicator: {
    fontSize: 10,
    fontWeight: '600',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  synced: {
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    color: '#22c55e',
  },
  pending: {
    backgroundColor: 'rgba(234, 179, 8, 0.1)',
    color: '#eab308',
  },
  formCard: {
    backgroundColor: '#18181b',
    borderWidth: 1,
    borderColor: '#27272a',
    borderRadius: 16,
    padding: 16,
  },
  textInput: {
    backgroundColor: '#09090b',
    borderWidth: 1,
    borderColor: '#27272a',
    borderRadius: 8,
    color: '#ffffff',
    padding: 12,
    fontSize: 14,
    marginTop: 6,
    marginBottom: 16,
  },
  regPhotoContainer: {
    height: 200,
    backgroundColor: '#000',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#27272a',
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 6,
    marginBottom: 16,
  },
  regPhotoPreview: {
    width: '100%',
    height: '100%',
  },
  regCamera: {
    width: '100%',
    height: '100%',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  regCaptureBtn: {
    backgroundColor: '#60a5fa',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    marginBottom: 15,
  },
  regCaptureBtnText: {
    color: '#09090b',
    fontWeight: '700',
    fontSize: 12,
  },
  photoSelectBtn: {
    backgroundColor: '#27272a',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  photoSelectText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 12,
  },
  saveRegBtn: {
    backgroundColor: '#22c55e',
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
  },
  saveRegBtnText: {
    color: '#09090b',
    fontWeight: '700',
    fontSize: 14,
  },
  navBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 64,
    backgroundColor: '#0a0a0c',
    borderTopWidth: 1,
    borderTopColor: '#27272a',
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingBottom: 10,
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  navItemActive: {
    borderTopWidth: 2,
    borderTopColor: '#60a5fa',
  },
  navText: {
    color: '#71717a',
    fontSize: 11,
    fontWeight: '500',
  },
  navTextActive: {
    color: '#60a5fa',
    fontWeight: '600',
  },
  navTextLogout: {
    color: '#ef4444',
    fontSize: 11,
    fontWeight: '500',
  },
  dropdownHeader: {
    backgroundColor: '#09090b',
    borderWidth: 1,
    borderColor: '#27272a',
    borderRadius: 8,
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
    marginBottom: 8,
  },
  dropdownHeaderText: {
    color: '#ffffff',
    fontSize: 14,
  },
  dropdownHeaderArrow: {
    color: '#a1a1aa',
    fontSize: 12,
  },
  dropdownList: {
    backgroundColor: '#09090b',
    borderWidth: 1,
    borderColor: '#27272a',
    borderRadius: 8,
    marginTop: 2,
    marginBottom: 10,
    overflow: 'hidden',
  },
  dropdownItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#18181b',
  },
  dropdownItemActive: {
    backgroundColor: '#18181b',
    borderLeftWidth: 3,
    borderLeftColor: '#60a5fa',
  },
  dropdownItemText: {
    color: '#e4e4e7',
    fontSize: 13,
  }
});
