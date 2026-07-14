import 'dart:convert';
import 'dart:math';
import 'package:flutter/material.dart';
import 'package:camera/camera.dart';
import 'package:geolocator/geolocator.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:http/http.dart' as http;
import 'package:intl/intl.dart';

// Late initialization of available camera list
late List<CameraDescription> _cameras;

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  try {
    _cameras = await availableCameras();
  } catch (e) {
    _cameras = [];
    debugPrint("No camera devices detected: $e");
  }
  runApp(const SmartAttendanceApp());
}

class SmartAttendanceApp extends StatelessWidget {
  const SmartAttendanceApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Smart GateEntry',
      debugShowCheckedModeBanner: false,
      theme: ThemeData.dark().copyWith(
        scaffoldBackgroundColor: const Color(0xFF09090B),
        cardColor: const Color(0xFF18181B),
        colorScheme: const ColorScheme.dark().copyWith(
          primary: const Color(0xFF60A5FA),
          secondary: const Color(0xFF22C55E),
          error: const Color(0xFFEF4444),
          surface: const Color(0xFF18181B),
        ),
      ),
      home: const SupervisorLoginScreen(),
    );
  }
}

// ==========================================
// 1. SUPERVISOR LOGIN SCREEN
// ==========================================
class SupervisorLoginScreen extends StatefulWidget {
  const SupervisorLoginScreen({super.key});

  @override
  State<SupervisorLoginScreen> createState() => _SupervisorLoginScreenState();
}

class _SupervisorLoginScreenState extends State<SupervisorLoginScreen> {
  final TextEditingController _pinController = TextEditingController();

  void _handleLogin() {
    if (_pinController.text == '1234') {
      Navigator.pushReplacement(
        context,
        MaterialPageRoute(builder: (context) => const HomeScreen()),
      );
    } else {
      _pinController.clear();
      showDialog(
        context: context,
        builder: (context) => AlertDialog(
          title: const Text('Access Denied'),
          content: const Text('Invalid Supervisor PIN security passcode.'),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('Retry'),
            ),
          ],
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Center(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 32.0),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Text(
                'GATEENTRY HUB',
                style: TextStyle(fontSize: 28, fontWeight: FontWeight.w900, letterSpacing: -1),
              ),
              const SizedBox(height: 4),
              const Text(
                'SUPERVISOR TERMINAL',
                style: TextStyle(fontSize: 11, color: Color(0xFF60A5FA), letterSpacing: 2),
              ),
              const SizedBox(height: 40),
              SizedBox(
                width: 200,
                child: TextField(
                  controller: _pinController,
                  obscureText: true,
                  keyboardType: TextInputType.number,
                  textAlign: TextAlign.center,
                  maxLength: 4,
                  style: const TextStyle(fontSize: 26, letterSpacing: 12),
                  decoration: const InputDecoration(
                    hintText: '••••',
                    hintStyle: TextStyle(color: Colors.grey, letterSpacing: 6),
                    counterText: '',
                    border: OutlineInputBorder(),
                  ),
                  onSubmitted: (_) => _handleLogin(),
                ),
              ),
              const SizedBox(height: 24),
              ElevatedButton(
                onPressed: _handleLogin,
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF60A5FA),
                  foregroundColor: Colors.black,
                  padding: const EdgeInsets.symmetric(horizontal: 40, vertical: 14),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                ),
                child: const Text('Authorize Access', style: TextStyle(fontWeight: FontWeight.bold)),
              ),
              const SizedBox(height: 40),
              const Text(
                'Passcode PIN Hint: 1234',
                style: TextStyle(fontSize: 12, color: Colors.grey),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

// ==========================================
// 2. MAIN HUB CONTROLLER (TAB NAVIGATION)
// ==========================================
class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  int _currentIndex = 0;

  // Custom states that persist across tab changes
  List<Map<String, dynamic>> _roster = [
    {'id': 'EMP-7088', 'name': 'Vikram Sharma', 'shift': 'Morning Shift (A)', 'avatar': null},
    {'id': 'EMP-9021', 'name': 'Priya Patel', 'shift': 'Morning Shift (A)', 'avatar': null},
    {'id': 'EMP-4110', 'name': 'Amit Mishra', 'shift': 'General Shift (G)', 'avatar': null}
  ];
  List<Map<String, dynamic>> _logs = [];
  List<Map<String, dynamic>> _syncQueue = [];
  bool _isOffline = false;
  String _clientLocation = 'Tata Motors - Gate 1';
  String _selectedMockApproach = 'EMP-7088';

  @override
  void initState() {
    super.initState();
    _loadStorageData();
  }

  String _apiServerHost = 'localhost';

  Future<void> _loadStorageData() async {
    final prefs = await SharedPreferences.getInstance();
    final String? savedLogs = prefs.getString('attendance_logs');
    final String? savedQueue = prefs.getString('sync_queue');
    final String? savedRoster = prefs.getString('roster_list');
    final String? savedHost = prefs.getString('api_host');

    setState(() {
      if (savedLogs != null) _logs = List<Map<String, dynamic>>.from(json.decode(savedLogs));
      if (savedQueue != null) _syncQueue = List<Map<String, dynamic>>.from(json.decode(savedQueue));
      if (savedRoster != null) {
        _roster = List<Map<String, dynamic>>.from(json.decode(savedRoster));
      }
      if (savedHost != null) _apiServerHost = savedHost;
    });

    _loadDatabaseFromServer(savedHost ?? _apiServerHost);
  }

  String _cleanHost(String input) {
    String clean = input.trim();
    clean = clean.replaceAll(RegExp(r'^https?://', caseSensitive: false), '');
    if (clean.endsWith('/')) {
      clean = clean.substring(0, clean.length - 1);
    }
    if (clean.contains(':')) {
      return clean;
    }
    return '$clean:3000';
  }

  Future<void> _loadDatabaseFromServer(String host) async {
    try {
      final formattedHost = _cleanHost(host);
      final rosterUrl = Uri.parse('http://$formattedHost/api/roster');
      final rosterResponse = await http.get(rosterUrl).timeout(const Duration(seconds: 4));
      if (rosterResponse.statusCode == 200) {
        final Map<String, dynamic> rosterData = json.decode(rosterResponse.body);
        final List<Map<String, dynamic>> rosterList = rosterData.keys.map((key) => {
          'id': rosterData[key]['id'],
          'name': rosterData[key]['name'],
          'shift': rosterData[key]['shift'] ?? 'Morning Shift (A)',
          'avatar': rosterData[key]['avatar'],
        }).toList();

        setState(() {
          _roster = rosterList;
          if (_roster.isNotEmpty && !_roster.any((e) => e['id'] == _selectedMockApproach)) {
            _selectedMockApproach = _roster.first['id'];
          }
        });
        final prefs = await SharedPreferences.getInstance();
        await prefs.setString('roster_list', json.encode(rosterList));
      }

      final logsUrl = Uri.parse('http://$formattedHost/api/logs');
      final logsResponse = await http.get(logsUrl).timeout(const Duration(seconds: 4));
      if (logsResponse.statusCode == 200) {
        final List<Map<String, dynamic>> logsList = List<Map<String, dynamic>>.from(json.decode(logsResponse.body));
        setState(() {
          _logs = logsList;
        });
        final prefs = await SharedPreferences.getInstance();
        await prefs.setString('attendance_logs', json.encode(logsList));
      }
    } catch (e) {
      debugPrint('API Server unreachable: $e');
    }
  }

  Future<void> _saveApiHost(String host) async {
    setState(() {
      _apiServerHost = host;
    });
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('api_host', host);
    _loadDatabaseFromServer(host);
  }

  Future<void> _saveStorageData() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('attendance_logs', json.encode(_logs));
    await prefs.setString('sync_queue', json.encode(_syncQueue));
    await prefs.setString('roster_list', json.encode(_roster));
  }

  void _addEmployeeToRoster(String name, String shift, String? photoPath) async {
    // Duplicate check: Verify if candidate name already exists in roster
    final nameExists = _roster.any((emp) => emp['name'].toString().toLowerCase() == name.trim().toLowerCase());
    if (nameExists) {
      final existingEmp = _roster.firstWhere((emp) => emp['name'].toString().toLowerCase() == name.trim().toLowerCase());
      showDialog(
        context: context,
        builder: (context) => AlertDialog(
          title: const Text('User Already Exists'),
          content: Text('User already exists! ${name.trim()} is already registered with ID ${existingEmp['id']}. No need to register again, they can scan directly.'),
          actions: [
            TextButton(
              onPressed: () {
                Navigator.pop(context);
                setState(() {
                  _currentIndex = 0; // Go back to scanner tab
                });
              },
              child: const Text('OK'),
            )
          ],
        ),
      );
      return;
    }

    final newCode = 'EMP-${Random().nextInt(9000) + 1000}';
    final newStaff = {
      'id': newCode,
      'name': name,
      'shift': shift,
      'avatar': photoPath,
    };
    setState(() {
      _roster.add(newStaff);
      _selectedMockApproach = newCode;
    });
    _saveStorageData();

    // Post enrollment to server
    try {
      final customId = 'emp-custom-${DateTime.now().millisecondsSinceEpoch}';
      final formattedHost = _cleanHost(_apiServerHost);
      final rosterUrl = Uri.parse('http://$formattedHost/api/roster');
      await http.post(
        rosterUrl,
        headers: {'Content-Type': 'application/json'},
        body: json.encode({
          'key': customId,
          'employee': {
            'id': newCode,
            'name': name,
            'initials': name.split(' ').map((n) => n.isNotEmpty ? n[0] : '').join('').toUpperCase(),
            'role': 'Contract Staff',
            'shift': shift,
            'avatar': photoPath,
            'status': 'Active',
            'location': _clientLocation,
            'faceVector': '[Custom Vector hash: ${Random().nextDouble().toStringAsFixed(4)}]'
          }
        }),
      ).timeout(const Duration(seconds: 4));
      _loadDatabaseFromServer(_apiServerHost);
    } catch (e) {
      debugPrint('Error posting enrollment: $e');
    }
  }

  void _recordAttendance(Map<String, dynamic> employee, bool offlineMode) async {
    final timestamp = DateTime.now().toIso8601String();
    final newLog = {
      'id': employee['id'],
      'name': employee['name'],
      'timestamp': timestamp,
      'location': _clientLocation,
      'gps': '18.6420° N, 73.8055° E',
      'synced': !offlineMode
    };

    setState(() {
      _logs.insert(0, newLog);
      if (offlineMode) {
        _syncQueue.add(newLog);
      }
    });
    _saveStorageData();

    if (!offlineMode) {
      // Post check-in log to backend server API
      try {
        final formattedHost = _cleanHost(_apiServerHost);
        final logsUrl = Uri.parse('http://$formattedHost/api/logs');
        await http.post(
          logsUrl,
          headers: {'Content-Type': 'application/json'},
          body: json.encode({
            'empId': employee['id'],
            'name': employee['name'],
            'timestamp': timestamp,
            'location': _clientLocation,
            'gps': '18.6420° N, 73.8055° E',
            'verified': true,
            'syncStatus': 'Synced'
          }),
        ).timeout(const Duration(seconds: 4));
      } catch (e) {
        debugPrint('Error posting check-in log: $e');
      }
    }
  }

  void _triggerFullSync() async {
    if (_isOffline) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Cannot sync: Device is set to offline mode.')),
      );
      return;
    }
    if (_syncQueue.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Sync Queue is empty.')),
      );
      return;
    }

    // Reconcile logs with the backend server API
    try {
      final formattedHost = _cleanHost(_apiServerHost);
      final syncUrl = Uri.parse('http://$formattedHost/api/sync-logs');
      final payload = _syncQueue.map((log) => {
        'empId': log['id'],
        'name': log['name'],
        'timestamp': log['timestamp'],
        'location': log['location'],
        'gps': log['gps'],
        'verified': true,
        'syncStatus': 'Synced'
      }).toList();

      final response = await http.post(
        syncUrl,
        headers: {'Content-Type': 'application/json'},
        body: json.encode(payload),
      ).timeout(const Duration(seconds: 4));

      if (response.statusCode == 200) {
        setState(() {
          _logs = _logs.map((log) => {...log, 'synced': true}).toList();
          _syncQueue.clear();
        });
        _saveStorageData();
        
        showDialog(
          context: context,
          builder: (context) => AlertDialog(
            title: const Text('ZyngHR Sync Complete'),
            content: const Text('Successfully synchronized offline queue records.'),
            actions: [
              TextButton(onPressed: () => Navigator.pop(context), child: const Text('OK')),
            ],
          ),
        );
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Sync rejected by server API.')),
        );
      }
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Sync failed: API server unreachable.')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final List<Widget> tabs = [
      ScanGateTab(
        isOffline: _isOffline,
        onOfflineChanged: (val) => setState(() => _isOffline = val),
        clientLocation: _clientLocation,
        onLocationChanged: (val) => setState(() => _clientLocation = val!),
        roster: _roster,
        logs: _logs,
        onVerifySuccess: (employee) => _recordAttendance(employee, _isOffline),
        syncQueueCount: _syncQueue.length,
        onSyncTriggered: _triggerFullSync,
        selectedMockApproach: _selectedMockApproach,
        onApproachChanged: (val) => setState(() => _selectedMockApproach = val!),
        apiServerHost: _apiServerHost,
        onApiHostChanged: _saveApiHost,
        onRefreshServerData: () => _loadDatabaseFromServer(_apiServerHost),
      ),
      EnrollFaceTab(
        onEnroll: _addEmployeeToRoster,
      ),
      SyncLogsTab(
        logs: _logs,
        syncQueue: _syncQueue,
        onSyncTriggered: _triggerFullSync,
        onLogout: () {
          Navigator.pushReplacement(
            context,
            MaterialPageRoute(builder: (context) => const SupervisorLoginScreen()),
          );
        },
      )
    ];

    return Scaffold(
      body: tabs[_currentIndex],
      bottomNavigationBar: BottomNavigationBar(
        currentIndex: _currentIndex,
        selectedItemColor: const Color(0xFF60A5FA),
        unselectedItemColor: Colors.grey,
        onTap: (index) => setState(() => _currentIndex = index),
        items: const [
          BottomNavigationBarItem(icon: Icon(Icons.camera_alt_outlined), label: 'Scan Gate'),
          BottomNavigationBarItem(icon: Icon(Icons.person_add_alt_1_outlined), label: 'Enroll Face'),
          BottomNavigationBarItem(icon: Icon(Icons.sync_lock_outlined), label: 'Admin Hub'),
        ],
      ),
    );
  }
}

// ==========================================
// 3. TAB A: GATE ATTENDANCE SCANNER
// ==========================================
class ScanGateTab extends StatefulWidget {
  final bool isOffline;
  final ValueChanged<bool> onOfflineChanged;
  final String clientLocation;
  final ValueChanged<String?> onLocationChanged;
  final List<Map<String, dynamic>> roster;
  final List<Map<String, dynamic>> logs;
  final ValueChanged<Map<String, dynamic>> onVerifySuccess;
  final int syncQueueCount;
  final VoidCallback onSyncTriggered;
  final String selectedMockApproach;
  final ValueChanged<String> onApproachChanged;
  final String apiServerHost;
  final ValueChanged<String> onApiHostChanged;
  final VoidCallback onRefreshServerData;

  const ScanGateTab({
    super.key,
    required this.isOffline,
    required this.onOfflineChanged,
    required this.clientLocation,
    required this.onLocationChanged,
    required this.roster,
    required this.logs,
    required this.onVerifySuccess,
    required this.syncQueueCount,
    required this.onSyncTriggered,
    required this.selectedMockApproach,
    required this.onApproachChanged,
    required this.apiServerHost,
    required this.onApiHostChanged,
    required this.onRefreshServerData,
  });

  @override
  State<ScanGateTab> createState() => _ScanGateTabState();
}

class _ScanGateTabState extends State<ScanGateTab> {
  CameraController? _cameraController;
  bool _isScanning = false;
  bool _isMatching = false;
  Timer? _autoScanTimer;
  int _simIndex = 0;

  void _triggerAutoScan() {
    _autoScanTimer?.cancel();
    _autoScanTimer = Timer(const Duration(milliseconds: 2500), () {
      if (mounted && _isScanning && !_isMatching) {
        _verifyMatch();
      }
    });
  }

  @override
  void dispose() {
    _autoScanTimer?.cancel();
    _cameraController?.dispose();
    super.dispose();
  }

  Future<void> _startCamera() async {
    // Cycle target candidate automatically to simulate different people walking up to the camera
    if (widget.roster.isNotEmpty) {
      final pool = [...widget.roster.map((e) => e['id']), 'stranger', 'spoof'];
      final nextIdx = (_simIndex + 1) % pool.length;
      setState(() {
        _simIndex = nextIdx;
      });
      widget.onApproachChanged(pool[nextIdx].toString());
    }

    if (_cameras.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('No camera devices available. Simulating stream.')),
      );
      setState(() => _isScanning = true);
      _triggerAutoScan();
      return;
    }

    // Initialize front camera
    final frontCam = _cameras.firstWhere(
      (cam) => cam.lensDirection == CameraLensDirection.front,
      orElse: () => _cameras.first,
    );

    _cameraController = CameraController(frontCam, ResolutionPreset.medium);
    try {
      await _cameraController!.initialize();
      setState(() => _isScanning = true);
      _triggerAutoScan();
    } catch (e) {
      debugPrint("Camera init error: $e");
    }
  }

  // Dispose camera stream to shut down camera hardware completely
  void _stopCamera() {
    _autoScanTimer?.cancel();
    _cameraController?.dispose();
    _cameraController = null;
    setState(() => _isScanning = false);
  }

  void _verifyMatch() {
    if (_isMatching) return;
    setState(() => _isMatching = true);

    // Simulate Biometric Pipeline processing
    Future.delayed(const Duration(milliseconds: 1500), () {
      if (!mounted) return;
      setState(() => _isMatching = false);

      // Simple mock index selection logic (matches selection in approach dropdown)
      if (widget.selectedMockApproach == 'stranger') {
        showDialog(
          context: context,
          builder: (context) => const AlertDialog(
            title: Text('Access Denied', style: TextStyle(color: Colors.red)),
            content: Text('No biometric signature matched in directory database.'),
          ),
        );
      } else if (widget.selectedMockApproach == 'spoof') {
        showDialog(
          context: context,
          builder: (context) => const AlertDialog(
            title: Text('Liveness Failure', style: TextStyle(color: Colors.yellow)),
            content: Text('Liveness check rejected. Photo replay attack detected.'),
          ),
        );
      } else {
        final employee = widget.roster.firstWhere((emp) => emp['id'] == widget.selectedMockApproach);
        widget.onVerifySuccess(employee);

        // Show check-in dialog
        showDialog(
          context: context,
          builder: (context) => AlertDialog(
            title: const Text('Access Approved', style: TextStyle(color: Colors.green)),
            content: Text('Employee: ${employee['name']}\nShift: ${employee['shift']}'),
          ),
        );

        // AUTO STOP CAMERA: release hardware camera feed immediately on successful match
        _stopCamera();
      }
    });
  }

  @override
  void dispose() {
    _cameraController?.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    // Synchronize selected approach value to guard against empty roster deletions
    String activeApproach = widget.selectedMockApproach;
    if (activeApproach.isNotEmpty && 
        activeApproach != 'stranger' && 
        activeApproach != 'spoof' &&
        !widget.roster.any((e) => e['id'] == activeApproach)) {
      activeApproach = widget.roster.isNotEmpty ? widget.roster.first['id'] : 'stranger';
      WidgetsBinding.instance.addPostFrameCallback((_) {
        widget.onApproachChanged(activeApproach);
      });
    }

    return Scaffold(
      appBar: AppBar(
        title: const Text('Smart Biometric Gate'),
        backgroundColor: const Color(0xFF0A0A0C),
        actions: [
          Padding(
            padding: const EdgeInsets.all(12.0),
            child: Chip(
              label: Text(widget.isOffline ? 'OFFLINE' : 'ONLINE'),
              backgroundColor: widget.isOffline ? Colors.amber.withOpacity(0.2) : Colors.green.withOpacity(0.2),
              labelStyle: TextStyle(color: widget.isOffline ? Colors.amber : Colors.green, fontSize: 10, fontWeight: FontWeight.bold),
            ),
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Location and Settings Card
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16.0),
                child: Column(
                  children: [
                    DropdownButtonFormField<String>(
                      value: widget.clientLocation,
                      decoration: const InputDecoration(labelText: 'Gate Location Deployment'),
                      items: const [
                        DropdownMenuItem(value: 'Tata Motors - Gate 1', child: Text('Tata Motors (Gate 1)')),
                        DropdownMenuItem(value: 'Tata Motors - Assembly Line B', child: Text('Tata Motors (Assembly)')),
                        DropdownMenuItem(value: 'Reliance Industries - Plant A', child: Text('Reliance Industries (Plant A)')),
                        DropdownMenuItem(value: 'Adani Port - Cargo Yard', child: Text('Adani Port (Cargo)')),
                      ],
                      onChanged: widget.onLocationChanged,
                    ),
                    const SizedBox(height: 12),
                    TextFormField(
                      initialValue: widget.apiServerHost,
                      decoration: const InputDecoration(
                        labelText: 'API Server Host (IP / Hostname)',
                        hintText: 'e.g. localhost or 192.168.1.10',
                      ),
                      onFieldSubmitted: widget.onApiHostChanged,
                    ),
                    const SizedBox(height: 12),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text('Offline Simulator Mode', style: TextStyle(fontSize: 13)),
                        Switch(
                          value: widget.isOffline,
                          onChanged: widget.onOfflineChanged,
                          activeColor: const Color(0xFF60A5FA),
                        )
                      ],
                    ),
                    const SizedBox(height: 8),
                    SizedBox(
                      width: double.infinity,
                      child: TextButton.icon(
                        icon: const Icon(Icons.refresh, size: 16),
                        label: const Text('Sync Server Database'),
                        onPressed: widget.onRefreshServerData,
                        style: TextButton.styleFrom(
                          foregroundColor: const Color(0xFF60A5FA),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 16),

            // Camera Viewport
            ClipRRect(
              borderRadius: BorderRadius.circular(16),
              child: Container(
                height: 320,
                width: double.infinity,
                color: Colors.black,
                child: _isScanning
                    ? Stack(
                        fit: StackFit.expand,
                        children: [
                          if (_cameraController != null && _cameraController!.value.isInitialized)
                            CameraPreview(_cameraController!)
                          else
                            const Center(child: Text('Simulated Camera Active Feed')),

                          if (_isMatching)
                            Container(
                              color: Colors.black87,
                              child: const Column(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  CircularProgressIndicator(color: Color(0xFF60A5FA)),
                                  SizedBox(height: 16),
                                  Text('Running Liveness & Matching Vectors...', style: TextStyle(color: Color(0xFF60A5FA), fontWeight: FontWeight.bold)),
                                ],
                              ),
                            )
                          else
                            Positioned(
                              bottom: 20,
                              left: 0,
                              right: 0,
                              child: Center(
                                child: Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                                  decoration: BoxDecoration(
                                    color: Colors.black.withOpacity(0.75),
                                    borderRadius: BorderRadius.circular(20),
                                    border: Border.all(color: Colors.grey[850]!),
                                  ),
                                  child: const Row(
                                    mainAxisSize: MainAxisSize.min,
                                    children: [
                                      SizedBox(
                                        width: 14,
                                        height: 14,
                                        child: CircularProgressIndicator(strokeWidth: 2, color: Color(0xFF60A5FA)),
                                      ),
                                      SizedBox(width: 8),
                                      Text('Detecting Face... Keep Still', style: TextStyle(color: Color(0xFF60A5FA), fontSize: 12, fontWeight: FontWeight.bold)),
                                    ],
                                  ),
                                ),
                              ),
                            )
                        ],
                      )
                    : Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          const Icon(Icons.videocam_off_outlined, size: 64, color: Colors.grey),
                          const SizedBox(height: 16),
                          const Text('Gate Camera Stream Inactive', style: TextStyle(color: Colors.grey)),
                          const SizedBox(height: 16),
                          ElevatedButton.icon(
                            onPressed: _startCamera,
                            icon: const Icon(Icons.videocam_outlined),
                            label: const Text('Open Attendance Camera'),
                            style: ElevatedButton.styleFrom(
                              backgroundColor: const Color(0xFF60A5FA),
                              foregroundColor: Colors.black,
                            ),
                          ),
                        ],
                      ),
              ),
            ),

            if (widget.syncQueueCount > 0) ...[
              const SizedBox(height: 12),
              SizedBox(
                width: double.infinity,
                child: OutlinedButton.icon(
                  onPressed: widget.onSyncTriggered,
                  icon: const Icon(Icons.cloud_upload_outlined, color: Colors.amber),
                  label: Text('Sync Offline Buffer (${widget.syncQueueCount} Logs Pending)', style: const TextStyle(color: Colors.amber)),
                  style: OutlinedButton.styleFrom(
                    side: const BorderSide(color: Colors.amber),
                  ),
                ),
              ),
            ],

            const SizedBox(height: 20),
            const Text('Recent Gate Check-ins', style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: Colors.grey)),
            const SizedBox(height: 8),

            if (widget.logs.isEmpty)
              const Center(child: Padding(padding: EdgeInsets.all(24.0), child: Text('No attendance recorded in this session.', style: TextStyle(color: Colors.grey))))
            else
              ListView.builder(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                itemCount: min(widget.logs.length, 5),
                itemBuilder: (context, index) {
                  final log = widget.logs[index];
                  final formattedTime = DateFormat.jm().format(DateTime.parse(log['timestamp']));
                  return ListTile(
                    contentPadding: EdgeInsets.zero,
                    title: Text(log['name'], style: const TextStyle(fontWeight: FontWeight.bold)),
                    subtitle: Text('${log['id']} • $formattedTime • ${log['location']}'),
                    trailing: Text(
                      log['synced'] ? 'Synced' : 'Offline',
                      style: TextStyle(color: log['synced'] ? Colors.green : Colors.amber, fontWeight: FontWeight.bold, fontSize: 12),
                    ),
                  );
                },
              ),
          ],
        ),
      ),
    );
  }
}



// ==========================================
// 4. TAB B: CANDIDATE BIOMETRIC REGISTRATION
// ==========================================
class EnrollFaceTab extends StatefulWidget {
  final Function(String name, String shift, String? photoPath) onEnroll;

  const EnrollFaceTab({super.key, required this.onEnroll});

  @override
  State<EnrollFaceTab> createState() => _EnrollFaceTabState();
}

class _EnrollFaceTabState extends State<EnrollFaceTab> {
  final TextEditingController _nameController = TextEditingController();
  String _selectedShift = 'Morning Shift (A)';
  CameraController? _cameraController;
  bool _isCameraActive = false;
  String? _capturedPhotoPath;

  Future<void> _startEnrollCamera() async {
    if (_cameras.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('No camera hardware available. Enrollment will generate profile details.')),
      );
      return;
    }

    final frontCam = _cameras.firstWhere(
      (cam) => cam.lensDirection == CameraLensDirection.front,
      orElse: () => _cameras.first,
    );

    _cameraController = CameraController(frontCam, ResolutionPreset.medium);
    try {
      await _cameraController!.initialize();
      setState(() {
        _isCameraActive = true;
        _capturedPhotoPath = null;
      });
    } catch (e) {
      debugPrint("Enroll camera init error: $e");
    }
  }

  Future<void> _snapPhoto() async {
    if (_cameraController == null || !_cameraController!.value.isInitialized) return;
    try {
      final XFile image = await _cameraController!.takePicture();
      setState(() {
        _capturedPhotoPath = image.path;
        _isCameraActive = false;
      });
      _cameraController?.dispose();
      _cameraController = null;
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Failed to take snapshot photo.')),
      );
    }
  }

  void _submitEnrollment() {
    final name = _nameController.text.trim();
    if (name.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please enter candidate\'s full name.')),
      );
      return;
    }

    widget.onEnroll(name, _selectedShift, _capturedPhotoPath);
    _nameController.clear();
    setState(() {
      _capturedPhotoPath = null;
    });

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text('Enrolled candidate $name successfully!')),
    );
  }

  @override
  void dispose() {
    _cameraController?.dispose();
    _nameController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Enroll Candidate'),
        backgroundColor: const Color(0xFF0A0A0C),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Add New Employee Biometrics', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
            const SizedBox(height: 16),
            
            // Name field
            TextField(
              controller: _nameController,
              decoration: const InputDecoration(
                labelText: 'Candidate Full Name',
                border: OutlineInputBorder(),
              ),
            ),
            const SizedBox(height: 16),

            // Shift field
            DropdownButtonFormField<String>(
              value: _selectedShift,
              decoration: const InputDecoration(
                labelText: 'Shift Designation',
                border: OutlineInputBorder(),
              ),
              items: const [
                DropdownMenuItem(value: 'Morning Shift (A)', child: Text('Morning Shift (A) [06:00 - 14:00]')),
                DropdownMenuItem(value: 'General Shift (G)', child: Text('General Shift (G) [09:00 - 17:00]')),
                DropdownMenuItem(value: 'Evening Shift (B)', child: Text('Evening Shift (B) [14:00 - 22:00]')),
              ],
              onChanged: (val) => setState(() => _selectedShift = val!),
            ),
            const SizedBox(height: 20),

            // Photo Camera box
            const Text('Enroll Biometric Face Capture', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Colors.grey)),
            const SizedBox(height: 8),
            ClipRRect(
              borderRadius: BorderRadius.circular(12),
              child: Container(
                height: 200,
                width: double.infinity,
                color: Colors.black,
                child: _isCameraActive
                    ? Stack(
                        fit: StackFit.expand,
                        children: [
                          if (_cameraController != null && _cameraController!.value.isInitialized)
                            CameraPreview(_cameraController!),
                          Positioned(
                            bottom: 12,
                            alignSelf: Alignment.center,
                            child: ElevatedButton.icon(
                              onPressed: _snapPhoto,
                              icon: const Icon(Icons.camera),
                              label: const Text('Capture Snapshot'),
                              style: ElevatedButton.styleFrom(
                                backgroundColor: const Color(0xFF60A5FA),
                                foregroundColor: Colors.black,
                              ),
                            ),
                          )
                        ],
                      )
                    : (_capturedPhotoPath != null
                        ? Stack(
                            fit: StackFit.expand,
                            children: [
                              Image.asset(_capturedPhotoPath!, fit: BoxFit.cover, errorBuilder: (c, e, s) {
                                // Fallback avatar visual
                                return Container(
                                  color: const Color(0xFF27272A),
                                  child: const Center(
                                    child: Icon(Icons.face_retouching_natural_outlined, size: 64, color: Color(0xFF60A5FA)),
                                  ),
                                );
                              }),
                              Positioned(
                                bottom: 12,
                                left: 12,
                                child: TextButton.icon(
                                  onPressed: _startEnrollCamera,
                                  icon: const Icon(Icons.refresh, color: Colors.white),
                                  label: const Text('Retake', style: TextStyle(color: Colors.white)),
                                  style: TextButton.styleFrom(backgroundColor: Colors.black54),
                                ),
                              )
                            ],
                          )
                        : Center(
                            child: Column(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                const Icon(Icons.account_box_outlined, size: 48, color: Colors.grey),
                                const SizedBox(height: 12),
                                ElevatedButton(
                                  onPressed: _startEnrollCamera,
                                  style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF27272A)),
                                  child: const Text('Open Camera'),
                                ),
                              ],
                            ),
                          )),
              ),
            ),
            const SizedBox(height: 30),

            SizedBox(
              width: double.infinity,
              height: 48,
              child: ElevatedButton(
                onPressed: _submitEnrollment,
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF22C55E),
                  foregroundColor: Colors.black,
                ),
                child: const Text('Enroll Candidate Biometrics', style: TextStyle(fontWeight: FontWeight.bold)),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ==========================================
// 5. TAB C: SYNC QUEUE & ADMIN PANEL
// ==========================================
class SyncLogsTab extends StatelessWidget {
  final List<Map<String, dynamic>> logs;
  final List<Map<String, dynamic>> syncQueue;
  final VoidCallback onSyncTriggered;
  final VoidCallback onLogout;

  const SyncLogsTab({
    super.key,
    required this.logs,
    required this.syncQueue,
    required this.onSyncTriggered,
    required this.onLogout,
  });

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Admin Console'),
        backgroundColor: const Color(0xFF0A0A0C),
        actions: [
          IconButton(
            onPressed: onLogout,
            icon: const Icon(Icons.logout, color: Colors.red),
            tooltip: 'Lock Terminal',
          )
        ],
      ),
      body: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Core Metrics Cards
            Row(
              children: [
                Expanded(
                  child: Card(
                    child: Padding(
                      padding: const EdgeInsets.all(12.0),
                      child: Column(
                        children: [
                          const Text('TOTAL SCANS', style: TextStyle(fontSize: 10, color: Colors.grey)),
                          const SizedBox(height: 6),
                          Text('${logs.length}', style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold)),
                        ],
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: Card(
                    child: Padding(
                      padding: const EdgeInsets.all(12.0),
                      child: Column(
                        children: [
                          const Text('UNSYNCED LOGS', style: TextStyle(fontSize: 10, color: Colors.grey)),
                          const SizedBox(height: 6),
                          Text('${syncQueue.length}', style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: syncQueue.isNotEmpty ? Colors.amber : Colors.grey)),
                        ],
                      ),
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),

            if (syncQueue.isNotEmpty)
              Card(
                color: Colors.amber.withOpacity(0.1),
                shape: RoundedRectangleBorder(
                  side: const BorderSide(color: Colors.amber, width: 1),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Padding(
                  padding: const EdgeInsets.all(14.0),
                  child: Row(
                    children: [
                      const Icon(Icons.warning_amber_rounded, color: Colors.amber),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text('Offline Records Cached', style: TextStyle(fontWeight: FontWeight.bold, color: Colors.amber)),
                            Text('You have ${syncQueue.length} attendance logs to push to ZyngHR.', style: const TextStyle(fontSize: 12, color: Colors.grey)),
                          ],
                        ),
                      ),
                      ElevatedButton(
                        onPressed: onSyncTriggered,
                        style: ElevatedButton.styleFrom(backgroundColor: Colors.amber, foregroundColor: Colors.black),
                        child: const Text('Sync Now', style: TextStyle(fontWeight: FontWeight.bold)),
                      )
                    ],
                  ),
                ),
              ),

            const SizedBox(height: 20),
            const Text('Live Synced Check-ins Log', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: Colors.grey)),
            const SizedBox(height: 12),

            Expanded(
              child: logs.isEmpty
                  ? const Center(child: Text('No attendance captures saved on this device.', style: TextStyle(color: Colors.grey)))
                  : ListView.separated(
                      itemCount: logs.length,
                      separatorBuilder: (c, i) => const Divider(color: Color(0xFF27272A)),
                      itemBuilder: (context, index) {
                        final log = logs[index];
                        final time = DateFormat.yMMMd().add_jm().format(DateTime.parse(log['timestamp']));
                        return ListTile(
                          contentPadding: EdgeInsets.zero,
                          title: Text(log['name'], style: const TextStyle(fontWeight: FontWeight.bold)),
                          subtitle: Text('ID: ${log['id']}\nTime: $time\nLocation: ${log['location']}'),
                          trailing: Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Icon(
                                log['synced'] ? Icons.cloud_done_outlined : Icons.cloud_queue_outlined,
                                color: log['synced'] ? Colors.green : Colors.amber,
                              ),
                              const SizedBox(height: 4),
                              Text(
                                log['synced'] ? 'Synced' : 'Pending',
                                style: TextStyle(fontSize: 10, color: log['synced'] ? Colors.green : Colors.amber),
                              ),
                            ],
                          ),
                        );
                      },
                    ),
            ),
          ],
        ),
      ),
    );
  }
}
